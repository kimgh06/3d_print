export interface Model3D {
  id: string;
  name: string;
  size: number; // bytes
  type: 'stl' | '3mf' | 'obj';
  file: File;
  createdAt: Date;
  classification?: 'decorative' | 'functional' | 'assembly';
}

export interface ModelGeometry {
  vertices: Float32Array;
  faces: Uint32Array;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface ModelAnalysis {
  complexity: 'low' | 'medium' | 'high';
  supportRequired: boolean;
  estimatedVolume: number; // cm³
  surfaceArea: number; // cm²
  fileFormat?: string;
}