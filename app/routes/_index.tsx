import type { MetaFunction } from "@remix-run/node";
import {
  FeaturesSection,
  WorkflowSection,
  Footer,
  MainContent,
} from "~/widgets/layout";

export const meta: MetaFunction = () => {
  return [
    { title: "3D 프린팅 견적 자동화 플랫폼" },
    { name: "description", content: "AI 기반 3D 프린팅 견적 자동화 웹 플랫폼" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainContent />
    </div>
  );
}
