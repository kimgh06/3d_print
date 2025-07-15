import { useRef, useCallback, useState, useEffect } from "react";
import { useNewOnline3DViewer } from "~/features/preview/useNewOnline3DViewer";
import { ModelInfoPanel } from "./ModelInfoPanel";
import { ColorPalette } from "./ColorPalette";
import {
  getJSSlicer,
  SlicerSettings,
  SlicingResult,
} from "~/shared/lib/js-slicer";

// 임시 팔레트 (실제 색상 배열로 대체 가능)
const DEFAULT_PALETTE = [
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 255, g: 255, b: 0 },
  { r: 255, g: 128, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 0, g: 0, b: 0 },
];

export const NewModelViewer = () => {
  const {
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
    reapplyColors,
  } = useNewOnline3DViewer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [slicingResult, setSlicingResult] = useState<SlicingResult | null>(
    null
  );
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicingError, setSlicingError] = useState<string | null>(null);
  const [slicerSettings, setSlicerSettings] = useState<SlicerSettings>({
    layerHeight: 0.2,
    infillDensity: 20,
  });
  // 페인팅 관련 상태
  const [paintingMode, setPaintingMode] = useState(false);
  const [brushColor, setBrushColor] = useState(DEFAULT_PALETTE[0]);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const isLibraryLoaded = libraryStatus === "Initialized";
  const hasColorInfo =
    modelMetadata?.colorMapping &&
    Object.keys(modelMetadata.colorMapping).length > 0;

  // 브러시로 색칠하는 함수 (Three.js Mesh 접근 필요)
  const paintVertex = useCallback(
    (event: PointerEvent) => {
      if (!paintingMode || !mountRef.current) return;
      // Online3DViewer가 Three.js Mesh에 접근할 수 있어야 함
      // window.OV.GlobalViewerInstance로 접근 시도 (Online3DViewer 내부 구조에 따라 다름)
      // 아래는 예시 코드 (실제 환경에 맞게 수정 필요)
      // @ts-ignore
      const viewer = window.OV && window.OV.GlobalViewerInstance;
      if (!viewer || !viewer.threeScene) return;
      const scene = viewer.threeScene;
      const camera = viewer.threeCamera;
      const renderer = viewer.threeRenderer;
      if (!scene || !camera || !renderer) return;

      // 마우스 좌표 → NDC 변환
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
      // Raycaster로 교차점 찾기
      // @ts-ignore
      const raycaster = new window.THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      // @ts-ignore
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const mesh = intersect.object;
        if (!mesh.geometry || !mesh.geometry.attributes.position) return;
        // vertexColors가 없으면 추가
        if (!mesh.geometry.attributes.color) {
          const count = mesh.geometry.attributes.position.count;
          const colorAttr = new window.THREE.BufferAttribute(
            new Float32Array(count * 3),
            3
          );
          mesh.geometry.setAttribute("color", colorAttr);
        }
        // 클릭된 vertex index 찾기
        const idx = intersect.face?.a;
        if (idx === undefined) return;
        const colorAttr = mesh.geometry.attributes.color;
        colorAttr.setXYZ(
          idx,
          brushColor.r / 255,
          brushColor.g / 255,
          brushColor.b / 255
        );
        colorAttr.needsUpdate = true;
        mesh.material.vertexColors = true;
      }
    },
    [paintingMode, brushColor, mountRef]
  );

  // mountRef에 pointerdown 이벤트 연결
  useEffect(() => {
    if (!paintingMode || !mountRef.current) return;
    const el = mountRef.current;
    el.style.cursor = "crosshair";
    el.addEventListener("pointerdown", paintVertex);
    return () => {
      el.style.cursor = "";
      el.removeEventListener("pointerdown", paintVertex);
    };
  }, [paintingMode, paintVertex, mountRef]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        loadModel(files);
      }
    },
    [loadModel]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        loadModel(Array.from(files));
      }
    },
    [loadModel]
  );

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSliceModel = useCallback(async () => {
    if (!hasModel || !currentFiles || currentFiles.length === 0) {
      setSlicingError("모델이 로드되지 않았습니다.");
      return;
    }

    setIsSlicing(true);
    setSlicingError(null);
    setSlicingResult(null);

    try {
      const slicer = getJSSlicer();
      await slicer.initialize();

      const result = await slicer.sliceModel(currentFiles[0], slicerSettings);
      setSlicingResult(result);
      console.log("✅ 모델 슬라이싱 완료:", result);
    } catch (err) {
      setSlicingError(err instanceof Error ? err.message : "슬라이싱 실패");
      console.error("❌ 모델 슬라이싱 실패:", err);
    } finally {
      setIsSlicing(false);
    }
  }, [hasModel, currentFiles, slicerSettings]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 relative">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Online3DViewer Based Viewer
          </h2>
          <div className="flex items-center space-x-4">
            {!isLibraryLoaded && (
              <div className="text-yellow-400 text-sm">Loading library...</div>
            )}
            {isLibraryLoaded && (
              <div className="text-green-400 text-sm">✓ Library loaded</div>
            )}
          </div>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <button
            onClick={triggerFileSelect}
            disabled={isLoadingModel || !isLibraryLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingModel ? "Loading..." : "Load Model"}
          </button>

          <button
            onClick={() => fitToWindow(0.1)}
            disabled={!hasModel || !isLibraryLoaded}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Fit to Window
          </button>

          <button
            onClick={resetView}
            disabled={!hasModel || !isLibraryLoaded}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset View
          </button>

          <button
            onClick={reapplyColors}
            disabled={!hasModel || !isLibraryLoaded || !hasColorInfo}
            className="px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply Colors
          </button>

          <button
            onClick={() => setShowModelInfo(!showModelInfo)}
            disabled={!hasModel || !isLibraryLoaded}
            className={`px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showModelInfo
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-orange-600 hover:bg-orange-700"
            } text-white`}
          >
            Model Info
          </button>

          <button
            onClick={handleSliceModel}
            disabled={!hasModel || !isLibraryLoaded || isSlicing}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSlicing ? "🔪 슬라이싱 중..." : "🔪 슬라이싱"}
          </button>

          {/* 페인팅 모드 토글 */}
          <button
            onClick={() => setPaintingMode((v) => !v)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              paintingMode
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gray-600 hover:bg-gray-700"
            } text-white`}
          >
            {paintingMode ? "🖌️ 페인팅 종료" : "🖌️ 페인팅 시작"}
          </button>

          {/* 팔레트 항상 표시 */}
          <ColorPalette
            colors={DEFAULT_PALETTE}
            selectedIndex={selectedColorIdx}
            onSelect={(idx) => {
              setSelectedColorIdx(idx);
              setBrushColor(DEFAULT_PALETTE[idx]);
            }}
            className="ml-4"
          />

          {hasModel && (
            <div className="text-gray-300 text-sm flex items-center space-x-2">
              <span>✓ Model loaded</span>
              {hasColorInfo && (
                <span className="text-blue-300">
                  ({Object.keys(modelMetadata!.colorMapping!).length} colors)
                </span>
              )}
              {slicingResult && (
                <span className="text-green-300">
                  ({slicingResult.totalLayers} layers sliced)
                </span>
              )}
            </div>
          )}

          {slicingError && (
            <div className="text-red-400 text-sm">❌ {slicingError}</div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex relative">
        {/* 뷰어 영역 */}
        <div
          className={`flex-1 transition-all duration-300 ${
            showModelInfo ? "mr-96" : ""
          }`}
        >
          <div className="h-full relative">
            {/* 드래그 앤 드롭 영역 - 모델이 로드되면 이벤트 비활성화 */}
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                hasModel ? "pointer-events-none" : ""
              }`}
              onDrop={!hasModel ? handleDrop : undefined}
              onDragOver={!hasModel ? handleDragOver : undefined}
            >
              {!hasModel && !isLoadingModel && (
                <div className="text-center text-gray-400 pointer-events-none">
                  <div className="text-6xl mb-4">📦</div>
                  <div className="text-xl mb-2">Drag & Drop 3D Model</div>
                  <div className="text-sm">
                    Supports: STL, 3MF, OBJ, PLY, GLTF, GLB
                  </div>
                  <div className="text-xs mt-2 text-gray-500">
                    Powered by Online3DViewer
                  </div>
                  <div className="text-xs mt-1 text-blue-400">
                    🎨 3MF files support color information
                  </div>
                </div>
              )}

              {/* 로딩 표시 */}
              {(isLoading || isLoadingModel) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 pointer-events-auto">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <div>
                      {isLoading ? "Loading viewer..." : "Loading 3D model..."}
                    </div>
                    {isLoadingModel && (
                      <div className="text-sm text-gray-300 mt-2">
                        Parsing colors and materials...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 에러 표시 */}
              {error && (
                <div className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-lg z-20 pointer-events-auto">
                  <div className="font-semibold">Error</div>
                  <div className="text-sm">{error}</div>
                </div>
              )}
            </div>

            {/* 3D 뷰어 */}
            <div ref={mountRef} className="w-full h-full" />
          </div>
        </div>

        {/* 모델 정보 패널 */}
        {showModelInfo && (
          <div className="absolute top-0 right-0 w-96 h-full z-30">
            <ModelInfoPanel
              metadata={modelMetadata}
              currentFiles={currentFiles}
              isVisible={showModelInfo}
              onClose={() => setShowModelInfo(false)}
            />
          </div>
        )}
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf,.obj,.ply,.gltf,.glb"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 상태 표시 */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>
            Status:{" "}
            {!isLibraryLoaded
              ? "Loading library..."
              : isLoadingModel
              ? "Loading model..."
              : hasModel
              ? "Model loaded"
              : "Ready"}
          </div>
          <div className="flex items-center space-x-4">
            {modelMetadata && (
              <div className="flex items-center space-x-3">
                <span>Objects: {modelMetadata.objects.length}</span>
                <span>Materials: {modelMetadata.materials.length}</span>
                {hasColorInfo && (
                  <span className="text-blue-400">
                    Colors: {Object.keys(modelMetadata.colorMapping!).length}
                  </span>
                )}
              </div>
            )}
            <div>Online3DViewer v0.16.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};
