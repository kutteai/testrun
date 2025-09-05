import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import * as CryptoJS from 'crypto-js';
import * as bcrypt from 'bcryptjs';

// BIP39 supported entropy lengths and corresponding word counts
export const BIP39_ENTROPY_LENGTHS = {
  128: 12, // 12 words (128 bits entropy)
  160: 15, // 15 words (160 bits entropy)
  192: 18, // 18 words (192 bits entropy)
  224: 21, // 21 words (224 bits entropy)
  256: 24  // 24 words (256 bits entropy)
} as const;

export type EntropyLength = keyof typeof BIP39_ENTROPY_LENGTHS;
export type WordCount = typeof BIP39_ENTROPY_LENGTHS[EntropyLength];

// Generate BIP39 seed phrase (real implementation) - defaults to 24 words for maximum security
export function generateBIP39SeedPhrase(): string {
  return bip39.generateMnemonic(256); // 24 words for maximum security
}

// Generate 12-word seed phrase (like MetaMask)
export function generateBIP39SeedPhrase12(): string {
  return bip39.generateMnemonic(128); // 12 words like MetaMask
}

// Generate 15-word seed phrase
export function generateBIP39SeedPhrase15(): string {
  return bip39.generateMnemonic(160); // 15 words
}

// Generate 18-word seed phrase
export function generateBIP39SeedPhrase18(): string {
  return bip39.generateMnemonic(192); // 18 words
}

// Generate 21-word seed phrase
export function generateBIP39SeedPhrase21(): string {
  return bip39.generateMnemonic(224); // 21 words
}

// Generate 24-word seed phrase (maximum security)
export function generateBIP39SeedPhrase24(): string {
  return bip39.generateMnemonic(256); // 24 words for maximum security
}

// Generate seed phrase with specified entropy (128 for 12 words, 256 for 24 words, etc.)
export function generateBIP39SeedPhraseWithEntropy(entropy: EntropyLength = 256): string {
  return bip39.generateMnemonic(entropy);
}

// Generate seed phrase with specified word count
export function generateBIP39SeedPhraseWithWordCount(wordCount: WordCount): string {
  const entropyLength = Object.entries(BIP39_ENTROPY_LENGTHS).find(([_, count]) => count === wordCount)?.[0];
  
  if (!entropyLength) {
    throw new Error(`Invalid word count: ${wordCount}. Supported: ${Object.values(BIP39_ENTROPY_LENGTHS).join(', ')}`);
  }
  
  return bip39.generateMnemonic(parseInt(entropyLength) as EntropyLength);
}

// Get entropy length from word count
export function getEntropyFromWordCount(wordCount: number): EntropyLength | null {
  const entropyLength = Object.entries(BIP39_ENTROPY_LENGTHS).find(([_, count]) => count === wordCount)?.[0];
  return entropyLength ? (parseInt(entropyLength) as EntropyLength) : null;
}

// Get word count from entropy length
export function getWordCountFromEntropy(entropy: EntropyLength): WordCount {
  return BIP39_ENTROPY_LENGTHS[entropy];
}

// Validate BIP39 seed phrase (real implementation) - supports all BIP39 lengths
export function validateBIP39SeedPhrase(seedPhrase: string): boolean {
  try {
    const trimmed = seedPhrase.trim();
    const wordCount = trimmed.split(/\s+/).length;
    const isValid = bip39.validateMnemonic(trimmed);
    
    // Check if word count is supported
    const supportedWordCounts = Object.values(BIP39_ENTROPY_LENGTHS);
    const isSupportedLength = supportedWordCounts.includes(wordCount as WordCount);
    
    console.log('BIP39 validation:', {
      original: seedPhrase,
      trimmed: trimmed,
      wordCount: wordCount,
      isValid: isValid,
      isSupportedLength: isSupportedLength,
      expectedWords: getWordCountDescription(wordCount),
      supportedLengths: supportedWordCounts
    });
    
    return isValid && isSupportedLength;
  } catch (error) {
    console.error('Seed phrase validation error:', error);
    return false;
  }
}

// Enhanced validation with detailed error feedback
export function validateBIP39SeedPhraseWithFeedback(seedPhrase: string): {
  isValid: boolean;
  error?: string;
  wordCount: number;
  supportedLengths: number[];
} {
  try {
    const trimmed = seedPhrase.trim();
    
    // Check if empty
    if (!trimmed) {
      return {
        isValid: false,
        error: 'Seed phrase cannot be empty',
        wordCount: 0,
        supportedLengths: Object.values(BIP39_ENTROPY_LENGTHS)
      };
    }
    
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;
    const supportedWordCounts = Object.values(BIP39_ENTROPY_LENGTHS);
    
    // Check word count
    if (!supportedWordCounts.includes(wordCount as WordCount)) {
      return {
        isValid: false,
        error: `Invalid word count: ${wordCount}. Supported lengths: ${supportedWordCounts.join(', ')} words`,
        wordCount,
        supportedLengths: supportedWordCounts
      };
    }
    
    // Check for empty words
    if (words.some(word => word.length === 0)) {
      return {
        isValid: false,
        error: 'Seed phrase contains empty words. Please check for extra spaces.',
        wordCount,
        supportedLengths: supportedWordCounts
      };
    }
    
    // Validate with BIP39
    const isValid = bip39.validateMnemonic(trimmed);
    
    if (!isValid) {
      // Try to provide more specific feedback
      const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));
      if (invalidWords.length > 0) {
        return {
          isValid: false,
          error: `Invalid words found: ${invalidWords.join(', ')}. Please check spelling.`,
          wordCount,
          supportedLengths: supportedWordCounts
        };
      }
      
      return {
        isValid: false,
        error: 'Invalid seed phrase. Please check the order and spelling of all words.',
        wordCount,
        supportedLengths: supportedWordCounts
      };
    }
    
    return {
      isValid: true,
      wordCount,
      supportedLengths: supportedWordCounts
    };
    
  } catch (error) {
    console.error('Seed phrase validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate seed phrase. Please try again.',
      wordCount: 0,
      supportedLengths: Object.values(BIP39_ENTROPY_LENGTHS)
    };
  }
}

// Get description for word count
export function getWordCountDescription(wordCount: number): string {
  switch (wordCount) {
    case 12:
      return '12 words (128 bits entropy - MetaMask style)';
    case 15:
      return '15 words (160 bits entropy)';
    case 18:
      return '18 words (192 bits entropy)';
    case 21:
      return '21 words (224 bits entropy)';
    case 24:
      return '24 words (256 bits entropy - Maximum security)';
    default:
      return `Invalid count: ${wordCount}. Supported: 12, 15, 18, 21, 24`;
  }
}

// Get security level description
export function getSecurityLevelDescription(wordCount: number): string {
  switch (wordCount) {
    case 12:
      return 'Standard Security (128 bits)';
    case 15:
      return 'Enhanced Security (160 bits)';
    case 18:
      return 'High Security (192 bits)';
    case 21:
      return 'Very High Security (224 bits)';
    case 24:
      return 'Maximum Security (256 bits)';
    default:
      return 'Unknown Security Level';
  }
}

// Get entropy bits from word count
export function getEntropyBits(wordCount: number): number | null {
  const entropyLength = getEntropyFromWordCount(wordCount);
  return entropyLength || null;
}

// Helper function to provide user-friendly guidance for seed phrase issues
export function getSeedPhraseGuidance(validation: {
  isValid: boolean;
  error?: string;
  wordCount: number;
  supportedLengths: number[];
}): string {
  if (validation.isValid) {
    return 'Your seed phrase is valid and ready to use.';
  }

  const { error, wordCount, supportedLengths } = validation;
  
  if (error?.includes('word count')) {
    return `Your seed phrase has ${wordCount} words, but it needs exactly ${supportedLengths.join(', ')} words. Please check that you have the correct number of words.`;
  }
  
  if (error?.includes('empty words')) {
    return 'Your seed phrase contains empty words. Please remove any extra spaces between words.';
  }
  
  if (error?.includes('Invalid words found')) {
    return 'Some words in your seed phrase are not valid. Please check the spelling of each word against the BIP39 word list.';
  }
  
  if (error?.includes('Invalid seed phrase')) {
    return 'Your seed phrase is not valid. Please double-check that all words are spelled correctly and in the right order.';
  }
  
  return 'Please check your seed phrase and try again.';
}

// Generate wallet address from public key for specific network (real implementation)
export function generateAddressFromPublicKey(publicKey: string): string {
  // For Ethereum-based networks, derive address from public key
  const address = ethers.getAddress(ethers.computeAddress(publicKey));
  return address;
}

// Encrypt data with password using AES-256 (real implementation)
export async function encryptData(data: string, password: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    
    // Derive key using PBKDF2
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password) as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    // Generate random IV
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    
    // Encrypt data using AES-256-GCM
    const dataKey = await crypto.subtle.importKey(
      'raw',
      derivedKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      dataKey,
      new TextEncoder().encode(data) as BufferSource
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...Array.from(combined)));
  } catch (error) {
    throw new Error('Encryption failed: ' + error);
  }
}

// Decrypt data with password (real implementation)
export async function decryptData(encryptedData: string, password: string): Promise<string | null> {
  try {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 32);
    const iv = combined.slice(32, 48);
    const encrypted = combined.slice(48);
    
    // Derive key using PBKDF2
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password) as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    // Decrypt data
    const dataKey = await crypto.subtle.importKey(
      'raw',
      derivedKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      dataKey,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    return null;
  }
}

// Hash password using bcrypt (real implementation)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password hash (real implementation)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate random bytes (real implementation)
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// Generate secure random string
export function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = generateRandomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  
  return result;
}

// Generate wallet seed from mnemonic (real implementation)
export function generateSeedFromMnemonic(mnemonic: string): string {
  return bip39.mnemonicToSeedSync(mnemonic).toString('hex');
}

// Validate private key format (including MetaMask format)
export function validatePrivateKey(privateKey: string): boolean {
  try {
    // Remove any whitespace and 0x prefix if present
    const cleanKey = privateKey.trim();
    const processedKey = cleanKey.startsWith('0x') ? cleanKey.slice(2) : cleanKey;
    
    // Check if it's a valid hex string of correct length (64 characters = 32 bytes)
    if (!/^[0-9a-fA-F]{64}$/.test(processedKey)) {
      console.log('Private key validation failed: Invalid hex format or length');
      return false;
    }
    
    // Check if it's not zero or too large
    const keyBigInt = BigInt('0x' + processedKey);
    if (keyBigInt === BigInt(0)) {
      console.log('Private key validation failed: Key is zero');
      return false;
    }
    
    if (keyBigInt >= BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')) {
      console.log('Private key validation failed: Key is too large');
      return false;
    }
    
    // Try to create a wallet to validate
    const wallet = new ethers.Wallet('0x' + processedKey);
    if (!wallet.address) {
      console.log('Private key validation failed: Could not derive address');
      return false;
    }
    
    console.log('Private key validation successful for address:', wallet.address);
    return true;
  } catch (error) {
    console.log('Private key validation failed with error:', error);
    return false;
  }
}

// Generate checksum for data integrity
export function generateChecksum(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

// Verify checksum
export function verifyChecksum(data: string, checksum: string): boolean {
  return generateChecksum(data) === checksum;
} 

// Import wallet from private key (real implementation)
export function importFromPrivateKey(privateKey: string, network: string = 'ethereum'): {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
} {
  try {
    // Validate private key
    if (!validatePrivateKey(privateKey)) {
      throw new Error('Invalid private key format');
    }

    // Clean the private key
    const cleanKey = privateKey.trim();
    const processedKey = cleanKey.startsWith('0x') ? cleanKey : '0x' + cleanKey;

    // Create wallet from private key
    const wallet = new ethers.Wallet(processedKey);
    
    // Get public key - use the correct property for ethers v6
    const publicKey = wallet.signingKey.publicKey;
    
    // Derive address
    const address = wallet.address;
    
    // Use standard derivation path for the network
    const derivationPath = getDerivationPath(network);
    
    return {
      address,
      privateKey: processedKey,
      publicKey,
      derivationPath
    };
  } catch (error) {
    console.error('Failed to import from private key:', error);
    throw new Error('Failed to import wallet from private key');
  }
}

// Get derivation path for specific network
export function getDerivationPath(network: string): string {
  switch (network.toLowerCase()) {
    case 'ethereum':
    case 'polygon':
    case 'bsc':
    case 'avalanche':
    case 'arbitrum':
    case 'optimism':
      return "m/44'/60'/0'/0/0"; // BIP44 for Ethereum-based networks
    case 'bitcoin':
      return "m/44'/0'/0'/0/0"; // BIP44 for Bitcoin
    case 'litecoin':
      return "m/44'/2'/0'/0/0"; // BIP44 for Litecoin
    case 'solana':
      return "m/44'/501'/0'/0/0"; // BIP44 for Solana
    case 'tron':
      return "m/44'/195'/0'/0/0"; // BIP44 for TRON
    case 'ton':
      return "m/44'/396'/0'/0/0"; // BIP44 for TON
    case 'xrp':
      return "m/44'/144'/0'/0/0"; // BIP44 for XRP
    default:
      return "m/44'/60'/0'/0/0"; // Default to Ethereum
  }
}

// Hash string for fallback address generation
export function hashString(input: string): string {
  return CryptoJS.SHA256(input).toString().slice(0, 40);
} 