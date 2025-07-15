// JavaScript 기반 3D 슬라이서 (WASM 대체용)

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

// 3D 벡터 클래스
class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}

// 삼각형 클래스
class Triangle {
  constructor(public v1: Vector3, public v2: Vector3, public v3: Vector3) {}

  getBoundingBox(): { min: Vector3; max: Vector3 } {
    const min = new Vector3(
      Math.min(this.v1.x, this.v2.x, this.v3.x),
      Math.min(this.v1.y, this.v2.y, this.v3.y),
      Math.min(this.v1.z, this.v2.z, this.v3.z)
    );
    const max = new Vector3(
      Math.max(this.v1.x, this.v2.x, this.v3.x),
      Math.max(this.v1.y, this.v2.y, this.v3.y),
      Math.max(this.v1.z, this.v2.z, this.v3.z)
    );
    return { min, max };
  }
}

// 레이어 클래스
class Layer {
  contours: Vector3[][] = [];
  infill: Vector3[][] = [];

  constructor(public height: number) {}
}

// JavaScript 기반 슬라이서
class JSSlicer {
  private triangles: Triangle[] = [];
  private layerHeight: number = 0.2;
  private infillDensity: number = 20.0;

  constructor() {
    console.log("🔧 JavaScript 슬라이서 초기화");
  }

  setLayerHeight(height: number): void {
    this.layerHeight = height;
  }

  setInfillDensity(density: number): void {
    this.infillDensity = density;
  }

  // 테스트용 큐브 생성
  createTestCube(): void {
    this.triangles = [];
    const size = 10.0;

    const p1 = new Vector3(-size / 2, -size / 2, -size / 2);
    const p2 = new Vector3(size / 2, -size / 2, -size / 2);
    const p3 = new Vector3(size / 2, size / 2, -size / 2);
    const p4 = new Vector3(-size / 2, size / 2, -size / 2);
    const p5 = new Vector3(-size / 2, -size / 2, size / 2);
    const p6 = new Vector3(size / 2, -size / 2, size / 2);
    const p7 = new Vector3(size / 2, size / 2, size / 2);
    const p8 = new Vector3(-size / 2, size / 2, size / 2);

    // 큐브의 12개 삼각형
    this.triangles = [
      new Triangle(p1, p2, p3),
      new Triangle(p1, p3, p4), // 아래면
      new Triangle(p5, p6, p7),
      new Triangle(p5, p7, p8), // 위면
      new Triangle(p1, p2, p6),
      new Triangle(p1, p6, p5), // 앞면
      new Triangle(p3, p4, p8),
      new Triangle(p3, p8, p7), // 뒷면
      new Triangle(p2, p3, p7),
      new Triangle(p2, p7, p6), // 오른쪽면
      new Triangle(p1, p4, p8),
      new Triangle(p1, p8, p5), // 왼쪽면
    ];
  }

  // STL 파일 파싱 (간단한 버전)
  parseSTL(stlData: string): boolean {
    console.log("📁 STL 파일 파싱 시작");
    this.triangles = [];

    // 실제 구현에서는 STL 바이너리/ASCII 파싱
    // 여기서는 간단한 테스트 큐브 생성
    this.createTestCube();
    return true;
  }

  // 바운딩 박스 계산
  getBoundingBox(): number[] {
    if (this.triangles.length === 0) {
      return [0, 0, 0, 0, 0, 0];
    }

    let minX = this.triangles[0].v1.x,
      maxX = this.triangles[0].v1.x;
    let minY = this.triangles[0].v1.y,
      maxY = this.triangles[0].v1.y;
    let minZ = this.triangles[0].v1.z,
      maxZ = this.triangles[0].v1.z;

    for (const tri of this.triangles) {
      minX = Math.min(minX, tri.v1.x, tri.v2.x, tri.v3.x);
      maxX = Math.max(maxX, tri.v1.x, tri.v2.x, tri.v3.x);
      minY = Math.min(minY, tri.v1.y, tri.v2.y, tri.v3.y);
      maxY = Math.max(maxY, tri.v1.y, tri.v2.y, tri.v3.y);
      minZ = Math.min(minZ, tri.v1.z, tri.v2.z, tri.v3.z);
      maxZ = Math.max(maxZ, tri.v1.z, tri.v2.z, tri.v3.z);
    }

    return [minX, minY, minZ, maxX, maxY, maxZ];
  }

  // 삼각형과 평면의 교차점 계산
  calculateIntersection(tri: Triangle, z: number): Vector3 {
    // 간단한 선형 보간
    const t1 = (z - tri.v1.z) / (tri.v2.z - tri.v1.z);
    const t2 = (z - tri.v2.z) / (tri.v3.z - tri.v2.z);

    const p1 = new Vector3(
      tri.v1.x + t1 * (tri.v2.x - tri.v1.x),
      tri.v1.y + t1 * (tri.v2.y - tri.v1.y),
      z
    );

    const p2 = new Vector3(
      tri.v2.x + t2 * (tri.v3.x - tri.v2.x),
      tri.v2.y + t2 * (tri.v3.y - tri.v2.y),
      z
    );

    return new Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, z);
  }

  // 인필 패턴 생성
  generateInfill(contour: Vector3[], z: number): Vector3[][] {
    const infill: Vector3[][] = [];
    const bbox = this.getBoundingBox();
    const minX = bbox[0],
      maxX = bbox[3];
    const minY = bbox[1],
      maxY = bbox[4];

    const spacing = 2.0; // 인필 간격
    const density = this.infillDensity / 100.0;

    for (let x = minX; x <= maxX; x += spacing / density) {
      const line = [new Vector3(x, minY, z), new Vector3(x, maxY, z)];
      infill.push(line);
    }

    return infill;
  }

  // 레이어별 슬라이싱
  slice(): Layer[] {
    const layers: Layer[] = [];
    const bbox = this.getBoundingBox();
    const minZ = bbox[2];
    const maxZ = bbox[5];

    console.log(
      `🔪 슬라이싱 시작: ${minZ}mm ~ ${maxZ}mm, 레이어 높이: ${this.layerHeight}mm`
    );

    // 레이어 높이별로 슬라이싱
    for (let z = minZ; z <= maxZ; z += this.layerHeight) {
      const layer = new Layer(z);
      const intersections: Vector3[] = [];

      for (const tri of this.triangles) {
        // 삼각형이 현재 레이어와 교차하는지 확인
        if (
          (tri.v1.z <= z && z <= tri.v2.z) ||
          (tri.v2.z <= z && z <= tri.v3.z) ||
          (tri.v3.z <= z && z <= tri.v1.z)
        ) {
          // 교차점 계산
          const intersection = this.calculateIntersection(tri, z);
          intersections.push(intersection);
        }
      }

      // 교차점들을 윤곽선으로 구성
      if (intersections.length > 0) {
        layer.contours.push(intersections);
        layer.infill = this.generateInfill(intersections, z);
      }

      layers.push(layer);
    }

    console.log(`✅ 슬라이싱 완료: ${layers.length}개 레이어 생성`);
    return layers;
  }

  // G-code 생성
  generateGCode(): string {
    const layers = this.slice();
    let gcode = `; Generated by JavaScript Slicer\n`;
    gcode += `; Layer height: ${this.layerHeight}mm\n`;
    gcode += `; Infill density: ${this.infillDensity}%\n\n`;

    gcode += `G21 ; Set units to mm\n`;
    gcode += `G90 ; Absolute positioning\n`;
    gcode += `M82 ; Extruder absolute mode\n\n`;

    let e = 0.0; // 압출량

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];

      gcode += `; Layer ${i} at Z=${layer.height.toFixed(3)}\n`;

      // 윤곽선 출력
      for (const contour of layer.contours) {
        if (contour.length === 0) continue;

        gcode += `G0 Z${layer.height.toFixed(3)} F1200\n`;
        gcode += `G0 X${contour[0].x.toFixed(3)} Y${contour[0].y.toFixed(
          3
        )} F3000\n`;

        for (let j = 1; j < contour.length; j++) {
          e += 0.1; // 간단한 압출량 계산
          gcode += `G1 X${contour[j].x.toFixed(3)} Y${contour[j].y.toFixed(
            3
          )} E${e.toFixed(4)} F1800\n`;
        }
      }

      // 인필 출력
      for (const infillLine of layer.infill) {
        if (infillLine.length < 2) continue;

        gcode += `G0 Z${layer.height.toFixed(3)} F1200\n`;
        gcode += `G0 X${infillLine[0].x.toFixed(3)} Y${infillLine[0].y.toFixed(
          3
        )} F3000\n`;

        e += 0.05;
        gcode += `G1 X${infillLine[1].x.toFixed(3)} Y${infillLine[1].y.toFixed(
          3
        )} E${e.toFixed(4)} F1800\n`;
      }
    }

    gcode += `\nG0 Z${(layers[layers.length - 1].height + 10).toFixed(
      3
    )} F1200\n`;
    gcode += `M84 ; Disable steppers\n`;

    return gcode;
  }

  // JSON 형태로 레이어 정보 반환
  getLayerInfo(): string {
    const layers = this.slice();
    const bbox = this.getBoundingBox();

    const layerInfo: LayerInfo = {
      layerHeight: this.layerHeight,
      infillDensity: this.infillDensity,
      totalLayers: layers.length,
      boundingBox: bbox,
      layers: layers.map((layer) => ({
        height: layer.height,
        contourCount: layer.contours.length,
        infillCount: layer.infill.length,
      })),
    };

    return JSON.stringify(layerInfo, null, 2);
  }
}

// JavaScript 슬라이서 래퍼 클래스
export class JSSlicerWrapper {
  private slicer: JSSlicer;
  private isInitialized = false;

  constructor() {
    this.slicer = new JSSlicer();
  }

  async initialize(): Promise<void> {
    try {
      console.log("✅ JavaScript 슬라이서 초기화 완료");
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ JavaScript 슬라이서 초기화 실패:", error);
      throw error;
    }
  }

  async sliceModel(
    file: File,
    settings: SlicerSettings
  ): Promise<SlicingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = performance.now();

    try {
      console.log("🔪 JavaScript 슬라이싱 시작...");

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

      console.log("✅ JavaScript 슬라이싱 완료:", {
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
      console.error("❌ JavaScript 슬라이싱 실패:", error);
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
    console.log("🧪 JavaScript 슬라이서 테스트 시작...");

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

  // 모듈 상태 확인
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 싱글톤 인스턴스
let jsSlicerInstance: JSSlicerWrapper | null = null;

export function getJSSlicer(): JSSlicerWrapper {
  if (!jsSlicerInstance) {
    jsSlicerInstance = new JSSlicerWrapper();
  }
  return jsSlicerInstance;
}
