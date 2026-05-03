import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { SOP } from '@/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Upload, 
  FileText, 
  FilterX, 
  Pencil,
  Eye,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { DeleteSopModal } from '@/components/shared/DeleteSopModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface ImportPreview {
  temp_dir: string;
  sop_id: string;
  sop_uuid: string;
  title: string;
  exists: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const { 
    sops, 
    setSops, 
    searchTerm, 
    setSearchTerm, 
    selectedProject, 
    setSelectedProject,
    setCurrentSop,
    setEditorOrigin
  } = useSopStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sopToDelete, setSopToDelete] = useState<SOP | null>(null);

  // Import states
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadSops();
    // Reset active SOP state when on Home
    setCurrentSop(null);
  }, []);

  const loadSops = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<SOP[]>('get_sops');
      setSops(data);
    } catch (error) {
      console.error("Failed to load SOPs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSop = async () => {
    try {
      const id = await invoke<string>('create_sop', { title: 'Untitled SOP' });
      setEditorOrigin('home');
      navigate(`/sop/${id}/edit`);
    } catch (error) {
      console.error("Failed to create SOP", error);
    }
  };

  const handleImportSop = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'SOP File', extensions: ['sop'] }]
      });

      if (selected && typeof selected === 'string') {
        setIsImporting(true);
        const preview = await invoke<ImportPreview>('import_sop_preview', { filePath: selected });
        setImportPreview(preview);
        setIsImporting(false);
      }
    } catch (error) {
      console.error("Failed to import SOP", error);
      setIsImporting(false);
      alert("Error opening SOP file: " + error);
    }
  };

  const finalizeImport = async (mode: 'replace' | 'new') => {
    if (!importPreview) return;
    try {
      setIsImporting(true);
      const finalSopUuid = await invoke<string>('finalize_import', { 
        tempDir: importPreview.temp_dir, 
        mode 
      });
      setImportPreview(null);
      setIsImporting(false);
      
      // Navigate to the viewer of the newly imported SOP
      navigate(`/sop/${finalSopUuid}/view`);
    } catch (error) {
      console.error("Failed to finalize import", error);
      setIsImporting(false);
      alert("Error importing SOP: " + error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sop: SOP) => {
    e.stopPropagation();
    setSopToDelete(sop);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sopToDelete) return;
    try {
      await invoke('soft_delete_sop', { id: sopToDelete.id });
      await loadSops();
    } catch (error) {
      console.error("Failed to delete SOP", error);
    }
  };

  const filteredSops = useMemo(() => {
    return sops.filter(sop => {
      const matchesSearch = !searchTerm || 
        sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sop.sop_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sop.project_tag?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = !selectedProject || sop.project_tag === selectedProject;
      
      return matchesSearch && matchesProject;
    });
  }, [sops, searchTerm, selectedProject]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Approved': return 'bg-status-green-bg text-status-green border-none';
      case 'Rejected': return 'bg-status-red-bg text-status-red border-none';
      case 'Under Review': return 'bg-status-amber-bg text-status-amber border-none';
      default: return 'bg-secondary text-text-tertiary border-none';
    }
  };

  const handleRowClick = (sop: SOP) => {
    navigate(`/sop/${sop.id}/view`);
  };

  const handleEditClick = (e: React.MouseEvent, sop: SOP) => {
    e.stopPropagation();
    setEditorOrigin('home');
    navigate(`/sop/${sop.id}/edit`);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full bg-panel overflow-hidden">
        {/* Home Header */}
        <header className="h-12 bg-surface border-b border-border-standard flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold text-text-primary uppercase tracking-tight">SOP Library</h1>
            {selectedProject && (
              <>
                <span className="text-text-quaternary">/</span>
                <Badge variant="outline" className="bg-brand-light text-brand border-brand/20 py-0 px-2 h-5 flex items-center font-bold text-[10px]">
                  {selectedProject}
                  <button onClick={() => setSelectedProject(null)} className="ml-1.5 hover:text-brand-hover">
                     <FilterX className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
             <Button 
               variant="outline" 
               size="sm" 
               className="h-8 text-xs font-bold border-border-strong"
               onClick={handleImportSop}
               disabled={isImporting}
             >
                <Upload className="w-3.5 h-3.5 mr-2" />
                {isImporting ? 'Importing...' : 'Import .sop'}
             </Button>
             <Button onClick={handleCreateSop} size="sm" className="h-8 text-xs font-bold bg-brand hover:bg-brand-hover text-white">
                <Plus className="w-3.5 h-3.5 mr-2" />
                Create SOP
             </Button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="p-6 pb-0">
           <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input 
                placeholder="Search by ID, Title, or Project..." 
                className="pl-10 h-10 bg-surface border-border-standard shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
           <div className="bg-surface border border-border-standard rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-secondary/50 border-b border-border-standard">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px] font-bold text-[11px] uppercase tracking-wider text-text-tertiary">SOP ID</TableHead>
                    <TableHead className="w-[140px] font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Project</TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Document Title</TableHead>
                    <TableHead className="w-[120px] font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Released</TableHead>
                    <TableHead className="w-[100px] font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Status</TableHead>
                    <TableHead className="w-[60px] text-center font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Ver</TableHead>
                    <TableHead className="w-[80px] text-right font-bold text-[11px] uppercase tracking-wider text-text-tertiary">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-text-tertiary">
                         Loading documents...
                      </TableCell>
                    </TableRow>
                  ) : filteredSops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center flex flex-col items-center justify-center space-y-2">
                         <div className="w-12 h-12 bg-panel rounded-full flex items-center justify-center mb-2">
                            <FileText className="w-6 h-6 text-text-quaternary opacity-30" />
                         </div>
                         <p className="text-text-secondary font-medium">No documents found.</p>
                         <p className="text-text-tertiary text-xs">Try adjusting your search or filter.</p>
                         {(searchTerm || selectedProject) && (
                           <Button 
                             variant="link" 
                             className="text-brand text-xs font-bold mt-2"
                             onClick={() => { setSearchTerm(''); setSelectedProject(null); }}
                           >
                              Clear all filters
                           </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSops.map((sop) => (
                      <TableRow 
                        key={sop.id} 
                        className="cursor-pointer hover:bg-hover/30 transition-colors group"
                        onClick={() => handleRowClick(sop)}
                      >
                        <TableCell className="font-mono text-[12px] font-bold text-text-secondary">
                          {sop.sop_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-[10px] py-0 px-2 h-5 border-border-standard bg-panel text-text-secondary">
                            {sop.project_tag || 'Unassigned'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-text-primary">
                          {sop.title}
                        </TableCell>
                        <TableCell className="text-text-tertiary text-xs">
                          {sop.active_date || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] py-0 px-2 h-5 flex items-center font-bold whitespace-nowrap", getStatusColor(sop.approval_status))}>
                            {sop.approval_status || 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-[11px] text-text-tertiary font-bold">
                          V{sop.version}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                           <div className="flex justify-end items-center space-x-1 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-tertiary hover:text-brand" onClick={(e) => handleEditClick(e, sop)} title="Edit SOP">
                                 <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-tertiary hover:text-text-primary" onClick={() => handleRowClick(sop)} title="View SOP">
                                 <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-tertiary hover:text-status-red" onClick={(e) => handleDeleteClick(e, sop)} title="Delete SOP">
                                 <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
           </div>
           
           <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-text-tertiary font-medium uppercase tracking-wider">
              <div>Showing {filteredSops.length} of {sops.length} documents</div>
              <div className="flex items-center space-x-1">
                 <span>Vault:</span>
                 <span className="text-text-secondary font-bold font-mono">SQLite Local</span>
              </div>
           </div>
        </div>
      </main>

      <DeleteSopModal 
        open={isDeleteModalOpen} 
        onOpenChange={setIsDeleteModalOpen}
        sopIdDisplay={sopToDelete?.sop_id || ''}
        onConfirm={handleConfirmDelete}
      />

      {/* Import Conflict Dialog */}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Importing SOP</DialogTitle>
            <DialogDescription className="pt-2 text-text-secondary">
              The SOP <span className="font-bold text-text-primary">"{importPreview?.title}"</span> ({importPreview?.sop_id}) is ready for import.
            </DialogDescription>
          </DialogHeader>
          
          {importPreview?.exists ? (
            <div className="py-4 space-y-3">
              <div className="p-3 bg-status-amber-bg border border-status-amber/20 rounded-md text-sm text-status-amber flex items-start">
                <ShieldAlert className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <p>An SOP with this unique ID already exists in your library. How would you like to proceed?</p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3 px-4 border-border-strong" onClick={() => finalizeImport('replace')}>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-text-primary">Replace Existing</span>
                    <span className="text-[11px] text-text-tertiary">Overwrites the current document with this version.</span>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3 px-4 border-border-strong" onClick={() => finalizeImport('new')}>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-text-primary">Import as New Copy</span>
                    <span className="text-[11px] text-text-tertiary">Assigns a new ID and UUID. Original remains untouched.</span>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-brand-light rounded-full flex items-center justify-center text-brand">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-center text-sm text-text-secondary px-4">This document is new to your library and will be added as a fresh entry.</p>
              <Button onClick={() => finalizeImport('new')} className="w-full bg-brand hover:bg-brand-hover">
                Confirm Import
              </Button>
            </div>
          )}
          
          <DialogFooter className="sm:justify-start">
            <Button variant="ghost" className="text-text-tertiary" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
