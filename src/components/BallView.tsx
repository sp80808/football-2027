import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball as BallModel } from '../engine/Ball';

export function BallView({ ball }: { ball: BallModel }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(ball.pos.x, ball.pos.z + ball.radius, -ball.pos.y);
      
      // Simple roll rotation based on velocity
      const rollSpeed = 1 / ball.radius; // angular velocity = v / r
      meshRef.current.rotation.x -= ball.vel.y * rollSpeed * (1/60); // approx frame delta
      meshRef.current.rotation.z += ball.vel.x * rollSpeed * (1/60);
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[ball.radius, 32, 32]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4}>
        {/* Simple pattern with checkerboard or noise could go here */}
      </meshStandardMaterial>
    </mesh>
  );
}
