// Cross-browser storage utility for Chrome, Firefox, and Edge compatibility
import type { StorageAPI, BrowserAPIs } from '../types/browser-apis';

// Detect the browser and get the appropriate storage API
const getStorageAPI = (): StorageAPI => {
  // Check for Chrome/Edge extension API
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage as StorageAPI;
  }
  
  // Check for Firefox browser API
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage as StorageAPI;
  }
  
  // Try to access from window object
  if (typeof window !== 'undefined') {
    const globalAPIs = window as unknown as BrowserAPIs;
    if (globalAPIs.chrome?.storage) {
      return globalAPIs.chrome.storage;
    }
    if (globalAPIs.browser?.storage) {
      return globalAPIs.browser.storage;
    }
  }
  
  throw new Error('Storage API not available in this browser');
};

// Cross-browser storage operations
export const storage = {
  // Get data from local storage
  async get(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();
      return await api.local.get(keys);
    } catch (error) {
      console.error('Storage get error:', error);
      throw error;
    }
  },

  // Set data in local storage
  async set(items: object): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.local.set(items);
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  },

  // Remove data from local storage
  async remove(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.local.remove(keys);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  // Clear all local storage
  async clear(): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  // Get data from session storage
  async getSession(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();
      return await api.session.get(keys);
    } catch (error) {
      console.error('Session storage get error:', error);
      throw error;
    }
  },

  // Set data in session storage
  async setSession(items: object): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.session.set(items);
    } catch (error) {
      console.error('Session storage set error:', error);
      throw error;
    }
  },

  // Remove data from session storage
  async removeSession(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.session.remove(keys);
    } catch (error) {
      console.error('Session storage remove error:', error);
      throw error;
    }
  },

  // Clear all session storage
  async clearSession(): Promise<void> {
    try {
      const api = getStorageAPI();
      await api.session.clear();
    } catch (error) {
      console.error('Session storage clear error:', error);
      throw error;
    }
  }
};

// Convenience functions for common operations
export const storageUtils = {
  // Store wallet data
  async storeWallet(wallet: any): Promise<void> {
    await storage.set({ wallet });
  },

  // Get wallet data
  async getWallet(): Promise<any> {
    const result = await storage.get(['wallet']);
    return result.wallet || null;
  },

  // Store password
  async storePassword(password: string): Promise<void> {
    await storage.setSession({ sessionPassword: password });
  },

  // Get password
  async getPassword(): Promise<string | null> {
    const result = await storage.getSession(['sessionPassword']);
    return result.sessionPassword || null;
  },

  // Store seed phrase
  async storeSeedPhrase(seedPhrase: string): Promise<void> {
    await storage.set({ currentSeedPhrase: seedPhrase });
  },

  // Get seed phrase
  async getSeedPhrase(): Promise<string | null> {
    const result = await storage.get(['currentSeedPhrase']);
    return result.currentSeedPhrase || null;
  },

  // Store import flow flag
  async setImportFlow(isImport: boolean): Promise<void> {
    console.log('🔍 storageUtils: Setting import flow flag to:', isImport);
    await storage.set({ importFlow: isImport });
  },

  // Get import flow flag
  async getImportFlow(): Promise<boolean> {
    const result = await storage.get(['importFlow']);
    console.log('🔍 storageUtils: Getting import flow flag, result:', result);
    return result.importFlow || false;
  },

  // Clear sensitive data
  async clearSensitiveData(): Promise<void> {
    await Promise.all([
      storage.removeSession(['sessionPassword']),
      storage.remove(['tempPassword']),
      storage.remove(['currentSeedPhrase'])
    ]);
  }
};

// Export the storage API for direct access if needed
export { getStorageAPI };
