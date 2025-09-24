// Enhanced storage utility with better error handling and session management
import type { StorageAPI, BrowserAPIs } from '../types/browser-apis';

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
      
      console.log('Storage set successful:', Object.keys(items));
    } catch (error) {
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
      
      console.log('Session storage set successful:', Object.keys(items));
    } catch (error) {
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
      
      console.log('Session storage remove successful:', keys);
    } catch (error) {
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
      
      console.log('Storage remove successful:', keys);
    } catch (error) {
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
      
      console.log('Storage clear successful');
    } catch (error) {
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
      
      console.log('Session storage clear successful');
    } catch (error) {
      console.warn('Session storage clear error:', error);
      // Don't throw for session storage failures
    }
  }
};

// Enhanced session manager with persistent storage
class SecureSessionManager {
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private static readonly STORAGE_KEY = 'paycio_session';
  private static readonly PASSWORD_KEY = 'paycio_temp_password';
  
  static async createSession(password: string): Promise<{ sessionId: string; timestamp: number }> {
    try {
      const sessionId = crypto.randomUUID();
      const timestamp = Date.now();
      
      const sessionData = {
        sessionId,
        timestamp,
        isValid: true,
        passwordHash: await this.hashPassword(password)
      };
      
      // Store session data in LOCAL storage (persistent)
      await storage.set({ [this.STORAGE_KEY]: sessionData });
      
      // Store password temporarily in LOCAL storage for immediate use
      // This will persist across browser sessions until explicitly cleared
      await storage.set({ [this.PASSWORD_KEY]: password });
      
      // Also store in session storage for immediate access
      await storage.setSession({ sessionPassword: password });
      
      console.log('Session created successfully:', sessionId);
      return { sessionId, timestamp };
      
    } catch (error) {
      console.error('Session creation failed:', error);
      throw new Error('Failed to create session');
    }
  }
  
  static async validateSession(): Promise<boolean> {
    try {
      // Check LOCAL storage first (persistent)
      let result = await storage.get([this.STORAGE_KEY]);
      let sessionData = result[this.STORAGE_KEY];
      
      // Fallback to session storage if not found in local
      if (!sessionData) {
        result = await storage.getSession([this.STORAGE_KEY]);
        sessionData = result[this.STORAGE_KEY];
      }
      
      if (!sessionData || !sessionData.sessionId || !sessionData.timestamp) {
        console.log('No valid session data found');
        return false;
      }
      
      const now = Date.now();
      const sessionAge = now - sessionData.timestamp;
      
      if (sessionAge > this.SESSION_TIMEOUT) {
        console.log('Session expired');
        await this.destroySession();
        return false;
      }
      
      console.log('Session is valid');
      return true;
      
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }
  
  static async extendSession(): Promise<boolean> {
    try {
      // Check LOCAL storage first
      let result = await storage.get([this.STORAGE_KEY]);
      let sessionData = result[this.STORAGE_KEY];
      
      // Fallback to session storage
      if (!sessionData) {
        result = await storage.getSession([this.STORAGE_KEY]);
        sessionData = result[this.STORAGE_KEY];
      }
      
      if (!sessionData || !sessionData.isValid) {
        return false;
      }
      
      // Update timestamp
      const updatedSessionData = {
        ...sessionData,
        timestamp: Date.now()
      };
      
      // Update in LOCAL storage (persistent)
      await storage.set({ [this.STORAGE_KEY]: updatedSessionData });
      
      // Also update in session storage
      await storage.setSession({ [this.STORAGE_KEY]: updatedSessionData });
      
      console.log('Session extended');
      return true;
      
    } catch (error) {
      console.error('Session extension failed:', error);
      return false;
    }
  }

  static async destroySession(): Promise<void> {
    try {
      // Clear from LOCAL storage (persistent)
      await storage.remove([this.STORAGE_KEY, this.PASSWORD_KEY]);
      
      // Clear from session storage
      await storage.removeSession([this.STORAGE_KEY, 'sessionPassword']);
      
      console.log('Session destroyed');
    } catch (error) {
      console.error('Session destruction failed:', error);
    }
  }

  static async getSessionPassword(): Promise<string | null> {
    try {
      // Try session storage first (immediate access)
      let result = await storage.getSession(['sessionPassword']);
      if (result.sessionPassword) {
        return result.sessionPassword;
      }
      
      // Fallback to LOCAL storage (persistent)
      result = await storage.get([this.PASSWORD_KEY]);
      if (result[this.PASSWORD_KEY]) {
        // Restore to session storage for immediate access
        await storage.setSession({ sessionPassword: result[this.PASSWORD_KEY] });
        return result[this.PASSWORD_KEY];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get session password:', error);
      return null;
    }
  }
  
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}


// Enhanced storage utilities
export const storageUtils = {
  // Store wallet with validation
  async storeWallet(wallet: any): Promise<void> {
    try {
      if (!wallet || !wallet.id) {
        throw new Error('Invalid wallet data');
      }
      
    await storage.set({ wallet });
      console.log('Wallet stored successfully:', wallet.id);
      
    } catch (error) {
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
        console.log('Wallet retrieved successfully:', wallet.id);
        return wallet;
      }
      
      console.log('No wallet found in storage');
      return null;
      
    } catch (error) {
      console.error('Failed to get wallet:', error);
      return null;
    }
  },

  // Enhanced password storage with persistence
  async storePassword(password: string): Promise<void> {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password');
      }
      
      // Store in session storage for immediate access
      await storage.setSession({ sessionPassword: password });
      
      // Store in LOCAL storage for persistence across browser sessions
      await storage.set({ 
        sessionPassword: password,
        backupPassword: btoa(password) // Encoded backup
      });
      
      console.log('Password stored successfully with persistence');
      
    } catch (error) {
      console.error('Failed to store password:', error);
      throw error;
    }
  },

  // Enhanced password retrieval with persistence
  async getPassword(): Promise<string | null> {
    try {
      // Try session storage first (immediate access)
      let result = await storage.getSession(['sessionPassword']);
      if (result.sessionPassword) {
        console.log('Password retrieved from session storage');
        return result.sessionPassword;
      }
      
      // Try LOCAL storage (persistent)
      result = await storage.get(['sessionPassword']);
      if (result.sessionPassword) {
        // Restore to session storage for immediate access
        await storage.setSession({ sessionPassword: result.sessionPassword });
        console.log('Password retrieved from persistent storage');
        return result.sessionPassword;
      }
      
      // Try backup storage (encoded)
      result = await storage.get(['backupPassword']);
      if (result.backupPassword) {
        try {
          const decoded = atob(result.backupPassword);
          // Restore to both storages
          await storage.setSession({ sessionPassword: decoded });
          await storage.set({ sessionPassword: decoded });
          console.log('Password retrieved from backup storage');
          return decoded;
        } catch (decodeError) {
          console.warn('Failed to decode backup password:', decodeError);
        }
      }
      
      console.log('No password found in storage');
      return null;
      
    } catch (error) {
      console.error('Failed to get password:', error);
      return null;
    }
  },

  // Clear sensitive data (session only, preserves wallet data)
  async clearSensitiveData(): Promise<void> {
    try {
      await Promise.all([
        storage.removeSession(['sessionPassword']),
        storage.remove(['sessionPassword', 'backupPassword', 'tempPassword', 'unlockTime']),
        SecureSessionManager.destroySession()
      ]);
      console.log('Sensitive session data cleared - wallet data preserved');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  },

  // Store unlock time
  async storeUnlockTime(timestamp: number): Promise<void> {
    try {
      await storage.set({ unlockTime: timestamp });
      console.log('Unlock time stored:', timestamp);
    } catch (error) {
      console.error('Failed to store unlock time:', error);
    }
  },

  // Get unlock time
  async getUnlockTime(): Promise<number | null> {
    try {
      const result = await storage.get(['unlockTime']);
      return result.unlockTime || null;
    } catch (error) {
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
      console.log('Seed phrase stored successfully');
    } catch (error) {
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
      console.error('Failed to get seed phrase:', error);
      return null;
    }
  },

  // Store import flow flag
  async setImportFlow(isImport: boolean): Promise<void> {
    try {
    console.log('🔍 storageUtils: Setting import flow flag to:', isImport);
    await storage.set({ importFlow: isImport });
    } catch (error) {
      console.error('Failed to set import flow flag:', error);
      throw error;
    }
  },

  // Get import flow flag
  async getImportFlow(): Promise<boolean> {
    try {
    const result = await storage.get(['importFlow']);
    console.log('🔍 storageUtils: Getting import flow flag, result:', result);
    return result.importFlow || false;
    } catch (error) {
      console.error('Failed to get import flow flag:', error);
      return false;
    }
  }
};

// Export the session manager
export { SecureSessionManager };
