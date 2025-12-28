import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import HolographicCore3D from './HolographicCore3D';

interface Props {
  status: 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'LOCKED';
  amplitude: number;
  isProcessing: boolean;
}

const HolographicCoreWrapper: React.FC<Props> = ({ status, amplitude, isProcessing }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />
        
        <HolographicCore3D 
          status={status} 
          amplitude={amplitude} 
          isProcessing={isProcessing} 
        />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default HolographicCoreWrapper;

