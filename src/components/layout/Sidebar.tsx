import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSopStore } from '@/store';
import {
  Home as HomeIcon,
  Plus,
  Folder,
  Settings,
  Database,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname.includes('/edit');
  const isViewer = location.pathname.includes('/view');
  
  const {
    sops,
    selectedProject,
    setSelectedProject,
    setEditorOrigin
  } = useSopStore();

  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    invoke<boolean>('check_db_health')
      .then(ok => setDbHealthy(ok))
      .catch(() => setDbHealthy(false));
    getVersion().then(setAppVersion);
  }, []);

  // Extract unique projects from sops list
  const projects = Array.from(new Set(sops.map(s => s.project_tag).filter(Boolean))) as string[];

  const handleCreateSop = async () => {
    try {
      const id = await invoke<string>('create_sop', { title: 'Untitled SOP' });
      setEditorOrigin('home');
      navigate(`/sop/${id}/edit`);
    } catch (error) {
      console.error("Failed to create SOP", error);
    }
  };

  // If in Editor or Viewer, those pages handle their own sidebars for now to match current impl
  // but spec says sidebar switches instantly. 
  // Let's implement the HOME sidebar (Mode A) here.
  
  if (isEditor || isViewer) return null;

  return (
    <aside className="w-56 bg-surface border-r border-border-standard flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border-standard h-12 flex items-center">
         <div className="font-bold text-text-primary flex items-center">
            <span className="text-brand mr-2 font-black italic">SOP</span>
            <span className="text-xs tracking-tighter uppercase text-text-tertiary">Builder</span>
         </div>
      </div>

      <div className="p-4">
        <Button onClick={handleCreateSop} className="w-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center text-sm font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Create SOP
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
        {/* Main Nav */}
        <div className="space-y-1">
          <Link
            to="/"
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === '/' && !selectedProject
                ? "bg-brand-light text-brand"
                : "text-text-secondary hover:bg-hover"
            )}
            onClick={() => setSelectedProject(null)}
          >
            <HomeIcon className="w-4 h-4 mr-3" />
            All Documents
          </Link>
          <div className="flex items-center px-3 py-2 text-text-quaternary text-[11px] font-bold uppercase tracking-widest pt-4">
            Projects
          </div>
          <div className="space-y-0.5">
            {projects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-tertiary italic">No projects yet.</p>
            ) : (
              projects.map(project => (
                <button
                  key={project}
                  onClick={() => setSelectedProject(project)}
                  className={cn(
                    "w-full flex items-center px-3 py-1.5 rounded-md text-sm transition-colors text-left",
                    selectedProject === project
                      ? "bg-brand-light text-brand font-medium"
                      : "text-text-secondary hover:bg-hover hover:text-text-primary"
                  )}
                >
                  <Folder className={cn("w-3.5 h-3.5 mr-3", selectedProject === project ? "text-brand" : "text-text-tertiary")} />
                  <span className="truncate flex-1">{project}</span>
                  {selectedProject === project && <ChevronRight className="w-3 h-3 ml-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* Footer Nav */}
      <div className="p-3 border-t border-border-standard space-y-1 bg-panel/50">
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center px-3 py-2 rounded-md text-xs font-medium text-text-tertiary hover:bg-hover hover:text-text-primary transition-colors"
        >
          <Settings className="w-3.5 h-3.5 mr-3" />
          Settings
        </button>
        <div className="flex items-center px-3 py-2 justify-between">
          <div className="flex items-center text-[10px] text-text-quaternary font-bold uppercase tracking-tight">
            <Database className="w-3 h-3 mr-1.5" />
            SQLite Local
          </div>
          <div
            title={dbHealthy === null ? 'Checking…' : dbHealthy ? 'DB healthy' : 'DB error'}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              dbHealthy === null && "bg-text-quaternary",
              dbHealthy === true  && "bg-status-green shadow-[0_0_4px_rgba(30,126,74,0.5)]",
              dbHealthy === false && "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]"
            )}
          />
        </div>
        {appVersion && (
          <p className="pb-1 text-center text-[10px] text-text-quaternary font-mono uppercase tracking-tighter">
            v{appVersion}{!appVersion.includes('alpha') && '-alpha'}
          </p>
        )}
      </div>
    </aside>
  );
}
