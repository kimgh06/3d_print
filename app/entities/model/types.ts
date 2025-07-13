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

// OrcaSlicer 뷰어 기능 타입 정의
export interface OrcaViewerConfig {
  // 3D 뷰어 기본 설정
  viewer: {
    renderMode: "solid" | "wireframe" | "points" | "transparent";
    backgroundColor: string;
    showGrid: boolean;
    showAxes: boolean;
    showBoundingBox: boolean;
    ambientLight: number;
    directionalLight: number;
  };

  // 네비게이션 설정
  navigation: {
    enableNavigationCube: boolean;
    enablePanZoom: boolean;
    enableRotation: boolean;
    mouseWheelZoomSpeed: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
  };

  // 측정 도구 설정
  measurement: {
    enableCaliper: boolean;
    enableRuler: boolean;
    enableAngleMeasurement: boolean;
    measurementPrecision: number; // 소수점 자리수
    showMeasurementLabels: boolean;
    measurementColor: string;
  };

  // 프린트 베드 설정
  printBed: {
    showPrintBed: boolean;
    bedSize: { width: number; height: number; depth: number };
    bedColor: string;
    bedTexture?: string;
    showBedGrid: boolean;
    gridSize: number;
    gridColor: string;
  };
}

// 3D 뷰어 상태 관리
export interface ViewerState {
  // 카메라 상태
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
    rotation: { x: number; y: number; z: number };
  };

  // 선택된 객체들
  selectedObjects: string[]; // 모델 ID 배열

  // 뷰 모드
  viewMode: "model" | "layer" | "support" | "infill" | "analysis";

  // 도구 상태
  activeTool: "select" | "move" | "rotate" | "scale" | "measure" | "section";

  // 레이어 프리뷰 상태 (슬라이싱된 모델용)
  layerPreview?: {
    currentLayer: number;
    totalLayers: number;
    showOnlyCurrentLayer: boolean;
    layerHeight: number;
    animationSpeed: number;
  };
}

// 모델 변환 정보
export interface ModelTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

// 측정 결과
export interface MeasurementResult {
  id: string;
  type: "distance" | "angle" | "area" | "volume";
  points: { x: number; y: number; z: number }[];
  value: number;
  unit: string;
  label?: string;
  color?: string;
  timestamp: Date;
}

// 캘리퍼 도구 설정
export interface CaliperTool {
  id: string;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  distance: number;
  isActive: boolean;
  precision: number;
  snapToVertex: boolean;
  snapToEdge: boolean;
  snapToFace: boolean;
}

// 섹션 분석 도구
export interface SectionAnalysis {
  id: string;
  plane: {
    normal: { x: number; y: number; z: number };
    point: { x: number; y: number; z: number };
  };
  showCrossSection: boolean;
  showInteriorStructure: boolean;
  crossSectionColor: string;
  opacity: number;
}

// 모델 스케일링 도구
export interface ScalingTool {
  mode: "uniform" | "non-uniform" | "dimension-based";
  lockAspectRatio: boolean;
  scaleFromCenter: boolean;
  referencePoint?: { x: number; y: number; z: number };
  targetDimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

// 뷰어 컨트롤 인터페이스
export interface ViewerControls {
  // 기본 네비게이션
  resetView: () => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;

  // 프리셋 뷰
  frontView: () => void;
  backView: () => void;
  leftView: () => void;
  rightView: () => void;
  topView: () => void;
  bottomView: () => void;
  isometricView: () => void;

  // 모델 조작
  selectModel: (modelId: string) => void;
  deselectAll: () => void;
  hideModel: (modelId: string) => void;
  showModel: (modelId: string) => void;

  // 변환 도구
  moveModel: (
    modelId: string,
    position: { x: number; y: number; z: number }
  ) => void;
  rotateModel: (
    modelId: string,
    rotation: { x: number; y: number; z: number }
  ) => void;
  scaleModel: (
    modelId: string,
    scale: { x: number; y: number; z: number }
  ) => void;

  // 측정 도구
  startMeasurement: (type: "distance" | "angle") => void;
  clearMeasurements: () => void;

  // 뷰 모드
  setViewMode: (mode: ViewerState["viewMode"]) => void;

  // 스크린샷/내보내기
  captureScreenshot: (format: "png" | "jpg") => Promise<Blob>;
  exportSTL: (modelId: string) => Promise<Blob>;
}

// 뷰어 이벤트 핸들러
export interface ViewerEventHandlers {
  onModelSelect: (modelId: string) => void;
  onModelDeselect: (modelId: string) => void;
  onModelMove: (modelId: string, transform: ModelTransform) => void;
  onModelRotate: (modelId: string, transform: ModelTransform) => void;
  onModelScale: (modelId: string, transform: ModelTransform) => void;
  onMeasurementComplete: (measurement: MeasurementResult) => void;
  onViewChange: (state: ViewerState) => void;
  onError: (error: string) => void;
}

// 뷰어 성능 설정
export interface ViewerPerformance {
  enableLevelOfDetail: boolean;
  maxTriangles: number;
  enableFrustumCulling: boolean;
  enableOcclusionCulling: boolean;
  antialiasing: boolean;
  shadowsEnabled: boolean;
  reflectionsEnabled: boolean;
  ambientOcclusionEnabled: boolean;
}

// 통합 뷰어 설정
export interface OrcaViewerSettings {
  config: OrcaViewerConfig;
  performance: ViewerPerformance;
  controls: ViewerControls;
  eventHandlers: ViewerEventHandlers;
  state: ViewerState;
}

// 뷰어 플러그인 인터페이스
export interface ViewerPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  initialize: (viewer: OrcaViewerSettings) => void;
  destroy: () => void;
  enabled: boolean;
}

// 뷰어 확장 기능
export interface ViewerExtensions {
  // 애니메이션 기능
  animation: {
    enableRotationAnimation: boolean;
    enableZoomAnimation: boolean;
    animationDuration: number;
    easingFunction: "linear" | "easeInOut" | "easeIn" | "easeOut";
  };

  // 비교 기능
  comparison: {
    enableModelComparison: boolean;
    comparisonMode: "side-by-side" | "overlay" | "difference";
    highlightDifferences: boolean;
    toleranceLevel: number;
  };

  // 주석 기능
  annotation: {
    enableAnnotations: boolean;
    annotationStyle: {
      fontSize: number;
      color: string;
      backgroundColor: string;
      borderColor: string;
    };
  };

  // 키보드 단축키
  shortcuts: {
    [key: string]: () => void;
  };
}

// 메인 뷰어 인터페이스
export interface OrcaViewer {
  // 기본 설정
  settings: OrcaViewerSettings;
  extensions: ViewerExtensions;
  plugins: ViewerPlugin[];

  // 현재 로드된 모델들
  models: Model3D[];

  // 측정 결과들
  measurements: MeasurementResult[];

  // 섹션 분석 결과들
  sections: SectionAnalysis[];

  // 초기화 및 소멸
  initialize: (container: HTMLElement) => Promise<void>;
  destroy: () => void;

  // 모델 관리
  loadModel: (model: Model3D) => Promise<void>;
  unloadModel: (modelId: string) => Promise<void>;

  // 상태 업데이트
  updateState: (newState: Partial<ViewerState>) => void;
  getState: () => ViewerState;

  // 렌더링
  render: () => void;
  resize: (width: number, height: number) => void;
}
