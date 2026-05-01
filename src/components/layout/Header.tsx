import { useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { currentSop, isDirty, isSaving, lastSavedAt, editorOrigin } = useSopStore();

  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm("You have unsaved changes. Leave without logging a revision?");
      if (confirmLeave) {
        navigate(editorOrigin === 'viewer' && currentSop ? `/sop/${currentSop.id}/view` : '/');
      }
    } else {
      navigate(editorOrigin === 'viewer' && currentSop ? `/sop/${currentSop.id}/view` : '/');
    }
  };

  return (
    <header className="h-12 bg-surface border-b border-border-standard flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center space-x-4">
        {currentSop && (
          <>
            <button 
              onClick={handleBack}
              className="flex items-center text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {editorOrigin === 'viewer' ? 'Back to Viewer' : 'Back to Home'}
            </button>
            <div className="h-4 w-px bg-border-standard"></div>
          </>
        )}
        <div className="font-bold text-text-primary flex items-center">
          <span className="text-brand mr-2">SimpleSOP</span>
          {currentSop && (
            <span className="text-text-tertiary font-normal text-sm">
              / {currentSop.sop_id}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 text-sm">
        {currentSop && (
          <div className="flex items-center text-text-tertiary">
            {isSaving ? (
              <span className="flex items-center">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </span>
            ) : isDirty ? (
              <span className="flex items-center text-status-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-status-amber mr-1.5"></span>
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center text-status-green">
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Saved {lastSavedAt && `at ${lastSavedAt}`}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
