import { useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CropWindow } from './CropWindow';
import { AnnotationWindow } from './AnnotationWindow';

interface ImageUploadAreaProps {
  onImageSaved: (uuid: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function ImageUploadArea({ onImageSaved, className, children }: ImageUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [originalDataUrl, setOriginalDataUrl] = useState<string>('');
  const [originalExt, setOriginalExt] = useState<string>('png');
  const [croppedDataUrl, setCroppedDataUrl] = useState<string>('');
  
  const [showCrop, setShowCrop] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file.");
      return;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    setOriginalExt(ext);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setOriginalDataUrl(e.target.result as string);
        setShowCrop(true);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFile(e.clipboardData.files[0]);
      e.preventDefault();
    }
  };

  const handleCropConfirm = (croppedBase64: string) => {
    setCroppedDataUrl(croppedBase64);
    setShowCrop(false);
    setShowAnnotation(true);
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setOriginalDataUrl('');
  };

  const handleAnnotationConfirm = async (annotatedBase64: string) => {
    setShowAnnotation(false);
    await saveImages(croppedDataUrl, annotatedBase64);
  };

  const handleAnnotationSkip = async () => {
    setShowAnnotation(false);
    // If skipped, annotated is just the cropped image
    await saveImages(croppedDataUrl, croppedDataUrl);
  };

  const handleAnnotationCancel = () => {
    setShowAnnotation(false);
    setOriginalDataUrl('');
    setCroppedDataUrl('');
  };

  const saveImages = async (originalBase64: string, annotatedBase64: string) => {
    try {
      const uuid = await invoke<string>('save_image', {
        payload: {
          original_base64: originalBase64,
          annotated_base64: annotatedBase64,
          ext: originalExt
        }
      });
      
      onImageSaved(uuid);
      
    } catch (error) {
      console.error("Failed to save image", error);
      alert("Failed to save image: " + error);
    } finally {
      // Clean up
      setOriginalDataUrl('');
      setOriginalExt('png');
      setCroppedDataUrl('');
    }
  };

  return (
    <>
      <div 
        onClick={handleClick}
        onPaste={handlePaste}
        tabIndex={0}
        className={className || "flex flex-col items-center justify-center w-[108px] h-[60.75px] border border-dashed border-border-strong rounded bg-surface text-text-tertiary cursor-pointer hover:border-brand hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        {children || (
          <div className="flex items-center text-xs font-medium">
             <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <line x1="12" y1="5" x2="12" y2="19"/>
               <line x1="5" y1="12" x2="19" y2="12"/>
             </svg>
             Add image
          </div>
        )}
      </div>

      <CropWindow
        open={showCrop}
        imgSrc={originalDataUrl}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      <AnnotationWindow
        open={showAnnotation}
        imgSrc={croppedDataUrl}
        onConfirm={handleAnnotationConfirm}
        onSkip={handleAnnotationSkip}
        onCancel={handleAnnotationCancel}
      />
    </>
  );
}
