export type FilamentMaterial = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'PLA+' | 'WOOD' | 'CARBON_FIBER';

export type PrintQuality = 'ultra-fine' | 'fine' | 'standard' | 'draft';

export type PrintPurpose = 'decorative' | 'functional' | 'assembly';

export interface PrintSettings {
  id: string;
  name: string;
  layerHeight: number; // mm
  wallCount: number;
  infillDensity: number; // percentage
  printSpeed: number; // mm/s
  nozzleTemperature: number; // °C
  bedTemperature: number; // °C
  supportEnabled: boolean;
  supportDensity?: number; // percentage
  rafts: boolean;
  brim: boolean;
  quality: PrintQuality;
  purpose: PrintPurpose;
}

export interface FilamentSlot {
  id: number;
  material: {
    type: FilamentMaterial;
    density: number; // g/cm³
    nozzleTemp: { min: number; max: number };
    bedTemp: { min: number; max: number };
    properties: {
      strength: number; // 1-10 scale
      flexibility: number; // 1-10 scale
      durability: number; // 1-10 scale
      printability: number; // 1-10 scale
    };
  };
  color: string; // hex color
  brand: string;
  costPerGram: number; // cost in currency
  diameter: number; // mm
}

export interface BambuLabSpeedMode {
  name: string;
  printSpeed: number;
  travelSpeed: number;
  acceleration: number;
  jerk: number;
  fanSpeed: number;
  description: string;
}

export interface QualityProfile {
  layerHeight: number;
  wallCount: number;
  infillDensity: number;
  supportDensity: number;
  description: string;
}