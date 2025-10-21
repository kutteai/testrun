import * as shajs from 'sha.js';
import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';

interface SessionData {
  encryptedPassword?: string;
  iv?: string;
  salt?: string;
  iterations?: number;
  lastActivity?: number;
}

const SESSION_KEY = 'secureSession';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class SecureSessionManager {
  private static sessionPasswordCache: string | null = null;

  private static async deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async createSession(password: string): Promise<boolean> {
    try {
      const salt = randomBytes(16); // 16 bytes for AES-GCM salt
      const iv = randomBytes(12); // 12 bytes for AES-GCM IV
      const iterations = 100000; // PBKDF2 iterations

      const key = await this.deriveKey(password, salt, iterations);

      const encoder = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        encoder.encode(password)
      );

      const sessionData: SessionData = {
        encryptedPassword: Buffer.from(new Uint8Array(encrypted)).toString('hex'),
        iv: Buffer.from(iv).toString('hex'),
        salt: Buffer.from(salt).toString('hex'),
        iterations,
        lastActivity: Date.now()
      };
      
      await chrome.storage.session.set({ [SESSION_KEY]: sessionData });

      // Cache the password in memory for quick access
      SecureSessionManager.sessionPasswordCache = password;

      return true;
    } catch (error) {
      console.error("Error creating secure session:", error);
      return false;
    }
  }

  static async getSessionPassword(): Promise<string | null> {
    if (SecureSessionManager.sessionPasswordCache) {
      return SecureSessionManager.sessionPasswordCache;
    }

    try {
      const result = await chrome.storage.session.get(SESSION_KEY);
      const sessionData: SessionData = result[SESSION_KEY];

      if (!sessionData || !sessionData.encryptedPassword || !sessionData.iv || !sessionData.salt || !sessionData.iterations || !sessionData.lastActivity) {
        return null;
      }

      // Check for session timeout
      if (Date.now() - sessionData.lastActivity > SESSION_TIMEOUT_MS) {
        await SecureSessionManager.clearSession();
        return null; // Session expired
      }

      const salt = Buffer.from(sessionData.salt, 'hex');
      const iv = Buffer.from(sessionData.iv, 'hex');
      const encryptedPassword = Buffer.from(sessionData.encryptedPassword, 'hex');

      const key = await this.deriveKey(SecureSessionManager.sessionPasswordCache || '', new Uint8Array(salt), sessionData.iterations);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        new Uint8Array(encryptedPassword)
      );

      const password = new TextDecoder().decode(decrypted);

      // Update last activity
      await chrome.storage.session.set({ [SESSION_KEY]: { ...sessionData, lastActivity: Date.now() } });

      SecureSessionManager.sessionPasswordCache = password;
      return password;
    } catch (error) {
      console.error("Error getting session password:", error);
      return null;
    }
  }

  static async clearSession(): Promise<void> {
    SecureSessionManager.sessionPasswordCache = null;
    await chrome.storage.session.remove(SESSION_KEY);
  }

  // Helper to check if a session exists and is active
  static async hasActiveSession(): Promise<boolean> {
    if (SecureSessionManager.sessionPasswordCache) {
      return true;
    }
    const result = await chrome.storage.session.get(SESSION_KEY);
    const sessionData: SessionData = result[SESSION_KEY];
    if (sessionData && sessionData.lastActivity && (Date.now() - sessionData.lastActivity <= SESSION_TIMEOUT_MS)) {
      return true;
    }
    return false;
  }
}

export default SecureSessionManager;
