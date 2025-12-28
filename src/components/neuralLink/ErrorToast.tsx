import React, { useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { ErrorSeverity } from "../../services/neuralLink/types";
import type { NeuralLinkError } from "../../services/neuralLink/types";

interface ErrorToastProps {
  error: NeuralLinkError;
  onRetry?: () => void;
  onDismiss: () => void;
  autoClose?: boolean;
  duration?: number;
  themePrimary?: string;
  themeBorder?: string;
  themeBg?: string;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onRetry,
  onDismiss,
  autoClose = true,
  duration = 5000,
  themePrimary = "text-cyan-400",
  themeBorder = "border-cyan-500",
  themeBg = "bg-cyan-950/10",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    if (autoClose && error.severity !== ErrorSeverity.CRITICAL) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, error.severity]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300);
  };

  const getConfig = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return {
          icon: XCircle,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/50",
          textColor: "text-red-400",
          glowColor: "rgba(239, 68, 68, 0.2)",
        };
      case ErrorSeverity.ERROR:
        return {
          icon: AlertCircle,
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/50",
          textColor: "text-orange-400",
          glowColor: "rgba(249, 115, 22, 0.2)",
        };
      case ErrorSeverity.WARNING:
        return {
          icon: AlertTriangle,
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/50",
          textColor: "text-yellow-400",
          glowColor: "rgba(234, 179, 8, 0.2)",
        };
      case ErrorSeverity.INFO:
        return {
          icon: Info,
          bgColor: themeBg,
          borderColor: themeBorder.includes("#")
            ? `${themeBorder}80`
            : `${themeBorder}/50`,
          textColor: themePrimary,
          glowColor: themeBorder.includes("#")
            ? `${themeBorder}33`
            : "rgba(6, 182, 212, 0.2)",
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999]
        w-[calc(100vw-2rem)] sm:w-96
        transition-all duration-300 ease-out
        ${
          isVisible && !isExiting
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }
      `}
      style={{
        boxShadow: `0 0 30px ${config.glowColor}`,
      }}
    >
      <div
        className={`
          bg-black/95 backdrop-blur-md
          border ${config.borderColor}
          rounded-lg
          p-3 sm:p-4
          relative
          overflow-hidden
        `}
      >
        {/* Progress bar for auto-close */}
        {autoClose && error.severity !== ErrorSeverity.CRITICAL && (
          <div
            className={`absolute bottom-0 left-0 h-0.5 ${config.borderColor.replace(
              "/50",
              ""
            )} transition-all`}
            style={{
              width: "100%",
              animation: `shrink ${duration}ms linear`,
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-start gap-2 sm:gap-3 mb-2">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.textColor}`}>
            <Icon size={18} className="sm:w-5 sm:h-5" />
          </div>

          {/* Title & Code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-mono font-bold text-xs sm:text-sm ${config.textColor} uppercase`}
              >
                {error.message.split(".")[0]}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-gray-500">
                [{error.code}]
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1
              ${config.textColor} hover:text-white
              transition-all
              hover:bg-white/5 rounded
              active:scale-95
            `}
          >
            <X size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-gray-300 mb-3 pl-7 sm:pl-8">
          {error.message}
        </p>

        {/* Suggested Action */}
        {error.suggestedAction && (
          <p className="text-[10px] sm:text-xs text-gray-500 italic mb-3 pl-7 sm:pl-8">
            💡 {error.suggestedAction}
          </p>
        )}

        {/* Actions */}
        {(error.retryable || onRetry) && (
          <div className="flex gap-2 pl-7 sm:pl-8">
            {onRetry && error.retryable && (
              <button
                onClick={() => {
                  onRetry();
                  handleDismiss();
                }}
                className={`
                  flex items-center gap-1.5
                  px-2.5 sm:px-3 py-1 sm:py-1.5
                  text-[10px] sm:text-xs font-mono font-medium
                  ${config.bgColor} ${config.borderColor} ${config.textColor}
                  border rounded
                  hover:brightness-110
                  active:scale-95
                  transition-all
                  uppercase tracking-wider
                `}
              >
                <RefreshCw size={10} className="sm:w-3 sm:h-3" />
                RETRY
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="
                px-2.5 sm:px-3 py-1 sm:py-1.5
                text-[10px] sm:text-xs font-mono font-medium
                bg-gray-500/10 border border-gray-500/30 text-gray-400
                rounded
                hover:bg-gray-500/20
                active:scale-95
                transition-all
                uppercase tracking-wider
              "
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Technical Details (collapsible on mobile) */}
        {error.technicalDetails && (
          <details className="mt-3 pl-7 sm:pl-8">
            <summary className="text-[9px] sm:text-[10px] text-gray-600 cursor-pointer hover:text-gray-500 font-mono uppercase">
              Technical Details
            </summary>
            <pre className="mt-1 text-[9px] sm:text-[10px] text-gray-600 font-mono overflow-x-auto">
              {error.technicalDetails}
            </pre>
          </details>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

// Toast Container for managing multiple toasts
interface ErrorToastContainerProps {
  errors: NeuralLinkError[];
  onRetry?: (error: NeuralLinkError) => void;
  onDismiss: (error: NeuralLinkError) => void;
}

export const ErrorToastContainer: React.FC<ErrorToastContainerProps> = ({
  errors,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      <div className="flex flex-col gap-2 sm:gap-3 p-4 pointer-events-auto">
        {errors.map((error, index) => (
          <div
            key={`${error.code}-${error.timestamp.getTime()}-${index}`}
            style={{ transform: `translateY(${index * 4}px)` }}
          >
            <ErrorToast
              error={error}
              onRetry={onRetry ? () => onRetry(error) : undefined}
              onDismiss={() => onDismiss(error)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
