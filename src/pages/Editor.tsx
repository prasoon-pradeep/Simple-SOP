import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { FileText, Target, ShieldAlert, Wrench, Package, ListOrdered, BookOpen, CheckSquare, ArrowLeft, Save } from 'lucide-react';
import { HeaderSection } from '@/components/editor/sections/HeaderSection';
import { ScopeSection } from '@/components/editor/sections/ScopeSection';
import { SafetySection } from '@/components/editor/sections/SafetySection';
import { ApprovalSection } from '@/components/editor/sections/ApprovalSection';
import { RevisionModal } from '@/components/editor/RevisionModal';

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

  const handleBack = () => {
    if (isDirty) {
      setShowRevisionModal(true);
    } else {
      navigate('/');
    }
  };

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
      case 'tools': return <div className="p-6">Tools Placeholder</div>;
      case 'items': return <div className="p-6">Items Placeholder</div>;
      case 'procedure': return <div className="p-6">Procedure Placeholder</div>;
      case 'definitions': return <div className="p-6">Definitions Placeholder</div>;
      case 'approval': return <ApprovalSection />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-standard flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-border-standard flex items-center px-4">
          <button 
            onClick={handleBack}
            className="flex items-center text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="p-4 border-b border-border-subtle">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-quaternary mb-1">
            Editing SOP
          </h2>
          <p className="font-medium text-text-primary truncate">
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
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-brand' : 'text-text-tertiary'}`} />
                {sec.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-standard text-xs flex items-center justify-between">
          <span className="text-text-tertiary">Status</span>
          {isDirty ? (
            <span className="text-status-amber flex items-center font-medium">
              <span className="w-2 h-2 rounded-full bg-status-amber mr-2"></span>
              Unsaved Changes
            </span>
          ) : (
            <span className="text-status-green flex items-center font-medium">
              <span className="w-2 h-2 rounded-full bg-status-green mr-2"></span>
              Saved
            </span>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-panel overflow-y-auto">
        <header className="h-14 bg-surface border-b border-border-standard flex items-center justify-between px-6 shrink-0">
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
