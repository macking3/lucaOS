import React from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  X,
  RefreshCw,
  Zap,
  Clock,
} from "lucide-react";
import type { Device } from "../../services/neuralLink/types";

interface DeviceListProps {
  devices: Device[];
  onDeviceAction: (
    deviceId: string,
    action: "test" | "unpair" | "reconnect"
  ) => void;
  themePrimary?: string;
  themeBorder?: string;
  themeBg?: string;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  onDeviceAction,
  themePrimary = "text-cyan-400",
  themeBorder = "border-cyan-500",
  themeBg = "bg-cyan-950/10",
}) => {
  const getDeviceIcon = (type: Device["type"]) => {
    switch (type) {
      case "mobile":
        return Smartphone;
      case "tablet":
        return Tablet;
      case "desktop":
        return Monitor;
      default:
        return Smartphone;
    }
  };

  const getBatteryIcon = (level?: number) => {
    if (!level) return null;
    if (level < 20) return BatteryLow;
    if (level < 50) return BatteryMedium;
    if (level < 80) return Battery;
    return BatteryFull;
  };

  const getSignalIcon = (network?: string) => {
    if (!network || network === "offline") return null;
    if (network === "wifi") return Signal;
    if (network === "5g") return SignalHigh;
    if (network === "4g") return SignalMedium;
    return SignalLow;
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = Date.now();
    const diff = now - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTrustColor = (trustLevel: number) => {
    if (trustLevel >= 80) return { bg: "bg-green-500", text: "text-green-400" };
    if (trustLevel >= 60)
      return {
        bg: `${themeBorder.replace("border-", "bg-")}`,
        text: themePrimary,
      };
    if (trustLevel >= 40)
      return { bg: "bg-yellow-500", text: "text-yellow-400" };
    return { bg: "bg-red-500", text: "text-red-400" };
  };

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center">
        <div className={`mb-3 sm:mb-4 ${themePrimary} opacity-50`}>
          <Smartphone size={32} className="sm:w-12 sm:h-12" />
        </div>
        <p className="text-sm sm:text-base text-gray-400 font-mono mb-2">
          NO DEVICES LINKED
        </p>
        <p className="text-xs sm:text-sm text-gray-600">
          Scan the QR code above to pair your mobile device
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3
          className={`text-xs sm:text-sm font-mono font-bold ${themePrimary} uppercase tracking-wider`}
        >
          🔗 Connected Devices ({devices.length})
        </h3>
      </div>

      {/* Device Cards */}
      <div className="space-y-2">
        {devices.map((device) => {
          const DeviceIcon = getDeviceIcon(device.type);
          const BatteryIcon = getBatteryIcon(device.metadata.battery);
          const SignalIcon = getSignalIcon(device.metadata.network);
          const trustColors = getTrustColor(device.trustLevel);
          const isOnline = device.status === "online";

          return (
            <div
              key={device.id}
              className={`
                bg-black/40 backdrop-blur-sm
                border ${isOnline ? themeBorder + "/30" : "border-gray-700/30"}
                rounded-lg
                p-3 sm:p-4
                transition-all duration-300
                ${isOnline ? "hover:" + themeBorder + "/50" : ""}
              `}
              style={{
                boxShadow: isOnline
                  ? `0 0 20px ${
                      themeBorder.includes("#")
                        ? themeBorder
                        : "rgba(6,182,212,0.1)"
                    }1a`
                  : "none",
              }}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Device Icon */}
                  <div
                    className={`flex-shrink-0 ${
                      isOnline ? themePrimary : "text-gray-600"
                    }`}
                  >
                    <DeviceIcon size={18} className="sm:w-5 sm:h-5" />
                  </div>

                  {/* Device Name & Platform */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-mono font-bold text-xs sm:text-sm ${
                        isOnline ? "text-white" : "text-gray-500"
                      } truncate`}
                    >
                      {device.name}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-gray-600 uppercase">
                      {device.platform}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`
                      flex-shrink-0 flex items-center gap-1
                      px-1.5 sm:px-2 py-0.5 sm:py-1
                      rounded-full
                      text-[8px] sm:text-[9px] font-mono font-bold
                      uppercase tracking-wider
                      ${
                        isOnline
                          ? "bg-green-500/20 border border-green-500/50 text-green-400"
                          : "bg-gray-700/20 border border-gray-700/50 text-gray-600"
                      }
                    `}
                  >
                    {isOnline ? (
                      <>
                        <Wifi size={8} className="sm:w-2.5 sm:h-2.5" />
                        <span className="hidden xs:inline">ONLINE</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={8} className="sm:w-2.5 sm:h-2.5" />
                        <span className="hidden xs:inline">OFFLINE</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap text-[9px] sm:text-[10px] text-gray-500 font-mono">
                {/* Network */}
                {SignalIcon && (
                  <div className="flex items-center gap-1">
                    <SignalIcon size={10} className="sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline uppercase">
                      {device.metadata.network}
                    </span>
                  </div>
                )}

                {/* Battery */}
                {BatteryIcon && device.metadata.battery !== undefined && (
                  <div
                    className={`flex items-center gap-1 ${
                      device.metadata.battery < 20
                        ? "text-red-400"
                        : device.metadata.battery < 50
                        ? "text-yellow-400"
                        : "text-gray-500"
                    }`}
                  >
                    <BatteryIcon size={10} className="sm:w-3 sm:h-3" />
                    <span>{device.metadata.battery}%</span>
                  </div>
                )}

                {/* Last Seen */}
                <div className="flex items-center gap-1">
                  <Clock size={10} className="sm:w-3 sm:h-3" />
                  <span>{formatLastSeen(device.lastSeen)}</span>
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="mb-2 sm:mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono uppercase">
                    Trust Level
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono font-bold ${trustColors.text}`}
                  >
                    {device.trustLevel}%
                  </span>
                </div>
                <div className="h-1 sm:h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${trustColors.bg} transition-all duration-500`}
                    style={{ width: `${device.trustLevel}%` }}
                  />
                </div>
              </div>

              {/* Capabilities (Mobile: show count, Desktop: show list) */}
              <div className="mb-3 sm:mb-4">
                <div className="text-[9px] sm:text-[10px] text-gray-600 font-mono uppercase mb-1">
                  Capabilities ({device.capabilities.length})
                </div>
                <div className="hidden sm:flex flex-wrap gap-1">
                  {device.capabilities.slice(0, 6).map((cap) => (
                    <span
                      key={cap}
                      className={`
                        px-1.5 py-0.5
                        text-[8px] font-mono
                        ${themeBg} ${themePrimary}
                        border rounded
                        uppercase
                      `}
                      style={{
                        borderColor: themeBorder.includes("#")
                          ? `${themeBorder}33`
                          : undefined,
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                  {device.capabilities.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-gray-600">
                      +{device.capabilities.length - 6} more
                    </span>
                  )}
                </div>
                {/* Mobile: just show first 3 */}
                <div className="flex sm:hidden flex-wrap gap-1">
                  {device.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className={`
                        px-1.5 py-0.5
                        text-[8px] font-mono
                        ${themeBg} ${themePrimary}
                        border rounded
                        uppercase
                      `}
                      style={{
                        borderColor: themeBorder.includes("#")
                          ? `${themeBorder}33`
                          : undefined,
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                  {device.capabilities.length > 3 && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-gray-600">
                      +{device.capabilities.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Test Button - Online only */}
                {isOnline && (
                  <button
                    onClick={() => onDeviceAction(device.id, "test")}
                    className={`
                        flex-1 sm:flex-none
                        flex items-center justify-center gap-1.5
                        px-2.5 sm:px-3 py-1.5 sm:py-2
                        text-[10px] sm:text-xs font-mono font-medium
                        ${themeBg} ${themePrimary}
                        border rounded
                        hover:opacity-80
                        active:scale-[0.98]
                        transition-all
                        uppercase tracking-wider
                      `}
                    style={{
                      borderColor: themeBorder.includes("#")
                        ? `${themeBorder}50`
                        : undefined,
                    }}
                  >
                    <Zap size={10} className="sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">Test</span>
                  </button>
                )}

                {/* Reconnect Button - Offline only */}
                {!isOnline && (
                  <button
                    onClick={() => onDeviceAction(device.id, "reconnect")}
                    className="
                      flex-1 sm:flex-none
                      flex items-center justify-center gap-1.5
                      px-2.5 sm:px-3 py-1.5 sm:py-2
                      text-[10px] sm:text-xs font-mono font-medium
                      bg-gray-700/20 border border-gray-600/30 text-gray-400
                      rounded
                      hover:bg-gray-700/40 hover:border-gray-600/50
                      active:scale-95
                      transition-all
                      uppercase tracking-wider
                    "
                  >
                    <RefreshCw size={10} className="sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">Reconnect</span>
                  </button>
                )}

                {/* Unpair Button */}
                <button
                  onClick={() => onDeviceAction(device.id, "unpair")}
                  className="
                    flex-1 sm:flex-none
                    flex items-center justify-center gap-1.5
                    px-2.5 sm:px-3 py-1.5 sm:py-2
                    text-[10px] sm:text-xs font-mono font-medium
                    bg-red-500/10 border border-red-500/30 text-red-400
                    rounded
                    hover:bg-red-500/20 hover:border-red-500/50
                    active:scale-95
                    transition-all
                    uppercase tracking-wider
                  "
                >
                  <X size={10} className="sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">Unpair</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
