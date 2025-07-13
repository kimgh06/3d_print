# OrcaSlicer 뷰어 구현 프롬프트

## 프로젝트 개요

React + TypeScript + Three.js 기반의 웹 3D 프린팅 뷰어를 구현합니다. OrcaSlicer의 핵심 뷰어 기능들을 웹 환경에서 재현하는 것이 목표입니다.

## 기술 스택

- **Frontend**: React 18+ with TypeScript
- **3D 렌더링**: Three.js + React Three Fiber + Drei
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS
- **파일 처리**: three-stdlib, 3mf-parser
- **애니메이션**: Framer Motion

## 구현해야 할 핵심 기능

### 1. 기본 3D 뷰어 시스템

```typescript
// 필요한 컴포넌트 구조
OrcaViewer/
├── Core/
│   ├── Scene.tsx          // Three.js 씬 관리
│   ├── Camera.tsx         // 카메라 컨트롤
│   ├── ModelLoader.tsx    // 3D 모델 로딩
│   └── Renderer.tsx       // 렌더링 관리
├── Tools/
│   ├── NavigationCube.tsx // 네비게이션 큐브
│   ├── CaliperTool.tsx    // 캘리퍼 측정 도구
│   ├── ScalingTool.tsx    // 스케일링 도구
│   └── SectionTool.tsx    // 섹션 분석 도구
├── UI/
│   ├── Toolbar.tsx        // 도구모음
│   ├── PropertyPanel.tsx  // 속성 패널
│   └── StatusBar.tsx      // 상태 표시
└── index.tsx              // 메인 컴포넌트
```

### 2. 네비게이션 큐브 구현 요구사항

**목표**: Fusion 360 스타일의 직관적인 3D 네비게이션

**기능 명세**:

- 뷰포트 우측 상단에 위치하는 3D 큐브
- 6개 면, 12개 모서리, 8개 꼭짓점 클릭 가능
- 클릭 시 해당 방향으로 카메라 부드럽게 이동
- 드래그로 자유 회전 가능
- 투명도 조절 가능 (기본값: 0.8)

**구현 세부사항**:

```typescript
interface NavigationCubeProps {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: number; // 픽셀 크기
  opacity: number; // 0-1
  onViewChange: (view: string) => void;
}

// 필요한 뷰 프리셋
const VIEWS = {
  front: { position: [0, 0, 100], target: [0, 0, 0] },
  back: { position: [0, 0, -100], target: [0, 0, 0] },
  left: { position: [-100, 0, 0], target: [0, 0, 0] },
  right: { position: [100, 0, 0], target: [0, 0, 0] },
  top: { position: [0, 100, 0], target: [0, 0, 0] },
  bottom: { position: [0, -100, 0], target: [0, 0, 0] },
  isometric: { position: [50, 50, 50], target: [0, 0, 0] },
};
```

### 3. 캘리퍼 측정 도구 구현 요구사항

**목표**: 정밀한 3D 모델 측정 및 자동 스케일링

**기능 명세**:

- 두 점 간 거리 측정 (mm 단위)
- 정점/모서리/면에 자동 스냅
- 측정값 실시간 표시
- 측정값 기반 모델 자동 스케일링
- 여러 측정값 동시 표시 가능

**구현 세부사항**:

```typescript
interface CaliperMeasurement {
  id: string;
  startPoint: Vector3;
  endPoint: Vector3;
  distance: number;
  unit: "mm" | "cm" | "m" | "in";
  snapEnabled: boolean;
  precision: number; // 소수점 자리수
}

// 스냅 기능
interface SnapTarget {
  type: "vertex" | "edge" | "face" | "center";
  position: Vector3;
  normal?: Vector3;
  distance: number; // 마우스로부터의 거리
}
```

### 4. 모델 스케일링 도구 구현 요구사항

**목표**: 직관적이고 정확한 모델 크기 조정

**기능 명세**:

- 균등/비균등 스케일링 지원
- 치수 기반 스케일링 (특정 치수를 입력값으로 사용)
- 실시간 바운딩 박스 표시
- 변환 핸들 시각화
- 종횡비 잠금 기능

**구현 세부사항**:

```typescript
interface ScalingToolProps {
  mode: "uniform" | "non-uniform" | "dimension-based";
  showHandles: boolean;
  showBoundingBox: boolean;
  lockAspectRatio: boolean;
  onScaleChange: (scale: Vector3) => void;
}

// 변환 핸들 타입
interface TransformHandle {
  type: "corner" | "edge" | "face";
  position: Vector3;
  direction: Vector3;
  color: string;
  size: number;
}
```

### 5. 섹션 분석 도구 구현 요구사항

**목표**: 3D 모델의 내부 구조 시각화

**기능 명세**:

- 절단면 생성 및 조작
- 절단면 위치/각도 실시간 조정
- 단면 하이라이트 표시
- 내부 구조 시각화
- 애니메이션 스위프 기능

**구현 세부사항**:

```typescript
interface SectionPlane {
  normal: Vector3;
  point: Vector3;
  size: { width: number; height: number };
  visible: boolean;
  color: string;
  opacity: number;
}

interface SectionAnalysisProps {
  plane: SectionPlane;
  showCrossSection: boolean;
  showInterior: boolean;
  animationEnabled: boolean;
  onPlaneChange: (plane: SectionPlane) => void;
}
```

## 단계별 구현 계획

### Phase 1: 기본 인프라 (1-2주)

1. **프로젝트 세팅**

   - React + TypeScript + Three.js 환경 구성
   - 필요한 라이브러리 설치 및 설정
   - 기본 프로젝트 구조 생성

2. **3D 씬 기본 구성**

   - Three.js 씬, 카메라, 렌더러 설정
   - 기본 조명 시스템 구성
   - 격자 및 축 표시 기능

3. **모델 로딩 시스템**
   - STL, OBJ 파일 로더 구현
   - 드래그 앤 드롭 파일 업로드
   - 로딩 프로그레스 표시

### Phase 2: 네비게이션 시스템 (1-2주)

1. **기본 카메라 컨트롤**

   - 마우스 기반 회전, 줌, 팬 기능
   - 터치 제스처 지원
   - 카메라 상태 저장/복원

2. **네비게이션 큐브**

   - 3D 큐브 렌더링
   - 면/모서리/꼭짓점 클릭 감지
   - 뷰 전환 애니메이션

3. **기본 도구모음**
   - 뷰 리셋 버튼
   - 렌더링 모드 전환
   - 기본 설정 패널

### Phase 3: 측정 및 조작 기능 (2-3주)

1. **캘리퍼 도구**

   - 두 점 클릭 측정
   - 거리 계산 및 표시
   - 기본 스냅 기능

2. **모델 변환 도구**

   - 이동, 회전, 스케일링 핸들
   - 실시간 변환 피드백
   - 수치 입력 지원

3. **측정값 관리**
   - 측정값 목록 표시
   - 측정값 저장/불러오기
   - 측정값 기반 스케일링

### Phase 4: 고급 기능 (2-3주)

1. **섹션 분석**

   - 절단면 생성 및 조작
   - 단면 시각화
   - 내부 구조 표시

2. **성능 최적화**

   - LOD 시스템 구현
   - 렌더링 최적화
   - 메모리 관리

3. **추가 기능**
   - 스크린샷 기능
   - 모델 내보내기
   - 설정 저장/불러오기

## 구현 체크리스트

### 기본 기능

- [ ] Three.js 씬 구성 완료
- [ ] 3D 모델 로딩 (STL, OBJ) 완료
- [ ] 기본 카메라 컨트롤 완료
- [ ] 네비게이션 큐브 구현 완료
- [ ] 기본 도구모음 완료

### 측정 기능

- [ ] 캘리퍼 도구 기본 기능 완료
- [ ] 거리 측정 정확도 검증 완료
- [ ] 스냅 기능 구현 완료
- [ ] 측정값 표시 UI 완료
- [ ] 자동 스케일링 기능 완료

### 모델 조작

- [ ] 변환 핸들 시각화 완료
- [ ] 이동 도구 완료
- [ ] 회전 도구 완료
- [ ] 스케일링 도구 완료
- [ ] 수치 입력 인터페이스 완료

### 고급 기능

- [ ] 섹션 분석 도구 완료
- [ ] 성능 최적화 완료
- [ ] 에러 처리 완료
- [ ] 사용자 경험 개선 완료
- [ ] 테스트 케이스 작성 완료

## 코드 구조 예시

```typescript
// 메인 뷰어 컴포넌트
export const OrcaViewer: React.FC<OrcaViewerProps> = ({
  config,
  onModelLoad,
  onMeasurementComplete,
  onError,
}) => {
  const [viewerState, setViewerState] = useViewerState();
  const [selectedTool, setSelectedTool] = useState<string>("select");

  return (
    <div className="w-full h-full relative">
      {/* 3D 씬 */}
      <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
        <Scene
          models={viewerState.models}
          activeTool={selectedTool}
          onSelectionChange={handleSelectionChange}
        />
        <NavigationCube position="top-right" onViewChange={handleViewChange} />
      </Canvas>

      {/* UI 오버레이 */}
      <Toolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        tools={config.tools}
      />

      <PropertyPanel
        selectedObjects={viewerState.selectedObjects}
        measurements={viewerState.measurements}
        onPropertyChange={handlePropertyChange}
      />

      <StatusBar
        renderingStats={viewerState.renderingStats}
        modelInfo={viewerState.modelInfo}
      />
    </div>
  );
};
```

## 테스트 요구사항

### 단위 테스트

- 측정 정확도 검증
- 좌표 변환 정확성
- 파일 로딩 안정성

### 통합 테스트

- 도구 간 상호작용
- 성능 벤치마크
- 메모리 사용량 모니터링

### 사용자 테스트

- 직관적인 UI/UX
- 반응성 및 성능
- 크로스 브라우저 호환성

## 성공 기준

1. **기능적 요구사항**

   - 모든 핵심 기능이 OrcaSlicer와 동등한 수준으로 작동
   - 측정 정확도 99.9% 이상
   - 파일 로딩 성공률 95% 이상

2. **성능 요구사항**

   - 60fps 이상 렌더링 성능
   - 10MB 이하 모델 파일 5초 이내 로딩
   - 메모리 사용량 500MB 이하

3. **사용자 경험 요구사항**
   - 직관적인 UI/UX
   - 반응성 있는 인터랙션
   - 안정적인 동작

이 프롬프트를 따라 구현하면 OrcaSlicer의 핵심 뷰어 기능을 웹 환경에서 성공적으로 재현할 수 있습니다.
