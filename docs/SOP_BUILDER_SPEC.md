# SOP Builder — Full Product Specification
> For AI coding agents. Build exactly as described. No assumptions. No additions unless marked optional.

---

## 1. PRODUCT OVERVIEW

A cross-platform **offline desktop application** for authoring Standard Operating Procedures (SOPs). Built with Tauri v2 (Rust backend) + React + TypeScript frontend.

**Primary output:** A pixel-accurate, text-selectable PDF exported from an HTML template rendered in a Tauri webview.  
**Secondary output:** A portable `.sop` file (self-contained bundle) that can be transferred between machines and fully reconstructed.  
**Target platforms:** Linux and Windows (day one). macOS later.  
**Auth:** None. No user accounts.  
**Auto-save:** Every change persisted to SQLite immediately. No manual save required.

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend language | TypeScript |
| Frontend framework | React 18 |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui |
| Local database | SQLite via `rusqlite` (Rust) |
| Rust DB layer | `sqlx` (async, type-safe) |
| Image annotation | Konva.js + react-konva |
| PDF export | Tauri webview → print-to-PDF (Rust orchestrated) |
| Drag to reorder | dnd-kit |
| State management | Zustand |
| `.sop` export/import | Rust (zip bundle, custom extension) |

---

## 3. DATA STORAGE ARCHITECTURE

### 3.1 App-Managed Directory
Tauri manages a single app data directory (platform-appropriate: `~/.local/share/sop-builder` on Linux, `%APPDATA%\sop-builder` on Windows).

Structure:
```
sop-builder/
├── sop-builder.db          # SQLite database
└── images/
    └── {uuid}/
        ├── original.{ext}  # Original uploaded/pasted image
        └── annotated.png   # Post-annotation version (used in SOP/PDF)
```

### 3.2 SQLite — No image blobs
Images are stored as files. SQLite stores only UUID references. No absolute file paths stored — always resolved relative to app data dir at runtime.

### 3.3 Image Rules
- Accepted aspect ratios: **16:9** (preferred) and **4:3** only.
- On upload or paste: show a **crop window** first. User crops to either 16:9 or 4:3.
- After crop: show optional **annotation window** (Konva.js). User can annotate or skip.
- Save both `original.{ext}` and `annotated.png` (even if no annotation — annotated is a copy of cropped original).
- `annotated.png` is always what appears in SOP and PDF.
- UUID is generated per image on creation.

---

## 4. DATABASE SCHEMA

### 4.1 `sops` table
```sql
CREATE TABLE sops (
  id                  TEXT PRIMARY KEY,        -- UUID
  sop_id              TEXT UNIQUE NOT NULL,    -- e.g. SOP-2025-8F3AB2
  version             INTEGER NOT NULL DEFAULT 1,
  title               TEXT NOT NULL,
  project_tag         TEXT,
  department          TEXT,
  document_owner      TEXT,
  created_by          TEXT,
  created_date        TEXT,                    -- ISO8601 date
  active_date         TEXT,                    -- ISO8601 date
  next_review_date    TEXT,                    -- ISO8601 date
  approval_status     TEXT,                    -- derived: always mirrors latest revision's approval_status. Never edited directly.
  regulatory_ref      TEXT,
  distribution_list   TEXT,                    -- free text
  related_documents   TEXT,                    -- free text (SOP IDs comma separated)
  purpose             TEXT,
  scope               TEXT,
  safety_notes        TEXT,
  training_required   INTEGER DEFAULT 0,       -- 0 = No, 1 = Yes
  training_details    TEXT,
  is_deleted          INTEGER NOT NULL DEFAULT 0, -- soft delete flag: 0 = active, 1 = deleted
  deleted_at          TEXT,                    -- ISO8601 datetime, set on soft delete
  created_at          TEXT NOT NULL,           -- ISO8601 datetime auto
  updated_at          TEXT NOT NULL            -- ISO8601 datetime auto
);
```

For existing databases, add a migration that:
- Adds `is_deleted INTEGER NOT NULL DEFAULT 0` to `sops`
- Adds `deleted_at TEXT` to `sops`
- Leaves all existing SOP rows as active (`is_deleted = 0`)

### 4.2 SOP ID Format
No sequence table needed. SOP ID is generated from current year + millisecond epoch timestamp suffix.

**Format:** `SOP-{YYYY}-{6CHAR}`  
**Example:** `SOP-2025-8F3AB2`

Where `6CHAR` is a 6-character string derived from the epoch millisecond timestamp, using only unambiguous characters.

### 4.3 `revisions` table
```sql
CREATE TABLE revisions (
  id              TEXT PRIMARY KEY,          -- UUID
  sop_id          TEXT NOT NULL,             -- references sops.id
  version         INTEGER NOT NULL,          -- 1, 2, 3...
  revision_notes  TEXT NOT NULL,             -- "Initial Draft" for V1, user-written after
  revised_by      TEXT,
  revision_date   TEXT NOT NULL,             -- ISO8601 datetime, auto on creation
  approval_status TEXT,                      -- e.g. Draft, Under Review, Approved, Rejected
  approved_by     TEXT,
  approval_date   TEXT,                      -- ISO8601 date, user picked
  FOREIGN KEY (sop_id) REFERENCES sops(id)
);
```

### 4.4 `definitions` table
```sql
CREATE TABLE definitions (
  id      TEXT PRIMARY KEY,
  sop_id  TEXT NOT NULL,
  term    TEXT NOT NULL,
  meaning TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (sop_id) REFERENCES sops(id)
);
```

### 4.5 `tools` table
```sql
CREATE TABLE tools (
  id                  TEXT PRIMARY KEY,   -- UUID
  sop_id              TEXT NOT NULL,      -- local to this SOP
  name                TEXT NOT NULL,
  type                TEXT,               -- 'physical' or 'digital'
  model_part_no       TEXT,
  specification       TEXT,
  image_uuid          TEXT,               -- references images folder
  calibration_required INTEGER DEFAULT 0,
  calibration_due_date TEXT,
  source_tool_uuid    TEXT,               -- UUID of original if cloned from another SOP
  FOREIGN KEY (sop_id) REFERENCES sops(id)
);
```

### 4.6 `items` table
```sql
CREATE TABLE items (
  id            TEXT PRIMARY KEY,   -- UUID
  sop_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  part_no       TEXT,
  description   TEXT,
  image_uuid    TEXT,
  unit          TEXT,               -- pcs, kg, ml, etc.
  source_item_uuid TEXT,            -- UUID of original if cloned
  FOREIGN KEY (sop_id) REFERENCES sops(id)
);
```

### 4.7 `steps` table
```sql
CREATE TABLE steps (
  id          TEXT PRIMARY KEY,   -- UUID
  sop_id      TEXT NOT NULL,
  step_number INTEGER NOT NULL,   -- auto-recalculated on reorder
  action      TEXT,
  notes       TEXT,
  expected_output TEXT,
  sort_order  INTEGER NOT NULL,   -- used for drag reorder
  FOREIGN KEY (sop_id) REFERENCES sops(id)
);
```

### 4.8 `step_images` table
```sql
CREATE TABLE step_images (
  id          TEXT PRIMARY KEY,
  step_id     TEXT NOT NULL,
  image_uuid  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
```

### 4.9 `step_tools` table
```sql
CREATE TABLE step_tools (
  id          TEXT PRIMARY KEY,
  step_id     TEXT NOT NULL,
  tool_id     TEXT,               -- NULL if free text
  free_text   TEXT,               -- NULL if library pick
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
```

### 4.10 `step_items` table
```sql
CREATE TABLE step_items (
  id          TEXT PRIMARY KEY,
  step_id     TEXT NOT NULL,
  item_id     TEXT,               -- NULL if free text
  free_text   TEXT,               -- NULL if library pick
  quantity    REAL,
  unit        TEXT,
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
```

---

## 5. SOP ID GENERATION (Rust)

**Format:** `SOP-{YYYY}-{6CHAR}`

**Character set:** 14 unambiguous hex characters only — `23456789ABCDEF`  
(Excluded: `0`, `1`, `O`, `I` — visually ambiguous, especially when handwritten or printed)

**Algorithm:**
```
On creating a new SOP:
1. Get current year (YYYY)
2. Get current epoch time in milliseconds (u128)
3. Convert to hex string
4. Take last 8 characters of hex string
5. Filter out any chars not in [23456789ABCDEF]
6. Take first 6 characters of filtered result
7. If fewer than 6 chars remain after filter (extremely rare): pad by repeating step 2 with +1ms
8. Final ID: SOP-{YYYY}-{6CHAR}  e.g. SOP-2025-8F3AB2
```

**Collision probability:** 14⁶ = 7,529,536 combinations. Two machines would need to create a SOP at the exact same millisecond AND produce the same 6-char suffix. Effectively zero risk for this use case.

**Display font rule:** Always render SOP IDs in a monospace font (`JetBrains Mono` or `Fira Code`) everywhere in the UI and PDF to eliminate any remaining visual ambiguity between characters.

---

## 6. APP PAGES, NAVIGATION & USER FLOWS

### 6.1 Pages (Routes)

| Route | Description |
|---|---|
| `/` | Home screen — flat SOP list |
| `/sop/:id/view` | Viewer — read-only PDF template preview |
| `/sop/:id/edit` | Editor — full SOP authoring with 8 section tabs |

### 6.2 Sidebar Modes

The sidebar has three modes. Only one is visible at a time. Mode switches instantly with no animation.

| Mode | When shown | Primary purpose |
|---|---|---|
| **Mode A — App Nav** | Home screen | Navigate workspace, projects, create SOP |
| **Mode B — Editor Nav** | SOP open in editor | 8 section tabs + export actions |
| **Mode C — Viewer Nav** | SOP open in viewer | Edit button + print/export PDF |

---

### 6.3 Home Screen (`/`)
- Clean flat list/table of all SOPs
- Columns: **SOP ID | Project | Title | Date Released | Status | Version | Actions**
- Search bar: filter by SOP ID, Project, Title, Department, Status (metadata only, no full-text search)
- Filter chips: Status, Department, Project
- **Create SOP** button: top-right of page header AND in sidebar Mode A
- **Import .sop** button: also on home screen (placement: top-right, alongside Create SOP)
- Each row click → opens **Viewer** (`/sop/:id/view`)
- **Actions column** (always visible, not hover-only): three icon buttons per row — **View** (opens Viewer), **Edit** (opens Editor directly, sets `editorOrigin = 'home'`), **Delete** (soft-delete confirm modal)
- Project filter in sidebar: clicking a project filters the list to that project tag. "All SOPs" clears filter.
- No dashboard, no stats, no kanban

### 6.4 Viewer (`/sop/:id/view`)
- Renders the SOP as the HTML/CSS PDF template inside the app — exactly as it will appear in the exported PDF
- Read-only. No editable fields.
- Sidebar Mode C contents:
  - Back link (← All SOPs) → navigates to Home
  - SOP ID (monospace)
  - SOP title (truncated)
  - Current status badge
  - **Edit SOP** button (primary) → switches to Editor for this SOP
  - Divider
  - **Export PDF** button (ghost, full width) → triggers Tauri print-to-PDF
  - DB health indicator

### 6.5 Editor (`/sop/:id/edit`)
- Sidebar Mode B: 8 section tabs, user can jump freely, no forced order
- Every field change auto-saves to SQLite (debounced 500ms)
- Dirty state tracked in Zustand
- Sidebar Mode B footer: Export .sop | Export PDF | DB health
- Back link (← All SOPs or ← View SOP depending on origin — see flows below)

---

### 6.4 User Flows

#### Flow 1 — Create New SOP
```
Home
  → click "Create SOP" (sidebar or page header button)
  → app generates new SOP ID (SOP-{YYYY}-{6CHAR})
  → auto-inserts V1 revision row ("Initial Draft", Draft status)
  → navigate to Editor (/sop/:id/edit)
  → Header section active by default
  → user fills sections freely, every change auto-saved
  → user clicks back link "← All SOPs"
    → dirty flag true? → show exit warning modal
      → "Log Revision & Exit" → save revision → navigate to Home
      → "Exit Without Revision" → navigate to Home
      → "Cancel" → stay in editor
    → dirty flag false? → navigate to Home directly
  → SOP appears in home list (status = Draft, V1)
```

#### Flow 2 — View Existing SOP
```
Home
  → click any row in SOP list
  → navigate to Viewer (/sop/:id/view)
  → PDF template rendered inline, read-only
  → sidebar shows: back link | SOP ID | title | status badge | Edit SOP | Export PDF
```

#### Flow 3 — Edit Existing SOP
```
Viewer (/sop/:id/view)
  → click "Edit SOP" in sidebar
  → navigate to Editor (/sop/:id/edit)
  → all fields pre-filled from SQLite
  → back link in editor reads "← View SOP" (not "← All SOPs")
  → user edits, auto-saves
  → user clicks "← View SOP"
    → dirty flag true? → show exit warning modal → log or skip → navigate to Viewer
    → dirty flag false? → navigate to Viewer directly
  → Viewer shows updated SOP with new content
```

#### Flow 4 — Export PDF
```
Viewer (/sop/:id/view)
  → click "Export PDF" in sidebar
  → Tauri renders HTML template in hidden webview with SOP data injected
  → print-to-PDF
  → native file save dialog → user picks location
  → filename: {SOP-ID}-V{N}.pdf  e.g. SOP-2025-8F3AB2-V3.pdf
  → stays in Viewer after export
```

#### Flow 5 — Export .sop File
```
Editor (/sop/:id/edit)
  → click "Export .sop" in sidebar footer
  → Rust bundles SQLite snapshot (this SOP only) + all referenced image files → .sop zip
  → native file save dialog
  → stays in Editor after export
  → does NOT trigger dirty flag or revision prompt
```

#### Flow 6 — Import .sop File
```
Home
  → click "Import .sop" button
  → native file picker → user selects .sop file
  → Rust unpacks bundle → validates manifest
  → checks if SOP UUID already exists in local DB:
    → conflict: ask "Replace existing or import as new copy?"
    → no conflict: import directly
  → reconstructs all DB records + copies image files to app images dir
  → navigate to Viewer (/sop/:id/view) for the imported SOP
```

#### Flow 7 — Filter by Project
```
Home (Mode A sidebar)
  → click project name (e.g. "Gen Alpha")
  → home list filters to SOPs with that project tag
  → active project highlighted in sidebar
  → click "All SOPs" → clears filter, shows all SOPs
```

---

### 6.5 Back Navigation Summary

| Current location | Back link reads | Navigates to | Exit warning? |
|---|---|---|---|
| Editor (from Create SOP) | ← All SOPs | Home | Yes if dirty |
| Editor (from Viewer) | ← View SOP | Viewer | Yes if dirty |
| Viewer | ← All SOPs | Home | Never (read-only) |

---

### 6.6 No Other Pages.
Dashboard, analytics, settings page — not in scope for initial build.

---


## 7. SOP EDITOR — SECTION DETAILS

### 7.1 Header Section
All fields are free text unless noted.

| Field | Type | Notes |
|---|---|---|
| SOP ID | Auto-generated | Read-only, shown on creation |
| Version | Auto integer | Read-only, increments on revision save |
| Title | Text input | Required |
| Project Tag | Text input | Used for grouping/search |
| Department | Text input | |
| Document Owner | Text input | |
| Created By | Text input | |
| Created Date | Date picker | |
| Active / Release Date | Date picker | |
| Next Review Date | Date picker | |
| Regulatory Reference | Text input | e.g. "ISO 9001:2015" |
| Distribution List | Text area | Free text |
| Related Documents | Text input | Free text, e.g. other SOP IDs |

### 7.2 Scope & Purpose Section
| Field | Type |
|---|---|
| Purpose | Rich text area (plain text, multiline) |
| Scope | Rich text area (plain text, multiline) |

### 7.3 Safety Section
| Field | Type |
|---|---|
| Safety Notes | Rich text area |
| Training Required | Toggle (Y/N) |
| Training Details | Text area (visible only when Training Required = Y) |

### 7.4 Tools Library Section
- Table of tools local to this SOP
- Add / Edit / Delete rows
- **Search other SOPs** button: search by tool name across all SOPs in DB → select → clones tool into current SOP with `source_tool_uuid` set
- Dedup logic: when displaying search results, tools with same `source_tool_uuid` show once

| Field | Type |
|---|---|
| Name | Text (required) |
| Type | Dropdown: Physical / Digital |
| Model / Part No. | Text |
| Specification / Remarks | Text |
| Image | Upload (goes through crop → annotation flow) |
| Calibration Required | Toggle Y/N |
| Calibration Due Date | Date picker (visible if calibration required = Y) |

### 7.5 Items / Parts Library Section
- Same pattern as Tools Library
- Add / Edit / Delete rows
- Cross-SOP search + clone same as tools

| Field | Type |
|---|---|
| Name | Text (required) |
| Part No. / SKU | Text |
| Description / Remarks | Text |
| Image | Upload (crop → annotation flow) |
| Unit | Text (pcs, kg, ml, etc.) |

### 7.6 Steps Section
- Scrollable list of steps
- **Add Step** button appends new step at bottom
- Each step is a card/panel with all fields
- **Drag handle** on each step for reorder (dnd-kit). On reorder: recalculate and update all `step_number` values sequentially
- **Duplicate Step** button on each step: creates full copy with new UUID, images re-referenced (not re-uploaded), appended below original. After duplication user can fully edit: remove images, change tools/items, edit any field independently
- **Delete Step** button with confirm dialog
- Step number displayed as read-only label (auto)

**Per step fields:**

| Field | Type | Notes |
|---|---|---|
| Step Number | Auto label | Read-only |
| Action / Instruction | Text area | Main instruction |
| Expected Output | Text input | What should result from this step |
| Notes / Cautions | Text area | |
| Tools Needed | Multi-select from Tools Library + free text fallback | Renders as tag list |
| Items Needed | Multi-select from Items Library + free text fallback, each with qty + unit | |
| Images | Multiple uploads/pastes | Each goes through crop (16:9 or 4:3) → annotation → saved. If multiple images, each renders as a sub-row below the step in PDF |

**Tools/Items input UX:**
- Primary: dropdown/search from SOP's library → select → appears as tag
- Fallback: type free text → press enter → appears as tag (different visual style from library tags)
- Both types can coexist in same step

**Item linking UX (items only — tools have no qty/unit):**
- When a library item is selected, it appears inline with two fields alongside the item name:
  - **Unit** — pre-filled read-only from `items.unit` in the library. If the library item has no unit defined, shows an editable text input
  - **Qty** — small number input, empty by default, placeholder "qty"
- When a free-text item is added, both qty (number input) and unit (editable text input) are shown empty
- If user clicks Link/Add without entering a qty, show a small confirmation modal:
  - Title: "No Quantity Entered"
  - Message: "You haven't specified a quantity for [Item Name]. Do you want to add it without a quantity?"
  - Buttons: **"Add Anyway"** (links with qty = null, renders as "—" in PDF) | **"Go Back"** (dismisses modal, returns to input)
- If qty is filled it must be a valid positive number — do not allow 0 or negative
- Unit pre-fills automatically from the library record and is never editable for library items

### 7.7 Definitions Section (End of SOP)
- Dynamic table: user adds/removes rows
- Columns: **Term | Meaning**
- Sort order preserved as entered
- Rendered at the very end of the SOP PDF after all steps

---

## 8. IMAGE HANDLING FLOW

```
User uploads file OR pastes screenshot
        ↓
Validate: is it an image?
        ↓
Show CROP WINDOW
  - Show image with crop overlay
  - User selects 16:9 or 4:3 ratio (default 16:9)
  - User adjusts crop area
  - Confirm crop
        ↓
Show ANNOTATION WINDOW (optional, user can skip)
  - Canvas with cropped image as background (Konva.js)
  - Toolbar: Arrow | Circle | Text Label
  - Arrow: click start point, drag to end point, arrow rendered
  - Circle: click center, drag radius
  - Text Label: click position, type text
  - Undo button
  - "Done" or "Skip Annotation" button
        ↓
Save:
  - original.{ext} → images/{uuid}/original.{ext}
  - annotated.png  → images/{uuid}/annotated.png
  - Insert into SQLite: step_images or tool/item image_uuid
        ↓
Display annotated.png in editor
```

---

## 9. DATABASE INTEGRITY & WAL

### 9.1 SQLite PRAGMAs (run on every DB init)
```sql
PRAGMA journal_mode=WAL;        -- crash-safe writes, no lock contention on rapid auto-save
PRAGMA synchronous=NORMAL;      -- balance between safety and performance
PRAGMA foreign_keys=ON;         -- referential integrity enforced
```

### 9.2 Corruption Prevention
- `PRAGMA integrity_check` runs on every app launch. If it fails: show error dialog, do not open app, instruct user to restore from `.sop` backup
- All writes via Rust Tauri commands — atomic, never partial
- Auto-save debounced at 500ms — not every keystroke
- Before any `.sop` export: run integrity check, abort export if check fails and notify user

---

## 10. AUTO-SAVE BEHAVIOUR

- Every field change (onBlur or onChange with debounce 500ms): write to SQLite via Tauri command
- In-memory dirty flag: set to `true` on any change, reset to `false` after each successful DB write
- Data is never lost on exit regardless — auto-save has already persisted everything. Revision prompt is purely for audit trail, not data safety.
- If dirty flag is `false`: close/navigate freely, no prompt

---

## 11. REVISION PROMPT & EXIT FLOW

### 11.1 Exit Triggers — show prompt if dirty flag is true
| Trigger | Show Prompt? |
|---|---|
| Window close button (X) | ✅ Yes |
| Navigate to Home Screen | ✅ Yes |
| Open a different SOP | ✅ Yes |
| Import a `.sop` file | ✅ Yes |
| Switch sections within same SOP (Header → Steps etc.) | ❌ No |
| Export PDF | ❌ No |
| Export `.sop` file | ❌ No |
| App loses focus / alt-tab | ❌ No |
| Screen lock / sleep | ❌ No |

### 11.2 Prompt Modal
```
┌─────────────────────────────────────────┐
│  You have unsaved changes               │
│                                         │
│  Would you like to log a revision       │
│  before leaving?                        │
│                                         │
│  [ Log Revision & Exit ]                │
│  [ Exit Without Revision ]              │
│  [ Cancel ]                             │
└─────────────────────────────────────────┘
```

- **Log Revision & Exit:**
  - Expand inline form:
    - Revision Notes (text area, required)
    - Revised By (text input)
    - Approval Status (text input)
    - Approved By (text input)
    - Approval Date (date picker)
  - On confirm: insert into `revisions` table, increment `version` in `sops` table, update `sops.approval_status` to mirror latest revision, reset dirty flag, proceed with exit/navigate
  - Revision Notes is required — do not allow confirm with empty field

- **Exit Without Revision:**
  - Proceed with exit/navigate immediately
  - No revision logged, version NOT incremented
  - Data already safe in SQLite via auto-save

- **Cancel:**
  - Close modal, user stays on current page, nothing changes

---

## 12. APPROVAL & REVISIONS

### 12.1 V1 Auto-Creation
On new SOP creation, V1 revision row is automatically inserted:
```
revision_notes  = "Initial Draft"
revised_by      = value of sops.created_by (if filled) or empty
revision_date   = SOP creation timestamp (auto)
approval_status = "Draft"
approved_by     = empty
approval_date   = empty
```

### 12.2 sops.approval_status Mirroring
`sops.approval_status` is never edited directly. It is always kept in sync with the latest revision's `approval_status`. Any time a revision is inserted or updated, run:
```sql
UPDATE sops SET approval_status = (
  SELECT approval_status FROM revisions
  WHERE sop_id = ? ORDER BY version DESC LIMIT 1
) WHERE id = ?;
```

### 12.3 Approval & Revisions Section (Editor Tab 8)
- **Top:** Read-only revision history table (all versions, newest first)

| Column | Value |
|---|---|
| Version | V1, V2... |
| Revision Notes | |
| Revised By | |
| Revision Date | |
| Approval Status | |
| Approved By | |
| Approval Date | |

- **Bottom:** "Log New Revision" button → inline form appears with:
  - Revision Notes (text area, required)
  - Revised By (text input)
  - Approval Status (text input)
  - Approved By (text input)
  - Approval Date (date picker)
  - Confirm button → inserts new revision row, increments `sops.version`, updates `sops.approval_status`, resets dirty flag

### 12.4 Revision via Exit Prompt
Same fields as 12.3 inline form, presented inside the exit modal when dirty flag is true. On confirm: same DB writes as above, then proceeds with exit/navigate.

### 12.5 Two Valid Paths to Log a Revision
1. **Exit prompt** — triggered automatically on dirty exit
2. **Approval & Revisions tab** — user logs manually anytime mid-session without closing app

Both paths produce identical DB records. Both reset the dirty flag after save.

---

## 13. CROSS-SOP TOOL/ITEM SEARCH

When user clicks "Search other SOPs" in Tools or Items library:
1. Show search modal with text input
2. Query all `tools` (or `items`) across all SOPs WHERE name LIKE `%query%`
3. Dedup: group by `source_tool_uuid` (or `id` if `source_tool_uuid` is null) — show each unique tool once
4. User selects tool(s) → clone into current SOP:
   - New row inserted into `tools`/`items` with new UUID
   - `source_tool_uuid` = original tool's `id` (or its own `source_tool_uuid` if it was already a clone)
   - All fields copied
   - Image: copy image files to new UUID folder, reference new UUID

---

## 14. .SOP FILE FORMAT (Export/Import)

### Export (Rust)
```
1. Create temp directory
2. Export SQLite DB snapshot (all tables for this SOP only) as sop-data.json
   - Include: sop, revisions, definitions, tools, items, steps, step_images, step_tools, step_items
3. Copy all referenced image folders (by UUID) into temp/images/
4. Write manifest.json: { app_version, export_date, sop_id, sop_uuid }
5. Zip entire temp directory → {SOPID}-V{N}.sop
6. Save to user-chosen location (Tauri file dialog)
```

### Import (Rust)
```
1. User selects .sop file (Tauri file dialog)
2. Unzip to temp directory
3. Read manifest.json — validate app_version compatibility
4. Read sop-data.json
5. Check if SOP UUID already exists in local DB:
   - If yes: ask user "Replace existing or import as new copy?"
   - If new copy: generate new SOP ID, new UUIDs for all records
6. Copy images/{uuid}/ folders into app images directory
7. Insert all records into SQLite
8. Open SOP in editor
```

---

## 15. PDF EXPORT

### Template File
`sop-pdf-template.html` — **complete and ready for integration** (as of 2026-05-01).

Key characteristics of the template:
- A4 portrait, 15mm margins all sides
- Greyscale throughout; brand colour applied only to company name via `--brand` CSS variable
- Data injected at runtime via `window.SOP_DATA` JSON object (Tauri sets this before webview renders)
- Running header (company | SOP ID) and footer (page number | status | revision) via `@page` margin boxes, values injected dynamically by JS into a `<style>` block (CSS variables cannot be used in `@page content`)
- Tables: Tools Library, Items/Parts Library (with image thumbnail column), Procedure/Steps (5 cols: Step | Action | Expected Output | Notes | Tools & Materials), Definitions, Revision History
- Steps table: Tools & Materials column uses a split-cell layout — tools sub-section on top, materials (with inline qty) below, separated by a hairline rule
- Zebra striping on Procedure, Definitions, and Revision History tables
- Image thumbnails render as sub-rows below each step (one sub-row per image)

### Pipeline
```
1. User clicks "Export PDF" in View mode
2. Tauri renders sop-pdf-template.html in a hidden webview
3. Inject SOP data as JSON into webview at render time (window.SOP_DATA)
4. Webview renders complete SOP (all sections, all steps, all images using annotated.png paths)
5. Tauri calls print-to-PDF on the webview
6. Save PDF to user-chosen location
7. Filename: {SOP-ID}-V{N}.pdf  e.g. SOP-2025-8F3AB2-V3.pdf
```

### PDF Content Order
1. Header fields (all)
2. Scope & Purpose
3. Safety Notes + Training info
4. Tools Library (summary table)
5. Items / Parts Library (summary table)
6. Steps (each step; images as sub-rows per image)
7. Definitions table
8. Revision History table

### PDF Properties
- Text fully selectable (not image-based)
- Status stamp on PDF reflects current `approval_status` field
- All images rendered as annotated.png at 16:9 or 4:3 ratio, consistent row widths
- Step sub-rows: if step has 3 images, step action/notes shown once, then 3 image sub-rows below

---

## 16. HOME SCREEN SEARCH

Filter SOPs by:
- SOP ID (exact or partial)
- Project Tag
- Title (partial match)
- Department
- Approval Status

All filters applied client-side from SQLite query. No full-text search on step content.

---

## 17. BUILD PHASES & TODO LIST

### PHASE 1 — Scaffold + Core DB
- [x] Init Tauri v2 project with React + TypeScript template
- [x] Configure Tailwind CSS + shadcn/ui
- [x] Set up Zustand store
- [x] Implement app-managed directory creation on first launch (Linux + Windows paths)
- [x] Implement SQLite init: create all tables on first launch (schema from Section 4)
- [x] Implement SOP ID generation logic (Section 5) as Tauri command
- [x] Implement auto-save Tauri commands for every table
- [x] Set up React Router: `/`, `/sop/:id/edit`, `/sop/:id/view`

### PHASE 2 — SOP Editor Core
- [x] Sidebar nav with 8 section tabs (jump freely)
- [x] Header section: all fields, date pickers, read-only fields (no approval fields here)
- [x] Scope & Purpose section
- [x] Safety section with conditional training fields
- [x] Dirty state tracking in Zustand
- [x] Revision prompt modal on exit/navigate away (with all revision + approval fields)
- [x] Approval & Revisions tab: revision history table (read-only) + Log New Revision inline form
- [x] V1 auto-insert on SOP creation ("Initial Draft")
- [x] sops.approval_status auto-mirror from latest revision on every revision write

### PHASE 3 — Image Handling
- [x] Image upload component (file input + paste from clipboard)
- [x] Crop window component: ratio selector (16:9 / 4:3), crop overlay, confirm
- [x] Annotation window component (Konva.js): arrow, circle, text label, undo, skip
- [x] Save both original + annotated to app images directory via Tauri command
- [x] UUID generation per image (Rust side)

### PHASE 4 — Tools & Items Libraries
- [x] Tools library table UI: add/edit/delete rows, all fields, image upload
- [x] Items library table UI: add/edit/delete rows, all fields
- [x] Cross-SOP search modal for tools (Section 13)
- [x] Cross-SOP search modal for items
- [x] Clone-on-borrow logic with source UUID tracking

### PHASE 5 — Steps Editor
- [x] Step card component with all fields
- [x] Add/Delete step buttons
- [x] Drag-to-reorder with dnd-kit, step_number recalculation
- [x] Duplicate step (full copy, independent after duplication)
- [x] Per-step image upload (multiple, crop+annotate flow)
- [x] Per-step tools multi-select (library + free text fallback tags)
- [x] Per-step items multi-select (library + free text fallback, qty + unit)

### PHASE 6 — Definitions Section
- [x] Dynamic table: add/remove rows, term + meaning columns
- [x] Sort order preserved

### PHASE 7 — Home Screen
- [x] Flat list table: SOP ID, Project, Title, Date Released, Status, Version
- [x] Metadata search/filter bar (SOP ID, project, title, department, status)
- [x] Project filter via sidebar Mode A — click project → filter list, click All SOPs → clear
- [x] "Create SOP" button (page header + sidebar) → generates SOP ID → V1 auto-insert → navigate to Editor
- [x] "Import .sop" button (page header, alongside Create SOP) → file picker → import flow (placeholder UI)
- [x] Row click → navigates to **Viewer** (`/sop/:id/view`), not editor
- [x] Sidebar Mode A fully implemented (app nav, project items, footer)

### PHASE 8 — Viewer (Read-Only)
- [x] Route `/sop/:id/view` — loads SOP from SQLite
- [x] Renders HTML/CSS PDF template inline (same template used for PDF export)
- [x] Read-only — no editable fields
- [x] Sidebar Mode C: back link (← All SOPs) | SOP ID | title | status badge | Edit SOP button | Export PDF button | DB health
- [x] "Edit SOP" button → navigate to Editor, back link in editor reads "← View SOP"
- [x] Back link "← All SOPs" → navigate to Home (no dirty check needed — viewer is read-only)
- [x] "Export PDF" in sidebar → triggers print-to-PDF (same pipeline as Phase 9)

### PHASE 8A — SOP Soft Delete
- [x] Add SOP delete action to the Home screen actions column
- [x] SOP delete uses a soft-delete flow only. No hard delete, no child-row deletion, no image-file deletion
- [x] Add a `Delete SOP` button in the Home table actions for each SOP row
- [x] Clicking `Delete SOP` opens a confirmation modal
- [x] Modal instructs user to type exactly `DELETEDDMMYY`
- [x] Delete confirm stays disabled until input exactly matches `DELETEDDMMYY`
- [x] On confirm: set `sops.is_deleted = 1`, set `sops.deleted_at = current ISO8601 datetime`
- [x] Soft-deleted SOPs are excluded from the default Home list
- [x] `get_sops` returns only rows where `is_deleted = 0`
- [x] No restore flow is required in this phase
- [x] No purge/hard-delete flow is required in this phase
- [x] No changes to related child tables are required in this phase
- [x] No image folder cleanup is required in this phase

### PHASE 9 — .SOP Export/Import
- [x] Export: serialize SOP data to JSON, bundle with images, zip as .sop (Rust)
- [x] Import: unzip, validate manifest, reconstruct DB records and image files (Rust)
- [x] File dialog for save/open (Tauri dialog API)
- [x] Conflict handling on import (replace vs import as new copy)
- [x] After import: navigate to Viewer for imported SOP
- [x] Export .sop accessible from Viewer sidebar

### PHASE 10 — PDF Export
- [x] Build HTML/CSS SOP template (iterated separately with stakeholder)
- [x] Tauri hidden webview render with injected SOP JSON via initialization_script
- [x] System print dialog triggered via window.print() — user selects "Print to File / Save as PDF"
- [x] PDF export accessible from Viewer sidebar ("Export PDF" button)
- [x] Template bundled as public/pdf-template.html, served via Vite dev server and dist

### PHASE 11 — Back Navigation & Origin Tracking
- [x] Track navigation origin in Zustand: `editorOrigin: 'home' | 'viewer'`
- [x] Editor back link reads "← View SOP" if origin = viewer, "← All SOPs" if origin = home
- [x] On exit from editor: navigate to origin (viewer or home) after dirty check resolves

### PHASE 12 — Polish & Testing
- [ ] Linux end-to-end test: create → view → edit → export PDF → export .sop → import on fresh install
- [ ] Windows end-to-end test: same flow
- [ ] Edge cases: empty steps, missing images, DB integrity check on launch, SOP ID collision guard
- [ ] App icon, window title, about screen

### BUG FIXES & REFINEMENTS (Session 2026-05-03)
- [x] **Bug 01:** Fixed Definitions loading in Editor (prevented data loss/duplication)
- [x] **Bug 02:** Aligned Home screen navigation with spec while adding Edit shortcut
- [x] **Bug 03:** Standardized 'Under Review' status across UI/DB with migration
- [x] **Bug 04:** Removed misleading 'Save Draft' button from header (Auto-save is sufficient)
- [x] **Bug 07:** Added missing 'Approval Date' column to Revision History table
- [x] **Bug 08:** Fixed immediate image preview in Tool dialogs
- [x] **Bug 09:** Improved Switch toggle contrast for 'unchecked' state
- [x] **Bug 10:** Enhanced CropWindow aspect ratio selector with visual SVG indicators
- [x] **Bug 11:** Enabled Tauri `protocol-asset` to fix broken images across the app
- [x] **Bug 12:** Fixed transparent Select dropdowns by defining shadcn HSL variables
- [x] **Bug 13:** Replaced native Date inputs with custom DatePicker for Linux compatibility
- [x] **Bug 14:** Standardized all images to fixed 16:9 `ImageFrame` with `object-contain`
- [x] **Bug 15:** Fixed 'jump' bug in AnnotationWindow drag-to-move logic
- [x] **Bug 16:** Prevented CropBox overflow when switching aspect ratios
- [x] **Bug 17:** Eliminated 'No Image' flicker by passing base64 directly to previews
- [x] **Bug 18:** Replaced blocking `window.prompt()` with inline text input in AnnotationWindow
- [x] **Bug 19:** Restored horizontal padding to StepCard textareas
- [x] **Bug 20:** Decoupled auto-save from revision flow using `hasUnsavedRevision` flag
- [x] **Bug 21:** Paginated PDF preview with natural A4 flow (CSS `break-inside` rules)
- [x] **Bug 22:** Renamed app to 'SOP Builder' in `package.json`
- [x] **Bug 23:** Renamed project branding in `Cargo.toml` and `main.rs`
- [x] **Refinement:** Showed saving indicator during step reorder in `ProcedureSection`
- [x] **Refinement:** Widened Visual Aid section in `StepCard` by 30%
- [x] **Refinement:** Aligned `StepCard` dividers in empty state by increasing action textarea `min-h`
- [x] **Feature:** Implemented draggability for annotations in 'select' mode
- [x] **Feature:** Added inline qty/unit entry + confirmation modal in StepResourcePicker
- [x] **Phase 9 complete:** .sop export/import fully wired including Viewer sidebar button
- [x] **Phase 10 complete:** PDF export via system print dialog — Export PDF button in Viewer sidebar opens PDF template in a new window with real SOP data injected, triggers print dialog
- [x] **PDF images:** Embedded as base64 data URIs in Rust — bypasses asset:// protocol issues in the dynamically created pdf-export webview
- [x] **PDF export UX:** Export PDF button disables for 10 s after click with "Generating PDF…" label to prevent duplicate triggers

### KNOWN ISSUES
- **PDF filename (Linux):** GTK print dialog hardcodes `output.pdf` — `document.title` is ignored by WebKitGTK. On Windows, WebView2 respects `document.title` so the correct `{SOP-ID}-V{N}.pdf` filename appears. No fix available without a different PDF engine.
- **PDF bottom margin (Linux):** WebKitGTK does not apply `@page` bottom margin at intermediate page breaks — the last row of content on a non-final page butts against the cut line with no trailing whitespace. Top, left, and right margins are correct. On Windows this renders correctly. Proper fix requires headless Chromium (heavy dependency) or a pure-Rust PDF library (`printpdf`). Deferred to a future release.

---

## 18. UI GUIDE — LAYOUT, DESIGN & COMPONENT BEHAVIOUR

A reference HTML mockup exists alongside this spec (`sop-builder-mockup.html`). Build the UI to match it. The following rules define the layout precisely.

### 18.1 Overall Layout

```
┌─────────────────────────────────────────────────────┐
│ HEADER (48px tall, full width)                      │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   SIDEBAR    │         MAIN CONTENT                 │
│   (224px)    │         (flex: 1)                    │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

- Header: fixed height 48px. Contains logo + app name (left, 224px wide) | breadcrumb (center, flex) | autosave pill (right)
- Sidebar: fixed width 224px, full height below header, never hidden
- Main content: fills remaining width, scrolls internally per page

### 18.2 Header Rules
- **Logo:** 26×26px brand-red square, rounded 6px, white icon inside
- **App name:** "SOP" bold + "builder" regular weight, 14px
- **Breadcrumb:** minimal — plain text on home (`All SOPs`), link + separator + current SOP ID on editor. No buttons in header.
- **Autosave pill:** small green pill, only visible when in editor. Text: "All changes saved". Hidden on home screen.
- **No action buttons in header.** All actions live in sidebar or page content.

### 18.3 Sidebar — Three Modes

Sidebar switches mode based on context. Transition is instant (no animation needed).

**Mode A — App Nav (shown on Home screen)**
```
[section label] Workspace
  □ All SOPs          [badge: count]
  □ Create SOP

[divider]

[section label] Projects
  □ Gen Alpha         [badge: count]
  □ Commissioning     [badge: count]
  □ Safety            [badge: count]

[footer — pinned bottom]
  □ Settings
  ● DB healthy
  v0.1.0-alpha
```

**Mode B — Editor Nav (shown when SOP is open in editor)**
```
[back link] ← All SOPs      (if came from Create SOP)
            ← View SOP      (if came from Viewer)
[SOP ID in monospace]
[SOP title, truncated]

  ① Header
  ② Scope & Purpose    ✓ (green if has content)
  ③ Safety             ✓
  ④ Tools Library
  ⑤ Items & Parts
  ⑥ Steps
  ⑦ Definitions
  ⑧ Approval & Revisions

[footer — pinned bottom]
  [ Export .sop ]     ← ghost button, full width
  [ Export PDF  ]     ← primary button, full width
  ● DB healthy
```

**Mode C — Viewer Nav (shown when SOP is open in read-only viewer)**
```
[back link] ← All SOPs
[SOP ID in monospace]
[SOP title, truncated]
[status badge]

[divider]

[ Edit SOP ]          ← primary button, full width → switches to Editor (Mode B)

[divider]

[footer — pinned bottom]
  [ Export PDF ]      ← ghost button, full width → triggers print-to-PDF
  ● DB healthy
```

### 18.4 Sidebar Nav Item States
- **Default:** subtle text, no background
- **Hover:** light warm background (`#ebe8e2`)
- **Active:** brand-red light background (`#fdf1ee`), brand-red text, medium weight
- **Section number bubble:** 18×18px circle. Default = grey. Active = brand-red fill white text. Done = green fill white checkmark.

### 18.5 Home Screen Layout
```
[page header: title + sub + Create SOP button]
[toolbar: search box | filter chips]
[full-width scrollable table]
```
- Table columns: SOP ID | Project | Title | Date Released | Status | Version | Actions
- SOP ID and Version rendered in monospace font (`DM Mono`)
- Project shown as a small pill/tag
- Status shown as coloured dot + label badge
- Row click → opens SOP in Viewer (`/sop/:id/view`)
- Actions column always visible (never hidden behind hover): View icon → Viewer, Edit icon → Editor (origin = home), Delete icon → soft-delete confirm modal
- Create SOP button (top right of page header, also in sidebar) → generates new SOP ID → opens editor

### 18.6 Editor Layout
- No sub-header inside editor. The sidebar IS the navigation.
- Editor content area: single scrollable column, padding 26px top/bottom, 30px left/right
- On section switch: scroll editor body to top, show only selected section content
- Each section starts with: section title (15px, semibold) + section desc (12px, muted)

### 18.7 Form Cards
- White background, 1px border, 8px radius, subtle shadow
- Internal padding: 18px
- Two-column grid for most fields (`grid-template-columns: 1fr 1fr`, gap 14px)
- Full-width fields: title, text areas, distribution list, related docs
- Tables (tools, items, revisions): flush card with no internal padding — table goes edge to edge inside card, toolbar row at top

### 18.8 Form Fields
- All inputs: 13px font, 6px padding, 6px radius, 1px border
- Focus state: brand-red border + 3px brand-red glow (8% opacity)
- Read-only fields (SOP ID, Version): light grey background, muted text, no focus state
- Monospace fields (SOP ID, Part No.): `DM Mono` font, 12.5px
- Date fields: native date picker input
- Text areas: resizable vertically, min-height varies by field

### 18.9 Step Cards
- Card per step, slight shadow, 8px radius
- Step header bar: warm grey background, drag handle + step number bubble + step name + action buttons
- Step number bubble: 22×22px, brand-red circle, white text
- Drag handle: 6-dot grid icon, grey, cursor changes to grab
- Action buttons (duplicate, delete): 26×26px icon buttons. Delete turns red on hover.
- Step body: white, 14px padding, two-column form grid
- Image area: 16:9 thumbnails (108×60.75px). Placeholder shows image icon. Add button is dashed border, turns brand-red on hover.
- Tool/item tags: pill tags inside a bordered box. Library tags = brand-red tint. Free-text tags = grey tint.

### 18.10 Modals
- Backdrop: semi-transparent dark overlay + 2px blur
- Modal: white, 10px radius, 480px wide, strong shadow
- Structure: header (title + subtitle) | body (form fields) | footer (action buttons)
- Exit warning modal footer: Cancel (left) | Exit Without Revision + Log Revision & Exit (right, grouped)
- Log Revision modal footer: Cancel | Save Revision (right)

### 18.11 Status Badges
| Status | Background | Text/dot colour |
|---|---|---|
| Approved | `#edf7f1` | `#1e7e4a` green |
| Under Review | `#fef9ec` | `#b45309` amber |
| Draft | `#f0ede8` | `#a8a39a` grey |
| Rejected | `#fdf0ef` | `#c0392b` red |

### 18.12 Typography
| Use | Font | Size | Weight |
|---|---|---|---|
| App name | DM Sans | 14px | 600 |
| Page/section titles | DM Sans | 15–17px | 600 |
| Body / form labels | DM Sans | 13–13.5px | 400–500 |
| Nav items | DM Sans | 13px | 400 |
| Section labels | DM Sans | 10.5px | 600, uppercase |
| SOP IDs, part nos. | DM Mono | 12–12.5px | 400–500 |
| Autosave / version | DM Mono | 10.5–11.5px | 400 |

### 18.13 Colour Tokens
```css
--bg-app:          #f0ede8   /* warm off-white, outer shell */
--bg-panel:        #faf9f7   /* header, sidebar, page headers */
--bg-surface:      #ffffff   /* cards, inputs, table rows */
--bg-secondary:    #f0ede8   /* step headers, read-only fields, tags */
--bg-hover:        #ebe8e2   /* hover state backgrounds */
--text-primary:    #1a1917
--text-secondary:  #3d3b37
--text-tertiary:   #7a756c
--text-quaternary: #a8a39a
--brand:           #c84b2f   /* primary red — buttons, active states, accents */
--brand-light:     #fdf1ee   /* active nav background, library tags */
--brand-hover:     #b33f25
--border-subtle:   rgba(26,25,23,0.07)
--border-standard: rgba(26,25,23,0.12)
--border-strong:   rgba(26,25,23,0.20)
```

### 18.14 Scrollbars
- Custom scrollbars: 5px wide, no track, rounded thumb in `--border-standard` colour
- Sidebar internal scroll: 3px wide

### 18.15 What NOT to build in UI
- No dark mode
- No animations or transitions (except button hover bg — 0.1s)
- No tooltips beyond native `title` attribute
- No sidebar collapse/expand toggle
- No mobile responsiveness (desktop only)
- No drag-and-drop animation (static reorder is fine for now)

---

## 19. CONSTRAINTS & RULES FOR AI AGENTS

1. **No absolute file paths in DB.** Always UUID-based, resolved at runtime relative to app data dir.
2. **No image blobs in SQLite.** Files only.
3. **Auto-save is non-negotiable.** Every field change must persist. No "Save" button in editor.
4. **Step numbers are derived, not stored as source of truth.** `sort_order` is the source. `step_number` is recalculated on every reorder.
5. **Dirty flag must survive React re-renders.** Keep in Zustand, not component state.
6. **Revision prompt is a soft warning, not a hard block.** User can exit without logging a revision via "Exit Without Revision". Data is safe either way. Never force revision note to proceed.
7. **PDF must be text-selectable.** Use webview print-to-PDF only. No canvas-to-image PDF approaches.
8. **Image aspect ratio enforcement is strict.** Only 16:9 or 4:3 accepted. Always show crop window first.
9. **Both original and annotated images always saved.** Even if user skips annotation — save cropped original as both files.
10. **Excel export: not in scope.** Do not build.
11. **No branching in steps.** Linear only.
12. **No user accounts or authentication.** App opens directly to home screen.
13. **Mac support: not in scope for initial build.** Do not configure or test.
14. **Electron is forbidden.** Tauri v2 only.
15. **Row click on home opens Viewer.** The Actions column Edit button may also open the Editor directly from Home (with `editorOrigin = 'home'`). Editor is otherwise entered via "Edit SOP" in the Viewer sidebar or "Create SOP" flow.
16. **Editor back navigation depends on origin.** If user came from Viewer → back goes to Viewer. If user came from Create SOP → back goes to Home. Track in Zustand (`editorOrigin`).
17. **Viewer is always read-only.** No input fields, no auto-save, no dirty flag in viewer.
18. **Import .sop always opens Viewer after completion.** Never opens editor directly.

---

## 20. OPEN ITEMS (To be defined later)

- ~~PDF HTML template visual design~~ — **DONE**: `sop-pdf-template.html` complete as of 2026-05-01
- Excel export (explicitly deferred, do not build)
- Formal approval routing workflow (deferred, manual status field only for now)
- Mac platform support (deferred)
- Full-text search inside step content (deferred)
- Field-level dropdowns for Department, Project (deferred — free text for now)

---

*End of specification. All ambiguities should be resolved by referring back to this document before making any implementation decision.*
