# 웹 기반 3D Plate Viewer 아키텍처 설계

## 🎯 개요

Orca Slicer와 유사한 웹 기반 3D 슬라이서 견적 시스템용 Plate Viewer 구현

## 📊 현재 시스템 분석

### 기존 Online3DViewer 기반 시스템의 한계

- ❌ 단일 모델 뷰어로 설계됨
- ❌ 다중 모델 동시 로드 및 관리 불가
- ❌ 개별 모델 조작 (이동, 회전, 스케일) 제한적
- ❌ Plate 개념 부재
- ❌ 모델 간 상호작용 (충돌 감지) 지원 안함
- ❌ 슬라이서용 데이터 구조 export 불가

### 새로운 요구사항

- ✅ 다중 모델 관리 및 렌더링
- ✅ 256x256mm Plate 시스템
- ✅ 개별 모델 변형 (위치, 회전, 스케일)
- ✅ 마우스 기반 직관적 조작
- ✅ 충돌 감지 및 시각적 경고
- ✅ 자동 배치 알고리즘
- ✅ 슬라이싱용 배치 정보 export

## 🏗️ 새로운 아키텍처 설계

### 기술 스택 결정

```
Frontend 3D Engine: Three.js (직접 사용)
- 이유: 완전한 제어, 다중 모델 관리, 개별 조작 용이
- 대안: Online3DViewer (한계로 인해 부적합)

상태 관리: React Context + useReducer
- PlateContext: Plate 설정 및 전역 상태
- ModelsContext: 모델들의 상태 배열

UI Framework: React + TypeScript + Tailwind CSS
파일 처리: Three.js Loaders (STLLoader, 3MFLoader 등)
```

### 코어 컴포넌트 구조

#### 1. PlateViewer (메인 3D 뷰어)

```typescript
interface PlateViewerProps {
  plateSize: { width: number; height: number }; // mm 단위
  models: PlateModel[];
  selectedModelIds: string[];
  onModelSelect: (modelId: string, multiSelect?: boolean) => void;
  onModelTransform: (modelId: string, transform: Transform) => void;
}
```

#### 2. PlateManager (Plate 상태 관리)

```typescript
interface PlateState {
  size: { width: number; height: number };
  models: PlateModel[];
  selectedModelIds: string[];
  collisions: CollisionInfo[];
  viewMode: "perspective" | "top" | "front" | "side";
}

interface PlateModel {
  id: string;
  name: string;
  file: File;
  mesh: THREE.Mesh;
  transform: Transform;
  boundingBox: THREE.Box3;
  color: string;
  selected: boolean;
  hasCollision: boolean;
  visible: boolean;
}

interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}
```

#### 3. 3D 조작 시스템

```typescript
// TransformControls: 모델 변형 조작
// SelectionManager: 모델 선택 관리
// CameraController: 카메라 조작
// GridHelper: Plate 격자 표시
```

#### 4. 핵심 시스템들

```typescript
// CollisionDetector: 충돌 감지
interface CollisionInfo {
  modelIds: string[];
  type: "model-model" | "model-boundary";
  severity: "warning" | "error";
}

// AutoArranger: 자동 배치
interface ArrangementOptions {
  spacing: number; // mm
  arrangement: "grid" | "packed";
  alignToCenter: boolean;
}

// ExportManager: 슬라이싱용 데이터
interface SlicingExportData {
  plateSize: { width: number; height: number };
  models: {
    id: string;
    fileName: string;
    transform: Transform;
    materialSettings?: any;
  }[];
}
```

### UI 컴포넌트 구조

#### 메인 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ Header (파일 업로드, Plate 설정, Export 버튼)        │
├─────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│ │   Model     │ │   PlateViewer   │ │  Transform  │ │
│ │   List      │ │   (Three.js)    │ │   Panel     │ │
│ │   Panel     │ │                 │ │             │ │
│ │             │ │                 │ │             │ │
│ └─────────────┘ └─────────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────┤
│ Bottom Controls (자동배치, 충돌확인, 카메라 리셋)    │
└─────────────────────────────────────────────────────┘
```

#### 주요 UI 패널들

1. **ModelListPanel**: 로드된 모델 목록, 가시성 토글, 삭제/복제
2. **TransformPanel**: 선택된 모델의 위치/회전/스케일 수치 조정
3. **PlateSettingsPanel**: Plate 크기 설정, 격자 표시 옵션
4. **CollisionPanel**: 충돌 경고 및 해결 제안
5. **ExportPanel**: 슬라이싱용 데이터 export 설정

## 🔄 마이그레이션 계획

### Phase 1: 기반 시스템 구축

1. Three.js 기반 PlateViewer 컴포넌트 생성
2. Plate 시각화 (256x256mm 격자)
3. 기본 카메라 조작 (OrbitControls)

### Phase 2: 모델 관리 시스템

1. 다중 모델 로드 및 렌더링
2. 모델 선택 시스템 (클릭, 복수 선택)
3. 기본 변형 조작 (TransformControls)

### Phase 3: 고급 기능

1. 충돌 감지 시스템
2. 자동 배치 알고리즘
3. UI 패널들 구현

### Phase 4: 통합 및 최적화

1. 기존 3MF 파서 통합
2. 성능 최적화
3. Export 시스템 구현

## 📂 새로운 파일 구조

```
app/
├── features/
│   ├── plate-viewer/
│   │   ├── PlateViewer.tsx          # 메인 3D 뷰어
│   │   ├── usePlateViewer.ts        # Three.js 로직
│   │   ├── hooks/
│   │   │   ├── useModelManager.ts   # 모델 관리
│   │   │   ├── useSelection.ts      # 선택 관리
│   │   │   ├── useTransform.ts      # 변형 조작
│   │   │   └── useCollision.ts      # 충돌 감지
│   │   └── utils/
│   │       ├── collision.ts         # 충돌 감지 알고리즘
│   │       ├── arrangement.ts       # 자동 배치 알고리즘
│   │       └── export.ts           # Export 유틸리티
│   ├── plate-manager/
│   │   ├── PlateManager.ts         # Plate 상태 관리
│   │   └── types.ts               # 타입 정의
│   └── slicer-export/
│       └── ExportManager.ts       # 슬라이싱 데이터 export
├── widgets/
│   ├── plate-viewer/
│   │   ├── PlateViewerWidget.tsx   # 메인 위젯
│   │   ├── ModelListPanel.tsx      # 모델 목록
│   │   ├── TransformPanel.tsx      # 변형 조작 패널
│   │   ├── PlateSettingsPanel.tsx  # Plate 설정
│   │   └── CollisionPanel.tsx      # 충돌 정보
│   └── slicer-controls/
│       ├── ExportPanel.tsx         # Export 패널
│       └── AutoArrangePanel.tsx    # 자동 배치 설정
└── shared/
    ├── three/
    │   ├── loaders/               # Three.js 로더들
    │   ├── helpers/               # Three.js 헬퍼들
    │   └── materials/             # 재질 정의
    └── types/
        └── plate.ts              # Plate 관련 타입들
```

## 🎯 다음 단계

1. ✅ 아키텍처 설계 완료
2. 🔄 Three.js 기반 PlateViewer 컴포넌트 구현
3. 🔄 Plate 시스템 및 격자 시각화
4. 🔄 다중 모델 로드 시스템
