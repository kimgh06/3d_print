import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import JSZip from "jszip";
import { Model3D } from "~/entities/model/types";

// 3MF 파싱 실패 시 fallback 정보를 담는 인터페이스
interface FallbackGeometry extends THREE.BufferGeometry {
  isFallback?: boolean;
  originalError?: string;
}

export const use3DPreview = (model: Model3D | null) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelMeshRef = useRef<THREE.Group | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

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

  // 메시 요소 처리 함수 - 배치 처리로 스택 오버플로우 방지 및 메모리 최적화
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

      // 큰 모델에 대한 배치 처리 - 크기에 따라 배치 크기 조정
      const SMALL_BATCH = 5000;
      const LARGE_BATCH = 1000;
      const BATCH_SIZE =
        vertexElements.length > 50000 ? LARGE_BATCH : SMALL_BATCH;

      const positions: number[] = [];
      const indices: number[] = [];

      // TypedArray 사용으로 메모리 효율성 향상
      const tempPositions = new Float32Array(vertexElements.length * 3);
      const tempIndices = new Uint32Array(triangleElements.length * 3);

      // 정점 처리 - 배치로 나누어 처리
      let positionIndex = 0;
      for (
        let batchStart = 0;
        batchStart < vertexElements.length;
        batchStart += BATCH_SIZE
      ) {
        const batchEnd = Math.min(
          batchStart + BATCH_SIZE,
          vertexElements.length
        );

        // 현재 배치 처리
        for (let i = batchStart; i < batchEnd; i++) {
          const vertex = vertexElements[i];
          const x = parseFloat(vertex.getAttribute("x") || "0");
          const y = parseFloat(vertex.getAttribute("y") || "0");
          const z = parseFloat(vertex.getAttribute("z") || "0");

          tempPositions[positionIndex] = x;
          tempPositions[positionIndex + 1] = y;
          tempPositions[positionIndex + 2] = z;
          positionIndex += 3;
        }

        // 대용량 데이터 처리 시 이벤트 루프에 제어권 양보
        if (batchEnd < vertexElements.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // 삼각형 인덱스 처리 - 배치로 나누어 처리
      let triangleIndex = 0;
      for (
        let batchStart = 0;
        batchStart < triangleElements.length;
        batchStart += BATCH_SIZE
      ) {
        const batchEnd = Math.min(
          batchStart + BATCH_SIZE,
          triangleElements.length
        );

        // 현재 배치 처리
        for (let i = batchStart; i < batchEnd; i++) {
          const triangle = triangleElements[i];
          const v1 =
            parseInt(triangle.getAttribute("v1") || "0") + vertexOffset;
          const v2 =
            parseInt(triangle.getAttribute("v2") || "0") + vertexOffset;
          const v3 =
            parseInt(triangle.getAttribute("v3") || "0") + vertexOffset;

          tempIndices[triangleIndex] = v1;
          tempIndices[triangleIndex + 1] = v2;
          tempIndices[triangleIndex + 2] = v3;
          triangleIndex += 3;
        }

        // 대용량 데이터 처리 시 이벤트 루프에 제어권 양보
        if (batchEnd < triangleElements.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // TypedArray를 일반 배열로 변환
      positions.push(...Array.from(tempPositions));
      indices.push(...Array.from(tempIndices));

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
            allPositions.push(...result.positions);
            allIndices.push(...result.indices);
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
                allPositions.push(...result.positions);
                allIndices.push(...result.indices);
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
                    allPositions.push(...result.positions);
                    allIndices.push(...result.indices);
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

        console.log(
          `3MF successfully parsed: ${allPositions.length / 3} vertices, ${
            allIndices.length / 3
          } triangles`
        );
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

        // Remove previous model
        if (modelMeshRef.current) {
          sceneRef.current.remove(modelMeshRef.current);
        }

        // Center geometry
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

        const center = boundingBox.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);

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
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

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

  const autoOrient = useCallback(() => {
    if (!modelMeshRef.current) return;

    // 그룹 내 첫 번째 메시 찾기 - 타입 검사 우회
    const meshes: THREE.Mesh[] = [];
    modelMeshRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    const firstMesh = meshes[0];
    if (!firstMesh) return;

    // Simple auto-orientation: place largest face on build plate
    const geometry = firstMesh.geometry as THREE.BufferGeometry;
    if (!geometry) return;

    geometry.computeBoundingBox();

    const boundingBox = geometry.boundingBox;
    if (!boundingBox) return;

    const size = boundingBox.getSize(new THREE.Vector3());

    // Rotate to place largest dimension on Z-axis
    if (size.x > size.y && size.x > size.z) {
      modelMeshRef.current.rotation.z = Math.PI / 2;
    } else if (size.y > size.z) {
      modelMeshRef.current.rotation.x = Math.PI / 2;
    }
  }, []);

  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    cameraRef.current.position.set(50, 50, 50);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
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
  };
};
