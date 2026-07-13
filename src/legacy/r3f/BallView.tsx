import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameEngine } from '../../engine/GameEngine';
import { SimulationConfig } from '../../engine/SimulationConfig';

export function BallView({ engine }: { engine: GameEngine }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = SimulationConfig.BALL_RADIUS;

  useFrame(() => {
    const ball = engine.getRenderState().ball;
    if (meshRef.current) {
      meshRef.current.position.set(ball.pos.x, ball.pos.z + radius, -ball.pos.y);
      
      const rollSpeed = 1 / radius;
      meshRef.current.rotation.x -= ball.vel.y * rollSpeed * (1/60);
      meshRef.current.rotation.z += ball.vel.x * rollSpeed * (1/60);
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} />
    </mesh>
  );
}
