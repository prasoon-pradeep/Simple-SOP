import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { ArrowLeft, Pencil, Download, Database, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './Viewer.css';

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentSop, setCurrentSop,
    setRevisions,
    tools, setTools,
    items, setItems,
    stepsFull, setStepsFull,
    setEditorOrigin
  } = useSopStore();

  const [isLoading, setIsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
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
      const [sop, revs, toolsData, itemsData, steps] = await Promise.all([
        invoke<any>('get_sop', { id }),
        invoke<any[]>('get_revisions', { sopId: id }),
        invoke<any[]>('get_tools', { sopId: id }),
        invoke<any[]>('get_items', { sopId: id }),
        invoke<any[]>('get_steps_full', { sopId: id }),
      ]);

      setCurrentSop(sop);
      setRevisions(revs);
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
      case 'Review': return <Clock className="w-4 h-4 mr-2 text-status-amber" />;
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
           <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Document ID</span>
                <p className="font-mono font-bold text-sm text-text-primary">{currentSop.sop_id}</p>
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
              <Button className="w-full bg-brand hover:bg-brand-hover text-white shadow-sm font-bold flex items-center justify-center">
                 <Download className="w-4 h-4 mr-2" />
                 Export PDF
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
      <main className="flex-1 overflow-y-auto bg-[#c8c8c8] p-10 flex justify-center">
        <div className="sop-pdf-card bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[15mm] text-[#1a1a1a]">
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
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Owner:</span><span className="pdf-meta-value">{currentSop.document_owner || '—'}</span></div>
                </div>
                <div className="pdf-title-block__meta-col">
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Status:</span><span className="pdf-meta-value font-bold">{currentSop.approval_status || 'Draft'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Released:</span><span className="pdf-meta-value">{currentSop.active_date || '—'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Project:</span><span className="pdf-meta-value">{currentSop.project_tag || '—'}</span></div>
                   <div className="pdf-meta-row"><span className="pdf-meta-label">Next Review:</span><span className="pdf-meta-value">{currentSop.next_review_date || '—'}</span></div>
                </div>
             </div>
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
                           <td className="border border-[#c0c0c0] p-2 text-[9pt] whitespace-pre-wrap">{currentSop.purpose}</td>
                        </tr>
                     )}
                     {currentSop.scope && (
                        <tr>
                           <td className="w-[100px] font-bold bg-[#f0f0f0] border border-[#c0c0c0] p-2 text-[8pt]">Scope</td>
                           <td className="border border-[#c0c0c0] p-2 text-[9pt] whitespace-pre-wrap">{currentSop.scope}</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
          )}

          {/* 2. Safety */}
          {(currentSop.safety_notes || currentSop.training_required) && (
            <div className="pdf-section mt-6">
               <div className="pdf-section-header">2. Safety & Training</div>
               <div className="p-1">
                  {currentSop.safety_notes && (
                    <div className="border border-[#aaaaaa] border-l-4 border-l-[#555555] bg-[#f5f5f5] p-3 mb-3">
                       <div className="text-[7.5pt] font-bold uppercase mb-1">Safety Hazards</div>
                       <div className="text-[9pt] whitespace-pre-wrap">{currentSop.safety_notes}</div>
                    </div>
                  )}
                  {currentSop.training_required && (
                    <div className="border border-[#bbbbbb] border-l-4 border-l-[#444444] bg-[#f8f8f8] p-3">
                       <div className="text-[7.5pt] font-bold uppercase mb-1">Training Required</div>
                       <div className="text-[9pt] whitespace-pre-wrap">{currentSop.training_details || 'Refer to department modules.'}</div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* 3. Tools */}
          {tools.length > 0 && (
            <div className="pdf-section mt-6">
               <div className="pdf-section-header">3. Equipment & Tools</div>
               <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[8pt]">
                  <thead>
                     <tr className="bg-[#ebebeb]">
                        <th className="border border-[#c0c0c0] p-1 w-[40px]">Image</th>
                        <th className="border border-[#c0c0c0] p-1 text-left">Tool Name</th>
                        <th className="border border-[#c0c0c0] p-1 text-left">Type / Model</th>
                        <th className="border border-[#c0c0c0] p-1 text-left">Specification</th>
                     </tr>
                  </thead>
                  <tbody>
                     {tools.map((t, idx) => (
                        <tr key={t.id} className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                           <td className="border border-[#c0c0c0] p-1 text-center align-middle">
                              {t.image_uuid && imageUrls[t.image_uuid] ? (
                                <img src={imageUrls[t.image_uuid]} className="w-10 h-6 object-cover mx-auto" />
                              ) : <div className="w-10 h-6 bg-[#eee] border border-dashed border-[#ccc] mx-auto"></div>}
                           </td>
                           <td className="border border-[#c0c0c0] p-1 font-bold">{t.name}</td>
                           <td className="border border-[#c0c0c0] p-1">{t.type} {t.model_part_no && `/ ${t.model_part_no}`}</td>
                           <td className="border border-[#c0c0c0] p-1 italic">{t.specification || '—'}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}

          {/* 4. Procedure */}
          <div className="pdf-section mt-6">
             <div className="pdf-section-header">4. Procedure</div>
             <table className="pdf-table w-full border-collapse border border-[#c0c0c0] text-[8pt]">
                <thead>
                   <tr className="bg-[#ebebeb]">
                      <th className="border border-[#c0c0c0] p-1 w-[30px]">Step</th>
                      <th className="border border-[#c0c0c0] p-1 text-left">Action</th>
                      <th className="border border-[#c0c0c0] p-1 text-left w-[120px]">Expected Output</th>
                      <th className="border border-[#c0c0c0] p-1 text-left w-[100px]">Notes</th>
                   </tr>
                </thead>
                <tbody>
                   {stepsFull.map((s, idx) => (
                      <React.Fragment key={s.step.id}>
                        <tr className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                           <td className="border border-[#c0c0c0] p-2 text-center font-bold text-[10pt]">{s.step.step_number}</td>
                           <td className="border border-[#c0c0c0] p-2 text-[9pt]">
                              {s.step.action}
                              <div className="mt-2 flex flex-wrap gap-1">
                                 {s.tools.map(st => (
                                    <span key={st.id} className="text-[7pt] px-1 bg-[#eee] border border-[#ccc] rounded">Tool: {st.tool_id ? tools.find(t => t.id === st.tool_id)?.name : st.free_text}</span>
                                 ))}
                                 {s.items.map(si => (
                                    <span key={si.id} className="text-[7pt] px-1 bg-[#eee] border border-[#ccc] rounded">Part: {si.item_id ? items.find(i => i.id === si.item_id)?.name : si.free_text}</span>
                                 ))}
                              </div>
                           </td>
                           <td className="border border-[#c0c0c0] p-2 text-[8pt] italic">{s.step.expected_output || '—'}</td>
                           <td className="border border-[#c0c0c0] p-2 text-[8pt] text-[#555]">{s.step.notes || '—'}</td>
                        </tr>
                        {s.images.length > 0 && (
                          <tr className={idx % 2 === 1 ? 'bg-[#f6f6f6]' : ''}>
                             <td className="border border-[#c0c0c0] p-1 text-center text-[#999]">&#x21b3;</td>
                             <td colSpan={3} className="border border-[#c0c0c0] p-2">
                                <div className="flex flex-wrap gap-3">
                                   {s.images.map(img => (
                                      <div key={img.id} className="text-center">
                                         <img src={imageUrls[img.image_uuid]} className="max-w-[140px] border border-[#ccc]" />
                                         <div className="text-[6pt] text-[#888] mt-1">Fig. {img.sort_order}</div>
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
      </main>
    </div>
  );
}
