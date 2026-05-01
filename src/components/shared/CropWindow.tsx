import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
      const cropWidth = 90;
      const cropHeight = (cropWidth / aspect) * (img.width / img.height);
      setCrop({
        unit: '%',
        width: cropWidth,
        height: cropHeight,
        x: (100 - cropWidth) / 2,
        y: (100 - cropHeight) / 2
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

    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    onConfirm(base64Image);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-[700px] bg-surface">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center space-x-4 py-2 border-b border-border-standard">
          <Button 
            variant={aspect === 16 / 9 ? "default" : "outline"} 
            onClick={() => setAspect(16 / 9)}
            size="sm"
          >
            16:9
          </Button>
          <Button 
            variant={aspect === 4 / 3 ? "default" : "outline"} 
            onClick={() => setAspect(4 / 3)}
            size="sm"
          >
            4:3
          </Button>
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
