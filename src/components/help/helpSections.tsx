import { ReactNode } from 'react';
import { LucideIcon, Home } from 'lucide-react';
import { Lead, SubHeading, DList, Code } from './helpUi';

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
];
