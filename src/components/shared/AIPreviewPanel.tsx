import { invoke } from '@tauri-apps/api/core';
import { Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AiEnhancement } from '@/types';

interface AIPreviewPanelProps {
  open: boolean;
  originalText: string;
  enhancedText: string;
  fieldName: string;
  entityType: string;
  entityId: string;
  sopId: string;
  provider: string;
  onAccept: (text: string) => void;
  onReject: () => void;
}

function modelForProvider(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-mini';
    case 'gemini': return 'gemini-1.5-flash';
    default: return 'claude-haiku-4-5-20251001';
  }
}

export function AIPreviewPanel({
  open,
  originalText,
  enhancedText,
  fieldName,
  entityType,
  entityId,
  sopId,
  provider,
  onAccept,
  onReject,
}: AIPreviewPanelProps) {
  const handleAccept = async () => {
    const payload: AiEnhancement = {
      id: crypto.randomUUID(),
      sop_id: sopId,
      entity_type: entityType,
      entity_id: entityId,
      field_name: fieldName,
      original_text: originalText,
      enhanced_text: enhancedText,
      provider,
      model: modelForProvider(provider),
      enhanced_at: new Date().toISOString(),
    };
    try {
      await invoke('save_ai_enhancement', { payload });
    } catch (err) {
      console.error('Failed to save AI enhancement record:', err);
    }
    onAccept(enhancedText);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onReject()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text-primary">
            AI Enhancement Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-quaternary mb-1.5">Original</p>
            <div className="rounded-md bg-secondary border border-border-standard p-3 min-h-[100px]">
              <p className="text-[12.5px] text-text-secondary leading-relaxed whitespace-pre-wrap">{originalText}</p>
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-status-green mb-1.5">Enhanced</p>
            <div className="rounded-md bg-white border border-status-green/40 p-3 min-h-[100px]">
              <p className="text-[12.5px] text-text-primary leading-relaxed whitespace-pre-wrap">{enhancedText}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            className="text-text-tertiary hover:text-text-primary gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-status-green hover:bg-status-green/90 text-white gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
