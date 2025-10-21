// Enhanced storage utility with better error handling and session management
import type { StorageAPI, BrowserAPIs } from '../types/browser-apis';
import SecureSessionManager from './secure-session-manager';

// Cross-browser storage getter
const getStorageAPI = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage;
  }
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage;
  }
  throw new Error('Browser storage API not available');
};

// Enhanced storage utility with better error handling
export const storage = {

  // Enhanced get with error handling
  async get(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();
      
      // Handle different browser APIs
      if (typeof browser !== 'undefined') {
      return await api.local.get(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage get error:', error);
      return {}; // Return empty object on error
    }
  },

  // Enhanced set with error handling
  async set(items: object): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
      await api.local.set(items);
      } else {
        return new Promise((resolve, reject) => {
          api.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
      
      // eslint-disable-next-line no-console
      console.log('Storage set successful:', Object.keys(items));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage set error:', error);
      throw error;
    }
  },

  // Session storage methods
  async getSession(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
        return await api.session.get(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.session.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage get error:', error);
      return {}; // Return empty object on error
    }
  },

  async setSession(items: object): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
        await api.session.set(items);
      } else {
        return new Promise((resolve, reject) => {
          api.session.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
      
      // eslint-disable-next-line no-console
      console.log('Session storage set successful:', Object.keys(items));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage set error:', error);
      // Don't throw for session storage failures
    }
  },

  async removeSession(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
        await api.session.remove(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.session.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage remove error:', error);
      // Don't throw for session storage failures
    }
  },

  async remove(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
      await api.local.remove(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  // Clear all local storage
  async clear(): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
      await api.local.clear();
      } else {
        return new Promise((resolve, reject) => {
          api.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  // Clear all session storage
  async clearSession(): Promise<void> {
    try {
      const api = getStorageAPI();
      
      if (typeof browser !== 'undefined') {
        await api.session.clear();
      } else {
        return new Promise((resolve, reject) => {
          api.session.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage clear error:', error);
      // Don't throw for session storage failures
    }
  }
};


// Enhanced storage utilities
export const storageUtils = {
  // Store wallet with validation
  async storeWallet(wallet: any): Promise<void> {
    try {
      if (!wallet || !wallet.id) {
        throw new Error('Invalid wallet data');
      }
      
    await storage.set({ wallet });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to store wallet:', error);
      throw error;
    }
  },

  // Get wallet with validation
  async getWallet(): Promise<any> {
    try {
    const result = await storage.get(['wallet']);
      const wallet = result.wallet;
      
      if (wallet && wallet.id) {

        return wallet;
      }

      return null;
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get wallet:', error);
      return null;
    }
  },

  // Enhanced password storage with persistence
  async storePassword(password: string): Promise<void> {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password');
    }
    await SecureSessionManager.createSession(password);
  },

  // Enhanced password retrieval with persistence
  async getPassword(): Promise<string | null> {
    return await SecureSessionManager.getSessionPassword();
  },

  // Clear sensitive data (session only, preserves wallet data)
  async clearSensitiveData(): Promise<void> {
    try {
      await Promise.all([
        storage.removeSession(['sessionPassword']),
        storage.remove(['sessionPassword', 'backupPassword', 'tempPassword', 'unlockTime']),
      ]);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear sensitive data:', error);
    }
  },

  // Store unlock time
  async storeUnlockTime(timestamp: number): Promise<void> {
    try {
      await storage.set({ unlockTime: timestamp });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to store unlock time:', error);
    }
  },

  // Get unlock time
  async getUnlockTime(): Promise<number | null> {
    try {
      const result = await storage.get(['unlockTime']);
      return result.unlockTime || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get unlock time:', error);
      return null;
    }
  },

  // Store seed phrase
  async storeSeedPhrase(seedPhrase: string): Promise<void> {
    try {
      if (!seedPhrase || typeof seedPhrase !== 'string') {
        throw new Error('Invalid seed phrase');
      }
      
    await storage.set({ currentSeedPhrase: seedPhrase });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to store seed phrase:', error);
      throw error;
    }
  },

  // Get seed phrase
  async getSeedPhrase(): Promise<string | null> {
    try {
    const result = await storage.get(['currentSeedPhrase']);
    return result.currentSeedPhrase || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get seed phrase:', error);
      return null;
    }
  },

  // Store import flow flag
  async setImportFlow(isImport: boolean): Promise<void> {
    try {

    await storage.set({ importFlow: isImport });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set import flow flag:', error);
      throw error;
    }
  },

  // Get import flow flag
  async getImportFlow(): Promise<boolean> {
    try {
    const result = await storage.get(['importFlow']);

    return result.importFlow || false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get import flow flag:', error);
      return false;
    }
  }
};
