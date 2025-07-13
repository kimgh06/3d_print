import { useEffect, useRef, useState, useCallback } from "react";
import {
  EmbeddedViewer,
  RGBColor,
  EdgeSettings,
  EnvironmentSettings,
} from "online-3d-viewer";
import {
  parse3MFFile,
  is3MFFile,
  ThreeMFMetadata,
} from "~/shared/lib/3mf-parser";

// EmbeddedViewer 타입 정의 (실제 API에 맞게 수정)
interface OVViewer extends EmbeddedViewer {
  LoadModelFromFileList: (files: File[]) => Promise<void>;
  FitToWindow: (padding?: number, onlyIfNecessary?: boolean) => void;
  SetCamera: (camera: {
    position: number[];
    target: number[];
    up: number[];
  }) => void;
  SetEnvironmentSettings: (settings: unknown) => void;
  GetBoundingBox: () => { min: number[]; max: number[]; size: number[] };
  Resize: () => void;
  Destroy: () => void;
  // 색상 관련 메서드 (타입 정의 확장)
  SetMeshesColor?: (color: { r: number; g: number; b: number }) => void;
  SetMaterialColor?: (
    materialId: string,
    color: { r: number; g: number; b: number }
  ) => void;
  GetMeshes?: () => unknown[];
}

export const useNewOnline3DViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OVViewer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [hasModel, setHasModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string>("Loading");
  const [modelMetadata, setModelMetadata] = useState<ThreeMFMetadata | null>(
    null
  );
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);

  // 초기화 상태 추적
  const [isInitialized, setIsInitialized] = useState(false);

  // 색상 적용 함수들
  const applyModelColors = useCallback(() => {
    if (!viewerRef.current || !modelMetadata?.colorMapping) return;

    console.log("Applying colors to model objects...");

    try {
      // Online3DViewer API를 통한 색상 적용 시도
      const viewer = viewerRef.current as OVViewer;
      if (viewer.SetMeshesColor) {
        Object.entries(modelMetadata.colorMapping).forEach(
          ([objectId, colorHex]) => {
            // 색상 문자열을 RGB 객체로 변환
            const colorMatch = colorHex.match(
              /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
            );
            if (colorMatch && viewer.SetMeshesColor) {
              const rgbColor = {
                r: parseInt(colorMatch[1], 16),
                g: parseInt(colorMatch[2], 16),
                b: parseInt(colorMatch[3], 16),
              };
              console.log(
                `Applying color ${colorHex} to object ${objectId}:`,
                rgbColor
              );
              viewer.SetMeshesColor(rgbColor);
            }
          }
        );
      }
    } catch (error) {
      console.warn("Error applying colors via API:", error);
    }
  }, [modelMetadata?.colorMapping]);

  // CSS 색상 적용 (폴백)
  const applyCSSColors = useCallback(() => {
    if (!modelMetadata?.colorMapping) return;

    console.log("Applying CSS color overrides...");

    // 기존 스타일 제거
    const existingStyle = document.getElementById("model-colors");
    if (existingStyle) {
      existingStyle.remove();
    }

    // 새로운 스타일 생성
    const style = document.createElement("style");
    style.id = "model-colors";

    let css = "";
    Object.entries(modelMetadata.colorMapping).forEach(
      ([objectId, colorHex]) => {
        // 색상이 이미 # 접두사가 있으면 그대로 사용, 없으면 추가
        const normalizedColor = colorHex.startsWith("#")
          ? colorHex
          : `#${colorHex}`;
        css += `
        /* Object ${objectId} color override */
        .ov_model_object_${objectId} {
          color: ${normalizedColor} !important;
        }
      `;
      }
    );

    style.textContent = css;
    document.head.appendChild(style);
  }, [modelMetadata?.colorMapping]);

  // 뷰어 리사이즈 함수
  const resizeViewer = useCallback(() => {
    if (viewerRef.current) {
      try {
        if (typeof (viewerRef.current as any).Resize === "function") {
          (viewerRef.current as any).Resize();
        } else {
          console.warn("Resize method not available on viewer");
        }
      } catch (error) {
        console.warn("Error calling Resize:", error);
      }
    }
  }, []);

  // 초기화 및 설정 - 안정된 종속성으로 변경
  const initializeViewer = useCallback(() => {
    if (!mountRef.current || isInitialized) return;

    try {
      console.log("Initializing Online3DViewer with npm package...");

      // 기존 뷰어 정리
      if (
        viewerRef.current &&
        typeof viewerRef.current === "object" &&
        viewerRef.current !== null &&
        "Destroy" in viewerRef.current
      ) {
        try {
          (viewerRef.current as OVViewer).Destroy();
        } catch (error) {
          console.warn("Error destroying previous viewer:", error);
        }
        viewerRef.current = null;
      }

      // 컨테이너 초기화 - 더 안전한 방식
      if (mountRef.current) {
        // 기존 자식 노드들을 안전하게 제거
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }

      setHasModel(false);
      setModelMetadata(null);
      setCurrentFiles([]);

      // OrcaSlicer 스타일 설정
      const edgeColor = new RGBColor(128, 128, 128);
      const edgeSettings = new EdgeSettings(true, edgeColor, 20);
      const environmentSettings = new EnvironmentSettings([], false);

      // 뷰어 생성
      viewerRef.current = new EmbeddedViewer(mountRef.current, {
        edgeSettings: edgeSettings,
        environmentSettings: environmentSettings,
        onModelLoaded: () => {
          console.log("Model loaded successfully");
          setIsLoadingModel(false);
          setHasModel(true);

          // 뷰어 인스턴스 메서드 확인
          if (viewerRef.current) {
            console.log(
              "Viewer instance methods:",
              Object.getOwnPropertyNames(viewerRef.current)
            );
            console.log(
              "Viewer instance prototype:",
              Object.getOwnPropertyNames(
                Object.getPrototypeOf(viewerRef.current)
              )
            );
          }

          // 모델 로드 후 카메라 자동 조정
          setTimeout(() => {
            if (viewerRef.current) {
              // 안전한 FitToWindow 호출
              try {
                if (
                  typeof (viewerRef.current as any).FitToWindow === "function"
                ) {
                  (viewerRef.current as any).FitToWindow(0.1, false);
                } else {
                  console.warn("FitToWindow method not available on viewer");
                }
              } catch (error) {
                console.warn("Error calling FitToWindow:", error);
              }

              // 색상 적용 (지연 실행)
              setTimeout(() => {
                applyModelColors();
                applyCSSColors();
              }, 500);
            }
          }, 100);
        },
      });

      setLibraryStatus("Initialized");
      setError(null);
      setIsLoading(false);
      setIsInitialized(true);

      console.log("Online3DViewer initialized successfully");
    } catch (err) {
      console.error("Error initializing Online3DViewer:", err);
      setError(
        `Initialization failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setLibraryStatus("Error");
      setIsLoading(false);
      setIsInitialized(false);
    }
  }, [isInitialized]); // 초기화 상태만 의존성으로 사용

  // 라이브러리 로드 및 초기화
  const loadLibrary = useCallback(async () => {
    if (isInitialized) return; // 이미 초기화된 경우 중복 실행 방지

    console.log("Loading Online3DViewer from npm package...");

    try {
      setIsLoading(true);
      setError(null);
      setLibraryStatus("Loading npm package...");

      // npm 패키지는 이미 import되어 있으므로 바로 초기화
      initializeViewer();
    } catch (err) {
      console.error("Error loading Online3DViewer:", err);
      setError(
        `Failed to load Online3DViewer: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setLibraryStatus("Error");
      setIsLoading(false);
    }
  }, [isInitialized, initializeViewer]);

  // 3MF 파일 메타데이터 파싱
  const parseModelMetadata = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (is3MFFile(file)) {
        try {
          console.log(`3MF 파일 파싱 시작: ${file.name}`);
          const metadata = await parse3MFFile(file);
          setModelMetadata(metadata);
          console.log("3MF 메타데이터 파싱 완료:", metadata);

          // 색상 정보가 있는지 확인
          if (
            metadata.colorMapping &&
            Object.keys(metadata.colorMapping).length > 0
          ) {
            console.log("색상 정보 발견:", metadata.colorMapping);
          }
        } catch (error) {
          console.error(`3MF 파일 파싱 오류: ${file.name}`, error);
        }
        break; // 첫 번째 3MF 파일만 처리
      }
    }
  }, []);

  // 3D 모델 로드 함수
  const loadModel = useCallback(
    async (files: File[]) => {
      if (!viewerRef.current) {
        console.error("Viewer not initialized");
        return;
      }

      try {
        setIsLoadingModel(true);
        setError(null);
        setHasModel(false);
        setModelMetadata(null);
        setCurrentFiles(files);

        console.log(
          "Loading model files:",
          files.map((f) => f.name)
        );

        // 3MF 파일 메타데이터 파싱 (병렬로 실행)
        parseModelMetadata(files);

        // 모델 로드
        await (viewerRef.current as OVViewer).LoadModelFromFileList(files);

        console.log("Model loaded successfully");
      } catch (err) {
        console.error("Error loading model:", err);
        setError(
          `Failed to load model: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setIsLoadingModel(false);
        setHasModel(false);
        setModelMetadata(null);
        setCurrentFiles([]);
      }
    },
    [parseModelMetadata]
  );

  // 뷰어 컨트롤 함수들
  const fitToWindow = useCallback((padding = 0.1, onlyIfNecessary = false) => {
    if (viewerRef.current) {
      try {
        if (typeof (viewerRef.current as any).FitToWindow === "function") {
          (viewerRef.current as any).FitToWindow(padding, onlyIfNecessary);
        } else {
          console.warn("FitToWindow method not available on viewer");
        }
      } catch (error) {
        console.warn("Error calling FitToWindow:", error);
      }
    }
  }, []);

  const resetView = useCallback(() => {
    if (viewerRef.current) {
      try {
        if (typeof (viewerRef.current as any).SetCamera === "function") {
          (viewerRef.current as any).SetCamera({
            position: [5, 5, 5],
            target: [0, 0, 0],
            up: [0, 1, 0],
          });
        } else {
          console.warn("SetCamera method not available on viewer");
        }
      } catch (error) {
        console.warn("Error calling SetCamera:", error);
      }
    }
  }, []);

  // 색상 재적용 함수
  const reapplyColors = useCallback(() => {
    console.log("Manually reapplying colors...");
    applyModelColors();
    applyCSSColors();
  }, [applyModelColors, applyCSSColors]);

  // 컴포넌트 마운트 시 라이브러리 로드 - 한 번만 실행
  useEffect(() => {
    if (!isInitialized) {
      loadLibrary();
    }
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 윈도우 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      resizeViewer();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeViewer]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (
        viewerRef.current &&
        typeof viewerRef.current === "object" &&
        viewerRef.current !== null &&
        "Destroy" in viewerRef.current
      ) {
        try {
          (viewerRef.current as OVViewer).Destroy();
        } catch (error) {
          console.warn("Error during viewer cleanup:", error);
        }
        viewerRef.current = null;
      }

      // CSS 스타일 정리
      const styleElement = document.getElementById("model-colors");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  return {
    mountRef,
    isLoading,
    isLoadingModel,
    hasModel,
    error,
    libraryStatus,
    modelMetadata,
    currentFiles,
    loadModel,
    fitToWindow,
    resetView,
    resizeViewer,
    reapplyColors,
  };
};
