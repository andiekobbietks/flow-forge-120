

# Plan: Integrate StackBlitz WebContainer SDK for Real In-Browser Development Environment

## The Problem

The current Canvas page uses a standalone Monaco Editor component that only displays static file content — no real file system, no execution, no terminal. The user explicitly requires the **real StackBlitz WebContainer SDK** to power the code editing pane, providing an actual VS Code environment running inside WebContainers, with real file I/O, a real terminal, and live preview — exactly like Codeflow / bolt.dev.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    CanvasPage.tsx                        │
├────────────────────┬────────────────────────────────────┤
│  Pane A            │  Pane B                            │
│  React Flow        │  StackBlitz Embedded Project       │
│  Architecture      │  ┌──────────────────────────────┐  │
│  Canvas            │  │  Full VS Code Editor         │  │
│  (unchanged)       │  │  (via @stackblitz/sdk        │  │
│                    │  │   embedProject)               │  │
│                    │  │  - Real file tree             │  │
│                    │  │  - Syntax highlighting        │  │
│                    │  │  - Terminal (built-in)        │  │
│                    │  │  - Live preview iframe        │  │
│                    │  └──────────────────────────────┘  │
├────────────────────┴────────────────────────────────────┤
│  Bottom: LAMPForge CLI Terminal (kept for SQL animation │
│  + pedagogical overlay — separate from WC terminal)     │
└─────────────────────────────────────────────────────────┘
```

## What Changes

### 1. Install `@stackblitz/sdk`
Add the StackBlitz SDK package (`@stackblitz/sdk`) to `package.json`. This is the official 3kB SDK that communicates with the WebContainer runtime.

### 2. Create `src/components/canvas/WebContainerEditor.tsx`
A new component that replaces the current Monaco Editor + file tabs in Pane B. It will:
- Render a `<div id="stackblitz-embed">` container
- On mount, call `sdk.embedProject('stackblitz-embed', project, options)` with the LAMPForge-generated files (SQL schema, PHP CRUD, HTML forms)
- Configure the embed with: dark theme, editor+preview view, specific open files, hidden sidebar initially, terminal visible
- Expose the `VM` instance via a ref/callback so the parent `CanvasPage` can programmatically:
  - Write files when the canvas generates new code (`vm.applyFsDiff`)
  - Read files back for bi-directional sync
  - Get the preview URL for the live preview

The project template will be `node` (WebContainers-based), with a minimal `package.json` that includes a simple HTTP server to serve the generated HTML/PHP files. For PHP execution, we include `php-wasm` as a dependency within the embedded project so PHP files can actually run inside the WebContainer.

### 3. Create `src/lib/webcontainer-project.ts`
A utility that builds the StackBlitz `Project` object from the current canvas state:
- `buildProject(files: Record<string, string>): Project` — takes the generated file map and produces the StackBlitz project definition with `title`, `description`, `template: 'node'`, and the full `files` record
- Includes a base `package.json` with a simple static server (e.g., `serve` or a custom `server.js`) so the preview works
- Includes a `server.js` that serves static HTML and routes PHP through php-wasm

### 4. Update `src/pages/CanvasPage.tsx`
- Remove the Monaco `CodeEditor` component and file tabs from Pane B
- Replace with the new `WebContainerEditor` component
- Pass the generated files map to the embed
- When canvas nodes change (entity added, relationship connected), call `vm.applyFsDiff()` to update files in the running WebContainer in real-time
- Keep the bottom LAMPForge CLI terminal panel — this serves the pedagogical role of animating SQL commands and providing the LAMPForge-specific CLI experience (distinct from the WebContainer's built-in terminal which handles Node.js/npm)

### 5. Update `src/pages/WorkbenchPage.tsx`
- Replace the mock `CodeEditor` with the same approach or keep Monaco for the query editor (Monaco is fine for a single SQL editor panel — the workbench doesn't need a full WebContainer)
- The workbench will continue using Monaco for SQL editing since it's a single-file query tool, not a full dev environment

### 6. Remove `src/components/canvas/CodeEditor.tsx`
This standalone Monaco wrapper becomes unnecessary for the Canvas page. It can be kept if the WorkbenchPage still uses it for the SQL query editor (it does), so we keep the file but it's no longer used by CanvasPage.

## Technical Details

**StackBlitz SDK `embedProject` call:**
```text
sdk.embedProject('container-id', {
  title: 'LAMPForge Project',
  description: 'Generated from architectural canvas',
  template: 'node',
  files: {
    'package.json': '...',
    'server.js': '...',
    'sql/schema.sql': '...',
    'php/db_connect.php': '...',
    'html/index.html': '...',
  }
}, {
  theme: 'dark',
  view: 'editor',
  hideExplorer: false,
  openFile: 'sql/schema.sql',
  terminalHeight: 30,
})
```

**Bi-directional sync via VM API:**
- `vm.applyFsDiff({ create: { 'sql/schema.sql': newContent }, destroy: [] })` — when canvas generates new SQL
- `vm.getFsSnapshot()` — to read files back if needed for evidence logging

**File update flow when a canvas entity is added:**
1. User adds/connects nodes on React Flow canvas
2. `CanvasPage` regenerates SQL/PHP from the node state
3. Calls `vmRef.current.applyFsDiff(...)` to write updated files into the running WebContainer
4. The embedded VS Code editor shows the updated files instantly
5. The LAMPForge CLI terminal below animates the SQL command for pedagogical effect

**What the student sees:**
- Left: The architectural canvas with draggable entity/transaction blocks
- Right: A real VS Code editor with file explorer, syntax highlighting, integrated terminal, and live preview — all running in WebContainers
- Bottom: The LAMPForge CLI with animated SQL generation and scaffolding hints

