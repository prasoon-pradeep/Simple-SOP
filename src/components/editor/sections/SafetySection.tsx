import React, { useState } from 'react';
import { useSopStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SparkleButton } from '@/components/shared/SparkleButton';
import { AIPreviewPanel } from '@/components/shared/AIPreviewPanel';

type PreviewState = { field: string; original: string; enhanced: string } | null;

export function SafetySection() {
  const { currentSop, updateSopField } = useSopStore();
  const [preview, setPreview] = useState<PreviewState>(null);
  const [activeProvider, setActiveProvider] = useState('anthropic');

  React.useEffect(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string | null>('get_config_value', { key: 'ai_active_provider' })
        .then(p => { if (p) setActiveProvider(p); })
        .catch(() => {});
    });
  }, []);

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleTextChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSopField(field, e.target.value);
  };

  const handleSwitchChange = (checked: boolean) => {
    updateSopField('training_required', checked);
    if (!checked) updateSopField('training_details', null);
  };

  const handleAccept = (field: keyof typeof currentSop) => (text: string) => {
    updateSopField(field, text);
    setPreview(null);
  };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="safety_notes" className="text-base font-bold text-status-red flex items-center">
              Safety & Environmental Hazards
            </Label>
            <SparkleButton
              value={currentSop.safety_notes || ''}
              fieldName="safety_notes"
              entityType="sop"
              entityId={currentSop.id}
              sopId={currentSop.id}
              sopTitle={currentSop.title}
              department={currentSop.department ?? undefined}
              onPreview={enhanced => setPreview({ field: 'safety_notes', original: currentSop.safety_notes || '', enhanced })}
            />
          </div>
          <p className="text-sm text-text-tertiary mb-2">List all PPE required, chemical hazards, and safety precautions.</p>
          <Textarea
            id="safety_notes"
            value={currentSop.safety_notes || ''}
            onChange={handleTextChange('safety_notes')}
            placeholder="Wear appropriate PPE at all times: safety glasses, chemical-resistant gloves..."
            className="min-h-[200px] resize-y border-status-red-bg focus-visible:ring-status-red"
          />
        </div>
      </div>

      <div className="p-5 border border-border-standard rounded-lg bg-surface space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="training_required" className="text-base font-bold">Training Required</Label>
            <p className="text-sm text-text-tertiary">Does this procedure require formal training before execution?</p>
          </div>
          <Switch
            id="training_required"
            checked={!!currentSop.training_required}
            onCheckedChange={handleSwitchChange}
          />
        </div>

        {currentSop.training_required && (
          <div className="space-y-2 pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <Label htmlFor="training_details">Training Details & Modules</Label>
              <SparkleButton
                value={currentSop.training_details || ''}
                fieldName="training_details"
                entityType="sop"
                entityId={currentSop.id}
                sopId={currentSop.id}
                sopTitle={currentSop.title}
                department={currentSop.department ?? undefined}
                onPreview={enhanced => setPreview({ field: 'training_details', original: currentSop.training_details || '', enhanced })}
              />
            </div>
            <Textarea
              id="training_details"
              value={currentSop.training_details || ''}
              onChange={handleTextChange('training_details')}
              placeholder="e.g. All personnel must complete Safety Module SM-04..."
              className="min-h-[100px]"
            />
          </div>
        )}
      </div>

      {preview && (
        <AIPreviewPanel
          open
          originalText={preview.original}
          enhancedText={preview.enhanced}
          fieldName={preview.field}
          entityType="sop"
          entityId={currentSop.id}
          sopId={currentSop.id}
          provider={activeProvider}
          onAccept={handleAccept(preview.field as keyof typeof currentSop)}
          onReject={() => setPreview(null)}
        />
      )}
    </div>
  );
}
