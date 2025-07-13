import { useRef, useCallback, useState } from "react";
import { useNewOnline3DViewer } from "~/features/preview/useNewOnline3DViewer";
import { ModelInfoPanel } from "./ModelInfoPanel";
import { ColorPalette } from "./ColorPalette";

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

  const isLibraryLoaded = libraryStatus === "Initialized";
  const hasColorInfo =
    modelMetadata?.colorMapping &&
    Object.keys(modelMetadata.colorMapping).length > 0;

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
            {hasColorInfo && (
              <div className="flex items-center space-x-2">
                <div className="text-blue-400 text-sm">🎨 Colors detected</div>
                <ColorPalette colorMapping={modelMetadata!.colorMapping!} />
              </div>
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

          {hasModel && (
            <div className="text-gray-300 text-sm flex items-center space-x-2">
              <span>✓ Model loaded</span>
              {hasColorInfo && (
                <span className="text-blue-300">
                  ({Object.keys(modelMetadata!.colorMapping!).length} colors)
                </span>
              )}
            </div>
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

            {/* Online3DViewer 마운트 포인트 */}
            <div
              ref={mountRef}
              className="w-full h-full"
              style={{ minHeight: "400px" }}
            />

            {/* 모델 로드 후 드래그 앤 드롭 힌트 (우측 하단) */}
            {hasModel && (
              <div
                className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg pointer-events-auto"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="text-xs text-gray-300 mb-1">
                  Drop new model to replace
                </div>
                <div className="text-xs text-gray-400">
                  Or use Load Model button
                </div>
              </div>
            )}

            {/* 색상 정보 힌트 */}
            {hasModel && hasColorInfo && (
              <div className="absolute top-4 left-4 bg-blue-600 bg-opacity-90 text-white p-3 rounded-lg pointer-events-none">
                <div className="text-xs font-medium">
                  🎨 Multi-color model detected
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  {Object.keys(modelMetadata!.colorMapping!).length} objects
                  with colors
                </div>
                <div className="text-xs text-blue-200 mt-1">
                  Use &apos;Apply Colors&apos; button if needed
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모델 정보 패널 */}
        <ModelInfoPanel
          metadata={modelMetadata}
          currentFiles={currentFiles}
          isVisible={showModelInfo}
          onClose={() => setShowModelInfo(false)}
        />
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
