import { ReactNode } from 'react';
import {
  LucideIcon,
  Home,
  FileText,
  Target,
  ShieldAlert,
  Timer,
  Wrench,
  Package,
  ListChecks,
  Crop,
  ListOrdered,
  Languages,
  History,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { Lead, SubHeading, DList, Code, FieldTable, FlowTable, Callout, InlineLink } from './helpUi';

export interface HelpSection {
  id: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  /** Extra search terms beyond title/sub, so matching feels like full-text search without walking rendered JSX. */
  keywords: string;
  body: ReactNode;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'd-home',
    title: 'Home & Library',
    sub: '01 · Home Screen',
    icon: Home,
    keywords: 'search filter project delete soft delete DELETEDDMMYY view edit row actions columns sop id title status version',
    body: (
      <>
        <Lead>
          The Home screen is a flat table of every SOP you've created — no folders, no dashboard, no kanban. Just a searchable list.
        </Lead>
        <SubHeading>Columns</SubHeading>
        <DList
          items={[
            <>
              <b>SOP ID</b> — auto-generated, monospace, e.g. <Code>SOP-2026-8F3AB2</Code>
            </>,
            <>
              <b>Project</b> — the free-text project tag, or "Unassigned"
            </>,
            <>
              <b>Document Title</b>, <b>Released</b> date, <b>Status</b> badge (Draft / Under Review / Approved / Rejected), and <b>Version</b> (V1, V2…)
            </>,
          ]}
        />
        <SubHeading>Search &amp; Filter</SubHeading>
        <DList
          items={[
            <>The search bar filters by <b>SOP ID</b>, <b>Title</b>, or <b>Project tag</b> — metadata only, it does not search inside step content</>,
            <>Click a project name in the sidebar to filter the list to that project; click "All Documents" to clear it</>,
          ]}
        />
        <SubHeading>Row Actions</SubHeading>
        <DList
          items={[
            <>Clicking a row opens the read-only <b>Viewer</b></>,
            <><b>View</b> icon — same as clicking the row</>,
            <><b>Edit</b> icon — jumps straight into the Editor</>,
            <>
              <b>Delete</b> icon — opens a confirmation modal. Deletion is a <b>soft delete</b>: you must type <Code>DELETEDDMMYY</Code> exactly to enable the confirm button. Deleted SOPs are hidden from the list but not purged — no restore flow exists yet, so treat this as a real removal from view
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-header',
    title: 'Header Fields',
    sub: '02 · Editor, Tab 1',
    icon: FileText,
    keywords: 'sop id version title project tag department owner created active release next review date regulatory distribution related documents autosave auto-save',
    body: (
      <>
        <Lead>Every field auto-saves 500ms after you stop typing — there is no Save button anywhere in the app.</Lead>
        <FieldTable
          rows={[
            ['SOP ID', 'Auto-generated on creation, read-only, always monospace to avoid character ambiguity'],
            ['Version', 'Read-only integer, increments only when a revision is logged'],
            ['Title', 'Required'],
            ['Project Tag', 'Free text — powers the sidebar project filter and Home search'],
            ['Department / Document Owner / Created By', 'Free text'],
            [
              'Created Date / Active (Release) Date / Next Review Date',
              "Date pickers with validation: Active Date can't be before Created Date, and Next Review Date can't be before Active Date",
            ],
            ['Regulatory Reference', 'e.g. "ISO 9001:2015"'],
            ['Distribution List / Related Documents', 'Free text'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-scope',
    title: 'Scope & Purpose',
    sub: '03 · Editor, Tab 2',
    icon: Target,
    keywords: 'purpose scope why what covers',
    body: (
      <Lead>
        Two free-text areas: <b>Purpose</b> (why this SOP exists) and <b>Scope</b> (what it covers and what it doesn't). Both support AI enhancement via the sparkle button. They appear near the top of the exported PDF, right after the header fields.
      </Lead>
    ),
  },
  {
    id: 'd-safety',
    title: 'Safety & Training',
    sub: '04 · Editor, Tab 3',
    icon: ShieldAlert,
    keywords: 'safety notes training required details toggle',
    body: (
      <Lead>
        Safety Notes is a free-text area. The <b>Training Required</b> toggle reveals a <b>Training Details</b> text area only when switched on — leave it off and the extra field stays hidden, in the editor and in the exported PDF.
      </Lead>
    ),
  },
  {
    id: 'd-cycle',
    title: 'Cycle Time',
    sub: '05 · Editor, Tab 4',
    icon: Timer,
    keywords: 'cycle time value unit seconds minutes hours notes generate with ai',
    body: (
      <>
        <Lead>
          An optional field set for recording how long the procedure takes: a numeric <b>value</b>, a <b>unit</b> dropdown (seconds / minutes / hours), and free-text <b>notes</b> for edge cases like "per batch of 50" — the notes field can also be drafted with AI, see <InlineLink to="d-ai">AI Enhancement</InlineLink> below.
        </Lead>
        <Lead>Left empty, the whole section is skipped in the Viewer and PDF — it only appears once a value is entered.</Lead>
      </>
    ),
  },
  {
    id: 'd-tools',
    title: 'Tools & Consumables',
    sub: '06 · Editor, Tab 5',
    icon: Wrench,
    keywords: 'tools equipment consumables name type physical digital model part number specification calibration due date search other sops clone dedup',
    body: (
      <>
        <Lead>A per-SOP library of the tools, equipment, and consumables used to perform the procedure. Add, edit, or delete rows freely.</Lead>
        <SubHeading>Fields per entry</SubHeading>
        <DList
          items={[
            <><b>Name</b> (required), <b>Type</b> (Physical / Digital), <b>Model / Part No.</b>, <b>Specification / Remarks</b>, an optional <b>image</b></>,
            <><b>Calibration Required</b> toggle — reveals a <b>Calibration Due Date</b> picker when on</>,
          ]}
        />
        <SubHeading>Reuse across SOPs</SubHeading>
        <DList
          items={[
            <><b>Search other SOPs</b> opens a modal to find a tool by name across your entire library, then <b>clone</b> it into the current SOP</>,
            <>Cloned entries track their origin internally, so the search results dedupe — you see each unique tool once even if it's been cloned many times</>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-items',
    title: 'Items / Parts',
    sub: '07 · Editor, Tab 6',
    icon: Package,
    keywords: 'items parts name part no sku description qty unit bill of materials clone search other sops',
    body: (
      <>
        <Lead>Same pattern as Tools — a library table with add/edit/delete, cross-SOP search, and clone-on-borrow.</Lead>
        <DList
          items={[
            <><b>Name</b> (required), <b>Part No. / SKU</b>, <b>Description</b>, an optional image</>,
            <><b>Qty</b> — an SOP-level bill-of-materials quantity (free text: "4", "500 ml", "as required")</>,
            <><b>Unit</b> — pcs, kg, ml, etc. Once set on the library entry, it's reused automatically wherever the item is linked into a step</>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-steps',
    title: 'Procedure Steps',
    sub: '08 · Editor, Tab 7 — the core of the document',
    icon: ListChecks,
    keywords: 'step number action instruction expected output notes cautions tools needed items needed images drag handle reorder duplicate delete qty unit free text tag',
    body: (
      <>
        <Lead>Each step is its own card. <b>Add Step</b> appends a new one at the bottom; the list keeps its scroll position instead of jumping to the top.</Lead>
        <SubHeading>Per-step fields</SubHeading>
        <DList
          items={[
            <><b>Step Number</b> — read-only, recalculated automatically on reorder</>,
            <><b>Action / Instruction</b> — the main text, eligible for AI enhancement</>,
            <><b>Expected Output</b> — what should result from the step</>,
            <><b>Notes / Cautions</b> — free text</>,
            <><b>Tools Needed</b> and <b>Items Needed</b> — see below</>,
            <><b>Images</b> — multiple per step, each goes through crop + optional annotation</>,
          ]}
        />
        <SubHeading>Tools &amp; items tagging</SubHeading>
        <DList
          items={[
            <>Search your library and select — it appears as a tag. Or type free text and press Enter — it appears as a differently-styled tag. Both kinds can coexist on the same step</>,
            <>For items, selecting a library entry shows <b>Unit</b> (pre-filled, read-only if the library item has one) and a small <b>Qty</b> input alongside the tag</>,
            <>
              Trying to link an item with no quantity entered pops a confirmation: <i>"You haven't specified a quantity for [Item]. Add it without a quantity?"</i> — Add Anyway renders <Code>—</Code> in the PDF, Go Back returns you to the input. Quantity, if entered, must be a positive number (no zero, no negatives)
            </>,
          ]}
        />
        <SubHeading>Managing steps</SubHeading>
        <DList
          items={[
            <><b>Drag handle</b> reorders steps (dnd-kit) — step numbers renumber automatically</>,
            <><b>Duplicate Step</b> makes a full independent copy (images re-referenced, not re-uploaded) appended right below the original — edit it freely afterward without touching the source step</>,
            <><b>Delete Step</b> asks for confirmation first</>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-images',
    title: 'Image Handling',
    sub: '09 · Used in Tools, Items & Steps',
    icon: Crop,
    keywords: 'image crop 16:9 4:3 annotation konva arrow circle text label undo skip original annotated',
    body: (
      <>
        <Lead>Every image — uploaded from disk or pasted from the clipboard — goes through the same two-stage flow.</Lead>
        <SubHeading>1. Crop</SubHeading>
        <DList items={[<>Choose <b>16:9</b> (default) or <b>4:3</b>, then adjust the crop area and confirm.</>]} />
        <SubHeading>2. Annotate (optional — can be skipped)</SubHeading>
        <DList
          items={[
            <>A Konva.js canvas over the cropped image with three tools: <b>Arrow</b> (click-drag), <b>Circle</b> (click center, drag radius), and <b>Text Label</b> (click, type)</>,
            <>Annotations are draggable after placement, and an <b>Undo</b> button steps back through changes</>,
          ]}
        />
        <Lead>Both the original crop and the annotated version are saved — the annotated one is always what appears in the Viewer and PDF.</Lead>
      </>
    ),
  },
  {
    id: 'd-defs',
    title: 'Definitions',
    sub: '10 · Editor, Tab 8',
    icon: ListOrdered,
    keywords: 'term meaning jargon abbreviations glossary sort order',
    body: (
      <Lead>
        A simple two-column table — <b>Term</b> and <b>Meaning</b> — for any jargon or abbreviations used in the SOP. Rows can be added or removed freely; the order you enter them in is preserved. Always rendered at the very end of the exported PDF, after every step.
      </Lead>
    ),
  },
  {
    id: 'd-translations',
    title: 'Translations',
    sub: '11 · Editor, Tab 9',
    icon: Languages,
    keywords: 'translate hindi tamil malayalam kannada telugu marathi language stale outdated hash disclaimer',
    body: (
      <>
        <Lead>
          A dedicated tab for translating a SOP's prose fields — Purpose, Scope, Safety Notes, and every step's Action / Notes / Expected Output — into <b>Hindi, Tamil, Malayalam, Kannada, Telugu, or Marathi</b>, using whichever AI provider you've configured in Settings.
        </Lead>
        <SubHeading>How it works</SubHeading>
        <DList
          items={[
            <>Select one or more target languages, then translate a field (or a whole step) with one click — it reuses the provider and key already set up in Settings, no separate key needed here</>,
            <>Each translated field is stored per-language and shown alongside the English original in the Viewer and PDF, with an <b>unreviewed-AI disclaimer</b></>,
          ]}
        />
        <SubHeading>Staying in sync</SubHeading>
        <DList
          items={[
            <>If you edit the English source after it's been translated, the app hashes the source text and flags the existing translation as <b>outdated</b> — a clear signal to regenerate it rather than silently drifting out of sync</>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'd-approval',
    title: 'Approval & Revisions',
    sub: '12 · Editor, Tab 10',
    icon: History,
    keywords: 'revision notes revised by approval status approved by approval date exit prompt log new revision draft under review approved rejected version bump audit trail',
    body: (
      <>
        <Lead>Every SOP starts life as <b>V1 / Draft</b> automatically, with an "Initial Draft" revision row. From there, the version number only moves forward when a revision is explicitly logged.</Lead>
        <SubHeading>Two ways to log a revision</SubHeading>
        <DList
          items={[
            <><b>Log New Revision</b> button at the bottom of this tab — works anytime, mid-session</>,
            <>The <b>exit prompt</b> (see table below) — triggered automatically when you try to leave a SOP with unsaved changes</>,
          ]}
        />
        <Lead>
          Both paths ask for the same fields — <b>Revision Notes</b> (required), <b>Revised By</b>, <b>Approval Status</b>, <b>Approved By</b>, <b>Approval Date</b> — and produce identical database records. The SOP's overall status badge always mirrors whatever the latest revision says; it's never edited directly.
        </Lead>
        <SubHeading>When does the exit prompt appear?</SubHeading>
        <FlowTable
          rows={[
            ['Closing the window, or navigating to Home / a different SOP / importing a file', true, '(only if something changed)'],
            ['Switching between section tabs within the same SOP', false],
            ['Export PDF or Export .sop', false],
            ['App loses focus, alt-tab, screen lock', false],
          ]}
        />
        <Callout icon={HelpCircle}>
          The prompt is purely for the <b>audit trail</b>, not data safety — auto-save has already persisted every change to SQLite. Choosing "Exit Without Revision" loses nothing except the version bump.
        </Callout>
        <Callout icon={ShieldAlert}>
          Logging a revision has its own date rule: <b>Revision Date</b> can't be before the SOP's Created Date, and can't be before the previous revision's date — the confirm button stays disabled until it's valid, in both the exit prompt and this tab's manual form.
        </Callout>
      </>
    ),
  },
  {
    id: 'd-ai',
    title: 'AI Enhancement',
    sub: '13 · Optional, bring your own key',
    icon: Sparkles,
    keywords: 'sparkle button generate with ai anthropic openai gemini provider model api key keyring before after preview',
    body: (
      <>
        <Lead>
          Every prose field in the app has a small sparkle button next to it — Purpose, Scope, Safety Notes, Step Action/Notes, Cycle Time notes, and more. Clicking it sends the field's current text to your configured AI provider and shows a <b>before/after preview</b> — nothing is overwritten until you explicitly accept. For translating a SOP into another language, see the dedicated <InlineLink to="d-translations">Translations</InlineLink> tab above.
        </Lead>
        <Callout icon={Sparkles}>
          On empty fields the button becomes <b>Generate with AI</b> instead of rewriting existing text — e.g. on <InlineLink to="d-cycle">Cycle Time</InlineLink> notes, it drafts a suggestion straight from the value + unit you've entered (e.g. "10 minutes per unit, ~6 cycles per hour"). Still just a starting point — nothing saves until you accept or edit it.
        </Callout>
        <SubHeading>Providers</SubHeading>
        <DList items={[<>Anthropic, OpenAI, or Gemini — pick a provider and model in Settings, and set your own API key for it before the sparkle button will work</>]} />
        <Callout icon={ShieldCheck}>
          Your API key is stored in SQLite as the source of truth, with an encrypted copy in your OS keyring (Windows Credential Manager, macOS Keychain, Linux Secret Service) where available — nothing is sent anywhere except directly to your chosen AI provider.
        </Callout>
      </>
    ),
  },
];
