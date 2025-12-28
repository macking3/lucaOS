import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { X, BrainCircuit, Network, Activity } from 'lucide-react';
import ThoughtGraph, { ThoughtNode } from './ThoughtGraph';
import ExecutionPipeline from './ExecutionPipeline';
import SubAgentDrone, { DroneTask } from './SubAgentDrone';

interface ThoughtProcessPanelProps {
  nodes: ThoughtNode[];
  drones?: DroneTask[];
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

const ThoughtProcessPanel: React.FC<ThoughtProcessPanelProps> = ({
  nodes,
  drones = [],
  onClose,
  onNodeClick
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'pipeline' | 'drones'>('graph');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300 font-mono">
      <div className="relative w-[95%] h-[90%] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] rounded-sm flex flex-col overflow-hidden bg-[#050505]">

        {/* Header */}
        <div className="h-14 border-b border-cyan-900 bg-cyan-950/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <BrainCircuit className="text-cyan-500 animate-pulse" size={20} />
            <div>
              <h2 className="text-lg font-bold text-cyan-500 tracking-[0.2em]">THOUGHT PROCESS</h2>
              <div className="text-[10px] text-cyan-700 flex gap-4">
                <span>NODES: {nodes.length}</span>
                <span>DRONES: {drones.length}</span>
                <span>MODE: {viewMode.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* View mode switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === 'graph'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
            >
              <Network size={12} className="inline mr-1" />
              GRAPH
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === 'pipeline'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
            >
              <Activity size={12} className="inline mr-1" />
              PIPELINE
            </button>
            <button
              onClick={() => setViewMode('drones')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === 'drones'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
            >
              DRONES
            </button>
          </div>

          <button onClick={onClose} className="text-cyan-700 hover:text-cyan-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'graph' && (
            <div className="w-full h-full">
              <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 8], fov: 50 }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 8]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />

                <ThoughtGraph
                  nodes={nodes}
                  onNodeClick={onNodeClick}
                />

                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  autoRotate={false}
                />
              </Canvas>
            </div>
          )}

          {viewMode === 'pipeline' && (
            <div className="w-full h-full overflow-y-auto p-6">
              <ExecutionPipeline
                steps={nodes.map(n => ({
                  ...n,
                  status: n.status === 'PROCESSING' ? 'PROCESSING' : n.status === 'ERROR' ? 'ERROR' : n.status === 'SUCCESS' ? 'SUCCESS' : n.status === 'COMPLETE' ? 'COMPLETE' : 'PENDING'
                }))}
                currentStep={nodes.find(n => n.status === 'PROCESSING' || n.status === 'processing' as any)?.id}
              />
            </div>
          )}

          {viewMode === 'drones' && drones.length > 0 && (
            <div className="w-full h-full">
              <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 10], fov: 50 }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {drones.map((drone) => (
                  <SubAgentDrone
                    key={drone.id}
                    {...drone}
                  />
                ))}

                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  autoRotate={false}
                />
              </Canvas>

              {/* Drone list overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-cyan-500/30 p-4 rounded">
                <div className="text-xs font-bold text-cyan-400 mb-2">ACTIVE DRONES</div>
                <div className="space-y-1">
                  {drones.map((drone) => (
                    <div key={drone.id} className="text-[10px] text-gray-400">
                      {drone.taskName} - {drone.status.toUpperCase()} ({Math.round(drone.progress * 100)}%)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'drones' && drones.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">🚁</div>
                <div className="text-sm">No active drones</div>
                <div className="text-xs opacity-70 mt-2">Drones appear when parallel tasks are executed</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThoughtProcessPanel;

