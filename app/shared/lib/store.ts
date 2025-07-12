import { create } from "zustand";
import { Model3D, ModelAnalysis, Model3MFSettings } from "~/entities/model/types";
import { PrintSettings, FilamentSlot } from "~/entities/settings/types";

interface Estimation {
  printTime: number; // seconds
  filamentUsage: {
    length: number; // meters
    weight: number; // grams
  };
  cost: number; // total cost in currency
  selectedFilament?: FilamentSlot;
  breakdown?: {
    filamentCost: number;
    powerCost: number;
    maintenanceCost: number;
  };
  gcodeUrl?: string;
}

interface EstimationState {
  // Model state
  currentModel: Model3D | null;
  setCurrentModel: (model: Model3D | null) => void;

  // 3MF 설정 상태 추가
  extracted3MFSettings: Model3MFSettings | null;
  setExtracted3MFSettings: (settings: Model3MFSettings | null) => void;

  // Upload state
  isUploading: boolean;
  setUploading: (uploading: boolean) => void;

  // Analysis state
  isAnalyzing: boolean;
  setAnalyzing: (analyzing: boolean) => void;
  modelAnalysis: ModelAnalysis | null;
  setModelAnalysis: (analysis: ModelAnalysis | null) => void;

  // Settings state
  printSettings: PrintSettings | null;
  setPrintSettings: (settings: PrintSettings | null) => void;
  suggestedSettings: PrintSettings[];
  setSuggestedSettings: (settings: PrintSettings[]) => void;

  // Slicing state
  isSlicing: boolean;
  setSlicing: (slicing: boolean) => void;

  // Estimation state
  estimation: Estimation | null;
  setEstimation: (estimation: Estimation | null) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // AMS state
  selectedFilamentSlot: number | null;
  setSelectedFilamentSlot: (slotId: number | null) => void;

  // Project state
  projectName: string;
  setProjectName: (name: string) => void;

  // Reset functions
  resetEstimation: () => void;
  resetAll: () => void;
}

export const useEstimationStore = create<EstimationState>((set, get) => ({
  // Model state
  currentModel: null,
  setCurrentModel: (model) => set({ currentModel: model }),

  // 3MF 설정 상태 추가
  extracted3MFSettings: null,
  setExtracted3MFSettings: (settings) => set({ extracted3MFSettings: settings }),

  // Upload state
  isUploading: false,
  setUploading: (uploading) => set({ isUploading: uploading }),

  // Analysis state
  isAnalyzing: false,
  setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  modelAnalysis: null,
  setModelAnalysis: (analysis) => set({ modelAnalysis: analysis }),

  // Settings state
  printSettings: null,
  setPrintSettings: (settings) => set({ printSettings: settings }),
  suggestedSettings: [],
  setSuggestedSettings: (settings) => set({ suggestedSettings: settings }),

  // Slicing state
  isSlicing: false,
  setSlicing: (slicing) => set({ isSlicing: slicing }),

  // Estimation state
  estimation: null,
  setEstimation: (estimation) => set({ estimation: estimation }),

  // Error state
  error: null,
  setError: (error) => set({ error: error }),

  // AMS state
  selectedFilamentSlot: null,
  setSelectedFilamentSlot: (slotId) => set({ selectedFilamentSlot: slotId }),

  // Project state
  projectName: "",
  setProjectName: (name) => set({ projectName: name }),

  // Reset functions
  resetEstimation: () =>
    set({
      estimation: null,
      isSlicing: false,
      error: null,
    }),

  resetAll: () =>
    set({
      currentModel: null,
      isUploading: false,
      isAnalyzing: false,
      modelAnalysis: null,
      printSettings: null,
      suggestedSettings: [],
      isSlicing: false,
      estimation: null,
      error: null,
      selectedFilamentSlot: null,
      projectName: "",
    }),
}));
