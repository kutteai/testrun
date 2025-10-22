import { 
  validatePasswordStrength,
  securityUtils
} from '../utils/security-utils';
import { storage } from '../utils/storage-utils';
import * as crypto from 'crypto';

export interface SecurityState {
  isAuthenticated: boolean;
  isWalletUnlocked: boolean;
  autoLockTimeout: number;
  requirePassword: boolean;
  biometricAuth: boolean;
  failedAttempts: number;
  lastActivity: number;
  session: any;
}

export class SecurityManager {
  private state: SecurityState;
  private rateLimitInfo: any;

  constructor() {
    this.state = {
      isAuthenticated: false,
      isWalletUnlocked: false,
      autoLockTimeout: 15,
      requirePassword: true,
      biometricAuth: false,
      failedAttempts: 0,
      lastActivity: Date.now(),
      session: null
    };
    this.rateLimitInfo = {
      attempts: 0,
      lastAttempt: 0,
      isLocked: false,
      lockoutUntil: 0
    };
    this.loadSecuritySettings();
  }

  // Load security settings from storage
  private async loadSecuritySettings(): Promise<void> {
    try {
      const result = await storage.get(['securitySettings', 'isWalletUnlocked']);
      if (result.securitySettings) {
        this.state = { ...this.state, ...result.securitySettings };
      }
      if (result.isWalletUnlocked !== undefined) {
        this.state.isWalletUnlocked = result.isWalletUnlocked;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading security settings:', error);
    }
  }

  // Save security settings to storage
  private async saveSecuritySettings(): Promise<void> {
    try {
      await storage.set({ 
        securitySettings: this.state,
        isWalletUnlocked: this.state.isWalletUnlocked
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving security settings:', error);
    }
  }

  async saveEncryptedPassword(encryptedPassword: string): Promise<void> {
    try {
      await storage.set({ encryptedPassword });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save encrypted password:', error);
    }
  }

  async getEncryptedPassword(): Promise<string | null> {
    try {
      const result = await storage.get(['encryptedPassword']);
      return result.encryptedPassword || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get encrypted password:', error);
      return null;
    }
  }

  // Check if wallet is unlocked
  async isWalletUnlocked(): Promise<boolean> {
    return this.state.isWalletUnlocked;
  }

  // Authenticate user
  async authenticate(password: string): Promise<boolean> {
    try {
      
      const storedPassword = await this.getStoredPassword();
      
      if (storedPassword === password) {
        // Successful authentication
        this.state.isAuthenticated = true;
        this.state.failedAttempts = 0;
        this.state.lastActivity = Date.now();
        
        await this.saveSecuritySettings();
        return true;
      } else {
        // Failed authentication
        this.state.failedAttempts++;
        await this.saveSecuritySettings();
        return false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Authentication error:', error);
      return false;
    }
  }

  // Unlock wallet
  async unlockWallet(password: string): Promise<boolean> {
    const success = await this.authenticate(password);
    if (success) {
      this.state.isWalletUnlocked = true;
      await this.saveSecuritySettings();
    }
    return success;
  }

  // Lock wallet
  async lockWallet(): Promise<void> {
    this.state.isAuthenticated = false;
    this.state.isWalletUnlocked = false;
    this.state.session = null;
    await this.saveSecuritySettings();
  }

  // Check if session is valid
  isSessionValid(): boolean {
    if (!this.state.session) return false;
    // Simple session validation based on last activity
    const now = Date.now();
    const sessionTimeout = this.state.autoLockTimeout * 60 * 1000; // Convert to milliseconds
    return (now - this.state.lastActivity) < sessionTimeout;
  }

  // Update session activity
  updateActivity(): void {
    this.state.lastActivity = Date.now();
  }

  // Perform security check
  async performSecurityCheck(): Promise<boolean> {
    // Check if session is still valid
    if (!this.isSessionValid()) {
      await this.lockWallet();
      return false;
    }

    // Update activity
    this.updateActivity();
    return true;
  }

  // Update security settings
  async updateSettings(settings: Partial<SecurityState>): Promise<void> {
    this.state = { ...this.state, ...settings };
    await this.saveSecuritySettings();
  }

  // Get security state
  getSecurityState(): SecurityState {
    return { ...this.state };
  }

  // Validate password strength
  validatePassword(password: string): { isValid: boolean; score: number; feedback: string[] } {
    return validatePasswordStrength(password);
  }

  // Set password
  async setPassword(password: string): Promise<void> {
    const validation = this.validatePassword(password);
    if (!validation.isValid) {
      throw new Error('Password does not meet security requirements');
    }

    await this.storePassword(password);
  }

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    // First, authenticate the old password
    const isAuthenticated = await this.authenticate(oldPassword);
    if (!isAuthenticated) {
      throw new Error('Invalid current password');
    }

    // Validate the new password strength
    const validation = this.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error('New password does not meet security requirements');
    }

    // Store the new password (which will encrypt it)
    await this.storePassword(newPassword);

    // Update last activity to reflect successful password change
    this.state.lastActivity = Date.now();
    await this.saveSecuritySettings();
  }

  private async storePassword(password: string): Promise<void> {
    try {
      // Hash password before storing
      const { hashPassword } = await import('../utils/crypto-utils');
      const hashedPassword = await hashPassword(password);
      
      // Encrypt the hashed password with a master key
      const { encryptData } = await import('../utils/crypto-utils');
      const masterKey = await this.getMasterKey();
      const encryptedPassword = await encryptData(hashedPassword, masterKey);
      
      // Store encrypted password in secure storage
      await this.saveEncryptedPassword(encryptedPassword);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error storing password:', error);
      throw error;
    }
  }

  private async getStoredPassword(): Promise<string | null> {
    try {
      const encryptedPassword = await this.getEncryptedPassword();
      
      if (!encryptedPassword) {
        return null;
      }
      
      // Decrypt the password
      const { decryptData } = await import('../utils/crypto-utils');
      const masterKey = await this.getMasterKey();
      const decryptedPassword = await decryptData(encryptedPassword, masterKey);
      
      return decryptedPassword;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting stored password:', error);
      return null;
    }
  }

  // Get master key for password encryption
  private async getMasterKey(): Promise<string> {
    try {
      // Attempt to retrieve existing master key from storage
      const result = await storage.get(['masterKey']);
      if (result.masterKey) {
        return result.masterKey;
      }

      // Generate a new master key if none exists
      const uuid = crypto.randomUUID();
      const browserFingerprint = `${navigator.userAgent}-${navigator.platform}-${screen.width}x${screen.height}-${navigator.language}`;
      const derivedMasterKey = `${uuid}-${crypto.createHash('sha256').update(browserFingerprint).digest('hex')}`;

      // Store the newly generated master key securely
      await storage.set({ masterKey: derivedMasterKey });

      return derivedMasterKey;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting master key:', error);
      throw error;
    }
  } 

  // Secure store data
  async secureStore(key: string, value: any, password: string): Promise<void> {
    await securityUtils.SecureStorage.secureStore(key, value, password);
  }

  // Secure retrieve data
  async secureRetrieve(key: string, password: string): Promise<any> {
    return await securityUtils.SecureStorage.secureRetrieve(key, password);
  }

  // Get failed attempts
  getFailedAttempts(): number {
    return this.state.failedAttempts;
  }

  // Reset failed attempts
  resetFailedAttempts(): void {
    this.state.failedAttempts = 0;
    this.rateLimitInfo = {
      attempts: 0,
      lastAttempt: 0,
      isLocked: false,
      lockoutUntil: 0
    };
  }
} 