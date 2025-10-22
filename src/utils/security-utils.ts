import { storage } from './storage-utils';
import { encryptData, decryptData } from './crypto-utils'; // Import specific crypto functions

// Secure storage utilities
export class SecureStorage {
  private static instance: SecureStorage;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  // Securely store data
  async secureStore(key: string, data: any, password: string): Promise<void> {
    try {
      const dataString = JSON.stringify(data);
      const encrypted = await encryptData(dataString, password);

      // Store in cross-browser storage
      await storage.set({
        [key]: encrypted
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Secure storage error:', error);
      throw new Error('Failed to store data securely');
    }
  }

  // Securely retrieve data
  async secureRetrieve(key: string, password: string): Promise<any> {
    try {
      const result = await storage.get([key]);
      const encrypted = result[key];

      if (!encrypted) {
        throw new Error('No data found for key');
      }

      const decrypted = await decryptData(encrypted, password);
      return JSON.parse(decrypted);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Secure retrieval error:', error);
      throw new Error('Failed to retrieve data securely');
    }
  }

  // Clear secure data
  async secureClear(key: string): Promise<void> {
    try {
      await storage.remove([key]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Secure clear error:', error);
      throw new Error('Failed to clear data securely');
    }
  }
} 