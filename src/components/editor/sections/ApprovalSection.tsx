import { useSopStore } from '@/store';
import { Button } from '@/components/ui/button';

interface ApprovalSectionProps {
  onLogRevision: () => void;
}

export function ApprovalSection({ onLogRevision }: ApprovalSectionProps) {
  const { currentSop, revisions } = useSopStore();

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const fmtDate = (s: string | null) => {
    if (!s) return '—';
    try {
      // Check if it's already an ISO string or just a date
      const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return s; }
  };

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Revision History</h3>
          <p className="text-sm text-text-tertiary">All logged revisions and approval statuses for this document.</p>
        </div>
        <Button onClick={onLogRevision}>Log New Revision</Button>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary border-b border-border-standard text-xs uppercase tracking-wider text-text-tertiary font-bold">
              <tr>
                <th className="px-4 py-3 text-center">Ver</th>
                <th className="px-4 py-3">Revision Notes</th>
                <th className="px-4 py-3">Revised By</th>
                <th className="px-4 py-3">Rev. Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approved By</th>
                <th className="px-4 py-3">Approval Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {revisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-tertiary italic">
                    No revisions found.
                  </td>
                </tr>
              ) : (
                revisions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-hover/50 transition-colors">
                    <td className="px-4 py-3 text-center font-mono font-medium text-text-secondary">V{rev.version}</td>
                    <td className="px-4 py-3 text-text-primary max-w-xs truncate" title={rev.revision_notes}>{rev.revision_notes}</td>
                    <td className="px-4 py-3 text-text-secondary">{rev.revised_by || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{fmtDate(rev.revision_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        rev.approval_status === 'Approved' ? 'bg-status-green-bg text-status-green' :
                        rev.approval_status === 'Rejected' ? 'bg-status-red-bg text-status-red' :
                        'bg-status-amber-bg text-status-amber'
                      }`}>
                        {rev.approval_status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{rev.approved_by || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{fmtDate(rev.approval_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
