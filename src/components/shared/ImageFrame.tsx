import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFrameProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export function ImageFrame({ src, alt, className }: ImageFrameProps) {
  return (
    <div className={cn(
      "aspect-video bg-bg-secondary border border-border-standard rounded overflow-hidden flex items-center justify-center",
      className
    )}>
      {src ? (
        <img 
          src={src} 
          alt={alt || "SOP Visual"} 
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-text-quaternary opacity-50">
          <ImageIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-tight">No Image</span>
        </div>
      )}
    </div>
  );
}
