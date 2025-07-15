import JSZip from "jszip";

// 색상 변환 및 유틸리티 함수들
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function argbToHex(argb: string): string {
  if (argb.length === 8) {
    return "#" + argb.substring(2);
  }
  return argb;
}

export function normalizeColor(color: string): string {
  if (color.startsWith("#")) {
    return color.length > 7 ? color.substring(0, 7) : color;
  }
  if (color.length === 8) {
    return argbToHex(color);
  }
  return "#" + color;
}

// 3MF 파일의 메타데이터 타입 정의
export interface ThreeMFMetadata {
  // 기본 정보
  title?: string;
  description?: string;
  creator?: string;
  creationDate?: string;
  modificationDate?: string;

  // 모델 정보
  objects: ThreeMFObject[];
  materials: ThreeMFMaterial[];

  // 프린트 설정
  printSettings?: ThreeMFPrintSettings;

  // 플레이트 정보
  plates?: ThreeMFPlate[];

  // 썸네일
  thumbnail?: string; // base64 데이터

  // 색상 매핑
  colorMapping?: Record<string, string>; // objectId -> color

  // Production Extension 정보
  isProductionExtension?: boolean;
  modelFiles?: string[]; // 분리된 모델 파일 목록
}

export interface ThreeMFObject {
  id: string;
  name?: string;
  type?: string;
  meshCount?: number;
  triangleCount?: number;
  volume?: number;
  boundingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  color?: string;
  material?: string;
  materialId?: string; // 재료 ID 참조
  transform?: number[]; // 변환 행렬
  modelFile?: string; // Production Extension에서 참조하는 모델 파일
}

export interface ThreeMFMaterial {
  id: string;
  name?: string;
  type?: string;
  color?: string;
  displayColor?: string;
  settings?: Record<string, unknown>;
  // 필라멘트 정보
  filamentType?: string;
  brand?: string;
  temperature?: number;
}

export interface ThreeMFPrintSettings {
  layerHeight?: number;
  infill?: number;
  printSpeed?: number;
  temperature?: number;
  bedTemperature?: number;
  supports?: boolean;
  nozzleDiameter?: number;
  filamentType?: string;
  printer?: string;
  version?: string;
}

export interface ThreeMFPlate {
  id: string;
  name?: string;
  objects: string[];
  thumbnail?: string;
}

// Bambu Studio 3MF Production Extension 지원 파서
export async function parse3MFFile(file: File): Promise<ThreeMFMetadata> {
  const zip = await JSZip.loadAsync(file);
  const metadata: ThreeMFMetadata = {
    objects: [],
    materials: [],
  };

  try {
    // 1. 루트 모델 파일 확인 (3MF Production Extension 감지)
    const rootModelFile = zip.file("3D/3dmodel.model");
    if (!rootModelFile) {
      throw new Error("3MF 파일에 루트 모델 파일이 없습니다.");
    }

    const rootModelXML = await rootModelFile.async("string");
    const isProductionExtension = await detectProductionExtension(rootModelXML);
    metadata.isProductionExtension = isProductionExtension;

    // 2. 병렬로 여러 작업을 동시에 실행
    const parsePromises = [];

    // 3. 루트 모델 XML 파싱 (필수)
    parsePromises.push(parseRootModelXML(rootModelXML, metadata));

    // 4. 썸네일 이미지 추출 (선택적, 지연 로딩)
    const thumbnailFile = zip.file("Metadata/thumbnail.png");
    if (thumbnailFile) {
      parsePromises.push(
        thumbnailFile.async("blob").then(async (blob) => {
          metadata.thumbnail = await blobToBase64(blob);
        })
      );
    }

    // 5. Bambu Studio/OrcaSlicer 설정 파싱 (선택적)
    const configFile = zip.file("Metadata/Slic3r_PE.config");
    if (configFile) {
      parsePromises.push(
        configFile.async("string").then((configText) => {
          metadata.printSettings = parsePrintSettings(configText);
        })
      );
    }

    // 6. 플레이트 정보 파싱 (Bambu Studio 전용)
    const plateFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("Metadata/plate_") && name.endsWith(".png")
    );
    if (plateFiles.length > 0) {
      parsePromises.push(
        parsePlateInfo(zip, plateFiles).then((plates) => {
          metadata.plates = plates;
        })
      );
    }

    // 7. Production Extension인 경우 분리된 모델 파일들 처리
    if (isProductionExtension) {
      parsePromises.push(parseProductionExtensionModels(zip, metadata));
    }

    // 모든 파싱 작업을 병렬로 실행
    await Promise.all(parsePromises);

    console.log("3MF 파일 파싱 완료 (Production Extension 지원):", metadata);
    return metadata;
  } catch (error) {
    console.error("3MF 파일 파싱 중 오류:", error);
    throw new Error(
      `3MF 파일 파싱 실패: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// 3MF Production Extension 감지
async function detectProductionExtension(
  rootModelXML: string
): Promise<boolean> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rootModelXML, "application/xml");

  // Production Extension의 특징: resources 섹션에 외부 파일 참조가 있음
  const resources = doc.querySelector("resources");
  if (resources) {
    const externalReferences = resources.querySelectorAll("object[path]");
    return externalReferences.length > 0;
  }

  return false;
}

// 루트 모델 XML 파싱 (Production Extension 지원)
async function parseRootModelXML(
  xmlContent: string,
  metadata: ThreeMFMetadata
): Promise<void> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "application/xml");

  // 색상 매핑 초기화
  metadata.colorMapping = {};

  // 메타데이터 파싱
  const metadataElements = doc.querySelectorAll("metadata");
  metadataElements.forEach((element) => {
    const name = element.getAttribute("name");
    const value = element.textContent;

    switch (name) {
      case "Title":
        metadata.title = value || undefined;
        break;
      case "Description":
        metadata.description = value || undefined;
        break;
      case "Creator":
        metadata.creator = value || undefined;
        break;
      case "CreationDate":
        metadata.creationDate = value || undefined;
        break;
      case "ModificationDate":
        metadata.modificationDate = value || undefined;
        break;
    }
  });

  // 재료 정보 파싱
  const materialElements = doc.querySelectorAll("material");
  materialElements.forEach((element) => {
    const id = element.getAttribute("id");
    const name = element.getAttribute("name");

    if (id) {
      const material: ThreeMFMaterial = {
        id,
        name: name || undefined,
      };

      // 색상 정보 추출
      const colorElement = element.querySelector("color");
      if (colorElement) {
        const colorValue = colorElement.getAttribute("value");
        if (colorValue) {
          material.color = normalizeColor(colorValue);
          material.displayColor = material.color;
        }
      }

      // PLA 색상 정보 (Bambu Studio 전용)
      const plaColorElement = element.querySelector("pla_color");
      if (plaColorElement) {
        const colorValue = plaColorElement.getAttribute("value");
        if (colorValue) {
          material.displayColor = normalizeColor(colorValue);
        }
      }

      // 필라멘트 정보
      const filamentElement = element.querySelector("filament_type");
      if (filamentElement) {
        material.filamentType = filamentElement.textContent || undefined;
      }

      const brandElement = element.querySelector("filament_brand");
      if (brandElement) {
        material.brand = brandElement.textContent || undefined;
      }

      const tempElement = element.querySelector("temperature");
      if (tempElement) {
        material.temperature = parseFloat(tempElement.textContent || "0");
      }

      metadata.materials.push(material);
    }
  });

  // 객체 정보 파싱 (Production Extension 지원)
  const objectElements = doc.querySelectorAll("object");
  objectElements.forEach((element) => {
    const id = element.getAttribute("id");
    const name = element.getAttribute("name");
    const type = element.getAttribute("type");
    const path = element.getAttribute("path"); // Production Extension에서 외부 파일 경로

    if (id) {
      const object: ThreeMFObject = {
        id,
        name: name || undefined,
        type: type || undefined,
      };

      // Production Extension: 외부 모델 파일 참조
      if (path) {
        object.modelFile = path;
      }

      // 재료 참조
      const materialId = element.getAttribute("materialid");
      if (materialId) {
        object.materialId = materialId;
        const material = metadata.materials.find((m) => m.id === materialId);
        if (material) {
          object.material = material.name;
          object.color = material.displayColor || material.color;

          if (object.color) {
            metadata.colorMapping![id] = object.color;
          }
        }
      }

      // 직접 색상 지정
      const colorAttr = element.getAttribute("color");
      if (colorAttr) {
        object.color = normalizeColor(colorAttr);
        metadata.colorMapping![id] = object.color;
      }

      // 변환 행렬
      const transformAttr = element.getAttribute("transform");
      if (transformAttr) {
        object.transform = transformAttr.split(" ").map(parseFloat);
      }

      // 빌드 정보에서 객체 배치 파싱
      const buildElements = doc.querySelectorAll("build item");
      buildElements.forEach((item) => {
        const objectId = item.getAttribute("objectid");
        const transform = item.getAttribute("transform");

        if (objectId === id && transform) {
          object.transform = transform.split(" ").map(parseFloat);
        }
      });

      metadata.objects.push(object);
    }
  });
}

// Production Extension 모델 파일들 파싱
async function parseProductionExtensionModels(
  zip: JSZip,
  metadata: ThreeMFMetadata
): Promise<void> {
  const modelFiles: string[] = [];

  // 분리된 모델 파일들 찾기
  Object.keys(zip.files).forEach((fileName) => {
    if (fileName.startsWith("3D/3dmodel_") && fileName.endsWith(".model")) {
      modelFiles.push(fileName);
    }
  });

  metadata.modelFiles = modelFiles;

  // 각 모델 파일을 병렬로 파싱
  const modelParsePromises = modelFiles.map(async (fileName) => {
    const modelFile = zip.file(fileName);
    if (modelFile) {
      const modelXML = await modelFile.async("string");
      return parseIndividualModelXML(modelXML, fileName);
    }
    return null;
  });

  const modelResults = await Promise.all(modelParsePromises);

  // 결과를 메타데이터에 병합
  modelResults.forEach((result) => {
    if (result) {
      // 개별 모델의 메쉬 정보를 해당 객체에 추가
      const object = metadata.objects.find(
        (obj) => obj.modelFile === result.fileName
      );
      if (object) {
        object.meshCount = result.meshCount;
        object.triangleCount = result.triangleCount;
        object.boundingBox = result.boundingBox;
      }
    }
  });
}

// 개별 모델 XML 파싱
async function parseIndividualModelXML(
  xmlContent: string,
  fileName: string
): Promise<{
  fileName: string;
  meshCount: number;
  triangleCount: number;
  boundingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
} | null> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "application/xml");

  const meshElements = doc.querySelectorAll("mesh");
  const meshCount = meshElements.length;

  // 삼각형 개수 계산
  let triangleCount = 0;
  meshElements.forEach((mesh) => {
    const triangles = mesh.querySelectorAll("triangle");
    triangleCount += triangles.length;
  });

  // 바운딩 박스 계산 (간단한 버전)
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  const vertices = doc.querySelectorAll("vertices vertex");
  vertices.forEach((vertex) => {
    const x = parseFloat(vertex.getAttribute("x") || "0");
    const y = parseFloat(vertex.getAttribute("y") || "0");
    const z = parseFloat(vertex.getAttribute("z") || "0");

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  const boundingBox =
    vertices.length > 0
      ? {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ },
        }
      : undefined;

  return {
    fileName,
    meshCount,
    triangleCount,
    boundingBox,
  };
}

// 프린트 설정 파싱
function parsePrintSettings(configText: string): ThreeMFPrintSettings {
  const settings: ThreeMFPrintSettings = {};

  const lines = configText.split("\n");
  lines.forEach((line) => {
    const [key, value] = line.split("=").map((s) => s.trim());
    if (key && value) {
      switch (key) {
        case "layer_height":
          settings.layerHeight = parseFloat(value);
          break;
        case "fill_density":
          settings.infill = parseFloat(value);
          break;
        case "print_speed":
          settings.printSpeed = parseFloat(value);
          break;
        case "temperature":
          settings.temperature = parseFloat(value);
          break;
        case "bed_temperature":
          settings.bedTemperature = parseFloat(value);
          break;
        case "support_material":
          settings.supports = value === "1" || value.toLowerCase() === "true";
          break;
        case "nozzle_diameter":
          settings.nozzleDiameter = parseFloat(value);
          break;
        case "filament_type":
          settings.filamentType = value;
          break;
        case "printer_model":
          settings.printer = value;
          break;
        case "version":
          settings.version = value;
          break;
      }
    }
  });

  return settings;
}

// 플레이트 정보 파싱
async function parsePlateInfo(
  zip: JSZip,
  plateFiles: string[]
): Promise<ThreeMFPlate[]> {
  const plates: ThreeMFPlate[] = [];

  for (const plateFile of plateFiles) {
    const plateId = plateFile.match(/plate_(\d+)\.png/)?.[1];
    if (plateId) {
      const thumbnailFile = zip.file(plateFile);
      let thumbnail: string | undefined;

      if (thumbnailFile) {
        const thumbnailBlob = await thumbnailFile.async("blob");
        thumbnail = await blobToBase64(thumbnailBlob);
      }

      plates.push({
        id: plateId,
        name: `Plate ${plateId}`,
        objects: [],
        thumbnail,
      });
    }
  }

  return plates;
}

// Blob을 Base64로 변환
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 3MF 파일 여부 확인
export function is3MFFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".3mf") ||
    file.type === "application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
  );
}

// 용량 포맷팅 유틸리티
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 날짜 포맷팅 유틸리티
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
