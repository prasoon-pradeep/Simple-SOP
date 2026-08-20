import { ReactNode } from 'react';
import { LucideIcon, Home, FileText, Target, ShieldAlert, Timer, Wrench, Package } from 'lucide-react';
import { Lead, SubHeading, DList, Code, FieldTable, InlineLink } from './helpUi';

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
];
