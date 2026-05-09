import React, { useState } from 'react';
import { useSopStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SparkleButton } from '@/components/shared/SparkleButton';
import { AIPreviewPanel } from '@/components/shared/AIPreviewPanel';

type PreviewState = { field: string; enhanced: string } | null;

export function ScopeSection() {
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

  const handleChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSopField(field, e.target.value);
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
            <Label htmlFor="purpose" className="text-base font-bold">Purpose</Label>
            <SparkleButton
              value={currentSop.purpose || ''}
              fieldName="purpose"
              entityType="sop"
              entityId={currentSop.id}
              sopId={currentSop.id}
              sopTitle={currentSop.title}
              department={currentSop.department ?? undefined}
              onPreview={enhanced => setPreview({ field: 'purpose', enhanced })}
            />
          </div>
          <p className="text-sm text-text-tertiary mb-2">Why does this procedure exist? What is the goal?</p>
          <Textarea
            id="purpose"
            value={currentSop.purpose || ''}
            onChange={handleChange('purpose')}
            placeholder="To define the standard method for..."
            className="min-h-[150px] resize-y"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="scope" className="text-base font-bold">Scope</Label>
            <SparkleButton
              value={currentSop.scope || ''}
              fieldName="scope"
              entityType="sop"
              entityId={currentSop.id}
              sopId={currentSop.id}
              sopTitle={currentSop.title}
              department={currentSop.department ?? undefined}
              onPreview={enhanced => setPreview({ field: 'scope', enhanced })}
            />
          </div>
          <p className="text-sm text-text-tertiary mb-2">Who and what does this apply to? What is excluded?</p>
          <Textarea
            id="scope"
            value={currentSop.scope || ''}
            onChange={handleChange('scope')}
            placeholder="This procedure applies to all assembly-line machines in the Production Department..."
            className="min-h-[150px] resize-y"
          />
        </div>
      </div>

      {preview && (
        <AIPreviewPanel
          open
          originalText={preview.field === 'purpose' ? (currentSop.purpose || '') : (currentSop.scope || '')}
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
