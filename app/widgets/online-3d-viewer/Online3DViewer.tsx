import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as fflate from "fflate";

interface Online3DViewerProps {
  file?: File | null;
  width?: number;
  height?: number;
  backgroundColor?: string;
  showGrid?: boolean;
  showAxes?: boolean;
}

export const Online3DViewer: React.FC<Online3DViewerProps> = ({
  file,
  width = 800,
  height = 600,
  backgroundColor = "#f0f0f0",
  showGrid = true,
  showAxes = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scene 초기화
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene 생성
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // Camera 생성
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    // Renderer 생성
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Controls 생성
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid 추가
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20);
      scene.add(gridHelper);
    }

    // Axes 추가
    if (showAxes) {
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height, backgroundColor, showGrid, showAxes]);

  // 3MF 파일 파싱 함수
  const parse3MF = async (file: File): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);

          // fflate로 ZIP 해제
          const unzipped = fflate.unzipSync(uint8Array);

          // 3Dmfactory 파일 찾기
          const model3MF = unzipped["3D/3dmodel.model"];
          if (!model3MF) {
            throw new Error("3D model file not found in 3MF");
          }

          // XML 파싱
          const xmlText = new TextDecoder().decode(model3MF);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");

          const group = new THREE.Group();

          // 모든 object 찾기
          const objects = xmlDoc.querySelectorAll("object");
          objects.forEach((object, objectIndex) => {
            const meshes = object.querySelectorAll("mesh");
            meshes.forEach((mesh, meshIndex) => {
              try {
                // Vertices 파싱
                const verticesElement = mesh.querySelector("vertices");
                if (!verticesElement) return;

                const vertices: number[] = [];
                const vertexElements =
                  verticesElement.querySelectorAll("vertex");
                vertexElements.forEach((vertex) => {
                  const x = parseFloat(vertex.getAttribute("x") || "0");
                  const y = parseFloat(vertex.getAttribute("y") || "0");
                  const z = parseFloat(vertex.getAttribute("z") || "0");
                  vertices.push(x, y, z);
                });

                // Triangles 파싱
                const trianglesElement = mesh.querySelector("triangles");
                if (!trianglesElement) return;

                const indices: number[] = [];
                const triangleElements =
                  trianglesElement.querySelectorAll("triangle");
                triangleElements.forEach((triangle) => {
                  const v1 = parseInt(triangle.getAttribute("v1") || "0");
                  const v2 = parseInt(triangle.getAttribute("v2") || "0");
                  const v3 = parseInt(triangle.getAttribute("v3") || "0");
                  indices.push(v1, v2, v3);
                });

                if (vertices.length > 0 && indices.length > 0) {
                  // Geometry 생성
                  const geometry = new THREE.BufferGeometry();
                  geometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(vertices, 3)
                  );
                  geometry.setIndex(indices);
                  geometry.computeVertexNormals();

                  // Material 생성
                  const material = new THREE.MeshPhongMaterial({
                    color: 0x888888,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9,
                  });

                  // Mesh 생성
                  const mesh = new THREE.Mesh(geometry, material);
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;

                  group.add(mesh);
                }
              } catch (meshError) {
                console.warn(
                  `Failed to parse mesh ${meshIndex} in object ${objectIndex}:`,
                  meshError
                );
              }
            });
          });

          resolve(group);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // 파일 로드 처리
  useEffect(() => {
    if (!file || !sceneRef.current) return;

    setIsLoading(true);
    setError(null);

    const loadFile = async () => {
      try {
        // 기존 모델 제거
        const scene = sceneRef.current!;
        const existingModels = scene.children.filter(
          (child) => child.type === "Group"
        );
        existingModels.forEach((model) => scene.remove(model));

        if (file.name.toLowerCase().endsWith(".3mf")) {
          const group = await parse3MF(file);
          scene.add(group);

          // Camera 위치 조정
          const box = new THREE.Box3().setFromObject(group);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 2;

          if (cameraRef.current) {
            cameraRef.current.position.copy(center);
            cameraRef.current.position.add(
              new THREE.Vector3(distance, distance, distance)
            );
            cameraRef.current.lookAt(center);
            cameraRef.current.updateMatrixWorld();
          }

          if (controlsRef.current) {
            controlsRef.current.target.copy(center);
            controlsRef.current.update();
          }
        } else {
          throw new Error(
            "Unsupported file format. Only 3MF files are supported."
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
        console.error("File loading error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [file]);

  return (
    <div className="relative">
      <div
        ref={mountRef}
        className="border border-gray-300 rounded-lg overflow-hidden"
        style={{ width, height }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};
