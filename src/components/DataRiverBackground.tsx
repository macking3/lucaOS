import React from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import DataRiver from './DataRiver';

interface Props {
  intensity?: number;
}

const DataRiverBackground: React.FC<Props> = ({ intensity = 0.3 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 15], fov: 75 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <ambientLight intensity={0.2} />
        
        <DataRiver intensity={intensity} />
      </Canvas>
    </div>
  );
};

export default DataRiverBackground;

