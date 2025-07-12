import { useEstimationStore } from "~/shared/lib/store";
import { Model3MFSettings } from "~/entities/model/types";

export const ModelSettings3MF = () => {
  const extracted3MFSettings = useEstimationStore(
    (state) => state.extracted3MFSettings
  );

  if (!extracted3MFSettings) {
    return null;
  }

  const { filament, printSettings, bambuSettings, printer, metadata } = extracted3MFSettings;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">⚙️</span>
        3MF 파일 설정 정보
      </h3>

      <div className="space-y-4">
        {/* 메타데이터 섹션 */}
        {metadata && (
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium text-gray-700 mb-2">파일 정보</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {metadata.application && (
                <div>
                  <span className="text-gray-500">애플리케이션:</span>{" "}
                  <span className="font-medium">{metadata.application}</span>
                </div>
              )}
              {metadata.version && (
                <div>
                  <span className="text-gray-500">버전:</span>{" "}
                  <span className="font-medium">{metadata.version}</span>
                </div>
              )}
              {metadata.creationDate && (
                <div>
                  <span className="text-gray-500">생성일:</span>{" "}
                  <span className="font-medium">{new Date(metadata.creationDate).toLocaleDateString()}</span>
                </div>
              )}
              {metadata.totalTime && (
                <div>
                  <span className="text-gray-500">예상 프린팅 시간:</span>{" "}
                  <span className="font-medium">{Math.round(metadata.totalTime / 60)}분</span>
                </div>
              )}
              {metadata.filamentUsed && (
                <div>
                  <span className="text-gray-500">필라멘트 사용량:</span>{" "}
                  <span className="font-medium">{(metadata.filamentUsed / 1000).toFixed(2)}m</span>
                </div>
              )}
              {metadata.filamentWeight && (
                <div>
                  <span className="text-gray-500">필라멘트 무게:</span>{" "}
                  <span className="font-medium">{metadata.filamentWeight.toFixed(1)}g</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 프린터 정보 */}
        {printer && (
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-gray-700 mb-2">프린터 정보</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {printer.name && (
                <div>
                  <span className="text-gray-500">프린터:</span>{" "}
                  <span className="font-medium">{printer.name}</span>
                </div>
              )}
              {printer.model && (
                <div>
                  <span className="text-gray-500">모델:</span>{" "}
                  <span className="font-medium">{printer.model}</span>
                </div>
              )}
              {printer.buildPlate && (
                <div className="col-span-2">
                  <span className="text-gray-500">빌드 플레이트:</span>{" "}
                  <span className="font-medium">
                    {printer.buildPlate.width}×{printer.buildPlate.height}×{printer.buildPlate.depth}mm
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 필라멘트 설정 */}
        {filament && (
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium text-gray-700 mb-2">필라멘트 설정</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {filament.type && (
                <div>
                  <span className="text-gray-500">재료:</span>{" "}
                  <span className="font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    {filament.type}
                  </span>
                </div>
              )}
              {filament.brand && (
                <div>
                  <span className="text-gray-500">브랜드:</span>{" "}
                  <span className="font-medium">{filament.brand}</span>
                </div>
              )}
              {filament.color && (
                <div>
                  <span className="text-gray-500">색상:</span>{" "}
                  <span className="font-medium">{filament.color}</span>
                </div>
              )}
              {filament.diameter && (
                <div>
                  <span className="text-gray-500">직경:</span>{" "}
                  <span className="font-medium">{filament.diameter}mm</span>
                </div>
              )}
              {filament.temperature?.nozzle && (
                <div>
                  <span className="text-gray-500">노즐 온도:</span>{" "}
                  <span className="font-medium">{filament.temperature.nozzle}°C</span>
                </div>
              )}
              {filament.temperature?.bed && (
                <div>
                  <span className="text-gray-500">베드 온도:</span>{" "}
                  <span className="font-medium">{filament.temperature.bed}°C</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 프린트 설정 */}
        {printSettings && (
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-medium text-gray-700 mb-2">프린트 설정</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {printSettings.layerHeight && (
                <div>
                  <span className="text-gray-500">레이어 높이:</span>{" "}
                  <span className="font-medium">{printSettings.layerHeight}mm</span>
                </div>
              )}
              {printSettings.infill && (
                <div>
                  <span className="text-gray-500">인필:</span>{" "}
                  <span className="font-medium">{printSettings.infill}%</span>
                </div>
              )}
              {printSettings.speed?.print && (
                <div>
                  <span className="text-gray-500">프린트 속도:</span>{" "}
                  <span className="font-medium">{printSettings.speed.print}mm/s</span>
                </div>
              )}
              {printSettings.speed?.travel && (
                <div>
                  <span className="text-gray-500">이동 속도:</span>{" "}
                  <span className="font-medium">{printSettings.speed.travel}mm/s</span>
                </div>
              )}
              {printSettings.support && (
                <div>
                  <span className="text-gray-500">서포트:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    printSettings.support.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {printSettings.support.enabled ? '활성화' : '비활성화'}
                  </span>
                </div>
              )}
              {printSettings.retraction && (
                <div>
                  <span className="text-gray-500">리트랙션:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    printSettings.retraction.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {printSettings.retraction.enabled ? '활성화' : '비활성화'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bambu Lab 특화 설정 */}
        {bambuSettings && (
          <div className="border-l-4 border-emerald-500 pl-4">
            <h4 className="font-medium text-gray-700 mb-2">Bambu Lab 설정</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {bambuSettings.ams && (
                <div>
                  <span className="text-gray-500">AMS:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    bambuSettings.ams.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bambuSettings.ams.enabled ? `슬롯 ${bambuSettings.ams.slot || 1}` : '비활성화'}
                  </span>
                </div>
              )}
              {bambuSettings.timelapse !== undefined && (
                <div>
                  <span className="text-gray-500">타임랩스:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    bambuSettings.timelapse 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bambuSettings.timelapse ? '활성화' : '비활성화'}
                  </span>
                </div>
              )}
              {bambuSettings.flowCalibration !== undefined && (
                <div>
                  <span className="text-gray-500">플로우 캘리브레이션:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    bambuSettings.flowCalibration 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bambuSettings.flowCalibration ? '활성화' : '비활성화'}
                  </span>
                </div>
              )}
              {bambuSettings.adaptiveLayers !== undefined && (
                <div>
                  <span className="text-gray-500">적응형 레이어:</span>{" "}
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    bambuSettings.adaptiveLayers 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bambuSettings.adaptiveLayers ? '활성화' : '비활성화'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};