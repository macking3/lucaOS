import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export type StepStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR"
  | "SKIPPED"
  | "COMPLETE";

export interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
  toolName?: string;
  details?: string;
  duration?: number;
  error?: string;
}

interface ExecutionPipelineProps {
  steps: PipelineStep[];
  currentStep?: string;
  onStepClick?: (stepId: string) => void;
}

const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <CheckCircle2 size={12} className="text-green-500 sm:w-4 sm:h-4" />
        );
      case "ERROR":
        return <XCircle size={12} className="text-red-500 sm:w-4 sm:h-4" />;
      case "PROCESSING":
        return (
          <Loader2
            size={12}
            className="text-yellow-500 animate-spin sm:w-4 sm:h-4"
          />
        );
      case "SKIPPED":
        return (
          <AlertTriangle size={12} className="text-slate-500 sm:w-4 sm:h-4" />
        );
      default:
        return <Clock size={12} className="text-slate-500 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case "SUCCESS":
        return "border-green-500 bg-green-500/10";
      case "ERROR":
        return "border-red-500 bg-red-500/10";
      case "PROCESSING":
        return "border-yellow-500 bg-yellow-500/10 animate-pulse";
      case "SKIPPED":
        return "border-slate-500 bg-slate-500/10";
      default:
        return "border-slate-700 bg-slate-700/10";
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted =
          step.status === "SUCCESS" || step.status === "ERROR";
        const showConnector = index < steps.length - 1;

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick?.(step.id)}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
                  transition-all duration-300
                  ${getStatusColor(step.status)}
                  ${isActive ? "scale-110 shadow-lg" : ""}
                  ${onStepClick ? "cursor-pointer hover:scale-105" : ""}
                `}
              >
                {getStatusIcon(step.status)}
              </button>

              {/* Connector line */}
              {showConnector && (
                <div
                  className={`
                    w-0.5 h-8 sm:h-12 mt-1 sm:mt-2 transition-all duration-500
                    ${
                      isCompleted
                        ? "bg-green-500"
                        : step.status === "ERROR"
                        ? "bg-red-500"
                        : "bg-slate-700"
                    }
                  `}
                />
              )}
            </div>

            {/* Step content */}
            <div
              className={`
                flex-1 p-3 rounded border transition-all duration-300
                ${getStatusColor(step.status)}
                ${isActive ? "shadow-lg scale-105" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-white">
                  {step.label}
                </span>
                {step.duration && (
                  <span className="text-xs text-slate-400">
                    {step.duration.toFixed(2)}s
                  </span>
                )}
              </div>

              {step.toolName && (
                <div className="text-xs text-slate-400 mb-1">
                  Tool: <span className="text-cyan-400">{step.toolName}</span>
                </div>
              )}

              {step.details && (
                <div className="text-xs text-slate-300 mt-1">
                  {step.details}
                </div>
              )}

              {step.error && (
                <div className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded border border-red-500/30">
                  {step.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExecutionPipeline;
