import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { SOP, Revision, Definition, Tool, Item, Step, StepFull, AiTranslation } from './types';

interface SopState {
  sops: SOP[];
  activeSopId: string | null;
  editorOrigin: 'home' | 'viewer';
  currentSop: SOP | null;
  revisions: Revision[];
  definitions: Definition[];
  tools: Tool[];
  items: Item[];
  stepsFull: StepFull[];
  translations: AiTranslation[];

  isDirty: boolean;
  hasUnsavedRevision: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  searchTerm: string;
  selectedProject: string | null;

  // Actions
  setSops: (sops: SOP[]) => void;
  setSearchTerm: (term: string) => void;
  setSelectedProject: (project: string | null) => void;
  
  resetEditorState: () => void;
  setActiveSopId: (id: string | null) => void;
  setEditorOrigin: (origin: 'home' | 'viewer') => void;
  setCurrentSop: (sop: SOP | null) => void;
  updateSopField: (field: keyof SOP, value: any) => void;
  
  setRevisions: (revisions: Revision[]) => void;
  setDefinitions: (definitions: Definition[]) => void;
  updateDefinitionField: (id: string, field: keyof Definition, value: any) => void;
  
  setTools: (tools: Tool[]) => void;
  setItems: (items: Item[]) => void;
  setStepsFull: (stepsFull: StepFull[]) => void;
  updateStepField: (stepId: string, field: keyof Step, value: any) => void;

  setTranslations: (translations: AiTranslation[]) => void;
  upsertTranslation: (translation: AiTranslation) => void;
  updateTranslationField: (id: string, value: string) => void;

  setDirty: (dirty: boolean) => void;
  setHasUnsavedRevision: (val: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (time: string | null) => void;
}

let saveTimeout: ReturnType<typeof setTimeout>;
let stepSaveTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
let defSaveTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
let translationSaveTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

export const useSopStore = create<SopState>((set, get) => ({
  sops: [],
  activeSopId: null,
  editorOrigin: 'home',
  currentSop: null,
  revisions: [],
  definitions: [],
  tools: [],
  items: [],
  stepsFull: [],
  translations: [],

  isDirty: false,
  hasUnsavedRevision: false,
  isSaving: false,
  lastSavedAt: null,

  searchTerm: '',
  selectedProject: null,

  setSops: (sops) => set({ sops }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),

  resetEditorState: () => set({
    currentSop: null,
    revisions: [],
    definitions: [],
    tools: [],
    items: [],
    stepsFull: [],
    translations: [],
    isDirty: false,
    hasUnsavedRevision: false,
    isSaving: false,
    lastSavedAt: null,
  }),

  setActiveSopId: (id) => set({ activeSopId: id }),
  setEditorOrigin: (origin) => set({ editorOrigin: origin }),
  
  setCurrentSop: (sop) => set({ currentSop: sop, isDirty: false, hasUnsavedRevision: false }),
  
  updateSopField: (field, value) => {
    set((state) => {
      if (!state.currentSop) return state;
      return {
        currentSop: { ...state.currentSop, [field]: value },
        isDirty: true,
        hasUnsavedRevision: true,
        isSaving: true,
      };
    });

    const state = get();
    if (state.currentSop) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        try {
          await invoke('save_sop', { payload: get().currentSop });
          set({ 
            isDirty: false, 
            isSaving: false, 
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          });
        } catch (error) {
          console.error("Failed to auto-save SOP:", error);
          set({ isSaving: false });
        }
      }, 500);
    }
  },

  setRevisions: (revisions) => set({ revisions }),
  setDefinitions: (definitions) => set({ definitions }),
  
  updateDefinitionField: (id, field, value) => {
    set((state) => ({
      definitions: state.definitions.map(d => 
        d.id === id ? { ...d, [field]: value } : d
      ),
      isDirty: true,
      hasUnsavedRevision: true,
      isSaving: true,
    }));

    clearTimeout(defSaveTimeouts[id]);
    defSaveTimeouts[id] = setTimeout(async () => {
      const def = get().definitions.find(d => d.id === id);
      if (def) {
        try {
          await invoke('save_definition', { payload: def });
          set({ 
            isDirty: false, 
            isSaving: false, 
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          });
        } catch (error) {
          console.error("Failed to auto-save Definition:", error);
          set({ isSaving: false });
        }
      }
    }, 500);
  },

  setTools: (tools) => set({ tools }),
  setItems: (items) => set({ items }),
  setStepsFull: (stepsFull) => set({ stepsFull }),

  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),

  updateStepField: (stepId, field, value) => {
    set((state) => ({
      stepsFull: state.stepsFull.map(s => 
        s.step.id === stepId ? { ...s, step: { ...s.step, [field]: value } } : s
      ),
      isDirty: true,
      hasUnsavedRevision: true,
      isSaving: true,
    }));

    clearTimeout(stepSaveTimeouts[stepId]);
    stepSaveTimeouts[stepId] = setTimeout(async () => {
      const stepFull = get().stepsFull.find(s => s.step.id === stepId);
      if (stepFull) {
        try {
          await invoke('save_step', { payload: stepFull.step });
          set({ 
            isDirty: false, 
            isSaving: false, 
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          });
        } catch (error) {
          console.error("Failed to auto-save Step:", error);
          set({ isSaving: false });
        }
      }
    }, 500);
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
  setHasUnsavedRevision: (val) => set({ hasUnsavedRevision: val }),

  setTranslations: (translations) => set({ translations }),

  upsertTranslation: (translation) => set((state) => ({
    translations: [...state.translations.filter(t => t.id !== translation.id), translation],
  })),

  // Manual edits in the Translations table are protected from silent AI
  // regeneration — this flips `edited` to true so a later "re-translate"
  // must be an explicit user action rather than an automatic overwrite.
  updateTranslationField: (id, value) => {
    set((state) => ({
      translations: state.translations.map(t =>
        t.id === id ? { ...t, translated_text: value, edited: true } : t
      ),
    }));

    clearTimeout(translationSaveTimeouts[id]);
    translationSaveTimeouts[id] = setTimeout(async () => {
      const translation = get().translations.find(t => t.id === id);
      if (translation) {
        try {
          await invoke('save_translation', { payload: translation });
        } catch (error) {
          console.error("Failed to save translation edit:", error);
        }
      }
    }, 500);
  },
}));
