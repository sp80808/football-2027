import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RendererFactory } from '../rendering/RendererFactory';
import { WorldState } from '../engine/WorldState';
import { SimulationWorkerClient } from '../bridge/SimulationWorkerClient';
import { GameEngine } from '../engine/GameEngine';

interface RenderingPanelProps {
  useWasm: boolean;
  engine: GameEngine; // Fallback to TypeScript engine
  wasmClient: SimulationWorkerClient; // The Web Worker client
  replayState?: WorldState | null;
  showOffsideLine?: boolean;
}

export function RenderingPanel({ useWasm, engine, wasmClient, replayState, showOffsideLine }: RenderingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendererType, setRendererType] = useState<string>('Initializing...');
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    let isCancelled = false;
    let renderer: any = null;
    let reqId: number;

    const init = async () => {
      renderer = await RendererFactory.createRenderer(canvasRef.current!);
      if (isCancelled) return;
      
      setRendererType(renderer.constructor.name);
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0f172a');
      scene.fog = new THREE.FogExp2('#0f172a', 0.015);
      
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 15, 20);
      camera.lookAt(0, 0, 0);
      
      // Better lighting with shadows
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(20, 40, 20);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 100;
      dirLight.shadow.camera.left = -40;
      dirLight.shadow.camera.right = 40;
      dirLight.shadow.camera.top = 40;
      dirLight.shadow.camera.bottom = -40;
      scene.add(dirLight);

      // Outer pitch area
      const outerPitchGeo = new THREE.PlaneGeometry(300, 300);
      const outerPitchMat = new THREE.MeshStandardMaterial({ color: '#2b7527', roughness: 0.9 });
      const outerPitch = new THREE.Mesh(outerPitchGeo, outerPitchMat);
      outerPitch.rotation.x = -Math.PI / 2;
      outerPitch.position.y = -0.01; // Slightly below main pitch to avoid z-fighting
      outerPitch.receiveShadow = true;
      scene.add(outerPitch);

      // Pitch
      const createPitchTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d')!;
        
        // Grass base
        ctx.fillStyle = '#348C31';
        ctx.fillRect(0, 0, 1024, 2048);
        
        // Grass stripes
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
        
        // Scale factors
        const sfX = 1024 / 68;
        const sfY = 2048 / 105;
        
        // Outline
        ctx.strokeRect(16, 16, 1024 - 32, 2048 - 32);
        
        // Halfway line
        ctx.beginPath();
        ctx.moveTo(16, 1024);
        ctx.lineTo(1024 - 16, 1024);
        ctx.stroke();
        
        // Center circle (radius 9.15m)
        ctx.beginPath();
        ctx.arc(512, 1024, 9.15 * sfX, 0, Math.PI * 2);
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(512, 1024, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        
        // Penalty areas (16.5m x 40.3m)
        const penAreaWidth = 40.3 * sfX;
        const penAreaHeight = 16.5 * sfY;
        const penAreaX = (1024 - penAreaWidth) / 2;
        
        // Top penalty area
        ctx.strokeRect(penAreaX, 16, penAreaWidth, penAreaHeight);
        // Bottom penalty area
        ctx.strokeRect(penAreaX, 2048 - 16 - penAreaHeight, penAreaWidth, penAreaHeight);
        
        // Goal areas (5.5m x 18.3m)
        const goalAreaWidth = 18.3 * sfX;
        const goalAreaHeight = 5.5 * sfY;
        const goalAreaX = (1024 - goalAreaWidth) / 2;
        
        // Top goal area
        ctx.strokeRect(goalAreaX, 16, goalAreaWidth, goalAreaHeight);
        // Bottom goal area
        ctx.strokeRect(goalAreaX, 2048 - 16 - goalAreaHeight, goalAreaWidth, goalAreaHeight);
        
        // Penalty spots (11m)
        const penSpotY = 11 * sfY;
        ctx.beginPath();
        ctx.arc(512, 16 + penSpotY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(512, 2048 - 16 - penSpotY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Penalty arcs (radius 9.15m from penalty spot)
        // Top
        ctx.beginPath();
        ctx.arc(512, 16 + penSpotY, 9.15 * sfY, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        // Bottom
        ctx.beginPath();
        ctx.arc(512, 2048 - 16 - penSpotY, 9.15 * sfY, 1.2 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      };

      const pitchGeo = new THREE.PlaneGeometry(68, 105);
      const pitchMat = new THREE.MeshStandardMaterial({ 
        map: createPitchTexture(),
        roughness: 0.8 
      });
      const pitch = new THREE.Mesh(pitchGeo, pitchMat);
      pitch.rotation.x = -Math.PI / 2;
      pitch.receiveShadow = true;
      scene.add(pitch);

      // Create Goals
      const createGoal = (color: string) => {
        const goalGroup = new THREE.Group();
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.44, 16);
        const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
        
        // Left post
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-3.66, 1.22, 0);
        leftPost.castShadow = true;
        goalGroup.add(leftPost);
        
        // Right post
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(3.66, 1.22, 0);
        rightPost.castShadow = true;
        goalGroup.add(rightPost);
        
        // Crossbar
        const crossbarGeo = new THREE.CylinderGeometry(0.06, 0.06, 7.44, 16);
        const crossbar = new THREE.Mesh(crossbarGeo, postMat);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(0, 2.44, 0);
        crossbar.castShadow = true;
        goalGroup.add(crossbar);

        // Net material
        const netGeo = new THREE.PlaneGeometry(7.32, 2.5);
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
        
        const netMat = new THREE.MeshStandardMaterial({
          map: netTex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        
        // Back net
        const backNet = new THREE.Mesh(netGeo, netMat);
        backNet.position.set(0, 1.25, -1.5);
        backNet.rotation.x = Math.PI / 16;
        goalGroup.add(backNet);
        
        // Side nets
        const sideNetGeo = new THREE.PlaneGeometry(1.5, 2.5);
        
        const leftSideNet = new THREE.Mesh(sideNetGeo, netMat);
        leftSideNet.position.set(-3.66, 1.25, -0.75);
        leftSideNet.rotation.y = Math.PI / 2;
        goalGroup.add(leftSideNet);
        
        const rightSideNet = new THREE.Mesh(sideNetGeo, netMat);
        rightSideNet.position.set(3.66, 1.25, -0.75);
        rightSideNet.rotation.y = Math.PI / 2;
        goalGroup.add(rightSideNet);

        return goalGroup;
      };

      const topGoal = createGoal('#ff0000');
      topGoal.position.set(0, 0, -52.5);
      scene.add(topGoal);

      const bottomGoal = createGoal('#0000ff');
      bottomGoal.position.set(0, 0, 52.5);
      bottomGoal.rotation.y = Math.PI;
      scene.add(bottomGoal);

      const createPlayerModel = (teamColor: string, isKeeper: boolean = false) => {
        const group = new THREE.Group();
        
        // Body (Shirt)
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.7, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.7 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);
        
        // Shorts
        const shortsGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.4, 16);
        const shortsMat = new THREE.MeshStandardMaterial({ color: isKeeper ? '#111111' : '#ffffff', roughness: 0.8 });
        const shorts = new THREE.Mesh(shortsGeo, shortsMat);
        shorts.position.y = 0.45;
        shorts.castShadow = true;
        group.add(shorts);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const skinMat = new THREE.MeshStandardMaterial({ color: '#f1c27d', roughness: 0.4 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.55;
        head.castShadow = true;
        group.add(head);
        
        // Hair / facing indicator
        const hairGeo = new THREE.BoxGeometry(0.38, 0.1, 0.38);
        const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1a10' });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.68;
        // Shift it slightly forward to indicate facing direction (-z is forward)
        hair.position.z = -0.05;
        group.add(hair);
        
        // Nose (facing indicator)
        const noseGeo = new THREE.BoxGeometry(0.06, 0.08, 0.08);
        const nose = new THREE.Mesh(noseGeo, skinMat);
        nose.position.set(0, 1.55, -0.2);
        group.add(nose);
        
        return group;
      };

      // Player visual group
      const playerGroup = createPlayerModel('#ef4444');
      scene.add(playerGroup);

      // Keeper visual group
      const keeperGroup = createPlayerModel('#eab308', true); // Yellow for keeper
      scene.add(keeperGroup);

      // Ball visual
      const ballGeo = new THREE.IcosahedronGeometry(0.11, 2);
      const ballMat = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', 
        roughness: 0.2,
        metalness: 0.1,
      });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      
      // Add a simple pattern to the ball to show rotation
      const ballPatternGeo = new THREE.BoxGeometry(0.23, 0.05, 0.05);
      const ballPatternMat = new THREE.MeshBasicMaterial({ color: '#222222' });
      const ballPattern1 = new THREE.Mesh(ballPatternGeo, ballPatternMat);
      const ballPattern2 = new THREE.Mesh(ballPatternGeo, ballPatternMat);
      ballPattern2.rotation.y = Math.PI / 2;
      const ballPattern3 = new THREE.Mesh(ballPatternGeo, ballPatternMat);
      ballPattern3.rotation.z = Math.PI / 2;
      ballMesh.add(ballPattern1);
      ballMesh.add(ballPattern2);
      ballMesh.add(ballPattern3);
      
      ballMesh.castShadow = true;
      scene.add(ballMesh);

      // Offside line visual
      const offsideGeo = new THREE.PlaneGeometry(68, 0.4);
      const offsideMat = new THREE.MeshBasicMaterial({ 
        color: '#ffcc00', 
        transparent: true, 
        opacity: 0.9, 
        depthTest: false,
        blending: THREE.AdditiveBlending 
      });
      const offsideLine = new THREE.Mesh(offsideGeo, offsideMat);
      offsideLine.rotation.x = -Math.PI / 2;
      offsideLine.position.y = 0.05; // Slightly above pitch
      offsideLine.visible = false;
      scene.add(offsideLine);

      const renderLoop = () => {
        reqId = requestAnimationFrame(renderLoop);
        
        let state: WorldState;
        if (replayState) {
          state = replayState;
        } else if (useWasm) {
          state = wasmClient.getRenderState();
        } else {
          state = engine.getRenderState();
        }

        // Offside line logic - simple mock, placing it at player's Y if showOffsideLine
        if (showOffsideLine) {
          offsideLine.visible = true;
          offsideLine.position.z = -state.player.pos.y;
        } else {
          offsideLine.visible = false;
        }

        // Interpolation would happen here
        // For now, direct copy of positions
        playerGroup.position.set(state.player.pos.x, 0, -state.player.pos.y);
        
        // Update facing
        const angle = Math.atan2(state.player.facing.x, state.player.facing.y);
        playerGroup.rotation.y = angle; // Assuming 0,1 is +Y in 2D space

        keeperGroup.position.set(state.keeper.pos.x, 0, -state.keeper.pos.y);

        ballMesh.position.set(state.ball.pos.x, state.ball.pos.z + 0.11, -state.ball.pos.y);
        
        // Simple ball roll based on velocity
        const radius = 0.11;
        const rollSpeed = 1 / radius;
        ballMesh.rotation.x -= state.ball.vel.y * rollSpeed * (1/60);
        ballMesh.rotation.z += state.ball.vel.x * rollSpeed * (1/60);

        // Camera follow
        const targetX = state.player.pos.x;
        const targetZ = -state.player.pos.y;
        
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.z += (targetZ + 15 - camera.position.z) * 0.05;
        camera.position.y += (10 - camera.position.y) * 0.05;
        camera.lookAt(targetX, 0, targetZ);

        renderer!.render(scene, camera);
      };
      
      renderLoop();
    };
    
    init();

    const handleResize = () => {
      if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (renderer) {
        // @ts-ignore
        if (renderer.dispose) renderer.dispose();
      }
    };
  }, [useWasm, engine, wasmClient]);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', zIndex: 10 }}>
        Renderer: {rendererType} <br/>
        Sim: {useWasm ? 'WASM Worker' : 'TypeScript Main'}
      </div>
    </>
  );
}
