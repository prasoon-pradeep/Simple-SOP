import {
  BookOpen,
  FileText,
  ListChecks,
  Clock,
  CheckCircle2,
  Sparkles,
  Download,
  Search,
  ArrowLeftRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickStartProps {
  onCreateSop: () => void;
  onOpenFullGuide: () => void;
}

export function QuickStart({ onCreateSop, onOpenFullGuide }: QuickStartProps) {
  return (
    <div className="max-w-[760px] mx-auto">
      <div className="text-center px-6 pt-7 pb-8">
        <div className="w-[52px] h-[52px] rounded-2xl bg-brand-light text-brand flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-[19px] font-extrabold tracking-tight mb-2">Welcome to SOP Builder</h2>
        <p className="text-sm text-text-tertiary max-w-[460px] mx-auto leading-relaxed">
          Your library is empty — here's what a SOP is, and how to get your first one written, approved, and exported. Everything stays local on this machine, no account needed.
        </p>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg shadow-sm px-5 py-5 mb-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-text-tertiary mb-3.5 flex items-center gap-2">
          <span className="text-brand">01</span> Core Concepts
        </h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-[7px] bg-secondary text-text-secondary flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-text-primary mb-0.5">SOP</div>
              <div className="text-[11.5px] text-text-tertiary leading-relaxed">A document with a unique ID, Title and optional Project tag. This is the thing you create and manage.</div>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-[7px] bg-secondary text-text-secondary flex items-center justify-center shrink-0">
              <ListChecks className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-text-primary mb-0.5">Steps</div>
              <div className="text-[11.5px] text-text-tertiary leading-relaxed">The actual procedure — an ordered list of instructions, each optionally using Tools, Items or Definitions.</div>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-[7px] bg-secondary text-text-secondary flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-text-primary mb-0.5">Revision &amp; Version</div>
              <div className="text-[11.5px] text-text-tertiary leading-relaxed">Every edit after first approval creates a new revision and bumps the version number.</div>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-[7px] bg-secondary text-text-secondary flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-text-primary mb-0.5">Approval Status</div>
              <div className="text-[11.5px] text-text-tertiary leading-relaxed">Draft → Under Review → Approved / Rejected. Shown as a badge on every document.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg shadow-sm px-5 py-5 mb-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-text-tertiary mb-3.5 flex items-center gap-2">
          <span className="text-brand">02</span> Quick Start
        </h3>
        <div className="flex items-start justify-between relative">
          <div className="absolute top-[18px] left-10 right-10 h-px bg-border-standard" />
          {[
            { n: 1, t: 'Create', d: 'Click "Create SOP" or import an existing .sop file' },
            { n: 2, t: 'Scope & Safety', d: 'Fill in the purpose and any safety notes' },
            { n: 3, t: 'Add Steps', d: 'Write the procedure, tag tools & items used' },
            { n: 4, t: 'Approve', d: 'Send for review, then Approved locks the revision' },
            { n: 5, t: 'Export', d: 'Share as PDF or a portable .sop bundle' },
          ].map((s) => (
            <div key={s.n} className="flex-1 text-center relative z-[1] px-1.5">
              <div className="w-9 h-9 rounded-full bg-surface border-2 border-brand text-brand flex items-center justify-center mx-auto mb-2.5 font-extrabold text-sm">
                {s.n}
              </div>
              <div className="text-[11.5px] font-bold text-text-primary mb-0.5">{s.t}</div>
              <div className="text-[10.5px] text-text-tertiary leading-tight">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg shadow-sm px-5 py-5 mb-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-text-tertiary mb-3.5 flex items-center gap-2">
          <span className="text-brand">03</span> Features Worth Knowing
        </h3>
        <div className="flex flex-col gap-3">
          {[
            { icon: Sparkles, t: 'AI Enhancement & Translation', tag: 'Needs API key', d: 'Rewrite steps for clarity or translate a whole SOP — set your key up in Settings first.' },
            { icon: Download, t: 'PDF Export', d: 'Generate a print-ready PDF of any SOP from the Viewer.' },
            { icon: Search, t: 'Cross-SOP Search', d: 'Find every SOP that reuses a given tool or item.' },
            { icon: ArrowLeftRight, t: 'Import / Export .sop', d: 'Move a document between machines as a single portable bundle.' },
          ].map(({ icon: Icon, t, tag, d }) => (
            <div key={t} className="flex items-start gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-[30px] h-[30px] rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[12.5px] font-bold">
                  {t}
                  {tag && (
                    <span className="ml-1.5 text-[9.5px] font-bold uppercase text-text-quaternary bg-secondary px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-text-tertiary">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg shadow-sm px-5 py-5 mb-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-text-tertiary mb-3.5 flex items-center gap-2">
          <span className="text-brand">04</span> Where's My Data
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="w-1.5 h-1.5 rounded-full bg-status-green shrink-0" />
          Stored locally in SQLite on this device — nothing leaves your machine unless you export it. The dot in the sidebar footer shows database health at a glance.
        </div>
      </div>

      <div className="text-center py-2">
        <Button onClick={onCreateSop} className="bg-brand hover:bg-brand-hover text-white font-extrabold px-7 py-3 h-auto shadow-sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create Your First SOP
        </Button>
        <div className="text-[11px] text-text-tertiary mt-2.5">
          Want the full reference?{' '}
          <button onClick={onOpenFullGuide} className="text-brand font-bold hover:underline">
            Open the detailed guide
          </button>
          .
        </div>
      </div>
    </div>
  );
}
