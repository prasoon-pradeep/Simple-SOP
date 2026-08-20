import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft } from 'lucide-react';
import { useSopStore } from '@/store';
import { QuickStart } from '@/components/help/QuickStart';
import { DetailedGuide } from '@/components/help/DetailedGuide';

export default function Help() {
  const navigate = useNavigate();
  const { setEditorOrigin } = useSopStore();

  const handleCreateSop = async () => {
    try {
      const id = await invoke<string>('create_sop', { title: 'Untitled SOP' });
      setEditorOrigin('home');
      navigate(`/sop/${id}/edit`);
    } catch (error) {
      console.error('Failed to create SOP', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-12 bg-surface border-b border-border-standard flex items-center px-6 shrink-0 gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <span className="text-sm font-semibold text-text-primary">Help</span>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <QuickStart
          onCreateSop={handleCreateSop}
          onOpenFullGuide={() =>
            document.getElementById('help-detailed-guide')?.scrollIntoView({ behavior: 'smooth' })
          }
        />
        <DetailedGuide />
      </div>
    </div>
  );
}
