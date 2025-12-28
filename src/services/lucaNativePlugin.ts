import { registerPlugin } from "@capacitor/core";

export interface NotificationData {
  package: string;
  title: string;
  text: string;
  time: number;
}

export interface LucaNativePlugin {
  getUiTree(): Promise<{ tree: string }>;
  performGlobalAction(options: {
    action: "BACK" | "HOME" | "RECENTS";
  }): Promise<{ success: boolean }>;
  checkPermissions(): Promise<{
    accessibility: boolean;
    notifications: boolean;
  }>;
  requestPermissions(): Promise<void>;

  // Events
  addListener(
    eventName: "notificationReceived",
    listenerFunc: (data: NotificationData) => void
  ): Promise<any>;
}

const LucaNative = registerPlugin<LucaNativePlugin>("LucaNative");

export default LucaNative;
