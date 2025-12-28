import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Glitch shader material
const glitchShader = {
  uniforms: {
    time: { value: 0 },
    intensity: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Chromatic aberration
      float offset = sin(time * 10.0) * intensity * 0.01;
      float r = texture2D(map, uv + vec2(offset, 0.0)).r;
      float g = texture2D(map, uv).g;
      float b = texture2D(map, uv - vec2(offset, 0.0)).b;
      
      // Glitch effect
      float glitch = step(0.98, sin(time * 20.0 + uv.y * 10.0)) * intensity;
      vec2 glitchOffset = vec2(
        (random(uv + time) - 0.5) * glitch * 0.1,
        (random(uv.yx + time) - 0.5) * glitch * 0.1
      );
      
      vec3 color = vec3(r, g, b);
      color += glitch * vec3(1.0, 0.0, 0.0);
      
      gl_FragColor = vec4(color, 1.0);
    }
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
  `
};

interface GlitchEffectProps {
  children: React.ReactNode;
  intensity?: number;
  active?: boolean;
}

const GlitchEffect: React.FC<GlitchEffectProps> = ({ 
  children, 
  intensity = 0.5,
  active = false 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !active) return;
    
    const time = state.clock.elapsedTime;
    
    // Apply glitch transform
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const glitchAmount = Math.sin(time * 20) * intensity * 0.02;
        child.position.x = (Math.random() - 0.5) * glitchAmount;
        child.position.y = (Math.random() - 0.5) * glitchAmount;
      }
    });
  });

  if (!active) return <>{children}</>;

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export default GlitchEffect;

