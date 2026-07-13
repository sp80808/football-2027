import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

export function createPitchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#348C31';
  ctx.fillRect(0, 0, 1024, 2048);

  ctx.fillStyle = '#2D7A2A';
  const numStripes = 18;
  const stripeHeight = 2048 / numStripes;
  for (let i = 0; i < numStripes; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight);
    }
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 6;

  const sfX = 1024 / SimulationConfig.PITCH_WIDTH;
  const sfY = 2048 / SimulationConfig.PITCH_LENGTH;

  ctx.strokeRect(16, 16, 1024 - 32, 2048 - 32);

  ctx.beginPath();
  ctx.moveTo(16, 1024);
  ctx.lineTo(1024 - 16, 1024);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 1024, 9.15 * sfX, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 1024, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();

  const penAreaWidth = 40.3 * sfX;
  const penAreaHeight = 16.5 * sfY;
  const penAreaX = (1024 - penAreaWidth) / 2;
  ctx.strokeRect(penAreaX, 16, penAreaWidth, penAreaHeight);
  ctx.strokeRect(penAreaX, 2048 - 16 - penAreaHeight, penAreaWidth, penAreaHeight);

  const goalAreaWidth = 18.3 * sfX;
  const goalAreaHeight = 5.5 * sfY;
  const goalAreaX = (1024 - goalAreaWidth) / 2;
  ctx.strokeRect(goalAreaX, 16, goalAreaWidth, goalAreaHeight);
  ctx.strokeRect(goalAreaX, 2048 - 16 - goalAreaHeight, goalAreaWidth, goalAreaHeight);

  const penSpotY = 11 * sfY;
  ctx.beginPath();
  ctx.arc(512, 16 + penSpotY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(512, 2048 - 16 - penSpotY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(512, 16 + penSpotY, 9.15 * sfY, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(512, 2048 - 16 - penSpotY, 9.15 * sfY, 1.2 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPitchMesh(): THREE.Mesh {
  const outerPitchGeo = new THREE.PlaneGeometry(300, 300);
  const outerPitchMat = new THREE.MeshStandardMaterial({ color: '#2b7527', roughness: 0.9 });
  const outerPitch = new THREE.Mesh(outerPitchGeo, outerPitchMat);
  outerPitch.rotation.x = -Math.PI / 2;
  outerPitch.position.y = -0.01;
  outerPitch.receiveShadow = true;
  outerPitch.name = 'outerPitch';

  const pitchGeo = new THREE.PlaneGeometry(
    SimulationConfig.PITCH_WIDTH,
    SimulationConfig.PITCH_LENGTH
  );
  const pitchMat = new THREE.MeshStandardMaterial({
    map: createPitchTexture(),
    roughness: 0.8,
  });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  pitch.name = 'pitch';

  const group = new THREE.Group();
  group.add(outerPitch);
  group.add(pitch);
  return group as unknown as THREE.Mesh;
}

export function addPitchToScene(scene: THREE.Scene) {
  const outerPitchGeo = new THREE.PlaneGeometry(300, 300);
  const outerPitchMat = new THREE.MeshStandardMaterial({ color: '#2b7527', roughness: 0.9 });
  const outerPitch = new THREE.Mesh(outerPitchGeo, outerPitchMat);
  outerPitch.rotation.x = -Math.PI / 2;
  outerPitch.position.y = -0.01;
  outerPitch.receiveShadow = true;
  scene.add(outerPitch);

  const pitchGeo = new THREE.PlaneGeometry(
    SimulationConfig.PITCH_WIDTH,
    SimulationConfig.PITCH_LENGTH
  );
  const pitchMat = new THREE.MeshStandardMaterial({
    map: createPitchTexture(),
    roughness: 0.8,
  });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);
}
