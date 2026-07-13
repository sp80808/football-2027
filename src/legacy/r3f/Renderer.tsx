import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GameEngine } from '../../engine/GameEngine';
import { Pitch } from './Pitch';
import { PlayerView } from './PlayerView';
import { KeeperView } from './KeeperView';
import { BallView } from './BallView';

const engine = new GameEngine();
engine.init();

function GameLoop({ setDiagnostics }: { setDiagnostics: any }) {
  const { camera } = useThree();
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);
  const fpsTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(0);

  useFrame((state) => {
    const time = performance.now();
    const frameTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    framesRef.current++;
    if (time - fpsTimeRef.current >= 1000) {
      setFps(framesRef.current);
      framesRef.current = 0;
      fpsTimeRef.current = time;
    }

    const renderState = engine.update(time);

    // Camera follow player
    const targetX = renderState.player.pos.x;
    const targetZ = -renderState.player.pos.y;
    
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.z += (targetZ + 15 - camera.position.z) * 0.05;
    camera.position.y += (10 - camera.position.y) * 0.05;
    camera.lookAt(targetX, 0, targetZ);

    setDiagnostics({
      fps,
      tps: engine.tps,
      frameTime: frameTime.toFixed(1),
      playerSpeed: renderState.player.vel.mag().toFixed(2),
      ballVelocity: renderState.ball.vel.mag().toFixed(2),
      controlState: renderState.player.controlState,
      intentX: engine.input.currentFrame.leftStick.x.toFixed(2),
      intentY: engine.input.currentFrame.leftStick.y.toFixed(2),
    });
  });

  return null;
}

export function Renderer() {
  const [diagnostics, setDiagnostics] = useState({
    fps: 0,
    tps: 0,
    frameTime: '0.0',
    playerSpeed: '0.00',
    ballVelocity: '0.00',
    controlState: 'free',
    intentX: '0.00',
    intentY: '0.00',
  });

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <Canvas shadows camera={{ position: [0, 10, 20], fov: 45 }}>
        <GameLoop setDiagnostics={setDiagnostics} />
        
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
        <PlayerView engine={engine} />
        <KeeperView engine={engine} />
        <BallView engine={engine} />

        {/* Goals */}
        <Goal position={[0, 0, -52.5]} />
        <Goal position={[0, 0, 52.5]} rotation={[0, Math.PI, 0]} />
        
      </Canvas>
      
      {/* Help Panel */}
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

      {/* Diagnostics Panel */}
      <div className="absolute top-4 right-4 text-white text-xs font-mono bg-black/70 p-4 rounded-lg pointer-events-none">
        <h2 className="font-bold mb-2 border-b border-gray-600 pb-1">Diagnostics</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>FPS:</span> <span className="text-right text-green-400">{diagnostics.fps}</span>
          <span>TPS:</span> <span className="text-right text-blue-400">{diagnostics.tps}</span>
          <span>Frame Time:</span> <span className="text-right">{diagnostics.frameTime} ms</span>
          <span>Speed:</span> <span className="text-right">{diagnostics.playerSpeed} m/s</span>
          <span>Ball Vel:</span> <span className="text-right">{diagnostics.ballVelocity} m/s</span>
          <span>Control:</span> <span className="text-right text-yellow-300">{diagnostics.controlState}</span>
          <span>Intent (X/Y):</span> <span className="text-right">{diagnostics.intentX}, {diagnostics.intentY}</span>
        </div>
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
