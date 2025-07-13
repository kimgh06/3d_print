import JSZip from "jszip";

// 색상 변환 및 유틸리티 함수들
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  // #RRGGBB 또는 #RRGGBBAA 형태 처리
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
  // ARGB 형태를 RGB 헥스로 변환
  if (argb.length === 8) {
    // AARRGGBB -> #RRGGBB
    return "#" + argb.substring(2);
  }
  return argb;
}

export function normalizeColor(color: string): string {
  // 다양한 색상 형태를 표준 #RRGGBB 형태로 변환
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

// 3MF 파일을 파싱하는 메인 함수
export async function parse3MFFile(file: File): Promise<ThreeMFMetadata> {
  const zip = await JSZip.loadAsync(file);
  const metadata: ThreeMFMetadata = {
    objects: [],
    materials: [],
  };

  try {
    // 3D 모델 데이터 파싱
    const modelFile = zip.file("3D/3dmodel.model");
    if (modelFile) {
      const modelXML = await modelFile.async("string");
      await parseModelXML(modelXML, metadata);
    }

    // 썸네일 이미지 추출
    const thumbnailFile = zip.file("Metadata/thumbnail.png");
    if (thumbnailFile) {
      const thumbnailBlob = await thumbnailFile.async("blob");
      metadata.thumbnail = await blobToBase64(thumbnailBlob);
    }

    // Bambu Studio/OrcaSlicer 설정 파싱
    const configFile = zip.file("Metadata/Slic3r_PE.config");
    if (configFile) {
      const configText = await configFile.async("string");
      metadata.printSettings = parsePrintSettings(configText);
    }

    // 플레이트 정보 파싱 (Bambu Studio 전용)
    const plateFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("Metadata/plate_") && name.endsWith(".png")
    );

    if (plateFiles.length > 0) {
      metadata.plates = await parsePlateInfo(zip, plateFiles);
    }

    console.log("3MF 파일 파싱 완료:", metadata);
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

// 3D 모델 XML 파싱
async function parseModelXML(
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

  // 재료 정보 파싱 (개선)
  const materialElements = doc.querySelectorAll("material");
  materialElements.forEach((element) => {
    const id = element.getAttribute("id");
    const name = element.getAttribute("name");

    if (id) {
      const material: ThreeMFMaterial = {
        id,
        name: name || undefined,
      };

      // 색상 정보 추출 (다양한 형태 지원)
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

  // 객체 정보 파싱 (개선)
  const objectElements = doc.querySelectorAll("object");
  objectElements.forEach((element) => {
    const id = element.getAttribute("id");
    const name = element.getAttribute("name");
    const type = element.getAttribute("type");

    if (id) {
      const object: ThreeMFObject = {
        id,
        name: name || undefined,
        type: type || undefined,
      };

      // 재료 참조
      const materialId = element.getAttribute("materialid");
      if (materialId) {
        object.materialId = materialId;
        const material = metadata.materials.find((m) => m.id === materialId);
        if (material) {
          object.material = material.name;
          object.color = material.displayColor || material.color;

          // 색상 매핑에 추가
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

      // 메쉬 정보 파싱
      const meshElements = element.querySelectorAll("mesh");
      object.meshCount = meshElements.length;

      // 삼각형 개수 계산
      let triangleCount = 0;
      meshElements.forEach((mesh) => {
        const triangles = mesh.querySelectorAll("triangle");
        triangleCount += triangles.length;
      });
      object.triangleCount = triangleCount;

      metadata.objects.push(object);
    }
  });

  // 빌드 정보에서 객체 배치 파싱
  const buildElements = doc.querySelectorAll("build item");
  buildElements.forEach((item) => {
    const objectId = item.getAttribute("objectid");
    const transform = item.getAttribute("transform");

    if (objectId) {
      const object = metadata.objects.find((o) => o.id === objectId);
      if (object && transform) {
        object.transform = transform.split(" ").map(parseFloat);
      }
    }
  });
}

// 프린트 설정 파싱
function parsePrintSettings(configText: string): ThreeMFPrintSettings {
  const settings: ThreeMFPrintSettings = {};

  // 설정 파싱 (키=값 형태)
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
        objects: [], // 실제 구현에서는 플레이트별 객체 정보 파싱 필요
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
