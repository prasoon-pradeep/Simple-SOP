import * as React from 'react';
import { cn } from '@/lib/utils';

interface SuggestionInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  /** When true, autocomplete operates on the last comma-separated token */
  tokenMode?: boolean;
}

export function SuggestionInput({
  value,
  onChange,
  suggestions,
  tokenMode = false,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: SuggestionInputProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Derive the current token being typed (last segment after comma in tokenMode)
  const currentToken = React.useMemo(() => {
    if (!tokenMode) return value;
    const parts = value.split(',');
    return parts[parts.length - 1].trimStart();
  }, [value, tokenMode]);

  const filtered = React.useMemo(() => {
    const q = currentToken.toLowerCase();
    if (!q) return suggestions.slice(0, 20);
    return suggestions.filter(
      (s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q
    ).slice(0, 20);
  }, [currentToken, suggestions]);

  const shouldOpen = open && filtered.length > 0;

  // Reset active index when filtered list changes
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [filtered]);

  function selectSuggestion(suggestion: string) {
    if (tokenMode) {
      const parts = value.split(',');
      parts[parts.length - 1] = ' ' + suggestion;
      onChange(parts.join(',').replace(/^,\s*/, ''));
    } else {
      onChange(suggestion);
    }
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (shouldOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(filtered[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        autoComplete="off"
        {...props}
      />
      {shouldOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border-subtle bg-background shadow-lg py-1"
        >
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                'cursor-pointer px-3 py-1.5 text-sm text-text-primary select-none',
                i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
