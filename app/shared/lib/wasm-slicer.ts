// WASM 슬라이서 TypeScript 래퍼

export interface SlicerSettings {
  layerHeight: number;
  infillDensity: number;
}

export interface SlicingResult {
  gcode: string;
  layerInfo: any;
  boundingBox: number[];
  totalLayers: number;
  processingTime: number;
}

export interface LayerInfo {
  layerHeight: number;
  infillDensity: number;
  totalLayers: number;
  boundingBox: number[];
  layers: Array<{
    height: number;
    contourCount: number;
    infillCount: number;
  }>;
}

declare global {
  interface Window {
    SimpleSlicer: any;
    Vector3: any;
  }
}

export class WASMSlicer {
  private module: any = null;
  private slicer: any = null;
  private isInitialized = false;

  constructor() {
    this.loadModule();
  }

  private async loadModule(): Promise<void> {
    try {
      console.log("🔄 WASM 모듈 로딩 중...");

      // WASM 모듈 동적 로드
      const response = await fetch("/slicer.js");
      const script = await response.text();

      // 스크립트 실행
      const scriptElement = document.createElement("script");
      scriptElement.textContent = script;
      document.head.appendChild(scriptElement);

      // 모듈 초기화 대기
      await this.waitForModule();

      this.isInitialized = true;
      console.log("✅ WASM 모듈 로딩 완료");
    } catch (error) {
      console.error("❌ WASM 모듈 로딩 실패:", error);
      throw new Error("WASM 모듈을 로드할 수 없습니다.");
    }
  }

  private waitForModule(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkModule = () => {
        if (window.SimpleSlicer) {
          resolve();
        } else {
          setTimeout(checkModule, 100);
        }
      };
      checkModule();

      // 타임아웃 설정
      setTimeout(() => {
        reject(new Error("WASM 모듈 로딩 타임아웃"));
      }, 10000);
    });
  }

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadModule();
    }

    try {
      this.slicer = new window.SimpleSlicer();
      console.log("✅ WASM 슬라이서 초기화 완료");
    } catch (error) {
      console.error("❌ WASM 슬라이서 초기화 실패:", error);
      throw error;
    }
  }

  async sliceModel(
    file: File,
    settings: SlicerSettings
  ): Promise<SlicingResult> {
    if (!this.slicer) {
      await this.initialize();
    }

    const startTime = performance.now();

    try {
      console.log("🔪 WASM 슬라이싱 시작...");

      // 설정 적용
      this.slicer.setLayerHeight(settings.layerHeight);
      this.slicer.setInfillDensity(settings.infillDensity);

      // 파일 데이터 읽기 (간단한 테스트용)
      const fileData = await this.readFileAsText(file);

      // STL 파싱 (현재는 테스트 큐브 생성)
      const parseSuccess = this.slicer.parseSTL(fileData);
      if (!parseSuccess) {
        throw new Error("STL 파일 파싱 실패");
      }

      // 바운딩 박스 가져오기
      const boundingBox = this.slicer.getBoundingBox();

      // 레이어 정보 가져오기
      const layerInfoJson = this.slicer.getLayerInfo();
      const layerInfo: LayerInfo = JSON.parse(layerInfoJson);

      // G-code 생성
      const gcode = this.slicer.generateGCode();

      const processingTime = performance.now() - startTime;

      console.log("✅ WASM 슬라이싱 완료:", {
        processingTime: `${processingTime.toFixed(2)}ms`,
        totalLayers: layerInfo.totalLayers,
        gcodeLength: gcode.length,
      });

      return {
        gcode,
        layerInfo,
        boundingBox,
        totalLayers: layerInfo.totalLayers,
        processingTime,
      };
    } catch (error) {
      console.error("❌ WASM 슬라이싱 실패:", error);
      throw error;
    }
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // 간단한 테스트 함수
  async testSlicing(): Promise<SlicingResult> {
    console.log("🧪 WASM 슬라이서 테스트 시작...");

    const settings: SlicerSettings = {
      layerHeight: 0.2,
      infillDensity: 20,
    };

    // 가상의 파일 객체 생성
    const testFile = new File(["test"], "test.stl", {
      type: "application/octet-stream",
    });

    return await this.sliceModel(testFile, settings);
  }

  // 메모리 사용량 확인
  getMemoryUsage(): { used: number; total: number } {
    if (!this.module) {
      return { used: 0, total: 0 };
    }

    // Emscripten 메모리 정보 (실제 구현에서는 모듈에서 가져옴)
    return {
      used: 0, // 실제 메모리 사용량
      total: 128 * 1024 * 1024, // 128MB 제한
    };
  }

  // 모듈 상태 확인
  isReady(): boolean {
    return this.isInitialized && this.slicer !== null;
  }
}

// 싱글톤 인스턴스
let wasmSlicerInstance: WASMSlicer | null = null;

export function getWASMSlicer(): WASMSlicer {
  if (!wasmSlicerInstance) {
    wasmSlicerInstance = new WASMSlicer();
  }
  return wasmSlicerInstance;
}
