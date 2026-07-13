import * as THREE from 'three';
import WebGPURenderer from 'three/src/renderers/webgpu/WebGPURenderer.js';

export class RendererFactory {
  static async createRenderer(canvas: HTMLCanvasElement): Promise<any> {
    try {
      if ((navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          // Has WebGPU support
          const renderer = new WebGPURenderer({ canvas, antialias: true });
          await renderer.init();
          return renderer;
        }
      }
    } catch (e) {
      console.warn("WebGPU initialization failed, falling back to WebGL2", e);
    }
    
    // Fallback to WebGL
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    return renderer;
  }
}
