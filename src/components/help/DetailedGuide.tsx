import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { HELP_SECTIONS } from './helpSections';
import { scrollToSection } from './helpUi';

export function DetailedGuide() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const visibleIds = useMemo(() => {
    if (!q) return null;
    return new Set(
      HELP_SECTIONS.filter((s) =>
        `${s.title} ${s.sub} ${s.keywords}`.toLowerCase().includes(q)
      ).map((s) => s.id)
    );
  }, [q]);

  const visibleCount = visibleIds ? visibleIds.size : HELP_SECTIONS.length;

  return (
    <div className="max-w-[760px] mx-auto" id="help-detailed-guide">
      <div className="flex items-center gap-3.5 my-10">
        <div className="flex-1 h-px bg-border-standard" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-quaternary whitespace-nowrap">
          Detailed Guide
        </span>
        <div className="flex-1 h-px bg-border-standard" />
      </div>

      <div className="text-center mb-5">
        <h2 className="text-base font-extrabold mb-1.5">Everything SOP Builder Does</h2>
        <p className="text-xs text-text-tertiary max-w-[520px] mx-auto leading-relaxed">
          The quick version above gets you moving. This section is the exhaustive reference — every field, every button, every rule — for whenever you need to know exactly how something works.
        </p>
      </div>

      <div className="mb-3.5">
        <div className="relative">
          <Search className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search the guide — e.g. "qty", "corrupted", "translate"…'
            className="h-[38px] pl-9 pr-9 bg-surface shadow-sm text-[12.5px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] flex items-center justify-center rounded text-text-tertiary hover:bg-hover hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {q && (
          <div className="text-[10.5px] text-text-quaternary mt-1.5 pl-0.5">
            {visibleCount} {visibleCount === 1 ? 'section matches' : 'sections match'}
          </div>
        )}
      </div>

      <nav className="flex flex-wrap gap-1.5 py-2.5 pb-4">
        {HELP_SECTIONS.filter((s) => !visibleIds || visibleIds.has(s.id)).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSection(s.id)}
            className="text-[10.5px] font-bold text-text-secondary bg-surface border border-border-standard px-2.5 py-1 rounded-full whitespace-nowrap hover:border-brand hover:text-brand"
          >
            {s.title}
          </button>
        ))}
      </nav>

      {visibleIds && visibleIds.size === 0 && (
        <div className="text-center py-8 px-4 text-text-tertiary text-[12.5px] bg-surface border border-border-standard rounded-lg mb-3.5">
          No sections match your search.
        </div>
      )}

      {HELP_SECTIONS.map((s) => {
        const Icon = s.icon;
        const hidden = visibleIds ? !visibleIds.has(s.id) : false;
        return (
          <section
            key={s.id}
            id={s.id}
            className={cn(
              'bg-surface border border-border-standard rounded-lg shadow-sm px-6 py-5 mb-3.5 scroll-mt-16',
              hidden && 'hidden'
            )}
          >
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-quaternary">{s.sub}</div>
                <h4 className="text-sm font-extrabold tracking-tight m-0">{s.title}</h4>
              </div>
            </div>
            {s.body}
          </section>
        );
      })}

      <div className="text-center my-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-[11px] font-bold text-brand"
        >
          &uarr; Back to top
        </button>
      </div>
    </div>
  );
}
