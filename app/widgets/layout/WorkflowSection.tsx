interface WorkflowStep {
  number: number;
  title: string;
  description: string;
  bgColor: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    number: 1,
    title: "모델 업로드",
    description: "STL, 3MF, OBJ 파일을 드래그하거나 선택하여 업로드",
    bgColor: "bg-blue-500",
  },
  {
    number: 2,
    title: "AI 분석",
    description: "모델 분류 및 최적 출력 설정 자동 추천",
    bgColor: "bg-green-500",
  },
  {
    number: 3,
    title: "설정 선택",
    description: "추천 설정 중 선택하거나 사용자 정의 설정 적용",
    bgColor: "bg-purple-500",
  },
  {
    number: 4,
    title: "견적 완료",
    description: "시간, 비용, G-code까지 한 번에 확인",
    bgColor: "bg-orange-500",
  },
];

import { Card, Grid } from "./index";

export const WorkflowSection: React.FC = () => {
  return (
    <div className="mt-16">
      <Card padding="lg">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
          간단한 4단계 프로세스
        </h3>
        <Grid cols={4} gap="md">
          {workflowSteps.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className={`w-16 h-16 ${step.bgColor} text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold`}
              >
                {step.number}
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </Grid>
      </Card>
    </div>
  );
};
