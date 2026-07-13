import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameEngine } from '../engine/GameEngine';

export function KeeperView({ engine }: { engine: GameEngine }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const keeper = engine.getRenderState().keeper;
    if (groupRef.current) {
      groupRef.current.position.set(keeper.pos.x, 0.9, -keeper.pos.y);
      const angle = Math.atan2(keeper.facing.y, keeper.facing.x);
      groupRef.current.rotation.y = angle + Math.PI / 2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.0, 4, 16]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.7} /> {/* Yellow/gold kit */}
      </mesh>
      
      <mesh position={[0, 0.6, -0.2]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  );
}
