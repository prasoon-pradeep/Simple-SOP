import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSopStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/shared/DatePicker';
import { SuggestionInput } from '@/components/ui/suggestion-input';

type Suggestions = {
  department: string[];
  project_tag: string[];
  document_owner: string[];
  created_by: string[];
  distribution_list: string[];
};

const EMPTY_SUGGESTIONS: Suggestions = {
  department: [],
  project_tag: [],
  document_owner: [],
  created_by: [],
  distribution_list: [],
};

const SUGGESTION_FIELDS: (keyof Suggestions)[] = [
  'department',
  'project_tag',
  'document_owner',
  'created_by',
  'distribution_list',
];

export function HeaderSection() {
  const { currentSop, updateSopField } = useSopStore();
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY_SUGGESTIONS);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled(
        SUGGESTION_FIELDS.map((f) => invoke<string[]>('get_field_suggestions', { field: f }))
      );
      if (cancelled) return;
      const next = { ...EMPTY_SUGGESTIONS };
      SUGGESTION_FIELDS.forEach((f, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') next[f] = r.value;
      });
      setSuggestions(next);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSopField(field, e.target.value);
  };

  const handleSuggestion = (field: keyof typeof currentSop) => (value: string) => {
    updateSopField(field, value);
  };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">Document Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title</Label>
            <Input id="title" value={currentSop.title || ''} onChange={handleChange('title')} placeholder="e.g. Machine Surface Preparation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sop_id">SOP ID (Read-only)</Label>
            <Input id="sop_id" value={currentSop.sop_id || ''} readOnly className="bg-secondary text-text-tertiary cursor-not-allowed" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <SuggestionInput
              id="department"
              value={currentSop.department || ''}
              onChange={handleSuggestion('department')}
              suggestions={suggestions.department}
              placeholder="e.g. Production"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project_tag">Project / Tag</Label>
            <SuggestionInput
              id="project_tag"
              value={currentSop.project_tag || ''}
              onChange={handleSuggestion('project_tag')}
              suggestions={suggestions.project_tag}
              placeholder="e.g. Line Alpha"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">Dates & Personnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="document_owner">Document Owner</Label>
            <SuggestionInput
              id="document_owner"
              value={currentSop.document_owner || ''}
              onChange={handleSuggestion('document_owner')}
              suggestions={suggestions.document_owner}
              placeholder="e.g. Rachel Torres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="created_by">Created By</Label>
            <SuggestionInput
              id="created_by"
              value={currentSop.created_by || ''}
              onChange={handleSuggestion('created_by')}
              suggestions={suggestions.created_by}
              placeholder="e.g. Brian Hoffman"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="created_date">Created Date</Label>
            <DatePicker value={currentSop.created_date || ''} onChange={(val) => updateSopField('created_date', val)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="active_date">Active Date</Label>
            <DatePicker value={currentSop.active_date || ''} onChange={(val) => updateSopField('active_date', val)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_review_date">Next Review Date</Label>
            <DatePicker value={currentSop.next_review_date || ''} onChange={(val) => updateSopField('next_review_date', val)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">References & Distribution</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regulatory_ref">Regulatory References</Label>
            <Input id="regulatory_ref" value={currentSop.regulatory_ref || ''} onChange={handleChange('regulatory_ref')} placeholder="e.g. ISO 9001:2015" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distribution_list">Distribution List</Label>
            <SuggestionInput
              id="distribution_list"
              value={currentSop.distribution_list || ''}
              onChange={handleSuggestion('distribution_list')}
              suggestions={suggestions.distribution_list}
              tokenMode
              placeholder="e.g. Plant Manager, Quality Assurance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="related_documents">Related Documents</Label>
            <Input id="related_documents" value={currentSop.related_documents || ''} onChange={handleChange('related_documents')} placeholder="e.g. SOP-2024-7E9F1A" />
          </div>
        </div>
      </div>
    </div>
  );
}
