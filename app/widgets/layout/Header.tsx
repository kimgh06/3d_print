import { Container } from "./index";

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <Container>
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
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
              ✨ Bambu Lab 호환
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              🤖 AI 분석
            </span>
          </div>
        </div>
      </Container>
    </header>
  );
};
