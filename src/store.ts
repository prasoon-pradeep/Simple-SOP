import { create } from 'zustand';
import { SOP, Revision, Definition, Tool, Item, Step, StepImage, StepTool, StepItem } from './types';

interface SopState {
  activeSopId: string | null;
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

  // Actions
  setActiveSopId: (id: string | null) => void;
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

export const useSopStore = create<SopState>((set) => ({
  activeSopId: null,
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

  setActiveSopId: (id) => set({ activeSopId: id }),
  
  setCurrentSop: (sop) => set({ currentSop: sop, isDirty: false }),
  
  updateSopField: (field, value) => set((state) => {
    if (!state.currentSop) return state;
    return {
      currentSop: { ...state.currentSop, [field]: value },
      isDirty: true
    };
  }),

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
