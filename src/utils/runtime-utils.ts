// Cross-browser runtime API utility
// Provides a unified interface for Chrome and Firefox extension runtime APIs

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

export interface TabsAPI {
  query(queryInfo: any, callback: (tabs: any[]) => void): void;
  sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
}

export interface ActionAPI {
  setPopup(details: { popup: string }): void;
}

export interface AlarmsAPI {
  onAlarm: {
    addListener(callback: (alarm: any) => void): void;
  };
}

export interface NotificationsAPI {
  create(options: any, callback?: (notificationId: string) => void): void;
}

export interface StorageChangeAPI {
  onChanged: {
    addListener(callback: (changes: any, areaName: string) => void): void;
  };
}

// Detect browser and get appropriate runtime API
export const getRuntimeAPI = (): RuntimeAPI => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime as RuntimeAPI;
  }
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser.runtime as RuntimeAPI;
  }
  throw new Error('Runtime API not available in this browser');
};

// Get tabs API
export const getTabsAPI = (): TabsAPI => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    return chrome.tabs as TabsAPI;
  }
  if (typeof browser !== 'undefined' && browser.tabs) {
    return browser.tabs as TabsAPI;
  }
  throw new Error('Tabs API not available in this browser');
};

// Get action API
export const getActionAPI = (): ActionAPI => {
  if (typeof chrome !== 'undefined' && chrome.action) {
    return chrome.action as ActionAPI;
  }
  if (typeof browser !== 'undefined' && browser.action) {
    return browser.action as ActionAPI;
  }
  throw new Error('Action API not available in this browser');
};

// Get alarms API
export const getAlarmsAPI = (): AlarmsAPI => {
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    return chrome.alarms as AlarmsAPI;
  }
  if (typeof browser !== 'undefined' && browser.alarms) {
    return browser.alarms as AlarmsAPI;
  }
  throw new Error('Alarms API not available in this browser');
};

// Get notifications API
export const getNotificationsAPI = (): NotificationsAPI => {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    return chrome.notifications as NotificationsAPI;
  }
  if (typeof browser !== 'undefined' && browser.notifications) {
    return browser.notifications as NotificationsAPI;
  }
  throw new Error('Notifications API not available in this browser');
};

// Get storage change API
export const getStorageChangeAPI = (): StorageChangeAPI => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage as StorageChangeAPI;
  }
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage as unknown as StorageChangeAPI;
  }
  throw new Error('Storage Change API not available in this browser');
};

// Convenience exports
export const runtime = getRuntimeAPI();
export const tabs = getTabsAPI();
export const action = getActionAPI();
export const alarms = getAlarmsAPI();
export const notifications = getNotificationsAPI();
export const storageChange = getStorageChangeAPI();

// Safe message sending with error handling
export const safeSendMessage = (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      runtime.sendMessage(message, (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Safe tab query with error handling
export const safeQueryTabs = (queryInfo: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      tabs.query(queryInfo, (tabs) => {
        resolve(tabs);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Safe tab message sending with error handling
export const safeSendMessageToTab = (tabId: number, message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      tabs.sendMessage(tabId, message, (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Cross-browser message sending for injected scripts
// This function can be used in content scripts and injected scripts
export const crossBrowserSendMessage = (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // Try to use the runtime API if available
      if (typeof runtime !== 'undefined' && runtime.sendMessage) {
        runtime.sendMessage(message, (response) => {
          if (runtime.lastError) {
            reject(new Error(runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
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
};
