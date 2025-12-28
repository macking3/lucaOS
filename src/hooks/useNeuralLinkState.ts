import { useState } from "react";
import { SmartDevice } from "../types";

export function useNeuralLinkState() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteCode, setRemoteCode] = useState("");
  const [showDesktopStream, setShowDesktopStream] = useState(false);
  const [desktopTarget, setDesktopTarget] = useState("LOCALHOST");
  const [showNeuralLinkModal, setShowNeuralLinkModal] = useState(false);

  return {
    devices,
    setDevices,
    showRemoteModal,
    setShowRemoteModal,
    remoteCode,
    setRemoteCode,
    showDesktopStream,
    setShowDesktopStream,
    desktopTarget,
    setDesktopTarget,
    showNeuralLinkModal,
    setShowNeuralLinkModal,
  };
}
