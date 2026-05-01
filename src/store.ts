import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { SOP, Revision, Definition, Tool, Item, Step, StepFull } from './types';

interface SopState {
  activeSopId: string | null;
  editorOrigin: 'home' | 'viewer';
  currentSop: SOP | null;
  revisions: Revision[];
  definitions: Definition[];
  tools: Tool[];
  items: Item[];
  stepsFull: StepFull[];

  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Actions
  setActiveSopId: (id: string | null) => void;
  setEditorOrigin: (origin: 'home' | 'viewer') => void;
  setCurrentSop: (sop: SOP | null) => void;
  updateSopField: (field: keyof SOP, value: any) => void;
  
  setRevisions: (revisions: Revision[]) => void;
  setDefinitions: (definitions: Definition[]) => void;
  setTools: (tools: Tool[]) => void;
  setItems: (items: Item[]) => void;
  setStepsFull: (stepsFull: StepFull[]) => void;
  updateStepField: (stepId: string, field: keyof Step, value: any) => void;

  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (time: string | null) => void;
}

let saveTimeout: ReturnType<typeof setTimeout>;
let stepSaveTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

export const useSopStore = create<SopState>((set, get) => ({
  activeSopId: null,
  editorOrigin: 'home',
  currentSop: null,
  revisions: [],
  definitions: [],
  tools: [],
  items: [],
  stepsFull: [],

  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  setActiveSopId: (id) => set({ activeSopId: id }),
  setEditorOrigin: (origin) => set({ editorOrigin: origin }),
  
  setCurrentSop: (sop) => set({ currentSop: sop, isDirty: false }),
  
  updateSopField: (field, value) => {
    set((state) => {
      if (!state.currentSop) return state;
      return {
        currentSop: { ...state.currentSop, [field]: value },
        isDirty: true,
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

  setDirty: (dirty) => set({ isDirty: dirty })
}));
