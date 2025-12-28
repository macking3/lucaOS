import iotManager from "./IoTManager";
import { HomeAssistantProvider } from "./providers/HomeAssistantProvider";
import { settingsService } from "../settingsService";

// Initialize Real Hardware Providers
export const initIoT = async () => {
  console.log("[IoT_INIT] Checking for real hardware configuration...");

  // 1. Check Settings Service First (User Overrides)
  const settings = settingsService.get("iot");
  let haUrl = settings.haUrl;
  let haToken = settings.haToken;

  // 2. Fallback to Env Vars - REMOVED per user request (Auto-connect disabled)
  // if (!haUrl || !haToken) {
  //   haUrl = import.meta.env.VITE_HA_URL;
  //   haToken = import.meta.env.VITE_HA_TOKEN;
  // }

  if (haUrl && haToken) {
    console.log(
      "[IoT_INIT] Found Home Assistant credentials. Establishing connection..."
    );
    const haProvider = new HomeAssistantProvider(haUrl, haToken);

    try {
      await iotManager.registerProvider(haProvider);
      console.log(
        "[IoT_INIT] Home Assistant provider registered successfully."
      );
    } catch (e) {
      console.error("[IoT_INIT] Failed to register Home Assistant:", e);
    }
  } else {
    console.log(
      "[IoT_INIT] No Home Assistant credentials found (VITE_HA_URL/VITE_HA_TOKEN). Using mock devices."
    );
  }
  // 3. Listen for Runtime Updates
  settingsService.on("settings-changed", async (newSettings: any) => {
    const { haUrl: newUrl, haToken: newToken } = newSettings.iot;

    // Check if credentials actually changed
    const currentProvider = (iotManager as any).providers.get("home-assistant");
    const shouldReconnect =
      newUrl &&
      newToken &&
      (!currentProvider ||
        currentProvider.url !==
          newUrl.replace(/^http/, "ws") + "/api/websocket");
    // Note: simplistic check, real check would compare raw values if stored

    if (shouldReconnect || (newUrl && newToken && !currentProvider)) {
      console.log("[IoT] Credentials updated. Reconnecting Home Assistant...");

      if (currentProvider) {
        if (currentProvider.disconnect) await currentProvider.disconnect();
        (iotManager as any).providers.delete("home-assistant");
        // Clear retry counters
        if ((iotManager as any).retryCounts)
          (iotManager as any).retryCounts.delete("home-assistant");
      }

      const haProvider = new HomeAssistantProvider(newUrl, newToken);
      try {
        await iotManager.registerProvider(haProvider);
        console.log("[IoT] Reconnection successful.");
      } catch (e) {
        console.error("[IoT] Reconnection failed:", e);
      }
    }
  });

  // 4. Initialize Remote Core Bridge (For DLNA/Backend Devices)
  import("./providers/RemoteCoreProvider").then(({ RemoteCoreProvider }) => {
    const remote = new RemoteCoreProvider();
    iotManager
      .registerProvider(remote)
      .catch((e) => console.error("[IoT_INIT] Remote Core Link Failed:", e));
  });
};
