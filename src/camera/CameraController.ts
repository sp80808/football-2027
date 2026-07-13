/**
 * Spring-damped broadcast camera with dynamic zoom, steady-cam lag, and decaying shake.
 *
 * FC 26 camera analogue: tele/broadcast wide framing, action-close follow, manual pan deferred.
 * Modes map to FIFA-style presets within our fixed follow rig.
 */
import * as THREE from 'three';
import { WorldState } from '../engine/WorldState';
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
  springStiffness: number;
  springDamping: number;
  shakeScale: number;
}> = {
  broadcast: {
    distBase: 24, distSpread: 0.4, distSpeed: 0.14, heightBase: 17, heightSpread: 0.1,
    ballWeight: 0.35, focusBlend: 0.35, springStiffness: 4.5, springDamping: 0.82, shakeScale: 0.6,
  },
  action: {
    distBase: 17, distSpread: 0.55, distSpeed: 0.18, heightBase: 12, heightSpread: 0.14,
    ballWeight: 0.65, focusBlend: 0.5, springStiffness: 7, springDamping: 0.75, shakeScale: 1,
  },
  steady: {
    distBase: 22, distSpread: 0.25, distSpeed: 0.08, heightBase: 15, heightSpread: 0.06,
    ballWeight: 0.4, focusBlend: 0.3, springStiffness: 3, springDamping: 0.9, shakeScale: 0.25,
  },
  dynamic: {
    distBase: 20, distSpread: 0.35, distSpeed: 0.12, heightBase: 14, heightSpread: 0.08,
    ballWeight: 0.5, focusBlend: 0.4, springStiffness: 5.5, springDamping: 0.8, shakeScale: 0.85,
  },
};

const ZOOM_SCALE: Record<ZoomIntensity, number> = { low: 0.75, medium: 1, high: 1.3 };

export class CameraController {
  private posVel = new THREE.Vector3();
  private lookVel = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  private shakeOffset = new THREE.Vector3();
  private shakeVel = new THREE.Vector3();
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

  update(
    camera: THREE.PerspectiveCamera,
    state: WorldState,
    dt: number,
    settings: CameraSettings,
  ) {
    const preset = MODE_PRESETS[settings.mode];
    const zoom = ZOOM_SCALE[settings.zoomIntensity];

    const ballSpeed = state.ball.vel.mag();
    const spread = Math.hypot(
      state.player.pos.x - state.ball.pos.x,
      state.player.pos.y - state.ball.pos.y,
    );

    const ballWeight = preset.ballWeight + (state.player.isCharging ? 0.12 : 0);
    const playerWeight = 1 - ballWeight;

    const focusX = state.player.pos.x * playerWeight + state.ball.pos.x * ballWeight;
    const focusZ = -(state.player.pos.y * playerWeight + state.ball.pos.y * ballWeight);

    const chargeBoost = state.player.isCharging
      ? (state.player.chargeStart / 1.2) * (state.player.chargeType === 'shoot' ? 0.08 : 0.04)
      : 0;

    const targetDist = THREE.MathUtils.clamp(
      (preset.distBase + spread * preset.distSpread + ballSpeed * preset.distSpeed - chargeBoost * 8) * zoom,
      14 * zoom,
      34 * zoom,
    );
    const targetHeight = THREE.MathUtils.clamp(
      (preset.heightBase + spread * preset.heightSpread + chargeBoost * 3) * zoom,
      10 * zoom,
      22 * zoom,
    );

    const targetPos = new THREE.Vector3(
      focusX * preset.focusBlend,
      targetHeight,
      focusZ + targetDist,
    );
    const targetLook = new THREE.Vector3(focusX * 0.42, 0, focusZ);

    if (!this.initialised) {
      camera.position.copy(targetPos);
      this.currentLook.copy(targetLook);
      this.initialised = true;
    }

    const stiffness = preset.springStiffness;
    const damping = preset.springDamping;
    const posAccel = targetPos.clone().sub(camera.position).multiplyScalar(stiffness);
    this.posVel.add(posAccel.multiplyScalar(dt));
    this.posVel.multiplyScalar(Math.pow(damping, dt * 60));
    camera.position.add(this.posVel.clone().multiplyScalar(dt));

    const lookAccel = targetLook.clone().sub(this.currentLook).multiplyScalar(stiffness * 0.85);
    this.lookVel.add(lookAccel.multiplyScalar(dt));
    this.lookVel.multiplyScalar(Math.pow(damping, dt * 60));
    this.currentLook.add(this.lookVel.clone().multiplyScalar(dt));

    this.updateShake(dt, settings);
    const shakenLook = this.currentLook.clone().add(this.shakeOffset);
    camera.position.add(this.shakeOffset.clone().multiplyScalar(0.35));
    camera.lookAt(shakenLook);
  }

  private updateShake(dt: number, settings: CameraSettings) {
    if (!settings.shakeEnabled || this.shakeDecay <= 0) {
      this.shakeOffset.set(0, 0, 0);
      this.shakeVel.set(0, 0, 0);
      return;
    }
    this.shakeDecay -= dt;
    const spring = 28;
    const damp = 0.72;
    const restore = this.shakeOffset.clone().multiplyScalar(-spring);
    this.shakeVel.add(restore.multiplyScalar(dt));
    this.shakeVel.multiplyScalar(Math.pow(damp, dt * 60));
    this.shakeOffset.add(this.shakeVel.clone().multiplyScalar(dt));
    if (this.shakeDecay <= 0) {
      this.shakeOffset.multiplyScalar(0.9);
      if (this.shakeOffset.lengthSq() < 0.0001) this.shakeOffset.set(0, 0, 0);
    }
  }

  reset() {
    this.initialised = false;
    this.posVel.set(0, 0, 0);
    this.lookVel.set(0, 0, 0);
    this.shakeOffset.set(0, 0, 0);
    this.shakeVel.set(0, 0, 0);
    this.shakeDecay = 0;
  }
}
