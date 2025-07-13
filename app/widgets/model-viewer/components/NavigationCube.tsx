import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

interface NavigationCubeProps {
  onViewChange: (view: string) => void;
  size?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity?: number;
}

// 뷰 프리셋 정의
export const VIEWS = {
  front: { position: [0, 0, 100], target: [0, 0, 0], label: "Front" },
  back: { position: [0, 0, -100], target: [0, 0, 0], label: "Back" },
  left: { position: [-100, 0, 0], target: [0, 0, 0], label: "Left" },
  right: { position: [100, 0, 0], target: [0, 0, 0], label: "Right" },
  top: { position: [0, 100, 0], target: [0, 0, 0], label: "Top" },
  bottom: { position: [0, -100, 0], target: [0, 0, 0], label: "Bottom" },
  isometric: { position: [50, 50, 50], target: [0, 0, 0], label: "ISO" },
} as const;

// 네비게이션 큐브 메인 컴포넌트
export const NavigationCube: React.FC<NavigationCubeProps> = ({
  onViewChange,
  size = 120,
  position = "top-right",
  opacity = 0.9,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredFaceRef = useRef<THREE.Mesh | null>(null);

  // 큐브 면 생성 함수
  const createCubeFaces = useCallback(() => {
    const group = new THREE.Group();
    const faceSize = 1.8;

    // 면 정의 (위치, 회전, 색상, 라벨, 뷰)
    const faces = [
      {
        pos: [0, 0, 1],
        rot: [0, 0, 0],
        color: 0xe5e7eb,
        label: "FRONT",
        view: "front",
      },
      {
        pos: [0, 0, -1],
        rot: [0, Math.PI, 0],
        color: 0xe5e7eb,
        label: "BACK",
        view: "back",
      },
      {
        pos: [1, 0, 0],
        rot: [0, Math.PI / 2, 0],
        color: 0xfca5a5,
        label: "RIGHT",
        view: "right",
      },
      {
        pos: [-1, 0, 0],
        rot: [0, -Math.PI / 2, 0],
        color: 0xfca5a5,
        label: "LEFT",
        view: "left",
      },
      {
        pos: [0, 1, 0],
        rot: [-Math.PI / 2, 0, 0],
        color: 0x86efac,
        label: "TOP",
        view: "top",
      },
      {
        pos: [0, -1, 0],
        rot: [Math.PI / 2, 0, 0],
        color: 0x86efac,
        label: "BOTTOM",
        view: "bottom",
      },
    ];

    faces.forEach((face) => {
      // 면 메시 생성
      const geometry = new THREE.PlaneGeometry(faceSize, faceSize);
      const material = new THREE.MeshLambertMaterial({
        color: face.color,
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(face.pos[0], face.pos[1], face.pos[2]);
      mesh.rotation.set(face.rot[0], face.rot[1], face.rot[2]);

      // 클릭 및 호버를 위한 사용자 데이터 설정
      mesh.userData = {
        view: face.view,
        originalColor: face.color,
        isClickable: true,
      };

      group.add(mesh);

      // 텍스트는 간단한 CSS 오버레이로 처리하거나 생략
      // Three.js에서 텍스트 렌더링은 복잡하므로 일단 생략
    });

    // ISO 구 추가
    const isoGeometry = new THREE.SphereGeometry(0.2);
    const isoMaterial = new THREE.MeshLambertMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
    });
    const isoMesh = new THREE.Mesh(isoGeometry, isoMaterial);
    isoMesh.position.set(0.7, 0.7, 0.7);
    isoMesh.userData = {
      view: "isometric",
      originalColor: 0xfbbf24,
      isClickable: true,
    };
    group.add(isoMesh);

    return group;
  }, []);

  // 마우스 이벤트 핸들러
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (
      !containerRef.current ||
      !cameraRef.current ||
      !cubeRef.current ||
      !raycasterRef.current
    )
      return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(
      cubeRef.current.children
    );

    // 이전 호버 상태 리셋
    if (hoveredFaceRef.current) {
      const material = hoveredFaceRef.current
        .material as THREE.MeshLambertMaterial;
      material.color.setHex(hoveredFaceRef.current.userData.originalColor);
      hoveredFaceRef.current = null;
      containerRef.current.style.cursor = "default";
    }

    // 새로운 호버 상태 설정
    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      if (intersectedMesh.userData.isClickable) {
        hoveredFaceRef.current = intersectedMesh;
        const material = intersectedMesh.material as THREE.MeshLambertMaterial;
        material.color.setHex(0x60a5fa); // 호버 색상
        containerRef.current.style.cursor = "pointer";
      }
    }
  }, []);

  const handleMouseClick = useCallback(
    (event: MouseEvent) => {
      if (
        !containerRef.current ||
        !cameraRef.current ||
        !cubeRef.current ||
        !raycasterRef.current
      )
        return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        cubeRef.current.children
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        if (intersectedMesh.userData.isClickable) {
          onViewChange(intersectedMesh.userData.view);
        }
      }
    },
    [onViewChange]
  );

  // 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    console.log("NavigationCube initializing...");

    const width = size;
    const height = size;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // 투명 배경
    rendererRef.current = renderer;

    console.log("NavigationCube renderer created, size:", width, "x", height);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Cube
    const cube = createCubeFaces();
    cube.scale.setScalar(0.8);
    cubeRef.current = cube;
    scene.add(cube);

    console.log(
      "NavigationCube faces created, children count:",
      cube.children.length
    );

    // Raycaster
    raycasterRef.current = new THREE.Raycaster();

    // 컨테이너에 렌더러 추가
    containerRef.current.appendChild(renderer.domElement);
    console.log("NavigationCube renderer added to DOM");

    // 이벤트 리스너 추가
    containerRef.current.addEventListener("mousemove", handleMouseMove);
    containerRef.current.addEventListener("click", handleMouseClick);

    // 애니메이션 루프
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 클린업
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", handleMouseMove);
        containerRef.current.removeEventListener("click", handleMouseClick);
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, [size, createCubeFaces, handleMouseMove, handleMouseClick]);

  const getPositionStyle = () => {
    const styles = {
      "top-left": { top: "20px", left: "20px" },
      "top-right": { top: "20px", right: "20px" },
      "bottom-left": { bottom: "20px", left: "20px" },
      "bottom-right": { bottom: "20px", right: "20px" },
    };
    return styles[position];
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-20 pointer-events-auto rounded-lg shadow-lg bg-gray-800 bg-opacity-90 border border-gray-400"
      style={{
        ...getPositionStyle(),
        width: `${size}px`,
        height: `${size}px`,
        opacity,
      }}
    />
  );
};
