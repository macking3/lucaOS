import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { ThoughtNode } from "./ThoughtGraph";
import { NodeStatus } from "./TaskNode";

interface ThoughtGraphMobileProps {
  nodes: ThoughtNode[];
  onNodeClick?: (nodeId: string) => void;
  themePrimary?: string;
}

const ThoughtGraphMobile: React.FC<ThoughtGraphMobileProps> = ({
  nodes,
  onNodeClick,
  themePrimary = "text-cyan-400",
}) => {
  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETE":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "ERROR":
        return <XCircle size={14} className="text-rose-500" />;
      case "PROCESSING":
        return <Loader2 size={14} className="text-amber-500 animate-spin" />;
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  const getStatusBorder = (status: NodeStatus) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETE":
        return "border-emerald-500/50";
      case "ERROR":
        return "border-rose-500/50";
      case "PROCESSING":
        return "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
      default:
        return "border-white/10";
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-black font-mono space-y-4 p-4 scrollbar-none">
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
          <Loader2 className="animate-spin" size={24} />
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold">
            Awaiting Neural Sequence...
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {nodes.map((node, index) => {
            const hasParent = nodes.some((n) => n.id === node.parentId);

            return (
              <div key={node.id} className="relative pl-4">
                {/* Vertical connection line */}
                {index < nodes.length - 1 && (
                  <div className="absolute left-[7px] top-6 bottom-[-20px] w-px bg-white/5"></div>
                )}

                <button
                  onClick={() => onNodeClick?.(node.id)}
                  className={`
                    w-full group relative flex flex-col p-3 rounded-sm border transition-all duration-300
                    bg-white/[0.02] hover:bg-white/[0.05] active:scale-[0.98]
                    ${getStatusBorder(node.status)}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getStatusIcon(node.status)}
                      <span className="font-bold text-[11px] text-white tracking-wider truncate uppercase">
                        {node.label}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 tabular-nums">
                      {new Date(node.timestamp).toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {node.toolName && (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
                        <span className="text-[9px] font-bold text-cyan-400 opacity-80 uppercase tracking-tighter">
                          ENGINE: {node.toolName}
                        </span>
                      </div>
                    )}

                    {node.details && (
                      <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 border-l border-white/5 pl-2">
                        {node.details}
                      </div>
                    )}
                  </div>

                  <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={12} className="text-slate-600" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThoughtGraphMobile;
