
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConnectionBeamProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  animated?: boolean;
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'ERROR';
}

const ConnectionBeam: React.FC<ConnectionBeamProps> = ({
  from,
  to,
  color = '#06b6d4',
  animated = true,
  status = 'PENDING'
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  // Create line geometry
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...from),
      new THREE.Vector3(...to)
    ]);
    return curve.getPoints(50);
  }, [from, to]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  // Animation
  useFrame((state) => {
    if (!materialRef.current || !animated) return;

    const time = state.clock.elapsedTime;

    // Animate opacity based on status
    if (status === 'ACTIVE') {
      materialRef.current.opacity = 0.8 + Math.sin(time * 5) * 0.2;
    } else if (status === 'COMPLETE') {
      materialRef.current.opacity = 0.6;
    } else if (status === 'ERROR') {
      materialRef.current.opacity = 0.4;
    } else {
      materialRef.current.opacity = 0.3;
    }

    // Color pulse for active connections
    if (status === 'ACTIVE') {
      const intensity = 0.5 + Math.sin(time * 3) * 0.3;
      materialRef.current.color.set(color).multiplyScalar(intensity);
    }
  });

  // Get color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'ACTIVE': return color;
      case 'COMPLETE': return '#10b981'; // Green
      case 'ERROR': return '#ef4444'; // Red
      default: return '#64748b'; // Slate
    }
  };

  return (
    // @ts-ignore
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        ref={materialRef}
        color={getStatusColor()}
        transparent
        opacity={status === 'ACTIVE' ? 0.8 : 0.3}
        linewidth={2}
      />
    </line>
  );
};

export default ConnectionBeam;