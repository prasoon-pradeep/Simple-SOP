# Simple SOP (Alpha)

> **⚠️ ALPHA STATUS:** This software is currently in an early development phase. While functional, it may contain bugs or breaking changes. Use with caution in production environments and **always maintain independent backups of your SOP data.**

Simple SOP is an offline-first desktop application for creating, editing, reviewing, and exporting Standard Operating Procedures (SOPs).

It is built with:
- Tauri v2 for the desktop shell
- React + TypeScript for the UI
- Rust + SQLite for persistence and app-side commands

The product is intended for Linux and Windows in the initial release, with no cloud dependency and no user-auth requirement.

## Product goals

- Enable teams to author SOPs in a structured editor with immediate auto-save
- Keep all data local and portable
- Support revision history and approval metadata
- Export SOPs to printable, text-selectable PDF
- Support portable `.sop` import/export bundles

Detailed product requirements are documented in `docs/SOP_BUILDER_SPEC.md`.

## Current implementation status

The repository is under active phased development.

Implemented today:
- Tauri + React project scaffold
- SQLite initialization, schema creation, and DB integrity checks
- SOP ID generation command
- Core SOP create/read/update commands
- Basic revision save command and revision table loading
- Editor shell with:
  - Header section
  - Scope and Purpose section
  - Safety and Training section
  - Approval and Revisions table section
- Zustand store for in-memory app/editor state and dirty/saving flags
- Shared image flow components:
  - Upload/paste image
  - Crop modal (16:9, 4:3)
  - Annotation modal (arrow, circle, text, undo, skip)
  - Rust command to persist original + annotated image files by UUID

Still in progress:
- Full Home screen experience
- Full Viewer route
- Tools/Items/Steps/Definitions full CRUD workflows
- End-to-end `.sop` import/export
- End-to-end PDF generation pipeline wiring

## Repository structure

```text
Simple-SOP/
├── docs/
│   ├── SOP_BUILDER_SPEC.md          # Canonical product and implementation spec
│   ├── sop-builder-ui-reference.html
│   └── sop-pdf-template.html
├── src/                             # React frontend (TypeScript)
│   ├── components/
│   ├── pages/
│   ├── store.ts                     # Zustand state store
│   └── types.ts
├── src-tauri/                       # Rust backend and Tauri app
│   ├── src/
│   │   ├── commands.rs              # Tauri command handlers
│   │   ├── db.rs                    # DB init and schema setup
│   │   └── lib.rs                   # Tauri app bootstrap and command registration
│   └── tauri.conf.json
└── package.json
```

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- State management: Zustand
- Drag and drop: dnd-kit (planned usage in Steps flow)
- Image handling UI: react-image-crop, react-konva, konva
- Desktop runtime: Tauri v2
- Backend runtime: Rust, Tokio
- Database: SQLite via `sqlx`

## Local development setup

### Prerequisites

Install the following:
- Node.js 18+ and npm
- Rust toolchain (stable) via `rustup`
- Tauri system dependencies for your OS

Official Tauri prerequisites:
- [Linux prerequisites](https://tauri.app/start/prerequisites/)
- [Windows prerequisites](https://tauri.app/start/prerequisites/)

### Install dependencies

From project root:

```bash
npm install
```

### Run frontend only (Vite)

```bash
npm run dev
```

### Run desktop app (Tauri + frontend)

```bash
npm run tauri dev
```

### Build frontend bundle

```bash
npm run build
```

### Build distributable app

```bash
npm run tauri build
```

## Runtime data location

The app creates and manages data under the Tauri app data directory, including:
- `sop-builder.db` (SQLite database)
- `images/{uuid}/original.{ext}`
- `images/{uuid}/annotated.png`

No image blobs are stored in SQLite; DB records reference image UUIDs.

## Key architecture notes

- Auto-save is designed to happen on field changes with debounce.
- SQLite runs in WAL mode with foreign keys enabled.
- DB integrity check runs during initialization.
- `sops.approval_status` is intended to mirror latest revision status.
- SOP IDs follow `SOP-{YYYY}-{6CHAR}` format with an unambiguous character set.

See the spec for complete behavior rules and constraints.

## Useful scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - TypeScript check + Vite production build
- `npm run preview` - Preview production frontend build
- `npm run tauri dev` - Run Tauri app in development
- `npm run tauri build` - Build Tauri app for distribution

## Recommended development workflow

- Read `docs/SOP_BUILDER_SPEC.md` before implementing behavior changes
- Keep UI behavior aligned with `docs/sop-builder-ui-reference.html`
- Use Tauri commands for persistent writes
- Prefer small, phase-aligned commits
- Validate both frontend (`npm run build`) and Rust (`cargo check` in `src-tauri`) after meaningful changes

## Contributing notes

- Keep changes consistent with current phase goals and constraints
- Avoid introducing features explicitly marked out-of-scope in the spec
- Preserve local-first/offline design assumptions
- Ensure migrations/schema changes remain compatible with existing data

## License & Liability

This project is licensed by **SOP Builder Software** under the **MIT License + Commons Clause**. 

### **Key Terms:**
- **Free for Use:** Individuals and organizations can use, modify, and self-host the software for free.
- **No Resale:** You cannot sell this software or offer it as a paid service (SaaS) where the value is derived from the software itself.
- **No Liability:** The authors are **not responsible** for any data loss, physical harm, or business interruption resulting from the use of this software. It is a documentation tool, not a substitute for professional safety advice.
- **Trademarks:** The name "SOP Builder" and its logos are protected. You cannot use them to brand a competing service.

See the [LICENSE](LICENSE) file for the full legal text.
