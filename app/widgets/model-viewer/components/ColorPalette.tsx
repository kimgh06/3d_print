import React from "react";

interface ColorPaletteProps {
  colorMapping: Record<string, string>;
  maxColors?: number;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colorMapping,
  maxColors = 8,
}) => {
  const colors = Object.entries(colorMapping);
  const displayColors = colors.slice(0, maxColors);
  const hasMoreColors = colors.length > maxColors;

  return (
    <div className="flex items-center space-x-1">
      {displayColors.map(([objectId, colorHex]) => (
        <div
          key={objectId}
          className="w-4 h-4 rounded border border-gray-600 hover:scale-110 transition-transform cursor-pointer"
          style={{ backgroundColor: colorHex }}
          title={`Object #${objectId}: ${colorHex}`}
        />
      ))}
      {hasMoreColors && (
        <div className="text-xs text-gray-400 ml-1">
          +{colors.length - maxColors}
        </div>
      )}
    </div>
  );
};

// 확장된 색상 팔레트 컴포넌트 (ModelInfoPanel에서 사용)
export const ExtendedColorPalette: React.FC<{
  colorMapping: Record<string, string>;
}> = ({ colorMapping }) => {
  const colors = Object.entries(colorMapping);
  const colorStats = getColorStats(colors);

  return (
    <div className="space-y-4">
      {/* 색상 통계 */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-semibold text-white">
            {colors.length}
          </div>
          <div className="text-xs text-gray-400">Colors</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-white">
            {colorStats.uniqueColors}
          </div>
          <div className="text-xs text-gray-400">Unique</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-white">
            {colorStats.mostUsed?.count || 0}
          </div>
          <div className="text-xs text-gray-400">Most Used</div>
        </div>
      </div>

      {/* 색상 그리드 */}
      <div className="grid grid-cols-6 gap-2">
        {colors.map(([objectId, colorHex]) => (
          <div
            key={objectId}
            className="aspect-square rounded border border-gray-600 hover:scale-105 transition-transform cursor-pointer relative group"
            style={{ backgroundColor: colorHex }}
            title={`Object #${objectId}: ${colorHex}`}
          >
            {/* 툴팁 */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              #{objectId}: {colorHex}
            </div>
          </div>
        ))}
      </div>

      {/* 색상별 객체 수 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">
          Color Distribution
        </h4>
        {colorStats.distribution.map(({ color, count, objectIds }) => (
          <div
            key={color}
            className="flex items-center justify-between p-2 bg-gray-700 rounded"
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded border border-gray-600"
                style={{ backgroundColor: color }}
              />
              <span className="text-white text-sm font-mono">{color}</span>
            </div>
            <div className="text-xs text-gray-400">
              {count} object{count !== 1 ? "s" : ""} • #{objectIds.join(", #")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 색상 통계 계산 함수
function getColorStats(colors: [string, string][]) {
  const colorCount: Record<string, { count: number; objectIds: string[] }> = {};

  colors.forEach(([objectId, colorHex]) => {
    if (!colorCount[colorHex]) {
      colorCount[colorHex] = { count: 0, objectIds: [] };
    }
    colorCount[colorHex].count++;
    colorCount[colorHex].objectIds.push(objectId);
  });

  const distribution = Object.entries(colorCount)
    .map(([color, { count, objectIds }]) => ({
      color,
      count,
      objectIds,
    }))
    .sort((a, b) => b.count - a.count);

  const uniqueColors = Object.keys(colorCount).length;
  const mostUsed = distribution[0];

  return {
    uniqueColors,
    mostUsed,
    distribution,
  };
}
