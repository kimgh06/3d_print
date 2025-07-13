import React, { useState, useCallback } from "react";
import * as THREE from "three";
import { PlateViewer } from "~/features/plate-viewer/PlateViewer";
import {
  PlateModel,
  PlateSettings,
  Transform,
  CollisionInfo,
} from "~/shared/types/plate";
import {
  DEFAULT_PLATE_SETTINGS,
  COMMON_PLATE_SIZES,
} from "~/shared/three/helpers/PlateHelper";
import { ColorUtils } from "~/shared/three/helpers/ModelHelper";

export const PlateViewerWidget: React.FC = () => {
  // 상태 관리
  const [plateSettings, setPlateSettings] = useState<PlateSettings>(
    DEFAULT_PLATE_SETTINGS
  );
  const [models, setModels] = useState<PlateModel[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // 모델 추가
  const handleModelAdd = useCallback((files: File[]) => {
    const newModels: PlateModel[] = files.map((file, index) => ({
      id: `model_${Date.now()}_${index}`,
      name: file.name.replace(/\.[^/.]+$/, ""), // 확장자 제거
      fileName: file.name,
      file,
      transform: {
        position: { x: index * 30, y: 0, z: 0 }, // mm 단위
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: new THREE.Box3(), // 로드 후 계산됨
      color: ColorUtils.getNextAvailableColor(),
      selected: false,
      visible: true,
      hasCollision: false,
      loadingState: "pending",
    }));

    setModels((prev) => [...prev, ...newModels]);
  }, []);

  // 모델 선택
  const handleModelSelect = useCallback(
    (modelId: string, multiSelect = false) => {
      setSelectedModelIds((prev) => {
        if (multiSelect) {
          return prev.includes(modelId)
            ? prev.filter((id) => id !== modelId)
            : [...prev, modelId];
        } else {
          return [modelId];
        }
      });

      // 모델 상태 업데이트
      setModels((prev) =>
        prev.map((model) => ({
          ...model,
          selected: multiSelect
            ? model.id === modelId
              ? !model.selected
              : model.selected
            : model.id === modelId,
        }))
      );
    },
    []
  );

  // 모델 변형
  const handleModelTransform = useCallback(
    (modelId: string, transform: Transform) => {
      setModels((prev) =>
        prev.map((model) =>
          model.id === modelId ? { ...model, transform } : model
        )
      );
    },
    []
  );

  // 모델 삭제
  const handleModelDelete = useCallback(
    (modelIds: string[]) => {
      setModels((prev) => prev.filter((model) => !modelIds.includes(model.id)));
      setSelectedModelIds((prev) =>
        prev.filter((id) => !modelIds.includes(id))
      );

      // 색상 해제
      models.forEach((model) => {
        if (modelIds.includes(model.id)) {
          ColorUtils.releaseColor(model.color);
        }
      });
    },
    [models]
  );

  // 모델 복제
  const handleModelDuplicate = useCallback(
    (modelIds: string[]) => {
      const newModels: PlateModel[] = [];

      modelIds.forEach((id) => {
        const model = models.find((m) => m.id === id);
        if (model) {
          const duplicatedModel: PlateModel = {
            ...model,
            id: `${model.id}_copy_${Date.now()}`,
            name: `${model.name} (Copy)`,
            transform: {
              ...model.transform,
              position: {
                ...model.transform.position,
                x: model.transform.position.x + 30, // 30mm 옆으로 이동
              },
            },
            color: ColorUtils.getNextAvailableColor(),
            selected: false,
            mesh: undefined, // 새로 로드될 예정
          };
          newModels.push(duplicatedModel);
        }
      });

      setModels((prev) => [...prev, ...newModels]);
    },
    [models]
  );

  // 충돌 감지
  const handleCollisionDetected = useCallback((collisions: any[]) => {
    console.log("Collisions detected:", collisions);
    // TODO: 충돌 UI 업데이트
  }, []);

  // Plate 설정 변경
  const handlePlateSettingsChange = useCallback((settings: PlateSettings) => {
    setPlateSettings(settings);
  }, []);

  // Plate 크기 변경
  const handlePlateSizeChange = (sizeName: string) => {
    const size = COMMON_PLATE_SIZES[sizeName];
    if (size) {
      setPlateSettings((prev) => ({ ...prev, size }));
    }
  };

  // 모든 모델 삭제
  const clearAllModels = () => {
    models.forEach((model) => ColorUtils.releaseColor(model.color));
    setModels([]);
    setSelectedModelIds([]);
  };

  const selectedModels = models.filter((model) =>
    selectedModelIds.includes(model.id)
  );

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🏗️ 3D Plate Viewer</h1>
          <div className="flex items-center space-x-4">
            <select
              value={
                Object.keys(COMMON_PLATE_SIZES).find(
                  (key) =>
                    COMMON_PLATE_SIZES[key].width ===
                      plateSettings.size.width &&
                    COMMON_PLATE_SIZES[key].height === plateSettings.size.height
                ) || "Custom"
              }
              onChange={(e) => handlePlateSizeChange(e.target.value)}
              className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
            >
              {Object.keys(COMMON_PLATE_SIZES).map((size) => (
                <option key={size} value={size}>
                  {size} ({COMMON_PLATE_SIZES[size].width}×
                  {COMMON_PLATE_SIZES[size].height}mm)
                </option>
              ))}
            </select>
            <button
              onClick={clearAllModels}
              disabled={models.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex">
        {/* 사이드바 (모델 목록) */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">
            Models ({models.length})
          </h3>

          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  model.selected
                    ? "bg-blue-600 border-blue-500"
                    : "bg-gray-700 border-gray-600 hover:bg-gray-650"
                }`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded border border-gray-600"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-white text-sm font-medium truncate">
                    {model.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {model.loadingState === "loading" && "⏳ Loading..."}
                  {model.loadingState === "loaded" && "✅ Loaded"}
                  {model.loadingState === "error" && "❌ Error"}
                  {model.loadingState === "pending" && "⏸️ Pending"}
                </div>
                {model.hasCollision && (
                  <div className="text-xs text-red-400 mt-1">
                    ⚠️ Collision detected
                  </div>
                )}
              </div>
            ))}

            {models.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📁</div>
                <div>No models loaded</div>
                <div className="text-xs mt-1">
                  Drag files to the viewer or use file selection
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3D 뷰어 */}
        <div className="flex-1">
          <PlateViewer
            plateSettings={plateSettings}
            models={models}
            selectedModelIds={selectedModelIds}
            onModelSelect={handleModelSelect}
            onModelTransform={handleModelTransform}
            onModelAdd={handleModelAdd}
            onModelDelete={handleModelDelete}
            onModelDuplicate={handleModelDuplicate}
            onCollisionDetected={handleCollisionDetected}
            onPlateSettingsChange={handlePlateSettingsChange}
            className="h-full"
          />
        </div>
      </div>

      {/* 하단 상태바 */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>
              Plate: {plateSettings.size.width}×{plateSettings.size.height}mm
            </span>
            <span>Models: {models.length}</span>
            <span>Selected: {selectedModelIds.length}</span>
            <span>
              Loaded: {models.filter((m) => m.loadingState === "loaded").length}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span>🎨 Three.js Plate Viewer</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
