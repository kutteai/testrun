 
 
 
import { storage } from './storage';

class SecurityManager {
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  static async encrypt(plaintext: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext),
    );

    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const data = new Uint8Array(atob(encryptedData).split('').map((c) => c.charCodeAt(0)));

      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);

      const key = await this.deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted,
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }

  static validateAddress(address: string, type = 'ethereum'): boolean {
    if (!address || typeof address !== 'string') return false;

    switch (type) {
      case 'ethereum':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'bitcoin':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      default:
        return false;
    }
  }

  static sanitizeInput(input: string, maxLength = 1000): string {
    if (typeof input !== 'string') return '';
    return input.slice(0, maxLength).replace(/[<>]/g, '');
  }

  // Base58 encoding utility
  static encodeBase58(bytes: number[]): string {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    let num = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      num = num * BigInt(256) + BigInt(bytes[i]);
    }

    let encoded = '';
    while (num > 0) {
      const remainder = Number(num % BigInt(58));
      encoded = alphabet[remainder] + encoded;
      num /= BigInt(58);
    }

    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      encoded = `1${encoded}`;
    }

    return encoded;
  }
}

export { SecurityManager };
