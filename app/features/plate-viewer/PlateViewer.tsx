import React, { useRef, useEffect, useCallback } from "react";
import { usePlateViewer } from "./usePlateViewer";
import {
  PlateViewerEvents,
  PlateSettings,
  PlateModel,
} from "~/shared/types/plate";
import { DEFAULT_PLATE_SETTINGS } from "~/shared/three/helpers/PlateHelper";

interface PlateViewerProps extends PlateViewerEvents {
  plateSettings?: PlateSettings;
  models?: PlateModel[];
  selectedModelIds?: string[];
  className?: string;
  width?: number;
  height?: number;
}

export const PlateViewer: React.FC<PlateViewerProps> = ({
  plateSettings = DEFAULT_PLATE_SETTINGS,
  models = [],
  selectedModelIds = [],
  onModelSelect,
  onModelTransform,
  onModelAdd,
  onModelDelete,
  onModelDuplicate,
  onCollisionDetected,
  onPlateSettingsChange,
  className = "",
  width = 800,
  height = 600,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = usePlateViewer({
    containerRef,
    onModelSelect,
    onModelTransform,
    onCollisionDetected,
  });

  // 뷰어 초기화
  useEffect(() => {
    if (containerRef.current) {
      initializeViewer(plateSettings, width, height);
    }
  }, [initializeViewer, plateSettings, width, height]);

  // 모델 업데이트
  useEffect(() => {
    loadModels(models);
  }, [loadModels, models]);

  // Plate 설정 업데이트
  useEffect(() => {
    updatePlateSettings(plateSettings);
  }, [updatePlateSettings, plateSettings]);

  // 파일 드래그 앤 드롭 핸들러
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && onModelAdd) {
        onModelAdd(files);
      }
    },
    [onModelAdd]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && onModelAdd) {
        onModelAdd(Array.from(files));
      }
    },
    [onModelAdd]
  );

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedModelIds.length > 0) {
        deleteModel(selectedModelIds);
      } else if (e.key === "a" && e.ctrlKey) {
        e.preventDefault();
        // 모든 모델 선택
        const allModelIds = models.map((m) => m.id);
        if (onModelSelect) {
          allModelIds.forEach((id) => onModelSelect(id, true));
        }
      } else if (e.key === "d" && e.ctrlKey && selectedModelIds.length > 0) {
        e.preventDefault();
        duplicateModel(selectedModelIds);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedModelIds, models, onModelSelect, deleteModel, duplicateModel]);

  return (
    <div className={`relative ${className}`}>
      {/* 메인 3D 뷰어 */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-900 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ width, height }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div>Initializing 3D Viewer...</div>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-lg z-20 max-w-sm">
          <div className="font-semibold">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* 빈 Plate 안내 */}
      {!isLoading && models.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🏗️</div>
            <div className="text-xl mb-2">Empty Build Plate</div>
            <div className="text-sm">
              Drag & Drop STL or 3MF files to add models
            </div>
            <button
              onClick={triggerFileSelect}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors pointer-events-auto"
            >
              Select Files
            </button>
          </div>
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf,.obj,.ply"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 상태 정보 */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
        <div>Models: {models.length}</div>
        <div>Selected: {selectedModelIds.length}</div>
        <div>
          Plate: {plateSettings.size.width}×{plateSettings.size.height}mm
        </div>
      </div>

      {/* 조작 힌트 */}
      {models.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs space-y-1">
          <div>🖱️ Left click: Select model</div>
          <div>🔧 Ctrl+A: Select all</div>
          <div>📋 Ctrl+D: Duplicate</div>
          <div>🗑️ Delete: Remove selected</div>
        </div>
      )}
    </div>
  );
};
