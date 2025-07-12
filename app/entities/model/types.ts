export interface Model3D {
  id: string;
  name: string;
  size: number; // bytes
  type: "stl" | "3mf" | "obj" | "ply" | "gltf" | "glb";
  file: File;
  createdAt: Date;
  classification?: "decorative" | "functional" | "assembly";
  settings?: Model3MFSettings; // 3MF 파일의 설정 정보
}

// 3MF 파일에서 추출한 프린팅 설정
export interface Model3MFSettings {
  // 프린터 설정
  printer?: {
    name?: string;
    model?: string;
    buildPlate?: {
      width: number;
      height: number;
      depth: number;
    };
  };
  
  // 재료 설정
  filament?: {
    type?: string; // PLA, ABS, PETG 등
    brand?: string;
    color?: string;
    diameter?: number; // 1.75mm, 3.0mm 등
    temperature?: {
      nozzle?: number;
      bed?: number;
    };
  };
  
  // 프린트 설정
  printSettings?: {
    layerHeight?: number;
    infill?: number; // 0-100%
    speed?: {
      print?: number;
      travel?: number;
      first_layer?: number;
    };
    support?: {
      enabled?: boolean;
      type?: string;
      angle?: number;
    };
    retraction?: {
      enabled?: boolean;
      distance?: number;
      speed?: number;
    };
  };
  
  // Bambu Lab 특화 설정
  bambuSettings?: {
    ams?: {
      enabled?: boolean;
      slot?: number;
    };
    timelapse?: boolean;
    flowCalibration?: boolean;
    adaptiveLayers?: boolean;
  };
  
  // 메타데이터
  metadata?: {
    application?: string; // BambuStudio, PrusaSlicer 등
    version?: string;
    creationDate?: string;
    totalTime?: number; // 예상 프린팅 시간 (분)
    filamentUsed?: number; // 사용 필라멘트 길이 (mm)
    filamentWeight?: number; // 사용 필라멘트 무게 (g)
  };
}

export interface ModelGeometry {
  vertices: Float32Array;
  faces: Uint32Array;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface ModelAnalysis {
  complexity: "low" | "medium" | "high";
  supportRequired: boolean;
  estimatedVolume: number; // cm³
  surfaceArea: number; // cm²
  fileFormat?: string;
}
