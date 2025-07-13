import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import JSZip from "jszip";
import { Model3D, Model3MFSettings } from "~/entities/model/types";
import { useEstimationStore } from "~/shared/lib/store";

// 3MF 파일의 변환 정보 인터페이스
interface Transform3MF {
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

// 3MF 파일의 build item 정보
interface BuildItem3MF {
  objectId: string;
  transform: Transform3MF;
  partnumber?: string;
}

// 3MF 파싱 실패 시 fallback 정보를 담는 인터페이스
interface FallbackGeometry extends THREE.BufferGeometry {
  isFallback?: boolean;
  originalError?: string;
}

interface GeometryWith3MFSettings extends THREE.BufferGeometry {
  extractedSettings?: Model3MFSettings;
}

// SSR 체크 함수
const isServer = typeof window === "undefined";

export const use3DPreview = (model: Model3D | null) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelMeshRef = useRef<THREE.Group | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3MF 파일의 원본 변환 정보 저장
  const originalTransformRef = useRef<Transform3MF | null>(null);

  // 자동 정렬 기능 제어 (로드 시 자동 실행 활성화)
  const [autoOrientEnabled, setAutoOrientEnabled] = useState(true);

  // Zustand 스토어 액세스
  const setExtracted3MFSettings = useEstimationStore(
    (state) => state.setExtracted3MFSettings
  );

  const initializeScene = useCallback(() => {
    // SSR 환경에서는 실행하지 않음
    if (isServer || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a); // 어두운 배경으로 변경
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false; // 그림자 완전 비활성화
    renderer.setClearColor(0x2a2a2a); // 배경색 설정
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = false; // 그림자 비활성화
    scene.add(directionalLight);

    // 추가 조명 (더 자연스러운 조명)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, 50, -100);
    scene.add(fillLight);

    // OrcaSlicer 스타일 프린트 베드 생성
    createPrintBed(scene);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0); // 베드 중심을 바라보도록 설정
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  // OrcaSlicer 스타일 프린트 베드 생성 함수
  const createPrintBed = useCallback((scene: THREE.Scene) => {
    const bedSize = 256; // 256mm x 256mm (일반적인 Bambu Lab 프린터 베드 크기)
    const bedHeight = 2; // 베드 두께
    const gridSize = 10; // 격자 간격 (10mm)

    // 베드 그룹 생성
    const bedGroup = new THREE.Group();

    // 1. 베드 플레이트 (기본 베드)
    const bedGeometry = new THREE.BoxGeometry(bedSize, bedHeight, bedSize);
    const bedMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8,
    });
    const bed = new THREE.Mesh(bedGeometry, bedMaterial);
    bed.position.y = -bedHeight / 2; // 베드 상단을 y=0에 맞춤
    bed.receiveShadow = false; // 그림자 비활성화
    bedGroup.add(bed);

    // 2. 격자 무늬 (그리드 라인)
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x555555,
      opacity: 0.6,
      transparent: true,
    });

    const gridGeometry = new THREE.BufferGeometry();
    const gridPoints: THREE.Vector3[] = [];

    // 수직 그리드 라인 (X 방향)
    for (let i = -bedSize / 2; i <= bedSize / 2; i += gridSize) {
      gridPoints.push(new THREE.Vector3(i, 0.1, -bedSize / 2));
      gridPoints.push(new THREE.Vector3(i, 0.1, bedSize / 2));
    }

    // 수평 그리드 라인 (Z 방향)
    for (let i = -bedSize / 2; i <= bedSize / 2; i += gridSize) {
      gridPoints.push(new THREE.Vector3(-bedSize / 2, 0.1, i));
      gridPoints.push(new THREE.Vector3(bedSize / 2, 0.1, i));
    }

    gridGeometry.setFromPoints(gridPoints);
    const gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
    bedGroup.add(gridLines);

    // 3. 베드 테두리 (강조선)
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      linewidth: 2,
    });

    const borderGeometry = new THREE.BufferGeometry();
    const borderPoints = [
      new THREE.Vector3(-bedSize / 2, 0.2, -bedSize / 2),
      new THREE.Vector3(bedSize / 2, 0.2, -bedSize / 2),
      new THREE.Vector3(bedSize / 2, 0.2, bedSize / 2),
      new THREE.Vector3(-bedSize / 2, 0.2, bedSize / 2),
      new THREE.Vector3(-bedSize / 2, 0.2, -bedSize / 2), // 닫힌 루프
    ];

    borderGeometry.setFromPoints(borderPoints);
    const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial);
    bedGroup.add(borderLine);

    // 4. 축 표시 (X, Y, Z 축)
    const axesHelper = new THREE.AxesHelper(50);
    axesHelper.position.set(-bedSize / 2 + 10, 0.5, -bedSize / 2 + 10);
    bedGroup.add(axesHelper);

    // 5. 베드 라벨 (텍스트는 복잡하므로 간단한 표시만)
    const labelGeometry = new THREE.CircleGeometry(5, 8);
    const labelMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
    });
    const originMarker = new THREE.Mesh(labelGeometry, labelMaterial);
    originMarker.rotation.x = -Math.PI / 2;
    originMarker.position.set(0, 0.1, 0);
    bedGroup.add(originMarker);

    scene.add(bedGroup);
  }, []);

  // 3MF 파일의 transform 속성을 파싱하는 함수
  const parseTransform3MF = useCallback(
    (transformStr: string): Transform3MF => {
      // 기본 변환 정보 생성
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const scale = new THREE.Vector3(1, 1, 1);

      if (!transformStr) {
        return { matrix, position, rotation, scale };
      }

      // 3MF transform 형식: "m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32"
      // 4x3 행렬로 표현되며, 마지막 행은 [0, 0, 0, 1]로 고정
      const values = transformStr.split(" ").map((v) => parseFloat(v));

      if (values.length === 12) {
        // 4x4 행렬로 변환
        matrix.set(
          values[0],
          values[1],
          values[2],
          values[9],
          values[3],
          values[4],
          values[5],
          values[10],
          values[6],
          values[7],
          values[8],
          values[11],
          0,
          0,
          0,
          1
        );

        // 변환 정보 분해
        matrix.decompose(position, new THREE.Quaternion(), scale);
        rotation.setFromQuaternion(
          new THREE.Quaternion().setFromRotationMatrix(matrix)
        );
      }

      return { matrix, position, rotation, scale };
    },
    []
  );

  // 3MF 파일의 build 요소에서 item 정보를 추출하는 함수
  const extractBuildItems = useCallback(
    (xmlDoc: Document): BuildItem3MF[] => {
      const buildItems: BuildItem3MF[] = [];

      // build 요소 찾기
      const buildElements = xmlDoc.getElementsByTagName("build");
      if (buildElements.length === 0) {
        console.log("No build elements found in 3MF file");
        return buildItems;
      }

      // item 요소들 추출
      for (let i = 0; i < buildElements.length; i++) {
        const buildElement = buildElements[i];
        const itemElements = buildElement.getElementsByTagName("item");

        for (let j = 0; j < itemElements.length; j++) {
          const itemElement = itemElements[j];
          const transformStr = itemElement.getAttribute("transform") || "";
          const objectId = itemElement.getAttribute("objectid") || "";
          const partnumber =
            itemElement.getAttribute("partnumber") || undefined;

          console.log(
            `Found item with objectid: ${objectId}, transform: ${transformStr}`
          );

          const transform = parseTransform3MF(transformStr);
          buildItems.push({
            objectId,
            transform,
            partnumber,
          });
        }
      }

      return buildItems;
    },
    [parseTransform3MF]
  );

  // 메시 요소 처리 함수 - 스택 오버플로우 방지 및 메모리 최적화
  const processMeshElement = useCallback(
    async (meshElement: Element, vertexOffset: number) => {
      const vertices = meshElement.getElementsByTagName("vertices")[0];
      const triangles = meshElement.getElementsByTagName("triangles")[0];

      if (!vertices || !triangles) {
        return { positions: [], indices: [], vertexCount: 0 };
      }

      const vertexElements = vertices.getElementsByTagName("vertex");
      const triangleElements = triangles.getElementsByTagName("triangle");

      console.log(
        `Processing mesh: ${vertexElements.length} vertices, ${triangleElements.length} triangles`
      );

      // 직접 일반 배열 사용으로 변환 오버헤드 제거
      const positions: number[] = [];
      const indices: number[] = [];

      // 정점 처리 - 직접 배열에 푸시하여 TypedArray 변환 단계 제거
      for (let i = 0; i < vertexElements.length; i++) {
        const vertex = vertexElements[i];
        const x = parseFloat(vertex.getAttribute("x") || "0");
        const y = parseFloat(vertex.getAttribute("y") || "0");
        const z = parseFloat(vertex.getAttribute("z") || "0");

        positions.push(x, y, z);

        // 대량 데이터 처리 시 주기적으로 이벤트 루프에 제어권 양보
        if (i > 0 && i % 5000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // 삼각형 인덱스 처리 - 직접 배열에 푸시
      for (let i = 0; i < triangleElements.length; i++) {
        const triangle = triangleElements[i];
        const v1 = parseInt(triangle.getAttribute("v1") || "0") + vertexOffset;
        const v2 = parseInt(triangle.getAttribute("v2") || "0") + vertexOffset;
        const v3 = parseInt(triangle.getAttribute("v3") || "0") + vertexOffset;

        indices.push(v1, v2, v3);

        // 대량 데이터 처리 시 주기적으로 이벤트 루프에 제어권 양보
        if (i > 0 && i % 5000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      return {
        positions,
        indices,
        vertexCount: vertexElements.length,
      };
    },
    []
  );

  // 개선된 3MF 파일 파싱 구현 - Bambu Lab 구조 지원
  const load3MFModel = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<THREE.BufferGeometry> => {
      try {
        console.log("Starting 3MF parsing...");

        // JSZip 로딩 시 메모리 최적화 옵션 - 큰 파일 처리 개선
        const zip = await JSZip.loadAsync(arrayBuffer, {
          checkCRC32: true, // CRC 검사 활성화로 파일 무결성 보장
          optimizedBinaryString: true, // 바이너리 최적화 활성화
          createFolders: false, // 폴더 생성 비활성화
          base64: false, // base64 디코딩 비활성화
        });

        // 3MF 설정 정보 추출 (지오메트리 처리와 병렬로 수행)
        const settingsPromise = extract3MFSettings(zip);

        // 3MF 파일 구조 디버깅
        const fileNames = Object.keys(zip.files);
        console.log("3MF files found:", fileNames);

        // 메인 3dmodel.model 파일 읽기
        let modelXmlFile = zip.file("3D/3dmodel.model");

        if (!modelXmlFile) {
          // 대안 경로들 시도
          const possiblePaths = [
            "3dmodel.model",
            "model.xml",
            "3D/3DModel.model",
          ];

          for (const path of possiblePaths) {
            modelXmlFile = zip.file(path);
            if (modelXmlFile) {
              console.log(`Found model file at: ${path}`);
              break;
            }
          }
        }

        if (!modelXmlFile) {
          throw new Error("3MF 파일에서 메인 모델 파일을 찾을 수 없습니다.");
        }

        // 안전한 텍스트 읽기 - 스트리밍 방식 사용
        const modelXmlContent = await modelXmlFile.async("text");
        console.log("XML content length:", modelXmlContent.length);
        console.log("XML content preview:", modelXmlContent.substring(0, 500));

        // XML 파싱
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(modelXmlContent, "text/xml");

        // 파싱 에러 확인
        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
          console.error("XML parsing error:", parseError[0].textContent);
          throw new Error("3MF XML 파싱 오류: 잘못된 XML 형식");
        }

        // 3MF 파일의 build 요소에서 변환 정보 추출
        const buildItems = extractBuildItems(xmlDoc);
        console.log(`Found ${buildItems.length} build items with transforms`);

        // 첫 번째 build item의 변환 정보를 임시 저장 (나중에 올바른 transform으로 교체)
        const tempOriginalTransform =
          buildItems.length > 0 ? buildItems[0].transform : null;
        if (tempOriginalTransform) {
          originalTransformRef.current = tempOriginalTransform;
        }

        // 모든 지오메트리를 담을 배열 - 메모리 효율적 처리
        const allPositions: number[] = [];
        const allIndices: number[] = [];
        let currentVertexOffset = 0;
        let actualObjectId: string | null = null; // 실제 메시 데이터를 가진 object ID

        // 방법 1: 메인 파일에서 직접 메시 찾기
        const mainMeshElements = xmlDoc.getElementsByTagName("mesh");
        console.log(`Found ${mainMeshElements.length} meshes in main file`);

        for (
          let meshIndex = 0;
          meshIndex < mainMeshElements.length;
          meshIndex++
        ) {
          const mesh = mainMeshElements[meshIndex];
          const result = await processMeshElement(mesh, currentVertexOffset);

          if (result.positions.length > 0) {
            // 큰 배열 병합 시 스택 오버플로우 방지를 위한 청크 단위 처리
            for (let i = 0; i < result.positions.length; i += 10000) {
              const chunk = result.positions.slice(i, i + 10000);
              allPositions.push(...chunk);
            }
            for (let i = 0; i < result.indices.length; i += 10000) {
              const chunk = result.indices.slice(i, i + 10000);
              allIndices.push(...chunk);
            }
            currentVertexOffset += result.vertexCount;
            console.log(
              `Processed mesh ${meshIndex} from main file: ${result.vertexCount} vertices`
            );
          }
        }

        // 방법 2: Objects 폴더의 모든 .model 파일에서 메시 찾기 - 메모리 제한 추가
        const objectFiles = fileNames.filter(
          (name) => name.includes("Objects/") && name.endsWith(".model")
        );

        console.log(`Found ${objectFiles.length} object files:`, objectFiles);

        for (const objectFileName of objectFiles) {
          try {
            const objectFile = zip.file(objectFileName);
            if (!objectFile) continue;

            // 안전한 텍스트 읽기 - 청크 단위로 처리
            const objectXmlContent = await objectFile.async("text");
            console.log(
              `Processing ${objectFileName}, content length:`,
              objectXmlContent.length
            );

            // 메모리 사용량이 너무 클 경우 건너뛰기
            if (objectXmlContent.length > 50 * 1024 * 1024) {
              console.warn(
                `Skipping large XML content in ${objectFileName}: ${objectXmlContent.length} chars`
              );
              continue;
            }

            const objectXmlDoc = parser.parseFromString(
              objectXmlContent,
              "text/xml"
            );

            // 파싱 에러 확인
            const objectParseError =
              objectXmlDoc.getElementsByTagName("parsererror");
            if (objectParseError.length > 0) {
              console.warn(
                `XML parsing error in ${objectFileName}:`,
                objectParseError[0].textContent
              );
              continue;
            }

            const objectMeshes = objectXmlDoc.getElementsByTagName("mesh");
            console.log(
              `Found ${objectMeshes.length} meshes in ${objectFileName}`
            );

            // 실제 메시 데이터가 있는 object ID 추출
            if (objectMeshes.length > 0 && !actualObjectId) {
              const match = objectFileName.match(/object_(\d+)\.model/);
              if (match) {
                actualObjectId = match[1];
                console.log(
                  `Found actual mesh data in object ID: ${actualObjectId}`
                );
              }
            }

            for (
              let meshIndex = 0;
              meshIndex < objectMeshes.length;
              meshIndex++
            ) {
              const mesh = objectMeshes[meshIndex];
              const result = await processMeshElement(
                mesh,
                currentVertexOffset
              );

              if (result.positions.length > 0) {
                // 큰 배열 병합 시 스택 오버플로우 방지를 위한 청크 단위 처리
                for (let i = 0; i < result.positions.length; i += 10000) {
                  const chunk = result.positions.slice(i, i + 10000);
                  allPositions.push(...chunk);
                }
                for (let i = 0; i < result.indices.length; i += 10000) {
                  const chunk = result.indices.slice(i, i + 10000);
                  allIndices.push(...chunk);
                }
                currentVertexOffset += result.vertexCount;
                console.log(
                  `Processed mesh ${meshIndex} from ${objectFileName}: ${result.vertexCount} vertices`
                );
              }
            }
          } catch (error) {
            console.warn(
              `Failed to process object file ${objectFileName}:`,
              error
            );
            // 개별 파일 오류는 무시하고 계속 진행
            continue;
          }
        }

        // 방법 3: 다른 가능한 위치에서 메시 찾기 (전체 ZIP 파일 스캔) - 메모리 제한 강화
        if (allPositions.length === 0) {
          console.log(
            "No meshes found in standard locations, scanning all files..."
          );

          for (const fileName of fileNames) {
            if (!fileName.endsWith(".model") && !fileName.endsWith(".xml"))
              continue;
            if (fileName === "3D/3dmodel.model") continue; // 이미 처리함

            try {
              const file = zip.file(fileName);
              if (!file) continue;

              // 작은 샘플만 먼저 읽어서 메시 데이터 포함 여부 확인
              const sampleContent = await file.async("text");

              if (
                sampleContent.includes("<mesh>") ||
                sampleContent.includes("mesh")
              ) {
                console.log(`Found potential mesh data in ${fileName}`);

                // 전체 내용 읽기 - 크기 제한
                const content = sampleContent;
                if (content.length > 30 * 1024 * 1024) {
                  console.warn(
                    `Skipping large XML content in ${fileName}: ${content.length} chars`
                  );
                  continue;
                }

                const doc = parser.parseFromString(content, "text/xml");
                const meshes = doc.getElementsByTagName("mesh");

                for (
                  let meshIndex = 0;
                  meshIndex < meshes.length;
                  meshIndex++
                ) {
                  const mesh = meshes[meshIndex];
                  const result = await processMeshElement(
                    mesh,
                    currentVertexOffset
                  );

                  if (result.positions.length > 0) {
                    // 큰 배열 병합 시 스택 오버플로우 방지를 위한 청크 단위 처리
                    for (let i = 0; i < result.positions.length; i += 10000) {
                      const chunk = result.positions.slice(i, i + 10000);
                      allPositions.push(...chunk);
                    }
                    for (let i = 0; i < result.indices.length; i += 10000) {
                      const chunk = result.indices.slice(i, i + 10000);
                      allIndices.push(...chunk);
                    }
                    currentVertexOffset += result.vertexCount;
                    console.log(
                      `Processed mesh ${meshIndex} from ${fileName}: ${result.vertexCount} vertices`
                    );
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to scan file ${fileName}:`, error);
              // 개별 파일 오류는 무시하고 계속 진행
              continue;
            }
          }
        }

        // 실제 메시 데이터를 가진 object ID에 맞는 build item의 transform을 찾아서 적용
        if (actualObjectId) {
          const matchingBuildItem = buildItems.find(
            (item) => item.objectId === actualObjectId
          );
          if (matchingBuildItem) {
            originalTransformRef.current = matchingBuildItem.transform;
            console.log(
              `Updated to correct transform for object ID ${actualObjectId}:`,
              {
                position: matchingBuildItem.transform.position,
                rotation: matchingBuildItem.transform.rotation,
                scale: matchingBuildItem.transform.scale,
              }
            );
          } else {
            console.warn(
              `No build item found for object ID ${actualObjectId}, keeping first build item transform`
            );
          }
        } else {
          console.warn(
            "No actual object ID found, keeping first build item transform"
          );
        }

        if (allPositions.length === 0 || allIndices.length === 0) {
          console.log(
            "Failed to find mesh data. Available files and their types:"
          );
          // 파일 정보를 간단하게 출력
          for (const fileName of fileNames.slice(0, 10)) {
            console.log(`${fileName}: [file found]`);
          }

          throw new Error(
            "3MF 파일에서 유효한 지오메트리를 추출할 수 없습니다."
          );
        }

        // BufferGeometry 생성 - 메모리 효율적 처리
        const geometry = new THREE.BufferGeometry();

        // 큰 배열을 TypedArray로 변환하여 메모리 효율성 향상
        const positionsTypedArray = new Float32Array(allPositions);
        const indicesTypedArray =
          allIndices.length > 65535
            ? new Uint32Array(allIndices)
            : new Uint16Array(allIndices);

        geometry.setIndex(new THREE.BufferAttribute(indicesTypedArray, 1));
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positionsTypedArray, 3)
        );

        // 배치 단위로 법선 계산
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        // 지오메트리 유효성 최종 검증
        if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
          throw new Error("생성된 지오메트리가 유효하지 않습니다.");
        }

        // 설정 추출 완료 대기 및 결과 처리
        const extractedSettings = await settingsPromise;

        // 지오메트리 처리 결과와 설정을 함께 반환하기 위해 geometry에 설정 첨부
        (geometry as GeometryWith3MFSettings).extractedSettings =
          extractedSettings;

        console.log(
          `3MF successfully parsed: ${allPositions.length / 3} vertices, ${
            allIndices.length / 3
          } triangles`
        );
        console.log("3MF settings extracted:", extractedSettings);

        return geometry;
      } catch (error) {
        console.error("3MF parsing failed:", error);
        console.log("Using fallback geometry due to 3MF parsing failure");

        const fallbackGeometry = new THREE.TorusKnotGeometry(
          15,
          5,
          100,
          16
        ) as FallbackGeometry;
        fallbackGeometry.isFallback = true;
        fallbackGeometry.originalError =
          error instanceof Error ? error.message : "알 수 없는 오류";

        return fallbackGeometry;
      }
    },
    [processMeshElement]
  );

  // PLY 로더 추가
  const loadPLYModel = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<THREE.BufferGeometry> => {
      const loader = new PLYLoader();
      return loader.parse(arrayBuffer);
    },
    []
  );

  // GLTF/GLB 로더 추가
  const loadGLTFModel = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<THREE.BufferGeometry> => {
      const loader = new GLTFLoader();

      return new Promise((resolve, reject) => {
        loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            let geometry: THREE.BufferGeometry | null = null;

            gltf.scene.traverse((child) => {
              if (child instanceof THREE.Mesh && child.geometry && !geometry) {
                geometry = child.geometry as THREE.BufferGeometry;
              }
            });

            if (geometry) {
              resolve(geometry);
            } else {
              reject(
                new Error("GLTF 파일에서 유효한 지오메트리를 찾을 수 없습니다.")
              );
            }
          },
          reject
        );
      });
    },
    []
  );

  const loadOBJModel = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<THREE.BufferGeometry> => {
      const loader = new OBJLoader();
      const text = new TextDecoder().decode(arrayBuffer);
      const object = loader.parse(text);

      // OBJ 객체에서 첫 번째 메시의 지오메트리 추출
      let geometry: THREE.BufferGeometry | null = null;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && !geometry) {
          geometry = child.geometry;
        }
      });

      if (!geometry) {
        throw new Error("OBJ 파일에서 유효한 지오메트리를 찾을 수 없습니다.");
      }

      return geometry;
    },
    []
  );

  // 3MF 설정 정보 추출 함수
  const extract3MFSettings = useCallback(
    async (zip: JSZip): Promise<Model3MFSettings> => {
      const settings: Model3MFSettings = {};

      try {
        // 1. 메타데이터에서 프로젝트 설정 추출
        const projectSettingsFile = zip.file(
          "Metadata/project_settings.config"
        );
        if (projectSettingsFile) {
          const content = await projectSettingsFile.async("text");
          console.log("Project settings found:", content.substring(0, 200));

          // 설정 파싱 (INI 형식으로 가정)
          const projectSettings = parseConfigFile(content);

          settings.printSettings = {
            layerHeight: parseFloat(projectSettings.layer_height) || undefined,
            infill: parseInt(projectSettings.fill_density) || undefined,
            speed: {
              print: parseFloat(projectSettings.outer_wall_speed) || undefined,
              travel: parseFloat(projectSettings.travel_speed) || undefined,
              first_layer:
                parseFloat(projectSettings.initial_layer_speed) || undefined,
            },
            support: {
              enabled:
                projectSettings.enable_support === "1" ||
                projectSettings.enable_support === "true",
              type: projectSettings.support_type || undefined,
              angle:
                parseFloat(projectSettings.support_threshold_angle) ||
                undefined,
            },
            retraction: {
              enabled:
                projectSettings.retraction_enable === "1" ||
                projectSettings.retraction_enable === "true",
              distance:
                parseFloat(projectSettings.retraction_length) || undefined,
              speed: parseFloat(projectSettings.retraction_speed) || undefined,
            },
          };
        }

        // 2. 모델 설정에서 재료 정보 추출
        const modelSettingsFile = zip.file("Metadata/model_settings.config");
        if (modelSettingsFile) {
          const content = await modelSettingsFile.async("text");
          console.log("Model settings found:", content.substring(0, 200));

          const modelSettings = parseConfigFile(content);

          settings.filament = {
            type: modelSettings.filament_type || undefined,
            brand: modelSettings.filament_brand || undefined,
            color: modelSettings.filament_colour || undefined,
            diameter: parseFloat(modelSettings.filament_diameter) || undefined,
            temperature: {
              nozzle: parseInt(modelSettings.nozzle_temperature) || undefined,
              bed: parseInt(modelSettings.bed_temperature) || undefined,
            },
          };

          settings.bambuSettings = {
            ams: {
              enabled:
                modelSettings.ams_enable === "1" ||
                modelSettings.ams_enable === "true",
              slot: parseInt(modelSettings.ams_slot) || undefined,
            },
            timelapse: modelSettings.timelapse_type !== "0",
            flowCalibration: modelSettings.flow_calibration === "1",
            adaptiveLayers: modelSettings.adaptive_layer_height === "1",
          };
        }

        // 3. 슬라이스 정보에서 예상 시간/재료 사용량 추출
        const sliceInfoFile = zip.file("Metadata/slice_info.config");
        if (sliceInfoFile) {
          const content = await sliceInfoFile.async("text");
          console.log("Slice info found:", content.substring(0, 200));

          const sliceInfo = parseConfigFile(content);

          settings.metadata = {
            totalTime: parseFloat(sliceInfo.total_time) || undefined,
            filamentUsed:
              parseFloat(sliceInfo.total_filament_used) || undefined,
            filamentWeight: parseFloat(sliceInfo.total_weight) || undefined,
          };
        }

        // 4. plate_1.json에서 추가 메타데이터 추출
        const plateInfoFile = zip.file("Metadata/plate_1.json");
        if (plateInfoFile) {
          const content = await plateInfoFile.async("text");
          try {
            const plateData = JSON.parse(content);
            console.log("Plate info found:", plateData);

            if (plateData.printer) {
              settings.printer = {
                name: plateData.printer.name || undefined,
                model: plateData.printer.model || undefined,
                buildPlate: {
                  width: plateData.printer.build_plate?.width || 256,
                  height: plateData.printer.build_plate?.height || 256,
                  depth: plateData.printer.build_plate?.depth || 256,
                },
              };
            }

            // 메타데이터 업데이트
            if (!settings.metadata) settings.metadata = {};
            settings.metadata.application = plateData.application || "Unknown";
            settings.metadata.version = plateData.version || undefined;
            settings.metadata.creationDate =
              plateData.creation_date || undefined;
          } catch (error) {
            console.warn("Failed to parse plate JSON:", error);
          }
        }

        // 5. 메인 모델 파일에서 애플리케이션 정보 추출
        const mainModelFile = zip.file("3D/3dmodel.model");
        if (mainModelFile) {
          const content = await mainModelFile.async("text");
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");

          // 메타데이터 추출
          const metadataElements = xmlDoc.getElementsByTagName("metadata");
          for (let i = 0; i < metadataElements.length; i++) {
            const metadata = metadataElements[i];
            const name = metadata.getAttribute("name");
            const value = metadata.textContent;

            if (!settings.metadata) settings.metadata = {};

            switch (name) {
              case "Application":
                settings.metadata.application = value || undefined;
                break;
              case "BambuStudio:3mfVersion":
                settings.metadata.version = value || undefined;
                break;
              case "CreationDate":
                settings.metadata.creationDate = value || undefined;
                break;
            }
          }
        }

        console.log("Extracted 3MF settings:", settings);
        return settings;
      } catch (error) {
        console.warn("Failed to extract 3MF settings:", error);
        return settings;
      }
    },
    []
  );

  // 설정 파일 파싱 유틸리티 (INI 형식)
  const parseConfigFile = useCallback(
    (content: string): Record<string, string> => {
      const result: Record<string, string> = {};
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("[")) {
          const equalIndex = trimmed.indexOf("=");
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();
            result[key] = value;
          }
        }
      }

      return result;
    },
    []
  );

  const loadModel = useCallback(
    async (modelFile: File) => {
      if (!sceneRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // 파일 크기 검증 (100MB로 증가)
        const maxSize = 100 * 1024 * 1024;
        if (modelFile.size > maxSize) {
          throw new Error(
            "파일 크기가 너무 큽니다. 100MB 이하의 파일만 지원됩니다."
          );
        }

        // 확장된 파일 확장자 검증
        const extension = modelFile.name.split(".").pop()?.toLowerCase();
        const supportedFormats = ["stl", "3mf", "obj", "ply", "gltf", "glb"];

        if (!extension || !supportedFormats.includes(extension)) {
          throw new Error(
            `지원되지 않는 파일 형식입니다. 지원 형식: ${supportedFormats
              .join(", ")
              .toUpperCase()}`
          );
        }

        const arrayBuffer = await modelFile.arrayBuffer();

        // ArrayBuffer 크기 검증
        if (arrayBuffer.byteLength === 0) {
          throw new Error("빈 파일이거나 손상된 파일입니다.");
        }

        // 파일 형식별 로더 선택 - 확장된 지원
        let geometry: THREE.BufferGeometry;
        try {
          switch (extension) {
            case "stl": {
              const stlLoader = new STLLoader();
              geometry = stlLoader.parse(arrayBuffer);
              console.log("STL model loaded successfully");
              break;
            }
            case "3mf": {
              geometry = await load3MFModel(arrayBuffer);
              console.log("3MF model processed");
              break;
            }
            case "obj": {
              geometry = await loadOBJModel(arrayBuffer);
              console.log("OBJ model loaded successfully");
              break;
            }
            case "ply": {
              geometry = await loadPLYModel(arrayBuffer);
              console.log("PLY model loaded successfully");
              break;
            }
            case "gltf":
            case "glb": {
              geometry = await loadGLTFModel(arrayBuffer);
              console.log("GLTF/GLB model loaded successfully");
              break;
            }
            default:
              throw new Error("지원되지 않는 파일 형식입니다.");
          }
        } catch (parseError) {
          console.error("Model parsing error:", parseError);
          throw new Error(
            `${extension.toUpperCase()} 파일을 파싱할 수 없습니다: ${
              parseError instanceof Error
                ? parseError.message
                : "알 수 없는 오류"
            }`
          );
        }

        // 지오메트리 유효성 검증 및 수정
        if (!geometry || !geometry.attributes.position) {
          throw new Error("유효하지 않은 3D 모델입니다.");
        }

        // 3MF 파일의 fallback 처리에 대한 사용자 알림 개선
        const fallbackGeometry = geometry as FallbackGeometry;
        if (fallbackGeometry.isFallback) {
          const fallbackError = fallbackGeometry.originalError;
          console.warn(
            "3MF parsing failed, using fallback geometry:",
            fallbackError
          );
          setError(
            `3MF 파일을 완전히 파싱할 수 없어 대체 모델을 표시합니다. 원본 오류: ${fallbackError}`
          );
        }

        // 법선 벡터가 없는 경우 자동 생성
        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals();
          console.log("Computed vertex normals for geometry");
        }

        // 파일 형식별 좌표계 정규화 적용 (기울어짐 방지)
        geometry = normalizeCoordinateSystem(geometry, extension);

        // Remove previous model
        if (modelMeshRef.current) {
          sceneRef.current.remove(modelMeshRef.current);
        }

        // Center geometry with proper floor alignment
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox!;

        // 바운딩 박스 유효성 검증
        if (
          !boundingBox ||
          !isFinite(boundingBox.min.x) ||
          !isFinite(boundingBox.max.x) ||
          !isFinite(boundingBox.min.y) ||
          !isFinite(boundingBox.max.y) ||
          !isFinite(boundingBox.min.z) ||
          !isFinite(boundingBox.max.z)
        ) {
          throw new Error("3D 모델의 크기를 계산할 수 없습니다.");
        }

        // Strategy A: 3MF 파일의 경우 원본 OrcaSlicer 포지셔닝 완전 보존
        const is3MFFile = extension === "3mf";

        console.log("Is 3MF file:", is3MFFile);

        let adjustedBounds = boundingBox;

        // 파일 형식별 센터링 적용
        if (!is3MFFile) {
          // 개선된 센터링 로직: X, Z는 중앙에, Y는 바닥에 맞춤
          const center = boundingBox.getCenter(new THREE.Vector3());
          const size = boundingBox.getSize(new THREE.Vector3());

          console.log("Model bounds before centering:", {
            min: boundingBox.min,
            max: boundingBox.max,
            center: center,
            size: size,
          });

          // X, Z축은 중앙 정렬, Y축은 바닥(최소값)을 0에 맞춤
          geometry.translate(
            -center.x, // X축 중앙 정렬
            -boundingBox.min.y, // Y축 바닥을 0에 맞춤 (기울어짐 방지)
            -center.z // Z축 중앙 정렬
          );

          // 변환 후 바운딩 박스 재계산
          geometry.computeBoundingBox();
          adjustedBounds = geometry.boundingBox!;

          console.log("Model bounds after centering:", {
            min: adjustedBounds.min,
            max: adjustedBounds.max,
            size: adjustedBounds.getSize(new THREE.Vector3()),
          });
        } else {
          // Strategy A: 3MF 파일의 경우 지오메트리 변환 완전 생략
          console.log(
            "Strategy A: 3MF file - preserving original geometry positioning"
          );

          const size = boundingBox.getSize(new THREE.Vector3());
          console.log("3MF model bounds (original, unchanged):", {
            min: boundingBox.min,
            max: boundingBox.max,
            size: size,
          });

          // 3MF 파일의 경우 지오메트리에 대한 어떠한 변환도 적용하지 않음
          // 원본 OrcaSlicer 포지셔닝을 완전히 보존하기 위해 geometry.translate() 호출 생략
          adjustedBounds = boundingBox; // 원본 바운딩 박스를 그대로 사용

          console.log("3MF geometry positioning preserved for Strategy A");
        }

        // 확장된 파일 형식별 색상
        const materialColor =
          {
            stl: 0x4f46e5, // 인디고
            "3mf": 0x059669, // 에메랄드
            obj: 0xdc2626, // 레드
            ply: 0x7c3aed, // 바이올렛
            gltf: 0xf59e0b, // 앰버
            glb: 0xf59e0b, // 앰버
          }[extension] || 0x4f46e5;

        // 향상된 재질 설정
        const material = new THREE.MeshPhongMaterial({
          color: materialColor,
          transparent: true,
          opacity: 0.9,
          shininess: 30,
          side: THREE.DoubleSide, // 양면 렌더링으로 모델 내부도 보이게
        });

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false; // 그림자 비활성화
        mesh.receiveShadow = false; // 그림자 비활성화

        // Group으로 감싸서 변환 작업 편의성 제공
        const group = new THREE.Group();
        group.add(mesh);
        modelMeshRef.current = group;

        sceneRef.current.add(group);

        // Auto-fit camera with improved calculation
        const modelSize = adjustedBounds.getSize(new THREE.Vector3());
        const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);

        // 모델 크기 검증 개선
        if (maxDim < 0.01) {
          console.warn("Very small model detected, scaling up view");
        }

        if (maxDim > 10000) {
          console.warn("Very large model detected");
          throw new Error("모델의 크기가 너무 큽니다. (10m 이상)");
        }

        // 카메라 거리 계산 개선
        const fov = cameraRef.current!.fov * (Math.PI / 180);
        const cameraDistance = Math.max(
          Math.abs(maxDim / Math.sin(fov / 2)) * 1.5,
          maxDim * 2 // 최소 거리 보장
        );

        cameraRef.current!.position.set(
          cameraDistance,
          cameraDistance,
          cameraDistance
        );
        cameraRef.current!.lookAt(0, 0, 0);
        controlsRef.current!.update();

        // 3MF 파일에서 추출된 설정 처리
        if (
          extension === "3mf" &&
          (geometry as GeometryWith3MFSettings).extractedSettings
        ) {
          const extractedSettings = (geometry as GeometryWith3MFSettings)
            .extractedSettings as Model3MFSettings;

          // Strategy A: 3MF 파일의 경우 원본 변환 정보를 완전히 적용
          if (originalTransformRef.current) {
            console.log(
              "Strategy A: Applying complete original transform from 3MF file"
            );
            const transform = originalTransformRef.current;

            // 원본 변환 정보를 완전히 적용 (위치, 회전, 스케일 모두)
            group.position.copy(transform.position);
            group.rotation.copy(transform.rotation);
            group.scale.copy(transform.scale);

            console.log("Applied complete original transform:", {
              position: {
                x: group.position.x,
                y: group.position.y,
                z: group.position.z,
              },
              rotation: {
                x: transform.rotation.x,
                y: transform.rotation.y,
                z: transform.rotation.z,
              },
              scale: {
                x: transform.scale.x,
                y: transform.scale.y,
                z: transform.scale.z,
              },
            });
            console.log("Raw transform position values:", {
              x: transform.position.x,
              y: transform.position.y,
              z: transform.position.z,
            });
          } else {
            console.log("No original transform found in 3MF file");
          }

          // 3MF 설정 정보 저장
          setExtracted3MFSettings(extractedSettings);
          console.log("3MF settings saved to store:", extractedSettings);
        }

        console.log(
          `Model loaded: ${modelFile.name}, vertices: ${
            geometry.attributes.position.count
          }, size: ${maxDim.toFixed(2)}`
        );

        // 설정 처리를 위한 스케줄링
        console.log(`모델 로딩 완료: ${model?.name || "Unknown"}`);

        // 로드 시 자동 정렬 기능 - 3MF 파일에도 적용
        console.log(
          `모델 로딩 완료: ${model?.name || "Unknown"} - 자동 정렬 예정`
        );
      } catch (error) {
        console.error("Failed to load model:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "3D 모델을 불러올 수 없습니다.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [load3MFModel, loadOBJModel, loadPLYModel, loadGLTFModel, isServer]
  );

  const resetView = useCallback(() => {
    if (isServer || !cameraRef.current || !controlsRef.current) return;

    cameraRef.current.position.set(50, 50, 50);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  }, []);

  // 좌표계 정규화 함수 - 파일 형식별 좌표계 차이 보정
  const normalizeCoordinateSystem = useCallback(
    (geometry: THREE.BufferGeometry, fileExtension: string) => {
      console.log(
        `Normalizing coordinate system for ${fileExtension.toUpperCase()} file`
      );

      // 3MF 파일의 경우 항상 좌표계 변환 건너뛰기 (OrcaSlicer와 동일한 위치 유지)
      if (fileExtension === "3mf") {
        console.log(
          "3MF file - skipping coordinate normalization to preserve original position"
        );
        return geometry;
      }

      // 원본 바운딩 박스 계산
      geometry.computeBoundingBox();
      const originalBounds = geometry.boundingBox!;

      console.log("Original bounds:", {
        min: originalBounds.min,
        max: originalBounds.max,
        size: originalBounds.getSize(new THREE.Vector3()),
      });

      // 파일 형식별 좌표계 변환
      switch (fileExtension) {
        case "3mf":
        case "stl": {
          // STL/3MF: 대부분 밀리미터 단위, Y-up 또는 Z-up
          // 모델이 XY 평면에 평평하게 누워있는지 확인
          const size = originalBounds.getSize(new THREE.Vector3());

          // Z축이 매우 작으면 모델이 평평하게 누워있음 (Z-up → Y-up 변환 필요)
          if (size.z < size.y * 0.1 && size.z < size.x * 0.1) {
            console.log(
              "Detected flat model on XY plane, applying Z-up to Y-up conversion"
            );
            geometry.rotateX(-Math.PI / 2); // Z-up을 Y-up으로 변환
          }
          break;
        }

        case "obj": {
          // OBJ: 종종 다른 좌표계 사용, 스케일도 다를 수 있음
          const size = originalBounds.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          // OBJ 파일이 매우 큰 경우 스케일 조정 (예: 미터 단위 → 밀리미터)
          if (maxDim > 1000) {
            console.log("Large OBJ model detected, scaling down");
            geometry.scale(0.001, 0.001, 0.001); // 미터를 밀리미터로
          } else if (maxDim < 1) {
            console.log("Small OBJ model detected, scaling up");
            geometry.scale(1000, 1000, 1000); // 미터를 밀리미터로
          }
          break;
        }

        case "ply": {
          // PLY: 스캔 데이터에서 자주 사용, 좌표계가 다를 수 있음
          const size = originalBounds.getSize(new THREE.Vector3());

          // PLY는 종종 다른 방향으로 스캔됨
          if (size.y < size.z * 0.5) {
            console.log("PLY model appears to be rotated, applying correction");
            geometry.rotateX(Math.PI / 2);
          }
          break;
        }

        case "gltf":
        case "glb": {
          // GLTF/GLB: 표준 Y-up 좌표계, 일반적으로 변환 불필요
          console.log(
            "GLTF/GLB uses standard Y-up, no coordinate conversion needed"
          );
          break;
        }
      }

      // 변환 후 바운딩 박스 재계산
      geometry.computeBoundingBox();
      const normalizedBounds = geometry.boundingBox!;

      console.log("Normalized bounds:", {
        min: normalizedBounds.min,
        max: normalizedBounds.max,
        size: normalizedBounds.getSize(new THREE.Vector3()),
      });

      return geometry;
    },
    []
  );
  // Online3DViewer 스타일 향상된 자동 정렬 함수
  const autoOrient = useCallback(() => {
    if (isServer || !modelMeshRef.current || !sceneRef.current) return;

    try {
      console.log("Starting enhanced Online3DViewer style auto-alignment...");

      // 현재 모델의 바운딩 박스 계산 (Online3DViewer 정확도 향상)
      const boundingBox = calculateModelBounds(modelMeshRef.current);
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());

      console.log("Model bounding analysis:", {
        min: boundingBox.min,
        max: boundingBox.max,
        center: center,
        size: size,
      });

      // Online3DViewer의 FitToWindow 알고리즘 적용
      // 1. 모델 중심점 계산 및 정렬
      const modelCenter = new THREE.Vector3();
      boundingBox.getCenter(modelCenter);

      // 2. 모델을 씬 중심으로 이동 (X, Z축만)
      modelMeshRef.current.position.x = -modelCenter.x;
      modelMeshRef.current.position.z = -modelCenter.z;

      // 3. 바닥면 정렬 (Online3DViewer의 기본 동작)
      const floorOffset = -boundingBox.min.y;
      modelMeshRef.current.position.y = floorOffset;

      // 4. 회전 정규화 (Online3DViewer 기본 상태)
      modelMeshRef.current.rotation.set(0, 0, 0);

      // 5. 스케일 정규화
      modelMeshRef.current.scale.set(1, 1, 1);

      // 6. 카메라 거리 자동 조정 (Online3DViewer의 FitToWindow 로직)
      const maxDimension = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current!.fov * (Math.PI / 180);
      const distance =
        Math.max(maxDimension / 2 / Math.tan(fov / 2), maxDimension) * 1.5; // 여유 공간 추가

      // 7. 카메라 위치 설정 (Online3DViewer 기본 각도: 등각투영 스타일)
      if (cameraRef.current) {
        const cameraPosition = new THREE.Vector3(
          distance * 0.707, // 45도 각도
          distance * 0.707,
          distance * 0.707
        );

        cameraRef.current.position.copy(cameraPosition);
        cameraRef.current.lookAt(0, floorOffset + size.y / 2, 0); // 모델 중심을 바라봄
      }

      // 8. 컨트롤 업데이트
      if (controlsRef.current) {
        controlsRef.current.target.set(0, floorOffset + size.y / 2, 0);
        controlsRef.current.update();
      }

      console.log("Enhanced Online3DViewer style alignment completed:", {
        position: modelMeshRef.current.position,
        rotation: modelMeshRef.current.rotation,
        scale: modelMeshRef.current.scale,
        cameraDistance: distance,
        modelSize: maxDimension,
        floorOffset: floorOffset,
      });

      // 9. 성능 최적화를 위한 렌더링 강제 업데이트
      if (rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current!);
      }
    } catch (error) {
      console.error("Enhanced auto-alignment failed:", error);
      // 폴백: 기본 정렬 수행
      if (modelMeshRef.current && cameraRef.current) {
        modelMeshRef.current.position.set(0, 0, 0);
        modelMeshRef.current.rotation.set(0, 0, 0);
        cameraRef.current.position.set(100, 100, 100);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current?.update();
      }
    }
  }, []);

  // 모델 회전 리셋 함수
  const resetOrientation = useCallback(() => {
    if (isServer || !modelMeshRef.current) return;

    modelMeshRef.current.rotation.set(0, 0, 0);
    modelMeshRef.current.position.set(0, 0, 0);

    // 바닥에 맞춤
    const box = new THREE.Box3().setFromObject(modelMeshRef.current);
    const offset = -box.min.y;
    modelMeshRef.current.position.y = offset;

    console.log("모델 방향이 초기 상태로 리셋되었습니다.");
  }, []);

  // 수동 회전 함수들
  const rotateModel = useCallback((axis: "x" | "y" | "z", degrees: number) => {
    if (isServer || !modelMeshRef.current) return;

    const radians = (degrees * Math.PI) / 180;

    switch (axis) {
      case "x":
        modelMeshRef.current.rotation.x += radians;
        break;
      case "y":
        modelMeshRef.current.rotation.y += radians;
        break;
      case "z":
        modelMeshRef.current.rotation.z += radians;
        break;
    }

    // 회전 후 바닥에 맞춤
    const box = new THREE.Box3().setFromObject(modelMeshRef.current);
    const offset = -box.min.y;
    modelMeshRef.current.position.y = offset;

    console.log(`모델을 ${axis}축으로 ${degrees}도 회전했습니다.`);
  }, []);

  // 메모리 정리 함수
  const cleanup = useCallback(() => {
    setError(null);
    // 강제 가비지 컬렉션 힌트 (브라우저가 지원하는 경우)
    if (window.gc) {
      window.gc();
    }
  }, []);

  // 자동 정렬 기능 토글 함수 (로드 시 자동 실행 제어)
  const toggleAutoOrient = useCallback(() => {
    setAutoOrientEnabled((prev) => !prev);
    console.log(
      `Auto-orientation ${
        !autoOrientEnabled ? "enabled" : "disabled"
      } (affects both load-time and manual execution)`
    );
  }, [autoOrientEnabled]);

  // 원본 변환 정보로 복원하는 함수 (3MF 파일의 경우 기울어짐 방지를 위해 비활성화)
  const restoreOriginalTransform = useCallback(() => {
    if (!originalTransformRef.current || !modelMeshRef.current) {
      console.log("No original transform available");
      return;
    }

    console.log(
      "Original transform restoration is disabled for 3MF files to prevent tilting"
    );
    console.log("3MF files are displayed in their original geometry position");

    // 참고용으로 원본 변환 정보는 로그로만 출력
    if (originalTransformRef.current) {
      console.log("Original transform (not applied):", {
        position: originalTransformRef.current.position,
        rotation: originalTransformRef.current.rotation,
        scale: originalTransformRef.current.scale,
      });
    }
  }, []);

  // Online3DViewer 스타일 바운딩 박스 계산 함수
  const calculateModelBounds = useCallback((object: THREE.Object3D) => {
    const boundingBox = new THREE.Box3();

    // Online3DViewer의 정확한 바운딩 박스 계산 방식
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // 지오메트리 바운딩 박스가 없으면 계산
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox();
        }

        // 월드 매트릭스를 적용한 바운딩 박스 계산
        if (child.geometry.boundingBox) {
          const tempBox = child.geometry.boundingBox.clone();
          tempBox.applyMatrix4(child.matrixWorld);
          boundingBox.union(tempBox);
        }
      }
    });

    // 유효하지 않은 바운딩 박스 처리
    if (boundingBox.isEmpty()) {
      console.warn("Empty bounding box detected, using fallback");
      return new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );
    }

    return boundingBox;
  }, []);

  // Online3DViewer 스타일 FitToWindow 함수
  const fitToWindow = useCallback(
    (padding: number = 0.1) => {
      if (!modelMeshRef.current || !cameraRef.current) return;

      const boundingBox = calculateModelBounds(modelMeshRef.current);
      const size = boundingBox.getSize(new THREE.Vector3());
      const center = boundingBox.getCenter(new THREE.Vector3());

      // 카메라 거리 계산 (Online3DViewer 방식)
      const maxDimension = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      const distance = maxDimension / 2 / Math.tan(fov / 2);

      // 패딩 적용
      const paddedDistance = distance * (1 + padding);

      // 카메라 위치 설정 (등각투영 스타일)
      const cameraPosition = new THREE.Vector3(
        paddedDistance * 0.707,
        paddedDistance * 0.707,
        paddedDistance * 0.707
      );

      cameraRef.current.position.copy(cameraPosition);
      cameraRef.current.lookAt(center);

      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }

      console.log(
        `FitToWindow completed: distance=${paddedDistance.toFixed(
          2
        )}, size=${maxDimension.toFixed(2)}`
      );
    },
    [calculateModelBounds]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    const mountElement = mountRef.current;

    initializeScene();

    const handleResize = () => {
      if (!mountElement || !rendererRef.current || !cameraRef.current) return;

      const width = mountElement.clientWidth;
      const height = mountElement.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      const renderer = rendererRef.current;
      if (
        renderer &&
        mountElement &&
        mountElement.contains(renderer.domElement)
      ) {
        mountElement.removeChild(renderer.domElement);
      }
    };
  }, [initializeScene]);

  useEffect(() => {
    if (model?.file) {
      loadModel(model.file);
    }
  }, [model, loadModel]);

  // 모델 로딩 완료 후 자동 정렬 실행 (Strategy A: 3MF 파일 포함)
  useEffect(() => {
    if (!isLoading && model && modelMeshRef.current && autoOrientEnabled) {
      const is3MFFile = model.name.toLowerCase().endsWith(".3mf");

      if (is3MFFile) {
        console.log(
          "Strategy A: Executing auto-orientation for 3MF file (preserving original positioning with optimal orientation)"
        );
      } else {
        console.log("Model loading completed - executing auto-orientation");
      }

      setTimeout(() => {
        autoOrient();
      }, 200); // 모델 로딩 완료 후 약간의 지연을 두고 실행
    }
  }, [isLoading, model, autoOrientEnabled, autoOrient]);

  return {
    mountRef,
    isLoading,
    error,
    autoOrient,
    resetView,
    resetOrientation,
    rotateModel,
    toggleAutoOrient,
    restoreOriginalTransform,
    fitToWindow, // Online3DViewer 스타일 FitToWindow 기능 추가
  };
};
