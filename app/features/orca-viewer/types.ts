import {
  OrcaViewer,
  ViewerState,
  ViewerPlugin,
} from "../../entities/model/types";

// OrcaSlicer 뷰어 기능 상세 정의

// 1. 3D 네비게이션 큐브 기능
export interface NavigationCube {
  // 네비게이션 큐브 위치 (뷰포트 기준)
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: number; // 픽셀 크기
  opacity: number; // 0-1

  // 큐브 면 정의
  faces: {
    front: { label: string; color: string };
    back: { label: string; color: string };
    left: { label: string; color: string };
    right: { label: string; color: string };
    top: { label: string; color: string };
    bottom: { label: string; color: string };
  };

  // 큐브 모서리 및 꼭짓점 정의
  edges: { label: string; color: string }[];
  corners: { label: string; color: string }[];

  // 애니메이션 설정
  animation: {
    enabled: boolean;
    duration: number; // ms
    easing: "ease-in-out" | "ease-in" | "ease-out" | "linear";
  };

  // 이벤트 핸들러
  onFaceClick: (face: string) => void;
  onEdgeClick: (edge: string) => void;
  onCornerClick: (corner: string) => void;
  onDragStart: (event: MouseEvent) => void;
  onDrag: (event: MouseEvent) => void;
  onDragEnd: (event: MouseEvent) => void;
}

// 2. 캘리퍼 측정 도구 상세 정의
export interface CaliperMeasurement {
  // 측정 모드
  mode: "point-to-point" | "edge-to-edge" | "face-to-face" | "center-to-center";

  // 스냅 기능
  snap: {
    enabled: boolean;
    snapToVertex: boolean;
    snapToEdge: boolean;
    snapToFace: boolean;
    snapToCenter: boolean;
    snapDistance: number; // 픽셀 단위
  };

  // 측정 점들
  points: {
    id: string;
    position: { x: number; y: number; z: number };
    type: "vertex" | "edge" | "face" | "center" | "arbitrary";
    highlightColor: string;
    size: number;
  }[];

  // 측정 결과 표시
  display: {
    showDistance: boolean;
    showCoordinates: boolean;
    showAngles: boolean;
    decimalPlaces: number;
    unit: "mm" | "cm" | "m" | "in" | "ft";
    fontSize: number;
    color: string;
    backgroundColor: string;
    borderColor: string;
  };

  // 스케일링 기능
  scaling: {
    enableAutoScale: boolean;
    targetDimension: number;
    scaleAllAxes: boolean;
    maintainAspectRatio: boolean;
  };
}

// 3. 모델 스케일링 도구 상세 정의
export interface ModelScalingTool {
  // 스케일링 모드
  mode: "uniform" | "non-uniform" | "dimension-based" | "percentage";

  // 기준점 설정
  pivot: {
    type: "center" | "corner" | "custom";
    position?: { x: number; y: number; z: number };
    showPivotPoint: boolean;
    pivotColor: string;
  };

  // 스케일링 핸들
  handles: {
    show: boolean;
    size: number;
    color: string;
    hoverColor: string;
    cornerHandles: boolean;
    edgeHandles: boolean;
    faceHandles: boolean;
  };

  // 제약 조건
  constraints: {
    minScale: number;
    maxScale: number;
    stepSize: number;
    lockAspectRatio: boolean;
    constrainToPositive: boolean;
  };

  // 실시간 피드백
  feedback: {
    showDimensions: boolean;
    showScale: boolean;
    showVolume: boolean;
    showBoundingBox: boolean;
    updateRate: number; // ms
  };
}

// 4. 섹션 분석 도구 상세 정의
export interface SectionAnalysisTool {
  // 절단면 정의
  cuttingPlane: {
    normal: { x: number; y: number; z: number };
    point: { x: number; y: number; z: number };
    size: { width: number; height: number };
  };

  // 절단면 조작
  manipulation: {
    enableDragging: boolean;
    enableRotation: boolean;
    enableResizing: boolean;
    showPlaneHandles: boolean;
    handleSize: number;
    handleColor: string;
  };

  // 단면 표시 옵션
  crossSection: {
    showCrossSection: boolean;
    fillColor: string;
    edgeColor: string;
    edgeWidth: number;
    opacity: number;
    showHatching: boolean;
    hatchingPattern: "horizontal" | "vertical" | "diagonal" | "cross";
  };

  // 내부 구조 표시
  interior: {
    showInterior: boolean;
    interiorColor: string;
    interiorOpacity: number;
    showInfillPattern: boolean;
    infillColor: string;
    showSupports: boolean;
    supportColor: string;
  };

  // 애니메이션 기능
  animation: {
    enableSweep: boolean;
    sweepSpeed: number;
    sweepDirection: "x" | "y" | "z";
    autoReverse: boolean;
    pauseOnComplete: boolean;
  };
}

// 5. 레이어 프리뷰 상세 정의
export interface LayerPreview {
  // 레이어 데이터
  layers: {
    id: number;
    height: number;
    thickness: number;
    toolpath: {
      type: "perimeter" | "infill" | "support" | "brim" | "skirt";
      points: { x: number; y: number; z: number }[];
      width: number;
      speed: number;
      color: string;
    }[];
    estimatedTime: number; // seconds
    filamentUsage: number; // mm
  }[];

  // 표시 옵션
  display: {
    showPerimeters: boolean;
    showInfill: boolean;
    showSupports: boolean;
    showBrim: boolean;
    showSkirt: boolean;
    showTravelMoves: boolean;
    showRetractions: boolean;
    lineWidth: number;
    opacity: number;
  };

  // 애니메이션 컨트롤
  animation: {
    isPlaying: boolean;
    speed: number; // 1x, 2x, 0.5x etc.
    loop: boolean;
    showPrintHead: boolean;
    printHeadColor: string;
    printHeadSize: number;
  };

  // 분석 도구
  analysis: {
    showLayerTimes: boolean;
    showFilamentUsage: boolean;
    showRetractions: boolean;
    showSpeedChanges: boolean;
    highlightProblems: boolean;
    problemTypes: string[];
  };
}

// 6. 뷰어 도구모음 정의
export interface ViewerToolbar {
  // 도구 그룹
  groups: {
    id: string;
    name: string;
    icon: string;
    tools: ViewerTool[];
    collapsed: boolean;
  }[];

  // 도구모음 위치
  position: "top" | "bottom" | "left" | "right" | "floating";
  orientation: "horizontal" | "vertical";

  // 스타일링
  style: {
    backgroundColor: string;
    borderColor: string;
    iconSize: number;
    spacing: number;
    padding: number;
    borderRadius: number;
  };
}

export interface ViewerTool {
  id: string;
  name: string;
  icon: string;
  tooltip: string;
  shortcut?: string;
  enabled: boolean;
  active: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  submenu?: ViewerTool[];
}

// 7. 뷰어 상태 관리 상세 정의
export interface ViewerStateManager {
  // 상태 스택 (Undo/Redo)
  stateStack: ViewerState[];
  currentStateIndex: number;
  maxStackSize: number;

  // 상태 변경 추적
  changeTracking: {
    enabled: boolean;
    trackCameraMovement: boolean;
    trackModelTransforms: boolean;
    trackSelections: boolean;
    trackMeasurements: boolean;
    autoSaveInterval: number; // ms
  };

  // 상태 직렬화
  serialize: () => string;
  deserialize: (state: string) => void;

  // 상태 관리 메서드
  pushState: (state: ViewerState) => void;
  popState: () => ViewerState | null;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;

  // 이벤트 핸들러
  onStateChange: (oldState: ViewerState, newState: ViewerState) => void;
  onUndoRedo: (action: "undo" | "redo", state: ViewerState) => void;
}

// 8. 성능 모니터링 및 최적화
export interface ViewerPerformanceMonitor {
  // 성능 메트릭
  metrics: {
    fps: number;
    renderTime: number; // ms
    triangleCount: number;
    drawCalls: number;
    memoryUsage: number; // MB
    gpuMemoryUsage: number; // MB
  };

  // 최적화 설정
  optimization: {
    enableLOD: boolean;
    lodLevels: number[];
    enableFrustumCulling: boolean;
    enableOcclusionCulling: boolean;
    enableBatching: boolean;
    maxBatchSize: number;
    enableInstancedRendering: boolean;
  };

  // 품질 설정
  quality: {
    antialiasing: "none" | "fxaa" | "msaa-2x" | "msaa-4x" | "msaa-8x";
    shadows: "none" | "basic" | "soft" | "pcf";
    reflections: "none" | "basic" | "ssr";
    ambientOcclusion: "none" | "ssao" | "hbao";
    postProcessing: boolean;
  };

  // 자동 품질 조정
  autoQuality: {
    enabled: boolean;
    targetFPS: number;
    adjustmentInterval: number; // ms
    minQuality: number;
    maxQuality: number;
  };
}

// 9. 뷰어 플러그인 시스템
export interface ViewerPluginSystem {
  // 플러그인 관리
  plugins: Map<string, ViewerPlugin>;

  // 플러그인 로드/언로드
  loadPlugin: (plugin: ViewerPlugin) => Promise<boolean>;
  unloadPlugin: (pluginId: string) => Promise<boolean>;

  // 플러그인 이벤트 시스템
  eventBus: {
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    off: (event: string, callback: (...args: unknown[]) => void) => void;
    emit: (event: string, data: unknown) => void;
  };

  // 플러그인 API
  api: {
    getViewer: () => OrcaViewer;
    getState: () => ViewerState;
    updateState: (newState: Partial<ViewerState>) => void;
    addTool: (tool: ViewerTool) => void;
    removeTool: (toolId: string) => void;
    registerShortcut: (key: string, action: () => void) => void;
    showNotification: (
      message: string,
      type: "info" | "warning" | "error"
    ) => void;
  };
}

// 10. 메인 뷰어 컴포넌트 인터페이스
export interface OrcaViewerComponent {
  // 뷰어 인스턴스
  viewer: OrcaViewer;

  // 주요 기능 모듈
  navigationCube: NavigationCube;
  caliperTool: CaliperMeasurement;
  scalingTool: ModelScalingTool;
  sectionAnalysis: SectionAnalysisTool;
  layerPreview: LayerPreview;
  toolbar: ViewerToolbar;
  stateManager: ViewerStateManager;
  performanceMonitor: ViewerPerformanceMonitor;
  pluginSystem: ViewerPluginSystem;

  // 생명주기 메서드
  mount: (container: HTMLElement) => Promise<void>;
  unmount: () => void;
  update: (props: Partial<OrcaViewerComponent>) => void;

  // 이벤트 시스템
  addEventListener: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
  removeEventListener: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
  dispatchEvent: (event: string, data: unknown) => void;
}
