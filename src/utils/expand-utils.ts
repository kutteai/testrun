// Utility functions for expanding the wallet to full screen
import { runtime } from './runtime-utils';

export interface ExpandOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  focused?: boolean;
  type?: 'popup' | 'normal' | 'panel' | 'detached_panel';
}

/**
 * Opens the wallet in an expanded view (new window/tab)
 * @param options - Window options for the expanded view
 * @returns Promise that resolves when the window is opened
 */
export const openExpandedView = async (options: ExpandOptions = {}): Promise<void> => {
  try {
    const runtimeAPI = runtime();
    const expandUrl = runtimeAPI.getURL('expand.html');
    
    // Default window options - 2/3 of screen size, centered
    const screenWidth = window.screen?.width || 1920;
    const screenHeight = window.screen?.height || 1080;
    const windowWidth = Math.floor(screenWidth * 0.67); // 2/3 of screen width
    const windowHeight = Math.floor(screenHeight * 0.67); // 2/3 of screen height
    const left = Math.floor((screenWidth - windowWidth) / 2); // Center horizontally
    const top = Math.floor((screenHeight - windowHeight) / 2); // Center vertically
    
    const defaultOptions: ExpandOptions = {
      width: windowWidth,
      height: windowHeight,
      left: left,
      top: top,
      focused: true,
      type: 'normal'
    };
    
    const windowOptions = { ...defaultOptions, ...options };
    
    // Check if we're in Chrome or Firefox
    if (typeof chrome !== 'undefined' && chrome.windows) {
      // Chrome extension
      await new Promise<void>((resolve, reject) => {
        chrome.windows.create({
          url: expandUrl,
          width: windowOptions.width,
          height: windowOptions.height,
          left: windowOptions.left,
          top: windowOptions.top,
          focused: windowOptions.focused,
          type: windowOptions.type as chrome.windows.CreateType
        }, (window) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('✅ Expanded view opened in Chrome:', window?.id);
            resolve();
          }
        });
      });
    } else if (typeof browser !== 'undefined' && browser.windows) {
      // Firefox extension
      const window = await browser.windows.create({
        url: expandUrl,
        width: windowOptions.width,
        height: windowOptions.height,
        left: windowOptions.left,
        top: windowOptions.top,
        focused: windowOptions.focused,
        type: windowOptions.type as browser.windows.CreateType
      });
      console.log('✅ Expanded view opened in Firefox:', window.id);
    } else {
      // Fallback: open in new tab
      console.log('⚠️ Windows API not available, opening in new tab');
      await openInNewTab(expandUrl);
    }
  } catch (error) {
    console.error('❌ Failed to open expanded view:', error);
    throw error;
  }
};

/**
 * Opens a URL in a new tab (fallback method)
 * @param url - URL to open
 * @returns Promise that resolves when the tab is opened
 */
export const openInNewTab = async (url: string): Promise<void> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // Chrome extension
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.create({ url }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('✅ Opened in new tab:', tab?.id);
            resolve();
          }
        });
      });
    } else if (typeof browser !== 'undefined' && browser.tabs) {
      // Firefox extension
      const tab = await browser.tabs.create({ url });
      console.log('✅ Opened in new tab:', tab.id);
    } else {
      // Fallback: use window.open
      console.log('⚠️ Tabs API not available, using window.open');
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('❌ Failed to open in new tab:', error);
    throw error;
  }
};

/**
 * Checks if the current context supports opening new windows
 * @returns boolean indicating if window opening is supported
 */
export const isWindowOpeningSupported = (): boolean => {
  return (
    (typeof chrome !== 'undefined' && chrome.windows) ||
    (typeof browser !== 'undefined' && browser.windows) ||
    (typeof chrome !== 'undefined' && chrome.tabs) ||
    (typeof browser !== 'undefined' && browser.tabs)
  );
};

/**
 * Gets the appropriate expand URL for the current context
 * @returns string URL for the expanded view
 */
export const getExpandUrl = (): string => {
  try {
    const runtimeAPI = runtime();
    return runtimeAPI.getURL('expand.html');
  } catch (error) {
    console.error('❌ Failed to get expand URL:', error);
    return 'expand.html';
  }
};
