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
}

// ─── Colours ────────────────────────────────────────────────────────────────
// Home player: royal blue kit with white trim
const PLAYER_BODY_COLOR   = 0x1a56db; // blue jersey
const PLAYER_SHORTS_COLOR = 0xffffff; // white shorts
const PLAYER_HEAD_COLOR   = 0xf5cba7; // skin tone
// Goalkeeper: high-visibility yellow-green (distinct from outfield)
const KEEPER_BODY_COLOR   = 0x84cc16; // lime-green GK jersey
const KEEPER_HEAD_COLOR   = 0xf5cba7;
// Ball: classic black & white panel look
const BALL_PANEL_LIGHT    = 0xffffff;
const BALL_PANEL_DARK     = 0x1a1a1a;
// Pitch
const PITCH_STRIPE_A      = 0x2d6a2d; // darker stripe
const PITCH_STRIPE_B      = 0x338a33; // lighter stripe
const LINE_COLOR          = 0xf0f0f0;
// Goal posts
const POST_COLOR          = 0xffffff;
const NET_COLOR           = 0xcccccc;

// ─── Pitch texture ───────────────────────────────────────────────────────────
// Coordinates: the PlaneGeometry is 68 wide × 105 long.
// Canvas maps [0,68] → [0,W], [0,105] → [0,H].
function createPitchTexture(): THREE.CanvasTexture {
  const W = 1024, H = 1536; // 2:3 ratio matching 68×105
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const scaleX = W / 68;
  const scaleY = H / 105;

  // Helper: pitch coords → canvas coords (Y is flipped)
  const cx = (x: number) => (x + 34) * scaleX;
  const cy = (y: number) => (52.5 - y) * scaleY;

  // Mow stripes (5 m bands)
  const stripeCount = 21;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0
      ? `#${PITCH_STRIPE_A.toString(16).padStart(6, '0')}`
      : `#${PITCH_STRIPE_B.toString(16).padStart(6, '0')}`;
    const y0 = (i / stripeCount) * H;
    const y1 = ((i + 1) / stripeCount) * H;
    ctx.fillRect(0, y0, W, y1 - y0);
  }

  ctx.strokeStyle = `#${LINE_COLOR.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 3;

  // Touchlines
  ctx.strokeRect(cx(-34), cy(52.5), W, cy(-52.5) - cy(52.5));

  // Halfway line
  ctx.beginPath(); ctx.moveTo(cx(-34), cy(0)); ctx.lineTo(cx(34), cy(0)); ctx.stroke();

  // Centre circle r=9.15
  ctx.beginPath(); ctx.arc(cx(0), cy(0), 9.15 * scaleX, 0, Math.PI * 2); ctx.stroke();

  // Centre spot
  ctx.beginPath(); ctx.arc(cx(0), cy(0), 0.3 * scaleX, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle; ctx.fill();

  // ── Penalty areas (both ends) ─────────────────────────────────────────
  // FIFA: 16.5 m from each post, so total width = 7.32 + 2×16.5 = 40.32 m → ±20.16
  // Depth: 16.5 m from goal line
  for (const side of [1, -1]) {
    const glY = 52.5 * side;                 // goal line Y
    const boxDepth = 16.5 * side;
    const boxHalfW = 20.16;

    ctx.strokeRect(cx(-boxHalfW), cy(glY), boxHalfW * 2 * scaleX, Math.abs(boxDepth) * scaleY * (side < 0 ? -1 : 1));

    // Goal area (5.5 m × 18.32 m)
    const gaDepth = 5.5 * side;
    const gaHalfW = 9.16;
    ctx.strokeRect(cx(-gaHalfW), cy(glY), gaHalfW * 2 * scaleX, Math.abs(gaDepth) * scaleY * (side < 0 ? -1 : 1));

    // Penalty spot at 11 m from goal line
    const pSpotY = glY - 11 * side;
    ctx.beginPath(); ctx.arc(cx(0), cy(pSpotY), 0.3 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    // Penalty arc (r=9.15 centred on penalty spot, only the arc outside the box)
    // The arc is the part of the circle outside the penalty area.
    // At the top of the box (glY ∓ 16.5), the circle of r=9.15 around the spot
    // starts appearing. We draw the portion that is "outside" the penalty box
    // by clipping using canvas save/restore.
    ctx.save();
    // Clip to outside the penalty box: invert the rectangle clip region
    const boxTop = cy(glY - boxDepth);
    const boxBot = cy(glY);
    const [clipY0, clipY1] = boxBot < boxTop ? [boxBot, boxTop] : [boxTop, boxBot];
    ctx.beginPath();
    ctx.rect(0, 0, W, clipY0);
    ctx.rect(0, clipY1, W, H - clipY1);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(cx(0), cy(pSpotY), 9.15 * scaleX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Corner arcs (r=1 m)
  for (const [cornerX, cornerY] of [[-34, 52.5], [34, 52.5], [-34, -52.5], [34, -52.5]]) {
    const startAngle = (cornerX < 0 ? 0 : Math.PI / 2) + (cornerY > 0 ? 0 : Math.PI);
    ctx.beginPath();
    ctx.arc(cx(cornerX as number), cy(cornerY as number), 1 * scaleX, startAngle, startAngle + Math.PI / 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// ─── Shadow circle beneath a player / ball ───────────────────────────────────
function createShadowCircle(radius: number, opacity: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.005; // just above pitch
  return mesh;
}

// ─── Player mesh group ────────────────────────────────────────────────────────
// Capsule body + separate shorts block + head sphere — returns the group and
// an arrow mesh that shows the charge indicator.
function createPlayerGroup(bodyColor: number, headColor: number) {
  const group = new THREE.Group();

  // Body (torso + legs approximated as a capsule)
  const bodyGeo = new THREE.CapsuleGeometry(0.38, 0.85, 6, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.0 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.92;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.8 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);

  // Direction nub (small sphere in front of player to show facing)
  const nubGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const nubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const nub = new THREE.Mesh(nubGeo, nubMat);
  nub.position.set(0, 0.9, -0.45); // forward in model space
  group.add(nub);

  // Charge cone (hidden by default)
  const coneGeo = new THREE.ConeGeometry(0.18, 0.6, 8);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.85 });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.rotation.x = Math.PI / 2;      // tip points forward (-Z)
  cone.position.set(0, 0.55, -0.75);
  cone.visible = false;
  group.add(cone);

  // Shadow
  const shadow = createShadowCircle(0.45, 0.25);
  group.add(shadow);

  return { group, body, cone };
}

// ─── Ball mesh ────────────────────────────────────────────────────────────────
function createBallMesh(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.11, 24, 24);
  // Use vertex colours to fake pentagon panels (simplified)
  const mat = new THREE.MeshStandardMaterial({
    color: BALL_PANEL_LIGHT,
    roughness: 0.35,
    metalness: 0.0,
  });
  return new THREE.Mesh(geo, mat);
}

// ─── Goal post group ──────────────────────────────────────────────────────────
// FIFA goal: 7.32 m wide × 2.44 m tall, posts ∅ 0.12 m.
function createGoalGroup(facingPositiveZ: boolean): THREE.Group {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: POST_COLOR, roughness: 0.3, metalness: 0.1 });
  const netMat  = new THREE.MeshStandardMaterial({ color: NET_COLOR,  roughness: 1.0, transparent: true, opacity: 0.35, side: THREE.DoubleSide });

  const gw = 7.32, gh = 2.44, r = 0.06;

  // Left post
  const lPost = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gh, 12), postMat);
  lPost.position.set(-gw / 2, gh / 2, 0);
  lPost.castShadow = true;
  group.add(lPost);

  // Right post
  const rPost = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gh, 12), postMat);
  rPost.position.set(gw / 2, gh / 2, 0);
  rPost.castShadow = true;
  group.add(rPost);

  // Crossbar
  const xbar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gw + r * 2, 12), postMat);
  xbar.rotation.z = Math.PI / 2;
  xbar.position.set(0, gh, 0);
  group.add(xbar);

  // Net depth (behind goal)
  const depth = 1.5;
  const netDir = facingPositiveZ ? 1 : -1;

  // Back panel
  const backGeo = new THREE.PlaneGeometry(gw, gh);
  const back = new THREE.Mesh(backGeo, netMat);
  back.position.set(0, gh / 2, netDir * depth);
  group.add(back);

  // Top panel
  const topGeo = new THREE.PlaneGeometry(gw, depth);
  const top = new THREE.Mesh(topGeo, netMat);
  top.rotation.x = Math.PI / 2;
  top.position.set(0, gh, netDir * depth / 2);
  group.add(top);

  // Side panels
  for (const side of [-1, 1]) {
    const sideGeo = new THREE.PlaneGeometry(depth, gh);
    const sideMesh = new THREE.Mesh(sideGeo, netMat);
    sideMesh.rotation.y = Math.PI / 2;
    sideMesh.position.set(side * gw / 2, gh / 2, netDir * depth / 2);
    group.add(sideMesh);
  }

  return group;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RenderingPanel({ useWasm, engine, wasmClient }: RenderingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendererLabel, setRendererLabel] = useState<string>('Initialising…');

  useEffect(() => {
    if (!canvasRef.current) return;

    let isCancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let reqId: number;

    const init = async () => {
      const rawRenderer = await RendererFactory.createRenderer(canvasRef.current!);
      if (isCancelled) return;
      renderer = rawRenderer as unknown as THREE.WebGLRenderer;
      setRendererLabel((renderer as any).constructor?.name ?? 'WebGL');
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // ── Scene ──────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb); // sky blue
      scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

      // ── Camera ─────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
      camera.position.set(0, 14, 22);
      camera.lookAt(0, 0, 0);

      // ── Lighting ───────────────────────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xfff8e7, 0.55);
      scene.add(ambient);

      // Main sun
      const sun = new THREE.DirectionalLight(0xfff5d6, 1.4);
      sun.position.set(40, 60, 30);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 200;
      sun.shadow.camera.left = -60;
      sun.shadow.camera.right = 60;
      sun.shadow.camera.top = 60;
      sun.shadow.camera.bottom = -60;
      sun.shadow.bias = -0.001;
      scene.add(sun);

      // Fill light (sky colour, opposite side)
      const fill = new THREE.DirectionalLight(0xadd8e6, 0.3);
      fill.position.set(-20, 15, -20);
      scene.add(fill);

      // ── Pitch ──────────────────────────────────────────────────────────
      const pitchGeo = new THREE.PlaneGeometry(68, 105, 1, 1);
      const pitchMat = new THREE.MeshStandardMaterial({
        map: createPitchTexture(),
        roughness: 0.9,
        metalness: 0.0,
      });
      const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
      pitchMesh.rotation.x = -Math.PI / 2;
      pitchMesh.receiveShadow = true;
      scene.add(pitchMesh);

      // ── Goals ──────────────────────────────────────────────────────────
      // North goal (positive Z in world = positive Y in pitch = keeper end)
      const goalNorth = createGoalGroup(false);
      goalNorth.position.set(0, 0, -52.5); // pitch Y=52.5 → world Z=-52.5
      scene.add(goalNorth);

      const goalSouth = createGoalGroup(true);
      goalSouth.position.set(0, 0, 52.5);
      goalSouth.rotation.y = Math.PI;
      scene.add(goalSouth);

      // ── Player ─────────────────────────────────────────────────────────
      const { group: playerGroup, cone: playerCone } = createPlayerGroup(PLAYER_BODY_COLOR, PLAYER_HEAD_COLOR);
      scene.add(playerGroup);

      // ── Keeper ─────────────────────────────────────────────────────────
      const { group: keeperGroup, body: keeperBody } = createPlayerGroup(KEEPER_BODY_COLOR, KEEPER_HEAD_COLOR);
      scene.add(keeperGroup);

      // ── Ball ───────────────────────────────────────────────────────────
      const ballMesh = createBallMesh();
      ballMesh.castShadow = true;
      scene.add(ballMesh);

      // Ball shadow circle (scales with height to simulate disappearing shadow)
      const ballShadow = createShadowCircle(0.2, 0.35);
      scene.add(ballShadow);

      // ── Render loop ────────────────────────────────────────────────────
      const renderLoop = () => {
        reqId = requestAnimationFrame(renderLoop);

        const state: WorldState = useWasm ? wasmClient.getRenderState() : engine.getRenderState();

        // Player
        playerGroup.position.set(state.player.pos.x, 0, -state.player.pos.y);
        const playerAngle = Math.atan2(state.player.facing.x, state.player.facing.y);
        playerGroup.rotation.y = playerAngle;

        // Player charge cone colour + visibility
        if (state.player.isCharging) {
          playerCone.visible = true;
          const coneColor = state.player.chargeType === 'shoot' ? 0xff3333 : 0x3399ff;
          (playerCone.material as THREE.MeshStandardMaterial).color.setHex(coneColor);
          const scale = 0.6 + (state.player.chargeStart / 1.5) * 1.4;
          playerCone.scale.set(scale, scale, scale);
        } else {
          playerCone.visible = false;
        }

        // Keeper
        keeperGroup.position.set(state.keeper.pos.x, 0, -state.keeper.pos.y);
        const keeperAngle = Math.atan2(state.keeper.facing.x, state.keeper.facing.y);
        keeperGroup.rotation.y = keeperAngle;

        // Keeper dive tilt
        const targetTilt = state.keeper.aiState === 'diving' ? Math.PI / 3 : 0;
        keeperBody.rotation.z += (targetTilt - keeperBody.rotation.z) * 0.2;

        // Ball
        const ballHeight = state.ball.pos.z + 0.11;
        ballMesh.position.set(state.ball.pos.x, ballHeight, -state.ball.pos.y);

        // Ball roll
        const invRadius = 1 / 0.11;
        ballMesh.rotation.x -= state.ball.vel.y * invRadius * (1 / 120);
        ballMesh.rotation.z += state.ball.vel.x * invRadius * (1 / 120);

        // Ball shadow scales/fades with height
        const shadowHeight = Math.max(0, state.ball.pos.z);
        const shadowScale = Math.max(0.3, 1 - shadowHeight * 0.12);
        ballShadow.position.set(state.ball.pos.x, 0.005, -state.ball.pos.y);
        ballShadow.scale.set(shadowScale, shadowScale, shadowScale);
        (ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.35 * shadowScale;

        // Camera follow player with smooth lerp
        const camTargetX = state.player.pos.x * 0.4;
        const camTargetZ = -state.player.pos.y + 18;
        camera.position.x += (camTargetX - camera.position.x) * 0.04;
        camera.position.z += (camTargetZ - camera.position.z) * 0.04;
        camera.position.y += (13 - camera.position.y) * 0.04;
        camera.lookAt(
          camera.position.x * 0.2,
          0,
          camera.position.z - 10,
        );

        renderer!.render(scene, camera);
      };

      renderLoop();
    };

    init();

    const handleResize = () => {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (renderer) renderer.dispose();
    };
  }, [useWasm, engine, wasmClient]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-label="Football simulation viewport"
    />
  );
}
