import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const grassVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const grassFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  
  // Modulo based stripes for grass
  void main() {
    // 68x105 pitch
    // Stripe width approx 5 meters
    float stripe = mod(vWorldPos.y, 10.0);
    vec3 color1 = vec3(0.2, 0.5, 0.2); // Darker grass
    vec3 color2 = vec3(0.25, 0.55, 0.25); // Lighter grass
    vec3 grassColor = mix(color1, color2, step(5.0, stripe));
    
    // Add some noise (simplified)
    float noise = fract(sin(dot(vWorldPos.xy, vec2(12.9898, 78.233))) * 43758.5453);
    grassColor -= noise * 0.05;

    // Pitch lines
    // Center circle (radius 9.15m)
    float distToCenter = length(vWorldPos.xy);
    float lineThickness = 0.15;
    
    bool isLine = false;
    
    // Halfway line
    if (abs(vWorldPos.y) < lineThickness) isLine = true;
    
    // Center circle
    if (abs(distToCenter - 9.15) < lineThickness) isLine = true;
    
    // Center spot
    if (distToCenter < 0.3) isLine = true;
    
    // Touchlines (x = +/- 34)
    if (abs(abs(vWorldPos.x) - 34.0) < lineThickness) isLine = true;
    
    // Goal lines (y = +/- 52.5)
    if (abs(abs(vWorldPos.y) - 52.5) < lineThickness) isLine = true;
    
    // Penalty areas (16.5m from goal line, 40.3m wide)
    // Goal width is 7.32m, penalty area is 16.5m on each side of goal post.
    // 7.32/2 + 16.5 = 20.16m. So x is +/- 20.16
    if (abs(vWorldPos.y) > 52.5 - 16.5 && abs(vWorldPos.y) < 52.5) {
      if (abs(abs(vWorldPos.x) - 20.16) < lineThickness) isLine = true;
    }
    // Top of penalty area
    if (abs(abs(vWorldPos.y) - (52.5 - 16.5)) < lineThickness && abs(vWorldPos.x) < 20.16) isLine = true;

    if (isLine && abs(vWorldPos.x) <= 34.0 && abs(vWorldPos.y) <= 52.5) {
      gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
    } else {
      gl_FragColor = vec4(grassColor, 1.0);
    }
  }
`;

export function Pitch() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
    });
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 150]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
