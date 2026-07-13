import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameEngine } from '../engine/GameEngine';

export function PlayerView({ engine }: { engine: GameEngine }) {
  const groupRef = useRef<THREE.Group>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const player = engine.getRenderState().player;
    if (groupRef.current) {
      groupRef.current.position.set(player.pos.x, 0.9, -player.pos.y);
      const angle = Math.atan2(player.facing.y, player.facing.x);
      groupRef.current.rotation.y = angle + Math.PI / 2;
    }
    
    if (indicatorRef.current) {
      if (player.isCharging) {
        indicatorRef.current.visible = true;
        indicatorRef.current.scale.set(1, 1, 1 + player.chargeStart * 2);
        const color = player.chargeType === 'shoot' ? 0xff0000 : 0x00aaff;
        (indicatorRef.current.material as THREE.MeshStandardMaterial).color.setHex(color);
      } else {
        indicatorRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.0, 4, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      
      <mesh ref={indicatorRef} position={[0, -0.8, -0.5]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.3, 1, 8]} />
        <meshStandardMaterial color="#00aaff" />
      </mesh>
      
      <mesh position={[0, 0.6, -0.2]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  );
}
