import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import * as THREE from 'three';

export interface DroneTask {
  id: string;
  taskName: string;
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  onArrive?: () => void;
  onComplete?: () => void;
  status: 'FLYING' | 'EXECUTING' | 'RETURNING' | 'COMPLETE';
  color?: string;
  progress: number; // Added progress to match usage in ThoughtProcessPanel
}

interface SubAgentDroneProps extends DroneTask { }

const SubAgentDrone: React.FC<SubAgentDroneProps> = ({
  id,
  taskName,
  startPosition,
  targetPosition,
  onArrive,
  onComplete,
  status,
  color = '#06b6d4'
}) => {
  const droneRef = useRef<Mesh>(null);
  const [currentPosition, setCurrentPosition] = useState<Vector3>(
    new Vector3(...startPosition)
  );
  const [hasArrived, setHasArrived] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  const targetVec = new Vector3(...targetPosition);
  const startVec = new Vector3(...startPosition);
  const speed = 0.05;

  // Flight animation
  useFrame((state, delta) => {
    if (!droneRef.current) return;

    const time = state.clock.elapsedTime;

    if (status === 'FLYING') {
      // Fly towards target
      const direction = targetVec.clone().sub(currentPosition);
      const distance = direction.length();

      if (distance > 0.1) {
        direction.normalize();
        currentPosition.add(direction.multiplyScalar(speed));
        setCurrentPosition(currentPosition.clone());
      } else {
        // Arrived at target
        setHasArrived(true);
        onArrive?.();
      }
    } else if (status === 'EXECUTING') {
      // Hover and execute (pulse animation)
      const hover = Math.sin(time * 3) * 0.1;
      currentPosition.y = targetVec.y + hover;

      // Simulate execution progress
      setExecutionProgress(Math.min(executionProgress + delta * 0.5, 1));
    } else if (status === 'RETURNING') {
      // Return to start
      const direction = startVec.clone().sub(currentPosition);
      const distance = direction.length();

      if (distance > 0.1) {
        direction.normalize();
        currentPosition.add(direction.multiplyScalar(speed));
        setCurrentPosition(currentPosition.clone());
      } else {
        // Returned to start
        onComplete?.();
      }
    }

    // Update drone position
    droneRef.current.position.copy(currentPosition);

    // Rotation animation
    droneRef.current.rotation.y = time * 2;
    droneRef.current.rotation.x = Math.sin(time) * 0.2;
  });

  // Status change handler
  useEffect(() => {
    if (status === 'EXECUTING' && !hasArrived) {
      setHasArrived(true);
      onArrive?.();
    }
  }, [status, hasArrived, onArrive]);

  return (
    <group>
      {/* Drone body */}
      <mesh ref={droneRef}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Propeller rings */}
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Trail effect */}
      {status === 'FLYING' || status === 'RETURNING' ? (
        <mesh position={currentPosition.toArray()}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>
      ) : null}

      {/* Execution indicator */}
      {status === 'EXECUTING' && (
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5 + executionProgress * 0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
};

export default SubAgentDrone;
