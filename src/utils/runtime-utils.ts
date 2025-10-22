// Cross-browser runtime API utility
// Provides a unified interface for Chrome and Firefox extension runtime APIs

import { getBrowserAPI } from './browser-api';

export interface RuntimeAPI {
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: any) => boolean | void): void;
    removeListener(callback: (message: any, sender: any, sendResponse: any) => boolean | void): void;
  };
  onInstalled: {
    addListener(callback: (details: any) => void): void;
  };
  onStartup: {
    addListener(callback: () => void): void;
  };
  sendMessage(message: any, options?: any, callback?: (response: any) => void): void;
  getURL(path: string): string;
  lastError?: {
    message: string;
  };
  id?: string;
  onConnect: {
    addListener(callback: (port: any) => void): void;
  };
  onMessageExternal: {
    addListener(callback: (message: any, sender: any, sendResponse: any) => boolean | void | Promise<any>): void;
    removeListener(callback: (message: any, sender: any, sendResponse: any) => boolean | void | Promise<any>): void;
  };
}

export interface TabsAPI {
  query(queryInfo: any): Promise<any[]>;
  create(createProperties: any): Promise<any>;
  sendMessage(tabId: number, message: any, options?: any): Promise<any>;
}

export interface ActionAPI {
  setPopup(details: { popup: string }): void;
}

export interface AlarmsAPI {
  create(alarmInfo: any): void;
  onAlarm: {
    addListener(callback: (alarm: any) => void): void;
  };
}

export interface NotificationsAPI {
  create(notificationId: string, options: any, callback?: (notificationId: string) => void): void;
  // Added to match chrome.notifications.create signature
  create(options: any, callback?: (notificationId: string) => void): void;
}

export interface StorageChangeAPI {
  onChanged: {
    addListener(callback: (changes: any, areaName: string) => void): void;
  };
}

// Detect browser and get appropriate runtime API
export const getUnifiedBrowserAPI = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  return getBrowserAPI();
};

// Get tabs API
export const getTabsAPI = (): TabsAPI => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    return chrome.tabs as TabsAPI;
  }
  const browser = getUnifiedBrowserAPI();
  if (browser && browser.tabs) {
    return browser.tabs as TabsAPI;
  }
  throw new Error('Tabs API not available in this browser');
};

// Get action API
export const getActionAPI = (): ActionAPI => {
  if (typeof chrome !== 'undefined' && chrome.action) {
    return chrome.action as ActionAPI;
  }
  const browser = getUnifiedBrowserAPI();
  if (browser && browser.action) {
    return browser.action as ActionAPI;
  }
  throw new Error('Action API not available in this browser');
};

// Get alarms API
export const getAlarmsAPI = (): AlarmsAPI => {
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    return chrome.alarms as AlarmsAPI;
  }
  const browser = getUnifiedBrowserAPI();
  if (browser && browser.alarms) {
    return browser.alarms as AlarmsAPI;
  }
  throw new Error('Alarms API not available in this browser');
};

// Get notifications API
export const getNotificationsAPI = (): NotificationsAPI => {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    return chrome.notifications as NotificationsAPI;
  }
  const browser = getUnifiedBrowserAPI();
  if (browser && browser.notifications) {
    return browser.notifications as NotificationsAPI;
  }
  throw new Error('Notifications API not available in this browser');
};

// Get storage change API
export const getStorageChangeAPI = (): StorageChangeAPI => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage as StorageChangeAPI;
  }
  const browser = getUnifiedBrowserAPI();
  if (browser && browser.storage) {
    return browser.storage as unknown as StorageChangeAPI;
  }
  throw new Error('Storage Change API not available in this browser');
};

// Lazy API getters - only initialize when actually used
let _runtime: RuntimeAPI | null = null;
let _tabs: TabsAPI | null = null;
let _action: ActionAPI | null = null;
let _alarms: AlarmsAPI | null = null;
let _notifications: NotificationsAPI | null = null;
let _storageChange: StorageChangeAPI | null = null;

export const runtime = (): RuntimeAPI => {
  if (!_runtime) {
    _runtime = getUnifiedBrowserAPI().runtime as RuntimeAPI;
  }
  return _runtime;
};

export const tabs = (): TabsAPI => {
  if (!_tabs) {
    _tabs = getTabsAPI();
  }
  return _tabs;
};

export const action = (): ActionAPI => {
  if (!_action) {
    _action = getActionAPI();
  }
  return _action;
};

export const alarms = (): AlarmsAPI => {
  if (!_alarms) {
    _alarms = getAlarmsAPI();
  }
  return _alarms;
};

export const notifications = (): NotificationsAPI => {
  if (!_notifications) {
    _notifications = getNotificationsAPI();
  }
  return _notifications;
};

export const storageChange = (): StorageChangeAPI => {
  if (!_storageChange) {
    _storageChange = getStorageChangeAPI();
  }
  return _storageChange;
};

// Safe message sending with error handling
export const safeSendMessage = (message: any): Promise<any> => new Promise((resolve, reject) => {
  try {
    const runtimeAPI = runtime();
    runtimeAPI.sendMessage(message, (response) => {
      if (runtimeAPI.lastError) {
        reject(new Error(runtimeAPI.lastError.message));
      } else {
        resolve(response);
      }
    });
  } catch (error) {
    reject(error);
  }
});

// Safe tab query with error handling
export const safeQueryTabs = (queryInfo: any): Promise<any[]> => new Promise((resolve, reject) => {
  try {
    const tabsAPI = tabs();
    tabsAPI.query(queryInfo).then((tabs) => {
      resolve(tabs);
    }).catch(reject);
  } catch (error) {
    reject(error);
  }
});

// Safe tab message sending with error handling
export const safeSendMessageToTab = (tabId: number, message: any): Promise<any> => new Promise((resolve, reject) => {
  try {
    const tabsAPI = tabs();
    const runtimeAPI = runtime();
    tabsAPI.sendMessage(tabId, message).then((response) => {
      if (runtimeAPI.lastError) {
        reject(new Error(runtimeAPI.lastError.message));
      } else {
        resolve(response);
      }
    }).catch(reject);
  } catch (error) {
    reject(error);
  }
});

// Cross-browser message sending for injected scripts
// This function can be used in content scripts and injected scripts
export const crossBrowserSendMessage = (message: any): Promise<any> => new Promise((resolve, reject) => {
  try {
    // Try to use the runtime API if available
    try {
      const runtimeAPI = runtime();
      runtimeAPI.sendMessage(message, (response) => {
        if (runtimeAPI.lastError) {
          reject(new Error(runtimeAPI.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (runtimeError) {
      // Runtime API not available, fall back to postMessage
      // Use postMessage for cross-context communication
      const messageId = Date.now().toString();
      const messageWithId = { ...message, _id: messageId };

      const messageHandler = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (event.data._id === messageId) {
          window.removeEventListener('message', messageHandler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.response);
          }
        }
      };

      window.addEventListener('message', messageHandler);
      window.postMessage(messageWithId, '*');

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Message timeout'));
      }, 10000);
    }
  } catch (error) {
    reject(error);
  }
});
