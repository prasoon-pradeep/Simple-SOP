import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { ArrowLeft, Pencil, Download, Database, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Definition, SOP, Revision, Tool, Item, StepFull } from '@/types';
import { cn } from '@/lib/utils';
import { ImageFrame } from '@/components/shared/ImageFrame';
import './Viewer.css';

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentSop, setCurrentSop,
    revisions, setRevisions,
    definitions, setDefinitions,
    tools, setTools,
    items, setItems,
    stepsFull, setStepsFull,
    setEditorOrigin,
    resetEditorState
  } = useSopStore();

  const [isLoading, setIsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      resetEditorState();
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (currentSop) {
      loadImages();
    }
  }, [currentSop, tools, items, stepsFull]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sop, revs, defs, toolsData, itemsData, steps] = await Promise.all([
        invoke<SOP>('get_sop', { id }),
        invoke<Revision[]>('get_revisions', { sopId: id }),
        invoke<Definition[]>('get_definitions', { sopId: id }),
        invoke<Tool[]>('get_tools', { sopId: id }),
        invoke<Item[]>('get_items', { sopId: id }),
        invoke<StepFull[]>('get_steps_full', { sopId: id }),
      ]);

      setCurrentSop(sop);
      setRevisions(revs);
      setDefinitions(defs);
      setTools(toolsData);
      setItems(itemsData);
      setStepsFull(steps);
    } catch (error) {
      console.error("Failed to load SOP data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadImages = async () => {
    const urls: Record<string, string> = {};
    const baseDir = await appDataDir();
    
    // Tools
    for (const t of tools) {
      if (t.image_uuid) {
        const filePath = await join(baseDir, 'images', t.image_uuid, 'annotated.png');
        urls[t.image_uuid] = convertFileSrc(filePath);
      }
    }
    // Items
    for (const i of items) {
      if (i.image_uuid) {
        const filePath = await join(baseDir, 'images', i.image_uuid, 'annotated.png');
        urls[i.image_uuid] = convertFileSrc(filePath);
      }
    }
    // Steps
    for (const s of stepsFull) {
      for (const img of s.images) {
        const filePath = await join(baseDir, 'images', img.image_uuid, 'annotated.png');
        urls[img.image_uuid] = convertFileSrc(filePath);
      }
    }
    setImageUrls(urls);
  };

  const handleEdit = () => {
    setEditorOrigin('viewer');
    navigate(`/sop/${id}/edit`);
  };

  const fmtDate = (s: string | null) => {
    if (!s) return '—';
    try {
      const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return s; }
  };

  if (isLoading || !currentSop) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-text-tertiary">
        Loading document...
      </div>
    );
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-4 h-4 mr-2 text-status-green" />;
      case 'Rejected': return <XCircle className="w-4 h-4 mr-2 text-status-red" />;
      case 'Under Review': return <Clock className="w-4 h-4 mr-2 text-status-amber" />;
      default: return <AlertCircle className="w-4 h-4 mr-2 text-text-tertiary" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar Mode C */}
      <aside className="w-64 bg-surface border-r border-border-standard flex flex-col h-full shrink-0 shadow-sm z-10">
        <div className="h-12 border-b border-border-standard flex items-center px-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            All Documents
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-8">
           <div className="space-y-4">
              <div className="space-y-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Document ID</span>
                 <p className="font-mono font-bold text-sm text-text-primary">{currentSop.sop_id}</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Title</span>
                 <p className="font-bold text-sm text-text-primary leading-snug">{currentSop.title}</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Status</span>
                 <div className="flex items-center text-sm font-medium text-text-secondary">
                    {getStatusIcon(currentSop.approval_status)}
                    {currentSop.approval_status || 'Draft'}
                 </div>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Current Version</span>
                 <p className="text-sm font-medium text-text-secondary italic">Revision {currentSop.version}</p>
              </div>
           </div>

           <div className="space-y-3 pt-4 border-t border-border-subtle">
              <Button onClick={handleEdit} className="w-full bg-white hover:bg-hover text-text-primary border border-border-strong shadow-sm font-bold flex items-center justify-center">
                 <Pencil className="w-4 h-4 mr-2" />
                 Edit SOP
              </Button>
              <Button className="w-full bg-brand hover:bg-brand-hover text-white shadow-sm font-bold flex items-center justify-center opacity-50 cursor-not-allowed" disabled>
                 <Download className="w-4 h-4 mr-2" />
                 Export PDF (Soon)
              </Button>
           </div>
        </div>

        <div className="p-4 border-t border-border-standard bg-panel/50">
           <div className="flex items-center justify-between">
              <div className="flex items-center text-[10px] text-text-quaternary font-bold uppercase tracking-tight">
                 <Database className="w-3 h-3 mr-1.5" />
                 Local SQLite
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-status-green"></div>
           </div>
        </div>
      </aside>

      {/* PDF Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#c8c8c8] p-10 flex flex-col items-center">
        {/* Page 1: Header + Purpose + Safety */}
        <div className="pdf-page sop-pdf-card">
          {/* Header Block */}
          <div className="pdf-title-block">
             <div className="pdf-title-block__top">
                <div className="pdf-title-block__company">
                   <div className="pdf-title-block__logo-placeholder">SOP</div>
                   <div className="pdf-title-block__company-name">SimpleSOP Industrial</div>
                </div>
                <div className="pdf-title-block__doc-type">
                   <div className="pdf-title-block__doc-type-label">Document Type</div>
                   <div className="pdf-title-block__doc-type-value">Standard Operating Procedure</div>
                </div>
             </div>
             <div className="pdf-title-block__title-row">
                <div className="pdf-title-block__title-label">Document Title</div>
                <div className="pdf-title-block__title-text">{currentSop.title}</div>
             </div>
             <div className="pdf-title-block__meta">
                <div className="pdf-title-block__meta-col border-r border-[#c0c0c0]">
                   <div className="pdf-meta-row"><span className="pdf-meta-label">SOP ID:</span><span className="pdf-meta-value font-mono">{currentSop.sop_id}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Version:</span><span className="pdf-meta-value font-mono">V{currentSop.version}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Department:</span><span className="pdf-meta-value">{currentSop.department || '—'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Document Owner:</span><span className="pdf-meta-value">{currentSop.document_owner || '—'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Created By:</span><span className="pdf-meta-value">{currentSop.created_by || '—'}</span></div>
                </div>
                <div className="pdf-title-block__meta-col">
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Approval Status:</span><span className="pdf-meta-value font-bold">{currentSop.approval_status || 'Draft'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Created Date:</span><span className="pdf-meta-value">{fmtDate(currentSop.created_date)}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Active / Release:</span><span className="pdf-meta-value">{fmtDate(currentSop.active_date)}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Next Review:</span><span className="pdf-meta-value">{fmtDate(currentSop.next_review_date)}</span></div>
                </div>
             </div>
             {currentSop.distribution_list && (
                <div className="pdf-title-block__dist border-t border-[#c0c0c0] bg-[#f8f8f8] p-2 text-[7.5pt] flex gap-2">
                   <span className="font-bold text-[#555]">Distribution:</span>
                   <span>{currentSop.distribution_list}</span>
                </div>
             )}
          </div>

          {/* 1. Purpose & Scope */}
          {(currentSop.purpose || currentSop.scope) && (
            <div className="pdf-section">
               <div className="pdf-section-header">1. Purpose & Scope</div>
               <table className="pdf-ps-table w-full border-collapse border border-[#c0c0c0]">
                  <tbody>
                     {currentSop.purpose && (
                        <tr>
                           <td className="w-[100px] font-bold bg-[#f0f0f0] border border-[#c0c0c0] p-2 text-[8pt]">Purpose</td>
                           <td className="border border-[#c0c0c0] p-2 text-[8.5pt] whitespace-pre-wrap leading-relaxed">{currentSop.purpose}</td>
                        </tr>
                     )}
                     {currentSop.scope && (
                        <tr>
                           <td className="w-[100px] font-bold bg-[#f0f0f0] border border-[#c0c0c0] p-2 text-[8pt]">Scope</td>
                           <td className="border border-[#c0c0c0] p-2 text-[8.5pt] whitespace-pre-wrap leading-relaxed">{currentSop.scope}</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
          )}

          {/* 2. Safety */}
          {(currentSop.safety_notes || currentSop.training_required) && (
            <div className="pdf-section mt-4">
               <div className="pdf-section-header">2. Safety, Hazards & Training Requirements</div>
               <div className="pt-2">
                  {currentSop.safety_notes && (
                    <div className="border border-[#aaaaaa] border-l-4 border-l-[#555555] bg-[#f5f5f5] p-3 mb-2">
                       <div className="text-[7.5pt] font-bold uppercase mb-1">Safety & Environmental Hazards</div>
                       <div className="text-[8.5pt] whitespace-pre-wrap leading-relaxed">{currentSop.safety_notes}</div>
                    </div>
                  )}
                  {currentSop.training_required && (
                    <div className="border border-[#bbbbbb] border-l-4 border-l-[#444444] bg-[#f8f8f8] p-3">
                       <div className="text-[7.5pt] font-bold uppercase mb-1">Training Required</div>
                       <div className="text-[8.5pt] whitespace-pre-wrap leading-relaxed">{currentSop.training_details || 'Refer to department modules.'}</div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* Page 2: Tools & Items */}
        {(tools.length > 0 || items.length > 0) && (
          <div className="pdf-page sop-pdf-card">
            {/* 3. Tools */}
            {tools.length > 0 && (
              <div className="pdf-section">
                <div className="pdf-section-header">3. Equipment & Tools Required</div>
                <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[7.5pt]">
                    <thead>
                      <tr className="bg-[#ebebeb]">
                          <th className="border border-[#c0c0c0] p-1 w-[24px] text-center italic">#</th>
                          <th className="border border-[#c0c0c0] p-1 w-[48px] text-center">Image</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Tool Name / Description</th>
                          <th className="border border-[#c0c0c0] p-1 text-center w-[60px]">Type</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[80px]">Model #</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Specification</th>
                          <th className="border border-[#c0c0c0] p-1 text-center w-[50px]">Cal. Req</th>
                          <th className="border border-[#c0c0c0] p-1 text-center w-[60px]">Cal. Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((t, idx) => (
                          <tr key={t.id} className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                            <td className="border border-[#c0c0c0] p-1 text-center text-[#888]">{idx + 1}</td>
                            <td className="border border-[#c0c0c0] p-1 text-center align-middle">
                                <ImageFrame 
                                  src={t.image_uuid ? imageUrls[t.image_uuid] : null} 
                                  className="w-10 h-6 border-none bg-transparent"
                                />
                            </td>
                            <td className="border border-[#c0c0c0] p-1 font-bold">{t.name}</td>
                            <td className="border border-[#c0c0c0] p-1 text-center">{t.type || '—'}</td>
                            <td className="border border-[#c0c0c0] p-1 font-mono text-[7pt]">{t.model_part_no || '—'}</td>
                            <td className="border border-[#c0c0c0] p-1 italic">{t.specification || '—'}</td>
                            <td className="border border-[#c0c0c0] p-1 text-center">{t.calibration_required ? 'Yes' : 'No'}</td>
                            <td className="border border-[#c0c0c0] p-1 text-center">{fmtDate(t.calibration_due_date)}</td>
                          </tr>
                      ))}
                    </tbody>
                </table>
              </div>
            )}

            {/* 4. Items */}
            {items.length > 0 && (
              <div className="pdf-section mt-4">
                  <div className="pdf-section-header">4. Materials & Parts Required</div>
                  <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[7.5pt]">
                    <thead>
                        <tr className="bg-[#ebebeb]">
                          <th className="border border-[#c0c0c0] p-1 w-[24px] text-center italic">#</th>
                          <th className="border border-[#c0c0c0] p-1 w-[48px] text-center">Image</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Item Name</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[100px]">Part No / SKU</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Description</th>
                          <th className="border border-[#c0c0c0] p-1 text-center w-[40px]">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((i, idx) => (
                          <tr key={i.id} className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                              <td className="border border-[#c0c0c0] p-1 text-center text-[#888]">{idx + 1}</td>
                              <td className="border border-[#c0c0c0] p-1 text-center align-middle">
                                <ImageFrame 
                                  src={i.image_uuid ? imageUrls[i.image_uuid] : null} 
                                  className="w-10 h-6 border-none bg-transparent"
                                />
                              </td>
                              <td className="border border-[#c0c0c0] p-1 font-bold">{i.name}</td>
                              <td className="border border-[#c0c0c0] p-1 font-mono text-[7pt]">{i.part_no || '—'}</td>
                              <td className="border border-[#c0c0c0] p-1 italic">{i.description || '—'}</td>
                              <td className="border border-[#c0c0c0] p-1 text-center font-bold">{i.unit || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
            )}
          </div>
        )}

        {/* Page 3: Procedure (Can be multiple, but we'll start a new page) */}
        <div className="pdf-page sop-pdf-card h-auto min-h-[297mm]">
          <div className="pdf-section">
             <div className="pdf-section-header">5. Procedure</div>
             <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[8pt]">
                <thead>
                   <tr className="bg-[#ebebeb]">
                      <th className="border border-[#c0c0c0] p-1 w-[32px] text-center">Step</th>
                      <th className="border border-[#c0c0c0] p-1 text-left">Action / Instruction</th>
                      <th className="border border-[#c0c0c0] p-1 text-left w-[120px]">Expected Output</th>
                      <th className="border border-[#c0c0c0] p-1 text-left w-[100px]">Notes</th>
                      <th className="border border-[#c0c0c0] p-1 text-left w-[120px]">Tools & Parts</th>
                   </tr>
                </thead>
                <tbody className="pdf-steps-tbody">
                   {stepsFull.length === 0 ? (
                      <tr><td colSpan={5} className="text-center p-4 italic text-[#888]">No procedure steps defined.</td></tr>
                   ) : stepsFull.map((s) => (
                      <React.Fragment key={s.step.id}>
                        <tr>
                           <td className="border border-[#c0c0c0] p-2 text-center font-bold text-[10pt]">{s.step.step_number}</td>
                           <td className="border border-[#c0c0c0] p-2 text-[8.5pt] leading-relaxed">
                              {s.step.action}
                           </td>
                           <td className="border border-[#c0c0c0] p-2 text-[8pt] italic text-[#333]">{s.step.expected_output || '—'}</td>
                           <td className="border border-[#c0c0c0] p-2 text-[8pt] text-[#555]">{s.step.notes || '—'}</td>
                           <td className="border border-[#c0c0c0] p-0 align-stretch">
                              <div className="flex flex-col h-full">
                                 {s.tools.length > 0 && (
                                    <div className="p-1 border-b border-[#d0d0d0]">
                                       <div className="text-[6pt] font-bold text-[#888] uppercase mb-0.5 tracking-tighter">Tools</div>
                                       {s.tools.map(st => (
                                          <div key={st.id} className="text-[7pt] leading-tight mb-0.5">• {st.tool_id ? tools.find(t => t.id === st.tool_id)?.name : st.free_text}</div>
                                       ))}
                                    </div>
                                 )}
                                 {s.items.length > 0 && (
                                    <div className="p-1">
                                       <div className="text-[6pt] font-bold text-[#888] uppercase mb-0.5 tracking-tighter">Parts</div>
                                       {s.items.map(si => (
                                          <div key={si.id} className="text-[7pt] leading-tight mb-0.5">• {si.quantity && `${si.quantity}x `}{si.item_id ? items.find(i => i.id === si.item_id)?.name : si.free_text}</div>
                                       ))}
                                    </div>
                                 )}
                                 {s.tools.length === 0 && s.items.length === 0 && (
                                    <div className="p-2 text-center text-[#ccc]">—</div>
                                 )}
                              </div>
                           </td>
                        </tr>
                        {s.images.length > 0 && (
                          <tr>
                             <td className="border border-[#c0c0c0] p-1 text-center text-[#999] align-middle">&#x21b3;</td>
                             <td colSpan={4} className="border border-[#c0c0c0] p-2 border-t-0 border-dashed">
                                <div className="flex flex-wrap gap-3">
                                   {s.images.map(img => (
                                      <div key={img.id} className="text-center">
                                         <ImageFrame 
                                           src={imageUrls[img.image_uuid] || null} 
                                           className="w-[150px] border-[#c0c0c0]"
                                         />
                                         <div className="text-[6.5pt] text-[#888] mt-1 italic">Step {s.step.step_number} / Fig. {img.sort_order}</div>
                                      </div>
                                   ))}
                                </div>
                             </td>
                          </tr>
                        )}
                      </React.Fragment>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Page 4: Definitions & Revision History */}
        {(definitions.length > 0 || revisions.length > 0) && (
          <div className="pdf-page sop-pdf-card">
            {/* 6. Definitions */}
            {definitions.length > 0 && (
              <div className="pdf-section">
                  <div className="pdf-section-header">6. Definitions & Abbreviations</div>
                  <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[8pt]">
                    <thead>
                        <tr className="bg-[#ebebeb]">
                          <th className="border border-[#c0c0c0] p-1 w-[120px] text-left">Term / Abbreviation</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Definition / Meaning</th>
                        </tr>
                    </thead>
                    <tbody>
                        {definitions.map((d, idx) => (
                          <tr key={d.id} className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                              <td className="border border-[#c0c0c0] p-1.5 font-mono font-bold text-[8.5pt]">{d.term}</td>
                              <td className="border border-[#c0c0c0] p-1.5">{d.meaning}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
            )}

            {/* 7. Revision History */}
            {revisions.length > 0 && (
              <div className="pdf-section mt-4">
                  <div className="pdf-section-header">7. Document Revision History</div>
                  <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[7.5pt]">
                    <thead>
                        <tr className="bg-[#ebebeb]">
                          <th className="border border-[#c0c0c0] p-1 w-[32px] text-center">Ver.</th>
                          <th className="border border-[#c0c0c0] p-1 text-left">Revision Notes</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[80px]">Revised By</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[72px]">Rev. Date</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[80px]">Status</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[80px]">Approved By</th>
                          <th className="border border-[#c0c0c0] p-1 text-left w-[72px]">Appr. Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {revisions.map((r, idx) => (
                          <tr key={r.id} className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                              <td className="border border-[#c0c0c0] p-1 text-center font-bold font-mono">V{r.version}</td>
                              <td className={cn("border border-[#c0c0c0] p-1", r.version === 1 && "italic text-[#888]")}>{r.revision_notes}</td>
                              <td className="border border-[#c0c0c0] p-1">{r.revised_by || '—'}</td>
                              <td className="border border-[#c0c0c0] p-1">{fmtDate(r.revision_date)}</td>
                              <td className="border border-[#c0c0c0] p-1 font-medium">{r.approval_status || 'Draft'}</td>
                              <td className="border border-[#c0c0c0] p-1">{r.approved_by || '—'}</td>
                              <td className="border border-[#c0c0c0] p-1">{fmtDate(r.approval_date)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
