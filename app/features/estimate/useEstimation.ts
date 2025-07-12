import { PrintSettings } from '~/entities/settings/types';
import { ModelAnalysis } from '~/entities/model/types';
import { useEstimationStore } from '~/shared/lib/store';
import { amsManager } from '~/features/ams/AMSManager';
import bambuLabSettings from '~/shared/config/bambulab-settings.json';

export const useEstimation = () => {
  const {
    currentModel,
    modelAnalysis,
    printSettings,
    setEstimation,
    setSlicing,
    setError,
    setSuggestedSettings,
  } = useEstimationStore();

  // AMS 기반 스마트 필라멘트 선택
  const selectOptimalFilament = (classification: string, complexity: string) => {
    return amsManager.selectOptimalFilament(
      classification as 'decorative' | 'functional' | 'assembly',
      complexity as 'low' | 'medium' | 'high'
    );
  };

  // Bambu Lab 설정 기반 프린트 설정 생성
  const createBambuLabSettings = (
    speedMode: 'silent' | 'standard' | 'sport' | 'ludicrous',
    qualityProfile: 'ultraFine' | 'fine' | 'standard' | 'draft',
    filament: any
  ): PrintSettings => {
    const speed = bambuLabSettings.bambuLabProfiles.speedModes[speedMode];
    const quality = bambuLabSettings.bambuLabProfiles.qualityProfiles[qualityProfile];
    
    return {
      id: crypto.randomUUID(),
      name: `${speed.name} + ${quality.description}`,
      layerHeight: quality.layerHeight,
      wallCount: quality.wallCount,
      infillDensity: quality.infillDensity,
      printSpeed: speed.printSpeed,
      nozzleTemperature: filament.material.nozzleTemp.min + 
        ((filament.material.nozzleTemp.max - filament.material.nozzleTemp.min) / 2),
      bedTemperature: filament.material.bedTemp.min + 
        ((filament.material.bedTemp.max - filament.material.bedTemp.min) / 2),
      supportEnabled: quality.supportDensity > 0,
      supportDensity: quality.supportDensity,
      rafts: false,
      brim: false,
      quality: qualityProfile === 'ultraFine' ? 'ultra-fine' : 
               qualityProfile === 'fine' ? 'fine' :
               qualityProfile === 'standard' ? 'standard' : 'draft',
      purpose: 'functional'
    };
  };

  // 향상된 견적 계산 (AMS 및 Bambu Lab 설정 적용)
  const calculateEstimationFromSettings = (settings: PrintSettings, modelVolume: number, selectedFilament: any) => {
    const speedProfile = Object.values(bambuLabSettings.bambuLabProfiles.speedModes)
      .find(mode => mode.printSpeed === settings.printSpeed);
    
    // 레이어 높이와 속도에 따른 정밀한 시간 계산
    const estimatedHeight = Math.max(modelVolume / 100, 50); // 추정 높이 (mm)
    const layerCount = Math.ceil(estimatedHeight / settings.layerHeight);
    
    // Bambu Lab 가속도 설정 반영
    const acceleration = speedProfile?.acceleration || 1000;
    const baseTimePerLayer = (60 * settings.layerHeight) / (settings.printSpeed / 60); // 초/레이어
    const accelerationFactor = 1000 / acceleration; // 가속도가 낮을수록 시간 증가
    const complexityFactor = 1 + (settings.infillDensity / 100) * 0.5;
    
    const printTimeSeconds = layerCount * baseTimePerLayer * accelerationFactor * complexityFactor;
    
    // 정확한 필라멘트 사용량 계산
    const volumeFactor = modelVolume || 50;
    const wallVolume = volumeFactor * 0.1 * settings.wallCount; // 벽 부피
    const infillVolume = volumeFactor * (settings.infillDensity / 100) * 0.9; // 내부 부피
    const supportVolume = settings.supportEnabled ? volumeFactor * 0.1 : 0;
    
    const totalVolumeCm3 = wallVolume + infillVolume + supportVolume;
    const filamentDensity = selectedFilament.material.density;
    const filamentWeightG = totalVolumeCm3 * filamentDensity;
    
    // 1.75mm 필라멘트 길이 계산 (더 정확한 공식)
    const filamentDiameter = selectedFilament.diameter;
    const crossSectionArea = Math.PI * Math.pow(filamentDiameter / 2, 2); // mm²
    const filamentLengthM = (totalVolumeCm3 * 1000) / crossSectionArea / 1000; // m
    
    // AMS 기반 정확한 비용 계산
    const filamentCost = amsManager.calculateFilamentCost(filamentWeightG, selectedFilament.material.type);
    const powerConsumption = printTimeSeconds / 3600 * 0.3; // kWh (300W 프린터 가정)
    const powerCost = powerConsumption * 150; // 원/kWh
    const maintenanceCost = printTimeSeconds / 3600 * 50; // 시간당 유지비
    
    const totalCost = Math.round(filamentCost + powerCost + maintenanceCost);
    
    return {
      printTime: Math.round(printTimeSeconds),
      filamentUsage: {
        length: Math.round(filamentLengthM * 100) / 100,
        weight: Math.round(filamentWeightG * 10) / 10,
      },
      cost: totalCost,
      selectedFilament: selectedFilament,
      breakdown: {
        filamentCost: Math.round(filamentCost),
        powerCost: Math.round(powerCost),
        maintenanceCost: Math.round(maintenanceCost)
      }
    };
  };

  const calculateEstimation = async (settings: PrintSettings) => {
    if (!currentModel || !modelAnalysis) {
      setError('모델 분석이 필요합니다.');
      return;
    }

    setSlicing(true);
    setError(null);

    try {
      // 슬라이싱 시뮬레이션 (복잡도에 따른 시간 조정)
      const complexityMultiplier = {
        'low': 1,
        'medium': 1.5,
        'high': 2
      }[modelAnalysis.complexity] || 1;
      
      const delay = 2000 + (Math.random() * 2000 * complexityMultiplier);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // AMS에서 최적 필라멘트 선택
      const selectedFilament = selectOptimalFilament(
        currentModel.classification || 'functional',
        modelAnalysis.complexity
      );
      
      // 모델 분석 데이터에서 부피 추정
      const estimatedVolume = modelAnalysis.estimatedVolume;
      
      // 향상된 견적 계산
      const result = calculateEstimationFromSettings(settings, estimatedVolume, selectedFilament);
      
      const estimation = {
        printTime: result.printTime,
        filamentUsage: result.filamentUsage,
        cost: result.cost,
        selectedFilament: result.selectedFilament,
        breakdown: result.breakdown,
        // 프론트엔드에서는 실제 G-code 생성 불가
        gcodeUrl: undefined,
      };

      setEstimation(estimation);
      return estimation;

    } catch (error) {
      console.error('Estimation failed:', error);
      setError('견적 계산에 실패했습니다.');
    } finally {
      setSlicing(false);
    }
  };

  // Bambu Lab 프로필 기반 추천 설정 생성
  const generateSuggestedSettings = (analysis: ModelAnalysis, classification?: string) => {
    const suggestions: PrintSettings[] = [];
    
    if (!classification) return suggestions;
    
    // 최적 필라멘트 선택
    const optimalFilament = selectOptimalFilament(
      classification as any,
      analysis.complexity
    );
    
    // 분류별 Bambu Lab 설정 조합
    const settingsCombinations = {
      'decorative': [
        { speed: 'silent', quality: 'fine' },
        { speed: 'standard', quality: 'ultraFine' },
        { speed: 'silent', quality: 'ultraFine' }
      ],
      'functional': [
        { speed: 'standard', quality: 'standard' },
        { speed: 'sport', quality: 'standard' },
        { speed: 'standard', quality: 'fine' }
      ],
      'assembly': [
        { speed: 'sport', quality: 'draft' },
        { speed: 'ludicrous', quality: 'draft' },
        { speed: 'standard', quality: 'standard' }
      ]
    }[classification] || [{ speed: 'standard', quality: 'standard' }];
    
    // 각 조합에 대한 설정 생성
    settingsCombinations.forEach(combo => {
      const setting = createBambuLabSettings(
        combo.speed as any,
        combo.quality as any,
        optimalFilament
      );
      
      // 용도별 이름 설정
      setting.purpose = classification as any;
      suggestions.push(setting);
    });
    
    setSuggestedSettings(suggestions);
    return suggestions;
  };

  const formatPrintTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const formatFilamentUsage = (usage: { length: number; weight: number }): string => {
    return `${usage.length.toFixed(1)}m (${usage.weight.toFixed(1)}g)`;
  };

  return {
    generateSuggestedSettings,
    calculateEstimation,
    formatPrintTime,
    formatFilamentUsage,
    selectOptimalFilament,
    createBambuLabSettings,
  };
};