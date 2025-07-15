import { HeroSection } from "./HeroSection";
import { Container, Grid } from "./index";
import { NewModelViewer } from "../model-viewer/components/NewModelViewer";
import { ModelSettings3MF } from "../model-settings-3mf/ModelSettings3MF";
import { SlicerSettings } from "../slicer-settings/SlicerSettings";
import { WASMSlicerWidget } from "../wasm-slicer/WASMSlicerWidget";
import { SlicingVisualizer } from "../slicing-visualizer/SlicingVisualizer";

export const MainContent: React.FC = () => {
  return (
    <main className="py-8">
      <Container>
        <HeroSection />

        {/* Main Grid Layout */}
        <Grid cols={3} gap="lg" responsive={false} className="lg:grid-cols-3">
          {/* Left Column: Model Viewer & Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* 3D Model Viewer */}
            <NewModelViewer />

            {/* 3MF Settings Display */}
            <ModelSettings3MF />

            {/* Slicer Settings */}
            <SlicerSettings />
          </div>

          {/* Right Column: WASM Slicer */}
          <div className="space-y-8">
            <WASMSlicerWidget />
          </div>
        </Grid>
      </Container>
    </main>
  );
};
