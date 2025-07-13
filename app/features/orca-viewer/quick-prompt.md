# OrcaSlicer 뷰어 구현 - 실행 프롬프트

## 즉시 구현 가이드

### 🎯 목표

React + Three.js로 OrcaSlicer 스타일의 웹 3D 뷰어를 구현하세요.

### 📦 필수 패키지 설치

```bash
npm install three @react-three/fiber @react-three/drei
npm install @types/three zustand
npm install three-stdlib
```

### 🏗️ 기본 구조 생성

```typescript
// app/features/orca-viewer/
├── OrcaViewer.tsx       // 메인 컴포넌트
├── NavigationCube.tsx   // 네비게이션 큐브
├── CaliperTool.tsx      // 캘리퍼 도구
├── ScalingTool.tsx      // 스케일링 도구
├── useViewerState.ts    // 상태 관리
└── types.ts            // 타입 정의
```

### 🚀 Phase 1: 기본 뷰어 (우선 구현)

#### 1. 메인 뷰어 컴포넌트

```typescript
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

export const OrcaViewer: React.FC = () => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />
        <Grid />
        {/* 모델 로딩 컴포넌트 */}
        <ModelLoader />
        {/* 네비게이션 큐브 */}
        <NavigationCube />
      </Canvas>
    </div>
  );
};
```

#### 2. 네비게이션 큐브 구현

```typescript
export const NavigationCube: React.FC = () => {
  const cubeRef = useRef<THREE.Mesh>(null);

  const handleFaceClick = (face: string) => {
    // 카메라 위치 변경 로직
    const views = {
      front: [0, 0, 100],
      back: [0, 0, -100],
      left: [-100, 0, 0],
      right: [100, 0, 0],
      top: [0, 100, 0],
      bottom: [0, -100, 0],
    };
    // 애니메이션으로 카메라 이동
  };

  return (
    <group position={[80, 60, 0]}>
      <mesh ref={cubeRef} onClick={() => handleFaceClick("front")}>
        <boxGeometry args={[20, 20, 20]} />
        <meshStandardMaterial color="lightblue" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};
```

#### 3. 캘리퍼 도구 구현

```typescript
export const CaliperTool: React.FC = () => {
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const [isActive, setIsActive] = useState(false);

  const handleClick = (event: THREE.Event) => {
    if (points.length < 2) {
      const newPoint = event.point;
      setPoints([...points, newPoint]);
    }

    if (points.length === 1) {
      // 두 점 사이의 거리 계산
      const distance = points[0].distanceTo(event.point);
      console.log(`거리: ${distance.toFixed(2)}mm`);
    }
  };

  return (
    <>
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}
      {points.length === 2 && (
        <Line points={points} color="red" lineWidth={2} />
      )}
    </>
  );
};
```

### 🎨 Phase 2: 고급 기능 (순차 구현)

#### 4. 스케일링 도구

```typescript
export const ScalingTool: React.FC<{ targetMesh: THREE.Mesh }> = ({
  targetMesh,
}) => {
  const [scale, setScale] = useState(1);
  const [showHandles, setShowHandles] = useState(true);

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    targetMesh.scale.setScalar(newScale);
  };

  return (
    <group>
      {showHandles && (
        <>
          {/* 스케일링 핸들들 */}
          <mesh position={[50, 0, 0]}>
            <sphereGeometry args={[3]} />
            <meshStandardMaterial color="green" />
          </mesh>
          {/* 더 많은 핸들들... */}
        </>
      )}
    </group>
  );
};
```

#### 5. 상태 관리 (Zustand)

```typescript
interface ViewerState {
  models: THREE.Object3D[];
  selectedTool: string;
  measurements: Measurement[];
  cameraPosition: THREE.Vector3;
}

export const useViewerState = create<ViewerState>((set) => ({
  models: [],
  selectedTool: "select",
  measurements: [],
  cameraPosition: new THREE.Vector3(0, 0, 100),

  // 액션들
  addModel: (model: THREE.Object3D) =>
    set((state) => ({ models: [...state.models, model] })),

  setSelectedTool: (tool: string) => set({ selectedTool: tool }),

  addMeasurement: (measurement: Measurement) =>
    set((state) => ({ measurements: [...state.measurements, measurement] })),
}));
```

### 🔧 구현 순서

1. **기본 3D 씬 구성** (1일)

   - Canvas, OrbitControls, 조명 설정
   - 격자 및 축 표시

2. **모델 로딩** (1일)

   - STL 파일 로더
   - 드래그 앤 드롭 기능

3. **네비게이션 큐브** (2일)

   - 기본 큐브 렌더링
   - 클릭 이벤트 처리
   - 카메라 애니메이션

4. **캘리퍼 도구** (2일)

   - 두 점 클릭 시스템
   - 거리 계산 및 표시
   - 기본 스냅 기능

5. **스케일링 도구** (2일)
   - 변환 핸들 시스템
   - 실시간 스케일링
   - 수치 입력 UI

### 🎯 핵심 구현 포인트

#### 거리 측정 정확도

```typescript
const calculateDistance = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  return p1.distanceTo(p2);
};
```

#### 카메라 애니메이션

```typescript
const animateCamera = (targetPosition: THREE.Vector3) => {
  // react-spring 또는 gsap 사용
  // 부드러운 카메라 전환
};
```

#### 스냅 기능

```typescript
const findNearestVertex = (
  point: THREE.Vector3,
  mesh: THREE.Mesh
): THREE.Vector3 => {
  // 가장 가까운 정점 찾기
  // 임계값 내에서 스냅
};
```

### 🚨 중요 고려사항

1. **성능**: 큰 모델에 대한 LOD 시스템 필요
2. **정확도**: 측정 도구의 정밀도 검증 필수
3. **UX**: 직관적인 도구 전환 시스템 구현
4. **반응성**: 실시간 피드백 시스템 구축

### 🧪 테스트 체크리스트

- [ ] STL 파일 로딩 테스트
- [ ] 네비게이션 큐브 모든 면 클릭 테스트
- [ ] 캘리퍼 도구 측정 정확도 테스트
- [ ] 스케일링 도구 변환 테스트
- [ ] 다양한 모델 크기 대응 테스트
- [ ] 성능 벤치마크 테스트

### 💡 참고 자료

- [Three.js 공식 문서](https://threejs.org/docs/)
- [React Three Fiber 문서](https://docs.pmnd.rs/react-three-fiber)
- [Drei 컴포넌트 라이브러리](https://github.com/pmndrs/drei)

이 프롬프트를 따라 단계별로 구현하면 OrcaSlicer 수준의 3D 뷰어를 완성할 수 있습니다!
