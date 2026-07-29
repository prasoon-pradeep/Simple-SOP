import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSopStore } from '@/store';
import { AiTranslation, SUPPORTED_LANGUAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { Languages, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SopFieldName = 'purpose' | 'scope' | 'safety_notes';
const SOP_FIELDS: { field: SopFieldName; label: string }[] = [
  { field: 'purpose', label: 'Purpose' },
  { field: 'scope', label: 'Scope' },
  { field: 'safety_notes', label: 'Safety Notes' },
];

export function TranslationsSection() {
  const { currentSop, stepsFull, translations, setTranslations, upsertTranslation, updateTranslationField } = useSopStore();

  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null); // row/lang currently generating
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [sourceHashes, setSourceHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' }).then(p => {
      const activeProvider = p ?? 'anthropic';
      setProvider(activeProvider);
      invoke<string | null>('get_ai_key', { provider: activeProvider }).then(key => {
        setHasKey(!!key);
      }).catch(() => setHasKey(false));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentSop) loadTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSop?.id]);

  const loadTranslations = async () => {
    if (!currentSop) return;
    setIsLoading(true);
    try {
      const data = await invoke<AiTranslation[]>('get_translations', { sopId: currentSop.id });
      setTranslations(data);
    } catch (error) {
      console.error('Failed to load translations', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stepsOrdered = useMemo(
    () => [...stepsFull].sort((a, b) => a.step.step_number - b.step.step_number),
    [stepsFull]
  );

  // Recompute the "current English text" hash for every translatable field whenever
  // the underlying content changes, so stale translations can be flagged in the UI.
  useEffect(() => {
    if (!currentSop) return;
    let cancelled = false;

    const compute = async () => {
      const pairs: [string, string][] = [];
      for (const { field } of SOP_FIELDS) {
        pairs.push([`${currentSop.id}:${field}`, currentSop[field] || '']);
      }
      for (const s of stepsOrdered) {
        pairs.push([`${s.step.id}:action`, s.step.action || '']);
        pairs.push([`${s.step.id}:notes`, s.step.notes || '']);
        pairs.push([`${s.step.id}:expected_output`, s.step.expected_output || '']);
      }
      const entries = await Promise.all(
        pairs.map(async ([key, text]) => [key, await invoke<string>('compute_translation_hash', { text })] as const)
      );
      if (!cancelled) setSourceHashes(Object.fromEntries(entries));
    };

    compute();
    return () => { cancelled = true; };
  }, [currentSop, stepsOrdered]);

  const toggleLang = (code: string) => {
    setSelectedLangs(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const saveNewTranslation = async (t: AiTranslation) => {
    await invoke('save_translation', { payload: t });
    upsertTranslation(t);
  };

  const translateStep = async (stepFullIdx: number, lang: string) => {
    if (!currentSop || !provider) return;
    const stepFull = stepsOrdered[stepFullIdx];
    const key = `${stepFull.step.id}:${lang}`;
    setBusyKey(key);
    try {
      const result = await invoke<{ action: string; notes: string; expected_output: string }>('translate_step', {
        provider,
        language: lang,
        sopTitle: currentSop.title,
        stepNumber: stepFull.step.step_number,
        totalSteps: stepsOrdered.length,
        action: stepFull.step.action || '',
        notes: stepFull.step.notes || '',
        expectedOutput: stepFull.step.expected_output || '',
      });

      const now = new Date().toISOString();
      const fields: [string, string][] = [
        ['action', result.action],
        ['notes', result.notes],
        ['expected_output', result.expected_output],
      ];
      for (const [field, text] of fields) {
        const existing = translations.find(t => t.entity_id === stepFull.step.id && t.field_name === field && t.language === lang);
        const translation: AiTranslation = {
          id: existing?.id ?? crypto.randomUUID(),
          sop_id: currentSop.id,
          entity_type: 'step',
          entity_id: stepFull.step.id,
          field_name: field,
          language: lang,
          translated_text: text,
          source_hash: sourceHashes[`${stepFull.step.id}:${field}`] || '',
          edited: false,
          provider,
          model: '',
          translated_at: now,
        };
        await saveNewTranslation(translation);
      }
    } catch (error) {
      throw new Error(`Step ${stepFull.step.step_number} (${lang}): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyKey(null);
    }
  };

  const translateSopField = async (field: SopFieldName, lang: string) => {
    if (!currentSop || !provider) return;
    const key = `${currentSop.id}:${field}:${lang}`;
    setBusyKey(key);
    try {
      const text = await invoke<string>('translate_sop_field', {
        provider,
        language: lang,
        sopTitle: currentSop.title,
        fieldName: field,
        text: currentSop[field] || '',
      });

      const existing = translations.find(t => t.entity_id === currentSop.id && t.field_name === field && t.language === lang);
      const translation: AiTranslation = {
        id: existing?.id ?? crypto.randomUUID(),
        sop_id: currentSop.id,
        entity_type: 'sop',
        entity_id: currentSop.id,
        field_name: field,
        language: lang,
        translated_text: text,
        source_hash: sourceHashes[`${currentSop.id}:${field}`] || '',
        edited: false,
        provider,
        model: '',
        translated_at: new Date().toISOString(),
      };
      await saveNewTranslation(translation);
    } catch (error) {
      throw new Error(`${field} (${lang}): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleTranslateAll = async () => {
    if (selectedLangs.length === 0) return;
    setBatchRunning(true);
    setBatchError(null);
    try {
      for (const lang of selectedLangs) {
        for (const { field } of SOP_FIELDS) {
          await translateSopField(field, lang);
        }
        for (let i = 0; i < stepsOrdered.length; i++) {
          await translateStep(i, lang);
        }
      }
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : String(error));
    } finally {
      setBatchRunning(false);
    }
  };

  const isStale = (entityId: string, field: string, t?: AiTranslation) => {
    if (!t) return false;
    const currentHash = sourceHashes[`${entityId}:${field}`];
    return !!currentHash && t.source_hash !== currentHash;
  };

  const cellFor = (entityId: string, field: string, lang: string) =>
    translations.find(t => t.entity_id === entityId && t.field_name === field && t.language === lang);

  const disabledReason = !hasKey ? 'Configure an AI provider in Settings to use translation' : null;

  if (isLoading) return <div className="p-12 text-center text-text-tertiary">Loading translations...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="border-b border-border-subtle pb-4">
        <h3 className="text-lg font-bold text-text-primary flex items-center">
          <Languages className="w-5 h-5 mr-2 text-brand" />
          Translations
        </h3>
        <p className="text-sm text-text-tertiary">
          AI-generated translations are unreviewed — the English version stays authoritative in case of discrepancy.
          A disclaimer is added automatically to any PDF export that includes translated content.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SUPPORTED_LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => toggleLang(l.code)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              selectedLangs.includes(l.code)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface text-text-secondary border-border-standard hover:bg-hover'
            )}
          >
            {l.name}
          </button>
        ))}
        <Button
          onClick={handleTranslateAll}
          disabled={!hasKey || selectedLangs.length === 0 || batchRunning}
          size="sm"
          className="ml-2"
          title={disabledReason ?? undefined}
        >
          {batchRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Translate All
        </Button>
      </div>

      {batchError && (
        <div className="flex items-start gap-2 p-3 rounded-md border border-status-red-bg bg-status-red-bg/30 text-status-red text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Translation batch stopped</p>
            <p className="text-xs mt-0.5">{batchError}</p>
          </div>
        </div>
      )}

      {selectedLangs.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-border-standard rounded-lg flex flex-col items-center justify-center text-text-quaternary bg-surface/50">
          <Languages className="w-10 h-10 mb-2 opacity-20" />
          <p>Select one or more languages above to view or generate translations.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-standard rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border-standard">
                <th className="text-left p-3 font-bold text-text-secondary w-40">Field</th>
                <th className="text-left p-3 font-bold text-text-secondary">English</th>
                {selectedLangs.map(code => (
                  <th key={code} className="text-left p-3 font-bold text-text-secondary min-w-[220px]">
                    {SUPPORTED_LANGUAGES.find(l => l.code === code)?.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SOP header fields */}
              {currentSop && SOP_FIELDS.map(({ field, label }) => (
                <tr key={field} className="border-b border-border-subtle align-top">
                  <td className="p-3 font-medium text-text-tertiary">{label}</td>
                  <td className="p-3 text-text-primary whitespace-pre-wrap max-w-xs">{currentSop[field] || '—'}</td>
                  {selectedLangs.map(lang => {
                    const t = cellFor(currentSop.id, field, lang);
                    const key = `${currentSop.id}:${field}:${lang}`;
                    const stale = isStale(currentSop.id, field, t);
                    return (
                      <td key={lang} className="p-3 align-top">
                        <textarea
                          className={cn(
                            'w-full min-h-[60px] text-xs rounded border p-2 resize-y bg-surface',
                            stale ? 'border-status-amber-bg' : 'border-border-standard'
                          )}
                          value={t?.translated_text || ''}
                          placeholder={hasKey ? 'Not translated yet' : 'AI provider not configured'}
                          onChange={(e) => {
                            if (t) {
                              updateTranslationField(t.id, e.target.value);
                            } else if (currentSop) {
                              const newT: AiTranslation = {
                                id: crypto.randomUUID(),
                                sop_id: currentSop.id,
                                entity_type: 'sop',
                                entity_id: currentSop.id,
                                field_name: field,
                                language: lang,
                                translated_text: e.target.value,
                                source_hash: sourceHashes[`${currentSop.id}:${field}`] || '',
                                edited: true,
                                provider: provider || '',
                                model: '',
                                translated_at: new Date().toISOString(),
                              };
                              upsertTranslation(newT);
                              invoke('save_translation', { payload: newT }).catch(err => console.error('Failed to save manual translation', err));
                            }
                          }}
                        />
                        <div className="flex items-center justify-between mt-1">
                          {stale && <span className="text-[10px] text-status-amber flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Source changed</span>}
                          <button
                            className="text-[10px] text-brand hover:underline disabled:opacity-40 disabled:no-underline ml-auto"
                            disabled={!hasKey || busyKey === key}
                            onClick={() => translateSopField(field, lang).catch(err => setBatchError(err instanceof Error ? err.message : String(err)))}
                          >
                            {busyKey === key ? 'Translating…' : t ? 'Re-translate' : 'Translate'}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Step fields — grouped by step, "Translate" bundles action+notes+expected_output in one call */}
              {stepsOrdered.map((stepFull, idx) => {
                const stepFields: { field: string; label: string }[] = [
                  { field: 'action', label: `Step ${stepFull.step.step_number} — Action` },
                  { field: 'notes', label: `Step ${stepFull.step.step_number} — Notes` },
                  { field: 'expected_output', label: `Step ${stepFull.step.step_number} — Expected Output` },
                ];
                return stepFields.map(({ field, label }, fieldIdx) => (
                  <tr key={`${stepFull.step.id}-${field}`} className="border-b border-border-subtle align-top">
                    <td className="p-3 font-medium text-text-tertiary">{label}</td>
                    <td className="p-3 text-text-primary whitespace-pre-wrap max-w-xs">
                      {(stepFull.step as any)[field] || '—'}
                    </td>
                    {selectedLangs.map(lang => {
                      const t = cellFor(stepFull.step.id, field, lang);
                      const key = `${stepFull.step.id}:${lang}`;
                      const stale = isStale(stepFull.step.id, field, t);
                      return (
                        <td key={lang} className="p-3 align-top">
                          <textarea
                            className={cn(
                              'w-full min-h-[50px] text-xs rounded border p-2 resize-y bg-surface',
                              stale ? 'border-status-amber-bg' : 'border-border-standard'
                            )}
                            value={t?.translated_text || ''}
                            placeholder={hasKey ? 'Not translated yet' : 'AI provider not configured'}
                            onChange={(e) => {
                              if (t) {
                                updateTranslationField(t.id, e.target.value);
                              } else if (currentSop) {
                                const newT: AiTranslation = {
                                  id: crypto.randomUUID(),
                                  sop_id: currentSop.id,
                                  entity_type: 'step',
                                  entity_id: stepFull.step.id,
                                  field_name: field,
                                  language: lang,
                                  translated_text: e.target.value,
                                  source_hash: sourceHashes[`${stepFull.step.id}:${field}`] || '',
                                  edited: true,
                                  provider: provider || '',
                                  model: '',
                                  translated_at: new Date().toISOString(),
                                };
                                upsertTranslation(newT);
                                invoke('save_translation', { payload: newT }).catch(err => console.error('Failed to save manual translation', err));
                              }
                            }}
                          />
                          <div className="flex items-center justify-between mt-1">
                            {stale && <span className="text-[10px] text-status-amber flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Source changed</span>}
                            {fieldIdx === 0 && (
                              <button
                                className="text-[10px] text-brand hover:underline disabled:opacity-40 disabled:no-underline ml-auto"
                                disabled={!hasKey || busyKey === key}
                                onClick={() => translateStep(idx, lang).catch(err => setBatchError(err instanceof Error ? err.message : String(err)))}
                              >
                                {busyKey === key ? 'Translating step…' : 'Translate step'}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
