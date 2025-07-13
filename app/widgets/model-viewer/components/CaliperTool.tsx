import React, { useState, useCallback, useEffect } from "react";
import * as THREE from "three";

export interface MeasurementPoint {
  id: string;
  position: THREE.Vector3;
  type: "vertex" | "edge" | "face" | "arbitrary";
  timestamp: Date;
}

export interface Measurement {
  id: string;
  startPoint: MeasurementPoint;
  endPoint: MeasurementPoint;
  distance: number;
  unit: "mm" | "cm" | "m" | "in";
  label?: string;
  color: string;
  createdAt: Date;
}

interface CaliperToolProps {
  isActive: boolean;
  onMeasurementComplete: (measurement: Measurement) => void;
  onMeasurementClear: () => void;
  measurements: Measurement[];
  unit?: "mm" | "cm" | "m" | "in";
  precision?: number;
  snapEnabled?: boolean;
  snapDistance?: number;
}

// 단위 변환 함수
const convertUnit = (
  distance: number,
  fromUnit: string,
  toUnit: string
): number => {
  // Three.js의 기본 단위는 보통 1 unit = 1mm로 가정
  const mmToUnit: Record<string, number> = {
    mm: 1,
    cm: 0.1,
    m: 0.001,
    in: 0.0393701,
  };

  const distanceInMm = distance / (mmToUnit[fromUnit] || 1);
  return distanceInMm * (mmToUnit[toUnit] || 1);
};

// 거리 포맷팅 함수
const formatDistance = (
  distance: number,
  unit: string,
  precision: number
): string => {
  return `${distance.toFixed(precision)} ${unit}`;
};

// 캘리퍼 도구 UI 컴포넌트
export const CaliperTool: React.FC<CaliperToolProps> = ({
  isActive,
  onMeasurementComplete,
  onMeasurementClear,
  measurements,
  unit = "mm",
  precision = 2,
  snapEnabled = true,
  snapDistance = 5,
}) => {
  const [currentPoints, setCurrentPoints] = useState<MeasurementPoint[]>([]);
  const [isMessuring, setIsMessuring] = useState(false);

  // 측정 시작
  const startMeasurement = useCallback(() => {
    setCurrentPoints([]);
    setIsMessuring(true);
  }, []);

  // 측정 점 추가 (외부에서 사용됨)
  const addMeasurementPoint = useCallback(
    (point: THREE.Vector3, type: MeasurementPoint["type"] = "arbitrary") => {
      if (!isActive || !isMessuring) return;

      const newPoint: MeasurementPoint = {
        id: `point_${Date.now()}_${Math.random()}`,
        position: point.clone(),
        type,
        timestamp: new Date(),
      };

      setCurrentPoints((prev) => {
        const newPoints = [...prev, newPoint];

        // 두 점이 모두 선택되면 측정 완료
        if (newPoints.length === 2) {
          const distance = newPoints[0].position.distanceTo(
            newPoints[1].position
          );
          const convertedDistance = convertUnit(distance, "mm", unit);

          const measurement: Measurement = {
            id: `measurement_${Date.now()}`,
            startPoint: newPoints[0],
            endPoint: newPoints[1],
            distance: convertedDistance,
            unit,
            color: "#ef4444",
            createdAt: new Date(),
          };

          onMeasurementComplete(measurement);
          setIsMessuring(false);
          return [];
        }

        return newPoints;
      });
    },
    [isActive, isMessuring, unit, onMeasurementComplete]
  );

  // 측정 취소
  const cancelMeasurement = useCallback(() => {
    setCurrentPoints([]);
    setIsMessuring(false);
  }, []);

  // 모든 측정값 지우기
  const clearAllMeasurements = useCallback(() => {
    setCurrentPoints([]);
    setIsMessuring(false);
    onMeasurementClear();
  }, [onMeasurementClear]);

  if (!isActive) return null;

  return (
    <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      {/* 캘리퍼 도구 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-800">캘리퍼 측정 도구</h3>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {unit.toUpperCase()}
        </div>
      </div>

      {/* 현재 측정 상태 */}
      {isMessuring && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">
                측정 중... ({currentPoints.length}/2)
              </p>
              <p className="text-xs text-blue-600">
                {currentPoints.length === 0
                  ? "첫 번째 점을 클릭하세요"
                  : "두 번째 점을 클릭하세요"}
              </p>
            </div>
            <button
              onClick={cancelMeasurement}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              취소
            </button>
          </div>

          {/* 현재 점 표시 */}
          {currentPoints.length > 0 && (
            <div className="mt-2 text-xs text-blue-700">
              점 1: ({currentPoints[0].position.x.toFixed(1)},{" "}
              {currentPoints[0].position.y.toFixed(1)},{" "}
              {currentPoints[0].position.z.toFixed(1)})
            </div>
          )}
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={startMeasurement}
          disabled={isMessuring}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            isMessuring
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          📏 측정 시작
        </button>

        <button
          onClick={clearAllMeasurements}
          disabled={measurements.length === 0}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            measurements.length === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          🗑️ 모두 지우기
        </button>
      </div>

      {/* 설정 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">설정</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={snapEnabled}
              readOnly
              className="rounded"
            />
            <span className="text-sm text-gray-600">스냅 기능</span>
          </label>
          <div className="text-xs text-gray-500">
            정밀도: {precision}자리 | 스냅 거리: {snapDistance}px
          </div>
        </div>
      </div>

      {/* 측정 결과 목록 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          측정 결과 ({measurements.length})
        </h4>

        {measurements.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            측정된 값이 없습니다
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2">
            {measurements.map((measurement, index) => (
              <div
                key={measurement.id}
                className="p-2 bg-white border border-gray-200 rounded text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: measurement.color }}
                    ></div>
                    <span className="font-medium">측정 {index + 1}</span>
                  </div>
                  <span className="font-mono text-blue-600">
                    {formatDistance(
                      measurement.distance,
                      measurement.unit,
                      precision
                    )}
                  </span>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  시작: ({measurement.startPoint.position.x.toFixed(1)},{" "}
                  {measurement.startPoint.position.y.toFixed(1)},{" "}
                  {measurement.startPoint.position.z.toFixed(1)})
                </div>
                <div className="text-xs text-gray-500">
                  끝: ({measurement.endPoint.position.x.toFixed(1)},{" "}
                  {measurement.endPoint.position.y.toFixed(1)},{" "}
                  {measurement.endPoint.position.z.toFixed(1)})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사용법 안내 */}
      <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        💡 <strong>사용법:</strong> &apos;측정 시작&apos; 버튼을 클릭한 후 3D
        모델의 두 점을 차례로 클릭하세요.
      </div>
    </div>
  );
};
