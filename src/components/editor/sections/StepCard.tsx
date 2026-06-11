import { useState, useEffect, useRef, useCallback } from 'react';
import { useSopStore } from '@/store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { SparkleButton } from '@/components/shared/SparkleButton';
import { AIPreviewPanel } from '@/components/shared/AIPreviewPanel';
import { appDataDir, join } from '@tauri-apps/api/path';
import { StepFull, StepImage } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { GripVertical, Copy, Trash2, ImageIcon, Wrench, Package, Info, Target, Plus, X, ZoomIn } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadArea } from '@/components/shared/ImageUploadArea';
import { StepResourcePicker } from './StepResourcePicker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageFrame } from '@/components/shared/ImageFrame';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ── Sortable image tile ───────────────────────────────────────────────────────

interface SortableImageItemProps {
  img: StepImage;
  src: string | null;
  onDelete: (id: string) => void;
  onLightbox: (src: string) => void;
}

function SortableImageItem({ img, src, onDelete, onLightbox }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      <ImageFrame src={src} alt="Step visual" className="w-full" />

      {/* Drag handle — top left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Actions — top right */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => src && onLightbox(src)}
          className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
          title="View Fullscreen"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(img.id)}
          className="p-1 bg-black/50 text-white rounded hover:bg-status-red"
          title="Delete Image"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Auto-resize hook ─────────────────────────────────────────────────────────

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return ref;
}

// ── StepCard ──────────────────────────────────────────────────────────────────

interface StepCardProps {
  stepFull: StepFull;
  onRefresh: () => void;
}

export function StepCard({ stepFull, onRefresh }: StepCardProps) {
  const {
    updateStepField,
    tools: libraryTools,
    items: libraryItems,
    setSaving,
    setDirty,
    setLastSavedAt,
    setHasUnsavedRevision,
  } = useSopStore();

  const { step, images, tools, items } = stepFull;
  const { currentSop, stepsFull } = useSopStore();

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [pickerType, setPickerType] = useState<'tool' | 'item' | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{ field: string; original: string; enhanced: string } | null>(null);
  const [aiProvider, setAiProvider] = useState('anthropic');

  const actionRef = useAutoResize(step.action || '');
  const notesRef = useAutoResize(step.notes || '');
  const outputRef = useAutoResize(step.expected_output || '');

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' })
      .then(p => { if (p) setAiProvider(p); })
      .catch(() => {});
  }, []);

  // Step-level sortable (outer DndContext in ProcedureSection)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Sensors for the inner image drag context
  const imageSensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    loadImages();
  }, [images]);

  const loadImages = async () => {
    const urls: Record<string, string> = {};
    const baseDir = await appDataDir();
    for (const img of images) {
      const filePath = await join(baseDir, 'images', img.image_uuid, 'annotated.png');
      urls[img.image_uuid] = convertFileSrc(filePath);
    }
    setImageUrls(urls);
  };

  const markSaved = () => {
    setDirty(false);
    setHasUnsavedRevision(true);
    setSaving(false);
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // ── Image handlers ──────────────────────────────────────────────────────────

  const handleAddImage = async (uuid: string, _base64: string) => {
    setSaving(true);
    try {
      await invoke('save_step_image', {
        payload: {
          id: crypto.randomUUID(),
          step_id: step.id,
          image_uuid: uuid,
          sort_order: images.length + 1,
        },
      });
      markSaved();
      onRefresh();
    } catch (error) {
      console.error("Failed to link image to step", error);
      setSaving(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    setSaving(true);
    try {
      await invoke('delete_step_image', { id });
      markSaved();
      onRefresh();
    } catch (error) {
      console.error("Failed to remove image from step", error);
      setSaving(false);
    }
  };

  const handleImageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(i => i.id === active.id);
    const newIndex = images.findIndex(i => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);

    setSaving(true);
    try {
      await Promise.all(
        reordered.map((img, index) =>
          invoke('save_step_image', { payload: { ...img, sort_order: index + 1 } })
        )
      );
      markSaved();
      onRefresh();
    } catch (error) {
      console.error("Failed to reorder images", error);
      setSaving(false);
    }
  };

  // ── Step handlers ───────────────────────────────────────────────────────────

  const handleDuplicate = async () => {
    setSaving(true);
    try {
      await invoke('duplicate_step', { stepId: step.id });
      markSaved();
      onRefresh();
    } catch (error) {
      console.error("Failed to duplicate step", error);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete Step ${step.step_number}?`)) {
      setSaving(true);
      try {
        await invoke('delete_step', { id: step.id });
        markSaved();
        onRefresh();
      } catch (error) {
        console.error("Failed to delete step", error);
        setSaving(false);
      }
    }
  };

  // ── Resource handlers ───────────────────────────────────────────────────────

  const handleAddResource = async (id: string | null, freeText?: string, quantity?: number, unit?: string) => {
    setSaving(true);
    try {
      const isTool = pickerType === 'tool';
      const command = isTool ? 'save_step_tool' : 'save_step_item';
      const payload: any = {
        id: crypto.randomUUID(),
        step_id: step.id,
        free_text: freeText || null,
      };

      if (isTool) {
        payload.tool_id = id;
      } else {
        payload.item_id = id;
        payload.quantity = quantity || null;
        payload.unit = unit || null;
      }

      await invoke(command, { payload });
      markSaved();
      onRefresh();
    } catch (error) {
      console.error(`Failed to link ${pickerType} to step`, error);
      setSaving(false);
    }
  };

  const handleDeleteResource = async (type: 'tool' | 'item', id: string) => {
    setSaving(true);
    try {
      const command = type === 'tool' ? 'delete_step_tool' : 'delete_step_item';
      await invoke(command, { id });
      markSaved();
      onRefresh();
    } catch (error) {
      console.error(`Failed to remove ${type} from step`, error);
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={setNodeRef}
      data-step-id={step.id}
      style={style}
      className={cn(
        "bg-surface border border-border-standard rounded-lg shadow-sm flex flex-col overflow-hidden transition-shadow",
        isDragging ? "shadow-xl z-50 ring-2 ring-brand" : "hover:border-border-strong"
      )}
    >
      {/* Step Header */}
      <div className="h-10 bg-secondary border-b border-border-standard flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-hover rounded text-text-tertiary">
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-brand bg-brand-light px-2 py-0.5 rounded text-xs">
            STEP {step.step_number}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} title="Duplicate Step">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-status-red hover:text-status-red hover:bg-status-red-bg" onClick={handleDelete} title="Delete Step">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[200px]">
        {/* Left Column: Text Content */}
        <div className="flex-1 p-4 space-y-4 border-r border-border-subtle">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <div className="flex items-center">
                <Target className="w-3.5 h-3.5 mr-1.5" />
                <Label htmlFor={`action-${step.id}`} className="text-xs font-bold uppercase tracking-tight">Action / Instruction</Label>
              </div>
              <SparkleButton
                value={step.action || ''}
                fieldName="action"
                entityType="step"
                entityId={step.id}
                sopId={step.sop_id}
                sopTitle={currentSop?.title}
                department={currentSop?.department ?? undefined}
                stepNumber={step.step_number}
                totalSteps={stepsFull.length}
                prevStepAction={stepsFull.find(s => s.step.step_number === step.step_number - 1)?.step.action ?? undefined}
                onPreview={enhanced => setAiPreview({ field: 'action', original: step.action || '', enhanced })}
              />
            </div>
            <Textarea
              ref={actionRef}
              id={`action-${step.id}`}
              value={step.action || ''}
              onChange={(e) => updateStepField(step.id, 'action', e.target.value)}
              placeholder="What needs to be done?"
              className="min-h-[103px] text-[13.5px] border-none focus-visible:ring-0 resize-none placeholder:italic overflow-hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <div className="flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1.5" />
                  <Label htmlFor={`notes-${step.id}`} className="text-[10px] font-bold uppercase text-text-tertiary">Notes & Warnings</Label>
                </div>
                <SparkleButton
                  value={step.notes || ''}
                  fieldName="notes"
                  entityType="step"
                  entityId={step.id}
                  sopId={step.sop_id}
                  sopTitle={currentSop?.title}
                  department={currentSop?.department ?? undefined}
                  stepNumber={step.step_number}
                  totalSteps={stepsFull.length}
                  onPreview={enhanced => setAiPreview({ field: 'notes', original: step.notes || '', enhanced })}
                />
              </div>
              <Textarea
                ref={notesRef}
                id={`notes-${step.id}`}
                value={step.notes || ''}
                onChange={(e) => updateStepField(step.id, 'notes', e.target.value)}
                placeholder="Safety notes, tips..."
                className="min-h-[60px] text-xs border-none focus-visible:ring-0 resize-none bg-transparent overflow-hidden"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <div className="flex items-center">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                  <Label htmlFor={`output-${step.id}`} className="text-[10px] font-bold uppercase text-text-tertiary">Expected Output</Label>
                </div>
                <SparkleButton
                  value={step.expected_output || ''}
                  fieldName="expected_output"
                  entityType="step"
                  entityId={step.id}
                  sopId={step.sop_id}
                  sopTitle={currentSop?.title}
                  department={currentSop?.department ?? undefined}
                  stepNumber={step.step_number}
                  totalSteps={stepsFull.length}
                  onPreview={enhanced => setAiPreview({ field: 'expected_output', original: step.expected_output || '', enhanced })}
                />
              </div>
              <Textarea
                ref={outputRef}
                id={`output-${step.id}`}
                value={step.expected_output || ''}
                onChange={(e) => updateStepField(step.id, 'expected_output', e.target.value)}
                placeholder="Result of this step..."
                className="min-h-[60px] text-xs border-none focus-visible:ring-0 resize-none bg-transparent overflow-hidden"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Visuals & Attachments */}
        <div className="w-full md:w-[364px] bg-panel/30 p-4 space-y-4">
          {/* Images */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-text-tertiary tracking-wider">Visual Aids</Label>
            <DndContext
              sensors={imageSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleImageDragEnd}
            >
              <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img) => (
                    <SortableImageItem
                      key={img.id}
                      img={img}
                      src={imageUrls[img.image_uuid] ?? null}
                      onDelete={handleDeleteImage}
                      onLightbox={setLightboxSrc}
                    />
                  ))}
                  <ImageUploadArea
                    onImageSaved={handleAddImage}
                    className="aspect-video w-full h-auto border-dashed border-border-strong rounded flex flex-col items-center justify-center text-text-tertiary hover:bg-surface transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-medium">Add Photo</span>
                  </ImageUploadArea>
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Tools & Items Tags */}
          <div className="pt-2 border-t border-border-subtle flex flex-col space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-text-secondary">
                  <Wrench className="w-3.5 h-3.5 mr-2" />
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Tools</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPickerType('tool')}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tools.map(t => {
                  const libTool = libraryTools.find(lt => lt.id === t.tool_id);
                  return (
                    <Badge key={t.id} variant="secondary" className="text-[10px] py-0 px-1.5 h-5 flex items-center bg-panel border-border-standard font-medium">
                      {libTool ? libTool.name : t.free_text}
                      <button onClick={() => handleDeleteResource('tool', t.id)} className="ml-1 hover:text-status-red">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-text-secondary">
                  <Package className="w-3.5 h-3.5 mr-2" />
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Parts</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPickerType('item')}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {items.map(i => {
                  const libItem = libraryItems.find(li => li.id === i.item_id);
                  const label = libItem ? libItem.name : i.free_text;
                  return (
                    <Badge key={i.id} variant="secondary" className="text-[10px] py-0 px-1.5 h-5 flex items-center bg-panel border-border-standard font-medium">
                      {i.quantity && `${i.quantity}x `}{label} {i.unit && `(${i.unit})`}
                      <button onClick={() => handleDeleteResource('item', i.id)} className="ml-1 hover:text-status-red">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StepResourcePicker
        open={pickerType !== null}
        onOpenChange={(open) => !open && setPickerType(null)}
        type={pickerType === 'tool' ? 'tool' : 'item'}
        library={pickerType === 'tool' ? libraryTools : libraryItems}
        selectedIds={pickerType === 'tool' ? tools.map(t => t.tool_id) : items.map(i => i.item_id)}
        onAdd={handleAddResource}
      />

      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-4xl w-full bg-black border-none p-2 overflow-hidden flex items-center justify-center">
          <img src={lightboxSrc || ''} alt="Visual Aid" className="w-full h-auto object-contain max-h-[85vh]" />
        </DialogContent>
      </Dialog>

      {aiPreview && (
        <AIPreviewPanel
          open
          originalText={aiPreview.original}
          enhancedText={aiPreview.enhanced}
          fieldName={aiPreview.field}
          entityType="step"
          entityId={step.id}
          sopId={step.sop_id}
          provider={aiProvider}
          onAccept={(text) => {
            updateStepField(step.id, aiPreview.field as 'action' | 'notes' | 'expected_output', text);
            setAiPreview(null);
          }}
          onReject={() => setAiPreview(null)}
        />
      )}
    </div>
  );
}
