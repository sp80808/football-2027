import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RendererFactory } from '../rendering/RendererFactory';
import { WorldState } from '../engine/WorldState';
import { SimulationWorkerClient } from '../bridge/SimulationWorkerClient';
import { GameEngine } from '../engine/GameEngine';

interface RenderingPanelProps {
  useWasm: boolean;
  engine: GameEngine;
  wasmClient: SimulationWorkerClient;
  replayState?: WorldState | null;
  showOffsideLine?: boolean;
}

function createPitchTexture() {
  const width = 1024;
  const height = 1536;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create pitch texture');

  const scaleX = width / 68;
  const scaleY = height / 105;
  const x = (metres: number) => (metres + 34) * scaleX;
  const y = (metres: number) => (52.5 - metres) * scaleY;

  for (let stripe = 0; stripe < 21; stripe++) {
    context.fillStyle = stripe % 2 === 0 ? '#2d6a2d' : '#338a33';
    context.fillRect(0, stripe * height / 21, width, height / 21 + 1);
  }

  context.strokeStyle = '#f0f0f0';
  context.fillStyle = '#f0f0f0';
  context.lineWidth = 3;
  context.strokeRect(x(-34), y(52.5), width, y(-52.5) - y(52.5));
  context.beginPath();
  context.moveTo(x(-34), y(0));
  context.lineTo(x(34), y(0));
  context.stroke();
  context.beginPath();
  context.arc(x(0), y(0), 9.15 * scaleX, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(x(0), y(0), 0.25 * scaleX, 0, Math.PI * 2);
  context.fill();

  for (const side of [1, -1]) {
    const goalLine = 52.5 * side;
    const penaltyTop = goalLine - 16.5 * side;
    const goalAreaTop = goalLine - 5.5 * side;
    const penaltyY = Math.min(y(goalLine), y(penaltyTop));
    const goalAreaY = Math.min(y(goalLine), y(goalAreaTop));
    context.strokeRect(x(-20.16), penaltyY, 40.32 * scaleX, 16.5 * scaleY);
    context.strokeRect(x(-9.16), goalAreaY, 18.32 * scaleX, 5.5 * scaleY);
    context.beginPath();
    context.arc(x(0), y(goalLine - 11 * side), 0.25 * scaleX, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

function createPlayer(bodyColor: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.85, 6, 12),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.65 }),
  );
  body.position.y = 0.92;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.8 }),
  );
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);

  const facingMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  facingMarker.position.set(0, 0.9, -0.45);
  group.add(facingMarker);

  const chargeCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3399ff, transparent: true, opacity: 0.85 }),
  );
  chargeCone.rotation.x = Math.PI / 2;
  chargeCone.position.set(0, 0.55, -0.75);
  chargeCone.visible = false;
  group.add(chargeCone);
  group.add(createShadow(0.45, 0.25));

  return { group, body, chargeCone };
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
    let requestId = 0;
    let goalTimeout: number | undefined;

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

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

      const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
      camera.position.set(0, 16, 22);

      scene.add(new THREE.AmbientLight(0xfff8e7, 0.55));
      const sun = new THREE.DirectionalLight(0xfff5d6, 1.4);
      sun.position.set(40, 60, 30);
      sun.castShadow = true;
      if (sun.shadow) sun.shadow.mapSize.set(2048, 2048);
      scene.add(sun);

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

      const { group: playerGroup, chargeCone } = createPlayer(0x1a56db);
      const { group: keeperGroup, body: keeperBody } = createPlayer(0x84cc16);
      const { group: opponentGroup } = createPlayer(0xdc2626);
      scene.add(playerGroup, keeperGroup, opponentGroup);

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
      );
      ball.castShadow = true;
      scene.add(ball);
      const ballShadow = createShadow(0.2, 0.35);
      scene.add(ballShadow);

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
        const state = replayStateRef.current ?? (useWasm ? wasmClient.getRenderState() : engine.getRenderState());

        if (state.lastGoalScorer && state.lastGoalScorer !== previousGoal.current) {
          previousGoal.current = state.lastGoalScorer;
          setGoalFlash(state.lastGoalScorer);
          if (goalTimeout) window.clearTimeout(goalTimeout);
          goalTimeout = window.setTimeout(() => {
            previousGoal.current = null;
            setGoalFlash(null);
          }, 2500);
        }

        playerGroup.position.set(state.player.pos.x, 0, -state.player.pos.y);
        playerGroup.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        chargeCone.visible = state.player.isCharging;
        if (state.player.isCharging) {
          const material = chargeCone.material as THREE.MeshStandardMaterial;
          material.color.setHex(state.player.chargeType === 'shoot' ? 0xff3333 : 0x3399ff);
          const scale = 0.6 + state.player.chargeStart * 1.2;
          chargeCone.scale.setScalar(scale);
        }

        opponentGroup.position.set(state.opponent.pos.x, 0, -state.opponent.pos.y);
        opponentGroup.rotation.y = Math.atan2(state.opponent.facing.x, state.opponent.facing.y);

        keeperGroup.position.set(state.keeper.pos.x, 0, -state.keeper.pos.y);
        keeperGroup.rotation.y = Math.atan2(state.keeper.facing.x, state.keeper.facing.y);
        const targetTilt = state.keeper.aiState === 'diving' ? Math.PI / 3 : 0;
        keeperBody.rotation.z += (targetTilt - keeperBody.rotation.z) * 0.2;

        ball.position.set(state.ball.pos.x, state.ball.pos.z + 0.11, -state.ball.pos.y);
        ball.rotation.x -= state.ball.vel.y / 0.11 / 120;
        ball.rotation.z += state.ball.vel.x / 0.11 / 120;
        const shadowScale = Math.max(0.3, 1 - Math.max(0, state.ball.pos.z) * 0.12);
        ballShadow.position.set(state.ball.pos.x, 0.005, -state.ball.pos.y);
        ballShadow.scale.setScalar(shadowScale);
        (ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.35 * shadowScale;

        offsideLine.visible = showOffsideLineRef.current;
        if (offsideLine.visible) offsideLine.position.z = -state.opponent.pos.y;

        const focusX = (state.player.pos.x + state.ball.pos.x) * 0.5;
        const focusZ = -(state.player.pos.y + state.ball.pos.y) * 0.5;
        camera.position.x += (focusX * 0.35 - camera.position.x) * 0.05;
        camera.position.z += (focusZ + 22 - camera.position.z) * 0.05;
        camera.position.y += (16 - camera.position.y) * 0.05;
        camera.lookAt(focusX * 0.4, 0, focusZ);
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
      window.removeEventListener('resize', resize);
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
