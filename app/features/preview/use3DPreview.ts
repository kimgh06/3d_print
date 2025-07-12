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

// 3MF 파싱 실패 시 fallback 정보를 담는 인터페이스
interface FallbackGeometry extends THREE.BufferGeometry {
  isFallback?: boolean;
  originalError?: string;
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
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
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

        // 모든 지오메트리를 담을 배열 - 메모리 효율적 처리
        const allPositions: number[] = [];
        const allIndices: number[] = [];
        let currentVertexOffset = 0;

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
        (geometry as any).extractedSettings = extractedSettings;

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
        const projectSettingsFile = zip.file("Metadata/project_settings.config");
        if (projectSettingsFile) {
          const content = await projectSettingsFile.async("text");
          console.log("Project settings found:", content.substring(0, 200));

          // 설정 파싱 (INI 형식으로 가정)
          const projectSettings = parseConfigFile(content);

          settings.printSettings = {
            layerHeight:
              parseFloat(projectSettings.layer_height) || undefined,
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
              angle: parseFloat(projectSettings.support_threshold_angle) || undefined,
            },
            retraction: {
              enabled:
                projectSettings.retraction_enable === "1" ||
                projectSettings.retraction_enable === "true",
              distance: parseFloat(projectSettings.retraction_length) || undefined,
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
            filamentUsed: parseFloat(sliceInfo.total_filament_used) || undefined,
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
            settings.metadata.creationDate = plateData.creation_date || undefined;
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

        // 개선된 센터링 로직: X, Z는 중앙에, Y는 바닥에 맞춤
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        console.log("Model bounds before centering:", {
          min: boundingBox.min,
          max: boundingBox.max,
          center: center,
          size: size
        });

        // X, Z축은 중앙 정렬, Y축은 바닥(최소값)을 0에 맞춤
        geometry.translate(
          -center.x,           // X축 중앙 정렬
          -boundingBox.min.y,  // Y축 바닥을 0에 맞춤 (기울어짐 방지)
          -center.z            // Z축 중앙 정렬
        );

        // 변환 후 바운딩 박스 재계산
        geometry.computeBoundingBox();
        const adjustedBounds = geometry.boundingBox!;
        
        console.log("Model bounds after centering:", {
          min: adjustedBounds.min,
          max: adjustedBounds.max,
          size: adjustedBounds.getSize(new THREE.Vector3())
        });

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
        mesh.castShadow = true;
        mesh.receiveShadow = true;

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
        if (extension === "3mf" && (geometry as any).extractedSettings) {
          const extractedSettings = (geometry as any).extractedSettings as Model3MFSettings;
          setExtracted3MFSettings(extractedSettings);
          console.log("3MF settings saved to store:", extractedSettings);
        }

        console.log(
          `Model loaded: ${modelFile.name}, vertices: ${
            geometry.attributes.position.count
          }, size: ${maxDim.toFixed(2)}`
        );
      } catch (err) {
        console.error("Failed to load model:", err);
        const errorMessage =
          err instanceof Error ? err.message : "3D 모델을 불러올 수 없습니다.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [load3MFModel, loadOBJModel, loadPLYModel, loadGLTFModel]
  );

  const resetView = useCallback(() => {
    if (isServer || !cameraRef.current || !controlsRef.current) return;

    cameraRef.current.position.set(50, 50, 50);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  }, []);

  // 좌표계 정규화 함수 - 파일 형식별 좌표계 차이 보정
  const normalizeCoordinateSystem = useCallback((geometry: THREE.BufferGeometry, fileExtension: string) => {
    console.log(`Normalizing coordinate system for ${fileExtension.toUpperCase()} file`);
    
    // 원본 바운딩 박스 계산
    geometry.computeBoundingBox();
    const originalBounds = geometry.boundingBox!;
    
    console.log("Original bounds:", {
      min: originalBounds.min,
      max: originalBounds.max,
      size: originalBounds.getSize(new THREE.Vector3())
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
          console.log("Detected flat model on XY plane, applying Z-up to Y-up conversion");
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
        console.log("GLTF/GLB uses standard Y-up, no coordinate conversion needed");
        break;
      }
    }

    // 변환 후 바운딩 박스 재계산
    geometry.computeBoundingBox();
    const normalizedBounds = geometry.boundingBox!;
    
    console.log("Normalized bounds:", {
      min: normalizedBounds.min,
      max: normalizedBounds.max,
      size: normalizedBounds.getSize(new THREE.Vector3())
    });

    return geometry;
  }, []);

  // 3D 프린팅 적합성 점수 계산 함수
  const calculatePrintabilityScore = useCallback(
    (size: THREE.Vector3, box: THREE.Box3): number => {
      let score = 0;

      // 1. 높이 최소화 (Z축 높이가 낮을수록 좋음) - 40%
      const heightScore = Math.max(
        0,
        100 - (size.z / Math.max(size.x, size.y)) * 50
      );
      score += heightScore * 0.4;

      // 2. 베이스 면적 최대화 (XY 평면 면적이 클수록 안정적) - 30%
      const baseArea = size.x * size.y;
      const maxPossibleArea = Math.max(
        size.x * size.z,
        size.y * size.z,
        size.x * size.y
      );
      const baseScore = (baseArea / maxPossibleArea) * 100;
      score += baseScore * 0.3;

      // 3. 종횡비 최적화 (너무 높거나 가늘지 않게) - 20%
      const aspectRatio = size.z / Math.sqrt(size.x * size.y);
      const aspectScore = Math.max(0, 100 - Math.abs(aspectRatio - 1) * 30);
      score += aspectScore * 0.2;

      // 4. 바닥면 평탄도 (Y=0 근처에 많은 점들이 있을수록 좋음) - 10%
      const bottomFlatnessScore = box.min.y > -0.1 ? 100 : 50; // 바닥면이 평평한지 간단 체크
      score += bottomFlatnessScore * 0.1;

      return score;
    },
    []
  );

  // 3D 프린팅을 위한 정교한 자동 방향 설정 함수
  const autoOrient = useCallback(() => {
    if (isServer || !modelMeshRef.current) return;

    // 그룹 내 첫 번째 메시 찾기
    const meshes: THREE.Mesh[] = [];
    modelMeshRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    const firstMesh = meshes[0];
    if (!firstMesh) return;

    const geometry = firstMesh.geometry as THREE.BufferGeometry;
    if (!geometry) return;

    // 현재 회전 상태 저장
    const originalRotation = modelMeshRef.current.rotation.clone();

    try {
      // 지오메트리 바운딩 박스 재계산
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      if (!boundingBox) return;

      console.log("Starting auto-orientation analysis...");

      // 최적 방향을 찾기 위한 분석
      const orientations = [
        { x: 0, y: 0, z: 0, name: "원본" },
        { x: Math.PI / 2, y: 0, z: 0, name: "X축 90도" },
        { x: -Math.PI / 2, y: 0, z: 0, name: "X축 -90도" },
        { x: 0, y: Math.PI / 2, z: 0, name: "Y축 90도" },
        { x: 0, y: -Math.PI / 2, z: 0, name: "Y축 -90도" },
        { x: 0, y: 0, z: Math.PI / 2, name: "Z축 90도" },
        { x: 0, y: 0, z: -Math.PI / 2, name: "Z축 -90도" },
        { x: Math.PI, y: 0, z: 0, name: "X축 180도" },
        { x: 0, y: Math.PI, z: 0, name: "Y축 180도" },
      ];

      let bestOrientation = orientations[0];
      let bestScore = -Infinity;

      // 각 방향에 대해 평가
      for (const orientation of orientations) {
        // 임시로 회전 적용
        modelMeshRef.current.rotation.set(
          orientation.x,
          orientation.y,
          orientation.z
        );

        // 회전된 바운딩 박스 계산
        const box = new THREE.Box3().setFromObject(modelMeshRef.current);
        const size = box.getSize(new THREE.Vector3());

        // 3D 프린팅 최적화 점수 계산
        const score = calculatePrintabilityScore(size, box);

        console.log(
          `${orientation.name}: 크기(${size.x.toFixed(1)}, ${size.y.toFixed(
            1
          )}, ${size.z.toFixed(1)}), 점수: ${score.toFixed(2)}`
        );

        if (score > bestScore) {
          bestScore = score;
          bestOrientation = orientation;
        }
      }

      // 최적 방향 적용
      modelMeshRef.current.rotation.set(
        bestOrientation.x,
        bestOrientation.y,
        bestOrientation.z
      );

      // 회전 후 바닥에 맞춤
      const finalBox = new THREE.Box3().setFromObject(modelMeshRef.current);
      const offset = -finalBox.min.y; // 바닥(Y=0)에 맞춤
      modelMeshRef.current.position.y = offset;

      console.log(
        `최적 방향 선택: ${bestOrientation.name} (점수: ${bestScore.toFixed(
          2
        )})`
      );
    } catch (error) {
      console.error("Auto-orientation failed:", error);
      // 오류 발생 시 원래 회전 상태로 복원
      modelMeshRef.current.rotation.copy(originalRotation);
    }
  }, [calculatePrintabilityScore]);

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

  return {
    mountRef,
    isLoading,
    error,
    autoOrient,
    resetView,
    resetOrientation,
    rotateModel,
  };
};
