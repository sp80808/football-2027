import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

function createNetTexture(): THREE.CanvasTexture {
  const netCanvas = document.createElement('canvas');
  netCanvas.width = 128;
  netCanvas.height = 128;
  const netCtx = netCanvas.getContext('2d')!;
  netCtx.fillStyle = 'rgba(255,255,255,0)';
  netCtx.fillRect(0, 0, 128, 128);
  netCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  netCtx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    netCtx.beginPath();
    netCtx.moveTo(i, 0);
    netCtx.lineTo(i, 128);
    netCtx.stroke();
    netCtx.beginPath();
    netCtx.moveTo(0, i);
    netCtx.lineTo(128, i);
    netCtx.stroke();
  }
  const netTex = new THREE.CanvasTexture(netCanvas);
  netTex.wrapS = THREE.RepeatWrapping;
  netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(4, 2);
  return netTex;
}

export function createGoal(): THREE.Group {
  const goalGroup = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.44, 16);
  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.1,
  });

  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-SimulationConfig.GOAL_HALF_WIDTH, 1.22, 0);
  leftPost.castShadow = true;
  goalGroup.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(SimulationConfig.GOAL_HALF_WIDTH, 1.22, 0);
  rightPost.castShadow = true;
  goalGroup.add(rightPost);

  const crossbarGeo = new THREE.CylinderGeometry(0.06, 0.06, SimulationConfig.GOAL_WIDTH + 0.12, 16);
  const crossbar = new THREE.Mesh(crossbarGeo, postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 2.44, 0);
  crossbar.castShadow = true;
  goalGroup.add(crossbar);

  const netGeo = new THREE.PlaneGeometry(SimulationConfig.GOAL_WIDTH, 2.5);
  const netMat = new THREE.MeshStandardMaterial({
    map: createNetTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const backNet = new THREE.Mesh(netGeo, netMat);
  backNet.position.set(0, 1.25, -1.5);
  backNet.rotation.x = Math.PI / 16;
  goalGroup.add(backNet);

  const sideNetGeo = new THREE.PlaneGeometry(1.5, 2.5);
  const leftSideNet = new THREE.Mesh(sideNetGeo, netMat);
  leftSideNet.position.set(-SimulationConfig.GOAL_HALF_WIDTH, 1.25, -0.75);
  leftSideNet.rotation.y = Math.PI / 2;
  goalGroup.add(leftSideNet);

  const rightSideNet = new THREE.Mesh(sideNetGeo, netMat);
  rightSideNet.position.set(SimulationConfig.GOAL_HALF_WIDTH, 1.25, -0.75);
  rightSideNet.rotation.y = Math.PI / 2;
  goalGroup.add(rightSideNet);

  return goalGroup;
}

export function addGoalsToScene(scene: THREE.Scene) {
  const hl = SimulationConfig.PITCH_HALF_LENGTH;

  const topGoal = createGoal();
  topGoal.position.set(0, 0, -hl);
  scene.add(topGoal);

  const bottomGoal = createGoal();
  bottomGoal.position.set(0, 0, hl);
  bottomGoal.rotation.y = Math.PI;
  scene.add(bottomGoal);
}
