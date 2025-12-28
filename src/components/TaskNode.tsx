import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

export type NodeStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'COMPLETE';

interface TaskNodeProps {
  position: [number, number, number];
  label: string;
  status: NodeStatus;
  toolName?: string;
  details?: string;
  onClick?: () => void;
  scale?: number;
}

const TaskNode: React.FC<TaskNodeProps> = ({
  position,
  label,
  status,
  toolName,
  details,
  onClick,
  scale = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Get color based on status
  const getColor = () => {
    switch (status) {
      case 'PENDING': return '#64748b'; // Slate
      case 'PROCESSING': return '#f59e0b'; // Amber/Yellow
      case 'SUCCESS': return '#10b981'; // Green
      case 'ERROR': return '#ef4444'; // Red
      case 'COMPLETE': return '#06b6d4'; // Cyan
      default: return '#64748b';
    }
  };

  const color = getColor();
  const isActive = status === 'PROCESSING' || status === 'ERROR';

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    setPulsePhase(time);

    // Pulse animation for active nodes
    if (isActive) {
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      meshRef.current.scale.setScalar(scale * pulse);
    } else {
      meshRef.current.scale.setScalar(scale);
    }

    // Hover effect
    if (hovered) {
      meshRef.current.position.y = position[1] + 0.2;
    } else {
      meshRef.current.position.y = position[1];
    }
  });

  // Flash effect for status changes
  useEffect(() => {
    if (status === 'SUCCESS' || status === 'ERROR') {
      // Quick flash animation
      const flash = setTimeout(() => {
        // Flash handled by material emissive
      }, 100);
      return () => clearTimeout(flash);
    }
  }, [status]);

  return (
    <group position={position}>
      {/* Main node sphere */}
      <Sphere
        ref={meshRef}
        args={[0.3, 16, 16]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.8 + Math.sin(pulsePhase * 3) * 0.2 : 0.3}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Outer glow ring for processing/error */}
      {(status === 'PROCESSING' || status === 'ERROR') && (
        <Sphere args={[0.4, 16, 16]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            transparent
            opacity={0.3}
            wireframe
          />
        </Sphere>
      )}

      {/* Label text */}
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {label}
      </Text>

      {/* Tool name (smaller, below label) */}
      {toolName && (
        <Text
          position={[0, -0.85, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {toolName}
        </Text>
      )}

      {/* Status indicator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

export default TaskNode;
