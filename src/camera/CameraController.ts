/**
 * Exact critically damped broadcast camera with dynamic zoom and decaying shake.
 * Presentation-only: authoritative gameplay state remains in WorldState.
 */
import * as THREE from 'three';
import { WorldState } from '../engine/WorldState';
import { criticallyDampedStep } from '../engine/SimulationMath';
import type { CameraMode, ZoomIntensity } from '../store/settingsStore';

export interface CameraSettings {
  mode: CameraMode;
  shakeEnabled: boolean;
  zoomIntensity: ZoomIntensity;
}

export interface CameraShakeEvent {
  type: 'goal' | 'kick' | 'tackle' | 'save';
  intensity: number;
}

const MODE_PRESETS: Record<CameraMode, {
  distBase: number;
  distSpread: number;
  distSpeed: number;
  heightBase: number;
  heightSpread: number;
  ballWeight: number;
  focusBlend: number;
  positionFrequency: number;
  lookFrequency: number;
  shakeScale: number;
}> = {
  broadcast: {
    distBase: 24, distSpread: 0.4, distSpeed: 0.14, heightBase: 17, heightSpread: 0.1,
    ballWeight: 0.35, focusBlend: 0.35, positionFrequency: 4.8, lookFrequency: 4.1, shakeScale: 0.6,
  },
  action: {
    distBase: 17, distSpread: 0.55, distSpeed: 0.18, heightBase: 12, heightSpread: 0.14,
    ballWeight: 0.65, focusBlend: 0.5, positionFrequency: 7.2, lookFrequency: 6.2, shakeScale: 1,
  },
  steady: {
    distBase: 22, distSpread: 0.25, distSpeed: 0.08, heightBase: 15, heightSpread: 0.06,
    ballWeight: 0.4, focusBlend: 0.3, positionFrequency: 3.2, lookFrequency: 2.8, shakeScale: 0.25,
  },
  dynamic: {
    distBase: 20, distSpread: 0.35, distSpeed: 0.12, heightBase: 14, heightSpread: 0.08,
    ballWeight: 0.5, focusBlend: 0.4, positionFrequency: 5.8, lookFrequency: 5, shakeScale: 0.85,
  },
};

const ZOOM_SCALE: Record<ZoomIntensity, number> = { low: 0.75, medium: 1, high: 1.3 };
const MAX_RENDER_DT = 0.1;
const SHAKE_FREQUENCY = 16;

function stepVector(
  value: THREE.Vector3,
  velocity: THREE.Vector3,
  target: THREE.Vector3,
  frequency: number,
  dt: number,
) {
  const x = criticallyDampedStep(value.x, velocity.x, target.x, frequency, dt);
  const y = criticallyDampedStep(value.y, velocity.y, target.y, frequency, dt);
  const z = criticallyDampedStep(value.z, velocity.z, target.z, frequency, dt);
  value.set(x.value, y.value, z.value);
  velocity.set(x.velocity, y.velocity, z.velocity);
}

export class CameraController {
  private posVel = new THREE.Vector3();
  private lookVel = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  private shakeOffset = new THREE.Vector3();
  private shakeVel = new THREE.Vector3();
  private shakeTarget = new THREE.Vector3();
  private targetPos = new THREE.Vector3();
  private targetLook = new THREE.Vector3();
  private shakenLook = new THREE.Vector3();
  private shakeDecay = 0;
  private initialised = false;

  addShake(event: CameraShakeEvent, settings: CameraSettings) {
    if (!settings.shakeEnabled) return;
    const preset = MODE_PRESETS[settings.mode];
    const base = event.intensity * preset.shakeScale;
    const impulse = event.type === 'goal' ? base * 1.4 : base;
    this.shakeVel.x += (Math.random() - 0.5) * impulse * 2;
    this.shakeVel.y += Math.random() * impulse * 0.6;
    this.shakeVel.z += (Math.random() - 0.5) * impulse * 1.2;
    this.shakeDecay = Math.max(this.shakeDecay, 0.35 + impulse * 0.15);
  }

  update(camera: THREE.PerspectiveCamera, state: WorldState, dt: number, settings: CameraSettings) {
    const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, MAX_RENDER_DT) : 0;
    const preset = MODE_PRESETS[settings.mode];
    const zoom = ZOOM_SCALE[settings.zoomIntensity];
    const activePlayer = state.homeTeam[state.activeHomeIndex];

    const ballSpeed = state.ball.vel.mag();
    const spread = Math.hypot(activePlayer.pos.x - state.ball.pos.x, activePlayer.pos.y - state.ball.pos.y);
    const ballWeight = preset.ballWeight + (activePlayer.isCharging ? 0.12 : 0);
    const playerWeight = 1 - ballWeight;
    const focusX = activePlayer.pos.x * playerWeight + state.ball.pos.x * ballWeight;
    const focusZ = -(activePlayer.pos.y * playerWeight + state.ball.pos.y * ballWeight);
    const chargeBoost = activePlayer.isCharging
      ? (activePlayer.chargeStart / 1.2) * (activePlayer.chargeType === 'shoot' ? 0.08 : 0.04)
      : 0;

    const targetDist = THREE.MathUtils.clamp(
      (preset.distBase + spread * preset.distSpread + ballSpeed * preset.distSpeed - chargeBoost * 8) * zoom,
      10 * zoom,
      35 * zoom,
    );
    const targetHeight = THREE.MathUtils.clamp(
      (preset.heightBase + spread * preset.heightSpread + chargeBoost * 3) * zoom,
      10 * zoom,
      22 * zoom,
    );

    this.targetPos.set(focusX * preset.focusBlend, targetHeight, focusZ + targetDist);
    this.targetLook.set(focusX * 0.42, 0, focusZ);

    if (!this.initialised) {
      camera.position.copy(this.targetPos);
      this.currentLook.copy(this.targetLook);
      this.initialised = true;
    }

    stepVector(camera.position, this.posVel, this.targetPos, preset.positionFrequency, safeDt);
    stepVector(this.currentLook, this.lookVel, this.targetLook, preset.lookFrequency, safeDt);

    this.updateShake(safeDt, settings);
    this.shakenLook.copy(this.currentLook).add(this.shakeOffset);
    camera.position.addScaledVector(this.shakeOffset, 0.35);
    camera.lookAt(this.shakenLook);
  }

  private updateShake(dt: number, settings: CameraSettings) {
    if (!settings.shakeEnabled) {
      this.shakeOffset.set(0, 0, 0);
      this.shakeVel.set(0, 0, 0);
      this.shakeDecay = 0;
      return;
    }

    this.shakeDecay = Math.max(0, this.shakeDecay - dt);
    this.shakeTarget.set(0, 0, 0);
    stepVector(this.shakeOffset, this.shakeVel, this.shakeTarget, SHAKE_FREQUENCY, dt);

    if (this.shakeDecay === 0 && this.shakeOffset.lengthSq() < 0.0001 && this.shakeVel.lengthSq() < 0.0001) {
      this.shakeOffset.set(0, 0, 0);
      this.shakeVel.set(0, 0, 0);
    }
  }

  reset() {
    this.initialised = false;
    this.posVel.set(0, 0, 0);
    this.lookVel.set(0, 0, 0);
    this.currentLook.set(0, 0, 0);
    this.shakeOffset.set(0, 0, 0);
    this.shakeVel.set(0, 0, 0);
    this.shakeTarget.set(0, 0, 0);
    this.shakeDecay = 0;
  }
}
