import React from 'react';
import { useSopStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNITS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours',   label: 'Hours'   },
];

export function CycleTimeSection() {
  const { currentSop, updateSopField } = useSopStore();

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      updateSopField('cycle_time_value', null);
    } else {
      const n = parseFloat(raw);
      updateSopField('cycle_time_value', isNaN(n) ? null : n);
    }
  };

  const handleUnitChange = (val: string) => {
    updateSopField('cycle_time_unit', val);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSopField('cycle_time_notes', e.target.value || null);
  };

  const displayValue = currentSop.cycle_time_value != null ? String(currentSop.cycle_time_value) : '';

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">Cycle Time</h3>
        <p className="text-sm text-text-tertiary">
          Estimated time to complete this procedure end-to-end. Leave blank if not applicable.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="cycle_time_value">Duration</Label>
            <div className="flex gap-3">
              <Input
                id="cycle_time_value"
                type="number"
                min="0"
                step="any"
                value={displayValue}
                onChange={handleValueChange}
                placeholder="e.g. 45"
                className="flex-1"
              />
              <Select
                value={currentSop.cycle_time_unit ?? 'minutes'}
                onValueChange={handleUnitChange}
              >
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle_time_notes">Notes <span className="text-text-quaternary font-normal">(optional)</span></Label>
          <Textarea
            id="cycle_time_notes"
            value={currentSop.cycle_time_notes || ''}
            onChange={handleNotesChange}
            placeholder="e.g. Per batch of 50 units. Excludes setup time."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
