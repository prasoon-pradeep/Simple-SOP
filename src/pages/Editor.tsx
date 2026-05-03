import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Target, ShieldAlert, Wrench, Package, ListOrdered, BookOpen, CheckSquare, Save } from 'lucide-react';
import { HeaderSection } from '@/components/editor/sections/HeaderSection';
import { ScopeSection } from '@/components/editor/sections/ScopeSection';
import { SafetySection } from '@/components/editor/sections/SafetySection';
import { ToolsSection } from '@/components/editor/sections/ToolsSection';
import { ItemsSection } from '@/components/editor/sections/ItemsSection';
import { ProcedureSection } from '@/components/editor/sections/ProcedureSection';
import { DefinitionsSection } from '@/components/editor/sections/DefinitionsSection';
import { ApprovalSection } from '@/components/editor/sections/ApprovalSection';
import { RevisionModal } from '@/components/editor/RevisionModal';
import { Header } from '@/components/layout/Header';

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
  const { 
    isDirty, currentSop, editorOrigin, 
    setDirty, setCurrentSop, setRevisions, 
    setTools, setItems, setStepsFull, setDefinitions 
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
    if (isDirty) {
      setModalMode('exit');
      setShowRevisionModal(true);
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
    setShowRevisionModal(false);
    exitCleanly();
  };

  const handleRevisionCancel = () => {
    setShowRevisionModal(false);
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
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full bg-panel overflow-hidden">
          <header className="h-12 bg-surface border-b border-border-standard flex items-center justify-between px-6 shrink-0">
            <h1 className="text-lg font-bold text-text-primary">
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h1>
            <div className="flex items-center space-x-3">
              {isDirty && (
                 <button 
                   onClick={() => {
                     setModalMode('log');
                     setShowRevisionModal(true);
                   }}
                   className="flex items-center px-3 py-1.5 bg-brand text-white rounded text-sm font-medium hover:bg-brand-hover transition-colors"
                 >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                 </button>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
             {renderSection()}
          </div>
        </main>
      </div>

      <RevisionModal 
        open={showRevisionModal} 
        onOpenChange={setShowRevisionModal}
        onConfirm={handleRevisionConfirm}
        onDiscard={handleRevisionDiscard}
        onCancel={handleRevisionCancel}
        mode={modalMode}
      />
    </div>
  );
}
