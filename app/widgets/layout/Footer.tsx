import { Container } from "./index";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-16">
      <Container>
        <div className="text-center">
          <p className="text-gray-400">
            © 2025 3D Print Estimator. Powered by Remix + Feature-Sliced Design
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <span>🔧 Orca Slicer</span>
            <span>🤖 AI Classification</span>
            <span>📊 Real-time Estimation</span>
            <span>💾 G-code Export</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};
