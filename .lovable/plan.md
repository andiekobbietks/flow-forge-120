

# Plan: Forge IR Compiler — Grade-Aware, Bootstrap-Based, Full Pipeline

## What Gets Built

8 files that implement the complete Pedagogy-as-Code compilation pipeline: from the Landing Page "Forge It" button through to populated React Flow canvas and generated LAMP artifacts in the WebContainer. Bootstrap 5 via CDN for all generated HTML. Grade-aware "Variable Rigor" at every compilation stage.

## New Files

### 1. `src/lib/forge-types.ts` — The Grammar (IR + Zod Validation)

The Pedagogy-as-Code Intermediate Representation with `scaffold_level` as a first-class grammar primitive:

```text
ForgeBlueprint
├── version: "1.0"
├── project: { name, description, dialect: "mysql" }
├── scaffold_level: "exploratory" | "competent" | "exemplary"
│   exploratory ≈ Grade E/D — 1NF, raw HTML, $_POST, no auth
│   competent   ≈ Grade C/B — 2NF, Bootstrap standard, mysqli, basic login
│   exemplary   ≈ Grade A*  — 3NF, Bootstrap advanced + tokens, PDO, sessions
├── entities[]: { name, fields[], indexes[], audit }
│   └── fields[]: { name, type, constraint, nullable, default?, references? }
├── relationships[]: { name, from, to, cardinality, onDelete, onUpdate }
├── transactions[]: { entity, operations[], auth, validation[], pagination }
├── pages[]: { route, title, entity, layout, fields[] }
└── config: { server, database, session }
```

Full Zod schemas with:
- MySQL type enum validation (`VARCHAR`, `INT`, `DECIMAL`, `DATETIME`, `TEXT`, `BOOLEAN`)
- Constraint enum (`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `DEFAULT`, `CHECK`, `FOREIGN KEY`)
- snake_case name enforcement via regex
- Cross-reference validation (relationships reference existing entity names)
- `validateBlueprint(raw: unknown): ForgeBlueprint` entry point

### 2. `src/lib/forge-ai.ts` — Local-First Inference Router

- `forgeSchema(intent: string, scaffoldLevel?: string): Promise<{ blueprint: ForgeBlueprint; provider: string }>`
- **Try 1**: `fetch("http://localhost:5273/v1/chat/completions")` — Foundry Local, OpenAI-compatible tool-calling, 10s timeout via `AbortController`
- **Try 2**: Supabase Edge Function `forge-schema` calling Lovable AI Gateway
- Both use identical payload with `generate_blueprint` tool definition
- System prompt is WJEC-tuned and includes `scaffold_level` instruction: "The student targets {level}. For exploratory: flat tables, simple queries. For competent: basic normalization, standard CRUD. For exemplary: full 3NF, indexes, audit trails, prepared statements."
- Response validated through `validateBlueprint()` — bad grammar rejected before compiler
- Returns provider name for CLI display

### 3. `src/lib/sql-generator.ts` — The Deterministic, Grade-Aware Compiler

Pure functions that accept `scaffold_level` to control output rigor:

**DDL Generator** (`generateDDL`):
- `exemplary`: Full 3NF, `AUTO_INCREMENT`, `FOREIGN KEY ... ON DELETE CASCADE`, composite indexes, `created_at`/`updated_at` audit columns, junction tables for M:M
- `competent`: 2NF, basic PKs/FKs, no indexes, no audit columns
- `exploratory`: Flat 1NF tables, just `id` + columns, no FK constraints

**PHP Generator** (`generatePHPCrud`):
- `exemplary`: PDO prepared statements, `password_hash`/`password_verify`, CSRF token, `try/catch`, multi-table JOINs, input validation
- `competent`: `mysqli` with basic `real_escape_string`, `empty()` checks, simple queries
- `exploratory`: Direct `$_POST` usage, `SELECT *`, no error handling — authentic Grade E patterns

**HTML Generator** (`generateHTMLForm`):
- `exemplary`: Bootstrap 5 CDN, `card shadow-lg`, input groups with icons, responsive `row`/`col-md-6`, validation feedback classes, custom CSS variables (design tokens)
- `competent`: Bootstrap 5 CDN, standard `container`/`card`/`btn btn-primary`, default palette, basic navbar
- `exploratory`: No Bootstrap — raw `<form>` with `<input>`, no CSS, `<table>` layout, Web 1.0 aesthetic

Additional generators:
- `generateDBConnect(blueprint)` — PDO or mysqli depending on level
- `generateIndexHTML(blueprint)` — Navigation page with Bootstrap navbar (or raw links for exploratory)
- `generateAllFiles(blueprint)` — Master compiler producing complete `Record<string, string>`

### 4. `supabase/config.toml`

```toml
[functions.forge-schema]
verify_jwt = false
```

### 5. `supabase/functions/forge-schema/index.ts` — Cloud Fallback

- CORS headers per Lovable edge function pattern
- Accepts `{ intent: string, scaffoldLevel?: string }` POST body
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` (already configured)
- Model: `google/gemini-3-flash-preview`
- Tool-calling with `generate_blueprint` tool — JSON schema matches `ForgeBlueprint` exactly
- WJEC-tuned system prompt including grade-aware rigor instructions
- Non-streaming, structured output
- Error handling: 429 rate limit, 402 payment, malformed response

## Modified Files

### 6. `src/pages/LandingPage.tsx`

- Import `forgeSchema` from `forge-ai.ts`
- Add `scaffoldLevel` state with a 3-option selector (Exploratory / Competent / Exemplary) rendered as Bootstrap-style toggle buttons below the intent textarea
- Add `forgeStatus` state for progress display: "Probing Foundry Local..." → "Falling back to cloud..." → "Validating blueprint..." → "Compiling architecture..."
- Replace `setTimeout` mock in `handleForge` with real `forgeSchema(intent, scaffoldLevel)` call
- Store validated `ForgeBlueprint` + provider in `sessionStorage`
- Toast errors via `sonner`
- Navigate to `/canvas` on success

### 7. `src/pages/CanvasPage.tsx`

- Import `ForgeBlueprint`, `generateAllFiles`, `generateDDL`
- On mount `useEffect`, read `lampforge-blueprint` from `sessionStorage`
- If blueprint exists, `populateFromBlueprint(blueprint)`:
  - Create `EntityNode` per entity in 2-column grid (col * 350 + 100, row * 300 + 100)
  - Create animated edges per relationship (green stroke)
  - Create `TransactionNode` per entity's CRUD operations (200px below parent)
  - Create `ForgeStatusNode` showing provider + scaffold level
  - Call `generateAllFiles(blueprint)` → `editorRef.current?.applyFsDiff({ create: files })`
  - Animate DDL in terminal line-by-line with 80ms stagger
- Clear sessionStorage after consuming

### 8. `src/lib/webcontainer-project.ts` — Minor Update

- Update `getDefaultFiles()` index.html to include Bootstrap 5 CDN link by default

## The Grade-Aware Compilation Matrix

```text
                    Exploratory (E/D)     Competent (C/B)       Exemplary (A/A*)
                    ─────────────────     ───────────────       ────────────────
SQL Schema          1NF flat tables       2NF basic FKs         3NF indexes audit
PHP Logic           $_POST direct         mysqli escape         PDO prepared stmts
HTML/CSS            Raw HTML no CSS       Bootstrap standard    Bootstrap + tokens
Auth                None                  Basic login           Sessions + CSRF
Validation          None                  empty() checks        Regex + type checks
Error Handling      None                  Basic die()           try/catch + logging
```

## Technical Details

- **Bootstrap 5 via CDN**: All generated HTML includes `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">` and the JS bundle. No build step needed.
- **Foundry Local**: OpenAI-compatible at `localhost:5273`. Same payload for local and cloud. 10s timeout.
- **Tool-calling**: `generate_blueprint` tool with strict JSON schema matching Zod types. Both Gemini and Phi-4-mini support this format. `tool_choice: { type: "function", function: { name: "generate_blueprint" } }` forces structured output.
- **Canvas layout**: 2-column grid, 350px horizontal / 300px vertical spacing from (100, 100).
- **Terminal animation**: DDL lines pushed with `setTimeout(fn, i * 80)`.

