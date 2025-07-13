import * as THREE from "three";
import {
  PlateModel,
  PlateSettings,
  Vector3,
  ArrangementOptions,
} from "~/shared/types/plate";
import { ModelHelper } from "./ModelHelper";

export class AutoArrangementHelper {
  private static instance: AutoArrangementHelper;

  private constructor() {}

  static getInstance(): AutoArrangementHelper {
    if (!AutoArrangementHelper.instance) {
      AutoArrangementHelper.instance = new AutoArrangementHelper();
    }
    return AutoArrangementHelper.instance;
  }

  /**
   * 모델들을 자동으로 배치합니다
   */
  arrangeModels(
    models: PlateModel[],
    plateSettings: PlateSettings,
    options: ArrangementOptions
  ): PlateModel[] {
    const validModels = models.filter((model) => model.mesh);

    if (validModels.length === 0) {
      return models;
    }

    switch (options.arrangement) {
      case "grid":
        return this.arrangeInGrid(validModels, plateSettings, options);
      case "packed":
        return this.arrangeInPacked(validModels, plateSettings, options);
      default:
        return models;
    }
  }

  /**
   * Grid 방식으로 모델들을 배치합니다
   */
  private arrangeInGrid(
    models: PlateModel[],
    plateSettings: PlateSettings,
    options: ArrangementOptions
  ): PlateModel[] {
    const { size } = plateSettings;
    const { spacing } = options;

    // 모델들의 크기 계산
    const modelSizes = models.map((model) => {
      if (!model.mesh) return { x: 0, y: 0, z: 0 };

      const box = ModelHelper.calculateBoundingBox(model.mesh);
      const boxSize = box.getSize(new THREE.Vector3());
      return {
        x: boxSize.x,
        y: boxSize.y,
        z: boxSize.z,
      };
    });

    // 그리드 셀 크기 계산 (가장 큰 모델 기준)
    const maxSizeX = Math.max(...modelSizes.map((s) => s.x));
    const maxSizeY = Math.max(...modelSizes.map((s) => s.y));

    const cellWidth = maxSizeX + spacing;
    const cellHeight = maxSizeY + spacing;

    // 플레이트 크기 내에서 그리드 계산
    const gridCols = Math.floor(size.width / cellWidth);
    const gridRows = Math.floor(size.height / cellHeight);

    if (gridCols === 0 || gridRows === 0) {
      console.warn("Models are too large for the plate size");
      return models;
    }

    // 그리드 시작 위치 계산 (중앙 정렬)
    const gridTotalWidth = gridCols * cellWidth - spacing;
    const gridTotalHeight = gridRows * cellHeight - spacing;
    const startX = options.alignToCenter
      ? -(gridTotalWidth / 2)
      : -(size.width / 2) + cellWidth / 2;
    const startY = options.alignToCenter
      ? -(gridTotalHeight / 2)
      : -(size.height / 2) + cellHeight / 2;

    const arrangedModels: PlateModel[] = [];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;

      // 그리드 범위를 벗어나면 원래 위치 유지
      if (row >= gridRows) {
        arrangedModels.push(model);
        continue;
      }

      // 새로운 위치 계산
      const newX = startX + col * cellWidth;
      const newY = startY + row * cellHeight;

      // 모델 복사 및 변형 적용
      const newTransform = {
        ...model.transform,
        position: {
          x: newX,
          y: newY,
          z: 0, // 플레이트 위에 배치
        },
      };

      // 경계 확인
      if (
        options.respectBoundary &&
        !this.isWithinBoundary(
          newTransform.position,
          modelSizes[i],
          plateSettings
        )
      ) {
        // 경계를 벗어나면 원래 위치 유지
        arrangedModels.push(model);
        continue;
      }

      arrangedModels.push({
        ...model,
        transform: newTransform,
      });
    }

    return arrangedModels;
  }

  /**
   * Packing 방식으로 모델들을 배치합니다 (간단한 구현)
   */
  private arrangeInPacked(
    models: PlateModel[],
    plateSettings: PlateSettings,
    options: ArrangementOptions
  ): PlateModel[] {
    const { size } = plateSettings;
    const { spacing } = options;

    // 모델들을 크기순으로 정렬 (큰 것부터)
    const sortedModels = [...models].sort((a, b) => {
      if (!a.mesh || !b.mesh) return 0;

      const aBox = ModelHelper.calculateBoundingBox(a.mesh);
      const bBox = ModelHelper.calculateBoundingBox(b.mesh);
      const aSize = aBox.getSize(new THREE.Vector3());
      const bSize = bBox.getSize(new THREE.Vector3());

      return bSize.x * bSize.y - aSize.x * aSize.y;
    });

    const arrangedModels: PlateModel[] = [];
    const occupiedAreas: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];

    for (const model of sortedModels) {
      if (!model.mesh) {
        arrangedModels.push(model);
        continue;
      }

      const box = ModelHelper.calculateBoundingBox(model.mesh);
      const boxSize = box.getSize(new THREE.Vector3());
      const modelWidth = boxSize.x;
      const modelHeight = boxSize.y;

      // 배치 가능한 위치 찾기
      const position = this.findPackingPosition(
        modelWidth,
        modelHeight,
        spacing,
        size,
        occupiedAreas
      );

      if (position) {
        // 새로운 위치 적용
        const newTransform = {
          ...model.transform,
          position: {
            x: position.x,
            y: position.y,
            z: 0,
          },
        };

        arrangedModels.push({
          ...model,
          transform: newTransform,
        });

        // 점유 영역 추가
        occupiedAreas.push({
          x: position.x - modelWidth / 2,
          y: position.y - modelHeight / 2,
          width: modelWidth + spacing,
          height: modelHeight + spacing,
        });
      } else {
        // 배치할 수 없으면 원래 위치 유지
        arrangedModels.push(model);
      }
    }

    return arrangedModels;
  }

  /**
   * 모델이 플레이트 경계 내에 있는지 확인
   */
  private isWithinBoundary(
    position: Vector3,
    modelSize: Vector3,
    plateSettings: PlateSettings
  ): boolean {
    const { size } = plateSettings;
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;

    const minX = position.x - modelSize.x / 2;
    const maxX = position.x + modelSize.x / 2;
    const minY = position.y - modelSize.y / 2;
    const maxY = position.y + modelSize.y / 2;

    return (
      minX >= -halfWidth &&
      maxX <= halfWidth &&
      minY >= -halfHeight &&
      maxY <= halfHeight
    );
  }

  /**
   * Packing을 위한 배치 위치 찾기
   */
  private findPackingPosition(
    modelWidth: number,
    modelHeight: number,
    spacing: number,
    plateSize: { width: number; height: number },
    occupiedAreas: { x: number; y: number; width: number; height: number }[]
  ): { x: number; y: number } | null {
    const halfPlateWidth = plateSize.width / 2;
    const halfPlateHeight = plateSize.height / 2;
    const stepSize = Math.min(modelWidth, modelHeight, 10); // 10mm 단위로 검사

    // 왼쪽 위부터 오른쪽 아래로 스캔
    for (
      let y = -halfPlateHeight + modelHeight / 2;
      y <= halfPlateHeight - modelHeight / 2;
      y += stepSize
    ) {
      for (
        let x = -halfPlateWidth + modelWidth / 2;
        x <= halfPlateWidth - modelWidth / 2;
        x += stepSize
      ) {
        const testArea = {
          x: x - modelWidth / 2,
          y: y - modelHeight / 2,
          width: modelWidth + spacing,
          height: modelHeight + spacing,
        };

        // 다른 모델과 충돌하는지 확인
        const hasCollision = occupiedAreas.some((area) =>
          this.areasOverlap(testArea, area)
        );

        if (!hasCollision) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * 두 영역이 겹치는지 확인
   */
  private areasOverlap(
    area1: { x: number; y: number; width: number; height: number },
    area2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      area1.x + area1.width <= area2.x ||
      area2.x + area2.width <= area1.x ||
      area1.y + area1.height <= area2.y ||
      area2.y + area2.height <= area1.y
    );
  }

  /**
   * 모델들의 배치 효율성 계산
   */
  static calculatePlateUtilization(
    models: PlateModel[],
    plateSettings: PlateSettings
  ): number {
    const { size } = plateSettings;
    const plateArea = size.width * size.height;

    let usedArea = 0;

    models.forEach((model) => {
      if (model.mesh) {
        const box = ModelHelper.calculateBoundingBox(model.mesh);
        const boxSize = box.getSize(new THREE.Vector3());
        usedArea += boxSize.x * boxSize.y;
      }
    });

    return Math.min(usedArea / plateArea, 1.0);
  }

  /**
   * 모델들 간의 간격 확인
   */
  static checkSpacing(models: PlateModel[], minSpacing: number): boolean {
    const validModels = models.filter((model) => model.mesh);

    for (let i = 0; i < validModels.length; i++) {
      for (let j = i + 1; j < validModels.length; j++) {
        const model1 = validModels[i];
        const model2 = validModels[j];

        if (model1.mesh && model2.mesh) {
          const distance = this.calculateDistance(
            model1.transform.position,
            model2.transform.position
          );
          const box1 = ModelHelper.calculateBoundingBox(model1.mesh);
          const box2 = ModelHelper.calculateBoundingBox(model2.mesh);
          const size1 = box1.getSize(new THREE.Vector3());
          const size2 = box2.getSize(new THREE.Vector3());

          const requiredDistance =
            Math.max(size1.x, size1.y) / 2 +
            Math.max(size2.x, size2.y) / 2 +
            minSpacing;

          if (distance < requiredDistance) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 두 점 사이의 거리 계산
   */
  private static calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
