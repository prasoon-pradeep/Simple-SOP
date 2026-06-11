import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/shared/DatePicker';
import { SparkleButton } from '@/components/shared/SparkleButton';
import { AIPreviewPanel } from '@/components/shared/AIPreviewPanel';
import { SuggestionInput } from '@/components/ui/suggestion-input';

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: any) => void;
  onDiscard: () => void;
  onCancel: () => void;
  mode?: 'exit' | 'log';
  sopId?: string;
  sopTitle?: string;
  department?: string;
  createdDate?: string;
  lastRevisionDate?: string;
}

export function RevisionModal({ open, onOpenChange, onConfirm, onDiscard, onCancel, mode = 'exit', sopId, sopTitle, department, createdDate, lastRevisionDate }: RevisionModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [notes, setNotes] = useState('');
  const [revisedBy, setRevisedBy] = useState('');
  const [status, setStatus] = useState('Draft');
  const [approvedBy, setApprovedBy] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [revisionDate, setRevisionDate] = useState(today);
  const [revisionDateError, setRevisionDateError] = useState('');
  const [aiPreview, setAiPreview] = useState<{ original: string; enhanced: string } | null>(null);
  const [aiProvider, setAiProvider] = useState('anthropic');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const entityId = useRef(crypto.randomUUID());

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' })
      .then(p => { if (p) setAiProvider(p); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setRevisionDate(today);
      setRevisionDateError('');
      invoke<string[]>('get_revision_name_suggestions')
        .then(names => setNameSuggestions(names))
        .catch(() => {});
    }
  }, [open]);

  const validateRevisionDate = (date: string): string => {
    if (createdDate && date < createdDate) {
      return `Revision Date cannot be before SOP Created Date (${createdDate})`;
    }
    if (lastRevisionDate && date < lastRevisionDate) {
      return `Revision Date cannot be before previous revision date (${lastRevisionDate})`;
    }
    return '';
  };

  const handleRevisionDateChange = (val: string) => {
    setRevisionDate(val);
    setRevisionDateError(validateRevisionDate(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateRevisionDate(revisionDate);
    if (err) { setRevisionDateError(err); return; }
    onConfirm({ notes, revisedBy, status, approvedBy, approvalDate, revisionDate });
    setNotes('');
    setRevisedBy('');
    setStatus('Draft');
    setApprovedBy('');
    setApprovalDate('');
    setRevisionDate(today);
    setRevisionDateError('');
    entityId.current = crypto.randomUUID();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'exit' ? 'Unsaved Changes Detected' : 'Log New Revision'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'exit'
                ? 'You have unsaved changes. Would you like to log a revision for document control?'
                : 'Log a new revision record to document major changes or approvals.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rev-notes">Revision Notes (Required)</Label>
                {sopId && (
                  <SparkleButton
                    value={notes}
                    fieldName="revision_notes"
                    entityType="revision"
                    entityId={entityId.current}
                    sopId={sopId}
                    sopTitle={sopTitle}
                    department={department}
                    onPreview={enhanced => setAiPreview({ original: notes, enhanced })}
                  />
                )}
              </div>
              <Textarea
                id="rev-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly describe what was changed..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rev-date">Revision Date</Label>
                <DatePicker value={revisionDate} onChange={handleRevisionDateChange} />
                {revisionDateError && (
                  <p className="text-xs text-status-red">{revisionDateError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-status">Status</Label>
                <select
                  id="rev-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rev-by">Revised By</Label>
                <SuggestionInput
                  id="rev-by"
                  value={revisedBy}
                  onChange={setRevisedBy}
                  suggestions={nameSuggestions}
                  placeholder="Your Name"
                />
              </div>
            </div>
            {status === 'Approved' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appr-by">Approved By</Label>
                  <SuggestionInput
                    id="appr-by"
                    value={approvedBy}
                    onChange={setApprovedBy}
                    suggestions={nameSuggestions}
                    placeholder="Approver Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appr-date">Approval Date</Label>
                  <DatePicker value={approvalDate} onChange={setApprovalDate} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {mode === 'exit' ? (
              <Button type="button" variant="ghost" onClick={onDiscard} className="text-status-red hover:text-status-red hover:bg-status-red-bg px-2">
                Exit Without Revision
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!notes.trim() || !!revisionDateError}>
                {mode === 'exit' ? 'Log Revision & Exit' : 'Save Revision'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {aiPreview && sopId && (
        <AIPreviewPanel
          open
          originalText={aiPreview.original}
          enhancedText={aiPreview.enhanced}
          fieldName="revision_notes"
          entityType="revision"
          entityId={entityId.current}
          sopId={sopId}
          provider={aiProvider}
          onAccept={(text) => {
            setNotes(text);
            setAiPreview(null);
          }}
          onReject={() => setAiPreview(null)}
        />
      )}
    </Dialog>
  );
}
