import React, { useState, useEffect } from "react";
import { X, Smartphone, Loader } from "lucide-react";
import QRCode from "qrcode";
import { neuralLinkManager } from "../services/neuralLink/manager";
import { ConnectionStatus } from "./neuralLink/ConnectionStatus";
import { DeviceList } from "./neuralLink/DeviceList";
import { ErrorToast } from "./neuralLink/ErrorToast";
import type { Device, NeuralLinkError } from "../services/neuralLink/types";
import { ConnectionState } from "../services/neuralLink/types";
import { WS_PORT, RELAY_SERVER_URL } from "../config/api";

interface NeuralLinkModalProps {
  onClose: () => void;
  localIp: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const NeuralLinkModal: React.FC<NeuralLinkModalProps> = ({
  onClose,
  localIp,
  theme,
}) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeBorder = theme?.border || "border-cyan-500";
  const themeBg = theme?.bg || "bg-cyan-950/10";
  const themeHex = theme?.hex || "#06b6d4";
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [errors, setErrors] = useState<NeuralLinkError[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Neural Link Manager
  useEffect(() => {
    if (!localIp) return; // Wait for IP

    // Reset initialization on IP change
    const initManager = async () => {
      try {
        setIsInitialized(false);
        setQrDataUrl(""); // Clear QR while regenerating

        // Initialize manager
        // Priority: Configure Cloud Relay > Local LAN connection
        const connectionUrl =
          RELAY_SERVER_URL || `http://${localIp}:${WS_PORT}`;
        const isCloudRelay = !!RELAY_SERVER_URL;

        await neuralLinkManager.initialize(connectionUrl, {
          path: isCloudRelay ? "" : "/mobile/socket.io", // Cloud relays typically perform root routing
          deviceId: "desktop_main",
          deviceName: "Luca Desktop",
        });

        // Connect
        await neuralLinkManager.connect();

        // Generate pairing QR code
        // For cloud relays, the mobile index usually mirrors the desktop or is hosted remotely
        const pairingData = await neuralLinkManager.generatePairingData();

        // If using Cloud Relay, we need a URL that the mobile phone can access to load the client
        // For now, if cloud relay is used, we assume the user has a "mobile" build or valid URL.
        // We fall back to local IP serving the mobile client if no explicit mobile client URL is defined,
        // but note the mobile client MUST connect to RELAY_SERVER_URL.
        const mobileClientHost = isCloudRelay
          ? `${connectionUrl}/mobile`
          : `http://${localIp}:${WS_PORT}/mobile`;

        // The token params tell the mobile client where to connect
        const mobileUrl = `${mobileClientHost}/index.html?token=${
          pairingData.token
        }&host=${isCloudRelay ? connectionUrl : localIp}&mode=${
          isCloudRelay ? "cloud" : "local"
        }`;

        // Generate QR code
        const url = await QRCode.toDataURL(mobileUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: themeHex,
            light: "#00000000",
          },
        });

        setQrDataUrl(url);
        setIsInitialized(true);

        // Load existing devices
        updateDevices();
      } catch (error) {
        console.error("[NeuralLinkModal] Initialization failed:", error);
      }
    };

    initManager();

    // Cleanup
    return () => {
      // Don't disconnect on unmount - let it run in background
    };
  }, [localIp, themeBorder]);

  // Subscribe to events
  useEffect(() => {
    if (!isInitialized) return;

    const handleDeviceAdded = () => {
      updateDevices();
    };

    const handleDeviceRemoved = () => {
      updateDevices();
    };

    const handleConnected = () => {
      setConnectionState(ConnectionState.CONNECTED);
      updateDevices();
    };

    const handleDisconnected = () => {
      setConnectionState(ConnectionState.DISCONNECTED);
    };

    const handleReconnecting = () => {
      setConnectionState(ConnectionState.RECONNECTING);
    };

    neuralLinkManager.on("device:added", handleDeviceAdded);
    neuralLinkManager.on("device:removed", handleDeviceRemoved);
    neuralLinkManager.on("connected", handleConnected);
    neuralLinkManager.on("disconnected", handleDisconnected);
    neuralLinkManager.on("reconnecting", handleReconnecting);

    // Initial state
    setConnectionState(
      neuralLinkManager.getConnectionState() || ConnectionState.DISCONNECTED
    );

    return () => {
      neuralLinkManager.off("device:added", handleDeviceAdded);
      neuralLinkManager.off("device:removed", handleDeviceRemoved);
      neuralLinkManager.off("connected", handleConnected);
      neuralLinkManager.off("disconnected", handleDisconnected);
      neuralLinkManager.off("reconnecting", handleReconnecting);
    };
  }, [isInitialized]);

  const updateDevices = () => {
    setDevices(neuralLinkManager.getDevices());
  };

  const handleDeviceAction = async (
    deviceId: string,
    action: "test" | "unpair" | "reconnect"
  ) => {
    try {
      switch (action) {
        case "test":
          await neuralLinkManager.sendCommand(deviceId, "vibrate", {
            pattern: [200, 100, 200],
          });
          break;
        case "unpair":
          await neuralLinkManager.removeDevice(deviceId);
          updateDevices();
          break;
        case "reconnect":
          // Trigger reconnection logic (handled by manager)
          break;
      }
    } catch (error) {
      console.error("[NeuralLinkModal] Device action failed:", error);
    }
  };

  const handleErrorDismiss = (error: NeuralLinkError) => {
    setErrors(errors.filter((e) => e !== error));
  };

  const getGlowColor = () => {
    return themeBorder.includes("#")
      ? `${themeBorder}26`
      : "rgba(6,182,212,0.15)";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className={`
          bg-black/90 border ${themeBorder}/30 
          rounded-none sm:rounded-lg 
          w-full h-full sm:h-auto sm:max-w-2xl
          p-4 sm:p-6 
          relative overflow-hidden 
          flex flex-col
          max-h-screen
        `}
        style={{
          boxShadow: `0 0 30px ${getGlowColor()}`,
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 relative z-30 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={themePrimary}>
              <Smartphone size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-wider uppercase font-mono">
              NEURAL LINK
            </h2>
            <ConnectionStatus
              state={connectionState}
              themePrimary={themePrimary}
              themeBorder={themeBorder}
              themeBg={themeBg}
            />
          </div>
          <button
            onClick={onClose}
            className="relative z-50 text-gray-500 hover:text-white transition-all p-2 rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center">
            <h3
              className={`text-xs sm:text-sm font-mono font-bold ${themePrimary} uppercase tracking-wider mb-3 sm:mb-4`}
            >
              📱 PAIR NEW DEVICE
            </h3>

            <div className="relative group">
              <div
                className="absolute -inset-1 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"
                style={{
                  background: themeBorder.includes("#")
                    ? `linear-gradient(to right, ${themeBorder}, ${themeBorder}80)`
                    : "linear-gradient(to right, #06b6d4, #0891b2)",
                }}
              />
              <div className="relative bg-black p-2 sm:p-4 rounded-lg border border-gray-800">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Pairing QR Code"
                    className="w-32 h-32 xs:w-40 xs:h-40 sm:w-48 sm:h-48 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 xs:w-40 xs:h-40 sm:w-48 sm:h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
                    <Loader className="animate-spin" size={32} />
                    <span className="text-[10px] font-mono text-center">
                      {!localIp ? "DETECTING NET..." : "GENERATING..."}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4 text-center px-4">
              Scan with your mobile device to establish secure connection
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600 font-mono mt-1">
              {localIp}
            </p>
          </div>

          {/* Device List */}
          {devices.length > 0 && (
            <div className="border-t border-gray-800 pt-4 sm:pt-6">
              <DeviceList
                devices={devices}
                onDeviceAction={handleDeviceAction}
                themePrimary={themePrimary}
                themeBorder={themeBorder}
                themeBg={themeBg}
              />
            </div>
          )}
        </div>

        {/* Footer Decoration */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-transparent"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${
              themeBorder.includes("#") ? themeBorder : "#06b6d4"
            }33, transparent)`,
          }}
        />

        {/* Scanning Line Animation - when waiting */}
        {connectionState === ConnectionState.CONNECTING && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`w-full h-1 ${themeBorder.replace(
                "border-",
                "bg-"
              )}/50 shadow-[0_0_10px] absolute top-0 animate-[scan_2s_linear_infinite]`}
            />
          </div>
        )}
      </div>

      {/* Error Toasts */}
      {errors.map((error, index) => (
        <ErrorToast
          key={`${error.code}-${error.timestamp.getTime()}-${index}`}
          error={error}
          onDismiss={() => handleErrorDismiss(error)}
          themePrimary={themePrimary}
          themeBorder={themeBorder}
          themeBg={themeBg}
        />
      ))}

      {/* Keyframe animations */}
      <style>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default NeuralLinkModal;
