import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

export function createPlayerModel(teamColor: string, isKeeper = false): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.7, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const shortsGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.4, 16);
  const shortsMat = new THREE.MeshStandardMaterial({
    color: isKeeper ? '#111111' : '#ffffff',
    roughness: 0.8,
  });
  const shorts = new THREE.Mesh(shortsGeo, shortsMat);
  shorts.position.y = 0.45;
  shorts.castShadow = true;
  group.add(shorts);

  const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const skinMat = new THREE.MeshStandardMaterial({ color: '#f1c27d', roughness: 0.4 });
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  const hairGeo = new THREE.BoxGeometry(0.38, 0.1, 0.38);
  const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1a10' });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 1.68, -0.05);
  group.add(hair);

  const noseGeo = new THREE.BoxGeometry(0.06, 0.08, 0.08);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, 1.55, -0.2);
  group.add(nose);

  return group;
}

/** Classic truncated-icosahedron style ball — procedural, no glTF */
export function createBallMesh(): THREE.Mesh {
  const radius = SimulationConfig.BALL_RADIUS;
  const ballGeo = new THREE.IcosahedronGeometry(radius, 2);
  const ballMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.25,
    metalness: 0.05,
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);

  const patchMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5 });
  const patchCount = 12;
  for (let i = 0; i < patchCount; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / patchCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const patchGeo = new THREE.CircleGeometry(radius * 0.22, 6);
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(
      radius * 1.01 * Math.sin(phi) * Math.cos(theta),
      radius * 1.01 * Math.cos(phi),
      radius * 1.01 * Math.sin(phi) * Math.sin(theta)
    );
    patch.lookAt(0, 0, 0);
    ballMesh.add(patch);
  }

  ballMesh.castShadow = true;
  return ballMesh;
}
