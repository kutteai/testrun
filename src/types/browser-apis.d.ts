// Browser API type definitions for cross-browser compatibility

export interface StorageAPI {
  local: {
    get(keys: string | string[] | object | null): Promise<any>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
  };
  session: {
    get(keys: string | string[] | object | null): Promise<any>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
  };
}

// Runtime API interface
export interface RuntimeAPI {
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: any) => boolean | void): void;
  };
  onInstalled: {
    addListener(callback: (details: any) => void): void;
  };
  onStartup: {
    addListener(callback: () => void): void;
  };
  sendMessage(message: any, callback?: (response: any) => void): void;
  getURL(path: string): string;
  lastError?: {
    message: string;
  };
}

// Tabs API interface
export interface TabsAPI {
  query(queryInfo: any, callback: (tabs: any[]) => void): void;
  sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
}

// Action API interface
export interface ActionAPI {
  setPopup(details: { popup: string }): void;
}

// Alarms API interface
export interface AlarmsAPI {
  onAlarm: {
    addListener(callback: (alarm: any) => void): void;
  };
}

// Notifications API interface
export interface NotificationsAPI {
  create(options: any, callback?: (notificationId: string) => void): void;
}

// Storage Change API interface
export interface StorageChangeAPI {
  onChanged: {
    addListener(callback: (changes: any, areaName: string) => void): void;
  };
}

// Firefox browser API
export interface FirefoxBrowser {
  storage: StorageAPI;
  runtime: RuntimeAPI;
  tabs: TabsAPI;
  action: ActionAPI;
  alarms: AlarmsAPI;
  notifications: NotificationsAPI;
}

// Chrome extension API (if not already defined)
export interface ChromeExtension {
  storage: StorageAPI;
  runtime: RuntimeAPI;
  tabs: TabsAPI;
  action: ActionAPI;
  alarms: AlarmsAPI;
  notifications: NotificationsAPI;
}

// Global browser detection
export interface BrowserAPIs {
  chrome?: ChromeExtension;
  browser?: FirefoxBrowser;
}

// Global declarations for browser APIs
declare global {
  const browser: FirefoxBrowser | undefined;
  const chrome: ChromeExtension | undefined;
}
