
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  status: 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'LOCKED';
  amplitude: number; // 0 to 1
  isProcessing: boolean;
}

const HolographicCore3D: React.FC<Props> = ({ status, amplitude, isProcessing }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Get color based on status
  const getColor = () => {
    switch (status) {
      case 'CRITICAL': return new THREE.Color(0xef4444); // Red
      case 'LOCKED': return new THREE.Color(0xef0000); // Deep Red
      case 'CAUTION': return new THREE.Color(0xf59e0b); // Amber
      default: return new THREE.Color(0x06b6d4); // Cyan
    }
  };

  const color = useMemo(() => getColor(), [status]);

  // Generate particles for the sphere
  const particles = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spherical distribution
      const radius = 2 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      sizes[i] = Math.random() * 0.02 + 0.01;
    }
    
    return { positions, sizes };
  }, []);

  // Morph shapes based on context
  const getMorphTarget = () => {
    if (status === 'LOCKED') return 'shield';
    if (isProcessing) return 'brain';
    if (amplitude > 0.1) return 'waveform';
    if (status === 'CRITICAL' || status === 'CAUTION') return 'alert';
    return 'sphere';
  };

  useFrame((state, delta) => {
    if (!pointsRef.current || !meshRef.current) return;

    const speed = isProcessing ? 0.5 : 0.1;
    const morphTarget = getMorphTarget();
    
    // Rotate the entire system
    pointsRef.current.rotation.x += delta * speed * 0.2;
    pointsRef.current.rotation.y += delta * speed * 0.3;
    meshRef.current.rotation.x += delta * speed * 0.15;
    meshRef.current.rotation.y += delta * speed * 0.25;

    // Morph based on context
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const baseRadius = 2;
    const morphFactor = amplitude * 0.5 + (isProcessing ? 0.3 : 0);
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      let targetRadius = baseRadius;
      
      switch (morphTarget) {
        case 'shield':
          // Flatten into shield shape
          targetRadius = baseRadius * (1 + Math.abs(z) * 0.3);
          break;
        case 'alert':
          // Pulsing alert shape
          targetRadius = baseRadius * (1 + Math.sin(state.clock.elapsedTime * 5) * 0.4);
          break;
        case 'brain':
          // Create brain-like folds
          targetRadius = baseRadius * (1 + Math.sin(x * 3) * Math.cos(y * 3) * 0.2);
          break;
        case 'waveform':
          // Waveform pattern
          targetRadius = baseRadius * (1 + Math.sin(x * 5 + state.clock.elapsedTime * 2) * 0.3);
          break;
        default:
          targetRadius = baseRadius;
      }
      
      const currentRadius = Math.sqrt(x * x + y * y + z * z);
      const scale = targetRadius / currentRadius;
      
      positions[i] = x * scale * (1 + morphFactor);
      positions[i + 1] = y * scale * (1 + morphFactor);
      positions[i + 2] = z * scale * (1 + morphFactor);
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Pulse effect based on amplitude
    const pulse = 1 + amplitude * 0.3;
    pointsRef.current.scale.setScalar(pulse);
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <group>
      {/* Outer particle sphere */}
      <Points ref={pointsRef} positions={particles.positions} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          color={color}
          opacity={0.8}
        />
      </Points>
      
      {/* Inner core mesh */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5 + amplitude * 0.5}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2 + amplitude * 0.3}
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};

export default HolographicCore3D;