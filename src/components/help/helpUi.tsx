import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Scrolls a section into view. Anchors can't be used for in-page jumps here because
 * the app runs on HashRouter, which would treat href="#id" as a route change. */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => scrollToSection(to)}
      className="text-brand font-bold hover:underline"
    >
      {children}
    </button>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[12.5px] text-text-secondary leading-relaxed mb-3.5 last:mb-0 max-w-[66ch]', className)}>
      {children}
    </p>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-tertiary mt-4 mb-2 first:mt-0">
      {children}
    </div>
  );
}

export function DList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 mb-3.5 last:mb-0">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-text-secondary leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-[5px] before:h-[5px] before:rounded-full before:bg-brand">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[11px] bg-secondary px-1.5 py-0.5 rounded text-text-primary">
      {children}
    </code>
  );
}

export function Callout({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-brand-light border border-brand/15 rounded-lg px-3 py-2.5 mt-3.5 mb-3.5 last:mb-0 text-[11.5px] text-text-secondary leading-relaxed">
      <Icon className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function FieldTable({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <table className="w-full border-collapse mt-1 mb-3.5 last:mb-0">
      <thead>
        <tr>
          <th className="text-left text-[9.5px] font-extrabold uppercase tracking-wider text-text-quaternary pb-1.5 pr-2.5 border-b border-border-standard">Field</th>
          <th className="text-left text-[9.5px] font-extrabold uppercase tracking-wider text-text-quaternary pb-1.5 pr-2.5 border-b border-border-standard">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([f, n], i) => (
          <tr key={i} className="border-b border-border-subtle last:border-0">
            <td className="text-[11.5px] font-bold text-text-primary whitespace-nowrap py-1.5 pr-2.5 align-top">{f}</td>
            <td className="text-[11.5px] text-text-secondary py-1.5 pr-2.5 align-top">{n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FlowTable({ rows }: { rows: [ReactNode, boolean, ReactNode?][] }) {
  return (
    <table className="w-full border-collapse mt-1 mb-3.5 last:mb-0">
      <thead>
        <tr>
          <th className="text-left text-[9.5px] font-extrabold uppercase tracking-wider text-text-quaternary pb-1.5 pr-2.5 border-b border-border-standard">Action</th>
          <th className="text-left text-[9.5px] font-extrabold uppercase tracking-wider text-text-quaternary pb-1.5 pr-2.5 border-b border-border-standard">Prompt shown?</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([action, yes, note], i) => (
          <tr key={i} className="border-b border-border-subtle last:border-0">
            <td className="text-[11.5px] text-text-secondary py-1.5 pr-2.5 align-top">{action}</td>
            <td className="text-[11.5px] py-1.5 pr-2.5 align-top">
              <span className={cn('font-extrabold text-[10.5px]', yes ? 'text-status-green' : 'text-text-quaternary')}>
                {yes ? 'Yes' : 'No'}
              </span>
              {note && <span className="text-text-tertiary text-[11px]"> {note}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TwoCol({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-5 my-4 last:mb-0">{children}</div>;
}

export function PlatformGrid({ items }: { items: { t: string; d: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((p) => (
        <div key={p.t} className="bg-panel border border-border-standard rounded-lg p-3">
          <div className="text-[11.5px] font-extrabold mb-1">{p.t}</div>
          <div className="text-[10.5px] text-text-tertiary leading-relaxed">{p.d}</div>
        </div>
      ))}
    </div>
  );
}

export function OrderedSteps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5 mb-3.5 last:mb-0">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 items-start text-xs text-text-secondary leading-relaxed">
          <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

export function StatusSplit({ now, planned }: { now: ReactNode; planned: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-3.5 last:mb-0">
      <div className="bg-panel border border-border-standard rounded-lg p-3.5">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-tertiary mb-2">Today</div>
        {now}
      </div>
      <div className="bg-brand-light border border-brand/15 rounded-lg p-3.5">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-brand mb-2">Planned, not yet shipped</div>
        {planned}
      </div>
    </div>
  );
}
