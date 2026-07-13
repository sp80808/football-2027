import React, { useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GameEngine } from '../engine/GameEngine';
import { Pitch } from './Pitch';
import { PlayerView } from './PlayerView';
import { KeeperView } from './KeeperView';
import { BallView } from './BallView';

// Instantiate the engine singleton outside React so it survives re-renders
const engine = new GameEngine();
engine.init();

function GameLoop() {
  const { camera } = useThree();

  useFrame((state) => {
    const time = performance.now();
    engine.update(time);

    // Camera follow player (Broadcast-style or 3rd person)
    const targetX = engine.player.pos.x;
    const targetZ = -engine.player.pos.y;
    
    // Smooth camera follow
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.z += (targetZ + 15 - camera.position.z) * 0.05;
    camera.position.y += (10 - camera.position.y) * 0.05;
    
    camera.lookAt(targetX, 0, targetZ);
  });

  return null;
}

export function Renderer() {
  return (
    <div className="w-full h-screen bg-gray-900">
      <Canvas shadows camera={{ position: [0, 10, 20], fov: 45 }}>
        <GameLoop />
        
        <Sky sunPosition={[100, 20, 100]} turbidity={0.3} rayleigh={0.5} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 50, 20]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />

        <Pitch />
        <PlayerView player={engine.player} />
        <KeeperView keeper={engine.keeper} />
        <BallView ball={engine.ball} />

        {/* Goals */}
        <Goal position={[0, 0, -52.5]} />
        <Goal position={[0, 0, 52.5]} rotation={[0, Math.PI, 0]} />
        
      </Canvas>
      <div className="absolute top-4 left-4 text-white text-sm bg-black/50 p-4 rounded-lg pointer-events-none">
        <h1 className="font-bold mb-2">Football Sandbox Core</h1>
        <ul className="space-y-1">
          <li><strong>Move:</strong> WASD / Left Stick</li>
          <li><strong>Sprint:</strong> Shift / RT</li>
          <li><strong>Pass:</strong> J / Space / A Button</li>
          <li><strong>Shoot:</strong> K / X Button</li>
          <li>Hold Pass/Shoot to charge. Release to kick.</li>
        </ul>
      </div>
    </div>
  );
}

function Goal({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Posts */}
      <mesh position={[-3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 7.32, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}
