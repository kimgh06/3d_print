import React from "react";
import { PlateModel, PlateSettings } from "~/shared/types/plate";
import { AutoArrangementHelper } from "~/shared/three/helpers/AutoArrangementHelper";

interface ModelStatsPanelProps {
  models: PlateModel[];
  plateSettings: PlateSettings;
  selectedModelIds: string[];
  className?: string;
  theme?: "light" | "dark";
}

export const ModelStatsPanel: React.FC<ModelStatsPanelProps> = ({
  models,
  plateSettings,
  selectedModelIds,
  className = "",
  theme = "light",
}) => {
  const loadedModels = models.filter((m) => m.loadingState === "loaded");
  const modelsWithCollisions = models.filter((m) => m.hasCollision);
  const plateUtilization = AutoArrangementHelper.calculatePlateUtilization(
    models,
    plateSettings
  );

  // 총 부피 계산
  const totalVolume = models.reduce((sum, model) => {
    return sum + (model.colorData?.totalVolume || 0);
  }, 0);

  // 색상 통계
  const allColors = models.flatMap((m) => m.colorData?.colors || []);
  const uniqueColors = allColors.filter(
    (color, index, self) =>
      self.findIndex((c) => c.color === color.color) === index
  );

  // 테마에 따른 스타일 클래스
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-gray-700" : "bg-white";
  const borderClass = isDark ? "border-gray-600" : "border-gray-200";
  const titleClass = isDark ? "text-white" : "text-gray-900";
  const textClass = isDark ? "text-gray-300" : "text-gray-500";
  const cardBgClass = isDark ? "bg-gray-600" : "bg-gray-50";

  return (
    <div
      className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-4 ${className}`}
    >
      <h3 className={`text-sm font-medium ${titleClass} mb-3`}>모델 통계</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* 모델 수 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>총 모델</div>
          <div className={`text-lg font-semibold ${titleClass}`}>
            {models.length}
          </div>
        </div>

        {/* 로드된 모델 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>로드됨</div>
          <div className="text-lg font-semibold text-green-600">
            {loadedModels.length}
          </div>
        </div>

        {/* 선택된 모델 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>선택됨</div>
          <div className="text-lg font-semibold text-blue-600">
            {selectedModelIds.length}
          </div>
        </div>

        {/* 충돌 모델 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>충돌</div>
          <div className="text-lg font-semibold text-red-600">
            {modelsWithCollisions.length}
          </div>
        </div>

        {/* 플레이트 사용률 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>플레이트 사용률</div>
          <div className="text-lg font-semibold text-purple-600">
            {(plateUtilization * 100).toFixed(1)}%
          </div>
        </div>

        {/* 총 부피 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>총 부피</div>
          <div className={`text-lg font-semibold ${titleClass}`}>
            {totalVolume.toFixed(1)} cm³
          </div>
        </div>

        {/* 색상 수 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>색상 종류</div>
          <div className="text-lg font-semibold text-orange-600">
            {uniqueColors.length}
          </div>
        </div>

        {/* 플레이트 크기 */}
        <div className={`${cardBgClass} rounded p-3`}>
          <div className={`text-xs ${textClass}`}>플레이트 크기</div>
          <div className={`text-sm font-semibold ${titleClass}`}>
            {plateSettings.size.width}×{plateSettings.size.height}mm
          </div>
        </div>
      </div>

      {/* 색상 미리보기 */}
      {uniqueColors.length > 0 && (
        <div className="mt-4">
          <div className={`text-xs ${textClass} mb-2`}>사용된 색상</div>
          <div className="flex flex-wrap gap-1">
            {uniqueColors.slice(0, 8).map((color, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color.color }}
                title={color.name}
              />
            ))}
            {uniqueColors.length > 8 && (
              <div
                className={`w-6 h-6 rounded border border-gray-300 ${cardBgClass} flex items-center justify-center`}
              >
                <span className={`text-xs ${textClass}`}>
                  +{uniqueColors.length - 8}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 사용률 표시 바 */}
      {plateUtilization > 0 && (
        <div className="mt-4">
          <div className={`text-xs ${textClass} mb-1`}>플레이트 사용률</div>
          <div
            className={`w-full ${
              isDark ? "bg-gray-600" : "bg-gray-200"
            } rounded-full h-2`}
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(plateUtilization * 100, 100)}%` }}
            />
          </div>
          <div className={`text-xs ${textClass} mt-1`}>
            {plateUtilization > 0.8
              ? "⚠️ 플레이트가 거의 찼습니다"
              : plateUtilization > 0.5
              ? "👍 적절한 사용률입니다"
              : "📦 더 많은 모델을 추가할 수 있습니다"}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelStatsPanel;
