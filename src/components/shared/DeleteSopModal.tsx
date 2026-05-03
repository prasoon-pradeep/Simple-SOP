import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteSopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sopIdDisplay: string;
  onConfirm: () => Promise<void>;
}

export function DeleteSopModal({ open, onOpenChange, sopIdDisplay, onConfirm }: DeleteSopModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Generate code: DELETEDDMMYY
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const expectedCode = `DELETE${dd}${mm}${yy}`;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmText('');
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] border-status-red/20 shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 bg-status-red-bg rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-status-red" />
          </div>
          <DialogTitle className="text-xl font-bold text-text-primary">Delete SOP Document?</DialogTitle>
          <DialogDescription className="text-text-secondary pt-2">
            This will soft-delete <span className="font-mono font-bold text-text-primary bg-secondary px-1 rounded">{sopIdDisplay}</span>. 
            The document will be hidden from the library but remain in the database for audit history.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-code" className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Type <span className="text-text-primary select-all px-1.5 py-0.5 bg-secondary rounded border border-border-standard font-mono">{expectedCode}</span> to confirm
            </Label>
            <Input 
              id="confirm-code" 
              value={confirmText} 
              onChange={(e) => setConfirmText(e.target.value)} 
              placeholder="Enter confirmation code..."
              className="h-11 font-mono uppercase tracking-widest text-center"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Keep Document
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={confirmText !== expectedCode || isDeleting}
            className="flex-1 bg-status-red hover:bg-status-red hover:brightness-90 text-white font-bold transition-all"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
