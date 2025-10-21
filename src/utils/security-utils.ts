import { createHash, randomBytes, pbkdf2Sync, createCipher, createDecipher } from 'crypto-browserify';
import { Buffer } from 'buffer';
import { storage } from './storage-utils';

// Enhanced security utilities for wallet protection

export interface EncryptedData {
  iv: string;
  salt: string;
  data: string;
  algorithm: string;
  iterations: number;
  authTag?: string;
}

export interface SecurityConfig {
  keyDerivationIterations: number;
  keyLength: number;
  algorithm: string;
  saltLength: number;
  ivLength: number;
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  keyDerivationIterations: 100000, // High iteration count for security
  keyLength: 32, // 256 bits
  algorithm: 'aes-256-gcm',
  saltLength: 32,
  ivLength: 16
};

// Enhanced encryption with proper key derivation
export async function encryptDataSecurely(
  data: string, 
  password: string, 
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<EncryptedData> {
  try {
    // Generate random salt and IV
    const salt = randomBytes(config.saltLength);
    const iv = randomBytes(config.ivLength);
    
    // Derive key from password using PBKDF2
    const key = pbkdf2Sync(
      password, 
      salt, 
      config.keyDerivationIterations, 
      config.keyLength, 
      'sha256'
    );
    
    // Encrypt data
    const cipher = createCipher(config.algorithm, key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag for GCM mode
    const authTag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag() : null;
    
  return {
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      data: encrypted,
      algorithm: config.algorithm,
      iterations: config.keyDerivationIterations,
      authTag: authTag ? authTag.toString('hex') : undefined
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data securely');
  }
}

// Enhanced decryption with proper key derivation
export async function decryptDataSecurely(
  encryptedData: EncryptedData, 
  password: string
): Promise<string> {
  try {
    // Reconstruct salt and IV
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    // Derive key from password using same parameters
    const key = pbkdf2Sync(
      password, 
      salt, 
      encryptedData.iterations, 
      32, 
      'sha256'
    );
    
    // Decrypt data
    const decipher = createDecipher(encryptedData.algorithm, key);
    decipher.setAutoPadding(true);
    
    // Set IV and auth tag if available
    if (encryptedData.authTag) {
      (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    }
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - invalid password or corrupted data');
  }
}

// Secure random number generation
export function generateSecureRandom(length: number = 32): Buffer {
  return randomBytes(length);
}

// Secure hash generation
export function generateSecureHash(data: string, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(data).digest('hex');
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) {
    score += 2;
  } else if (password.length >= 8) {
    score += 1;
    feedback.push('Password should be at least 12 characters long');
  } else {
    feedback.push('Password is too short');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Feedback for missing character types
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^A-Za-z0-9]/.test(password)) feedback.push('Add special characters');

  // Common password check
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('This is a commonly used password');
  }
  
  const isValid = score >= 4;

  return {
    isValid,
    score: Math.min(score, 5),
    feedback
  };
}

// Secure key generation for wallet
export function generateSecureWalletKey(): string {
  const privateKey = randomBytes(32);
  return privateKey.toString('hex');
}

// Secure seed phrase validation
export function validateSeedPhrase(seedPhrase: string): {
  isValid: boolean;
  wordCount: number;
  feedback: string[];
} {
  const words = seedPhrase.trim().split(/\s+/);
  const feedback: string[] = [];
  
  // Check word count
  if (words.length !== 12 && words.length !== 24) {
    feedback.push('Seed phrase must be 12 or 24 words');
    return { isValid: false, wordCount: words.length, feedback };
  }
  
  // Check for empty words
  if (words.some(word => word.length === 0)) {
    feedback.push('Seed phrase contains empty words');
    return { isValid: false, wordCount: words.length, feedback };
  }
  
  // Check for duplicate words (basic check)
  const uniqueWords = new Set(words);
  if (uniqueWords.size !== words.length) {
    feedback.push('Seed phrase contains duplicate words');
    return { isValid: false, wordCount: words.length, feedback };
  }
  
  return {
    isValid: true,
    wordCount: words.length,
    feedback: []
  };
}

// Secure storage utilities
export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string | null = null;
  
  private constructor() {}
  
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }
  
  // Set encryption key for secure storage
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }
  
  // Securely store data
  async secureStore(key: string, data: any, password: string): Promise<void> {
    try {
      const dataString = JSON.stringify(data);
      const encrypted = await encryptDataSecurely(dataString, password);
      
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
      
      const decrypted = await decryptDataSecurely(encrypted, password);
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

// Export main utilities
export const securityUtils = {
  encryptDataSecurely,
  decryptDataSecurely,
  generateSecureRandom,
  generateSecureHash,
  validatePasswordStrength,
  generateSecureWalletKey,
  validateSeedPhrase,
  SecureStorage: SecureStorage.getInstance()
}; 