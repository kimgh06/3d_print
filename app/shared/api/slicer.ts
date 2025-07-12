import axios, { AxiosInstance } from 'axios';

export class SlicerAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async uploadModel(file: File): Promise<{ modelId: string; analysis: any }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post('/api/models/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data;
  }

  async analyzeModel(modelId: string): Promise<any> {
    const response = await this.client.post(`/api/models/${modelId}/analyze`);
    return response.data;
  }

  async slice(modelId: string, settings: any): Promise<{ 
    gcodeUrl: string;
    printTime: number;
    filamentUsage: { length: number; weight: number };
    cost: number;
  }> {
    const response = await this.client.post(`/api/models/${modelId}/slice`, settings);
    return response.data;
  }

  async getPresets(): Promise<any[]> {
    const response = await this.client.get('/api/presets');
    return response.data;
  }

  async classifyModel(modelId: string): Promise<{ 
    category: 'decorative' | 'functional' | 'assembly';
    confidence: number;
    suggestedSettings: any;
  }> {
    const response = await this.client.post(`/api/models/${modelId}/classify`);
    return response.data;
  }
}

export const slicerAPI = new SlicerAPI();