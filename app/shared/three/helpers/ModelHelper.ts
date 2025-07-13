import * as THREE from "three";
import { STLLoader } from "three-stdlib";
import { GLTFLoader } from "three-stdlib";
import { Transform } from "~/shared/types/plate";

export class ModelHelper {
  private static instance: ModelHelper;
  private stlLoader: STLLoader;
  private gltfLoader: GLTFLoader;
  private loadingManager: THREE.LoadingManager;

  private constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.stlLoader = new STLLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
  }

  static getInstance(): ModelHelper {
    if (!ModelHelper.instance) {
      ModelHelper.instance = new ModelHelper();
    }
    return ModelHelper.instance;
  }

  /**
   * 파일에서 3D 모델 로드
   */
  async loadModelFromFile(file: File): Promise<THREE.Mesh> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;

        try {
          const mesh = this.parseModelFromBuffer(buffer, file.name);
          resolve(mesh);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * ArrayBuffer에서 모델 파싱
   */
  private parseModelFromBuffer(
    buffer: ArrayBuffer,
    fileName: string
  ): THREE.Mesh {
    const extension = fileName.toLowerCase().split(".").pop();

    switch (extension) {
      case "stl":
        return this.parseSTL(buffer);
      case "obj":
        return this.parseOBJ(buffer);
      case "3mf":
        return this.parse3MF(buffer);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  /**
   * STL 파일 파싱
   */
  private parseSTL(buffer: ArrayBuffer): THREE.Mesh {
    const geometry = this.stlLoader.parse(buffer);
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    // 중심을 원점으로 이동
    geometry.center();

    const material = this.createDefaultMaterial();
    return new THREE.Mesh(geometry, material);
  }

  /**
   * OBJ 파일 파싱 (간단한 구현)
   */
  private parseOBJ(buffer: ArrayBuffer): THREE.Mesh {
    // 실제로는 OBJLoader를 사용해야 하지만, 일단 STL과 동일하게 처리
    const geometry = this.stlLoader.parse(buffer);
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    geometry.center();

    const material = this.createDefaultMaterial();
    return new THREE.Mesh(geometry, material);
  }

  /**
   * 3MF 파일 파싱 (기본 구현)
   */
  private parse3MF(_buffer: ArrayBuffer): THREE.Mesh {
    // 3MF 파싱은 복잡하므로 일단 기본 박스로 대체
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = this.createDefaultMaterial();
    return new THREE.Mesh(geometry, material);
  }

  /**
   * 기본 재질 생성
   */
  private createDefaultMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      color: 0x888888,
      side: THREE.DoubleSide,
    });
  }

  /**
   * 모델 색상 설정
   */
  static setModelColor(mesh: THREE.Mesh, color: string): void {
    if (
      mesh.material instanceof THREE.MeshLambertMaterial ||
      mesh.material instanceof THREE.MeshBasicMaterial
    ) {
      mesh.material.color = new THREE.Color(color);
      mesh.material.needsUpdate = true;
    }
  }

  /**
   * 모델 선택 상태 시각화
   */
  static setModelSelected(mesh: THREE.Mesh, selected: boolean): void {
    if (
      mesh.material instanceof THREE.MeshLambertMaterial ||
      mesh.material instanceof THREE.MeshBasicMaterial
    ) {
      const material = mesh.material;

      if (selected) {
        material.emissive = new THREE.Color(0x444444);
        if ("emissiveIntensity" in material) {
          (material as THREE.MeshLambertMaterial).emissiveIntensity = 0.3;
        }
      } else {
        material.emissive = new THREE.Color(0x000000);
        if ("emissiveIntensity" in material) {
          (material as THREE.MeshLambertMaterial).emissiveIntensity = 0;
        }
      }

      material.needsUpdate = true;
    }
  }

  /**
   * 충돌 상태 시각화
   */
  static setModelCollision(mesh: THREE.Mesh, hasCollision: boolean): void {
    if (
      mesh.material instanceof THREE.MeshLambertMaterial ||
      mesh.material instanceof THREE.MeshBasicMaterial
    ) {
      const material = mesh.material;

      if (hasCollision) {
        material.emissive = new THREE.Color(0xff0000);
        if ("emissiveIntensity" in material) {
          (material as THREE.MeshLambertMaterial).emissiveIntensity = 0.2;
        }
      } else {
        material.emissive = new THREE.Color(0x000000);
        if ("emissiveIntensity" in material) {
          (material as THREE.MeshLambertMaterial).emissiveIntensity = 0;
        }
      }

      material.needsUpdate = true;
    }
  }

  /**
   * 모델 변형 적용
   */
  static applyTransform(mesh: THREE.Mesh, transform: Transform): void {
    mesh.position.set(
      transform.position.x * 0.1, // mm to Three.js units
      transform.position.y * 0.1,
      transform.position.z * 0.1
    );

    mesh.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    );

    mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  /**
   * 모델에서 변형 정보 추출
   */
  static getTransformFromMesh(mesh: THREE.Mesh): Transform {
    return {
      position: {
        x: mesh.position.x * 10, // Three.js units to mm
        y: mesh.position.y * 10,
        z: mesh.position.z * 10,
      },
      rotation: {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z,
      },
      scale: {
        x: mesh.scale.x,
        y: mesh.scale.y,
        z: mesh.scale.z,
      },
    };
  }

  /**
   * 모델 경계 박스 계산
   */
  static calculateBoundingBox(mesh: THREE.Mesh): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    return box;
  }

  /**
   * 두 모델 간 충돌 검사
   */
  static checkCollision(mesh1: THREE.Mesh, mesh2: THREE.Mesh): boolean {
    const box1 = this.calculateBoundingBox(mesh1);
    const box2 = this.calculateBoundingBox(mesh2);

    return box1.intersectsBox(box2);
  }

  /**
   * 모델을 Plate 바닥에 배치
   */
  static snapToPlate(mesh: THREE.Mesh): void {
    const box = this.calculateBoundingBox(mesh);
    const yOffset = -box.min.y;
    mesh.position.y = yOffset;
  }

  /**
   * 모델 복제
   */
  static cloneModel(mesh: THREE.Mesh): THREE.Mesh {
    const clonedGeometry = mesh.geometry.clone();
    const clonedMaterial = (mesh.material as THREE.Material).clone();

    const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
    clonedMesh.position.copy(mesh.position);
    clonedMesh.rotation.copy(mesh.rotation);
    clonedMesh.scale.copy(mesh.scale);

    return clonedMesh;
  }

  /**
   * 모델 정리
   */
  static disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
}

/**
 * 색상 유틸리티
 */
export class ColorUtils {
  private static colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  private static usedColors = new Set<string>();

  /**
   * 사용되지 않은 색상 반환
   */
  static getNextAvailableColor(): string {
    for (const color of this.colors) {
      if (!this.usedColors.has(color)) {
        this.usedColors.add(color);
        return color;
      }
    }

    // 모든 색상이 사용된 경우 랜덤 색상 생성
    return this.generateRandomColor();
  }

  /**
   * 색상 해제
   */
  static releaseColor(color: string): void {
    this.usedColors.delete(color);
  }

  /**
   * 랜덤 색상 생성
   */
  static generateRandomColor(): string {
    const hue = Math.random() * 360;
    const saturation = 60 + Math.random() * 40; // 60-100%
    const lightness = 50 + Math.random() * 20; // 50-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * 색상 리셋
   */
  static reset(): void {
    this.usedColors.clear();
  }
}
