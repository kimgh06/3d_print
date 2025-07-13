import React from "react";
import { ModelColorData, ColorInfo } from "~/shared/types/plate";

interface ModelColorPanelProps {
  colorData: ModelColorData;
  className?: string;
  theme?: "light" | "dark";
}

export const ModelColorPanel: React.FC<ModelColorPanelProps> = ({
  colorData,
  className = "",
  theme = "light",
}) => {
  const { colors, totalVolume, dominantColor, colorCount } = colorData;

  // 테마에 따른 스타일 클래스
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-gray-700" : "bg-white";
  const borderClass = isDark ? "border-gray-600" : "border-gray-200";
  const titleClass = isDark ? "text-white" : "text-gray-900";
  const textClass = isDark ? "text-gray-300" : "text-gray-500";
  const cardBgClass = isDark ? "bg-gray-600" : "bg-gray-50";
  const valueClass = isDark ? "text-white" : "text-gray-900";

  return (
    <div
      className={`${bgClass} rounded-lg shadow-sm border ${borderClass} p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${titleClass}`}>색상 정보</h3>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded-full border border-gray-400"
            style={{ backgroundColor: dominantColor }}
          />
          <span className={`text-xs ${textClass}`}>주요 색상</span>
        </div>
      </div>

      {/* 색상 통계 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`${cardBgClass} rounded p-2`}>
          <div className={`text-xs ${textClass}`}>색상 수</div>
          <div className={`text-sm font-medium ${valueClass}`}>
            {colorCount}
          </div>
        </div>
        <div className={`${cardBgClass} rounded p-2`}>
          <div className={`text-xs ${textClass}`}>부피</div>
          <div className={`text-sm font-medium ${valueClass}`}>
            {totalVolume.toFixed(2)} cm³
          </div>
        </div>
      </div>

      {/* 색상 리스트 */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <div className={`text-xs ${textClass} font-medium`}>색상 구성</div>
          {colors.map((color) => (
            <ColorItem key={color.id} color={color} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ColorItemProps {
  color: ColorInfo;
  theme?: "light" | "dark";
}

const ColorItem: React.FC<ColorItemProps> = ({ color, theme = "light" }) => {
  const usagePercentage = (color.usage || 0) * 100;

  const isDark = theme === "dark";
  const nameClass = isDark ? "text-white" : "text-gray-900";
  const textClass = isDark ? "text-gray-300" : "text-gray-500";

  return (
    <div className="flex items-center space-x-2">
      <div
        className="w-3 h-3 rounded-full border border-gray-400"
        style={{ backgroundColor: color.color }}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-xs ${nameClass} truncate`}>{color.name}</div>
        <div className="flex items-center space-x-2">
          <div className={`text-xs ${textClass}`}>{color.color}</div>
          {color.usage !== undefined && (
            <div className={`text-xs ${textClass}`}>
              {usagePercentage.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      {color.volume !== undefined && (
        <div className={`text-xs ${textClass}`}>
          {color.volume.toFixed(2)} cm³
        </div>
      )}
    </div>
  );
};

export default ModelColorPanel;
