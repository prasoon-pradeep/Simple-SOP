import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Search, Plus } from 'lucide-react';
import { Tool, Item } from '@/types';
import { Badge } from '@/components/ui/badge';

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

  const filteredLibrary = library.filter(res => 
    res.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAddLibrary = async (res: Tool | Item) => {
    if (type === 'item') {
      await onAdd(res.id, undefined, quantity, unit || (res as Item).unit || '');
    } else {
      await onAdd(res.id);
    }
    // Don't close, allow multi-pick? 
    // Spec implies multi-select, but easier to just Pick one by one.
  };

  const handleAddFreeText = async () => {
    if (!freeText.trim()) return;
    if (type === 'item') {
      await onAdd(null, freeText, quantity, unit);
    } else {
      await onAdd(null, freeText);
    }
    setFreeText('');
    setQuantity(1);
    setUnit('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add {type === 'tool' ? 'Tool' : 'Part'} to Step</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
            <div className="border border-border-standard rounded-md max-h-[200px] overflow-y-auto bg-panel/30">
              {filteredLibrary.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-tertiary italic">No matching items in library.</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                   {filteredLibrary.map(res => {
                     const isSelected = selectedIds.includes(res.id);
                     return (
                       <div key={res.id} className="flex items-center justify-between p-3 hover:bg-hover transition-colors">
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
                          ) : (
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-brand" onClick={() => handleAddLibrary(res)}>
                               Link
                            </Button>
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
          <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border-standard">
            <Label className="text-xs font-bold uppercase text-text-tertiary">Add as Free Text</Label>
            <div className="flex gap-2">
               <Input 
                 placeholder={type === 'tool' ? "Tool name (e.g. Special Jig)" : "Item name (e.g. Zip Tie)"}
                 value={freeText}
                 onChange={e => setFreeText(e.target.value)}
               />
               <Button size="sm" onClick={handleAddFreeText} disabled={!freeText.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Add
               </Button>
            </div>
            
            {type === 'item' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                 <div className="space-y-1">
                    <Label className="text-[10px]">Quantity</Label>
                    <Input type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} className="h-8" />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px]">Unit</Label>
                    <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs, ml..." className="h-8" />
                 </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Finished</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
