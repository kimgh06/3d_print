import React, { useState, useCallback } from "react";
import * as THREE from "three";

export interface ModelTransform {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  scale: THREE.Vector3;
}

export interface ScaleConstraints {
  minScale: number;
  maxScale: number;
  lockAspectRatio: boolean;
  allowNegative: boolean;
}

interface ScalingToolProps {
  isActive: boolean;
  currentTransform: ModelTransform;
  onTransformChange: (transform: ModelTransform) => void;
  modelBounds?: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    size: THREE.Vector3;
  };
  constraints?: ScaleConstraints;
  unit?: "mm" | "cm" | "m" | "in";
}

// 단위 변환 함수
const convertToDisplayUnit = (value: number, unit: string): number => {
  const mmToUnit: Record<string, number> = {
    mm: 1,
    cm: 0.1,
    m: 0.001,
    in: 0.0393701,
  };
  return value * (mmToUnit[unit] || 1);
};

// 백분율 계산
const calculatePercentage = (currentScale: number): number => {
  return Math.round(currentScale * 100);
};

export const ScalingTool: React.FC<ScalingToolProps> = ({
  isActive,
  currentTransform,
  onTransformChange,
  modelBounds,
  constraints = {
    minScale: 0.1,
    maxScale: 10,
    lockAspectRatio: true,
    allowNegative: false,
  },
  unit = "mm",
}) => {
  const [scalingMode, setScalingMode] = useState<"uniform" | "individual">(
    "uniform"
  );
  const [inputMethod, setInputMethod] = useState<"percentage" | "dimension">(
    "percentage"
  );
  const [tempValues, setTempValues] = useState({
    scaleX: currentTransform.scale.x,
    scaleY: currentTransform.scale.y,
    scaleZ: currentTransform.scale.z,
  });

  // 균등 스케일링
  const handleUniformScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(
        constraints.minScale,
        Math.min(constraints.maxScale, scale)
      );
      const newTransform = {
        ...currentTransform,
        scale: new THREE.Vector3(clampedScale, clampedScale, clampedScale),
      };
      onTransformChange(newTransform);
      setTempValues({
        scaleX: clampedScale,
        scaleY: clampedScale,
        scaleZ: clampedScale,
      });
    },
    [currentTransform, onTransformChange, constraints]
  );

  // 개별 축 스케일링
  const handleIndividualScale = useCallback(
    (axis: "x" | "y" | "z", scale: number) => {
      const clampedScale = Math.max(
        constraints.minScale,
        Math.min(constraints.maxScale, scale)
      );
      const newScale = currentTransform.scale.clone();
      newScale[axis] = clampedScale;

      // 종횡비 잠금이 활성화된 경우
      if (constraints.lockAspectRatio && scalingMode === "individual") {
        const ratio = clampedScale / currentTransform.scale[axis];
        newScale.x = currentTransform.scale.x * ratio;
        newScale.y = currentTransform.scale.y * ratio;
        newScale.z = currentTransform.scale.z * ratio;
      }

      const newTransform = {
        ...currentTransform,
        scale: newScale,
      };
      onTransformChange(newTransform);
      setTempValues({
        scaleX: newScale.x,
        scaleY: newScale.y,
        scaleZ: newScale.z,
      });
    },
    [currentTransform, onTransformChange, constraints, scalingMode]
  );

  // 프리셋 스케일링
  const applyPresetScale = useCallback(
    (scale: number) => {
      handleUniformScale(scale);
    },
    [handleUniformScale]
  );

  // 리셋
  const resetScale = useCallback(() => {
    handleUniformScale(1);
  }, [handleUniformScale]);

  // 현재 모델 크기 계산
  const getCurrentDimensions = () => {
    if (!modelBounds) return { width: 0, height: 0, depth: 0 };

    const scaledSize = modelBounds.size
      .clone()
      .multiply(currentTransform.scale);
    return {
      width: convertToDisplayUnit(scaledSize.x, unit),
      height: convertToDisplayUnit(scaledSize.y, unit),
      depth: convertToDisplayUnit(scaledSize.z, unit),
    };
  };

  const dimensions = getCurrentDimensions();

  if (!isActive) return null;

  return (
    <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-800">스케일링 도구</h3>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {unit.toUpperCase()}
        </div>
      </div>

      {/* 현재 스케일 정보 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">현재 상태</h4>
        <div className="space-y-1 text-xs text-blue-700">
          <div>스케일: {calculatePercentage(currentTransform.scale.x)}%</div>
          <div>
            크기: {dimensions.width.toFixed(1)} × {dimensions.height.toFixed(1)}{" "}
            × {dimensions.depth.toFixed(1)} {unit}
          </div>
        </div>
      </div>

      {/* 스케일링 모드 선택 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          스케일링 모드
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setScalingMode("uniform")}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              scalingMode === "uniform"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🔗 균등
          </button>
          <button
            onClick={() => setScalingMode("individual")}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              scalingMode === "individual"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📐 개별
          </button>
        </div>
      </div>

      {/* 입력 방법 선택 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">입력 방법</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setInputMethod("percentage")}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              inputMethod === "percentage"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            % 비율
          </button>
          <button
            onClick={() => setInputMethod("dimension")}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              inputMethod === "dimension"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📏 치수
          </button>
        </div>
      </div>

      {/* 스케일링 컨트롤 */}
      {scalingMode === "uniform" ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            균등 스케일링
          </h4>
          {inputMethod === "percentage" ? (
            <div className="space-y-2">
              <input
                type="range"
                min={constraints.minScale * 100}
                max={constraints.maxScale * 100}
                value={calculatePercentage(currentTransform.scale.x)}
                onChange={(e) =>
                  handleUniformScale(Number(e.target.value) / 100)
                }
                className="w-full"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={calculatePercentage(currentTransform.scale.x)}
                  onChange={(e) =>
                    handleUniformScale(Number(e.target.value) / 100)
                  }
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  min={constraints.minScale * 100}
                  max={constraints.maxScale * 100}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs text-gray-600">폭 ({unit})</label>
              <input
                type="number"
                value={dimensions.width.toFixed(1)}
                onChange={(e) => {
                  if (modelBounds) {
                    const newWidth =
                      Number(e.target.value) / convertToDisplayUnit(1, unit);
                    const scale = newWidth / modelBounds.size.x;
                    handleUniformScale(scale);
                  }
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                step="0.1"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            개별 축 스케일링
          </h4>
          <div className="space-y-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className="flex items-center space-x-2">
                <span className="w-6 text-xs font-medium text-gray-600 uppercase">
                  {axis}:
                </span>
                <input
                  type="number"
                  value={
                    inputMethod === "percentage"
                      ? calculatePercentage(
                          tempValues[
                            `scale${axis.toUpperCase()}` as keyof typeof tempValues
                          ]
                        )
                      : (axis === "x"
                          ? dimensions.width
                          : axis === "y"
                          ? dimensions.height
                          : dimensions.depth
                        ).toFixed(1)
                  }
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (inputMethod === "percentage") {
                      handleIndividualScale(axis, value / 100);
                    } else if (modelBounds) {
                      const sizeKey =
                        axis === "x" ? "x" : axis === "y" ? "y" : "z";
                      const newSize = value / convertToDisplayUnit(1, unit);
                      const scale = newSize / modelBounds.size[sizeKey];
                      handleIndividualScale(axis, scale);
                    }
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  step={inputMethod === "percentage" ? "1" : "0.1"}
                />
                <span className="text-xs text-gray-500 w-8">
                  {inputMethod === "percentage" ? "%" : unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 프리셋 스케일 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">프리셋</h4>
        <div className="grid grid-cols-4 gap-1">
          {[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5].map((scale) => (
            <button
              key={scale}
              onClick={() => applyPresetScale(scale)}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
            >
              {scale}×
            </button>
          ))}
        </div>
      </div>

      {/* 제약 조건 설정 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">설정</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={constraints.lockAspectRatio}
              onChange={(e) => {
                const newConstraints = {
                  ...constraints,
                  lockAspectRatio: e.target.checked,
                };
                // constraints 업데이트는 부모 컴포넌트에서 처리
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-600">종횡비 잠금</span>
          </label>
          <div className="text-xs text-gray-500">
            범위: {constraints.minScale}× ~ {constraints.maxScale}×
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={resetScale}
          className="px-3 py-2 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600 transition-colors"
        >
          🔄 리셋
        </button>
        <button
          onClick={() => applyPresetScale(1)}
          className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          ✓ 적용
        </button>
      </div>

      {/* 정보 */}
      <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        💡 <strong>팁:</strong> 마우스 휠이나 핸들을 드래그하여 실시간으로
        스케일을 조정할 수 있습니다.
      </div>
    </div>
  );
};
