import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Password utilities for wallet security
 */

export interface PasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string, salt?: string): PasswordHash {
  const iterations = 100000;
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(32);
  const hash = pbkdf2Sync(password, saltBuffer, iterations, 64, 'sha512');
  
  return {
    hash: hash.toString('hex'),
    salt: saltBuffer.toString('hex'),
    iterations
  };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, passwordHash: PasswordHash): boolean {
  try {
    const { hash, salt, iterations } = passwordHash;
    const saltBuffer = Buffer.from(salt, 'hex');
    const testHash = pbkdf2Sync(password, saltBuffer, iterations, 64, 'sha512');
    return testHash.toString('hex') === hash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a random password
 */
export function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  };
}

/**
 * Create a simple hash for quick verification (not for security)
 */
export function createSimpleHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
