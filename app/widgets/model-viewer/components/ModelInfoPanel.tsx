import React, { useState } from "react";
import {
  ThreeMFMetadata,
  formatFileSize,
  formatDate,
} from "~/shared/lib/3mf-parser";
import { ColorPalette } from "./ColorPalette";

interface ModelInfoPanelProps {
  metadata: ThreeMFMetadata | null;
  currentFiles: File[];
  isVisible: boolean;
  onClose: () => void;
}

export const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({
  metadata,
  currentFiles,
  isVisible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "info" | "objects" | "materials" | "print"
  >("info");

  if (!isVisible) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-800 border-l border-gray-700 z-50 overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Model Info</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "info"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("objects")}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "objects"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Objects
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "materials"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Materials
        </button>
        <button
          onClick={() => setActiveTab("print")}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "print"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Print
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "info" && (
          <GeneralInfo metadata={metadata} currentFiles={currentFiles} />
        )}
        {activeTab === "objects" && <ObjectsInfo metadata={metadata} />}
        {activeTab === "materials" && <MaterialsInfo metadata={metadata} />}
        {activeTab === "print" && <PrintInfo metadata={metadata} />}
      </div>
    </div>
  );
};

// 일반 정보 탭
const GeneralInfo: React.FC<{
  metadata: ThreeMFMetadata | null;
  currentFiles: File[];
}> = ({ metadata, currentFiles }) => {
  const totalSize = currentFiles.reduce((total, file) => total + file.size, 0);

  return (
    <div className="space-y-4">
      {/* 썸네일 */}
      {metadata?.thumbnail && (
        <div className="mb-4">
          <img
            src={metadata.thumbnail}
            alt="Model thumbnail"
            className="w-full h-48 object-cover rounded-lg bg-gray-700"
          />
        </div>
      )}

      {/* 기본 정보 */}
      <div className="space-y-3">
        <InfoItem label="Title" value={metadata?.title || "Untitled"} />
        <InfoItem label="Files" value={`${currentFiles.length} file(s)`} />
        <InfoItem label="Total Size" value={formatFileSize(totalSize)} />

        {metadata?.description && (
          <InfoItem label="Description" value={metadata.description} />
        )}

        {metadata?.creator && (
          <InfoItem label="Creator" value={metadata.creator} />
        )}

        {metadata?.creationDate && (
          <InfoItem label="Created" value={formatDate(metadata.creationDate)} />
        )}

        {metadata?.modificationDate && (
          <InfoItem
            label="Modified"
            value={formatDate(metadata.modificationDate)}
          />
        )}
      </div>

      {/* 파일 목록 */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Files</h4>
        <div className="space-y-2">
          {currentFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-700 rounded"
            >
              <span className="text-sm text-white truncate">{file.name}</span>
              <span className="text-xs text-gray-400">
                {formatFileSize(file.size)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 객체 정보 탭
const ObjectsInfo: React.FC<{ metadata: ThreeMFMetadata | null }> = ({
  metadata,
}) => {
  if (!metadata?.objects.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No object information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300">
        {metadata.objects.length} object(s) found
      </div>

      {metadata.objects.map((object, index) => {
        const objectColor = metadata.colorMapping?.[object.id];
        return (
          <div key={object.id} className="p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-white">
                  {object.name || `Object ${index + 1}`}
                </h4>
                {objectColor && (
                  <div
                    className="w-4 h-4 rounded border border-gray-600"
                    style={{ backgroundColor: objectColor }}
                    title={`Color: ${objectColor}`}
                  />
                )}
              </div>
              <span className="text-xs text-gray-400">#{object.id}</span>
            </div>

            <div className="space-y-1 text-xs">
              {object.type && <InfoItem label="Type" value={object.type} />}
              {object.meshCount && (
                <InfoItem label="Meshes" value={object.meshCount.toString()} />
              )}
              {object.triangleCount && (
                <InfoItem
                  label="Triangles"
                  value={object.triangleCount.toLocaleString()}
                />
              )}
              {object.color && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Color:</span>
                  <div
                    className="w-4 h-4 rounded border border-gray-600"
                    style={{ backgroundColor: object.color }}
                  />
                  <span className="text-white">{object.color}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 재료 정보 탭
const MaterialsInfo: React.FC<{ metadata: ThreeMFMetadata | null }> = ({
  metadata,
}) => {
  if (!metadata?.materials.length && !metadata?.colorMapping) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No material information available</p>
      </div>
    );
  }

  const hasColorMapping =
    metadata?.colorMapping && Object.keys(metadata.colorMapping).length > 0;

  return (
    <div className="space-y-4">
      {/* 재료 정보 */}
      {metadata?.materials.length > 0 && (
        <div>
          <div className="text-sm text-gray-300 mb-3">
            {metadata.materials.length} material(s) found
          </div>

          {metadata.materials.map((material, index) => (
            <div key={material.id} className="p-3 bg-gray-700 rounded-lg mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">
                  {material.name || `Material ${index + 1}`}
                </h4>
                <span className="text-xs text-gray-400">#{material.id}</span>
              </div>

              <div className="space-y-1 text-xs">
                {material.type && (
                  <InfoItem label="Type" value={material.type} />
                )}
                {material.filamentType && (
                  <InfoItem label="Filament" value={material.filamentType} />
                )}
                {material.brand && (
                  <InfoItem label="Brand" value={material.brand} />
                )}
                {material.temperature && (
                  <InfoItem
                    label="Temperature"
                    value={`${material.temperature}°C`}
                  />
                )}
                {material.color && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Color:</span>
                    <div
                      className="w-4 h-4 rounded border border-gray-600"
                      style={{ backgroundColor: material.color }}
                    />
                    <span className="text-white">{material.color}</span>
                  </div>
                )}
                {material.displayColor &&
                  material.displayColor !== material.color && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Display:</span>
                      <div
                        className="w-4 h-4 rounded border border-gray-600"
                        style={{ backgroundColor: material.displayColor }}
                      />
                      <span className="text-white">
                        {material.displayColor}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 색상 매핑 정보 */}
      {hasColorMapping && (
        <div>
          <div className="text-sm text-gray-300 mb-3 pt-4 border-t border-gray-600">
            🎨 Color Information ({Object.keys(metadata!.colorMapping!).length}{" "}
            objects)
          </div>

          <ColorPalette colorMapping={metadata!.colorMapping!} />

          <div className="mt-4 p-2 bg-blue-900 bg-opacity-30 rounded text-xs text-blue-200">
            💡 Tip: Use the &apos;Apply Colors&apos; button in the toolbar to
            apply these colors to the 3D model
          </div>
        </div>
      )}
    </div>
  );
};

// 프린트 설정 탭
const PrintInfo: React.FC<{ metadata: ThreeMFMetadata | null }> = ({
  metadata,
}) => {
  const printSettings = metadata?.printSettings;

  if (!printSettings) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No print settings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-4">Print Settings</div>

      <div className="space-y-3">
        {printSettings.layerHeight && (
          <InfoItem
            label="Layer Height"
            value={`${printSettings.layerHeight}mm`}
          />
        )}
        {printSettings.infill && (
          <InfoItem label="Infill" value={`${printSettings.infill}%`} />
        )}
        {printSettings.printSpeed && (
          <InfoItem
            label="Print Speed"
            value={`${printSettings.printSpeed}mm/s`}
          />
        )}
        {printSettings.temperature && (
          <InfoItem
            label="Temperature"
            value={`${printSettings.temperature}°C`}
          />
        )}
        {printSettings.bedTemperature && (
          <InfoItem
            label="Bed Temperature"
            value={`${printSettings.bedTemperature}°C`}
          />
        )}
        {printSettings.supports !== undefined && (
          <InfoItem
            label="Supports"
            value={printSettings.supports ? "Yes" : "No"}
          />
        )}
        {printSettings.nozzleDiameter && (
          <InfoItem
            label="Nozzle Diameter"
            value={`${printSettings.nozzleDiameter}mm`}
          />
        )}
        {printSettings.filamentType && (
          <InfoItem label="Filament Type" value={printSettings.filamentType} />
        )}
        {printSettings.printer && (
          <InfoItem label="Printer" value={printSettings.printer} />
        )}
        {printSettings.version && (
          <InfoItem label="Slicer Version" value={printSettings.version} />
        )}
      </div>
    </div>
  );
};

// 정보 항목 컴포넌트
const InfoItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between items-start">
    <span className="text-sm text-gray-400">{label}:</span>
    <span className="text-sm text-white text-right ml-2 max-w-48 break-words">
      {value}
    </span>
  </div>
);
