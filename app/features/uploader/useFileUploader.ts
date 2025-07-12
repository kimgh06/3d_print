import { Model3D } from '~/entities/model/types';
import { useEstimationStore } from '~/shared/lib/store';

export const useFileUploader = () => {
  const { 
    setCurrentModel, 
    setUploading, 
    setError,
    setModelAnalysis,
    setAnalyzing,
    setSuggestedSettings
  } = useEstimationStore();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['stl', '3mf', 'obj'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedTypes.includes(extension)) {
      setError('지원되지 않는 파일 형식입니다. STL, 3MF, OBJ 파일만 업로드 가능합니다.');
      return false;
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('파일 크기가 너무 큽니다. 50MB 이하의 파일만 업로드 가능합니다.');
      return false;
    }
    
    return true;
  };

  // 모의 AI 분석 함수 (완전히 프론트엔드에서 처리)
  const mockAnalyzeModel = async (fileName: string, fileSize: number, fileType: string) => {
    // 파일명과 크기, 형식 기반 분류 로직
    const name = fileName.toLowerCase();
    let classification: 'decorative' | 'functional' | 'assembly' = 'functional';
    
    // 파일 형식별 기본 분류
    if (fileType === '3mf') {
      // 3MF는 주로 멀티파트 조립체에 사용
      classification = 'assembly';
    } else if (fileType === 'obj') {
      // OBJ는 주로 텍스처가 있는 장식품에 사용
      classification = 'decorative';
    }
    
    // 파일명 기반 세부 분류
    if (name.includes('vase') || name.includes('statue') || name.includes('art') || 
        name.includes('decoration') || name.includes('ornament') || name.includes('figurine')) {
      classification = 'decorative';
    } else if (name.includes('gear') || name.includes('bracket') || name.includes('housing') ||
               name.includes('assembly') || name.includes('part') || name.includes('tool')) {
      classification = 'assembly';
    } else if (name.includes('prototype') || name.includes('functional') || name.includes('mechanical')) {
      classification = 'functional';
    }

    // 파일 크기 기반 복잡도 추정
    const complexity = fileSize > 10 * 1024 * 1024 ? 'high' : fileSize > 1024 * 1024 ? 'medium' : 'low';
    
    // 파일 형식별 특성 고려
    const formatComplexity = {
      'stl': 1.0,  // 기본
      '3mf': 1.3,  // 더 복잡한 구조
      'obj': 1.2   // 텍스처 포함 가능
    }[fileType] || 1.0;
    
    // 모의 분석 결과
    return {
      complexity,
      supportRequired: classification === 'functional' || complexity === 'high' || fileType === '3mf',
      estimatedVolume: Math.round((fileSize / 1024) * 0.1 * formatComplexity + Math.random() * 100),
      surfaceArea: Math.round((fileSize / 1024) * 0.05 * formatComplexity + Math.random() * 50),
      classification,
      fileFormat: fileType
    };
  };

  // 프론트엔드 전용 설정 생성 함수
  const generateSuggestedSettings = (classification: string, analysis: any) => {
    const baseSettings = {
      layerHeight: 0.2,
      wallCount: 3,
      infillDensity: 20,
      printSpeed: 80,
      nozzleTemperature: 210,
      bedTemperature: 60,
      supportEnabled: false,
      rafts: false,
      brim: false,
      quality: 'standard' as const,
    };

    const settings = [];

    // 분류별 기본 설정
    if (classification === 'decorative') {
      settings.push({
        id: crypto.randomUUID(),
        name: '장식용 고품질 설정',
        ...baseSettings,
        layerHeight: 0.15,
        wallCount: 2,
        infillDensity: 15,
        printSpeed: 60,
        quality: 'fine' as const,
        purpose: 'decorative' as const,
      });
    } else if (classification === 'functional') {
      settings.push({
        id: crypto.randomUUID(),
        name: '기능성 부품 설정',
        ...baseSettings,
        wallCount: 4,
        infillDensity: 40,
        printSpeed: 70,
        supportEnabled: true,
        purpose: 'functional' as const,
      });
    } else {
      settings.push({
        id: crypto.randomUUID(),
        name: '조립체 빠른 출력',
        ...baseSettings,
        layerHeight: 0.25,
        infillDensity: 25,
        printSpeed: 90,
        quality: 'draft' as const,
        purpose: 'assembly' as const,
      });
    }

    // 복잡도별 추가 설정
    if (analysis.complexity === 'high') {
      settings.push({
        id: crypto.randomUUID(),
        name: '정밀 출력 (고복잡도)',
        ...baseSettings,
        layerHeight: 0.1,
        wallCount: 3,
        infillDensity: 30,
        printSpeed: 40,
        supportEnabled: true,
        quality: 'ultra-fine' as const,
        purpose: 'decorative' as const,
      });
    }

    // 서포트 필요시 설정
    if (analysis.supportRequired) {
      settings.push({
        id: crypto.randomUUID(),
        name: '서포트 포함 설정',
        ...baseSettings,
        supportEnabled: true,
        supportDensity: 25,
        printSpeed: 60,
        purpose: 'functional' as const,
      });
    }

    // 빠른 출력 옵션
    settings.push({
      id: crypto.randomUUID(),
      name: '빠른 출력 (드래프트)',
      ...baseSettings,
      layerHeight: 0.3,
      wallCount: 2,
      infillDensity: 10,
      printSpeed: 120,
      quality: 'draft' as const,
      purpose: 'assembly' as const,
    });

    return settings;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;
    
    setError(null);
    setUploading(true);
    
    try {
      const fileType = file.name.split('.').pop()?.toLowerCase() as 'stl' | '3mf' | 'obj';
      
      const model: Model3D = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: fileType,
        file,
        createdAt: new Date(),
      };
      
      setCurrentModel(model);
      
      // 모의 분석 시작
      setAnalyzing(true);
      
      // 파일 형식별 분석 시간 조정
      const analysisTime = {
        'stl': 1500,
        '3mf': 2000,  // 3MF는 더 복잡하므로 시간이 더 걸림
        'obj': 1800   // OBJ도 텍스처 분석 등으로 시간이 더 걸림
      }[fileType] || 1500;
      
      await new Promise(resolve => setTimeout(resolve, analysisTime));
      
      const analysis = await mockAnalyzeModel(file.name, file.size, fileType);
      
      const updatedModel = {
        ...model,
        classification: analysis.classification,
      };
      
      setCurrentModel(updatedModel);
      setModelAnalysis(analysis);
      
      // 추천 설정 생성
      const suggestedSettings = generateSuggestedSettings(analysis.classification, analysis);
      setSuggestedSettings(suggestedSettings);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError('파일 처리에 실패했습니다. 다시 시도해주세요.');
      setCurrentModel(null);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return {
    uploadFile,
    validateFile,
  };
};