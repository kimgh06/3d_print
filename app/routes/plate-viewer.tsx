import type { MetaFunction } from "@remix-run/node";
import { PlateViewerWidget } from "~/widgets/plate-viewer/PlateViewerWidget";

export const meta: MetaFunction = () => {
  return [
    { title: "3D Plate Viewer - 3D Print" },
    {
      name: "description",
      content: "Web-based 3D slicer plate viewer for 3D printing models",
    },
  ];
};

export default function PlateViewerRoute() {
  return <PlateViewerWidget />;
}
