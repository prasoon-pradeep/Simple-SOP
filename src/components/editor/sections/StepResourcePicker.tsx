import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Search, Plus, X } from 'lucide-react';
import { Tool, Item } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StepResourcePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tool' | 'item';
  library: (Tool | Item)[];
  selectedIds: (string | null)[];
  onAdd: (id: string | null, freeText?: string, quantity?: number, unit?: string) => Promise<void>;
}

export function StepResourcePicker({ open, onOpenChange, type, library, selectedIds, onAdd }: StepResourcePickerProps) {
  const [query, setQuery] = useState('');
  const [freeText, setFreeText] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('');

  const [selectedLibraryItem, setSelectedLibraryItem] = useState<Tool | Item | null>(null);
  const [libraryQty, setLibraryQty] = useState<string>('');
  const [noQtyModal, setNoQtyModal] = useState<{ open: boolean; onConfirm: () => void; itemName: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setFreeText('');
      setQuantity(1);
      setUnit('');
      setSelectedLibraryItem(null);
      setLibraryQty('');
      setNoQtyModal(null);
    }
  }, [open]);

  const filteredLibrary = library.filter(res => 
    res.name.toLowerCase().includes(query.toLowerCase())
  );

  const isQtyValid = (q: string | number) => {
    const num = typeof q === 'string' ? parseFloat(q) : q;
    return !isNaN(num) && num > 0;
  };

  const handleAddLibrary = async (res: Tool | Item) => {
    if (type === 'tool') {
      await onAdd(res.id);
      return;
    }

    // For items, show inline expansion first
    setSelectedLibraryItem(res);
    setLibraryQty('');
  };

  const confirmLibraryAdd = async () => {
    if (!selectedLibraryItem) return;
    
    if (isQtyValid(libraryQty)) {
      await onAdd(selectedLibraryItem.id, undefined, parseFloat(libraryQty), (selectedLibraryItem as Item).unit || '');
      setSelectedLibraryItem(null);
      setLibraryQty('');
    } else {
      setNoQtyModal({
        open: true,
        itemName: selectedLibraryItem.name,
        onConfirm: async () => {
          await onAdd(selectedLibraryItem.id, undefined, undefined, (selectedLibraryItem as Item).unit || '');
          setSelectedLibraryItem(null);
          setLibraryQty('');
          setNoQtyModal(null);
        }
      });
    }
  };

  const handleAddFreeText = async () => {
    if (!freeText.trim()) return;
    if (type === 'tool') {
      await onAdd(null, freeText);
      setFreeText('');
      return;
    }

    if (isQtyValid(quantity)) {
      await onAdd(null, freeText, quantity, unit);
      setFreeText('');
      setQuantity(1);
      setUnit('');
    } else {
      setNoQtyModal({
        open: true,
        itemName: `'${freeText}'`,
        onConfirm: async () => {
          await onAdd(null, freeText, undefined, unit);
          setFreeText('');
          setQuantity(1);
          setUnit('');
          setNoQtyModal(null);
        }
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add {type === 'tool' ? 'Tool' : 'Part'} to Step</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto no-scrollbar">
            {/* Library Search */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-text-tertiary">Select from SOP Library</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <Input 
                  placeholder="Search tools in this SOP..." 
                  className="pl-10" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="border border-border-standard rounded-md max-h-[280px] overflow-y-auto bg-panel/30">
                {filteredLibrary.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-tertiary italic">No matching items in library.</div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                     {filteredLibrary.map(res => {
                       const isSelected = selectedIds.includes(res.id);
                       const isExpanding = selectedLibraryItem?.id === res.id;

                       return (
                         <div key={res.id} className={cn(
                           "transition-all duration-200",
                           isExpanding ? "bg-brand-light/30 border-y border-brand/10" : "hover:bg-hover"
                         )}>
                            <div className="flex items-center justify-between p-3">
                               <div className="flex flex-col">
                                  <span className="text-sm font-medium">{res.name}</span>
                                  <span className="text-[10px] text-text-tertiary">
                                     {type === 'tool' ? (res as Tool).type : (res as Item).part_no}
                                  </span>
                               </div>
                               {isSelected ? (
                                 <Badge variant="secondary" className="bg-status-green-bg text-status-green border-none">
                                    <Check className="w-3 h-3 mr-1" /> Linked
                                 </Badge>
                               ) : !isExpanding ? (
                                 <Button size="sm" variant="ghost" className="h-8 text-xs text-brand" onClick={() => handleAddLibrary(res)}>
                                    Link
                                 </Button>
                               ) : (
                                 <div className="flex space-x-1">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLibraryItem(null)}>
                                       <X className="w-3.5 h-3.5" />
                                    </Button>
                                 </div>
                               )}
                            </div>

                            {isExpanding && type === 'item' && (
                               <div className="px-3 pb-3 pt-0 flex items-end space-x-2">
                                  <div className="flex-1 space-y-1">
                                     <Label className="text-[10px] text-text-tertiary uppercase font-bold">Unit</Label>
                                     <Input 
                                       value={(res as Item).unit || '—'} 
                                       readOnly 
                                       disabled 
                                       className="h-8 text-xs bg-secondary/50 cursor-not-allowed border-dashed" 
                                     />
                                  </div>
                                  <div className="w-20 space-y-1">
                                     <Label className="text-[10px] text-text-tertiary uppercase font-bold">Qty</Label>
                                     <Input 
                                       type="number" 
                                       placeholder="Qty"
                                       min="0"
                                       value={libraryQty} 
                                       onChange={e => setLibraryQty(e.target.value)} 
                                       className="h-8 text-xs"
                                       autoFocus
                                     />
                                  </div>
                                  <Button size="sm" className="h-8 px-4 bg-brand hover:bg-brand-hover text-white text-xs font-bold" onClick={confirmLibraryAdd}>
                                     Link
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedLibraryItem(null)}>
                                     Cancel
                                  </Button>
                               </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border-standard"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-text-quaternary uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-border-standard"></div>
            </div>

            {/* Free Text Fallback */}
            <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border-standard shrink-0">
              <Label className="text-xs font-bold uppercase text-text-tertiary">Add as Free Text</Label>
              <div className="flex gap-2">
                 <Input 
                   placeholder={type === 'tool' ? "Tool name (e.g. Special Jig)" : "Item name (e.g. Zip Tie)"}
                   value={freeText}
                   onChange={e => setFreeText(e.target.value)}
                 />
                 <Button size="sm" onClick={handleAddFreeText} disabled={!freeText.trim()} className="bg-brand text-white hover:bg-brand-hover">
                    <Plus className="w-4 h-4 mr-1" /> Add
                 </Button>
              </div>
              
              {type === 'item' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                   <div className="space-y-1">
                      <Label className="text-[10px]">Quantity</Label>
                      <Input type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} className="h-8" min="0" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[10px]">Unit</Label>
                      <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs, ml..." className="h-8" />
                   </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-auto pt-2 border-t border-border-subtle">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Finished</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Qty Confirmation Modal */}
      <Dialog open={!!noQtyModal} onOpenChange={(open) => !open && setNoQtyModal(null)}>
         <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
               <DialogTitle>No Quantity Entered</DialogTitle>
               <DialogDescription className="pt-2">
                  You haven't specified a quantity for {noQtyModal?.itemName}. Add it anyway?
               </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end mt-4">
               <Button variant="outline" onClick={() => setNoQtyModal(null)}>Go Back</Button>
               <Button onClick={() => noQtyModal?.onConfirm()}>Add Anyway</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </>
  );
}
