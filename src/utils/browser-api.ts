declare var browser: any; // Explicitly declare browser for TypeScript
import 'webextension-polyfill';

interface UnifiedBrowserAPI {
  runtime: typeof chrome.runtime;
  tabs: typeof chrome.tabs;
  windows: typeof chrome.windows;
  storage: typeof chrome.storage;
  action: typeof chrome.action;
  notifications: typeof chrome.notifications;
  alarms: typeof chrome.alarms;
}

export function getBrowserAPI(): UnifiedBrowserAPI {
  if (typeof chrome !== 'undefined') {
    return chrome as unknown as UnifiedBrowserAPI; // Cast to unknown first to avoid direct incompatible type errors
  } else if (typeof browser !== 'undefined') {
    return browser as unknown as UnifiedBrowserAPI; // Cast to unknown first
  } else {
    throw new Error('No browser API found (chrome or browser)');
  }
}
