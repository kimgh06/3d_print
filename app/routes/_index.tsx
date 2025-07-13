import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { NewModelViewer } from "~/widgets/model-viewer/components/NewModelViewer";
import { SlicerSettings } from "~/widgets/slicer-settings/SlicerSettings";
import { EstimationCard } from "~/widgets/estimation-card/EstimationCard";
import { ModelSettings3MF } from "~/widgets/model-settings-3mf/ModelSettings3MF";

export const meta: MetaFunction = () => {
  return [
    { title: "3D 프린팅 견적 자동화 플랫폼" },
    { name: "description", content: "AI 기반 3D 프린팅 견적 자동화 웹 플랫폼" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  🖨️ 3D Print Estimator
                </h1>
              </div>
              <div className="ml-4 text-sm text-gray-500">
                AI 기반 3D 프린팅 견적 자동화 플랫폼
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/plate-viewer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🏗️ Plate Viewer
              </Link>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                ✨ Bambu Lab 호환
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                🤖 AI 분석
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            3D 모델 업로드부터 견적까지, 한 번에!
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            STL, 3MF, OBJ 형식을 모두 지원하며, AI 모델 분석으로 정확한 프린팅
            시간, 필라멘트 사용량, 비용을 자동 계산합니다.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Model Viewer & Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* 3D Model Viewer */}
            <NewModelViewer />

            {/* 3MF Settings Display */}
            <ModelSettings3MF />

            {/* Slicer Settings */}
            <SlicerSettings />
          </div>

          {/* Right Column: Estimation Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <EstimationCard />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              🎯
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI 모델 분석
            </h3>
            <p className="text-gray-600 text-sm">
              업로드된 3D 모델을 AI가 자동 분석하여 장식용, 기능성, 조립체로
              분류하고 최적 설정을 추천합니다.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Orca Slicer 연동
            </h3>
            <p className="text-gray-600 text-sm">
              업계 표준 Orca Slicer를 백엔드에서 활용하여 정확한 G-code 생성과
              신뢰할 수 있는 견적을 제공합니다.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              💰
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              정확한 비용 계산
            </h3>
            <p className="text-gray-600 text-sm">
              필라멘트 종류별 단가, 전력비, 마진을 고려한 정확한 3D 프린팅
              비용을 실시간으로 계산합니다.
            </p>
          </div>
        </div>

        {/* Workflow Section */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            간단한 4단계 프로세스
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">모델 업로드</h4>
              <p className="text-sm text-gray-600">
                STL, 3MF, OBJ 파일을 드래그하거나 선택하여 업로드
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI 분석</h4>
              <p className="text-sm text-gray-600">
                모델 분류 및 최적 출력 설정 자동 추천
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">설정 선택</h4>
              <p className="text-sm text-gray-600">
                추천 설정 중 선택하거나 사용자 정의 설정 적용
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">견적 완료</h4>
              <p className="text-sm text-gray-600">
                시간, 비용, G-code까지 한 번에 확인
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2025 3D Print Estimator. Powered by Remix + Feature-Sliced
              Design
            </p>
            <div className="mt-4 flex justify-center space-x-6 text-sm">
              <span>🔧 Orca Slicer</span>
              <span>🤖 AI Classification</span>
              <span>📊 Real-time Estimation</span>
              <span>💾 G-code Export</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
