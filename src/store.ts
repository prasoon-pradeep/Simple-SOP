import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { SOP, Revision, Definition, Tool, Item, Step, StepImage, StepTool, StepItem } from './types';

interface SopState {
  activeSopId: string | null;
  editorOrigin: 'home' | 'viewer';
  currentSop: SOP | null;
  revisions: Revision[];
  definitions: Definition[];
  tools: Tool[];
  items: Item[];
  steps: Step[];
  stepImages: StepImage[];
  stepTools: StepTool[];
  stepItems: StepItem[];

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
  setSteps: (steps: Step[]) => void;
  setStepImages: (stepImages: StepImage[]) => void;
  setStepTools: (stepTools: StepTool[]) => void;
  setStepItems: (stepItems: StepItem[]) => void;

  setDirty: (dirty: boolean) => void;
}

let saveTimeout: ReturnType<typeof setTimeout>;

export const useSopStore = create<SopState>((set, get) => ({
  activeSopId: null,
  editorOrigin: 'home',
  currentSop: null,
  revisions: [],
  definitions: [],
  tools: [],
  items: [],
  steps: [],
  stepImages: [],
  stepTools: [],
  stepItems: [],

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
  setSteps: (steps) => set({ steps }),
  setStepImages: (stepImages) => set({ stepImages }),
  setStepTools: (stepTools) => set({ stepTools }),
  setStepItems: (stepItems) => set({ stepItems }),

  setDirty: (dirty) => set({ isDirty: dirty })
}));
