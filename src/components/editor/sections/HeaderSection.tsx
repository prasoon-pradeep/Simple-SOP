import React from 'react';
import { useSopStore } from '@/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/shared/DatePicker';

export function HeaderSection() {
  const { currentSop, updateSopField } = useSopStore();

  if (!currentSop) return <div className="p-6">No SOP loaded.</div>;

  const handleChange = (field: keyof typeof currentSop) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSopField(field, e.target.value);
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
            <Input id="department" value={currentSop.department || ''} onChange={handleChange('department')} placeholder="e.g. Production" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project_tag">Project / Tag</Label>
            <Input id="project_tag" value={currentSop.project_tag || ''} onChange={handleChange('project_tag')} placeholder="e.g. Line Alpha" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">Dates & Personnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="document_owner">Document Owner</Label>
            <Input id="document_owner" value={currentSop.document_owner || ''} onChange={handleChange('document_owner')} placeholder="e.g. Rachel Torres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="created_by">Created By</Label>
            <Input id="created_by" value={currentSop.created_by || ''} onChange={handleChange('created_by')} placeholder="e.g. Brian Hoffman" />
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
            <Input id="distribution_list" value={currentSop.distribution_list || ''} onChange={handleChange('distribution_list')} placeholder="e.g. Plant Manager, Quality Assurance" />
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
