import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Circle, Text, Label as KonvaLabel, Tag, Group } from 'react-konva';
import useImage from 'use-image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MousePointer2, MoveUpRight, Circle as CircleIcon, Type, Undo2, SkipForward } from 'lucide-react';

interface AnnotationWindowProps {
  open: boolean;
  imgSrc: string;
  onConfirm: (annotatedBase64: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

type ToolType = 'select' | 'arrow' | 'circle' | 'text';

interface Annotation {
  id: string;
  type: ToolType;
  x?: number;
  y?: number;
  points?: number[];
  radius?: number;
  text?: string;
  color: string;
}

export function AnnotationWindow({ open, imgSrc, onConfirm, onSkip, onCancel }: AnnotationWindowProps) {
  const [image] = useImage(imgSrc);
  const stageRef = useRef<any>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState<Annotation | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (image) {
      // Calculate scale to fit within max size (e.g. 600px width)
      const maxWidth = 600;
      let width = image.width;
      let height = image.height;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      setCanvasSize({ width, height });
    }
  }, [image]);

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    
    const pos = e.target.getStage().getPointerPosition();
    const id = Date.now().toString();
    const color = '#ff0000'; // Default red

    if (tool === 'arrow') {
      setNewAnnotation({ id, type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y], color });
    } else if (tool === 'circle') {
      setNewAnnotation({ id, type: 'circle', x: pos.x, y: pos.y, radius: 0, color });
    } else if (tool === 'text') {
      const text = window.prompt('Enter text label:');
      if (text) {
        setAnnotations([...annotations, { id, type: 'text', x: pos.x, y: pos.y, text, color }]);
      }
      setTool('select');
    }
  };

  const handleMouseMove = (e: any) => {
    if (!newAnnotation || tool === 'select' || tool === 'text') return;

    const pos = e.target.getStage().getPointerPosition();

    if (newAnnotation.type === 'arrow' && newAnnotation.points) {
      setNewAnnotation({
        ...newAnnotation,
        points: [newAnnotation.points[0], newAnnotation.points[1], pos.x, pos.y]
      });
    } else if (newAnnotation.type === 'circle') {
      const dx = pos.x - (newAnnotation.x || 0);
      const dy = pos.y - (newAnnotation.y || 0);
      const radius = Math.sqrt(dx * dx + dy * dy);
      setNewAnnotation({ ...newAnnotation, radius });
    }
  };

  const handleMouseUp = () => {
    if (newAnnotation) {
      setAnnotations([...annotations, newAnnotation]);
      setNewAnnotation(null);
    }
  };

  const handleDragEnd = (e: any, id: string) => {
    const dx = e.target.x();
    const dy = e.target.y();
    
    setAnnotations(prev => prev.map(ann => {
      if (ann.id !== id) return ann;
      
      if (ann.type === 'arrow' && ann.points) {
        const newPoints = ann.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy);
        return { ...ann, points: newPoints };
      } else if (ann.type === 'circle' || ann.type === 'text') {
        return { ...ann, x: (ann.x || 0) + dx, y: (ann.y || 0) + dy };
      }
      return ann;
    }));

    // Reset node position to avoid cumulative offsets in state
    e.target.x(0);
    e.target.y(0);
  };

  const handleMouseEnter = (e: any) => {
    if (tool === 'select') {
      const container = e.target.getStage().container();
      container.style.cursor = 'move';
    }
  };

  const handleMouseLeave = (e: any) => {
    const container = e.target.getStage().container();
    container.style.cursor = 'default';
  };

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1));
  };

  const handleConfirm = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    onConfirm(uri);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="max-w-[700px] w-full bg-surface">
        <DialogHeader>
          <DialogTitle>Annotate Image</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-2 border border-border-standard rounded bg-background">
          <div className="flex space-x-2">
            <Button variant={tool === 'select' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('select')} title="Select/Move">
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'arrow' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('arrow')} title="Arrow">
              <MoveUpRight className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'circle' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('circle')} title="Circle">
              <CircleIcon className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'text' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('text')} title="Text Label">
              <Type className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={annotations.length === 0} title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-center bg-panel border border-border-standard overflow-hidden rounded relative" style={{ minHeight: '300px' }}>
          {image && canvasSize.width > 0 && (
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                <KonvaImage image={image} width={canvasSize.width} height={canvasSize.height} />
              </Layer>
              <Layer>
                {annotations.map((ann) => (
                  <React.Fragment key={ann.id}>
                    {ann.type === 'arrow' && (
                      <Group 
                        draggable={tool === 'select'} 
                        onDragEnd={(e) => handleDragEnd(e, ann.id)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <Arrow 
                          points={ann.points || []} 
                          stroke={ann.color} 
                          fill={ann.color} 
                          strokeWidth={4} 
                          pointerLength={10} 
                          pointerWidth={10} 
                        />
                      </Group>
                    )}
                    {ann.type === 'circle' && (
                      <Circle 
                        x={ann.x} 
                        y={ann.y} 
                        radius={ann.radius} 
                        stroke={ann.color} 
                        strokeWidth={6} 
                        draggable={tool === 'select'}
                        onDragEnd={(e) => handleDragEnd(e, ann.id)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      />
                    )}
                    {ann.type === 'text' && (
                      <KonvaLabel 
                        x={ann.x} 
                        y={ann.y}
                        draggable={tool === 'select'}
                        onDragEnd={(e) => handleDragEnd(e, ann.id)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <Tag fill="rgba(255, 255, 255, 0.85)" cornerRadius={4} />
                        <Text text={ann.text} fontSize={20} fill={ann.color} fontStyle="bold" padding={6} />
                      </KonvaLabel>
                    )}
                  </React.Fragment>
                ))}
                {newAnnotation && newAnnotation.type === 'arrow' && <Arrow points={newAnnotation.points || []} stroke={newAnnotation.color} fill={newAnnotation.color} strokeWidth={4} pointerLength={10} pointerWidth={10} />}
                {newAnnotation && newAnnotation.type === 'circle' && <Circle x={newAnnotation.x} y={newAnnotation.y} radius={newAnnotation.radius} stroke={newAnnotation.color} strokeWidth={6} />}
              </Layer>
            </Stage>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <Button variant="ghost" onClick={onSkip} className="text-text-tertiary flex items-center">
            <SkipForward className="w-4 h-4 mr-2" /> Skip Annotation
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleConfirm}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
