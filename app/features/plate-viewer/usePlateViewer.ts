import { useRef, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import {
  PlateSettings,
  PlateModel,
  Transform,
  CollisionInfo,
} from "~/shared/types/plate";
import { PlateHelper } from "~/shared/three/helpers/PlateHelper";
import { ModelHelper, ColorUtils } from "~/shared/three/helpers/ModelHelper";

interface UsePlateViewerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  onModelSelect?: (modelId: string, multiSelect?: boolean) => void;
  onModelTransform?: (modelId: string, transform: Transform) => void;
  onCollisionDetected?: (collisions: CollisionInfo[]) => void;
}

export const usePlateViewer = ({
  containerRef,
  onModelSelect,
  onModelTransform,
  onCollisionDetected,
}: UsePlateViewerOptions) => {
  // Three.js 핵심 객체들
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseRef = useRef<THREE.Vector2>();

  // 헬퍼 클래스들
  const plateHelperRef = useRef<PlateHelper>();
  const modelHelperRef = useRef<ModelHelper>();

  // 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModels, setCurrentModels] = useState<PlateModel[]>([]);
  const [plateSettings, setPlateSettings] = useState<PlateSettings>();

  // 초기화
  const initializeViewer = useCallback(
    (settings: PlateSettings, width: number, height: number) => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Scene 생성
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        // Camera 생성
        const camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(30, 30, 30);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer 생성
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        // Controls 생성
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.maxPolarAngle = Math.PI * 0.8; // 바닥 뚫고 들어가지 않도록
        controlsRef.current = controls;

        // Raycaster 및 Mouse 생성
        raycasterRef.current = new THREE.Raycaster();
        mouseRef.current = new THREE.Vector2();

        // 조명 설정
        setupLighting(scene);

        // Plate 헬퍼 생성
        const plateHelper = new PlateHelper();
        plateHelperRef.current = plateHelper;

        // 모델 헬퍼 생성
        modelHelperRef.current = ModelHelper.getInstance();

        // Plate 생성
        const plateGroup = plateHelper.createPlate(settings);
        scene.add(plateGroup);
        setPlateSettings(settings);

        // DOM에 추가
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(renderer.domElement);

        // 마우스 이벤트 설정
        setupMouseEvents(renderer.domElement);

        // 애니메이션 루프 시작
        startAnimationLoop();

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing viewer:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    },
    [containerRef]
  );

  // 조명 설정
  const setupLighting = (scene: THREE.Scene) => {
    // 환경광
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // 주 조명
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 보조 조명
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
  };

  // 마우스 이벤트 설정
  const setupMouseEvents = (element: HTMLElement) => {
    const handleMouseClick = (event: MouseEvent) => {
      if (!mouseRef.current || !raycasterRef.current || !cameraRef.current)
        return;

      const rect = element.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // 모델들과의 교차점 찾기
      const modelMeshes = currentModels
        .filter((model) => model.mesh && model.visible)
        .map((model) => model.mesh!);

      const intersects = raycasterRef.current.intersectObjects(modelMeshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const clickedModel = currentModels.find(
          (model) => model.mesh === clickedMesh
        );

        if (clickedModel && onModelSelect) {
          onModelSelect(clickedModel.id, event.ctrlKey || event.metaKey);
        }
      }
    };

    element.addEventListener("click", handleMouseClick);

    // 정리 함수 반환 (useEffect에서 사용)
    return () => {
      element.removeEventListener("click", handleMouseClick);
    };
  };

  // 애니메이션 루프
  const startAnimationLoop = () => {
    const animate = () => {
      requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
  };

  // 모델 로드
  const loadModels = useCallback(
    async (models: PlateModel[]) => {
      if (!sceneRef.current || !modelHelperRef.current) return;

      try {
        setIsLoading(true);

        // 기존 모델들 제거
        currentModels.forEach((model) => {
          if (model.mesh) {
            sceneRef.current!.remove(model.mesh);
            ModelHelper.disposeMesh(model.mesh);
            ColorUtils.releaseColor(model.color);
          }
        });

        // 새 모델들 로드
        const loadedModels: PlateModel[] = [];

        for (const model of models) {
          try {
            if (!model.mesh) {
              // 모델이 아직 로드되지 않았다면 로드
              const mesh = await modelHelperRef.current!.loadModelFromFile(
                model.file
              );

              // 색상 설정
              const color = model.color || ColorUtils.getNextAvailableColor();
              ModelHelper.setModelColor(mesh, color);

              // 변형 적용
              ModelHelper.applyTransform(mesh, model.transform);

              // Plate에 스냅
              ModelHelper.snapToPlate(mesh);

              // 경계 박스 계산
              const boundingBox = ModelHelper.calculateBoundingBox(mesh);

              // Scene에 추가
              sceneRef.current!.add(mesh);

              loadedModels.push({
                ...model,
                mesh,
                boundingBox,
                color,
                loadingState: "loaded",
              });
            } else {
              // 이미 로드된 모델
              loadedModels.push(model);
            }
          } catch (error) {
            console.error(`Error loading model ${model.name}:`, error);
            loadedModels.push({
              ...model,
              loadingState: "error",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        setCurrentModels(loadedModels);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading models:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
      }
    },
    [currentModels]
  );

  // Plate 설정 업데이트
  const updatePlateSettings = useCallback((settings: PlateSettings) => {
    if (!plateHelperRef.current || !sceneRef.current) return;

    plateHelperRef.current.updateSettings(settings);
    setPlateSettings(settings);
  }, []);

  // 모델 선택
  const selectModel = useCallback(
    (modelId: string, selected: boolean) => {
      const model = currentModels.find((m) => m.id === modelId);
      if (model?.mesh) {
        ModelHelper.setModelSelected(model.mesh, selected);
      }
    },
    [currentModels]
  );

  // 모델 변형
  const transformModel = useCallback(
    (modelId: string, transform: Transform) => {
      const model = currentModels.find((m) => m.id === modelId);
      if (model?.mesh) {
        ModelHelper.applyTransform(model.mesh, transform);

        // 변형 이벤트 알림
        if (onModelTransform) {
          onModelTransform(modelId, transform);
        }
      }
    },
    [currentModels, onModelTransform]
  );

  // 모델 삭제
  const deleteModel = useCallback(
    (modelIds: string[]) => {
      if (!sceneRef.current) return;

      modelIds.forEach((id) => {
        const model = currentModels.find((m) => m.id === id);
        if (model?.mesh) {
          sceneRef.current!.remove(model.mesh);
          ModelHelper.disposeMesh(model.mesh);
          ColorUtils.releaseColor(model.color);
        }
      });

      const remainingModels = currentModels.filter(
        (m) => !modelIds.includes(m.id)
      );
      setCurrentModels(remainingModels);
    },
    [currentModels]
  );

  // 모델 복제
  const duplicateModel = useCallback(
    (modelIds: string[]) => {
      if (!sceneRef.current) return;

      const newModels: PlateModel[] = [];

      modelIds.forEach((id) => {
        const model = currentModels.find((m) => m.id === id);
        if (model?.mesh) {
          const clonedMesh = ModelHelper.cloneModel(model.mesh);
          const newColor = ColorUtils.getNextAvailableColor();
          ModelHelper.setModelColor(clonedMesh, newColor);

          // 약간 옆으로 이동
          clonedMesh.position.x += 2;

          sceneRef.current!.add(clonedMesh);

          newModels.push({
            ...model,
            id: `${model.id}_copy_${Date.now()}`,
            name: `${model.name} (Copy)`,
            mesh: clonedMesh,
            color: newColor,
            selected: false,
            boundingBox: ModelHelper.calculateBoundingBox(clonedMesh),
          });
        }
      });

      setCurrentModels([...currentModels, ...newModels]);
    },
    [currentModels]
  );

  // 자동 배치 (기본 구현)
  const arrangeModels = useCallback(() => {
    // TODO: 자동 배치 알고리즘 구현
    console.log("Auto arrange models - TODO");
  }, []);

  // Plate 데이터 export
  const exportPlateData = useCallback(() => {
    // TODO: Export 기능 구현
    console.log("Export plate data - TODO");
  }, []);

  // 뷰 조작
  const fitToView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    // TODO: 모든 모델이 보이도록 카메라 조정
    controlsRef.current.reset();
  }, []);

  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    controlsRef.current.reset();
  }, []);

  // 정리
  useEffect(() => {
    return () => {
      // 리소스 정리
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      currentModels.forEach((model) => {
        if (model.mesh) {
          ModelHelper.disposeMesh(model.mesh);
        }
        ColorUtils.releaseColor(model.color);
      });

      ColorUtils.reset();
    };
  }, []);

  return {
    initializeViewer,
    loadModels,
    updatePlateSettings,
    selectModel,
    transformModel,
    deleteModel,
    duplicateModel,
    arrangeModels,
    exportPlateData,
    fitToView,
    resetView,
    isLoading,
    error,
  };
};
