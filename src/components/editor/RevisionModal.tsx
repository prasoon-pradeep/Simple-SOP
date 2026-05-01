import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: any) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function RevisionModal({ open, onOpenChange, onConfirm, onDiscard, onCancel }: RevisionModalProps) {
  const [notes, setNotes] = useState('');
  const [revisedBy, setRevisedBy] = useState('');
  const [status, setStatus] = useState('Draft');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ notes, revisedBy, status });
    // Reset
    setNotes('');
    setRevisedBy('');
    setStatus('Draft');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Unsaved Changes Detected</DialogTitle>
            <DialogDescription>
              You have unsaved changes. To preserve document control integrity, please log a new revision before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="rev-notes">Revision Notes (Required)</Label>
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
                <Label htmlFor="rev-by">Revised By</Label>
                <Input 
                  id="rev-by" 
                  value={revisedBy} 
                  onChange={(e) => setRevisedBy(e.target.value)} 
                  placeholder="Your Name"
                />
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
                  <option value="Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={onDiscard} className="text-status-red hover:text-status-red hover:bg-status-red-bg">
              Discard Changes
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!notes.trim()}>
                Save Revision
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
