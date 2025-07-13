interface Feature {
  icon: string;
  title: string;
  description: string;
  bgColor: string;
}

const features: Feature[] = [
  {
    icon: "🎯",
    title: "AI 모델 분석",
    description:
      "업로드된 3D 모델을 AI가 자동 분석하여 장식용, 기능성, 조립체로 분류하고 최적 설정을 추천합니다.",
    bgColor: "bg-blue-100",
  },
  {
    icon: "⚡",
    title: "Orca Slicer 연동",
    description:
      "업계 표준 Orca Slicer를 백엔드에서 활용하여 정확한 G-code 생성과 신뢰할 수 있는 견적을 제공합니다.",
    bgColor: "bg-green-100",
  },
  {
    icon: "💰",
    title: "정확한 비용 계산",
    description:
      "필라멘트 종류별 단가, 전력비, 마진을 고려한 정확한 3D 프린팅 비용을 실시간으로 계산합니다.",
    bgColor: "bg-purple-100",
  },
];

import { Grid, Card } from "./index";

export const FeaturesSection: React.FC = () => {
  return (
    <div className="mt-16">
      <Grid cols={3} gap="lg">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="text-center hover:shadow-md transition-shadow"
          >
            <div
              className={`w-12 h-12 ${feature.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              <span className="text-xl">{feature.icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </Card>
        ))}
      </Grid>
    </div>
  );
};
