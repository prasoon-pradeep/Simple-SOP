import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CropWindowProps {
  open: boolean;
  imgSrc: string;
  onConfirm: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export function CropWindow({ open, imgSrc, onConfirm, onCancel }: CropWindowProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number>(16 / 9);

  // Initialize crop centered
  useEffect(() => {
    if (imgRef.current && imgRef.current.width && imgRef.current.height) {
      const img = imgRef.current;
      let width = 90;
      let height = (width / aspect) * (img.width / img.height);
      
      // If height exceeds bounds, flip the constraint
      if (height > 95) {
        height = 90;
        width = aspect * height * (img.height / img.width);
      }

      setCrop({
        unit: '%',
        width,
        height,
        x: (100 - width) / 2,
        y: (100 - height) / 2
      });
    }
  }, [aspect]);

  const getCroppedImg = () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const base64Image = canvas.toDataURL('image/png');
    onConfirm(base64Image);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-[700px] bg-surface">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center space-x-6 py-4 border-b border-border-standard">
          <button 
            onClick={() => setAspect(16 / 9)}
            className={cn(
              "flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all",
              aspect === 16 / 9 
                ? "border-brand bg-brand-light text-brand shadow-sm" 
                : "border-border-standard bg-surface text-text-tertiary hover:border-border-strong hover:text-text-secondary"
            )}
          >
            <div className={cn(
              "w-12 h-6 border-2 rounded-sm mb-1",
              aspect === 16 / 9 ? "border-brand" : "border-text-quaternary opacity-50"
            )}></div>
            <span className="text-xs font-bold uppercase tracking-wider">Landscape 16:9</span>
          </button>

          <button 
            onClick={() => setAspect(4 / 3)}
            className={cn(
              "flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all",
              aspect === 4 / 3 
                ? "border-brand bg-brand-light text-brand shadow-sm" 
                : "border-border-standard bg-surface text-text-tertiary hover:border-border-strong hover:text-text-secondary"
            )}
          >
            <div className={cn(
              "w-8 h-6 border-2 rounded-sm mb-1",
              aspect === 4 / 3 ? "border-brand" : "border-text-quaternary opacity-50"
            )}></div>
            <span className="text-xs font-bold uppercase tracking-wider">Standard 4:3</span>
          </button>
        </div>

        <div className="flex justify-center py-4 bg-background border border-border-standard rounded max-h-[60vh] overflow-auto">
          {imgSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                style={{ maxHeight: '50vh', width: 'auto' }}
                onLoad={() => {
                   // trigger initial crop calculation
                   setAspect(aspect); 
                }}
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={getCroppedImg} disabled={!completedCrop?.width || !completedCrop?.height}>
            Confirm Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
