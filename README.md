# SOP Builder (Alpha)

> **⚠️ ALPHA STATUS:** This software is in an early release phase. While functional end-to-end, it may contain bugs or breaking changes. Always maintain independent backups of your SOP data.

SOP Builder is an offline-first desktop application for creating, editing, reviewing, and exporting Standard Operating Procedures (SOPs).

---

## About

SOP Builder bridges the gap between "paper and pencil" and complex enterprise SaaS. Technical and industrial teams often struggle with documentation that is either too messy to follow or locked behind expensive, cloud-only subscriptions.

**Mission:** A professional-grade, local-first tool that gives teams full ownership of their knowledge.

### Why SOP Builder?
- **Data Sovereignty:** SOPs are stored in a local SQLite vault. No cloud, no login, no data tracking.
- **Industrial Rigor:** Built-in revision history, approval workflows, and unique SOP ID tracking.
- **Visual First:** Integrated image annotation tools designed for step-by-step mechanical and technical instructions.
- **Portable:** Export your library to self-contained `.sop` bundles for offline sharing across high-security facilities.

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State:** Zustand
- **Drag and drop:** dnd-kit (Steps reordering)
- **Image handling:** react-image-crop, react-konva, konva
- **Desktop runtime:** Tauri v2
- **Backend:** Rust, Tokio
- **Database:** SQLite via `sqlx`

---

## Features

- Author SOPs in a structured editor with auto-save
- Revision history and approval metadata
- Full Tools and Items library with search and clone
- Step editor with image annotation, tool/item attachments, and drag-to-reorder
- Export SOPs to printable, text-selectable PDF
- Portable `.sop` import/export bundles
- In-app auto-update (checks GitHub releases on launch)

---

## Local development

### Prerequisites

- Node.js 20+ and npm
- Rust stable toolchain via `rustup`
- Tauri v2 system dependencies: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

**Linux extra packages:**
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev patchelf
```

### Setup

```bash
npm install
```

### Run

```bash
npm run tauri dev        # Full desktop app (Tauri + frontend)
npm run dev              # Frontend only (Vite)
```

### Build

```bash
npm run tauri build      # Distributable installer/package
npm run build            # Frontend bundle only
```

---

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
│   │   ├── Home.tsx
│   │   ├── Editor.tsx
│   │   ├── Viewer.tsx
│   │   └── Settings.tsx
│   ├── store.ts
│   └── types.ts
├── src-tauri/                       # Rust backend and Tauri app
│   ├── src/
│   │   ├── commands.rs              # Tauri command handlers
│   │   ├── db.rs                    # DB init and schema
│   │   └── lib.rs                   # App bootstrap
│   └── tauri.conf.json
└── package.json
```

---

## Architecture notes

- Auto-save triggers on field changes with debounce.
- SQLite runs in WAL mode with foreign keys enabled.
- DB integrity check runs at initialization.
- Images are stored on disk by UUID; SQLite holds only references.
- SOP IDs follow `SOP-{YYYY}-{6CHAR}` format with an unambiguous character set.
- Updates are served via a signed `latest.json` on GitHub Releases.

See `docs/SOP_BUILDER_SPEC.md` for complete behavior rules and constraints.

---

## Development workflow

- Read `docs/SOP_BUILDER_SPEC.md` before implementing behavior changes.
- Keep UI aligned with `docs/sop-builder-ui-reference.html`.
- Use Tauri commands for all persistent writes.
- Validate both frontend (`npm run build`) and Rust (`cargo check` in `src-tauri/`) after meaningful changes.

---

## License

Licensed by **SOP Builder Software** under the **MIT License + Commons Clause**.

- **Free for use:** Individuals and organizations can use, modify, and self-host for free.
- **No resale:** You cannot sell this software or offer it as a paid SaaS.
- **No liability:** Authors are not responsible for data loss, physical harm, or business interruption.
- **Trademarks:** "SOP Builder" and its logos cannot be used to brand a competing service.

See [LICENSE](LICENSE) for the full legal text.
