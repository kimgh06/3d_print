import * as THREE from "three";
import { PlateSettings, PlateSize } from "~/shared/types/plate";

export class PlateHelper {
  private plateGroup: THREE.Group;
  private gridHelper?: THREE.GridHelper;
  private boundaryHelper?: THREE.LineLoop;
  private plateGeometry?: THREE.PlaneGeometry;
  private plateMaterial?: THREE.MeshBasicMaterial;
  private plateMesh?: THREE.Mesh;

  constructor() {
    this.plateGroup = new THREE.Group();
    this.plateGroup.name = "PlateGroup";
  }

  /**
   * Plate 시각화 생성/업데이트
   */
  createPlate(settings: PlateSettings): THREE.Group {
    this.clearPlate();

    const { size, gridSize, showGrid, showBoundary, color } = settings;

    // Plate 바닥면 생성
    this.createPlateBase(size, color);

    // 격자 생성
    if (showGrid) {
      this.createGrid(size, gridSize);
    }

    // 경계선 생성
    if (showBoundary) {
      this.createBoundary(size);
    }

    return this.plateGroup;
  }

  /**
   * Plate 바닥면 생성
   */
  private createPlateBase(size: PlateSize, color: string): void {
    // mm를 Three.js 단위로 변환 (1mm = 0.1 Three.js 단위)
    const width = size.width * 0.1;
    const height = size.height * 0.1;

    this.plateGeometry = new THREE.PlaneGeometry(width, height);
    this.plateMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });

    this.plateMesh = new THREE.Mesh(this.plateGeometry, this.plateMaterial);
    this.plateMesh.rotation.x = -Math.PI / 2; // 수평으로 배치
    this.plateMesh.position.y = -0.01; // 약간 아래에 배치
    this.plateMesh.name = "PlateBase";

    this.plateGroup.add(this.plateMesh);
  }

  /**
   * 격자 생성
   */
  private createGrid(size: PlateSize, gridSize: number): void {
    const width = size.width * 0.1;
    const height = size.height * 0.1;
    const divisions = Math.max(Math.floor(size.width / gridSize), 1);

    this.gridHelper = new THREE.GridHelper(
      Math.max(width, height),
      divisions,
      0x888888,
      0x444444
    );
    this.gridHelper.name = "PlateGrid";

    this.plateGroup.add(this.gridHelper);
  }

  /**
   * 경계선 생성
   */
  private createBoundary(size: PlateSize): void {
    const width = size.width * 0.1;
    const height = size.height * 0.1;

    const points = [
      new THREE.Vector3(-width / 2, 0.01, -height / 2),
      new THREE.Vector3(width / 2, 0.01, -height / 2),
      new THREE.Vector3(width / 2, 0.01, height / 2),
      new THREE.Vector3(-width / 2, 0.01, height / 2),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff4444,
      linewidth: 3,
    });

    this.boundaryHelper = new THREE.LineLoop(geometry, material);
    this.boundaryHelper.name = "PlateBoundary";

    this.plateGroup.add(this.boundaryHelper);
  }

  /**
   * Plate 정리
   */
  private clearPlate(): void {
    this.plateGroup.clear();

    if (this.plateGeometry) {
      this.plateGeometry.dispose();
    }
    if (this.plateMaterial) {
      this.plateMaterial.dispose();
    }
  }

  /**
   * Plate 설정 업데이트
   */
  updateSettings(settings: PlateSettings): void {
    this.createPlate(settings);
  }

  /**
   * Plate 경계 확인
   */
  static isInsidePlate(position: THREE.Vector3, plateSize: PlateSize): boolean {
    const width = plateSize.width * 0.1;
    const height = plateSize.height * 0.1;

    return (
      position.x >= -width / 2 &&
      position.x <= width / 2 &&
      position.z >= -height / 2 &&
      position.z <= height / 2
    );
  }

  /**
   * 월드 좌표를 Plate 좌표로 변환 (mm 단위)
   */
  static worldToPlateCoordinates(worldPos: THREE.Vector3): {
    x: number;
    y: number;
  } {
    return {
      x: worldPos.x * 10, // Three.js 단위를 mm로 변환
      y: worldPos.z * 10,
    };
  }

  /**
   * Plate 좌표를 월드 좌표로 변환
   */
  static plateToWorldCoordinates(
    plateX: number,
    plateY: number
  ): THREE.Vector3 {
    return new THREE.Vector3(
      plateX * 0.1, // mm를 Three.js 단위로 변환
      0,
      plateY * 0.1
    );
  }

  /**
   * Plate 그룹 반환
   */
  getPlateGroup(): THREE.Group {
    return this.plateGroup;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.clearPlate();
  }
}

/**
 * 기본 Plate 설정
 */
export const DEFAULT_PLATE_SETTINGS: PlateSettings = {
  size: { width: 256, height: 256 }, // mm
  gridSize: 10, // mm
  showGrid: true,
  showBoundary: true,
  color: "#2a2a2a",
};

/**
 * 일반적인 Plate 크기들
 */
export const COMMON_PLATE_SIZES: Record<string, PlateSize> = {
  "Ender 3": { width: 220, height: 220 },
  "Prusa i3": { width: 250, height: 210 },
  "Bambu X1": { width: 256, height: 256 },
  "Ultimaker S3": { width: 230, height: 190 },
  Custom: { width: 200, height: 200 },
};
