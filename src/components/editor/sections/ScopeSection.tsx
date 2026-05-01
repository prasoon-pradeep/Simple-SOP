import React from 'react';
import { useSopStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ScopeSection() {
  const { currentSop, updateSopField } = useSopStore();

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSopField(field, e.target.value);
  };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="purpose" className="text-base font-bold">Purpose</Label>
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
          <Label htmlFor="scope" className="text-base font-bold">Scope</Label>
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
    </div>
  );
}
