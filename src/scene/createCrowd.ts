import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

function makeSpectatorColor(): THREE.Color {
  const r = Math.random();
  // Blend between home (blue), away (red) and neutral tones for a lively mix.
  if (r < 0.4) return new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.55, 0.45 + Math.random() * 0.2);
  if (r < 0.8) return new THREE.Color().setHSL(0.0 + Math.random() * 0.03, 0.55, 0.45 + Math.random() * 0.2);
  return new THREE.Color().setHSL(Math.random(), 0.35, 0.4 + Math.random() * 0.3);
}

/**
 * Instanced, GPU-animated crowd. Spectators are packed into a single draw call
 * and gently bob via a travelling wave injected into the standard material so
 * that the empty stands feel alive without any per-frame CPU matrix work.
 */
export class Crowd {
  readonly mesh: THREE.InstancedMesh;
  private material: THREE.MeshStandardMaterial;
  private uniforms = { uTime: { value: 0 } };

  constructor(density = 1) {
    const hw = SimulationConfig.PITCH_HALF_WIDTH;
    const hl = SimulationConfig.PITCH_HALF_LENGTH;

    const slots: { x: number; y: number; z: number }[] = [];
    const addStand = (along: 'x' | 'z', fixed: number, length: number, dir: number) => {
      const tiers = 4;
      const perTier = Math.floor((along === 'x' ? 120 : 230) * density);
      const halfLen = length / 2;
      for (let t = 0; t < tiers; t++) {
        const offset = 4 + t * 5;
        const y = 2.2 + t * 2.8;
        const radius = fixed + dir * offset;
        for (let i = 0; i < perTier; i++) {
          const frac = (i + 0.5) / perTier;
          const alongPos = -halfLen + frac * length;
          if (along === 'x') slots.push({ x: alongPos, y, z: radius });
          else slots.push({ x: radius, y, z: alongPos });
        }
      }
    };

    addStand('x', hl + 12, 92, 1);
    addStand('x', -(hl + 12), 92, -1);
    addStand('z', hw + 12, 224, 1);
    addStand('z', -(hw + 12), 224, -1);

    const geo = new THREE.BoxGeometry(0.45, 0.7, 0.4);
    geo.translate(0, 0.35, 0);

    this.material = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec4 iPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float wave = sin(uTime * 3.0 + iPos.x * 0.18 + iPos.z * 0.12);
           transformed.y += wave * 0.14;
         #endif`
      );
    };

    this.mesh = new THREE.InstancedMesh(geo, this.material, slots.length);
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.mesh.frustumCulled = false;

    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      m.makeTranslation(s.x, s.y, s.z);
      this.mesh.setMatrixAt(i, m);
      this.mesh.setColorAt(i, color.copy(makeSpectatorColor()));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
