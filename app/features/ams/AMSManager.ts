import bambuLabSettings from '~/shared/config/bambulab-settings.json';
import { PrintSettings, FilamentSlot } from '~/entities/settings/types';

export class AMSManager {
  private filamentSlots: FilamentSlot[];

  constructor() {
    this.filamentSlots = bambuLabSettings.bambuLabProfiles.amsSettings.filamentSlots.map(slot => ({
      ...slot,
      material: {
        type: slot.material as any,
        density: bambuLabSettings.bambuLabProfiles.materialProfiles[slot.material].density,
        nozzleTemp: bambuLabSettings.bambuLabProfiles.materialProfiles[slot.material].printTemp,
        bedTemp: bambuLabSettings.bambuLabProfiles.materialProfiles[slot.material].bedTemp,
        properties: {
          strength: this.getMaterialStrength(slot.material),
          flexibility: this.getMaterialFlexibility(slot.material),
          durability: this.getMaterialDurability(slot.material),
          printability: this.getMaterialPrintability(slot.material)
        }
      }
    }));
  }

  private getMaterialStrength(material: string): number {
    const strengths = { PLA: 6, ABS: 8, PETG: 7, TPU: 3 };
    return strengths[material] || 5;
  }

  private getMaterialFlexibility(material: string): number {
    const flexibility = { PLA: 2, ABS: 4, PETG: 3, TPU: 10 };
    return flexibility[material] || 3;
  }

  private getMaterialDurability(material: string): number {
    const durability = { PLA: 5, ABS: 9, PETG: 8, TPU: 6 };
    return durability[material] || 6;
  }

  private getMaterialPrintability(material: string): number {
    const printability = { PLA: 10, ABS: 6, PETG: 8, TPU: 4 };
    return printability[material] || 7;
  }

  getAvailableFilaments(): FilamentSlot[] {
    return this.filamentSlots;
  }

  selectOptimalFilament(
    classification: 'decorative' | 'functional' | 'assembly',
    complexity: 'low' | 'medium' | 'high'
  ): FilamentSlot {
    const preferences = {
      decorative: { strength: 0.2, flexibility: 0.1, durability: 0.2, printability: 0.5 },
      functional: { strength: 0.4, flexibility: 0.1, durability: 0.4, printability: 0.1 },
      assembly: { strength: 0.3, flexibility: 0.2, durability: 0.3, printability: 0.2 }
    };

    const pref = preferences[classification];
    let bestSlot = this.filamentSlots[0];
    let bestScore = 0;

    for (const slot of this.filamentSlots) {
      const score = 
        slot.material.properties.strength * pref.strength +
        slot.material.properties.flexibility * pref.flexibility +
        slot.material.properties.durability * pref.durability +
        slot.material.properties.printability * pref.printability;

      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    return bestSlot;
  }

  calculateFilamentCost(weightGrams: number, material: string): number {
    const slot = this.filamentSlots.find(s => s.material.type === material);
    return slot ? weightGrams * slot.costPerGram : weightGrams * 50; // 기본 PLA 단가
  }

  getFilamentBySlot(slotId: number): FilamentSlot | undefined {
    return this.filamentSlots.find(slot => slot.id === slotId);
  }

  updateFilamentSlot(slotId: number, updates: Partial<FilamentSlot>): void {
    const slotIndex = this.filamentSlots.findIndex(slot => slot.id === slotId);
    if (slotIndex !== -1) {
      this.filamentSlots[slotIndex] = { ...this.filamentSlots[slotIndex], ...updates };
    }
  }
}

export const amsManager = new AMSManager();