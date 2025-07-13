import * as THREE from "three";

export class ThumbnailGenerator {
  private static instance: ThumbnailGenerator;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private constructor() {}

  static getInstance(): ThumbnailGenerator {
    if (!ThumbnailGenerator.instance) {
      ThumbnailGenerator.instance = new ThumbnailGenerator();
    }
    return ThumbnailGenerator.instance;
  }

  /**
   * 썸네일 생성 환경 초기화
   */
  private initialize(size: number = 128) {
    if (this.renderer) {
      return; // 이미 초기화됨
    }

    // 오프스크린 캔버스 생성
    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;

    // 렌더러 생성
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(size, size);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0xffffff, 0); // 투명 배경

    // 씬 생성
    this.scene = new THREE.Scene();

    // 카메라 생성
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    // 조명 설정
    this.setupLighting();
  }

  /**
   * 조명 설정
   */
  private setupLighting() {
    if (!this.scene) return;

    // 환경광
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // 방향광
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // 추가 방향광 (뒤쪽)
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, -5, -5);
    this.scene.add(backLight);
  }

  /**
   * 메시에서 썸네일 생성
   */
  async generateThumbnail(
    mesh: THREE.Mesh,
    options: {
      size?: number;
      backgroundColor?: string;
      angle?: "front" | "iso" | "top";
      quality?: number;
    } = {}
  ): Promise<string> {
    const {
      size = 128,
      backgroundColor = "#ffffff",
      angle = "iso",
      quality = 0.8,
    } = options;

    this.initialize(size);

    if (!this.scene || !this.camera || !this.renderer) {
      throw new Error("Failed to initialize thumbnail generator");
    }

    // 씬 클리어
    this.scene.clear();
    this.setupLighting();

    // 메시 복사 (원본 영향 방지)
    const meshCopy = mesh.clone();
    meshCopy.position.set(0, 0, 0);
    meshCopy.rotation.set(0, 0, 0);
    meshCopy.scale.set(1, 1, 1);

    // 메시를 씬에 추가
    this.scene.add(meshCopy);

    // 메시 경계 박스 계산
    const box = new THREE.Box3().setFromObject(meshCopy);
    const center = box.getCenter(new THREE.Vector3());
    const size3D = box.getSize(new THREE.Vector3());

    // 메시를 중앙으로 이동
    meshCopy.position.sub(center);

    // 카메라 위치 설정
    this.setCameraPosition(angle, size3D, this.camera);

    // 배경색 설정 (안전한 색상 처리)
    if (backgroundColor === "transparent") {
      this.renderer.setClearColor(0x000000, 0); // 투명 배경
    } else {
      try {
        // 유효한 색상인지 확인
        const color = new THREE.Color(backgroundColor);
        this.renderer.setClearColor(color, 1);
      } catch (colorError) {
        console.warn("유효하지 않은 배경색:", backgroundColor, "기본값 사용");
        this.renderer.setClearColor(0xf0f0f0, 1); // 기본 밝은 회색
      }
    }

    // 렌더링
    this.renderer.render(this.scene, this.camera);

    // 썸네일 이미지 생성
    const dataURL = this.canvas!.toDataURL("image/png", quality);

    // 씬에서 메시 제거
    this.scene.remove(meshCopy);

    return dataURL;
  }

  /**
   * 카메라 위치 설정
   */
  private setCameraPosition(
    angle: "front" | "iso" | "top",
    size: THREE.Vector3,
    camera: THREE.PerspectiveCamera
  ) {
    const maxDimension = Math.max(size.x, size.y, size.z);
    const distance = maxDimension * 2;

    switch (angle) {
      case "front":
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
        break;
      case "top":
        camera.position.set(0, distance, 0);
        camera.lookAt(0, 0, 0);
        break;
      case "iso":
      default:
        camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
        camera.lookAt(0, 0, 0);
        break;
    }
  }

  /**
   * 여러 각도에서 썸네일 생성
   */
  async generateMultiAngleThumbnails(
    mesh: THREE.Mesh,
    options: {
      size?: number;
      backgroundColor?: string;
      quality?: number;
    } = {}
  ): Promise<{
    front: string;
    iso: string;
    top: string;
  }> {
    const front = await this.generateThumbnail(mesh, {
      ...options,
      angle: "front",
    });
    const iso = await this.generateThumbnail(mesh, {
      ...options,
      angle: "iso",
    });
    const top = await this.generateThumbnail(mesh, {
      ...options,
      angle: "top",
    });

    return { front, iso, top };
  }

  /**
   * 썸네일 생성기 정리
   */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }
    this.camera = null;
    this.canvas = null;
  }

  /**
   * 파일에서 직접 썸네일 생성
   */
  async generateThumbnailFromFile(
    file: File,
    options: {
      size?: number;
      backgroundColor?: string;
      angle?: "front" | "iso" | "top";
      quality?: number;
    } = {}
  ): Promise<string> {
    // 간단한 구현 - 실제로는 파일 파싱이 필요
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    const size = options.size || 128;
    canvas.width = size;
    canvas.height = size;

    // 기본 썸네일 생성 (파일 이름 기반)
    const backgroundColor = options.backgroundColor || "#f0f0f0";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    // 파일 확장자 추출
    const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";

    // 파일 타입에 따른 색상
    const typeColors: Record<string, string> = {
      STL: "#3b82f6",
      "3MF": "#10b981",
      OBJ: "#f59e0b",
      PLY: "#8b5cf6",
    };

    const color = typeColors[extension] || "#6b7280";

    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, color + "20");
    gradient.addColorStop(1, color + "10");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 아이콘 그리기 (간단한 박스)
    const iconSize = size * 0.4;
    const iconX = (size - iconSize) / 2;
    const iconY = (size - iconSize) / 2;

    ctx.fillStyle = color;
    ctx.fillRect(iconX, iconY, iconSize, iconSize);

    // 파일 확장자 텍스트
    ctx.fillStyle = "#ffffff";
    ctx.font = `${size * 0.1}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(extension, size / 2, size / 2);

    // 파일 이름 텍스트
    ctx.fillStyle = "#374151";
    ctx.font = `${size * 0.08}px Arial`;
    const fileName =
      file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name;
    ctx.fillText(fileName, size / 2, size * 0.9);

    return canvas.toDataURL("image/png", options.quality || 0.8);
  }
}
