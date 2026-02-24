

# LAMPForge MVP — Implementation Plan

## Overview
A Cognitive Engineering Platform that eliminates infrastructure friction for A-Level Digital Technology students, providing an architectural-first workflow with live code generation, in-browser execution, and AI-powered scaffolding.

---

## Page 1: Landing / Intent Declaration

- **Natural Language Input**: A prominent text area where the learner declares their project intent (e.g., "I need a multi-user library system with a book checkout feature")
- **Template Gallery**: Pre-built starter archetypes (Library System, E-Commerce Shop, School Management) as fallback cards
- **"Forge It" Button**: Sends the intent to the AI engine, which parses it into entities, relationships, and CRUD operations
- The AI returns a structured project blueprint (entities, relationships, pages, transactions)

## Page 2: The Split-Screen Architectural Canvas (Core Experience)

### Pane A — Visual Architecture Blocks (Left)
- **Interactive node-based canvas** using React Flow
- **5-Family Taxonomy blocks** with distinct visual styles:
  - 🔵 **Blueprint** (Entity nodes with fields, types, constraints)
  - 🟢 **Plumbing** (Connection edges with Crow's Foot notation — 1:1, 1:M, M:M)
  - 🟠 **Transaction** (CRUD operation blocks — Create, Read, Update, Delete)
  - 🔴 **Forge** (Server/DB provisioning status indicators)
  - 🟣 **Oracle** (AI feedback/validation nodes)
- **Drag-and-drop** to connect entities with relationships
- **Bi-directional sync**: Changes in blocks update the code; manual code edits update blocks

### Pane B — Live Code Environment (Right)
- **Monaco Editor** (same engine as VS Code) with syntax highlighting for SQL, PHP, HTML
- **Tabbed file explorer** showing auto-generated project structure:
  - `/sql/schema.sql` — Generated DDL statements
  - `/php/db_connect.php` — Connection boilerplate
  - `/php/crud_*.php` — CRUD operations per entity
  - `/html/forms/` — Auto-generated forms
- **Live preview iframe** below the editor showing the running application

### Bottom Panel — LAMPForge CLI Terminal
- **Animated SQL generation**: When a relationship is drawn on the canvas, the terminal animates the exact `CREATE TABLE` / `ALTER TABLE` / `FOREIGN KEY` SQL command character-by-character
- **Command history** for examiner evidence
- **SQL execution output** showing query results in tabular format
- Students can type and run their own SQL queries here

## Page 3: SQL Workbench View

- **Database schema visualizer** showing all tables with columns, types, and relationships (like MySQL Workbench's EER diagram)
- **Query editor** with syntax highlighting and auto-complete
- **Results grid** showing query output in a table
- **Query history log** with timestamps (for WJEC evidence)
- Powered by sql.js (SQLite in WASM) for instant in-browser execution
- All data automatically synced to Supabase for cloud persistence and "ghost" backup

## Page 4: Evidence & SDLC Logger

- **Automatic screenshot capture** at key development milestones
- **Timeline view** of all changes with timestamps
- **SQL history export** — every query run, with before/after states
- **Iterative development log** showing the SDLC stages
- **Export to PDF** for WJEC submission portfolio
- All evidence auto-generated from user actions — no manual documentation needed

---

## AI-Powered Features (Throughout)

- **Intent-to-Schema Translation**: Natural language → entity-relationship model → SQL DDL → PHP CRUD boilerplate, all generated via Lovable AI Gateway (swappable to local inference later)
- **Theory of Mind Monitoring**: Track turn-taking frequency, action entropy, and time-on-task
- **Adaptive Scaffolding**: When the system detects "stuck" behavior (high entropy, rapid clicks without progress), the CLI deploys targeted hints
- **Comprehension Checkpoints**: Periodic micro-questions to verify the student understands the generated code

## Technical Architecture

- **WebContainer SDK** (StackBlitz) for in-browser Node.js runtime
- **sql.js** for in-browser SQLite execution (presenting as MySQL-like syntax)
- **Supabase** for cloud persistence, auth, and project saving
- **Lovable AI Gateway** for intent parsing and scaffolding (designed for future swap to local models like Arch-Router-1.5B)
- **React Flow** for the visual node-based architecture canvas
- **Monaco Editor** for the code editing experience
- **Vite HMR** via WebContainers for instant preview updates

## Design System

- Dark IDE-inspired theme with syntax-highlighting-colored accents
- The 5-Family Taxonomy uses distinct, accessible color coding throughout
- Monospace fonts for code, clean sans-serif for UI
- Animated transitions when blocks generate code (the "magical" feeling)
- ASCII art tutor character in the CLI for scaffolding interventions

