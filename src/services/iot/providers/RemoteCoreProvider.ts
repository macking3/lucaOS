import { SmartDevice, DeviceType } from "../../../types";
import { EventEmitter } from "events";
import { apiUrl } from "../../../config/api";

export class RemoteCoreProvider extends EventEmitter {
  name = "remote-core";
  devices: Map<string, SmartDevice> = new Map();
  apiUrl = apiUrl("/api/iot/devices");

  constructor() {
    super();
  }

  async connect(): Promise<boolean> {
    // Simple check if API is up
    try {
      await fetch(this.apiUrl);
      // Start polling
      setInterval(() => this.poll(), 5000);
      return true;
    } catch (e) {
      console.warn("[REMOTE_CORE] Server offline?", e);
      return false;
    }
  }

  async poll() {
    try {
      const devices = await this.getDevices();
      // Emit updates if needed, but getDevices() is usually called by Manager
      // Manager doesn't auto-poll getDevices() unless we emit 'device_updated'?
      // Actually Manager calls getDevices() on refresh if we emit 'devices_updated'
      // But let's just emit individually for now or bulk
    } catch (e) {
      // ignore
    }
  }

  async getDevices(): Promise<SmartDevice[]> {
    try {
      const res = await fetch(this.apiUrl);
      if (!res.ok) return [];

      const devices: SmartDevice[] = await res.json();

      devices.forEach((d) => {
        // Determine if changed
        // Simply set and emit
        this.devices.set(d.id, d);
        // We emit single updates to be safe
        this.emit("device_updated", d);
      });

      return devices;
    } catch (e) {
      console.error("[REMOTE_CORE] Fetch failed", e);
      return [];
    }
  }

  async controlDevice(
    deviceId: string,
    action: string,
    params: any
  ): Promise<boolean> {
    // Forward control to backend
    try {
      await fetch(apiUrl("/api/iot/control"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action, params }),
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  on(event: string, cb: any): this {
    super.on(event, cb);
    return this;
  }
}
