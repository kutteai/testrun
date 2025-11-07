import type { EncryptedVault } from '../types';

/**
 * Secure encryption utilities for wallet data
 * Uses Web Crypto API for strong encryption
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const ALGORITHM = 'AES-GCM';

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data
 */
export async function encrypt(data: string, password: string): Promise<EncryptedVault> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    dataBuffer
  );

  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encryptedData = btoa(String.fromCharCode(...encryptedArray));
  const saltString = btoa(String.fromCharCode(...salt));
  const ivString = btoa(String.fromCharCode(...iv));

  return {
    version: '1',
    data: encryptedData,
    salt: saltString,
    iv: ivString,
  };
}

/**
 * Decrypt sensitive data
 */
export async function decrypt(vault: EncryptedVault, password: string): Promise<string> {
  try {
    // Convert from base64
    const encryptedData = Uint8Array.from(atob(vault.data), c => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(vault.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(vault.iv), c => c.charCodeAt(0));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
}

/**
 * Hash password for verification (not for encryption)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random mnemonic phrase (12 or 24 words)
 */
export async function generateMnemonic(wordCount: 12 | 24 = 12): Promise<string> {
  const { generateMnemonic: bip39Generate } = await import('bip39');
  const strength = wordCount === 12 ? 128 : 256;
  return bip39Generate(strength);
}

/**
 * Validate mnemonic phrase
 */
export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  const { validateMnemonic: bip39Validate } = await import('bip39');
  return bip39Validate(mnemonic);
}

/**
 * Derive HD wallet seed from mnemonic
 */
export async function mnemonicToSeed(mnemonic: string, passphrase: string = ''): Promise<Buffer> {
  const { mnemonicToSeedSync } = await import('bip39');
  return mnemonicToSeedSync(mnemonic, passphrase);
}

/**
 * Secure random string generation
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Zeroize sensitive data in memory (best effort)
 */
export function zeroize(data: any): void {
  if (typeof data === 'string') {
    // Can't truly zeroize strings in JS, but we can try
    data = '';
  } else if (data instanceof Uint8Array || data instanceof Array) {
    data.fill(0);
  } else if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      zeroize(data[key]);
      delete data[key];
    }
  }
}