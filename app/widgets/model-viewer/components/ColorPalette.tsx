import React from "react";

export interface ColorPaletteProps {
  colors: Array<{ r: number; g: number; b: number; a?: number }>;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  className?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  selectedIndex,
  onSelect,
  className = "",
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {colors.map((color, idx) => {
        const rgba =
          color.a !== undefined
            ? `rgba(${color.r},${color.g},${color.b},${color.a / 255})`
            : `rgb(${color.r},${color.g},${color.b})`;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect?.(idx)}
            className={`w-10 h-10 rounded border-2 flex flex-col items-center justify-center transition-all
              ${
                selectedIndex === idx
                  ? "border-blue-500 scale-110"
                  : "border-gray-300"
              }
            `}
            style={{ background: rgba }}
            title={`#${idx} (${color.r},${color.g},${color.b}${
              color.a !== undefined ? "," + color.a : ""
            })`}
          >
            <span className="text-xs font-bold text-white drop-shadow-sm">
              {idx}
            </span>
          </button>
        );
      })}
    </div>
  );
};
