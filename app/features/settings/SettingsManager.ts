import { PrintSettings } from '~/entities/settings/types';
import { Model3D } from '~/entities/model/types';

export interface ProjectSettings {
  version: string;
  created: string;
  modified: string;
  model: {
    name: string;
    checksum: string;
  };
  printSettings: PrintSettings;
  slicerSettings: {
    software: string;
    version: string;
    profile: string;
  };
  materials: {
    primary: string;
    support?: string;
  };
  metadata: {
    estimatedTime: number;
    estimatedCost: number;
    filamentUsage: {
      length: number;
      weight: number;
    };
  };
}

export class SettingsManager {
  // 3MF 호환 XML 설정 생성
  generateProjectXML(settings: ProjectSettings): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">3D Print Estimator</metadata>
  <metadata name="Version">${settings.version}</metadata>
  <metadata name="Created">${settings.created}</metadata>
  <metadata name="Modified">${settings.modified}</metadata>
  
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
  </build>
  
  <resources>
    <object id="1" type="model">
      <!-- Model mesh data would go here -->
    </object>
    
    <!-- Print Settings -->
    <printSettings id="settings1">
      <layerHeight>${settings.printSettings.layerHeight}</layerHeight>
      <wallCount>${settings.printSettings.wallCount}</wallCount>
      <infillDensity>${settings.printSettings.infillDensity}</infillDensity>
      <printSpeed>${settings.printSettings.printSpeed}</printSpeed>
      <nozzleTemperature>${settings.printSettings.nozzleTemperature}</nozzleTemperature>
      <bedTemperature>${settings.printSettings.bedTemperature}</bedTemperature>
      <supportEnabled>${settings.printSettings.supportEnabled}</supportEnabled>
      <quality>${settings.printSettings.quality}</quality>
      <purpose>${settings.printSettings.purpose}</purpose>
    </printSettings>
    
    <!-- Estimation Data -->
    <estimationData>
      <printTime>${settings.metadata.estimatedTime}</printTime>
      <cost>${settings.metadata.estimatedCost}</cost>
      <filamentLength>${settings.metadata.filamentUsage.length}</filamentLength>
      <filamentWeight>${settings.metadata.filamentUsage.weight}</filamentWeight>
    </estimationData>
  </resources>
</model>`;
  }

  // 설정을 3MF 호환 형식으로 저장
  exportSettings(
    model: Model3D,
    printSettings: PrintSettings,
    estimation: any
  ): ProjectSettings {
    const now = new Date().toISOString();
    
    return {
      version: "1.0.0",
      created: now,
      modified: now,
      model: {
        name: model.name,
        checksum: this.generateChecksum(model.name + model.size)
      },
      printSettings,
      slicerSettings: {
        software: "3D Print Estimator",
        version: "1.0.0",
        profile: printSettings.name
      },
      materials: {
        primary: this.getMaterialFromTemperature(printSettings.nozzleTemperature)
      },
      metadata: {
        estimatedTime: estimation?.printTime || 0,
        estimatedCost: estimation?.cost || 0,
        filamentUsage: estimation?.filamentUsage || { length: 0, weight: 0 }
      }
    };
  }

  // 3MF 파일에서 설정 불러오기 (시뮬레이션)
  async importSettings(file: File): Promise<ProjectSettings | null> {
    try {
      // 실제로는 3MF ZIP 파일을 파싱해야 하지만, 여기서는 JSON으로 시뮬레이션
      const text = await file.text();
      
      // XML 파싱 시뮬레이션 (실제로는 DOMParser 사용)
      if (text.includes('3D Print Estimator')) {
        return this.parseProjectXML(text);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return null;
    }
  }

  private parseProjectXML(xml: string): ProjectSettings {
    // 간단한 XML 파싱 시뮬레이션
    const extractValue = (tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
      return match ? match[1] : '';
    };

    return {
      version: extractValue('Version') || '1.0.0',
      created: extractValue('Created') || new Date().toISOString(),
      modified: new Date().toISOString(),
      model: {
        name: 'imported_model.stl',
        checksum: 'imported'
      },
      printSettings: {
        id: 'imported',
        name: '불러온 설정',
        layerHeight: parseFloat(extractValue('layerHeight')) || 0.2,
        wallCount: parseInt(extractValue('wallCount')) || 3,
        infillDensity: parseInt(extractValue('infillDensity')) || 20,
        printSpeed: parseInt(extractValue('printSpeed')) || 80,
        nozzleTemperature: parseInt(extractValue('nozzleTemperature')) || 210,
        bedTemperature: parseInt(extractValue('bedTemperature')) || 60,
        supportEnabled: extractValue('supportEnabled') === 'true',
        rafts: false,
        brim: false,
        quality: extractValue('quality') as any || 'standard',
        purpose: extractValue('purpose') as any || 'functional'
      },
      slicerSettings: {
        software: '3D Print Estimator',
        version: '1.0.0',
        profile: '불러온 프로필'
      },
      materials: {
        primary: 'PLA'
      },
      metadata: {
        estimatedTime: parseInt(extractValue('printTime')) || 0,
        estimatedCost: parseInt(extractValue('cost')) || 0,
        filamentUsage: {
          length: parseFloat(extractValue('filamentLength')) || 0,
          weight: parseFloat(extractValue('filamentWeight')) || 0
        }
      }
    };
  }

  private generateChecksum(data: string): string {
    // 간단한 체크섬 생성
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(16);
  }

  private getMaterialFromTemperature(temperature: number): string {
    if (temperature >= 250) return 'ABS';
    if (temperature >= 230) return 'PETG';
    if (temperature >= 210) return 'PLA';
    return 'PLA';
  }

  // 설정을 파일로 다운로드
  downloadSettings(settings: ProjectSettings, filename: string = 'settings.json'): void {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const settingsManager = new SettingsManager();