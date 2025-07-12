import { useRef, useCallback } from "react";
import { use3DPreview } from "~/features/preview/use3DPreview";
import { useFileUploader } from "~/features/uploader/useFileUploader";
import { useEstimationStore } from "~/shared/lib/store";

export const ModelViewer = () => {
  const { currentModel, isUploading } = useEstimationStore();
  const { uploadFile } = useFileUploader();
  const {
    mountRef,
    isLoading,
    error,
    autoOrient,
    resetView,
    resetOrientation,
    rotateModel,
  } = use3DPreview(currentModel);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile]
  );

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">3D 모델 뷰어</h3>
          {currentModel && (
            <div className="flex space-x-2">
              <button
                onClick={autoOrient}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="3D 프린팅에 최적화된 자동 방향 설정"
              >
                🎯 자동 정렬
              </button>
              <button
                onClick={resetOrientation}
                className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                title="모델 방향을 원본 상태로 리셋"
              >
                🔄 방향 리셋
              </button>
              <button
                onClick={resetView}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="카메라 뷰를 초기 상태로 리셋"
              >
                📷 뷰 리셋
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="relative">
        <div
          ref={mountRef}
          className="w-full h-96 bg-gray-100"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />

        {/* Loading Overlay */}
        {(isLoading || isUploading) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-700">
                {isUploading ? "파일 업로드 중..." : "3D 모델 로딩 중..."}
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
            <div className="text-center text-red-600">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Prompt */}
        {!currentModel && !isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={triggerFileSelect}
            >
              <div className="text-6xl text-gray-400 mb-4">📁</div>
              <p className="text-lg font-medium text-gray-600 mb-2">
                3D 모델 파일을 업로드하세요
              </p>
              <p className="text-sm text-gray-500 mb-4">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <div className="inline-flex space-x-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                  STL
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                  3MF
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-medium">
                  OBJ
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                  PLY
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                  GLTF/GLB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf,.obj,.ply,.gltf,.glb"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Enhanced Controls */}
      {currentModel && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Manual Rotation Controls */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              수동 회전 제어
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {/* X축 회전 */}
              <div className="text-center">
                <label className="block text-xs text-gray-500 mb-2">
                  X축 (피치)
                </label>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => rotateModel("x", 90)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    +90°
                  </button>
                  <button
                    onClick={() => rotateModel("x", -90)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    -90°
                  </button>
                </div>
              </div>

              {/* Y축 회전 */}
              <div className="text-center">
                <label className="block text-xs text-gray-500 mb-2">
                  Y축 (요)
                </label>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => rotateModel("y", 90)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    +90°
                  </button>
                  <button
                    onClick={() => rotateModel("y", -90)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    -90°
                  </button>
                </div>
              </div>

              {/* Z축 회전 */}
              <div className="text-center">
                <label className="block text-xs text-gray-500 mb-2">
                  Z축 (롤)
                </label>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => rotateModel("z", 90)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    +90°
                  </button>
                  <button
                    onClick={() => rotateModel("z", -90)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    -90°
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 마우스로 회전, 휠로 줌, 우클릭으로 이동
            </div>
            <button
              onClick={triggerFileSelect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              📂 다른 파일 선택
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
