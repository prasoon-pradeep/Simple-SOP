import { useState, useEffect } from 'react';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Tool } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { SparkleButton } from '@/components/shared/SparkleButton';
import { AIPreviewPanel } from '@/components/shared/AIPreviewPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageUploadArea } from '@/components/shared/ImageUploadArea';
import { CrossSopSearch } from '@/components/editor/CrossSopSearch';
import { ImageFrame } from '@/components/shared/ImageFrame';
import { DatePicker } from '@/components/shared/DatePicker';

export function ToolsSection() {
  const { currentSop, tools, setTools, setDirty, setSaving, setLastSavedAt } = useSopStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Partial<Tool> | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{ original: string; enhanced: string } | null>(null);
  const [aiProvider, setAiProvider] = useState('anthropic');

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' })
      .then(p => { if (p) setAiProvider(p); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentSop) {
      loadTools();
    }
  }, [currentSop]);

  useEffect(() => {
    if (!isDialogOpen) {
      setPreviewDataUrl(null);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    loadImages();
  }, [tools]);

  const loadTools = async () => {
    if (!currentSop) return;
    try {
      const data = await invoke<Tool[]>('get_tools', { sopId: currentSop.id });
      setTools(data);
    } catch (error) {
      console.error("Failed to load tools", error);
    }
  };

  const loadImages = async () => {
    const urls: Record<string, string> = {};
    const baseDir = await appDataDir();
    
    for (const tool of tools) {
      if (tool.image_uuid) {
        const filePath = await join(baseDir, 'images', tool.image_uuid, 'annotated.png');
        urls[tool.image_uuid] = convertFileSrc(filePath);
      }
    }
    setImageUrls(urls);
  };

  const handleAdd = () => {
    setEditingTool({
      id: crypto.randomUUID(),
      sop_id: currentSop?.id,
      name: '',
      type: '',
      model_part_no: '',
      specification: '',
      calibration_required: false,
      calibration_due_date: null,
      image_uuid: null
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool({ ...tool });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this tool?")) {
      setSaving(true);
      try {
        await invoke('delete_tool', { id });
        setDirty(false);
        setSaving(false);
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        loadTools();
      } catch (error) {
        console.error("Failed to delete tool", error);
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!editingTool || !editingTool.name) return;
    setSaving(true);
    try {
      await invoke('save_tool', { payload: editingTool });
      setDirty(false);
      setSaving(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsDialogOpen(false);
      loadTools();
    } catch (error) {
      console.error("Failed to save tool", error);
      setSaving(false);
    }
  };

  const handleImageSaved = async (uuid: string, base64: string) => {
    setEditingTool(prev => prev ? { ...prev, image_uuid: uuid } : null);
    setPreviewDataUrl(base64);
    
    // Background resolve for imageUrls (so it's ready for the main table later)
    try {
      const baseDir = await appDataDir();
      const filePath = await join(baseDir, 'images', uuid, 'annotated.png');
      const resolvedUrl = convertFileSrc(filePath);
      setImageUrls(prev => ({ ...prev, [uuid]: resolvedUrl }));
    } catch (error) {
      console.error("Failed to resolve preview URL", error);
    }
  };

  const handleCloneTool = async (toolId: string) => {
    if (!currentSop) return;
    setSaving(true);
    try {
      await invoke('clone_tool', { toolId, targetSopId: currentSop.id });
      setDirty(false);
      setSaving(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      loadTools();
      setIsSearchOpen(false);
    } catch (error) {
      console.error("Failed to clone tool", error);
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Tools, Equipment & Consumables</h3>
          <p className="text-sm text-text-tertiary">Manage all tools, equipment and consumables required for this procedure.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" className="flex items-center" onClick={() => setIsSearchOpen(true)}>
             <Search className="w-4 h-4 mr-2" />
             Search other SOPs
          </Button>
          <Button onClick={handleAdd} size="sm" className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Tool
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Tool Name</TableHead>
              <TableHead>Type / Model</TableHead>
              <TableHead>Specification</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-text-tertiary italic">
                  No tools added yet.
                </TableCell>
              </TableRow>
            ) : (
              tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <ImageFrame 
                      src={tool.image_uuid ? imageUrls[tool.image_uuid] : null} 
                      alt={tool.name} 
                      className="w-[108px]"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{tool.name}</TableCell>
                  <TableCell className="text-text-secondary">
                    {tool.type} {tool.model_part_no ? `/ ${tool.model_part_no}` : ''}
                  </TableCell>
                  <TableCell className="text-text-secondary italic">{tool.specification || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(tool)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tool.id)} className="text-status-red hover:text-status-red hover:bg-status-red-bg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTool?.name ? 'Edit Tool' : 'Add New Tool'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input 
                id="name" 
                value={editingTool?.name || ''} 
                onChange={e => setEditingTool(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="col-span-3" 
                placeholder="e.g. Torque Wrench"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <div className="col-span-3">
                <Select 
                  value={editingTool?.type || ''} 
                  onValueChange={val => setEditingTool(prev => prev ? { ...prev, type: val } : null)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Physical">Physical</SelectItem>
                    <SelectItem value="Digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">Model #</Label>
              <Input 
                id="model" 
                value={editingTool?.model_part_no || ''} 
                onChange={e => setEditingTool(prev => prev ? { ...prev, model_part_no: e.target.value } : null)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="spec" className="text-right">Spec</Label>
              <div className="col-span-3 flex items-center gap-1">
                <Input
                  id="spec"
                  value={editingTool?.specification || ''}
                  onChange={e => setEditingTool(prev => prev ? { ...prev, specification: e.target.value } : null)}
                  className="flex-1"
                  placeholder="e.g. 10-50 Nm"
                />
                {editingTool?.id && currentSop && (
                  <SparkleButton
                    value={editingTool.specification || ''}
                    fieldName="specification"
                    entityType="tool"
                    entityId={editingTool.id}
                    sopId={currentSop.id}
                    sopTitle={currentSop.title}
                    department={currentSop.department ?? undefined}
                    onPreview={enhanced => setAiPreview({ original: editingTool.specification || '', enhanced })}
                  />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cal-req" className="text-right">Calibration</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch 
                  id="cal-req" 
                  checked={!!editingTool?.calibration_required} 
                  onCheckedChange={checked => setEditingTool(prev => prev ? { ...prev, calibration_required: checked } : null)}
                />
                <span className="text-xs text-text-tertiary">Requires Calibration</span>
              </div>
            </div>

            {editingTool?.calibration_required && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cal-date" className="text-right">Due Date</Label>
                <div className="col-span-3">
                  <DatePicker 
                    value={editingTool?.calibration_due_date || ''} 
                    onChange={val => setEditingTool(prev => prev ? { ...prev, calibration_due_date: val } : null)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Image</Label>
              <div className="col-span-3 flex flex-col space-y-2">
                 <ImageUploadArea onImageSaved={handleImageSaved}>
                   <ImageFrame 
                     src={previewDataUrl || (editingTool?.image_uuid ? imageUrls[editingTool.image_uuid] : null)} 
                     alt="Preview" 
                     className="w-full"
                   />
                 </ImageUploadArea>
                 <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">Click or Paste to change image</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editingTool?.name}>Save Tool</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrossSopSearch
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        type="tool"
        onClone={handleCloneTool}
      />

      {aiPreview && editingTool?.id && currentSop && (
        <AIPreviewPanel
          open
          originalText={aiPreview.original}
          enhancedText={aiPreview.enhanced}
          fieldName="specification"
          entityType="tool"
          entityId={editingTool.id}
          sopId={currentSop.id}
          provider={aiProvider}
          onAccept={(text) => {
            setEditingTool(prev => prev ? { ...prev, specification: text } : null);
            setAiPreview(null);
          }}
          onReject={() => setAiPreview(null)}
        />
      )}
    </div>
  );
}
