import React from "react";
import { Wifi, WifiOff, Loader, AlertCircle, Activity } from "lucide-react";
import { ConnectionState } from "../../services/neuralLink/types";

interface ConnectionStatusProps {
  state: ConnectionState;
  latency?: number;
  onDetailsClick?: () => void;
  themePrimary?: string;
  themeBorder?: string;
  themeBg?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  latency,
  onDetailsClick,
  themePrimary = "text-cyan-400",
  themeBorder = "border-cyan-500",
  themeBg = "bg-cyan-950/10",
}) => {
  const getStatusConfig = () => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return {
          icon: Wifi,
          label: "CONNECTED",
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/50",
          dotColor: "bg-green-400",
          animation: "animate-pulse",
        };
      case ConnectionState.CONNECTING:
      case ConnectionState.HANDSHAKING:
      case ConnectionState.AUTHENTICATING:
        return {
          icon: Loader,
          label: "CONNECTING",
          color: themePrimary,
          bgColor: themeBg,
          borderColor: themeBorder.includes("#")
            ? `${themeBorder}80`
            : `${themeBorder}/50`,
          dotColor: themePrimary.replace("text-", "bg-"),
          animation: "animate-spin",
        };
      case ConnectionState.RECONNECTING:
        return {
          icon: Activity,
          label: "RECONNECTING",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/50",
          dotColor: "bg-yellow-400",
          animation: "animate-pulse",
        };
      case ConnectionState.DISCONNECTED:
      case ConnectionState.ERROR:
        return {
          icon: WifiOff,
          label: "DISCONNECTED",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/50",
          dotColor: "bg-red-400",
          animation: "",
        };
      case ConnectionState.DEGRADED:
        return {
          icon: AlertCircle,
          label: "DEGRADED",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/50",
          dotColor: "bg-orange-400",
          animation: "animate-pulse",
        };
      default:
        return {
          icon: WifiOff,
          label: "UNKNOWN",
          color: "text-gray-400",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/50",
          dotColor: "bg-gray-400",
          animation: "",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-center gap-1.5 sm:gap-2 
        px-2 sm:px-3 py-1 sm:py-1.5 
        rounded-full 
        text-[9px] sm:text-[10px] 
        font-mono font-medium 
        border 
        ${config.bgColor} 
        ${config.borderColor} 
        ${config.color}
        transition-all duration-300
        ${onDetailsClick ? "cursor-pointer hover:brightness-110" : ""}
      `}
      onClick={onDetailsClick}
    >
      {/* Animated Dot */}
      <div className="relative flex items-center justify-center w-2 h-2 sm:w-2.5 sm:h-2.5">
        <div
          className={`absolute w-full h-full ${config.dotColor} rounded-full ${config.animation}`}
        />
        <div
          className={`absolute w-full h-full ${config.dotColor} rounded-full opacity-50 blur-[2px]`}
        />
      </div>

      {/* Icon */}
      <Icon size={10} className={`sm:w-3 sm:h-3 ${config.animation}`} />

      {/* Status Text - Hidden on very small screens */}
      <span className="hidden xs:inline uppercase tracking-wider">
        {config.label}
      </span>

      {/* Latency - Desktop only */}
      {latency !== undefined && state === ConnectionState.CONNECTED && (
        <span className="hidden sm:inline text-[9px] opacity-70">
          · {latency}ms
        </span>
      )}

      {/* Encrypted Badge - Desktop only */}
      {state === ConnectionState.CONNECTED && (
        <span className="hidden md:inline text-[9px] opacity-70">
          · ENCRYPTED
        </span>
      )}
    </div>
  );
};
