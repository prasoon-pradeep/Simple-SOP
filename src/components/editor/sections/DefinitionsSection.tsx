import { useEffect } from 'react';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { Definition } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, BookOpen } from 'lucide-react';

export function DefinitionsSection() {
  const { currentSop, definitions, setDefinitions, updateDefinitionField, setSaving, setDirty, setLastSavedAt } = useSopStore();

  useEffect(() => {
    if (currentSop) {
      loadDefinitions();
    }
  }, [currentSop]);

  const loadDefinitions = async () => {
    if (!currentSop) return;
    try {
      const data = await invoke<Definition[]>('get_definitions', { sopId: currentSop.id });
      setDefinitions(data);
    } catch (error) {
      console.error("Failed to load definitions", error);
    }
  };

  const handleAdd = async () => {
    if (!currentSop) return;
    const newDef: Definition = {
      id: crypto.randomUUID(),
      sop_id: currentSop.id,
      term: '',
      meaning: '',
      sort_order: definitions.length + 1
    };

    setSaving(true);
    try {
      await invoke('save_definition', { payload: newDef });
      setDirty(false);
      setSaving(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      loadDefinitions();
    } catch (error) {
      console.error("Failed to add definition", error);
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this definition?")) {
      setSaving(true);
      try {
        await invoke('delete_definition', { id });
        setDirty(false);
        setSaving(false);
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        loadDefinitions();
      } catch (error) {
        console.error("Failed to delete definition", error);
        setSaving(false);
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-brand" />
            Glossary & Definitions
          </h3>
          <p className="text-sm text-text-tertiary">Define specialized terms or acronyms used in this document.</p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Term
        </Button>
      </div>

      <div className="bg-surface border border-border-standard rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-[200px]">Term / Acronym</TableHead>
              <TableHead>Meaning / Description</TableHead>
              <TableHead className="w-[60px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-text-tertiary italic">
                  No definitions added yet.
                </TableCell>
              </TableRow>
            ) : (
              definitions.map((def) => (
                <TableRow key={def.id} className="group">
                  <TableCell className="align-top pt-4">
                    <Input 
                      value={def.term}
                      onChange={(e) => updateDefinitionField(def.id, 'term', e.target.value)}
                      placeholder="e.g. PPE"
                      className="font-bold border-none focus-visible:ring-0 px-0 h-auto bg-transparent shadow-none"
                    />
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <Textarea 
                      value={def.meaning}
                      onChange={(e) => updateDefinitionField(def.id, 'meaning', e.target.value)}
                      placeholder="Personal Protective Equipment..."
                      className="min-h-[40px] border-none focus-visible:ring-0 px-0 h-auto bg-transparent shadow-none resize-none overflow-hidden"
                    />
                  </TableCell>
                  <TableCell className="text-right align-top pt-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(def.id)}
                      className="text-text-quaternary hover:text-status-red hover:bg-status-red-bg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {definitions.length > 0 && (
        <div className="flex justify-center pt-4">
           <Button onClick={handleAdd} variant="outline" className="w-full max-w-xs border-dashed border-border-strong hover:bg-surface">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Term
           </Button>
        </div>
      )}
    </div>
  );
}
