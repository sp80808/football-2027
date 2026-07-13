import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RendererFactory } from '../rendering/RendererFactory';
import { WorldState } from '../engine/WorldState';
import { SimulationWorkerClient } from '../bridge/SimulationWorkerClient';
import { GameEngine } from '../engine/GameEngine';
import { addStadiumToScene } from '../scene/createStadium';
import { SimulationConfig } from '../engine/SimulationConfig';
import { Crowd } from '../scene/createCrowd';
import { BallTrail, GoalCelebration } from '../scene/effects';
import { CameraController } from '../camera/CameraController';
import { useSettingsStore } from '../store/settingsStore';
import { audioManager } from '../audio/AudioManager';

interface RenderingPanelProps {
  useWasm: boolean;
  engine: GameEngine;
  wasmClient: SimulationWorkerClient;
  replayState?: WorldState | null;
  showOffsideLine?: boolean;
}

function createSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(450, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2a6cc4) },
      bottomColor: { value: new THREE.Color(0xbfe3ff) },
      offset: { value: 40 },
      exponent: { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      void main() {
        float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
        float t = pow(max(h, 0.0), exponent);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function createPitchTexture() {
  const scale = 16;
  const width = 68 * scale;
  const height = 105 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create pitch texture');

  const X = (m: number) => (m + 34) * scale;
  const Y = (m: number) => (52.5 - m) * scale;

  // Mowing stripes (alternating bands running the length of the pitch)
  const stripeMetres = 5;
  const stripeCount = Math.round(68 / stripeMetres);
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f7d34' : '#358c39';
    ctx.fillRect(i * stripeMetres * scale, 0, stripeMetres * scale + 1, height);
  }

  // Subtle grass grain
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#1f5e22' : '#48a84c';
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }
  ctx.globalAlpha = 1;

  // White markings
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 0.12 * scale;

  ctx.strokeRect(X(-34), Y(52.5), 68 * scale, 105 * scale);
  ctx.beginPath();
  ctx.moveTo(X(-34), Y(0));
  ctx.lineTo(X(34), Y(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0), Y(0), 9.15 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0), Y(0), 0.3 * scale, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [1, -1] as const) {
    const goalY = 52.5 * side;
    ctx.strokeRect(X(-20.16), Math.min(Y(goalY), Y(goalY - 16.5 * side)), 40.32 * scale, 16.5 * scale);
    ctx.strokeRect(X(-9.16), Math.min(Y(goalY), Y(goalY - 5.5 * side)), 18.32 * scale, 5.5 * scale);
    ctx.beginPath();
    ctx.arc(X(0), Y(goalY - 11 * side), 0.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    const arcR = 9.15 * scale;
    const spotY = Y(goalY - 11 * side);
    ctx.beginPath();
    if (side === 1) ctx.arc(X(0), spotY, arcR, Math.PI * 0.28, Math.PI * 0.72);
    else ctx.arc(X(0), spotY, arcR, Math.PI * 1.28, Math.PI * 1.72);
    ctx.stroke();
  }

  const cr = scale;
  const corners: [number, number][] = [[-34, 52.5], [34, 52.5], [-34, -52.5], [34, -52.5]];
  for (const [cx, cy] of corners) {
    let a0 = 0;
    let a1 = Math.PI / 2;
    if (cx > 0 && cy > 0) { a0 = Math.PI / 2; a1 = Math.PI; }
    else if (cx < 0 && cy < 0) { a0 = Math.PI * 1.5; a1 = Math.PI * 2; }
    else if (cx > 0 && cy < 0) { a0 = Math.PI; a1 = Math.PI * 1.5; }
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), cr, a0, a1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function chargeConeColor(state: WorldState['homeTeam'][0]) {
  if (!state.isCharging) return 0x3399ff;
  if (state.chargeType === 'shoot') {
    if (state.shotModifier === 'finesse') return 0xc084fc;
    if (state.shotModifier === 'chip') return 0xfacc15;
    if (state.shotModifier === 'low_driven') return 0xfb923c;
    if (state.shotModifier === 'power') return 0xef4444;
    return 0xff3333;
  }
  if (state.passModifier === 'through' || state.passModifier === 'lob_through') return 0x22c55e;
  if (state.passModifier === 'lob') return 0x22d3ee;
  if (state.passModifier === 'driven') return 0x93c5fd;
  return 0x3399ff;
}

function drawPentagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function createBallTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f3f3f3';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(40,40,40,0.22)';
  ctx.lineWidth = 2;
  for (let gy = h / 8; gy < h; gy += h / 8) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  for (let gx = w / 8; gx < w; gx += w / 8) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }

  ctx.fillStyle = '#161616';
  const spots: [number, number][] = [
    [0.5, 0.5],
    [0.18, 0.28], [0.82, 0.28],
    [0.3, 0.72], [0.7, 0.72],
    [0.05, 0.5], [0.95, 0.5],
    [0.5, 0.1], [0.5, 0.9],
    [0.12, 0.5], [0.88, 0.5],
  ];
  for (const [u, v] of spots) drawPentagon(ctx, u * w, v * h, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createShadow(radius: number, opacity: number) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.005;
  return mesh;
}

function createNumberTexture(number: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface PlayerModel {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torso: THREE.Mesh;
  chargeCone: THREE.Mesh;
}

function createPlayer(teamColor: number, options?: { number?: number; isKeeper?: boolean }): PlayerModel {
  const group = new THREE.Group();
  const isKeeper = options?.isKeeper ?? false;
  const kitColor = new THREE.Color(teamColor);
  const shortsColor = isKeeper ? new THREE.Color(0x111111) : new THREE.Color(0xf8fafc);
  const sockColor = isKeeper ? new THREE.Color(0x111111) : kitColor;
  const skinColor = new THREE.Color(0xe7b08a);

  const jerseyMat = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.7 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: shortsColor, roughness: 0.85 });
  const sockMat = new THREE.MeshStandardMaterial({ color: sockColor, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });

  // Torso + shirt
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 12), jerseyMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);

  if (options?.number !== undefined) {
    const numTex = createNumberTexture(options.number);
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), numMat);
    back.position.set(0, 1.2, 0.31);
    group.add(back);
  }

  // Hips / shorts
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.42, 12), shortsMat);
  pelvis.position.y = 0.82;
  pelvis.castShadow = true;
  group.add(pelvis);

  const makeLeg = (side: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.13, 0.78, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 8), shortsMat);
    thigh.position.y = -0.26;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 4, 8), skinMat);
    shin.position.y = -0.68;
    shin.castShadow = true;
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8), sockMat);
    sock.position.y = -0.92;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.32), bootMat);
    boot.position.set(0, -1.0, 0.06);
    boot.castShadow = true;
    leg.add(thigh, shin, sock, boot);
    return leg;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  group.add(leftLeg, rightLeg);

  const makeArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.36, 1.42, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 4, 8), jerseyMat);
    upper.position.y = -0.18;
    upper.castShadow = true;
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 8), skinMat);
    forearm.position.y = -0.52;
    forearm.castShadow = true;
    arm.add(upper, forearm);
    return arm;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  group.add(leftArm, rightArm);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.position.y = 1.74;
  group.add(hair);

  const facingMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  facingMarker.position.set(0, 1.0, -0.42);
  group.add(facingMarker);

  const chargeCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x3399ff, transparent: true, opacity: 0.85 }),
  );
  chargeCone.rotation.x = Math.PI / 2;
  chargeCone.position.set(0, 0.5, -0.75);
  chargeCone.visible = false;
  group.add(chargeCone);

  group.add(createShadow(0.5, 0.22));

  return { group, leftLeg, rightLeg, leftArm, rightArm, torso, chargeCone };
}

function createGoal(facingPositiveZ: boolean) {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const netMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const width = 7.32;
  const height = 2.44;
  const radius = 0.06;
  const depth = 1.5;
  const direction = facingPositiveZ ? 1 : -1;

  for (const postX of [-width / 2, width / 2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), postMaterial);
    post.position.set(postX, height / 2, 0);
    post.castShadow = true;
    group.add(post);
  }

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), postMaterial);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, height, 0);
  group.add(crossbar);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), netMaterial);
  back.position.set(0, height / 2, direction * depth);
  group.add(back);

  const top = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), netMaterial);
  top.rotation.x = Math.PI / 2;
  top.position.set(0, height, direction * depth / 2);
  group.add(top);

  return group;
}

function animateRunner(model: PlayerModel, speed: number, time: number) {
  const moving = Math.min(speed / SimulationConfig.PLAYER_SPRINT_SPEED, 1);
  const phase = time * (7 + moving * 11);
  const swing = Math.sin(phase) * (0.25 + moving * 0.7);
  model.leftLeg.rotation.x = swing;
  model.rightLeg.rotation.x = -swing;
  model.leftArm.rotation.x = -swing * 0.8;
  model.rightArm.rotation.x = swing * 0.8;
  model.torso.rotation.x = -moving * 0.16;
  model.group.position.y = Math.abs(Math.sin(phase)) * moving * 0.06;
}

export function RenderingPanel({
  useWasm,
  engine,
  wasmClient,
  replayState = null,
  showOffsideLine = false,
}: RenderingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayStateRef = useRef<WorldState | null>(replayState);
  const showOffsideLineRef = useRef(showOffsideLine);
  const [rendererLabel, setRendererLabel] = useState('Initialising…');
  const [goalFlash, setGoalFlash] = useState<'player' | 'opponent' | null>(null);
  const previousGoal = useRef<'player' | 'opponent' | null>(null);

  useEffect(() => {
    replayStateRef.current = replayState;
  }, [replayState]);

  useEffect(() => {
    showOffsideLineRef.current = showOffsideLine;
  }, [showOffsideLine]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    let renderer: any = null;
    let ballTrail: BallTrail | null = null;
    let requestId = 0;
    let goalTimeout: number | undefined;
    let statsPanel: { dom: HTMLElement; update: () => void } | null = null;
    let crowd: Crowd | null = null;

    const initialise = async () => {
      renderer = await RendererFactory.createRenderer(canvasRef.current!);
      if (cancelled) return;
      setRendererLabel(renderer.constructor?.name ?? 'Renderer');
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio?.(Math.min(window.devicePixelRatio, 2));
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      if ('toneMapping' in renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xbfe3ff);
      scene.fog = new THREE.FogExp2(0xbfe3ff, 0.006);

      const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);
      camera.position.set(0, 16, 22);

      scene.add(createSky());

      scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x3a5a2a, 0.6));
      scene.add(new THREE.AmbientLight(0xfff8e7, 0.22));
      const sun = new THREE.DirectionalLight(0xfff5d6, 1.8);
      sun.position.set(40, 60, 30);
      sun.castShadow = true;
      if (sun.shadow) {
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -70;
        sun.shadow.camera.right = 70;
        sun.shadow.camera.top = 70;
        sun.shadow.camera.bottom = -70;
        sun.shadow.bias = -0.0005;
      }
      scene.add(sun);

      addStadiumToScene(scene);

      crowd = new Crowd();
      scene.add(crowd.mesh);

      const pitch = new THREE.Mesh(
        new THREE.PlaneGeometry(68, 105),
        new THREE.MeshStandardMaterial({ map: createPitchTexture(), roughness: 0.9 }),
      );
      pitch.rotation.x = -Math.PI / 2;
      pitch.receiveShadow = true;
      scene.add(pitch);

      const northGoal = createGoal(false);
      northGoal.position.set(0, 0, -52.5);
      scene.add(northGoal);
      const southGoal = createGoal(true);
      southGoal.position.set(0, 0, 52.5);
      southGoal.rotation.y = Math.PI;
      scene.add(southGoal);

      const homeModels = Array.from({ length: 10 }, (_, i) => createPlayer(0x1a56db, { number: i + 2 }));
      const awayModels = Array.from({ length: 10 }, (_, i) => createPlayer(0xdc2626, { number: i + 2 }));
      const homeKeeperModel = createPlayer(0x84cc16, { number: 1, isKeeper: true });
      const awayKeeperModel = createPlayer(0x84cc16, { number: 1, isKeeper: true });
      
      const homeGroups = homeModels.map(m => m.group);
      const awayGroups = awayModels.map(m => m.group);
      const homeKeeperGroup = homeKeeperModel.group;
      const awayKeeperGroup = awayKeeperModel.group;
      
      scene.add(...homeGroups, ...awayGroups, homeKeeperGroup, awayKeeperGroup);

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 32, 32),
        new THREE.MeshStandardMaterial({ map: createBallTexture(), roughness: 0.4 }),
      );
      ball.castShadow = true;
      scene.add(ball);
      const ballShadow = createShadow(0.2, 0.35);
      scene.add(ballShadow);

      const aimGroup = new THREE.Group();
      const aimLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 1),
        new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      aimLine.position.z = -0.5;
      const aimRing = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.5, 24),
        new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 0.85, depthWrite: false }),
      );
      aimRing.rotation.x = -Math.PI / 2;
      aimRing.position.y = 0.02;
      aimRing.position.z = -1;
      aimGroup.add(aimLine, aimRing);
      aimGroup.visible = false;
      scene.add(aimGroup);

      ballTrail = new BallTrail(scene);
      const goalCelebration = new GoalCelebration(scene);
      const cameraController = new CameraController();
      let lastBallSpeed = 0;
      let lastFrameTime = performance.now();
      let elapsed = 0;

      if (process.env.NODE_ENV === 'development') {
        import('stats.js').then(({ default: Stats }) => {
          if (cancelled) return;
          const stats = new Stats();
          stats.showPanel(0);
          stats.dom.style.position = 'absolute';
          stats.dom.style.top = '8px';
          stats.dom.style.left = '50%';
          stats.dom.style.transform = 'translateX(-50%)';
          stats.dom.style.zIndex = '30';
          canvasRef.current?.parentElement?.appendChild(stats.dom);
          statsPanel = stats;
        });
      }

      const offsideLine = new THREE.Mesh(
        new THREE.PlaneGeometry(68, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, depthTest: false }),
      );
      offsideLine.rotation.x = -Math.PI / 2;
      offsideLine.position.y = 0.012;
      offsideLine.visible = false;
      scene.add(offsideLine);

      const renderLoop = () => {
        requestId = requestAnimationFrame(renderLoop);
        const now = performance.now();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
        lastFrameTime = now;

        const state = replayStateRef.current ?? (useWasm ? wasmClient.getRenderState() : engine.getRenderState());

        elapsed += dt;

        const activePlayer = state.homeTeam[state.activeHomeIndex];

        for (let i = 0; i < 10; i++) {
          const hState = state.homeTeam[i];
          const hModel = homeModels[i];
          hModel.group.position.set(hState.pos.x, 0, -hState.pos.y);
          hModel.group.rotation.y = Math.atan2(hState.facing.x, hState.facing.y);
          animateRunner(hModel, hState.vel.mag(), elapsed + i * 0.1);
          
          hModel.chargeCone.visible = false;

          const aState = state.awayTeam[i];
          const aModel = awayModels[i];
          aModel.group.position.set(aState.pos.x, 0, -aState.pos.y);
          aModel.group.rotation.y = Math.atan2(aState.facing.x, aState.facing.y);
          animateRunner(aModel, aState.vel.mag(), elapsed + i * 0.1 + 0.5);
        }

        const activeCone = homeModels[state.activeHomeIndex].chargeCone;
        activeCone.visible = activePlayer.isCharging;
        if (activePlayer.isCharging) {
          const material = activeCone.material as THREE.MeshStandardMaterial;
          material.color.setHex(chargeConeColor(activePlayer));
          const scale = 0.6 + activePlayer.chargeStart * 1.2;
          activeCone.scale.setScalar(scale);
        }

        homeKeeperGroup.position.set(state.homeKeeper.pos.x, 0, -state.homeKeeper.pos.y);
        homeKeeperGroup.rotation.y = Math.atan2(state.homeKeeper.facing.x, state.homeKeeper.facing.y);
        homeKeeperModel.torso.rotation.z += ((state.homeKeeper.aiState === 'diving' ? Math.PI / 3 : 0) - homeKeeperModel.torso.rotation.z) * 0.2;

        awayKeeperGroup.position.set(state.awayKeeper.pos.x, 0, -state.awayKeeper.pos.y);
        awayKeeperGroup.rotation.y = Math.atan2(state.awayKeeper.facing.x, state.awayKeeper.facing.y);
        awayKeeperModel.torso.rotation.z += ((state.awayKeeper.aiState === 'diving' ? Math.PI / 3 : 0) - awayKeeperModel.torso.rotation.z) * 0.2;

        crowd.update(elapsed);

        if (activePlayer.isCharging) {
          aimGroup.visible = true;
          aimGroup.position.set(activePlayer.pos.x, 0, -activePlayer.pos.y);
          aimGroup.rotation.y = Math.atan2(activePlayer.facing.x, activePlayer.facing.y);
          const reach = 2 + (activePlayer.chargeStart / SimulationConfig.MAX_CHARGE_TIME) * 22;
          aimLine.scale.z = reach;
          aimRing.position.z = -reach;
          const col = chargeConeColor(activePlayer);
          (aimLine.material as THREE.MeshBasicMaterial).color.setHex(col);
          (aimRing.material as THREE.MeshBasicMaterial).color.setHex(col);
        } else {
          aimGroup.visible = false;
        }

        ball.position.set(state.ball.pos.x, state.ball.pos.z + 0.11, -state.ball.pos.y);
        ball.rotation.x -= state.ball.vel.y / 0.11 / 120;
        ball.rotation.z += state.ball.vel.x / 0.11 / 120;
        const shadowScale = Math.max(0.3, 1 - Math.max(0, state.ball.pos.z) * 0.12);
        ballShadow.position.set(state.ball.pos.x, 0.005, -state.ball.pos.y);
        ballShadow.scale.setScalar(shadowScale);
        (ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.35 * shadowScale;

        const ballSpeedTrail = state.ball.vel.mag();
        ballTrail!.update(ball.position, ballSpeedTrail);

        if (state.lastGoalScorer && state.lastGoalScorer !== previousGoal.current) {
          previousGoal.current = state.lastGoalScorer;
          setGoalFlash(state.lastGoalScorer);
          goalCelebration.trigger(ball.position.clone());
          const settings = useSettingsStore.getState();
          cameraController.addShake({ type: 'goal', intensity: 1 }, {
            mode: settings.cameraMode,
            shakeEnabled: settings.cameraShake,
            zoomIntensity: settings.zoomIntensity,
          });
          if (goalTimeout) window.clearTimeout(goalTimeout);
          goalTimeout = window.setTimeout(() => {
            previousGoal.current = null;
            setGoalFlash(null);
          }, 2500);
        }

        const ballSpeed = state.ball.vel.mag();
        if (ballSpeed - lastBallSpeed > 8) {
          const settings = useSettingsStore.getState();
          cameraController.addShake({ type: 'kick', intensity: Math.min(1, (ballSpeed - lastBallSpeed) / 16) }, {
            mode: settings.cameraMode,
            shakeEnabled: settings.cameraShake,
            zoomIntensity: settings.zoomIntensity,
          });
        }
        lastBallSpeed = ballSpeed;

        goalCelebration.update(dt);

        offsideLine.visible = showOffsideLineRef.current && state.offsideLineY !== null;
        if (offsideLine.visible && state.offsideLineY !== null) {
          offsideLine.position.z = -state.offsideLineY;
        }

        const settings = useSettingsStore.getState();
        cameraController.update(camera, state, dt, {
          mode: settings.cameraMode,
          shakeEnabled: settings.cameraShake,
          zoomIntensity: settings.zoomIntensity,
        });

        const lookX = state.homeTeam[state.activeHomeIndex].pos.x * 0.42;
        const lookZ = -(state.homeTeam[state.activeHomeIndex].pos.y * 0.58 + state.ball.pos.y * 0.42);
        audioManager.updateListener(
          camera.position.x,
          camera.position.y,
          camera.position.z,
          lookX,
          0,
          lookZ,
        );

        statsPanel?.update();
        renderer.render(scene, camera);
      };

      renderLoop();
    };

    initialise();

    const resize = () => {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(requestId);
      if (goalTimeout) window.clearTimeout(goalTimeout);
      statsPanel?.dom.remove();
      window.removeEventListener('resize', resize);
      ballTrail?.dispose();
      crowd?.dispose();
      renderer?.dispose?.();
    };
  }, [useWasm, engine, wasmClient]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Football simulation viewport" />
      <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-black/35 px-2 py-1 text-[10px] text-white/50">
        {rendererLabel}
      </div>
      {goalFlash && (
        <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${goalFlash === 'player' ? 'bg-[radial-gradient(ellipse_at_center,rgba(30,120,255,0.18),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(220,50,50,0.18),transparent_70%)]'}`}>
          <p className={`m-0 text-6xl font-black tracking-wider drop-shadow-2xl ${goalFlash === 'player' ? 'text-blue-400' : 'text-red-400'}`}>GOAL</p>
          <p className="mt-2 font-semibold text-white/70">{goalFlash === 'player' ? 'You scored!' : 'Opponent scored'}</p>
        </div>
      )}
    </div>
  );
}
