import React, { useState, useCallback } from "react";
import {
  getJSSlicer,
  SlicerSettings,
  SlicingResult,
} from "~/shared/lib/js-slicer";

interface WASMSlicerWidgetProps {
  className?: string;
}

export function WASMSlicerWidget({ className = "" }: WASMSlicerWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState<SlicingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [settings, setSettings] = useState<SlicerSettings>({
    layerHeight: 0.2,
    infillDensity: 20,
  });

  const handleInitialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const slicer = getJSSlicer();
      await slicer.initialize();
      setIsReady(slicer.isReady());
      console.log("✅ JavaScript 슬라이서 초기화 완료");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초기화 실패");
      console.error("❌ JavaScript 슬라이서 초기화 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTestSlicing = useCallback(async () => {
    if (!isReady) {
      setError("JavaScript 슬라이서가 초기화되지 않았습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const slicer = getJSSlicer();
      const testResult = await slicer.testSlicing();
      setResult(testResult);
      console.log("✅ 테스트 슬라이싱 완료:", testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "슬라이싱 실패");
      console.error("❌ 테스트 슬라이싱 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !isReady) return;

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const slicer = getJSSlicer();
        const slicingResult = await slicer.sliceModel(file, settings);
        setResult(slicingResult);
        console.log("✅ 파일 슬라이싱 완료:", slicingResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "파일 슬라이싱 실패");
        console.error("❌ 파일 슬라이싱 실패:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isReady, settings]
  );

  const handleDownloadGCode = useCallback(() => {
    if (!result?.gcode) return;

    const blob = new Blob([result.gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sliced_model.gcode";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className={`p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔧 JavaScript 3D 슬라이서
        </h2>
        <p className="text-gray-600">JavaScript 기반 고성능 3D 모델 슬라이서</p>
      </div>

      {/* 초기화 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">초기화</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={handleInitialize}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "🔄 초기화 중..." : "🚀 JavaScript 슬라이서 초기화"}
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isReady ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm">
              {isReady ? "✅ 준비됨" : "❌ 초기화 필요"}
            </span>
          </div>
        </div>
      </div>

      {/* 설정 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">슬라이싱 설정</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="layerHeight"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              레이어 높이 (mm)
            </label>
            <input
              id="layerHeight"
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={settings.layerHeight}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  layerHeight: parseFloat(e.target.value) || 0.2,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="infillDensity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              인필 밀도 (%)
            </label>
            <input
              id="infillDensity"
              type="number"
              step="1"
              min="0"
              max="100"
              value={settings.infillDensity}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  infillDensity: parseInt(e.target.value) || 20,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 테스트 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">테스트</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={handleTestSlicing}
            disabled={!isReady || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? "🔪 슬라이싱 중..." : "🧪 테스트 큐브 슬라이싱"}
          </button>
          <span className="text-sm text-gray-600">
            기본 큐브 모델로 슬라이싱 테스트
          </span>
        </div>
      </div>

      {/* 파일 업로드 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">파일 업로드</h3>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".stl,.3mf"
            onChange={handleFileUpload}
            disabled={!isReady || isLoading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <span className="text-red-800 font-medium">에러</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            ✅ 슬라이싱 완료
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-600">
                처리 시간:
              </span>
              <p className="text-lg font-semibold">
                {result.processingTime.toFixed(2)}ms
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">
                총 레이어:
              </span>
              <p className="text-lg font-semibold">{result.totalLayers}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">
                G-code 크기:
              </span>
              <p className="text-lg font-semibold">
                {(result.gcode.length / 1024).toFixed(1)}KB
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">
                바운딩 박스:
              </span>
              <p className="text-sm">
                {result.boundingBox
                  .slice(0, 3)
                  .map((v) => v.toFixed(1))
                  .join(" x ")}{" "}
                mm
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadGCode}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              📥 G-code 다운로드
            </button>
            <button
              onClick={() => setShowVisualization(!showVisualization)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {showVisualization ? "🔍 시각화 숨기기" : "🔍 시각화 보기"}
            </button>
            <button
              onClick={() => {
                console.log("G-code:", result.gcode);
                console.log("Layer Info:", result.layerInfo);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📋 콘솔에 출력
            </button>
          </div>
        </div>
      )}

      {/* 슬라이싱 시각화 */}
      {showVisualization && result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            🔍 슬라이싱 결과 시각화
          </h3>
          <div className="bg-gray-900 rounded-lg p-4 h-64 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">🔪</div>
              <div className="text-lg mb-2">슬라이싱 결과</div>
              <div className="text-sm space-y-1">
                <div>총 레이어: {result.totalLayers}개</div>
                <div>레이어 높이: {result.layerInfo.layerHeight}mm</div>
                <div>인필 밀도: {result.layerInfo.infillDensity}%</div>
                <div>
                  바운딩 박스:{" "}
                  {result.boundingBox
                    .slice(0, 3)
                    .map((v) => v.toFixed(1))
                    .join(" x ")}{" "}
                  mm
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                각 레이어별 윤곽선과 인필 패턴이 표시됩니다
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 성능 정보 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          📊 성능 정보
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• JavaScript 기반 고성능 슬라이싱</p>
          <p>• 브라우저에서 직접 실행 (서버 불필요)</p>
          <p>• 실시간 슬라이싱 및 G-code 생성</p>
          <p>• 메모리 효율적인 처리</p>
        </div>
      </div>
    </div>
  );
}
