import React, { useState } from "react";
import { X, Code, Play, Eye, Loader } from "lucide-react";
import { CustomSkill } from "../types";

interface Props {
  skill: CustomSkill;
  onClose: () => void;
  onExecute: (args: any) => Promise<any>;
  themeColors: {
    accent: string;
    glow: string;
    border: string;
    bgTint: string;
    textColor: string;
  };
}

const SkillPreview: React.FC<Props> = ({
  skill,
  onClose,
  onExecute,
  themeColors,
}) => {
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handleTestExecution = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const result = await onExecute(testInputs);
      setExecutionResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setExecutionError(error.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div
        className="bg-black/95 backdrop-blur-2xl rounded-none sm:rounded-xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col"
        style={{
          border: `1px solid ${themeColors.border}`,
          boxShadow: `0 0 50px ${themeColors.glow}`,
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-30 backdrop-blur-xl border-b p-4 sm:p-6 flex items-center justify-between flex-shrink-0"
          style={{
            borderColor: themeColors.border,
            background: `linear-gradient(to right, rgba(0,0,0,0.9), ${themeColors.bgTint})`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <div
              className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              style={{
                backgroundColor: themeColors.bgTint,
                border: `1px solid ${themeColors.border}`,
              }}
            >
              <Eye
                size={20}
                className="sm:size-6"
                style={{ color: themeColors.accent }}
              />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                {skill.name}
              </h2>
              <p className="text-[10px] sm:text-sm text-slate-400 truncate">
                {skill.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 p-2 hover:bg-white/10 rounded-lg transition-all flex-shrink-0 ml-2 cursor-pointer active:scale-95"
          >
            <X
              size={20}
              className="sm:size-6 text-slate-400 hover:text-white"
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div
              className="bg-black/60 rounded-lg p-3 sm:p-4 border"
              style={{ borderColor: themeColors.border }}
            >
              <div className="text-[10px] sm:text-xs text-slate-500 mb-1 uppercase tracking-wider">
                LANGUAGE
              </div>
              <div
                className="text-white font-mono text-xs sm:text-sm"
                style={{ color: themeColors.accent }}
              >
                {skill.language}
              </div>
            </div>
            <div
              className="bg-black/60 rounded-lg p-3 sm:p-4 border"
              style={{ borderColor: themeColors.border }}
            >
              <div className="text-[10px] sm:text-xs text-slate-500 mb-1 uppercase tracking-wider">
                INPUTS
              </div>
              <div
                className="text-white font-mono text-xs sm:text-sm"
                style={{ color: themeColors.accent }}
              >
                {skill.inputs.join(", ") || "None"}
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div>
            <div
              className="text-xs sm:text-sm font-bold mb-2 flex items-center gap-2"
              style={{ color: themeColors.accent }}
            >
              <Code size={14} className="sm:w-4 sm:h-4" />
              CODE
            </div>
            <div
              className="bg-[#1e1e1e] rounded-xl p-3 sm:p-4 overflow-x-auto border"
              style={{ borderColor: themeColors.border }}
            >
              <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap sm:whitespace-pre">
                <code className="text-slate-300">{skill.script}</code>
              </pre>
            </div>
          </div>

          {/* Test Execution */}
          <div
            className="border-t pt-6"
            style={{ borderColor: themeColors.border }}
          >
            <div
              className="text-sm font-bold mb-3 flex items-center gap-2"
              style={{ color: themeColors.accent }}
            >
              <Play size={16} />
              TEST EXECUTION
            </div>

            {/* Input Fields */}
            {skill.inputs.length > 0 && (
              <div className="space-y-3 mb-4">
                {skill.inputs.map((input) => (
                  <div key={input}>
                    <label className="text-xs text-slate-400 mb-1 block uppercase">
                      {input}
                    </label>
                    <input
                      type="text"
                      value={testInputs[input] || ""}
                      onChange={(e) =>
                        setTestInputs({
                          ...testInputs,
                          [input]: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                      style={{
                        border: `1px solid ${themeColors.border}`,
                      }}
                      placeholder={`Enter ${input}...`}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = themeColors.accent;
                        e.currentTarget.style.boxShadow = `0 0 10px ${themeColors.glow}`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = themeColors.border;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleTestExecution}
              disabled={isExecuting}
              className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: isExecuting
                  ? "linear-gradient(to right, #475569, #334155)"
                  : `linear-gradient(to right, ${themeColors.accent}, ${themeColors.accent}dd)`,
                color: isExecuting ? "#64748b" : themeColors.textColor,
                boxShadow: isExecuting
                  ? "none"
                  : `0 0 20px ${themeColors.glow}`,
              }}
            >
              {isExecuting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Test
                </>
              )}
            </button>

            {/* Execution Result */}
            {executionResult && (
              <div className="mt-4">
                <div className="text-xs font-bold text-green-400 mb-2">
                  ✓ EXECUTION SUCCESSFUL
                </div>
                <div
                  className="bg-[#1e1e1e] rounded-lg p-4 border border-green-500/30"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  <pre className="text-sm font-mono text-green-300">
                    {executionResult}
                  </pre>
                </div>
              </div>
            )}

            {/* Execution Error */}
            {executionError && (
              <div className="mt-4">
                <div className="text-xs font-bold text-red-400 mb-2">
                  ✗ EXECUTION FAILED
                </div>
                <div className="bg-[#1e1e1e] rounded-lg p-4 border border-red-500/30">
                  <pre className="text-sm font-mono text-red-300">
                    {executionError}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillPreview;
