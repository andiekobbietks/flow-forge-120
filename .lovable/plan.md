

# Plan: Forge IR Compiler — Full Implementation with Local-First Inference Router

## What Gets Built

8 files implementing the complete Pedagogy-as-Code compilation pipeline. The local inference router is architected for **two local strategies** plus cloud fallback:

1. **Arch-Router-1.5B** (Katanemo) — a 1.5B routing model that determines which downstream model handles the intent, using domain-action policy descriptions. Runs via any OpenAI-compatible local server (Ollama, vLLM, llama.cpp) at a configurable endpoint.
2. **Foundry Local** — Microsoft's on-device ONNX runtime at `http://localhost:5273/v1/chat/completions`. Runs Phi-4-mini or Qwen2.5 on CPU/NPU/GPU. Used as the **generation** model that actually produces the ForgeBlueprint.
3. **Supabase Edge Function** — Cloud fallback via Lovable AI Gateway (Gemini-3-Flash).

```text
Student Intent
      │
      ▼
┌──────────────────────────────────────────────┐
│  STAGE 1: ROUTE (Optional — Arch-Router)     │
│                                              │
│  TRY: localhost:11434 (Ollama) or            │
│       localhost:5273  (Foundry Local)         │
│                                              │
│  Arch-Router-1.5B receives the intent +      │
│  route policy descriptions:                  │
│  ┌──────────────────────────────────┐        │
│  │ "schema_generation" — complex DB  │        │
│  │ "simple_crud" — basic CRUD app    │        │
│  │ "ecommerce" — transactional site  │        │
│  └──────────────────────────────────┘        │
│  Returns: { "route": "schema_generation" }   │
│                                              │
│  SKIP if unavailable — go direct to Stage 2  │
└──────────┬───────────────────────────────────┘
           │ route name (or default)
           ▼
┌──────────────────────────────────────────────┐
│  STAGE 2: GENERATE (ForgeBlueprint)          │
│                                              │
│  TRY 1: Foundry Local (localhost:5273)       │
│    Model: phi-4-mini / qwen2.5-0.5b-instruct│
│    OpenAI-compatible tool-calling            │
│    Timeout: 15s                              │
│                                              │
│  TRY 2: Supabase Edge Function               │
│    → Lovable AI Gateway                      │
│    → google/gemini-3-flash-preview           │
│    Tool-calling with generate_blueprint      │
│                                              │
│  Route context injected into system prompt   │
│  scaffold_level controls output rigor        │
└──────────┬───────────────────────────────────┘
           │ ForgeBlueprint JSON
           ▼
┌──────────────────────────────────────────────┐
│  STAGE 3: VALIDATE (Zod)                     │
│  validateBlueprint(raw) → ForgeBlueprint     │
│  Rejects malformed AI output                 │
└──────────┬───────────────────────────────────┘
           │ Validated IR
           ▼
┌──────────────────────────────────────────────┐
│  STAGE 4: COMPILE (Deterministic)            │
│  sql-generator.ts                            │
│  ForgeBlueprint → DDL + PHP + Bootstrap HTML │
│  Grade-aware rigor per scaffold_level        │
└──────────┬───────────────────────────────────┘
           │ Record<string, string>
           ├──▶ React Flow nodes/edges
           ├──▶ vm.applyFsDiff(files)
           └──▶ CLI terminal animation
```

## The Arch-Router Integration

Arch-Router-1.5B works by receiving the user query **plus** a set of route policy descriptions in the system prompt. It returns a JSON object with the matched route name. The route policies are defined in `forge-ai.ts` as:

```text
Route Policies (passed to Arch-Router):
┌─────────────────────────────────────────────────────────┐
│ "schema_generation"                                     │
│   "Complex database schema design with multiple         │
│    entities, relationships, normalization, and           │
│    transactional CRUD operations."                      │
│   → Model: phi-4-mini (needs reasoning for 3NF)        │
├─────────────────────────────────────────────────────────┤
│ "simple_crud"                                           │
│   "Basic single-entity CRUD application with            │
│    simple forms and list views."                        │
│   → Model: qwen2.5-0.5b-instruct (fast, lightweight)   │
├─────────────────────────────────────────────────────────┤
│ "ecommerce"                                             │
│   "E-commerce or transactional website with products,   │
│    shopping cart, user accounts, and order processing."  │
│   → Model: phi-4-mini (complex entity graph)            │
└─────────────────────────────────────────────────────────┘
```

The Arch-Router system prompt follows the exact format from the HuggingChat integration:

```
"You are a helpful assistant designed to find the best suited route."
```

User message contains the intent. The model responds with `{"route": "schema_generation"}`. This route name is then injected as context into the Stage 2 generation prompt to help the generation model focus its output.

**If Arch-Router is unavailable** (connection refused, timeout), the router stage is skipped entirely and Stage 2 proceeds with a default "schema_generation" route. This makes Arch-Router a pure optimization layer — not a hard dependency.

## The Foundry Local Integration

Foundry Local exposes `http://localhost:5273/v1/chat/completions` (or `5272` depending on version) when running in service mode (`foundry service start`). It is **fully OpenAI-compatible**, meaning the same `messages` + `tools` + `tool_choice` payload works for both Foundry Local and the cloud fallback. The only difference is the URL.

The router probes both `5273` and `5272` (Foundry Local has used both ports across versions) with a 15-second timeout. If the model supports tool-calling (Phi-4-mini does), we use structured output. If not, we fall back to asking for JSON in the prompt and parsing it.

## New Files (5)

### 1. `src/lib/forge-types.ts` — The Grammar

TypeScript interfaces + Zod schemas:

- `ScaffoldLevel` — `z.enum(["exploratory", "competent", "exemplary", "rad"])`
- `ForgeField` — `{ name, type, constraint, nullable, default?, references? }`
- `ForgeEntity` — `{ name, fields[], indexes[], audit }` with snake_case enforcement, PK requirement
- `ForgeRelationship` — `{ name, from, to, cardinality, onDelete, onUpdate }`
- `ForgeTransaction` — `{ entity, operations[], auth, validation[], pagination }`
- `ForgePage` — `{ route, title, entity, layout, fields[] }`
- `ForgeBlueprint` — `{ version, project, scaffold_level, entities[], relationships[], transactions[], pages[], config }`
- `validateBlueprint(raw: unknown): ForgeBlueprint` — Zod parse + cross-reference checks
- `getBlueprintToolSchema()` — returns JSON schema for AI tool-calling

### 2. `src/lib/forge-ai.ts` — The 3-Stage Inference Router

The core of this implementation:

```typescript
// Exported public API
forgeSchema(intent: string, scaffoldLevel: ScaffoldLevel)
  → Promise<{ blueprint: ForgeBlueprint; provider: string; route?: string }>

// Internal: Stage 1 — Arch-Router (optional)
tryArchRouter(intent: string)
  → Promise<string | null>
  // Probes localhost:5273 and localhost:11434
  // System prompt: "You are a helpful assistant designed to find the best suited route."
  // User message includes intent + route policy descriptions
  // Expects: {"route": "schema_generation"}
  // Returns route name or null on failure
  // 5-second timeout (it's a small model, should be fast)

// Internal: Stage 2a — Foundry Local generation
tryFoundryLocal(intent: string, scaffoldLevel: string, routeContext?: string)
  → Promise<ForgeBlueprint | null>
  // Probes localhost:5273 then localhost:5272
  // Uses tool-calling with generate_blueprint tool
  // Falls back to JSON-in-prompt if tool-calling fails
  // WJEC-tuned system prompt with scaffold_level instructions
  // 15-second timeout
  // Returns validated blueprint or null

// Internal: Stage 2b — Cloud fallback
tryCloudFallback(intent: string, scaffoldLevel: string, routeContext?: string)
  → Promise<ForgeBlueprint>
  // Calls supabase.functions.invoke("forge-schema")
  // Throws on failure (last resort)
```

The system prompt dynamically adjusts based on `scaffoldLevel`:
- `exploratory`: "Produce flat 1NF tables. Simple column types. No foreign keys."
- `competent`: "Produce 2NF tables with basic primary and foreign keys."
- `exemplary`: "Produce fully normalized 3NF schemas with indexes, audit fields, constraints."
- `rad`: "Produce the most robust production-grade architecture possible. No constraints."

The route context from Arch-Router is injected as: "The routing model classified this intent as '{route}'. Optimize your schema accordingly."

### 3. `src/lib/sql-generator.ts` — The Deterministic Compiler

Grade-aware pure functions. `rad` mode produces the highest quality without WJEC framing — adds soft deletes, pagination helpers, search:

**`generateDDL(blueprint)`**: 1NF/2NF/3NF/3NF+ depending on scaffold_level
**`generatePHPCrud(entity, blueprint)`**: `$_POST` / `mysqli` / PDO / PDO+pagination depending on level
**`generateHTMLForm(entity, blueprint)`**: Raw HTML / Bootstrap standard / Bootstrap advanced depending on level
**`generateDBConnect(blueprint)`**: PDO or mysqli depending on level
**`generateIndexHTML(blueprint)`**: Nav page with Bootstrap navbar (or raw links for exploratory)
**`generateAllFiles(blueprint)`**: Master function → `Record<string, string>`

### 4. `supabase/functions/forge-schema/index.ts` — Cloud Fallback

- CORS headers per Lovable edge function pattern
- Accepts `{ intent, scaffoldLevel }` POST body
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`
- Model: `google/gemini-3-flash-preview`
- Tool-calling with `generate_blueprint` tool
- WJEC-tuned system prompt varying by scaffold_level
- Error handling: 429, 402

### 5. `supabase/config.toml`

```toml
[functions.forge-schema]
verify_jwt = false
```

## Modified Files (3)

### 6. `src/pages/LandingPage.tsx`

- Add `scaffoldLevel` state with 4-option selector (Exploratory / Competent / Exemplary / RAD 2.0)
- Add `forgeStatus` state for progress: "Routing intent via Arch-Router..." → "Generating blueprint via Foundry Local..." → "Falling back to cloud..." → "Validating..." → "Compiling..."
- Replace `setTimeout` with real `forgeSchema(intent, scaffoldLevel)` call
- Store blueprint + provider + route in `sessionStorage`
- Toast errors via sonner
- Navigate to `/canvas`

### 7. `src/pages/CanvasPage.tsx`

- On mount, read `lampforge-blueprint` from `sessionStorage`
- If exists, populate:
  - `EntityNode` per entity in 2-column grid (col * 350 + 100, row * 300 + 100)
  - Animated edges per relationship
  - `TransactionNode` per CRUD operation (200px below parent)
  - `ForgeStatusNode` showing provider + scaffold level + route
  - Call `generateAllFiles(blueprint)` → `editorRef.current?.applyFsDiff({ create: files })`
  - Animate DDL in terminal line-by-line with 80ms stagger
- Clear sessionStorage after consuming

### 8. `src/lib/webcontainer-project.ts`

- Update `getDefaultFiles()` index.html to include Bootstrap 5 CDN

## How the Local Inference Actually Works

**For a teacher with Foundry Local installed** (Windows/Mac):
```bash
# Install
brew install microsoft/foundrylocal/foundrylocal   # or winget on Windows

# Download a model
foundry model run phi-4-mini

# Start service mode (exposes OpenAI API)
foundry service start
# → http://localhost:5273/v1/chat/completions is now live
```

**For a teacher with Ollama + Arch-Router** (optional optimization):
```bash
ollama pull katanemo/arch-router-1.5b  # if available as GGUF
# or run via any OpenAI-compatible server on localhost:11434
```

**If neither is installed**: The system silently falls back to the cloud edge function. Zero configuration required. The student never sees an error — just a slightly different status message ("Forged via cloud" instead of "Forged locally via Foundry").

