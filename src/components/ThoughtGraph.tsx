import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import TaskNode, { NodeStatus } from './TaskNode';
import ConnectionBeam from './ConnectionBeam';

export interface ThoughtNode {
  id: string;
  label: string;
  toolName?: string;
  status: NodeStatus;
  position?: [number, number, number];
  details?: string;
  parentId?: string;
  timestamp: number;
}

interface ThoughtGraphProps {
  nodes: ThoughtNode[];
  onNodeClick?: (nodeId: string) => void;
  autoLayout?: boolean;
}

const ThoughtGraph: React.FC<ThoughtGraphProps> = ({
  nodes,
  onNodeClick,
  autoLayout = true
}) => {
  // Auto-layout nodes in a tree structure
  const layoutedNodes = useMemo(() => {
    if (!autoLayout) return nodes;

    const rootNodes = nodes.filter(n => !n.parentId);
    const childNodes = nodes.filter(n => n.parentId);
    
    const positioned: ThoughtNode[] = [];
    const levelMap = new Map<string, number>();
    const levelCounts = new Map<number, number>();

    // Calculate levels
    const calculateLevel = (nodeId: string, level: number = 0): number => {
      if (levelMap.has(nodeId)) return levelMap.get(nodeId)!;
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node || !node.parentId) {
        levelMap.set(nodeId, level);
        return level;
      }
      
      const parentLevel = calculateLevel(node.parentId, level + 1);
      levelMap.set(nodeId, parentLevel);
      return parentLevel;
    };

    nodes.forEach(node => {
      const level = calculateLevel(node.id);
      const count = levelCounts.get(level) || 0;
      levelCounts.set(level, count + 1);
    });

    // Position nodes
    nodes.forEach(node => {
      const level = levelMap.get(node.id) || 0;
      const levelCount = levelCounts.get(level) || 1;
      const index = nodes.filter(n => (levelMap.get(n.id) || 0) === level && n.timestamp <= node.timestamp).length - 1;
      
      const x = (index - (levelCount - 1) / 2) * 2;
      const y = -level * 1.5;
      const z = 0;

      positioned.push({
        ...node,
        position: [x, y, z] as [number, number, number]
      });
    });

    return positioned;
  }, [nodes, autoLayout]);

  // Build connections
  const connections = useMemo(() => {
    const conns: Array<{ from: string; to: string; status: 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'ERROR' }> = [];
    
    layoutedNodes.forEach(node => {
      if (node.parentId) {
        const parent = layoutedNodes.find(n => n.id === node.parentId);
        if (parent && parent.position && node.position) {
          const status = 
            node.status === 'ERROR' ? 'ERROR' :
            node.status === 'COMPLETE' || node.status === 'SUCCESS' ? 'COMPLETE' :
            node.status === 'PROCESSING' ? 'ACTIVE' : 'PENDING';
          
          conns.push({
            from: node.parentId,
            to: node.id,
            status
          });
        }
      }
    });

    return conns;
  }, [layoutedNodes]);

  return (
    <div className="w-full h-full bg-black/50">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 8], fov: 50 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />
        
        {/* Grid helper */}
        <gridHelper args={[10, 10, '#1e293b', '#0f172a']} />

        {/* Render connections */}
        {connections.map((conn, idx) => {
          const fromNode = layoutedNodes.find(n => n.id === conn.from);
          const toNode = layoutedNodes.find(n => n.id === conn.to);
          
          if (!fromNode?.position || !toNode?.position) return null;

          return (
            <ConnectionBeam
              key={`${conn.from}-${conn.to}-${idx}`}
              from={fromNode.position}
              to={toNode.position}
              status={conn.status}
              animated={conn.status === 'ACTIVE'}
            />
          );
        })}

        {/* Render nodes */}
        {layoutedNodes.map((node) => {
          if (!node.position) return null;
        
        return (
          <TaskNode
            key={node.id}
              position={node.position}
              label={node.label}
              status={node.status}
              toolName={node.toolName}
              details={node.details}
            onClick={() => onNodeClick?.(node.id)}
          />
        );
      })}

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default ThoughtGraph;
