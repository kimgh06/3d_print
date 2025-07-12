import { useEstimationStore } from '~/shared/lib/store';
import { useEstimation } from '~/features/estimate/useEstimation';
import { settingsManager } from '~/features/settings/SettingsManager';
import { useRef } from 'react';

export const EstimationCard = () => {
  const { 
    currentModel, 
    estimation, 
    printSettings, 
    isSlicing, 
    error,
    setPrintSettings,
    setSuggestedSettings
  } = useEstimationStore();
  
  const { formatPrintTime, formatFilamentUsage } = useEstimation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportSettings = () => {
    if (!currentModel || !printSettings || !estimation) {
      alert('저장할 설정이 없습니다.');
      return;
    }

    try {
      const projectSettings = settingsManager.exportSettings(
        currentModel,
        printSettings,
        estimation
      );
      
      const filename = `${currentModel.name.replace(/\.[^/.]+$/, "")}_settings.json`;
      settingsManager.downloadSettings(projectSettings, filename);
    } catch (error) {
      console.error('Failed to export settings:', error);
      alert('설정 저장에 실패했습니다.');
    }
  };

  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const projectSettings = await settingsManager.importSettings(file);
      if (projectSettings) {
        setPrintSettings(projectSettings.printSettings);
        setSuggestedSettings([projectSettings.printSettings]);
        alert('설정을 성공적으로 불러왔습니다.');
      } else {
        alert('유효하지 않은 설정 파일입니다.');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      alert('설정 불러오기에 실패했습니다.');
    }
    
    // Reset file input
    event.target.value = '';
  };

  if (!currentModel) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            📋
          </div>
          <p className="text-lg font-medium">3D 모델을 업로드하세요</p>
          <p className="text-sm text-gray-400 mt-2">
            STL, 3MF, OBJ 파일을 지원합니다
          </p>
        </div>
      </div>
    );
  }

  if (isSlicing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">슬라이싱 중...</p>
          <p className="text-sm text-gray-500 mt-2">
            모델을 분석하고 G-code를 생성하고 있습니다
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            ⚠️
          </div>
          <p className="text-lg font-medium">오류가 발생했습니다</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold">3D 프린팅 견적서</h2>
        <p className="text-blue-100 mt-1">{currentModel.name}</p>
      </div>

      {/* Model Info */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">모델 정보</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">파일 형식:</span>
            <span className="ml-2 font-medium uppercase">{currentModel.type}</span>
          </div>
          <div>
            <span className="text-gray-500">파일 크기:</span>
            <span className="ml-2 font-medium">
              {(currentModel.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          {currentModel.classification && (
            <div className="col-span-2">
              <span className="text-gray-500">모델 분류:</span>
              <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {currentModel.classification === 'decorative' && '장식용'}
                {currentModel.classification === 'functional' && '기능성'}
                {currentModel.classification === 'assembly' && '조립체'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Print Settings */}
      {printSettings && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">출력 설정</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">레이어 높이:</span>
              <span className="ml-2 font-medium">{printSettings.layerHeight}mm</span>
            </div>
            <div>
              <span className="text-gray-500">벽 개수:</span>
              <span className="ml-2 font-medium">{printSettings.wallCount}개</span>
            </div>
            <div>
              <span className="text-gray-500">내부 밀도:</span>
              <span className="ml-2 font-medium">{printSettings.infillDensity}%</span>
            </div>
            <div>
              <span className="text-gray-500">출력 속도:</span>
              <span className="ml-2 font-medium">{printSettings.printSpeed}mm/s</span>
            </div>
            <div>
              <span className="text-gray-500">노즐 온도:</span>
              <span className="ml-2 font-medium">{printSettings.nozzleTemperature}°C</span>
            </div>
            <div>
              <span className="text-gray-500">베드 온도:</span>
              <span className="ml-2 font-medium">{printSettings.bedTemperature}°C</span>
            </div>
          </div>
        </div>
      )}

      {/* Estimation Results */}
      {estimation && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">견적 결과</h3>
          
          {/* Selected Filament Info */}
          {estimation.selectedFilament && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: estimation.selectedFilament.color }}></span>
                선택된 필라멘트
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">재료:</span>
                  <span className="ml-2 font-medium">{estimation.selectedFilament.material.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">브랜드:</span>
                  <span className="ml-2 font-medium">{estimation.selectedFilament.brand}</span>
                </div>
                <div>
                  <span className="text-gray-500">단가:</span>
                  <span className="ml-2 font-medium">₩{estimation.selectedFilament.costPerGram}/g</span>
                </div>
                <div>
                  <span className="text-gray-500">직경:</span>
                  <span className="ml-2 font-medium">{estimation.selectedFilament.diameter}mm</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Print Time */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  ⏱️
                </div>
                <div>
                  <p className="font-medium text-gray-800">출력 시간</p>
                  <p className="text-sm text-gray-500">예상 소요 시간</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-800">
                  {formatPrintTime(estimation.printTime)}
                </p>
              </div>
            </div>

            {/* Filament Usage */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  🧵
                </div>
                <div>
                  <p className="font-medium text-gray-800">필라멘트 사용량</p>
                  <p className="text-sm text-gray-500">길이 및 무게</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">
                  {formatFilamentUsage(estimation.filamentUsage)}
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            {estimation.breakdown && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">비용 세부사항</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">필라멘트 비용:</span>
                    <span className="font-medium">₩{estimation.breakdown.filamentCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">전력 비용:</span>
                    <span className="font-medium">₩{estimation.breakdown.powerCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">유지 비용:</span>
                    <span className="font-medium">₩{estimation.breakdown.maintenanceCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-base">
                      <span>총 비용:</span>
                      <span className="text-purple-600">₩{estimation.cost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Total Cost */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  💰
                </div>
                <div>
                  <p className="font-medium text-gray-800">총 예상 비용</p>
                  <p className="text-sm text-gray-500">모든 비용 포함</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  ₩{estimation.cost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Settings Export */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportSettings}
                disabled={!currentModel || !printSettings || !estimation}
                className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                📁 설정 저장
              </button>
              <button
                onClick={handleImportSettings}
                className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                📂 설정 불러오기
              </button>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.3mf"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {/* Frontend Notice */}
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">💡</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>프론트엔드 데모 버전:</strong> AMS 필라멘트 관리와 Bambu Lab 설정을 
                    시뮬레이션하여 정확한 견적을 제공합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};