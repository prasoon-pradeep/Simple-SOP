import React from 'react';
import { useSopStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function SafetySection() {
  const { currentSop, updateSopField } = useSopStore();

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleTextChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSopField(field, e.target.value);
  };

  const handleSwitchChange = (checked: boolean) => {
    updateSopField('training_required', checked);
    if (!checked) {
      updateSopField('training_details', null);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="safety_notes" className="text-base font-bold text-status-red flex items-center">
             Safety & Environmental Hazards
          </Label>
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
            <Label htmlFor="training_details">Training Details & Modules</Label>
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
    </div>
  );
}
