import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SparkleButtonProps {
  value: string;
  fieldName: string;
  entityType: string;
  entityId: string;
  sopId: string;
  sopTitle?: string;
  department?: string;
  stepNumber?: number;
  totalSteps?: number;
  prevStepAction?: string;
  onPreview: (enhanced: string) => void;
  className?: string;
}

export function SparkleButton({
  value,
  fieldName,
  entityType: _entityType,
  entityId: _entityId,
  sopId: _sopId,
  sopTitle,
  department,
  stepNumber,
  totalSteps,
  prevStepAction,
  onPreview,
  className,
}: SparkleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' }).then(p => {
      const activeProvider = p ?? 'anthropic';
      setProvider(activeProvider);
      invoke<string | null>('get_ai_key', { provider: activeProvider }).then(key => {
        setHasKey(!!key);
      }).catch(() => setHasKey(false));
    }).catch(() => {});
  }, []);

  const handleClick = async () => {
    if (!provider || !hasKey || loading) return;
    setLoading(true);
    setError(null);
    try {
      const enhanced = await invoke<string>('enhance_text', {
        provider,
        fieldName,
        originalText: value,
        sopTitle: sopTitle ?? null,
        department: department ?? null,
        stepNumber: stepNumber ?? null,
        totalSteps: totalSteps ?? null,
        prevStepAction: prevStepAction ?? null,
      });
      onPreview(enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const disabled = !hasKey || loading;
  const title = !hasKey
    ? 'Configure an AI provider in Settings to use this feature'
    : loading
      ? 'Enhancing…'
      : 'Enhance with AI';

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title}
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded transition-colors',
          hasKey && !loading
            ? 'text-brand hover:bg-brand-light cursor-pointer'
            : 'text-text-quaternary cursor-not-allowed opacity-50',
          className
        )}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Sparkles className="w-3.5 h-3.5" />
        }
      </button>
      {error && (
        <div className="absolute top-7 right-0 z-50 w-56 rounded-md border border-status-red-bg bg-white p-2 shadow-md">
          <p className="text-[11px] text-status-red leading-snug">{error}</p>
        </div>
      )}
    </div>
  );
}
