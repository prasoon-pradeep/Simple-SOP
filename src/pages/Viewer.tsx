import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { ArrowLeft, Pencil, Download, Database, CheckCircle2, Clock, XCircle, AlertCircle, FileArchive } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Definition, SOP, Revision, Tool, Item, StepFull } from '@/types';
import { cn } from '@/lib/utils';
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
  type PdfStatus = 'idle' | 'saving' | 'rendering' | 'error';
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
  const [chromiumAvailable, setChromiumAvailable] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState('My Company');

  useEffect(() => {
    invoke<boolean>('check_chromium_available').then(setChromiumAvailable).catch(() => {});
  }, []);

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
      const [sop, revs, defs, toolsData, itemsData, steps, configName] = await Promise.all([
        invoke<SOP>('get_sop', { id }),
        invoke<Revision[]>('get_revisions', { sopId: id }),
        invoke<Definition[]>('get_definitions', { sopId: id }),
        invoke<Tool[]>('get_tools', { sopId: id }),
        invoke<Item[]>('get_items', { sopId: id }),
        invoke<StepFull[]>('get_steps_full', { sopId: id }),
        invoke<string | null>('get_config_value', { key: 'company_name' }),
      ]);
      setCompanyName(configName ?? 'My Company');

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

  const statusClass = (s: string | null) => {
    if (!s) return 'status--draft';
    const l = s.toLowerCase();
    if (l === 'approved') return 'status--approved';
    if (l.includes('review')) return 'status--review';
    if (l === 'rejected') return 'status--rejected';
    return 'status--draft';
  };

  if (isLoading || !currentSop) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-text-tertiary">
        Loading document...
      </div>
    );
  }

  const handleExportSop = async () => {
    if (!currentSop) return;
    try {
      const suggestedName = `${currentSop.sop_id}-V${currentSop.version}.sop`;
      const selected = await save({
        filters: [{ name: 'SOP File', extensions: ['sop'] }],
        defaultPath: suggestedName,
      });
      if (selected) {
        await invoke('export_sop', { sopIdUuid: currentSop.id, savePath: selected });
      }
    } catch (error) {
      console.error("Failed to export SOP", error);
      alert("Error exporting SOP: " + error);
    }
  };

  const handleExportPdf = async () => {
    if (!currentSop) return;
    setPdfStatus('saving');
    try {
      const suggestedName = `${currentSop.sop_id}-V${currentSop.version}.pdf`;
      const outputPath = await save({
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
        defaultPath: suggestedName,
      });
      if (!outputPath) { setPdfStatus('idle'); return; }
      setPdfStatus('rendering');
      await invoke('export_pdf', { sopIdUuid: currentSop.id, outputPath });
      setPdfStatus('idle');
    } catch (e) {
      console.error('PDF export failed:', e);
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 4000);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-4 h-4 mr-2 text-status-green" />;
      case 'Rejected': return <XCircle className="w-4 h-4 mr-2 text-status-red" />;
      case 'Under Review': return <Clock className="w-4 h-4 mr-2 text-status-amber" />;
      default: return <AlertCircle className="w-4 h-4 mr-2 text-text-tertiary" />;
    }
  };

  let sectionNum = 1;

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
              <Button onClick={handleExportSop} variant="outline" className="w-full font-bold flex items-center justify-center">
                 <FileArchive className="w-4 h-4 mr-2" />
                 Export .sop
              </Button>
              <Button
                disabled={pdfStatus !== 'idle'}
                onClick={handleExportPdf}
                className="w-full bg-brand hover:bg-brand-hover text-white shadow-sm font-bold flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfStatus === 'saving' && 'Choose save location…'}
                {pdfStatus === 'rendering' && 'Rendering PDF…'}
                {pdfStatus === 'error' && 'Export Failed'}
                {pdfStatus === 'idle' && 'Export PDF'}
              </Button>
              {pdfStatus === 'rendering' && (
                <p className="text-xs text-center text-text-tertiary">Generating with Chromium…</p>
              )}
              {pdfStatus === 'error' && (
                <p className="text-xs text-center text-status-red font-semibold">Check console for details.</p>
              )}
              {!chromiumAvailable && pdfStatus === 'idle' && (
                <p className="text-xs text-center text-text-tertiary flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Needs a Chromium browser
                </p>
              )}
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
      <main className="flex-1 overflow-y-auto bg-[#c8c8c8] p-10 flex justify-center items-start">
        <div className="sop-pdf-card pdf-page">
          {/* Header Block */}
          <div className="title-block">
             <div className="title-block__top">
                <div className="title-block__company">
                   <div className="title-block__company-name">{companyName}</div>
                </div>
                <div className="title-block__doc-type">
                   <div className="title-block__doc-type-label">Document Type</div>
                   <div className="title-block__doc-type-value">Standard Operating Procedure</div>
                </div>
             </div>
             <div className="title-block__title-row">
                <div className="title-block__title-label">Document Title</div>
                <div className="title-block__title-text">{currentSop.title}</div>
             </div>
             <div className="title-block__meta">
                <div className="title-block__meta-col">
                   <div className="meta-row"><span className="meta-label">SOP ID:</span><span className="meta-value meta-mono">{currentSop.sop_id}</span></div>
                   <div className="meta-row"><span className="meta-label">Version:</span><span className="meta-value meta-mono">V{currentSop.version}</span></div>
                   <div className="meta-row"><span className="meta-label">Department:</span><span className="meta-value">{currentSop.department || '—'}</span></div>
                   <div className="meta-row"><span className="meta-label">Document Owner:</span><span className="meta-value">{currentSop.document_owner || '—'}</span></div>
                   <div className="meta-row"><span className="meta-label">Created By:</span><span className="meta-value">{currentSop.created_by || '—'}</span></div>
                </div>
                <div className="title-block__meta-col">
                   <div className="meta-row"><span className="meta-label">Approval Status:</span><span className={cn("meta-value", statusClass(currentSop.approval_status))}>{currentSop.approval_status || 'Draft'}</span></div>
                   <div className="meta-row"><span className="meta-label">Created Date:</span><span className="meta-value">{fmtDate(currentSop.created_date)}</span></div>
                   <div className="meta-row"><span className="meta-label">Active / Release:</span><span className="meta-value">{fmtDate(currentSop.active_date)}</span></div>
                   <div className="meta-row"><span className="meta-label">Next Review:</span><span className="meta-value">{fmtDate(currentSop.next_review_date)}</span></div>
                </div>
             </div>
             {currentSop.distribution_list && (
                <div className="title-block__dist">
                   <span className="title-block__dist-label">Distribution:</span>
                   <span>{currentSop.distribution_list}</span>
                </div>
             )}
          </div>

          {/* 1. Purpose & Scope */}
          {(currentSop.purpose || currentSop.scope) && (
            <div className="section">
               <div className="section__header">{sectionNum++}. Purpose & Scope</div>
               <table className="ps-table">
                  <tbody>
                     {currentSop.purpose && (
                        <tr>
                           <td className="ps-table__label">Purpose</td>
                           <td className="ps-table__content">{currentSop.purpose}</td>
                        </tr>
                     )}
                     {currentSop.scope && (
                        <tr>
                           <td className="ps-table__label">Scope</td>
                           <td className="ps-table__content">{currentSop.scope}</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
          )}

          {/* 2. Safety */}
          {(currentSop.safety_notes || currentSop.training_required) && (
            <div className="section">
               <div className="section__header">{sectionNum++}. Safety, Hazards & Training Requirements</div>
               <div className="safety-wrap">
                  {currentSop.safety_notes && (
                    <div className="safety-box">
                       <div className="safety-box__header">Safety & Environmental Hazards</div>
                       <div className="safety-box__content">{currentSop.safety_notes}</div>
                    </div>
                  )}
                  {currentSop.training_required && (
                    <div className="training-box">
                       <div className="training-box__header">Training Required</div>
                       <div className="training-box__content">{currentSop.training_details || 'Refer to department modules.'}</div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* 3. Tools */}
          {tools.length > 0 && (
            <div className="section">
               <div className="section__header">{sectionNum++}. Equipment & Tools Required</div>
               <table className="tools-table">
                  <thead>
                     <tr>
                        <th className="col-num italic">#</th>
                        <th className="col-img">Image</th>
                        <th className="col-name">Tool Name / Description</th>
                        <th className="col-type">Type</th>
                        <th className="col-model">Model #</th>
                        <th className="col-spec">Specification</th>
                        <th className="col-cal">Cal. Req</th>
                        <th className="col-due">Cal. Due</th>
                     </tr>
                  </thead>
                  <tbody>
                     {tools.map((t, idx) => (
                        <tr key={t.id}>
                           <td className="col-num">{idx + 1}</td>
                           <td className="col-img">
                              {t.image_uuid ? (
                                <img src={imageUrls[t.image_uuid]} alt="" className="table-img" />
                              ) : (
                                <div className="table-img-placeholder">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                </div>
                              )}
                           </td>
                           <td className="name-cell">{t.name}</td>
                           <td className="col-type">{t.type || '—'}</td>
                           <td className="mono" style={{ fontSize: '7pt' }}>{t.model_part_no || '—'}</td>
                           <td className="italic">{t.specification || '—'}</td>
                           <td className="center">{t.calibration_required ? 'Yes' : 'No'}</td>
                           <td className="center">{fmtDate(t.calibration_due_date)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}

          {/* 4. Items */}
          {items.length > 0 && (
             <div className="section">
                <div className="section__header">{sectionNum++}. Materials & Parts Required</div>
                <table className="items-table">
                   <thead>
                      <tr>
                         <th className="col-num italic">#</th>
                         <th className="col-img">Image</th>
                         <th className="name-cell">Item Name</th>
                         <th className="col-part">Part No / SKU</th>
                         <th>Description</th>
                         <th className="col-qty">Qty</th>
                         <th className="col-unit">Unit</th>
                      </tr>
                   </thead>
                   <tbody>
                      {items.map((i, idx) => (
                         <tr key={i.id}>
                            <td className="col-num">{idx + 1}</td>
                            <td className="col-img">
                               {i.image_uuid ? (
                                 <img src={imageUrls[i.image_uuid]} alt="" className="table-img" />
                               ) : (
                                 <div className="table-img-placeholder">
                                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                     <rect x="3" y="3" width="18" height="18" rx="2"/>
                                     <circle cx="8.5" cy="8.5" r="1.5"/>
                                     <polyline points="21 15 16 10 5 21"/>
                                   </svg>
                                 </div>
                               )}
                            </td>
                            <td className="name-cell">{i.name}</td>
                            <td className="mono" style={{ fontSize: '7pt' }}>{i.part_no || '—'}</td>
                            <td className="italic">{i.description || '—'}</td>
                            <td className="col-qty">{i.qty || '-'}</td>
                            <td className="col-unit">{i.unit || '—'}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}

          {/* 5. Procedure */}
          <div className="section">
             <div className="section__header">{sectionNum++}. Procedure</div>
             <table className="steps-table">
                <thead>
                   <tr>
                      <th className="col-step">Step</th>
                      <th>Action / Instruction</th>
                      <th className="col-output">Expected Output</th>
                      <th className="col-notes">Notes</th>
                      <th className="col-tools-mats">Tools & Materials</th>
                   </tr>
                </thead>
                <tbody>
                   {stepsFull.length === 0 ? (
                      <tr><td colSpan={5} className="no-data">No procedure steps defined.</td></tr>
                   ) : stepsFull.map((s) => (
                      <React.Fragment key={s.step.id}>
                        <tr>
                           <td className="col-step">{s.step.step_number}</td>
                           <td className="step-action">
                              <div className="step-action__text">{s.step.action}</div>
                           </td>
                           <td className="col-output italic" style={{ fontSize: '8pt', color: '#333' }}>{s.step.expected_output || '—'}</td>
                           <td className="col-notes muted" style={{ fontSize: '8pt' }}>{s.step.notes || '—'}</td>
                           <td className="col-tools-mats">
                              {(s.tools.length > 0) && (
                                <div className="tm-section">
                                   <div className="tm-label">Tools</div>
                                   {s.tools.map(st => (
                                      <span key={st.id} className="tm-item">• {st.tool_id ? tools.find(t => t.id === st.tool_id)?.name : st.free_text}</span>
                                   ))}
                                </div>
                              )}
                              {(s.items.length > 0) && (
                                <div className="tm-section">
                                   <div className="tm-label">Materials</div>
                                   {s.items.map(si => (
                                      <span key={si.id} className="tm-item">• {si.quantity && `${si.quantity}x `}{si.item_id ? items.find(i => i.id === si.item_id)?.name : si.free_text}</span>
                                   ))}
                                </div>
                              )}
                              {s.tools.length === 0 && s.items.length === 0 && (
                                <div className="center muted" style={{ padding: '8px' }}>—</div>
                              )}
                           </td>
                        </tr>
                        {s.images.length > 0 && (
                          <tr className="step-images-row">
                             <td className="center muted align-middle">&#x21b3;</td>
                             <td colSpan={4}>
                                <div className="step-images-wrap">
                                   {s.images.map(img => (
                                      <div key={img.id} className="step-image-block">
                                         <img src={imageUrls[img.image_uuid]} alt="" />
                                         <figcaption>Step {s.step.step_number} / Fig. {img.sort_order}</figcaption>
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

          {/* 6. Definitions */}
          {definitions.length > 0 && (
             <div className="section">
                <div className="section__header">{sectionNum++}. Definitions & Abbreviations</div>
                <table className="def-table">
                   <thead>
                      <tr>
                         <th className="col-term">Term / Abbreviation</th>
                         <th>Definition / Meaning</th>
                      </tr>
                   </thead>
                   <tbody>
                      {definitions.map((d) => (
                         <tr key={d.id}>
                            <td className="col-term">{d.term}</td>
                            <td>{d.meaning}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}

          {/* 7. Revision History */}
          {revisions.length > 0 && (
             <div className="section">
                <div className="section__header">{sectionNum++}. Document Revision History</div>
                <table className="rev-table">
                   <thead>
                      <tr>
                         <th className="col-ver center">Ver.</th>
                         <th>Revision Notes</th>
                         <th className="col-by">Revised By</th>
                         <th className="col-date">Rev. Date</th>
                         <th className="col-status">Status</th>
                         <th className="col-apprby">Approved By</th>
                         <th className="col-apprdt">Approval Date</th>
                      </tr>
                   </thead>
                   <tbody>
                      {revisions.map((r) => (
                         <tr key={r.id}>
                            <td className="col-ver">V{r.version}</td>
                            <td className={cn(r.version === 1 && "rev-v1-note")}>{r.revision_notes}</td>
                            <td className="col-by">{r.revised_by || '—'}</td>
                            <td className="col-date">{fmtDate(r.revision_date)}</td>
                            <td className={cn("col-status", statusClass(r.approval_status))}>{r.approval_status || 'Draft'}</td>
                            <td className="col-apprby">{r.approved_by || '—'}</td>
                            <td className="col-apprdt">{fmtDate(r.approval_date)}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
