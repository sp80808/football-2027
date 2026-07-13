import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

/** Procedural low-poly stadium — Kenney-style tiered stands + floodlights */
export function addStadiumToScene(scene: THREE.Scene) {
  const standMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.85,
    metalness: 0.05,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.9,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.4,
    metalness: 0.3,
  });

  const hw = SimulationConfig.PITCH_HALF_WIDTH;
  const hl = SimulationConfig.PITCH_HALF_LENGTH;

  const addStand = (x: number, z: number, rotY: number, width: number, depth: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    for (let tier = 0; tier < 4; tier++) {
      const tierHeight = 1.2 + tier * 1.0;
      const tierDepth = depth + tier * 2.5;
      const geo = new THREE.BoxGeometry(width, tierHeight, tierDepth);
      const mesh = new THREE.Mesh(geo, standMat);
      mesh.position.set(0, tierHeight / 2, -tierDepth / 2 - tier * 1.5);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Seat rows (crowd color blocks)
      const rowGeo = new THREE.BoxGeometry(width * 0.95, 0.15, 0.4);
      for (let row = 0; row < 6; row++) {
        const rowMesh = new THREE.Mesh(rowGeo, seatMat);
        rowMesh.position.set(0, 0.5 + tier * 1.0 + row * 0.18, -tierDepth + row * 0.35);
        group.add(rowMesh);
      }
    }

    const railGeo = new THREE.BoxGeometry(width, 0.08, 0.08);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 5.5, -depth - 8);
    group.add(rail);

    scene.add(group);
  };

  // Long sides
  addStand(0, -(hl + 14), 0, hw * 2 + 20, 6);
  addStand(0, hl + 14, Math.PI, hw * 2 + 20, 6);
  // Short sides
  addStand(-(hw + 14), 0, Math.PI / 2, hl * 2 + 20, 6);
  addStand(hw + 14, 0, -Math.PI / 2, hl * 2 + 20, 6);

  // Floodlight towers (4 corners)
  const towerPositions: [number, number][] = [
    [-hw - 8, -hl - 8],
    [hw + 8, -hl - 8],
    [-hw - 8, hl + 8],
    [hw + 8, hl + 8],
  ];

  for (const [tx, tz] of towerPositions) {
    const tower = new THREE.Group();
    tower.position.set(tx, 0, tz);

    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 18, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 9;
    pole.castShadow = true;
    tower.add(pole);

    const headGeo = new THREE.BoxGeometry(2.5, 0.3, 1.2);
    const headMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#fef08a',
      emissiveIntensity: 0.4,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 18;
    head.lookAt(0, 0, 0);
    tower.add(head);

    const spot = new THREE.SpotLight(0xfff5e6, 80, 120, Math.PI / 6, 0.5, 1);
    spot.position.set(0, 18, 0);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = false;
    tower.add(spot);
    tower.add(spot.target);

    scene.add(tower);
  }

  // Perimeter track
  const trackGeo = new THREE.RingGeometry(
    Math.max(hw, hl) + 4,
    Math.max(hw, hl) + 7,
    64
  );
  const trackMat = new THREE.MeshStandardMaterial({
    color: '#b45309',
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.rotation.x = -Math.PI / 2;
  track.position.y = -0.005;
  track.receiveShadow = true;
  scene.add(track);
}

/** Abstract crowd dots along stands — cheap atmosphere */
export function createCrowdParticles(count = 400): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const hw = SimulationConfig.PITCH_HALF_WIDTH;
  const hl = SimulationConfig.PITCH_HALF_LENGTH;

  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let z = 0;
    const y = 2 + Math.random() * 4;

    if (side === 0) {
      x = (Math.random() - 0.5) * (hw * 2 + 16);
      z = -(hl + 10 + Math.random() * 4);
    } else if (side === 1) {
      x = (Math.random() - 0.5) * (hw * 2 + 16);
      z = hl + 10 + Math.random() * 4;
    } else if (side === 2) {
      x = -(hw + 10 + Math.random() * 4);
      z = (Math.random() - 0.5) * (hl * 2 + 16);
    } else {
      x = hw + 10 + Math.random() * 4;
      z = (Math.random() - 0.5) * (hl * 2 + 16);
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.6, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}
