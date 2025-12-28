import React, { useState, useEffect } from "react";
import {
  Terminal,
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  X,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface Goal {
  id: string;
  description: string;
  type: "ONCE" | "RECURRING";
  schedule: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  createdAt: number;
  lastRun: number | null;
  logs: { timestamp: number; message: string }[];
}

export const AutonomyDashboard: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalSchedule, setNewGoalSchedule] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch(apiUrl("/api/goals/list"));
      const data = await res.json();
      setGoals(data);
    } catch (e) {
      console.error("Failed to fetch goals", e);
    }
  };

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const addGoal = async () => {
    if (!newGoalDesc) return;
    setLoading(true);
    try {
      await fetch(apiUrl("/api/goals/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newGoalDesc,
          type: newGoalSchedule ? "RECURRING" : "ONCE",
          schedule: newGoalSchedule || null,
        }),
      });
      setNewGoalDesc("");
      setNewGoalSchedule("");
      fetchGoals();
    } catch (e) {
      console.error("Failed to add goal", e);
    }
    setLoading(false);
  };

  const deleteGoal = async (id: string) => {
    try {
      await fetch(apiUrl("/api/goals/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchGoals();
    } catch (e) {
      console.error("Failed to delete goal", e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 font-mono">
      <div className="w-full h-full sm:h-auto sm:max-w-4xl bg-gray-900 border-none sm:border border-cyan-500/30 rounded-none sm:rounded-lg shadow-2xl overflow-hidden flex flex-col h-full sm:h-[80vh]">
        {/* Header */}
        <div className="bg-gray-800/50 p-4 border-b border-cyan-500/30 flex justify-between items-center flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-bold text-cyan-100 tracking-wider">
              AUTONOMY MATRIX
            </h2>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 p-2 text-gray-400 hover:text-white transition-all rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={20} className="sm:size-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar / Stats */}
          <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-cyan-500/20 p-4 sm:p-6 bg-black/20 flex-shrink-0">
            <div className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-4">
              <div className="bg-gray-800/40 p-3 rounded border border-cyan-500/10">
                <div className="text-[10px] sm:text-xs text-gray-400">
                  HEARTBEAT
                </div>
                <div className="text-green-400 font-bold flex items-center gap-2 text-xs sm:text-sm">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-ping"></div>
                  ACTIVE
                </div>
              </div>
              <div className="bg-gray-800/40 p-3 rounded border border-cyan-500/10">
                <div className="text-[10px] sm:text-xs text-gray-400">
                  ACTIVE GOALS
                </div>
                <div className="text-xl sm:text-2xl text-white font-bold">
                  {goals.filter((g) => g.status !== "COMPLETED").length}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] sm:text-xs font-bold text-cyan-500 uppercase mb-2">
                Add New Directive
              </h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  placeholder="Goal Description..."
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs sm:text-sm text-white focus:border-cyan-500 outline-none"
                />
                <input
                  type="text"
                  value={newGoalSchedule}
                  onChange={(e) => setNewGoalSchedule(e.target.value)}
                  placeholder="Schedule (Optional)"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs sm:text-sm text-white focus:border-cyan-500 outline-none"
                />
                <button
                  onClick={addGoal}
                  disabled={loading || !newGoalDesc}
                  className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 py-2 rounded flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  INJECT GOAL
                </button>
              </div>
            </div>
          </div>

          {/* Main List */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-black/40">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase">
                Active Directives
              </h3>
              <button
                onClick={fetchGoals}
                className="text-cyan-500 hover:text-cyan-300"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          goal.status === "COMPLETED"
                            ? "bg-green-500"
                            : goal.status === "IN_PROGRESS"
                            ? "bg-yellow-500"
                            : goal.status === "FAILED"
                            ? "bg-red-500"
                            : "bg-gray-500"
                        }`}
                      />
                      <span className="font-bold text-white">
                        {goal.description}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="bg-gray-800 px-2 py-1 rounded border border-gray-700">
                      {goal.type}
                    </span>
                    {goal.schedule && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {goal.schedule}
                      </span>
                    )}
                    <span>ID: {goal.id.slice(0, 8)}</span>
                  </div>

                  {/* Mini Logs */}
                  {goal.logs.length > 0 && (
                    <div className="mt-3 bg-black/30 rounded p-2 text-xs font-mono text-gray-400 max-h-20 overflow-y-auto">
                      {goal.logs.slice(-3).map((log, i) => (
                        <div key={i} className="truncate">
                          <span className="text-gray-600">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>{" "}
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {goals.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No active directives found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
