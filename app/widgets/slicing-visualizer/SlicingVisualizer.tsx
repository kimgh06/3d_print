import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { SlicingResult } from "~/shared/lib/js-slicer";

interface SlicingVisualizerProps {
  slicingResult: SlicingResult | null;
  className?: string;
}

export const SlicingVisualizer: React.FC<SlicingVisualizerProps> = ({
  slicingResult,
  className = "",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Three.js 초기화
  useEffect(() => {
    if (!mountRef.current || isInitialized) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 그리드 헬퍼
    const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 축 헬퍼
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);

    setIsInitialized(true);

    // 애니메이션 루프
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isInitialized]);

  // 슬라이싱 결과 시각화
  useEffect(() => {
    if (!sceneRef.current || !slicingResult) return;

    // 기존 슬라이싱 결과 제거
    const existingObjects = sceneRef.current.children.filter(
      (child) => child.userData.isSlicingResult
    );
    existingObjects.forEach((obj) => {
      sceneRef.current!.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });

    // 새로운 슬라이싱 결과 시각화
    visualizeSlicingResult(slicingResult);
  }, [slicingResult]);

  const visualizeSlicingResult = (result: SlicingResult) => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const layerInfo = result.layerInfo;

    // 레이어별로 시각화
    layerInfo.layers.forEach((layer, layerIndex) => {
      const layerHeight = layer.height;
      const layerColor = new THREE.Color().setHSL(
        layerIndex / layerInfo.totalLayers,
        0.8,
        0.6
      );

      // 윤곽선 시각화
      if (layer.contourCount > 0) {
        const contourGeometry = new THREE.BufferGeometry();
        const contourMaterial = new THREE.LineBasicMaterial({
          color: layerColor,
          linewidth: 2,
        });

        // 윤곽선 포인트들을 연결하는 선 생성
        const points: THREE.Vector3[] = [];

        // 실제 구현에서는 레이어의 윤곽선 데이터를 사용
        // 여기서는 간단한 예시로 바운딩 박스 기반 윤곽선 생성
        const bbox = result.boundingBox;
        const width = bbox[3] - bbox[0];
        const height = bbox[4] - bbox[1];

        // 사각형 윤곽선 생성
        points.push(
          new THREE.Vector3(bbox[0], bbox[1], layerHeight),
          new THREE.Vector3(bbox[3], bbox[1], layerHeight),
          new THREE.Vector3(bbox[3], bbox[4], layerHeight),
          new THREE.Vector3(bbox[0], bbox[4], layerHeight),
          new THREE.Vector3(bbox[0], bbox[1], layerHeight)
        );

        contourGeometry.setFromPoints(points);
        const contourLine = new THREE.Line(contourGeometry, contourMaterial);
        contourLine.userData.isSlicingResult = true;
        scene.add(contourLine);
      }

      // 인필 시각화
      if (layer.infillCount > 0) {
        const infillGeometry = new THREE.BufferGeometry();
        const infillMaterial = new THREE.LineBasicMaterial({
          color: layerColor.clone().multiplyScalar(0.5),
          linewidth: 1,
        });

        const infillPoints: THREE.Vector3[] = [];

        // 실제 구현에서는 레이어의 인필 데이터를 사용
        // 여기서는 간단한 예시로 격자 패턴 생성
        const bbox = result.boundingBox;
        const spacing = 2.0;
        const density = result.layerInfo.infillDensity / 100.0;

        for (let x = bbox[0]; x <= bbox[3]; x += spacing / density) {
          infillPoints.push(
            new THREE.Vector3(x, bbox[1], layerHeight),
            new THREE.Vector3(x, bbox[4], layerHeight)
          );
        }

        infillGeometry.setFromPoints(infillPoints);
        const infillLines = new THREE.LineSegments(
          infillGeometry,
          infillMaterial
        );
        infillLines.userData.isSlicingResult = true;
        scene.add(infillLines);
      }
    });

    // 카메라 위치 조정
    if (cameraRef.current) {
      const bbox = result.boundingBox;
      const center = new THREE.Vector3(
        (bbox[0] + bbox[3]) / 2,
        (bbox[1] + bbox[4]) / 2,
        (bbox[2] + bbox[5]) / 2
      );

      const size = Math.max(
        bbox[3] - bbox[0],
        bbox[4] - bbox[1],
        bbox[5] - bbox[2]
      );

      const distance = size * 2;
      cameraRef.current.position
        .copy(center)
        .add(new THREE.Vector3(distance, distance, distance));
      cameraRef.current.lookAt(center);

      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }
  };

  const handleFitToWindow = () => {
    if (!cameraRef.current || !controlsRef.current || !slicingResult) return;

    const bbox = slicingResult.boundingBox;
    const center = new THREE.Vector3(
      (bbox[0] + bbox[3]) / 2,
      (bbox[1] + bbox[4]) / 2,
      (bbox[2] + bbox[5]) / 2
    );

    const size = Math.max(
      bbox[3] - bbox[0],
      bbox[4] - bbox[1],
      bbox[5] - bbox[2]
    );

    const distance = size * 1.5;
    cameraRef.current.position
      .copy(center)
      .add(new THREE.Vector3(distance, distance, distance));
    cameraRef.current.lookAt(center);

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const handleResetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    cameraRef.current.position.set(50, 50, 50);
    cameraRef.current.lookAt(0, 0, 0);

    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className={`w-full h-full flex flex-col bg-gray-900 ${className}`}>
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            🔪 슬라이싱 결과 시각화
          </h2>
          <div className="flex items-center space-x-4">
            {slicingResult && (
              <div className="text-green-400 text-sm">
                ✓ {slicingResult.totalLayers}개 레이어
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleFitToWindow}
            disabled={!slicingResult}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Fit to Window
          </button>

          <button
            onClick={handleResetView}
            disabled={!slicingResult}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset View
          </button>

          {slicingResult && (
            <div className="text-gray-300 text-sm flex items-center space-x-4">
              <span>레이어 높이: {slicingResult.layerInfo.layerHeight}mm</span>
              <span>인필 밀도: {slicingResult.layerInfo.infillDensity}%</span>
              <span>
                처리 시간: {slicingResult.processingTime.toFixed(2)}ms
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 뷰어 영역 */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />

        {!slicingResult && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🔪</div>
              <div className="text-xl mb-2">슬라이싱 결과 대기 중</div>
              <div className="text-sm">
                JavaScript 슬라이서에서 결과를 생성하면
                <br />
                여기에 3D 시각화가 표시됩니다
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
