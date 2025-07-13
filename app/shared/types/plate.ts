import * as THREE from "three";

// 기본 좌표 및 변형 타입
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3; // 라디안 단위
  scale: Vector3;
}

// Plate 관련 타입
export interface PlateSize {
  width: number; // mm 단위
  height: number; // mm 단위
}

export interface PlateSettings {
  size: PlateSize;
  gridSize: number; // mm 단위 격자 크기
  showGrid: boolean;
  showBoundary: boolean;
  color: string;
}

// 모델 관련 타입
export interface PlateModel {
  id: string;
  name: string;
  fileName: string;
  file: File;
  mesh?: THREE.Mesh;
  originalMesh?: THREE.Mesh; // 원본 메시 (변형 전)
  transform: Transform;
  boundingBox: THREE.Box3;
  color: string;
  selected: boolean;
  visible: boolean;
  hasCollision: boolean;
  loadingState: "pending" | "loading" | "loaded" | "error";
  errorMessage?: string;
}

// 선택 관련 타입
export interface SelectionState {
  selectedModelIds: string[];
  lastSelectedId?: string;
  multiSelectMode: boolean;
}

// 충돌 관련 타입
export interface CollisionInfo {
  id: string;
  modelIds: string[];
  type: "model-model" | "model-boundary";
  severity: "warning" | "error";
  description: string;
}

// 뷰 모드 타입
export type ViewMode = "perspective" | "top" | "front" | "side";

export interface CameraSettings {
  viewMode: ViewMode;
  position: Vector3;
  target: Vector3;
  zoom: number;
}

// Plate 상태 전체
export interface PlateState {
  settings: PlateSettings;
  models: PlateModel[];
  selection: SelectionState;
  collisions: CollisionInfo[];
  camera: CameraSettings;
  isLoading: boolean;
  error?: string;
}

// 자동 배치 관련 타입
export interface ArrangementOptions {
  spacing: number; // mm 단위 모델 간 최소 거리
  arrangement: "grid" | "packed";
  alignToCenter: boolean;
  respectBoundary: boolean;
}

// 슬라이싱 Export 타입
export interface SlicingExportData {
  plateSize: PlateSize;
  models: Array<{
    id: string;
    fileName: string;
    transform: Transform;
    materialSettings?: {
      color?: string;
      filamentType?: string;
      temperature?: number;
    };
  }>;
  exportTimestamp: string;
  version: string;
}

// 조작 모드 타입
export type TransformMode = "translate" | "rotate" | "scale";

export interface TransformControls {
  mode: TransformMode;
  space: "local" | "world";
  size: number;
  visible: boolean;
}

// 이벤트 핸들러 타입들
export interface PlateViewerEvents {
  onModelSelect: (modelId: string, multiSelect?: boolean) => void;
  onModelTransform: (modelId: string, transform: Transform) => void;
  onModelAdd: (files: File[]) => void;
  onModelDelete: (modelIds: string[]) => void;
  onModelDuplicate: (modelIds: string[]) => void;
  onCollisionDetected: (collisions: CollisionInfo[]) => void;
  onPlateSettingsChange: (settings: PlateSettings) => void;
}

// 유틸리티 타입들
export interface BoundingInfo {
  min: Vector3;
  max: Vector3;
  size: Vector3;
  center: Vector3;
}

export interface ModelStats {
  totalModels: number;
  selectedModels: number;
  loadedModels: number;
  modelsWithCollisions: number;
  plateUtilization: number; // 0-1 사이 값
}

// Raycasting 관련
export interface RaycastResult {
  modelId?: string;
  point: Vector3;
  normal: Vector3;
  distance: number;
}

// 드래그 앤 드롭 관련
export interface DragState {
  isDragging: boolean;
  modelId?: string;
  startPosition?: Vector3;
  currentPosition?: Vector3;
  mode: "move" | "rotate" | "scale";
}

// 성능 관련 설정
export interface PerformanceSettings {
  maxModels: number;
  enableShadows: boolean;
  enableAntialias: boolean;
  pixelRatio: number;
  maxPolyCount: number;
}
