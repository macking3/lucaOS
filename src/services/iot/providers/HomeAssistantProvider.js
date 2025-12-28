import WebSocket from "ws";
import { EventEmitter } from "events";

export class HomeAssistantProvider extends EventEmitter {
  constructor(url, token) {
    super();
    this.name = "home-assistant";
    this.ws = null;
    this.url = url.replace(/^http/, "ws") + "/api/websocket";
    this.token = token;
    this.messageId = 1;
    this.pendingRequests = new Map();
    this.devices = new Map();
    this.connectionPromise = null;
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return true;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve) => {
      console.log(`[HA_PROVIDER] Connecting to ${this.url}...`);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.on("open", () => {
          console.log("[HA_PROVIDER] WebSocket opened");
        });

        this.ws.on("message", (data) => {
          this.handleMessage(JSON.parse(data.toString()));
        });

        this.ws.on("error", (error) => {
          console.error("[HA_PROVIDER] WebSocket error:", error);
          resolve(false);
        });

        this.ws.on("close", (code, reason) => {
          console.warn(`[HA_PROVIDER] WebSocket closed. Code: ${code}, Reason: ${reason}`);
          this.ws = null;
          this.connectionPromise = null;
        });

        this.once("authenticated", async (success) => {
          if (success) {
            await this.subscribeToEvents();
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } catch (e) {
        console.error("[HA_PROVIDER] Connection failed:", e);
        resolve(false);
      }
    });

    return this.connectionPromise;
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  handleMessage(msg) {
    if (msg.type === "auth_required") {
      this.sendAuth();
    } else if (msg.type === "auth_ok") {
      console.log("[HA_PROVIDER] Authenticated successfully");
      this.emit("authenticated", true);
    } else if (msg.type === "auth_invalid") {
      console.error("[HA_PROVIDER] Authentication failed:", msg.message);
      this.emit("authenticated", false);
    }

    if (msg.id && this.pendingRequests.has(msg.id)) {
      const callback = this.pendingRequests.get(msg.id);
      if (callback) callback(msg);
      this.pendingRequests.delete(msg.id);
    }

    if (msg.type === "event" && msg.event?.event_type === "state_changed") {
      this.handleStateChange(msg.event.data);
    }
  }

  sendAuth() {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "auth",
        access_token: this.token,
      })
    );
  }

  sendCommand(type, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }

      const id = this.messageId++;
      this.pendingRequests.set(id, resolve);

      const message = { id, type, ...payload };
      this.ws.send(JSON.stringify(message));
    });
  }

  async subscribeToEvents() {
    await this.sendCommand("subscribe_events", { event_type: "state_changed" });
    console.log("[HA_PROVIDER] Subscribed to state changes");
  }

  async getDevices() {
    const response = await this.sendCommand("get_states");
    if (!response.result) return [];

    const devices = [];

    for (const entity of response.result) {
      const device = this.mapEntityToDevice(entity);
      if (device) {
        devices.push(device);
        this.devices.set(device.id, device); 
      }
    }

    return devices;
  }

  mapEntityToDevice(entity) {
    const domain = entity.entity_id.split(".")[0];
    let type = null;

    switch (domain) {
      case "light":
        type = "LIGHT";
        break;
      case "switch":
        type = "LIGHT";
        break;
      case "lock":
        type = "LOCK";
        break;
      case "media_player":
        type = "SMART_TV";
        break;
      case "camera":
        type = "CAMERA";
        break;
      case "vacuum":
        type = "ROBOTIC_ARM";
        break;
      default:
        return null;
    }

    return {
      id: entity.entity_id,
      name: entity.attributes.friendly_name || entity.entity_id,
      type: type, 
      isOn:
        entity.state === "on" ||
        entity.state === "playing" ||
        entity.state === "unlocked",
      status: entity.state === "unavailable" ? "offline" : "online",
      location: "Home",
      providerId: this.name,
      attributes: entity.attributes,
    };
  }

  handleStateChange(data) {
    const device = this.mapEntityToDevice(data.new_state);
    if (device) {
      this.devices.set(device.id, device);
      this.emit("device_updated", device);
    }
  }

  async controlDevice(deviceId, action, params = {}) {
    const domain = deviceId.split(".")[0];
    let service = "turn_on";

    if (action === "turnOn") service = "turn_on";
    else if (action === "turnOff") service = "turn_off";
    else if (action === "toggle") service = "toggle";
    else if (action === "lock") service = "lock";
    else if (action === "unlock") service = "unlock";
    else service = action;

    try {
      await this.sendCommand("call_service", {
        domain: domain,
        service: service,
        service_data: {
          entity_id: deviceId,
          ...params,
        },
      });
      return true;
    } catch (e) {
      console.error(`[HA_PROVIDER] Failed to control ${deviceId}:`, e);
      return false;
    }
  }
}
