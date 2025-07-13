import { useEffect, useRef, useState, useCallback } from "react";
import { Model3D } from "~/entities/model/types";

// Online3DViewer 임포트 (타입 정의 임시)
declare global {
  interface Window {
    OV: any;
  }
}

export const useOnline3DViewer = (model: Model3D | null) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeViewer = useCallback(() => {
    if (!mountRef.current || !window.OV) return;

    // Online3DViewer 초기화
    const viewer = new window.OV.EmbeddedViewer(mountRef.current, {
      backgroundColor: new window.OV.Color(42, 42, 42), // 어두운 배경
      defaultColor: new window.OV.Color(200, 200, 200),
      edgeSettings: new window.OV.EdgeSettings(
        false,
        new window.OV.Color(0, 0, 0),
        1
      ),
      environmentSettings: new window.OV.EnvironmentSettings(
        [
          "model/cube/posx.jpg",
          "model/cube/negx.jpg",
          "model/cube/posy.jpg",
          "model/cube/negy.jpg",
          "model/cube/posz.jpg",
          "model/cube/negz.jpg",
        ],
        false
      ),
    });

    viewerRef.current = viewer;

    // 뷰어 리사이즈
    viewer.Resize();

    console.log("Online3DViewer initialized successfully");
  }, []);

  const loadModel = useCallback(async (file: File) => {
    if (!viewerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Loading model with Online3DViewer: ${file.name}`);

      // Online3DViewer의 강력한 파일 파싱 사용
      const fileList = [file];
      await viewerRef.current.LoadModelFromFileList(fileList);

      // 3MF 파일의 경우 추가 처리
      if (file.name.toLowerCase().endsWith(".3mf")) {
        console.log("3MF file loaded successfully with Online3DViewer");
        // OrcaSlicer 호환 모드 설정
        applyOrcaSlicerCompatibility();
      }

      // 모델 핏 투 윈도우
      viewerRef.current.FitToWindow(0.9, true);
    } catch (error) {
      console.error("Failed to load model with Online3DViewer:", error);
      setError(error instanceof Error ? error.message : "모델 로딩 실패");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyOrcaSlicerCompatibility = useCallback(() => {
    if (!viewerRef.current) return;

    // OrcaSlicer 스타일 설정 적용
    console.log("Applying OrcaSlicer compatibility settings");

    // 카메라 설정
    viewerRef.current.SetCamera({
      position: [200, 200, 200],
      target: [0, 0, 0],
      up: [0, 1, 0],
    });

    // 그리드 표시
    viewerRef.current.SetEnvironmentSettings({
      backgroundColor: new window.OV.Color(42, 42, 42),
      gridVisible: true,
      gridColor: new window.OV.Color(100, 100, 100),
    });
  }, []);

  // 컴포넌트 마운트 시 뷰어 초기화
  useEffect(() => {
    // Online3DViewer 스크립트 동적 로딩
    const script = document.createElement("script");
    script.src = "https://3dviewer.net/libs/o3dv/o3dv.min.js";
    script.onload = () => {
      initializeViewer();
    };
    document.head.appendChild(script);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.Destroy();
      }
      // 스크립트 정리
      const existingScript = document.querySelector(
        'script[src*="o3dv.min.js"]'
      );
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [initializeViewer]);

  // 모델 변경 시 로딩
  useEffect(() => {
    if (model?.file) {
      loadModel(model.file);
    }
  }, [model, loadModel]);

  return {
    mountRef,
    isLoading,
    error,
    viewer: viewerRef.current,
    // OrcaSlicer 호환 기능들
    applyOrcaSlicerCompatibility,
    loadModel,
  };
};
