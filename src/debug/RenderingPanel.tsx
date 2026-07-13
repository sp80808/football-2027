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
}

export function RenderingPanel({ useWasm, engine, wasmClient }: RenderingPanelProps) {
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
      scene.background = new THREE.Color(0x87CEEB);
      
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 15, 20);
      camera.lookAt(0, 0, 0);
      
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(10, 20, 10);
      scene.add(dirLight);

      // Pitch
      const createPitchTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, 512, 1024);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        
        // Outline
        ctx.strokeRect(16, 16, 480, 992);
        
        // Halfway line
        ctx.beginPath();
        ctx.moveTo(16, 512);
        ctx.lineTo(496, 512);
        ctx.stroke();
        
        // Center circle
        ctx.beginPath();
        ctx.arc(256, 512, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Penalty areas
        ctx.strokeRect(128, 16, 256, 128);
        ctx.strokeRect(128, 880, 256, 128);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
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

      // Player visual group
      const playerGroup = new THREE.Group();
      
      const playerGeo = new THREE.CapsuleGeometry(0.4, 1.0, 4, 16);
      const playerMat = new THREE.MeshStandardMaterial({ color: '#ff4444', roughness: 0.7 });
      const playerMesh = new THREE.Mesh(playerGeo, playerMat);
      playerMesh.position.y = 0.9;
      playerMesh.castShadow = true;
      playerGroup.add(playerMesh);

      // Player head/facing indicator
      const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const headMat = new THREE.MeshStandardMaterial({ color: '#222222' });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(0, 1.5, -0.2); // forward is -z
      playerGroup.add(headMesh);
      
      scene.add(playerGroup);

      // Keeper visual group
      const keeperGroup = new THREE.Group();
      const keeperMat = new THREE.MeshStandardMaterial({ color: '#4444ff', roughness: 0.7 });
      const keeperMesh = new THREE.Mesh(playerGeo, keeperMat);
      keeperMesh.position.y = 0.9;
      keeperGroup.add(keeperMesh);
      scene.add(keeperGroup);

      // Ball visual
      const ballGeo = new THREE.SphereGeometry(0.11, 32, 32);
      const ballMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.castShadow = true;
      scene.add(ballMesh);

      const renderLoop = () => {
        reqId = requestAnimationFrame(renderLoop);
        
        let state: WorldState;
        if (useWasm) {
          state = wasmClient.getRenderState();
        } else {
          state = engine.getRenderState();
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
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px' }}>
        Renderer: {rendererType} <br/>
        Sim: {useWasm ? 'WASM Worker' : 'TypeScript Main'}
      </div>
    </>
  );
}
