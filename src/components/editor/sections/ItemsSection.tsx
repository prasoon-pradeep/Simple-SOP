import { useState, useEffect } from 'react';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Item } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Image as ImageIcon, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageUploadArea } from '@/components/shared/ImageUploadArea';
import { CrossSopSearch } from '@/components/editor/CrossSopSearch';

export function ItemsSection() {
  const { currentSop, items, setItems } = useSopStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentSop) {
      loadItems();
    }
  }, [currentSop]);

  useEffect(() => {
    loadImages();
  }, [items]);

  const loadItems = async () => {
    if (!currentSop) return;
    try {
      const data = await invoke<Item[]>('get_items', { sopId: currentSop.id });
      setItems(data);
    } catch (error) {
      console.error("Failed to load items", error);
    }
  };

  const loadImages = async () => {
    const urls: Record<string, string> = {};
    const baseDir = await appDataDir();
    
    for (const item of items) {
      if (item.image_uuid) {
        const filePath = await join(baseDir, 'images', item.image_uuid, 'annotated.png');
        urls[item.image_uuid] = convertFileSrc(filePath);
      }
    }
    setImageUrls(urls);
  };

  const handleAdd = () => {
    setEditingItem({
      id: crypto.randomUUID(),
      sop_id: currentSop?.id,
      name: '',
      part_no: '',
      description: '',
      unit: '',
      image_uuid: null
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem({ ...item });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await invoke('delete_item', { id });
        loadItems();
      } catch (error) {
        console.error("Failed to delete item", error);
      }
    }
  };

  const handleSave = async () => {
    if (!editingItem || !editingItem.name) return;
    try {
      await invoke('save_item', { payload: editingItem });
      setIsDialogOpen(false);
      loadItems();
    } catch (error) {
      console.error("Failed to save item", error);
    }
  };

  const handleImageSaved = (uuid: string) => {
    setEditingItem(prev => prev ? { ...prev, image_uuid: uuid } : null);
  };

  const handleCloneItem = async (itemId: string) => {
    if (!currentSop) return;
    try {
      await invoke('clone_item', { itemId, targetSopId: currentSop.id });
      loadItems();
      setIsSearchOpen(false);
    } catch (error) {
      console.error("Failed to clone item", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Parts & Materials</h3>
          <p className="text-sm text-text-tertiary">Manage all items required for this procedure.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" className="flex items-center" onClick={() => setIsSearchOpen(true)}>
             <Search className="w-4 h-4 mr-2" />
             Search other SOPs
          </Button>
          <Button onClick={handleAdd} size="sm" className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-text-tertiary italic">
                  No items added yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.image_uuid && imageUrls[item.image_uuid] ? (
                      <img 
                        src={imageUrls[item.image_uuid]} 
                        alt={item.name} 
                        className="w-[108px] h-[60.75px] object-cover rounded border border-border-subtle"
                      />
                    ) : (
                      <div className="w-[108px] h-[60.75px] bg-background border border-dashed border-border-standard rounded flex items-center justify-center text-text-quaternary">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{item.name}</TableCell>
                  <TableCell className="text-text-secondary font-mono text-[12px]">{item.part_no || '—'}</TableCell>
                  <TableCell className="text-text-secondary italic truncate max-w-[200px]" title={item.description || ''}>{item.description || '—'}</TableCell>
                  <TableCell className="text-text-secondary">{item.unit || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-status-red hover:text-status-red hover:bg-status-red-bg">
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
            <DialogTitle>{editingItem?.name ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input 
                id="name" 
                value={editingItem?.name || ''} 
                onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="col-span-3" 
                placeholder="e.g. M8 Bolt"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="part_no" className="text-right">Part #</Label>
              <Input 
                id="part_no" 
                value={editingItem?.part_no || ''} 
                onChange={e => setEditingItem(prev => prev ? { ...prev, part_no: e.target.value } : null)}
                className="col-span-3" 
                placeholder="e.g. PN-12345"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="desc" className="text-right">Description</Label>
              <Input 
                id="desc" 
                value={editingItem?.description || ''} 
                onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">Unit</Label>
              <Input 
                id="unit" 
                value={editingItem?.unit || ''} 
                onChange={e => setEditingItem(prev => prev ? { ...prev, unit: e.target.value } : null)}
                className="col-span-3" 
                placeholder="e.g. pcs, meters"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Image</Label>
              <div className="col-span-3 flex flex-col space-y-2">
                 <ImageUploadArea onImageSaved={handleImageSaved}>
                   {editingItem?.image_uuid && imageUrls[editingItem.image_uuid] ? (
                     <img 
                       src={imageUrls[editingItem.image_uuid]} 
                       alt="Preview" 
                       className="w-full h-full object-cover rounded"
                     />
                   ) : null}
                 </ImageUploadArea>
                 <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">Click or Paste to change image</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editingItem?.name}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrossSopSearch 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen} 
        type="item" 
        onClone={handleCloneItem}
      />
    </div>
  );
}
