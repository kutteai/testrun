declare global {
  interface Window {
    chrome?: typeof chrome;
    browser?: typeof browser;
    ethereum?: any;
    web3?: { currentProvider?: any };
    __paycio__?: any;
  }

  declare const browser: typeof browser; // Add this line

  namespace chrome {
    export interface Runtime {
      onConnect: {
        addListener: (callback: (port: chrome.runtime.Port) => void) => void;
        removeListener: (callback: (port: chrome.runtime.Port) => void) => void;
      };
      onMessage: {
        addListener: (callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | Promise<void>) => void;
        removeListener: (callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void) => void;
      };
      onMessageExternal: {
        addListener: (callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | Promise<void>) => void;
        removeListener: (callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void) => void;
      };
      onStartup: {
        addListener: (callback: () => void) => void;
      };
      onInstalled: {
        addListener: (callback: (details: chrome.runtime.InstallReason) => void) => void;
      };
      sendMessage(message: any, callback?: (response: any) => void): void;
      getURL(path: string): string;
      lastError?: {
        message: string;
      };
      id?: string;
      connect?(connectInfo?: chrome.runtime.ConnectInfo): chrome.runtime.Port;
    }
    export interface Tabs {
      create(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
      query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
      sendMessage(tabId: number, message: any, options?: chrome.tabs.MessageOptions): Promise<any>;
    }
    export interface Windows {
      create: (createProperties: chrome.windows.CreateData) => Promise<chrome.windows.Window>;
      getCurrent(getInfo?: chrome.windows.GetInfo): Promise<chrome.windows.Window>;
    }
    export interface Alarms {
      create(name: string, alarmInfo: { periodInMinutes?: number; when?: number; delayInMinutes?: number; }): void;
      onAlarm: {
        addListener(callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number; }) => void): void;
        removeListener(callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number; }) => void): void;
        hasListener(callback: (alarm: { name: string; scheduledTime: number; periodInMinutes?: number; }) => void): boolean;
      };
    }
    export interface Scripting {
      executeScript: (injection: chrome.scripting.ScriptInjection) => Promise<any>;
    }
    export interface Storage {
      local: {
        get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
        set(items: { [key: string]: any }): Promise<void>;
        remove(keys: string | string[]): Promise<void>;
        clear(): Promise<void>;
      };
      session: {
        get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
        set(items: { [key: string]: any }): Promise<void>;
        remove(keys: string | string[]): Promise<void>;
        clear(): Promise<void>;
      };
      managed: {
        get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
        set(items: { [key: string]: any }): Promise<void>;
        remove(keys: string | string[]): Promise<void>;
        clear(): Promise<void>;
      };
      onChanged: {
        addListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void): void;
      };
    }
    export interface Action {
      setBadgeText(details: chrome.action.BadgeTextDetails): Promise<void>;
      setBadgeBackgroundColor(details: chrome.action.BadgeColorDetails): Promise<void>;
    }
    export interface Notifications {
      create(options: chrome.notifications.NotificationOptions): Promise<string>;
    }
  }

  // Add missing type for chrome.windows.CreateType
  declare namespace chrome.windows {
    export type CreateType = "normal" | "popup" | "panel" | "detached" | "sidebar";
  }

}
