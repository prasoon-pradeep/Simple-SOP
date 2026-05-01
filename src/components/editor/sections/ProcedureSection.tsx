import { useState, useEffect } from 'react';
import { useSopStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import { StepFull } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, ListOrdered } from 'lucide-react';
import { StepCard } from './StepCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function ProcedureSection() {
  const { currentSop, stepsFull, setStepsFull } = useSopStore();
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (currentSop) {
      loadSteps();
    }
  }, [currentSop]);

  const loadSteps = async () => {
    if (!currentSop) return;
    setIsLoading(true);
    try {
      const data = await invoke<StepFull[]>('get_steps_full', { sopId: currentSop.id });
      setStepsFull(data);
    } catch (error) {
      console.error("Failed to load steps", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = async () => {
    if (!currentSop) return;
    const newStepId = crypto.randomUUID();
    const newStepNumber = stepsFull.length + 1;
    const newStep = {
      id: newStepId,
      sop_id: currentSop.id,
      step_number: newStepNumber,
      action: '',
      notes: '',
      expected_output: '',
      sort_order: newStepNumber
    };

    try {
      await invoke('save_step', { payload: newStep });
      await loadSteps();
    } catch (error) {
      console.error("Failed to add step", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stepsFull.findIndex((s) => s.step.id === active.id);
      const newIndex = stepsFull.findIndex((s) => s.step.id === over.id);

      const newStepsFull = arrayMove(stepsFull, oldIndex, newIndex);
      setStepsFull(newStepsFull);

      // Persist reorder
      const stepIds = newStepsFull.map(s => s.step.id);
      try {
        await invoke('reorder_steps', { sopId: currentSop?.id, stepIds });
        await loadSteps(); // Refresh to get normalized step numbers
      } catch (error) {
        console.error("Failed to persist reorder", error);
        loadSteps(); // revert on error
      }
    }
  };

  if (isLoading) return <div className="p-12 text-center text-text-tertiary">Loading procedure...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center">
            <ListOrdered className="w-5 h-5 mr-2 text-brand" />
            Execution Steps
          </h3>
          <p className="text-sm text-text-tertiary">Define the sequential workflow for this procedure.</p>
        </div>
        <Button onClick={handleAddStep} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stepsFull.map(s => s.step.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {stepsFull.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-border-standard rounded-lg flex flex-col items-center justify-center text-text-quaternary bg-surface/50">
                <Plus className="w-10 h-10 mb-2 opacity-20" />
                <p>Click "Add Step" to begin building your procedure.</p>
              </div>
            ) : (
              stepsFull.map((stepFull) => (
                <StepCard key={stepFull.step.id} stepFull={stepFull} onRefresh={loadSteps} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {stepsFull.length > 0 && (
        <div className="flex justify-center pt-4">
           <Button onClick={handleAddStep} variant="outline" className="w-full max-w-md border-dashed border-border-strong hover:bg-surface">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Step
           </Button>
        </div>
      )}
    </div>
  );
}
