// Native Control Service - Client Side (Renderer)
// Uses Electron IPC Bridge via Preload Script

// Helper to safely access IPC (Bypassing strict type checks)
const invoke = async (channel: string, data: any) => {
  // Force cast to any to avoid "Property 'electron' does not exist on type 'Window & typeof globalThis'"
  const target = (window as any)["electron"];
  if (target && target.ipcRenderer) {
    return await target.ipcRenderer.invoke(channel, data);
  }
  console.warn("Electron IPC not found - are you running in Electron?");
  return null;
};

export const nativeControl = {
  // 1. Volume Control
  setVolume: async (level: number) => {
    return await invoke("control-system", {
      action: "VOLUME_SET",
      value: level,
    });
  },

  mute: async () => {
    return await invoke("control-system", {
      action: "VOLUME_MUTE",
    });
  },

  unmute: async () => {
    return await invoke("control-system", {
      action: "VOLUME_UNMUTE",
    });
  },

  // 2. Battery & System Stats
  getBatteryStatus: async () => {
    return await invoke("control-system", {
      action: "GET_BATTERY",
    });
  },

  getSystemLoad: async () => {
    return await invoke("control-system", {
      action: "GET_SYSTEM_LOAD",
    });
  },

  // 3. Application Control
  launchApp: async (appName: string) => {
    return await invoke("control-system", {
      action: "LAUNCH_APP",
      appName,
    });
  },

  // 4. Media Control
  mediaPlayPause: async () => {
    return await invoke("control-system", {
      action: "MEDIA_PLAY_PAUSE",
    });
  },

  mediaNext: async () => {
    return await invoke("control-system", {
      action: "MEDIA_NEXT",
    });
  },

  mediaPrev: async () => {
    return await invoke("control-system", {
      action: "MEDIA_PREV",
    });
  },

  // 5. Hardware Casting (AirPlay/DLNA)
  startNativeCast: async (protocol: string, deviceName: string) => {
    return await invoke("control-system", {
      action: "NATIVE_CAST",
      protocol,
      deviceName,
    });
  },
};
