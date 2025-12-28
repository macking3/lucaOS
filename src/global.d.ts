export {};

declare global {
  interface Window {
    luca: {
      platform: string;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      onActiveWindowChange: (callback: (data: any) => void) => void;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<boolean>;
      moveMouse: (x: number, y: number) => Promise<boolean>;
      clickMouse: (button: string) => Promise<boolean>;
      openScreenPermissions: () => Promise<boolean>;
      triggerScreenPermission: () => Promise<any[]>;
      applySystemSettings: (settings: any) => void;
      connectSocial: (appId: string) => void;
      vault: any;
    };
    electron?: {
      ipcRenderer: {
        send: (channel: string, data?: any) => void;
        on: (channel: string, func: (...args: any[]) => void) => () => void;
        once: (channel: string, func: (...args: any[]) => void) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}
