import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { FileText, Target, ShieldAlert, Wrench, Package, ListOrdered, BookOpen, CheckSquare, Save } from 'lucide-react';
import { HeaderSection } from '@/components/editor/sections/HeaderSection';
import { ScopeSection } from '@/components/editor/sections/ScopeSection';
import { SafetySection } from '@/components/editor/sections/SafetySection';
import { ToolsSection } from '@/components/editor/sections/ToolsSection';
import { ItemsSection } from '@/components/editor/sections/ItemsSection';
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
  const { isDirty, currentSop, setDirty } = useSopStore();

  const handleRevisionConfirm = (data: any) => {
    // TODO: implement rust call to save revision and update SOP
    console.log("Saving revision:", data);
    setDirty(false);
    setShowRevisionModal(false);
    navigate('/');
  };

  const handleRevisionDiscard = () => {
    setDirty(false);
    setShowRevisionModal(false);
    navigate('/');
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
      case 'procedure': return <div className="p-6">Procedure Placeholder</div>;
      case 'definitions': return <div className="p-6">Definitions Placeholder</div>;
      case 'approval': return <ApprovalSection />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <Header />
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
              {id}
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
                   onClick={() => setShowRevisionModal(true)}
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
      />
    </div>
  );
}
