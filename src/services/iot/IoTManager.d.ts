import { SmartDevice } from "../../types";

export interface IoTProvider {
  name: string;
  connect(): Promise<boolean>;
  getDevices(): Promise<SmartDevice[]>;
  controlDevice(
    deviceId: string,
    action: string,
    params?: any
  ): Promise<boolean>;
  on(event: string, callback: Function): void;
}

export class IoTManager {
  registerProvider(provider: any): Promise<void>;
  getDevices(): SmartDevice[];
  controlDevice(
    deviceId: string,
    action: string,
    params?: any
  ): Promise<boolean>;
  on(event: string, callback: Function): void;
}

export const iotManager: IoTManager;
export default iotManager;
