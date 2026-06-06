import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Target, ShieldAlert, Wrench, Package, ListOrdered, BookOpen, CheckSquare, Download, FileDown } from 'lucide-react';
import { HeaderSection } from '@/components/editor/sections/HeaderSection';
import { ScopeSection } from '@/components/editor/sections/ScopeSection';
import { SafetySection } from '@/components/editor/sections/SafetySection';
import { ToolsSection } from '@/components/editor/sections/ToolsSection';
import { ItemsSection } from '@/components/editor/sections/ItemsSection';
import { ProcedureSection } from '@/components/editor/sections/ProcedureSection';
import { DefinitionsSection } from '@/components/editor/sections/DefinitionsSection';
import { ApprovalSection } from '@/components/editor/sections/ApprovalSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RevisionModal } from '@/components/editor/RevisionModal';
import { Header } from '@/components/layout/Header';
import { save } from '@tauri-apps/plugin-dialog';

const SECTIONS = [
  { id: 'header', label: 'Header', icon: FileText },
  { id: 'scope', label: 'Scope & Purpose', icon: Target },
  { id: 'safety', label: 'Safety & Training', icon: ShieldAlert },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'procedure', label: 'Procedure', icon: ListOrdered },
  { id: 'definitions', label: 'Definitions', icon: BookOpen },
  { id: 'approval', label: 'Approval & Revisions', icon: CheckSquare },
];

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('header');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [modalMode, setModalMode] = useState<'exit' | 'log'>('exit');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { 
    hasUnsavedRevision,
    currentSop, 
    editorOrigin, 
    setDirty, 
    setHasUnsavedRevision,
    setCurrentSop, 
    setRevisions, 
    setTools, 
    setItems, 
    setStepsFull, 
    setDefinitions 
  } = useSopStore();


  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [sop, revs, tools, items, steps, defs] = await Promise.all([
        invoke<any>('get_sop', { id }),
        invoke<any[]>('get_revisions', { sopId: id }),
        invoke<any[]>('get_tools', { sopId: id }),
        invoke<any[]>('get_items', { sopId: id }),
        invoke<any[]>('get_steps_full', { sopId: id }),
        invoke<any[]>('get_definitions', { sopId: id }),
      ]);

      setCurrentSop(sop);
      setRevisions(revs);
      setTools(tools);
      setItems(items);
      setStepsFull(steps);
      setDefinitions(defs);
    } catch (error) {
      console.error("Failed to load SOP data", error);
    }
  };

  const handleBack = () => {
    if (hasUnsavedRevision) {
      setShowExitConfirm(true);
    } else {
      exitCleanly();
    }
  };

  const exitCleanly = () => {
    if (editorOrigin === 'viewer' && currentSop) {
      navigate(`/sop/${currentSop.id}/view`);
    } else {
      navigate('/');
    }
  };

  const handleRevisionConfirm = async (data: any) => {
    try {
      await invoke('save_revision', {
        payload: {
          sop_id: id,
          revision_notes: data.notes,
          revised_by: data.revisedBy,
          approval_status: data.status,
          approved_by: data.status === 'Approved' ? data.approvedBy : null,
          approval_date: data.status === 'Approved' ? data.approvalDate : null,
        }
      });
      
      setDirty(false);
      setHasUnsavedRevision(false);
      setShowRevisionModal(false);
      
      if (modalMode === 'exit') {
        exitCleanly();
      } else {
        // Just reload history if we are logging from the tab
        const revs = await invoke<any[]>('get_revisions', { sopId: id });
        setRevisions(revs);
      }
    } catch (error) {
      console.error("Failed to save revision", error);
      alert("Error saving revision: " + error);
    }
  };

  const handleRevisionDiscard = () => {
    setDirty(false);
    setHasUnsavedRevision(false);
    setShowRevisionModal(false);
    exitCleanly();
  };

  const handleRevisionCancel = () => {
    setShowRevisionModal(false);
  };

  const handleExportSop = async () => {
    if (!currentSop) return;
    try {
      const safeTitle = currentSop.title.replace(/[\/\\:*?"<>|]/g, '').trim();
      const suggestedName = `${currentSop.sop_id} - ${safeTitle}.sop`;
      const selected = await save({
        filters: [{ name: 'SOP File', extensions: ['sop'] }],
        defaultPath: suggestedName,
      });

      if (selected) {
        await invoke('export_sop', { 
          sopIdUuid: currentSop.id, 
          savePath: selected 
        });
      }
    } catch (error) {
      console.error("Failed to export SOP", error);
      alert("Error exporting SOP: " + error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'header': return <HeaderSection />;
      case 'scope': return <ScopeSection />;
      case 'safety': return <SafetySection />;
      case 'tools': return <ToolsSection />;
      case 'items': return <ItemsSection />;
      case 'procedure': return <ProcedureSection />;
      case 'definitions': return <DefinitionsSection />;
      case 'approval': return (
        <ApprovalSection 
          onLogRevision={() => {
            setModalMode('log');
            setShowRevisionModal(true);
          }} 
        />
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <Header onBack={handleBack} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-surface border-r border-border-standard flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-border-subtle">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-quaternary mb-1">
              Editing SOP
            </h2>
            <p className="font-medium text-text-primary truncate" title={currentSop?.title || 'Untitled SOP'}>
              {currentSop?.title || 'Untitled SOP'}
            </p>
            <p className="text-xs font-mono text-text-tertiary mt-0.5">
              {currentSop?.sop_id || 'Loading...'}
            </p>
            </div>
          <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-brand-light text-brand' 
                      : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-brand' : 'text-text-tertiary'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Actions */}
          <div className="p-3 border-t border-border-subtle bg-panel/30 space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs font-bold text-text-tertiary h-9 px-3 hover:text-brand"
              onClick={handleExportSop}
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Export .sop
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full justify-start text-xs font-bold h-9 px-3 bg-brand hover:bg-brand-hover shadow-sm"
              onClick={() => navigate(`/sop/${id}/view`)}
            >
              <FileDown className="w-3.5 h-3.5 mr-2" />
              Export PDF
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full bg-panel overflow-hidden">
          <header className="h-12 bg-surface border-b border-border-standard flex items-center justify-between px-6 shrink-0">
            <h1 className="text-lg font-bold text-text-primary">
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h1>
          </header>
          <div className="flex-1 overflow-y-auto">
             {renderSection()}
          </div>
        </main>
      </div>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Unsaved Revision Changes</DialogTitle>
            <DialogDescription className="pt-2">
              You have made changes in this session. Would you like to log a revision for document control before exiting?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowExitConfirm(false);
                exitCleanly();
              }}
              className="text-text-tertiary"
            >
              Exit Without Logging
            </Button>
            <Button 
              onClick={() => {
                setShowExitConfirm(false);
                setModalMode('exit');
                setShowRevisionModal(true);
              }}
            >
              Yes, Log Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RevisionModal
        open={showRevisionModal}
        onOpenChange={setShowRevisionModal}
        onConfirm={handleRevisionConfirm}
        onDiscard={handleRevisionDiscard}
        onCancel={handleRevisionCancel}
        mode={modalMode}
        sopId={currentSop?.id}
        sopTitle={currentSop?.title}
        department={currentSop?.department ?? undefined}
      />
    </div>
  );
}
