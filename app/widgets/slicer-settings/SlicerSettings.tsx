import { useState } from "react";
import { PrintSettings } from "~/entities/settings/types";
import { useEstimationStore } from "~/shared/lib/store";
import { useEstimation } from "~/features/estimate/useEstimation";

export const SlicerSettings = () => {
  const {
    currentModel,
    modelAnalysis,
    printSettings,
    suggestedSettings,
    setPrintSettings,
    isSlicing,
  } = useEstimationStore();

  const { calculateEstimation, generateSuggestedSettings } = useEstimation();
  const [activeTab, setActiveTab] = useState<"recommended" | "custom">(
    "recommended"
  );

  const handleSettingSelect = (settings: PrintSettings) => {
    setPrintSettings(settings);
  };

  const handleCalculateEstimation = () => {
    if (printSettings) {
      calculateEstimation(printSettings);
    }
  };

  // Generate suggestions when model analysis is available
  useState(() => {
    if (
      modelAnalysis &&
      currentModel?.classification &&
      suggestedSettings.length === 0
    ) {
      generateSuggestedSettings(modelAnalysis, currentModel.classification);
    }
  });

  if (!currentModel) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            ⚙️
          </div>
          <p className="font-medium">모델을 업로드하면</p>
          <p className="text-sm text-gray-400">출력 설정을 추천해드립니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800">출력 설정</h3>
        <p className="text-sm text-gray-500 mt-1">
          모델에 최적화된 설정을 선택하거나 사용자 정의 설정을 사용하세요
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab("recommended")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "recommended"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            추천 설정 ({suggestedSettings.length})
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "custom"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            사용자 정의
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "recommended" ? (
          <div className="space-y-4">
            {suggestedSettings.length > 0 ? (
              suggestedSettings.map((setting) => (
                <div
                  key={setting.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    printSettings?.id === setting.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleSettingSelect(setting)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">
                      {setting.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          setting.quality === "ultra-fine"
                            ? "bg-purple-100 text-purple-800"
                            : setting.quality === "fine"
                            ? "bg-blue-100 text-blue-800"
                            : setting.quality === "standard"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {setting.quality === "ultra-fine"
                          ? "최고품질"
                          : setting.quality === "fine"
                          ? "고품질"
                          : setting.quality === "standard"
                          ? "표준"
                          : "드래프트"}
                      </span>
                      {printSettings?.id === setting.id && (
                        <span className="text-blue-500">✓</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">레이어:</span>
                      <span className="ml-1 font-medium">
                        {setting.layerHeight}mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">내부밀도:</span>
                      <span className="ml-1 font-medium">
                        {setting.infillDensity}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">속도:</span>
                      <span className="ml-1 font-medium">
                        {setting.printSpeed}mm/s
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {setting.supportEnabled && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        서포트
                      </span>
                    )}
                    {setting.rafts && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        래프트
                      </span>
                    )}
                    {setting.brim && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        브림
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🤖</div>
                <p>AI가 모델을 분석 중입니다...</p>
                <p className="text-sm text-gray-400 mt-1">
                  잠시만 기다려주세요
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 사용자 정의 설정은 고급 사용자를 위한 기능입니다. 잘못된
                설정은 출력 실패나 품질 저하를 야기할 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="layerHeight"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  레이어 높이 (mm)
                </label>
                <select
                  id="layerHeight"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="0.1">0.1mm (최고품질)</option>
                  <option value="0.15">0.15mm (고품질)</option>
                  <option value="0.2" defaultValue="0.2">
                    0.2mm (표준)
                  </option>
                  <option value="0.25">0.25mm (빠름)</option>
                  <option value="0.3">0.3mm (드래프트)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="infillDensity"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  내부 밀도 (%)
                </label>
                <input
                  id="infillDensity"
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="20"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="wallCount"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  벽 개수
                </label>
                <input
                  id="wallCount"
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label
                  htmlFor="printSpeed"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  출력 속도 (mm/s)
                </label>
                <input
                  id="printSpeed"
                  type="number"
                  min="10"
                  max="200"
                  defaultValue="80"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-800 mb-3">추가 옵션</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">서포트 생성</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">래프트 사용</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">브림 사용</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Calculate Button */}
        {printSettings && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleCalculateEstimation}
              disabled={isSlicing}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSlicing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  슬라이싱 중...
                </span>
              ) : (
                "견적 계산하기"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
