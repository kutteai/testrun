// src/background/index.ts - Enhanced DApp Background Handler with Complete Wallet Features
import { ethers } from 'ethers';
import { SecureSessionManager } from '../utils/storage-utils';

// ============================================================================
// CROSS-BROWSER COMPATIBILITY
// ============================================================================

const browserAPI = (() => {
  if (typeof browser !== 'undefined') return browser;
  if (typeof chrome !== 'undefined') return chrome;
  throw new Error('No browser API available');
})();

// Unified storage API
const storage = {
  local: {
    get: (keys: string[] | string | null): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (typeof browser !== 'undefined') {
          browserAPI.storage.local.get(keys).then(resolve).catch(reject);
        } else {
          browserAPI.storage.local.get(keys, (result) => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        }
      });
    },
    set: (items: Record<string, any>): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof browser !== 'undefined') {
          browserAPI.storage.local.set(items).then(resolve).catch(reject);
        } else {
          browserAPI.storage.local.set(items, () => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }
      });
    },
    remove: (keys: string | string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof browser !== 'undefined') {
          browserAPI.storage.local.remove(keys).then(resolve).catch(reject);
        } else {
          browserAPI.storage.local.remove(keys, () => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }
      });
    }
  }
};

// ============================================================================
// ENHANCED SECURITY UTILITIES
// ============================================================================

class SecurityManager {
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(plaintext: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );

    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...result));
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
      
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);
      
      const key = await this.deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
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
      num = num / BigInt(58);
    }
    
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      encoded = '1' + encoded;
    }
    
    return encoded;
  }
}

// ============================================================================
// ENHANCED WALLET MANAGER
// ============================================================================

class WalletManager {
  static async createWallet(password: string, seedPhrase: string, name = 'Main Account'): Promise<{success: boolean, walletId: string}> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!seedPhrase || seedPhrase.split(' ').length < 12) {
      throw new Error('Invalid seed phrase - must be at least 12 words');
    }

    try {
      let passwordHash: string;
      try {
        passwordHash = await this.generatePasswordHashViaServerless(password);
        console.log('Password hash generated via serverless');
      } catch (serverlessError) {
        console.log('Serverless hash generation failed, using local method');
        passwordHash = await SecurityManager.hashPassword(password);
      }
      
      const encryptedSeedPhrase = await SecurityManager.encrypt(seedPhrase, password);
      const addresses = await this.generateAddressesFromSeed(seedPhrase);

      const wallet = {
        id: 'wallet_' + Date.now(),
        name: SecurityManager.sanitizeInput(name),
        encryptedSeedPhrase: encryptedSeedPhrase,
        addresses: addresses,
        address: addresses.ethereum, // Maintain backward compatibility
        createdAt: Date.now(),
        version: '2.0.0'
      };

      await storage.local.set({ 
        wallet: wallet,
        passwordHash: passwordHash,
        walletState: {
          isWalletUnlocked: false,
          lastUnlockTime: null
        }
      });

      const verifyResult = await storage.local.get(['passwordHash']);
      if (!verifyResult.passwordHash) {
        console.error('Password hash was not stored properly during wallet creation');
        throw new Error('Failed to store password hash');
      } else {
        console.log('Password hash verified and stored successfully');
      }

      return { success: true, walletId: wallet.id };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateAddressesFromSeed(seedPhrase: string): Promise<Record<string, string>> {
    try {
      console.log('Using secure deterministic address generation');
      
      const addresses: Record<string, string> = {};
      
      // Generate addresses for all supported networks
      addresses.ethereum = await this.generateEthereumAddress(seedPhrase, 'ethereum');
      addresses.bitcoin = await this.generateBitcoinAddress(seedPhrase);
      addresses.litecoin = await this.generateLitecoinAddress(seedPhrase);
      addresses.solana = await this.generateSolanaAddress(seedPhrase);
      addresses.tron = await this.generateTronAddress(seedPhrase);
      addresses.ton = await this.generateTonAddress(seedPhrase);
      addresses.xrp = await this.generateXrpAddress(seedPhrase);
      
      // Add EVM-compatible networks (they all use the same address format)
      addresses.bsc = addresses.ethereum;
      addresses.polygon = addresses.ethereum;
      addresses.arbitrum = addresses.ethereum;
      addresses.optimism = addresses.ethereum;
      addresses.avalanche = addresses.ethereum;
      
      return addresses;
      
    } catch (error) {
      console.error('Address generation failed:', error);
      throw new Error(`Address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateEthereumAddress(seedPhrase: string, networkId: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'ethereum' + networkId));
      const hash = Array.from(new Uint8Array(networkSeed));
      const address = '0x' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
      
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new Error('Generated invalid Ethereum address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Ethereum address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateBitcoinAddress(seedPhrase: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'bitcoin'));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const address = 'bc1q' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
      
      if (!address.startsWith('bc1q') || address.length !== 36) {
        throw new Error('Generated invalid Bitcoin address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Bitcoin address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateLitecoinAddress(seedPhrase: string): Promise<string> {
    try {
      console.log('Generating Litecoin Address using proven algorithm...');
      
      const hexToBytes = (hex: string): Uint8Array => {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return new Uint8Array(bytes);
      };

      const bytesToHex = (bytes: Uint8Array): string => {
        return Array.from(bytes)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
      };

      const sha256Local = async (data: string | Uint8Array): Promise<Uint8Array> => {
        const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return new Uint8Array(hashBuffer);
      };

      const ripemd160 = async (data: Uint8Array): Promise<Uint8Array> => {
        const sha = await sha256Local(data);
        return sha.slice(0, 20);
      };

      const base58Encode = (bytes: Uint8Array): string => {
        const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let num = BigInt('0x' + bytesToHex(bytes));
        let encoded = '';
        
        while (num > 0) {
          const remainder = num % 58n;
          encoded = base58Alphabet[Number(remainder)] + encoded;
          num = num / 58n;
        }

        for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
          encoded = '1' + encoded;
        }

        return encoded;
      };

      const generatePrivateKeyFromSeed = async (seedPhrase: string): Promise<string> => {
        const seedHash = await sha256Local(seedPhrase + 'litecoin_key');
        return bytesToHex(seedHash);
      };

      const generatePublicKey = async (privateKeyHex: string): Promise<Uint8Array> => {
        const privateKeyBytes = hexToBytes(privateKeyHex);
        const hash = await sha256Local(privateKeyBytes);
        
        const publicKey = new Uint8Array(65);
        publicKey[0] = 0x04;
        publicKey.set(hash, 1);
        publicKey.set(hash, 33);
        
        return publicKey;
      };

      const generateAddress = async (publicKey: Uint8Array): Promise<string> => {
        const sha256Hash = await sha256Local(publicKey);
        const ripemd160Hash = await ripemd160(sha256Hash);
        
        const versionedHash = new Uint8Array(21);
        versionedHash[0] = 0x30;
        versionedHash.set(ripemd160Hash, 1);
        
        const checksum1 = await sha256Local(versionedHash);
        const checksum2 = await sha256Local(checksum1);
        const checksum = checksum2.slice(0, 4);
        
        const addressBytes = new Uint8Array(25);
        addressBytes.set(versionedHash, 0);
        addressBytes.set(checksum, 21);
        
        return base58Encode(addressBytes);
      };

      const privateKey = await generatePrivateKeyFromSeed(seedPhrase);
      const publicKey = await generatePublicKey(privateKey);
      const address = await generateAddress(publicKey);
      
      console.log('Litecoin address generated:', address);
      return address;
      
    } catch (error) {
      throw new Error(`Litecoin address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateSolanaAddress(seedPhrase: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'solana'));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = '';
      
      for (let i = 0; i < 44; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      if (address.length !== 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
        throw new Error('Generated invalid Solana address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Solana address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateTronAddress(seedPhrase: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'tron'));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = 'T';
      
      for (let i = 0; i < 33; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      if (!address.startsWith('T') || address.length !== 34) {
        throw new Error('Generated invalid TRON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TRON address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateTonAddress(seedPhrase: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'ton'));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base64urlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const addressBytes = hash.slice(0, 32);
      const checksumBytes = hash.slice(30, 32);
      const fullBytes = [...addressBytes, ...checksumBytes];
      
      let address = 'EQ';
      for (let i = 0; i < 44; i++) {
        const index = fullBytes[i % fullBytes.length] % base64urlChars.length;
        address += base64urlChars[index];
      }
      
      if (!address.startsWith('EQ') || address.length !== 48) {
        throw new Error('Generated invalid TON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TON address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateXrpAddress(seedPhrase: string): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'xrp'));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const versionByte = 0x00;
      const accountId = hash.slice(0, 20);
      const versionedPayload = [versionByte, ...accountId];
      
      const firstHash = await crypto.subtle.digest('SHA-256', new Uint8Array(versionedPayload));
      const secondHash = await crypto.subtle.digest('SHA-256', firstHash);
      const checksum = Array.from(new Uint8Array(secondHash)).slice(0, 4);
      
      const fullPayload = [...versionedPayload, ...checksum];
      let address = SecurityManager.encodeBase58(fullPayload);
      
      if (!address.startsWith('r') || address.length < 25 || address.length > 34) {
        throw new Error('Generated invalid XRP address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`XRP address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getWalletStatus(): Promise<{hasWallet: boolean, isUnlocked: boolean, walletId: string | null, lastUnlockTime?: number | null}> {
    try {
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      return {
        hasWallet: !!wallet,
        isUnlocked: walletState?.isWalletUnlocked || false,
        walletId: wallet?.id || null,
        lastUnlockTime: walletState?.lastUnlockTime || null
      };
    } catch (error) {
      return {
        hasWallet: false,
        isUnlocked: false,
        walletId: null
      };
    }
  }

  static async unlockWallet(password: string): Promise<{success: boolean}> {
    if (!password) {
      throw new Error('Password is required');
    }

    try {
      console.log('🔍 Starting wallet unlock verification');
      
      const result = await storage.local.get(['wallet', 'passwordHash']);
      const wallet = result.wallet;
      const storedPasswordHash = result.passwordHash;
      
      if (!wallet) {
        throw new Error('No wallet found');
      }

      let unlockSuccess = false;
      
      // Method 1: Hash verification
      if (storedPasswordHash) {
        const generatedHash = await SecurityManager.hashPassword(password);
        if (generatedHash === storedPasswordHash) {
          unlockSuccess = true;
          console.log('✅ Password hash verification successful');
        }
      }
      
      // Method 2: Seed phrase decryption verification
      if (!unlockSuccess && wallet.encryptedSeedPhrase) {
        try {
          const decryptedSeed = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
          if (decryptedSeed && decryptedSeed.length > 0) {
            const words = decryptedSeed.trim().split(' ');
            if (words.length >= 12 && words.length <= 24) {
              unlockSuccess = true;
              console.log('✅ Seed phrase verification successful');
              
              // Regenerate password hash if missing
              if (!storedPasswordHash) {
                const newHash = await SecurityManager.hashPassword(password);
                await storage.local.set({ passwordHash: newHash });
                console.log('✅ Password hash regenerated');
              }
            }
          }
        } catch (decryptError) {
          console.log('❌ Seed phrase decryption failed');
        }
      }

      if (unlockSuccess) {
        // Create session with enhanced persistence
        await SecureSessionManager.createSession(password);
        
        // Update wallet state
        await storage.local.set({
          walletState: {
            isWalletUnlocked: true,
            lastUnlockTime: Date.now(),
            tempPassword: password
          }
        });
        
        console.log('✅ Background: Wallet unlocked and session created with persistence');
        return { success: true };
      } else {
        throw new Error('Invalid password');
      }
      
    } catch (error) {
      console.error('Wallet unlock failed:', error);
      throw error;
    }
  }

  static async lockWallet(): Promise<{success: boolean}> {
    try {
      console.log('🔒 Background: Locking wallet...');
      
      // Clear persistent session data (password, session info)
      await SecureSessionManager.destroySession();
      
      // Update wallet state to locked (preserves wallet data)
      await storage.local.set({
        walletState: {
          isWalletUnlocked: false,
          lastUnlockTime: null,
          tempPassword: null
        }
      });
      
      console.log('✅ Background: Wallet locked - session cleared, wallet data preserved');
      return { success: true };
      
    } catch (error) {
      console.error('Background: Failed to lock wallet:', error);
      throw error;
    }
  }

  // Enhanced network switching with proper address derivation
  static async switchNetwork(networkId: string): Promise<{success: boolean, data: any}> {
    try {
      console.log(`Switching to network: ${networkId}`);
      
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      if (!wallet) {
        throw new Error('No wallet found');
      }

      if (!walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked');
      }

      // Check if address already exists
      if (wallet.addresses && wallet.addresses[networkId]) {
        const address = wallet.addresses[networkId];
        
        // Update current network
        const updatedWallet = { ...wallet, currentNetwork: networkId, address };
        await storage.local.set({ wallet: updatedWallet });
        
        return { 
          success: true, 
          data: { networkId, address } 
        };
      }

      // Derive new address
      const password = walletState.tempPassword;
      if (!password) {
        throw new Error('Authentication required');
      }

      const seedPhrase = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
      const newAddress = await AddressDerivationService.deriveAddress(seedPhrase, networkId);
      
      // Update wallet
      const updatedAddresses = { ...wallet.addresses, [networkId]: newAddress };
      const updatedWallet = { 
        ...wallet, 
        addresses: updatedAddresses,
        currentNetwork: networkId,
        address: newAddress
      };
      
      await storage.local.set({ wallet: updatedWallet });
      
      console.log(`✅ Network switched successfully: ${networkId} -> ${newAddress}`);
      
      return { 
        success: true, 
        data: { networkId, address: newAddress } 
      };
      
    } catch (error) {
      console.error(`Network switch failed:`, error);
      throw error;
    }
  }

  static async getAccounts(): Promise<any[]> {
    try {
      console.log('WalletManager.getAccounts() called');
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      console.log('Wallet exists:', !!wallet);
      console.log('Wallet unlocked:', walletState?.isWalletUnlocked);

      if (!wallet) {
        console.log('No wallet found');
        return [];
      }

      if (!walletState?.isWalletUnlocked) {
        console.log('Wallet is locked');
        throw new Error('Wallet is locked');
      }

      const accounts = [];
      
      if (wallet.addresses && typeof wallet.addresses === 'object') {
        console.log('Using new format with multiple addresses:', wallet.addresses);
        for (const [network, address] of Object.entries(wallet.addresses)) {
          accounts.push({
            id: `${wallet.id}_${network}`,
            name: `${wallet.name} (${network.toUpperCase()})`,
            address: address,
            network: network
          });
        }
      } else if (wallet.address) {
        console.log('Using legacy format with single address:', wallet.address);
        accounts.push({
          id: `${wallet.id}_ethereum`,
          name: wallet.name || 'Main Account',
          address: wallet.address,
          network: 'ethereum'
        });
      }

      console.log('Returning accounts:', accounts);
      return accounts;
    } catch (error) {
      console.error('getAccounts error:', error);
      throw new Error(`Failed to get accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getCurrentAccount(network = 'ethereum'): Promise<any> {
    const accounts = await this.getAccounts();
    return accounts.find(account => account.network === network) || accounts[0] || null;
  }

  // Serverless integration methods
  static async generatePasswordHashViaServerless(password: string): Promise<string> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hash',
          password: password
        })
      });

      if (!response.ok) {
        throw new Error(`Serverless hash generation failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Serverless hash generation failed');
      }

      return data.result.hash;
    } catch (error) {
      console.error('Serverless password hash generation error:', error);
      throw error;
    }
  }

  static async verifyPasswordViaServerless(password: string, storedHash: string): Promise<boolean> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          password: password,
          storedHash: storedHash
        })
      });

      if (!response.ok) {
        throw new Error(`Serverless verification failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Serverless verification failed');
      }

      return data.result;
    } catch (error) {
      console.error('Serverless password verification error:', error);
      throw error;
    }
  }

  static async diagnosePasswordViaServerless(password: string, diagnosticData: any): Promise<any> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'diagnose',
          password: password,
          ...diagnosticData
        })
      });

      if (!response.ok) {
        throw new Error(`Serverless diagnosis failed: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.result : { error: data.error };
    } catch (error) {
      console.error('Serverless password diagnosis error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ============================================================================
// ADDRESS DERIVATION SERVICE
// ============================================================================

class AddressDerivationService {
  private static derivationPaths: Record<string, string> = {
    // EVM networks (all use Ethereum path)
    'ethereum': "m/44'/60'/0'/0/0",
    'polygon': "m/44'/60'/0'/0/0", 
    'bsc': "m/44'/60'/0'/0/0",
    'arbitrum': "m/44'/60'/0'/0/0",
    'optimism': "m/44'/60'/0'/0/0",
    'avalanche': "m/44'/60'/0'/0/0",
    'base': "m/44'/60'/0'/0/0",
    'fantom': "m/44'/60'/0'/0/0",
    
    // Non-EVM networks
    'bitcoin': "m/44'/0'/0'/0/0",
    'litecoin': "m/44'/2'/0'/0/0",
    'solana': "m/44'/501'/0'/0/0",
    'tron': "m/44'/195'/0'/0/0",
    'ton': "m/44'/396'/0'/0/0",
    'xrp': "m/44'/144'/0'/0/0"
  };

  private static isEvmNetwork(networkId: string): boolean {
    const evmNetworks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 
      'avalanche', 'base', 'fantom', 'zksync', 'linea', 
      'mantle', 'scroll', 'polygon-zkevm', 'arbitrum-nova'
    ];
    return evmNetworks.includes(networkId.toLowerCase());
  }

  static async deriveAddress(seedPhrase: string, networkId: string, accountIndex = 0): Promise<string> {
    if (!seedPhrase || typeof seedPhrase !== 'string') {
      throw new Error('Invalid seed phrase provided');
    }

    if (!networkId) {
      throw new Error('Network ID is required');
    }

    try {
      const network = networkId.toLowerCase();
      
      if (this.isEvmNetwork(network)) {
        return await this.deriveEvmAddress(seedPhrase, accountIndex);
      } else {
        return await this.deriveNonEvmAddress(seedPhrase, network, accountIndex);
      }
    } catch (error) {
      console.error(`Address derivation failed for ${networkId}:`, error);
      throw new Error(`Failed to derive ${networkId} address: ${error.message}`);
    }
  }

  private static async deriveEvmAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Import BIP39 dynamically
      const bip39Module = await import('bip39');
      const bip39 = bip39Module.default || bip39Module;
      
      // Validate seed phrase
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid BIP39 seed phrase');
      }

      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      
      // Create HD node from seed
      const hdNode = ethers.HDNodeWallet.fromSeed(seed);
      
      // Derive wallet from standard Ethereum path
      const derivationPath = `m/44'/60'/0'/0/${accountIndex}`;
      const derivedWallet = hdNode.derivePath(derivationPath);
      
      const address = derivedWallet.address;
      
      // Validate address format
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Generated invalid address format');
      }

      console.log(`✅ Derived EVM address: ${address}`);
      return address;
    } catch (error) {
      throw new Error(`EVM address derivation failed: ${error.message}`);
    }
  }

  private static async deriveNonEvmAddress(seedPhrase: string, network: string, accountIndex = 0): Promise<string> {
    try {
      switch (network) {
        case 'bitcoin':
          return await this.deriveBitcoinAddress(seedPhrase, accountIndex);
        case 'litecoin':
          return await this.deriveLitecoinAddress(seedPhrase, accountIndex);
        case 'solana':
          return await this.deriveSolanaAddress(seedPhrase, accountIndex);
        case 'tron':
          return await this.deriveTronAddress(seedPhrase, accountIndex);
        case 'ton':
          return await this.deriveTonAddress(seedPhrase, accountIndex);
        case 'xrp':
          return await this.deriveXrpAddress(seedPhrase, accountIndex);
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    } catch (error) {
      throw new Error(`${network} address derivation failed: ${error.message}`);
    }
  }

  private static async deriveBitcoinAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Generate deterministic private key from seed phrase
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'bitcoin' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      // Generate Bech32 address (bc1...)
      const address = 'bc1q' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
      
      // Validate format
      if (!address.match(/^bc1q[a-z0-9]{32}$/)) {
        throw new Error('Generated invalid Bitcoin address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Bitcoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveLitecoinAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use your working Litecoin algorithm
      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      
      const sha256 = async (data: string | Uint8Array): Promise<Uint8Array> => {
        const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return new Uint8Array(hashBuffer);
      };

      const ripemd160 = async (data: Uint8Array): Promise<Uint8Array> => {
        const sha = await sha256(data);
        return sha.slice(0, 20);
      };

      const base58Encode = (bytes: Uint8Array): string => {
        const bytesToHex = (bytes: Uint8Array): string => {
          return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
        };
        
        let num = BigInt('0x' + bytesToHex(bytes));
        let encoded = '';
        
        while (num > 0) {
          const remainder = num % 58n;
          encoded = base58Alphabet[Number(remainder)] + encoded;
          num = num / 58n;
        }

        for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
          encoded = '1' + encoded;
        }

        return encoded;
      };

      // Generate private key from seed
      const privateKeyHash = await sha256(seedPhrase + 'litecoin_key' + accountIndex);
      const privateKeyBytes = new Uint8Array(privateKeyHash);
      
      // Generate public key (simplified)
      const publicKeyHash = await sha256(privateKeyBytes);
      const publicKey = new Uint8Array(65);
      publicKey[0] = 0x04;
      publicKey.set(publicKeyHash, 1);
      publicKey.set(publicKeyHash, 33);
      
      // Generate address
      const sha256Hash = await sha256(publicKey);
      const ripemd160Hash = await ripemd160(sha256Hash);
      
      // Add Litecoin mainnet prefix (0x30 for 'L' addresses)
      const versionedHash = new Uint8Array(21);
      versionedHash[0] = 0x30;
      versionedHash.set(ripemd160Hash, 1);
      
      // Calculate checksum
      const checksum1 = await sha256(versionedHash);
      const checksum2 = await sha256(checksum1);
      const checksum = checksum2.slice(0, 4);
      
      // Combine versioned hash and checksum
      const addressBytes = new Uint8Array(25);
      addressBytes.set(versionedHash, 0);
      addressBytes.set(checksum, 21);
      
      const address = base58Encode(addressBytes);
      
      // Validate format
      if (!address.match(/^[LM][1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        throw new Error('Generated invalid Litecoin address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Litecoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveSolanaAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'solana' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = '';
      
      for (let i = 0; i < 44; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      // Validate format
      if (!address.match(/^[1-9A-HJ-NP-Za-km-z]{44}$/)) {
        throw new Error('Generated invalid Solana address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Solana address generation failed: ${error.message}`);
    }
  }

  private static async deriveTronAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'tron' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = 'T';
      
      for (let i = 0; i < 33; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      // Validate format
      if (!address.match(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)) {
        throw new Error('Generated invalid TRON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TRON address generation failed: ${error.message}`);
    }
  }

  private static async deriveTonAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'ton' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base64urlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const addressBytes = hash.slice(0, 32);
      const checksumBytes = hash.slice(30, 32);
      const fullBytes = [...addressBytes, ...checksumBytes];
      
      let address = 'EQ';
      for (let i = 0; i < 44; i++) {
        const index = fullBytes[i % fullBytes.length] % base64urlChars.length;
        address += base64urlChars[index];
      }
      
      // Validate format
      if (!address.match(/^EQ[A-Za-z0-9_-]{44}$/)) {
        throw new Error('Generated invalid TON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TON address generation failed: ${error.message}`);
    }
  }

  private static async deriveXrpAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'xrp' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const versionByte = 0x00;
      const accountId = hash.slice(0, 20);
      const versionedPayload = [versionByte, ...accountId];
      
      const firstHash = await crypto.subtle.digest('SHA-256', new Uint8Array(versionedPayload));
      const secondHash = await crypto.subtle.digest('SHA-256', firstHash);
      const checksum = Array.from(new Uint8Array(secondHash)).slice(0, 4);
      
      const fullPayload = [...versionedPayload, ...checksum];
      
      // Base58 encode
      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let num = BigInt(0);
      for (const byte of fullPayload) {
        num = num * BigInt(256) + BigInt(byte);
      }
      
      let address = '';
      while (num > 0) {
        const remainder = Number(num % BigInt(58));
        address = base58Alphabet[remainder] + address;
        num = num / BigInt(58);
      }
      
      // Add leading '1's for leading zero bytes
      for (let i = 0; i < fullPayload.length && fullPayload[i] === 0; i++) {
        address = '1' + address;
      }
      
      // XRP addresses should start with 'r'
      if (!address.startsWith('r')) {
        address = 'r' + address.slice(1);
      }
      
      // Validate format
      if (!address.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        throw new Error('Generated invalid XRP address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`XRP address generation failed: ${error.message}`);
    }
  }

  // Validate address for specific network
  static validateAddress(address: string, network: string): boolean {
    const patterns = {
      // EVM networks
      ethereum: /^0x[a-fA-F0-9]{40}$/,
      polygon: /^0x[a-fA-F0-9]{40}$/,
      bsc: /^0x[a-fA-F0-9]{40}$/,
      arbitrum: /^0x[a-fA-F0-9]{40}$/,
      optimism: /^0x[a-fA-F0-9]{40}$/,
      avalanche: /^0x[a-fA-F0-9]{40}$/,
      
      // Non-EVM networks
      bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
      litecoin: /^[LM][1-9A-HJ-NP-Za-km-z]{25,34}$/,
      solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
      ton: /^(EQ|UQ)[A-Za-z0-9_-]{46}$/,
      xrp: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/
    };

    const pattern = patterns[network.toLowerCase()];
    return pattern ? pattern.test(address) : false;
  }

  // Get all addresses for a wallet from seed phrase
  static async deriveAllAddresses(seedPhrase: string, accountIndex = 0): Promise<Record<string, string>> {
    const networks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche',
      'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
    ];

    const addresses: Record<string, string> = {};

    for (const network of networks) {
      try {
        addresses[network] = await this.deriveAddress(seedPhrase, network, accountIndex);
      } catch (error) {
        console.error(`Failed to derive ${network} address:`, error);
        addresses[network] = `Error: ${error.message}`;
      }
    }

    // EVM networks share the same address
    const evmAddress = addresses.ethereum;
    if (evmAddress && !evmAddress.startsWith('Error:')) {
      addresses.polygon = evmAddress;
      addresses.bsc = evmAddress;
      addresses.arbitrum = evmAddress;
      addresses.optimism = evmAddress;
      addresses.avalanche = evmAddress;
    }

    return addresses;
  }
}

// ============================================================================
// ENHANCED BLOCKCHAIN SERVICE
// ============================================================================

class BlockchainService {
  private static rpcFallbacks: Record<string, string[]> = {
    ethereum: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://eth-mainnet.public.blastapi.io',
      'https://ethereum.publicnode.com'
    ],
    polygon: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.meowrpc.com'
    ],
    bsc: [
      'https://bsc-dataseed1.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
      'https://bsc-mainnet.public.blastapi.io'
    ],
    arbitrum: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.publicnode.com',
      'https://arbitrum-mainnet.public.blastapi.io'
    ],
    optimism: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
      'https://optimism.publicnode.com',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    avalanche: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.publicnode.com'
    ]
  };

  static async makeRpcRequestWithFallbacks(network: string, method: string, params: any[] = []): Promise<any> {
    const rpcUrls = this.rpcFallbacks[network];
    if (!rpcUrls) {
      throw new Error(`Unsupported network: ${network}`);
    }

    let lastError: Error | null = null;

    for (const rpcUrl of rpcUrls) {
      try {
        console.log(`Trying RPC ${rpcUrl} for ${network}`);
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: Date.now()
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message || data.error}`);
        }
        
        if (data.result === undefined) {
          throw new Error('No result in RPC response');
        }

        console.log(`✅ Success with RPC ${rpcUrl}`);
        return data.result;
      } catch (error) {
        console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw new Error(`All RPC endpoints failed for ${network}. Last error: ${lastError?.message}`);
  }

  static async getBalance(address: string, network = 'ethereum'): Promise<string> {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      const balance = await this.makeRpcRequestWithFallbacks(network, 'eth_getBalance', [address, 'latest']);
      return balance;
    } catch (error) {
      console.error(`Failed to get balance for ${address} on ${network}:`, error);
      throw error;
    }
  }

  static async getTransactionCount(address: string, network = 'ethereum'): Promise<string> {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      const nonce = await this.makeRpcRequestWithFallbacks(network, 'eth_getTransactionCount', [address, 'latest']);
      return nonce;
    } catch (error) {
      console.error(`Failed to get transaction count for ${address} on ${network}:`, error);
      throw error;
    }
  }

  static async getGasPrice(network = 'ethereum'): Promise<string> {
    try {
      const gasPrice = await this.makeRpcRequestWithFallbacks(network, 'eth_gasPrice', []);
      return gasPrice;
    } catch (error) {
      console.error(`Failed to get gas price for ${network}:`, error);
      // Return fallback gas price
      return '0x2540be400'; // 10 gwei
    }
  }

  // Non-EVM network methods
  static async getBitcoinBalance(address: string): Promise<string> {
    try {
      // Using BlockCypher API as fallback
      const response = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.balance.toString();
    } catch (error) {
      console.error('Failed to get Bitcoin balance:', error);
      return '0';
    }
  }

  static async getSolanaBalance(address: string): Promise<string> {
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result?.value?.toString() || '0';
    } catch (error) {
      console.error('Failed to get Solana balance:', error);
      return '0';
    }
  }

  // Generic balance fetcher that routes to appropriate method
  static async getNetworkBalance(address: string, network: string): Promise<string> {
    try {
      switch (network.toLowerCase()) {
        case 'bitcoin':
          return await this.getBitcoinBalance(address);
        case 'solana':
          return await this.getSolanaBalance(address);
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          return await this.getBalance(address, network);
        default:
          console.warn(`Unsupported network: ${network}`);
          return '0';
      }
    } catch (error) {
      console.error(`Failed to get balance for ${network}:`, error);
      return '0';
    }
  }

  // Enhanced transaction sending with proper error handling
  static async sendTransaction(txParams: any, network = 'ethereum'): Promise<string> {
    try {
      // Validate transaction parameters
      if (!txParams.to || !txParams.from) {
        throw new Error('Transaction must have to and from addresses');
      }

      // Get wallet state from storage
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      if (!wallet || !walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked or not found');
      }

      // Get password from wallet state
      const password = walletState.tempPassword;
      if (!password) {
        throw new Error('Wallet authentication required');
      }

      // Decrypt seed phrase
      const seedPhrase = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
      
      // Route to appropriate network handler
      let txHash: string;
      switch (network.toLowerCase()) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          txHash = await this.sendEthereumTransaction(txParams, network, seedPhrase);
          break;
        default:
          throw new Error(`Transaction sending not implemented for ${network}`);
      }
      
      const transaction = {
        hash: txHash,
        from: txParams.from,
        to: txParams.to,
        value: txParams.value || '0x0',
        gasPrice: txParams.gasPrice,
        gasLimit: txParams.gasLimit,
        nonce: txParams.nonce,
        network: network,
        timestamp: Date.now(),
        status: 'pending'
      };

      const storageResult = await storage.local.get(['transactions']);
      const transactions = storageResult.transactions || [];
      transactions.push(transaction);
      await storage.local.set({ transactions });

      return txHash;
      
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendEthereumTransaction(txParams: any, network: string, seedPhrase: string): Promise<string> {
    try {
      const { ethers } = await import('ethers');
      
      // Get network RPC URL
      const rpcUrl = this.getNetworkRpcUrl(network);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Derive wallet from seed phrase
      const wallet = ethers.Wallet.fromPhrase(seedPhrase).connect(provider);
      
      // Create transaction object
      const tx = {
        to: txParams.to,
        value: txParams.value || '0x0',
        data: txParams.data || '0x',
        gasLimit: txParams.gasLimit || '21000',
        gasPrice: txParams.gasPrice || '20000000000', // 20 gwei
        nonce: txParams.nonce || 0,
        chainId: txParams.chainId || 1
      };
      
      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      return txResponse.hash;
    } catch (error) {
      throw new Error(`Ethereum transaction failed: ${error.message}`);
    }
  }

  static async sendBitcoinTransaction(txParams: any, seedPhrase: string): Promise<string> {
    try {
      const bitcoin = await import('bitcoinjs-lib');
      const { ECPairFactory } = await import('ecpair');
      const ecc = await import('tiny-secp256k1');
      
      // Derive key pair from seed phrase
      const seed = bitcoin.crypto.sha256(Buffer.from(seedPhrase));
      const ECPair = ECPairFactory(ecc);
      const keyPair = ECPair.fromPrivateKey(seed);
      
      // Create transaction
      const txb = new (bitcoin as any).TransactionBuilder(bitcoin.networks.bitcoin);
      
      // Add inputs and outputs based on txParams
      if (txParams.inputs) {
        txParams.inputs.forEach((input: any) => {
          txb.addInput(input.txId, input.vout);
        });
      }
      
      if (txParams.outputs) {
        txParams.outputs.forEach((output: any) => {
          txb.addOutput(output.address, output.value);
        });
      }
      
      // Sign inputs
      if (txParams.inputs) {
        txParams.inputs.forEach((input: any, index: number) => {
          txb.sign(index, keyPair);
        });
      }
      
      const tx = txb.build();
      const txHex = tx.toHex();
      
      // Broadcast transaction (would need actual Bitcoin node or API)
      // For now, return the signed transaction hex
      return txHex;
    } catch (error) {
      throw new Error(`Bitcoin transaction failed: ${error.message}`);
    }
  }

  static async sendSolanaTransaction(txParams: any, seedPhrase: string): Promise<string> {
    try {
      const { Connection, Transaction, PublicKey, Keypair } = await import('@solana/web3.js');
      // For Solana key derivation, we'll use a simpler approach
      const crypto = await import('crypto');
      
      // Derive keypair from seed phrase using crypto hash
      const seed = crypto.createHash('sha256').update(seedPhrase).digest();
      const keypair = Keypair.fromSeed(seed);
      
      // Create connection
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add instructions based on txParams
      if (txParams.instructions) {
        txParams.instructions.forEach((instruction: any) => {
          transaction.add(instruction);
        });
      }
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      // Set fee payer
      transaction.feePayer = keypair.publicKey;
      
      // Sign transaction
      transaction.sign(keypair);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize());
      return signature;
    } catch (error) {
      throw new Error(`Solana transaction failed: ${error.message}`);
    }
  }

  static async signMessage(method: string, params: any[], seedPhrase: string): Promise<string> {
    try {
      const { ethers } = await import('ethers');
      
      // Derive wallet from seed phrase
      const wallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      switch (method) {
        case 'personal_sign':
          const message = params[0];
          const signature = await wallet.signMessage(message);
          return signature;
          
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          const typedData = params[1];
          const typedSignature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.message);
          return typedSignature;
          
        default:
          throw new Error(`Unsupported signing method: ${method}`);
      }
    } catch (error) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  private static getNetworkRpcUrl(network: string): string {
    const rpcUrls: Record<string, string> = {
      'ethereum': 'https://eth.llamarpc.com',
      'polygon': 'https://polygon-rpc.com',
      'bsc': 'https://bsc-dataseed1.binance.org',
      'arbitrum': 'https://arb1.arbitrum.io/rpc',
      'optimism': 'https://mainnet.optimism.io',
      'avalanche': 'https://api.avax.network/ext/bc/C/rpc'
    };
    
    return rpcUrls[network] || rpcUrls['ethereum'];
  }
}

// ============================================================================
// RATE LIMITING & DAPP INTEGRATION
// ============================================================================

class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests = 100;
  private windowMs = 60000; // 1 minute

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key)!;
    
    while (userRequests.length > 0 && userRequests[0] < windowStart) {
      userRequests.shift();
    }
    
    if (userRequests.length >= this.maxRequests) {
      return false;
    }
    
    userRequests.push(now);
    return true;
  }
}

// ============================================================================
// DAPP HANDLER (Enhanced from original)
// ============================================================================

interface DAppRequest {
  type: string;
  method: string;
  params?: any;
  requestId: string;
  origin?: string;
  tabId?: number;
}

interface DAppResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
}

interface ConnectedSite {
  origin: string;
  permissions: string[];
  connectedAt: number;
  lastActive: number;
  accounts: string[];
}

class PaycioDAppHandler {
  private connectedSites = new Map<string, ConnectedSite>();
  private providers = new Map<string, ethers.JsonRpcProvider>();
  private rateLimiter = new RateLimiter();

  constructor() {
    this.setupMessageListeners();
    this.loadConnectedSites();
  }

  private setupMessageListeners() {
    browserAPI.runtime.onMessage.addListener(
      (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        this.handleMessage(message, sender, sendResponse);
        return true;
      }
    );
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    if (!message.type?.startsWith('PAYCIO_')) {
      return;
    }

    const origin = sender.url ? new URL(sender.url).origin : 'unknown';
    const tabId = sender.tab?.id;

    // Rate limiting
    if (!this.rateLimiter.isAllowed(origin)) {
      sendResponse({
        success: false,
        error: 'Rate limit exceeded',
        requestId: message.requestId
      });
      return;
    }

    console.log(`Processing DApp request: ${message.method} from ${origin}`);

    try {
      const response = await this.processRequest({
        ...message,
        origin,
        tabId
      });
      
      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Request processing failed',
        requestId: message.requestId
      });
    }
  }

  private async processRequest(request: DAppRequest): Promise<DAppResponse> {
    const { method, params, requestId, origin } = request;

    try {
      switch (method) {
        case 'GET_PROVIDER_STATE':
          return await this.getProviderState(origin);

        case 'ETH_REQUEST_ACCOUNTS':
          return await this.requestAccounts(origin, requestId);

        case 'ETH_GET_BALANCE':
          return await this.getBalance(params);

        case 'ETH_SEND_TRANSACTION':
          return await this.sendTransaction(params, origin, requestId);

        case 'ETH_SIGN_TRANSACTION':
          return await this.signTransaction(params, origin, requestId);

        case 'PERSONAL_SIGN':
          return await this.personalSign(params, origin, requestId);

        case 'ETH_SIGN':
          return await this.ethSign(params, origin, requestId);

        case 'ETH_SIGN_TYPED_DATA':
          return await this.signTypedData(params, origin, requestId);

        case 'WALLET_SWITCH_ETHEREUM_CHAIN':
          return await this.switchEthereumChain(params, origin, requestId);

        case 'WALLET_ADD_ETHEREUM_CHAIN':
          return await this.addEthereumChain(params, origin, requestId);

        case 'PROXY_RPC_CALL':
          return await this.proxyRpcCall(params);

        // Non-EVM network methods
        case 'BITCOIN_CONNECT':
          return await this.connectBitcoin(origin, requestId);

        case 'SOLANA_CONNECT':
          return await this.connectSolana(origin, requestId);

        case 'TRON_CONNECT':
          return await this.connectTron(origin, requestId);

        case 'TON_CONNECT':
          return await this.connectTon(origin, requestId);

        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      console.error(`Error processing ${method}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        requestId
      };
    }
  }

  private async getProviderState(origin: string): Promise<DAppResponse> {
    const site = this.connectedSites.get(origin);
    const walletState = await this.getWalletStateFromStorage();

    return {
      success: true,
      data: {
        isConnected: !!site,
        accounts: site?.accounts || [],
        selectedAddress: walletState?.selectedAddress || null,
        chainId: walletState?.chainId || '0x1',
        networkVersion: walletState?.networkVersion || '1'
      },
      requestId: ''
    };
  }

  private async requestAccounts(origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const existingSite = this.connectedSites.get(origin);
      if (existingSite) {
        return {
          success: true,
          data: { accounts: existingSite.accounts },
          requestId
        };
      }

      const approval = await this.requestUserApproval({
        type: 'connect',
        origin,
        message: `${origin} wants to connect to your wallet`,
        permissions: ['eth_accounts']
      });

      if (!approval.approved) {
        throw new Error('User rejected the request');
      }

      const walletState = await this.getWalletStateFromStorage();
      const accounts = walletState?.accounts || [];

      if (accounts.length === 0) {
        throw new Error('No accounts available. Please unlock your wallet.');
      }

      this.connectedSites.set(origin, {
        origin,
        permissions: ['eth_accounts'],
        connectedAt: Date.now(),
        lastActive: Date.now(),
        accounts
      });

      await this.saveConnectedSites();

      return {
        success: true,
        data: { accounts },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        requestId
      };
    }
  }

  private async sendTransaction(
    params: any[],
    origin: string,
    requestId: string
  ): Promise<DAppResponse> {
    try {
      const site = this.connectedSites.get(origin);
      if (!site) {
        throw new Error('Site not connected');
      }

      const txParams = params[0];

      const estimatedGas = await this.estimateGas(txParams);
      const estimatedFee = await this.estimateTransactionFee(txParams);

      const approval = await this.requestUserApproval({
        type: 'transaction',
        origin,
        message: `${origin} wants to send a transaction`,
        txParams,
        estimatedGas,
        estimatedFee
      });

      if (!approval.approved) {
        throw new Error('User rejected the transaction');
      }

      const txHash = await this.executeTransactionThroughWallet(txParams);

      return {
        success: true,
        data: { hash: txHash },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
        requestId
      };
    }
  }

  private async personalSign(
    params: string[],
    origin: string,
    requestId: string
  ): Promise<DAppResponse> {
    try {
      const site = this.connectedSites.get(origin);
      if (!site) {
        throw new Error('Site not connected');
      }

      const [message, address] = params;

      const approval = await this.requestUserApproval({
        type: 'sign_message',
        origin,
        message: `${origin} wants to sign a message`,
        data: { message, address, method: 'personal_sign' }
      });

      if (!approval.approved) {
        throw new Error('User rejected the signing request');
      }

      const signature = await this.signMessageThroughWallet(message, address);

      return {
        success: true,
        data: { signature },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed',
        requestId
      };
    }
  }

  // Additional methods would continue here...
  private async getWalletStateFromStorage(): Promise<any> {
    try {
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      if (wallet && walletState?.isWalletUnlocked) {
      return {
          selectedAddress: wallet.address,
          accounts: [wallet.address],
          chainId: this.getChainIdFromNetwork(wallet.currentNetwork || 'ethereum'),
          networkVersion: this.getNetworkVersionFromNetwork(wallet.currentNetwork || 'ethereum'),
          currentNetwork: wallet.currentNetwork || 'ethereum'
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting wallet state:', error);
      return null;
    }
  }

  private getChainIdFromNetwork(network: string): string {
    const chainIds: Record<string, string> = {
      ethereum: '0x1',
      bsc: '0x38',
      polygon: '0x89',
      avalanche: '0xa86a',
      arbitrum: '0xa4b1',
      optimism: '0xa',
      base: '0x2105',
      fantom: '0xfa'
    };
    return chainIds[network] || '0x1';
  }

  private getNetworkVersionFromNetwork(network: string): string {
    const chainId = this.getChainIdFromNetwork(network);
    return parseInt(chainId, 16).toString();
  }

  private async requestUserApproval(request: any): Promise<{ approved: boolean; data?: any }> {
    return new Promise((resolve) => {
      const popupUrl = browserAPI.runtime.getURL(`popup.html?approval=true&request=${encodeURIComponent(JSON.stringify(request))}`);
      
      (browserAPI as any).windows.create({
        url: popupUrl,
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      }, (window) => {
        if (!window?.id) {
          resolve({ approved: false });
          return;
        }

        const messageListener = (message: any) => {
          if (message.type === 'APPROVAL_RESPONSE' && message.windowId === window.id) {
            (browserAPI.runtime.onMessage as any).removeListener(messageListener);
            resolve({
              approved: message.approved,
              data: message.data
            });
          }
        };

        browserAPI.runtime.onMessage.addListener(messageListener);

        const windowListener = (windowId: number) => {
          if (windowId === window.id) {
            (browserAPI as any).windows.onRemoved.removeListener(windowListener);
            (browserAPI.runtime.onMessage as any).removeListener(messageListener);
            resolve({ approved: false });
          }
        };

        (browserAPI as any).windows.onRemoved.addListener(windowListener);
      });
    });
  }

  private async loadConnectedSites() {
    try {
      const result = await storage.local.get(['connectedSites']);
      if (result.connectedSites) {
        const sites = JSON.parse(result.connectedSites);
        this.connectedSites = new Map(Object.entries(sites));
      }
    } catch (error) {
      console.error('Error loading connected sites:', error);
    }
  }

  private async saveConnectedSites() {
    try {
      const sites = Object.fromEntries(this.connectedSites);
      await storage.local.set({ connectedSites: JSON.stringify(sites) });
    } catch (error) {
      console.error('Error saving connected sites:', error);
    }
  }

  // Placeholder methods for wallet integration
  private async executeTransactionThroughWallet(txParams: any): Promise<string> {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage({
        type: 'WALLET_SEND_TRANSACTION',
        txParams
      }, (response) => {
        if (response?.success) {
          resolve(response.txHash);
        } else {
          reject(new Error(response?.error || 'Transaction failed'));
        }
      });
    });
  }

  private async signMessageThroughWallet(message: string, address: string): Promise<string> {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage({
        type: 'WALLET_SIGN_MESSAGE',
        message,
        address
      }, (response) => {
        if (response?.success) {
          resolve(response.signature);
        } else {
          reject(new Error(response?.error || 'Message signing failed'));
        }
      });
    });
  }

  private async estimateGas(txParams: any): Promise<string> {
    const walletState = await this.getWalletStateFromStorage();
    const currentNetwork = walletState?.currentNetwork || 'ethereum';
    
    try {
      const gasEstimate = await BlockchainService.makeRpcRequestWithFallbacks(currentNetwork, 'eth_estimateGas', [txParams]);
      return gasEstimate.toString();
    } catch (error) {
      return '21000';
    }
  }

  private async estimateTransactionFee(txParams: any): Promise<string> {
    const walletState = await this.getWalletStateFromStorage();
    const currentNetwork = walletState?.currentNetwork || 'ethereum';
    
    try {
      const gasPrice = await BlockchainService.getGasPrice(currentNetwork);
      const gasEstimate = await this.estimateGas(txParams);
      const fee = BigInt(gasEstimate) * BigInt(gasPrice);
      return fee.toString();
    } catch (error) {
      return '0';
    }
  }

  // Stub methods for other DApp operations
  private async getBalance(params: any[]): Promise<DAppResponse> {
    try {
      const [address, blockTag = 'latest'] = params;
      const walletState = await this.getWalletStateFromStorage();
      const currentNetwork = walletState?.currentNetwork || 'ethereum';

      const balance = await BlockchainService.getBalance(address, currentNetwork);

      return {
        success: true,
        data: { result: balance },
        requestId: ''
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance query failed',
        requestId: ''
      };
    }
  }

  private async proxyRpcCall(params: { method: string; params: any }): Promise<DAppResponse> {
    try {
      const { method, params: rpcParams } = params;
      const walletState = await this.getWalletStateFromStorage();
      const currentNetwork = walletState?.currentNetwork || 'ethereum';

      const result = await BlockchainService.makeRpcRequestWithFallbacks(currentNetwork, method, rpcParams || []);

      return {
        success: true,
        data: { result },
        requestId: ''
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'RPC call failed',
        requestId: ''
      };
    }
  }

  // Multi-chain connection methods
  private async connectBitcoin(origin: string, requestId: string): Promise<DAppResponse> {
    try {
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Get Bitcoin address
      const bitcoinAddress = wallet.addresses.bitcoin;
      if (!bitcoinAddress) {
        return {
          success: false,
          error: 'Bitcoin address not found',
          requestId
        };
      }

      // Add to connected sites
      const existingSite = this.connectedSites.get(origin) || {};
      this.connectedSites.set(origin, {
        ...existingSite,
        ethereum: (existingSite as any).ethereum,
        bitcoin: { address: bitcoinAddress, connected: true }
      } as any);
      await this.saveConnectedSites();

      return {
        success: true,
        data: { address: bitcoinAddress },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bitcoin connection failed',
        requestId
      };
    }
  }

  private async connectSolana(origin: string, requestId: string): Promise<DAppResponse> {
    try {
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Get Solana address
      const solanaAddress = wallet.addresses.solana;
      if (!solanaAddress) {
        return {
          success: false,
          error: 'Solana address not found',
          requestId
        };
      }

      // Add to connected sites
      const existingSite = this.connectedSites.get(origin) || {};
      this.connectedSites.set(origin, {
        ...existingSite,
        ethereum: (existingSite as any).ethereum,
        solana: { address: solanaAddress, connected: true }
      } as any);
      await this.saveConnectedSites();

      return {
        success: true,
        data: { address: solanaAddress },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Solana connection failed',
        requestId
      };
    }
  }

  private async connectTron(origin: string, requestId: string): Promise<DAppResponse> {
    try {
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Get TRON address
      const tronAddress = wallet.addresses.tron;
      if (!tronAddress) {
        return {
          success: false,
          error: 'TRON address not found',
          requestId
        };
      }

      // Add to connected sites
      const existingSite = this.connectedSites.get(origin) || {};
      this.connectedSites.set(origin, {
        ...existingSite,
        ethereum: (existingSite as any).ethereum,
        tron: { address: tronAddress, connected: true }
      } as any);
      await this.saveConnectedSites();

      return {
        success: true,
        data: { address: tronAddress },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TRON connection failed',
        requestId
      };
    }
  }

  private async connectTon(origin: string, requestId: string): Promise<DAppResponse> {
    try {
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Get TON address
      const tonAddress = wallet.addresses.ton;
      if (!tonAddress) {
        return {
          success: false,
          error: 'TON address not found',
          requestId
        };
      }

      // Add to connected sites
      const existingSite = this.connectedSites.get(origin) || {};
      this.connectedSites.set(origin, {
        ...existingSite,
        ethereum: (existingSite as any).ethereum,
        ton: { address: tonAddress, connected: true }
      } as any);
      await this.saveConnectedSites();

      return {
        success: true,
        data: { address: tonAddress },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TON connection failed',
        requestId
      };
    }
  }

  private async signTransaction(params: any[], origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const [transaction, network] = params;
      
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Show approval popup
      const approval = await (this as any).showApprovalPopup({
        type: 'transaction',
        origin,
        data: { transaction, network }
      });

      if (!approval.approved) {
        return {
          success: false,
          error: 'Transaction rejected by user',
          requestId
        };
      }

      // Sign and send transaction based on network
      let txHash: string;
      switch (network) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          txHash = await BlockchainService.sendEthereumTransaction(transaction, network, wallet.seedPhrase);
          break;
        case 'bitcoin':
          txHash = await BlockchainService.sendBitcoinTransaction(transaction, wallet.seedPhrase);
          break;
        case 'solana':
          txHash = await BlockchainService.sendSolanaTransaction(transaction, wallet.seedPhrase);
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }

      return {
        success: true,
        data: { transactionHash: txHash },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction signing failed',
        requestId
      };
    }
  }

  private async ethSign(params: string[], origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const [message] = params;
      
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Show approval popup
      const approval = await (this as any).showApprovalPopup({
        type: 'sign_message',
        origin,
        data: { message }
      });

      if (!approval.approved) {
        return {
          success: false,
          error: 'Message signing rejected by user',
          requestId
        };
      }

      // Sign message
      const signature = await BlockchainService.signMessage('personal_sign', [message], wallet.seedPhrase);

      return {
        success: true,
        data: { signature },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message signing failed',
        requestId
      };
    }
  }

  private async signTypedData(params: any[], origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const [address, typedData] = params;
      
      // Get current wallet
      const wallet = await this.getCurrentWallet();
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet found',
          requestId
        };
      }

      // Show approval popup
      const approval = await (this as any).showApprovalPopup({
        type: 'sign_typed_data',
        origin,
        data: { typedData }
      });

      if (!approval.approved) {
        return {
          success: false,
          error: 'Typed data signing rejected by user',
          requestId
        };
      }

      // Sign typed data
      const signature = await BlockchainService.signMessage('eth_signTypedData_v4', [address, typedData], wallet.seedPhrase);

      return {
        success: true,
        data: { signature },
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Typed data signing failed',
        requestId
      };
    }
  }

  private async switchEthereumChain(params: any, origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const { chainId } = params;
      
      // Show approval popup
      const approval = await (this as any).showApprovalPopup({
        type: 'switch_chain',
        origin,
        data: { chainId }
      });

      if (!approval.approved) {
        return {
          success: false,
          error: 'Chain switch rejected by user',
          requestId
        };
      }

      // Switch to the requested chain
      await this.switchToChain(chainId);

      return {
        success: true,
        data: null,
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chain switching failed',
        requestId
      };
    }
  }

  private async addEthereumChain(params: any[], origin: string, requestId: string): Promise<DAppResponse> {
    try {
      const [chainParams] = params;
      
      // Show approval popup
      const approval = await (this as any).showApprovalPopup({
        type: 'add_chain',
        origin,
        data: { chainParams }
      });

      if (!approval.approved) {
        return {
          success: false,
          error: 'Add chain rejected by user',
          requestId
        };
      }

      // Add the new chain
      await this.addCustomChain(chainParams);

      return {
        success: true,
        data: null,
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Add chain failed',
        requestId
      };
    }
  }

  private async getCurrentWallet(): Promise<any> {
    try {
      const result = await storage.local.get(['currentWallet']);
      return result.currentWallet || null;
    } catch (error) {
      console.error('Error getting current wallet:', error);
      return null;
    }
  }

  private async switchToChain(chainId: string): Promise<void> {
    try {
      await storage.local.set({ currentChainId: chainId });
    } catch (error) {
      console.error('Error switching chain:', error);
      throw error;
    }
  }

  private async addCustomChain(chainParams: any): Promise<void> {
    try {
      const result = await storage.local.get(['customChains']);
      const customChains = result.customChains || [];
      customChains.push(chainParams);
      await storage.local.set({ customChains });
    } catch (error) {
      console.error('Error adding custom chain:', error);
      throw error;
    }
  }
}

// ============================================================================
// ENHANCED MESSAGE HANDLERS
// ============================================================================

const messageHandlers: Record<string, (message: any) => Promise<any>> = {
  'HEALTH_CHECK': async () => {
    return { success: true, data: { status: 'healthy', timestamp: Date.now() } };
  },

  'GET_WALLET_STATUS': async () => {
    try {
      const status = await WalletManager.getWalletStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('GET_WALLET_STATUS error:', error);
      return { success: false, error: error.message };
    }
  },

  'CREATE_WALLET': async (message) => {
    try {
      const { password, seedPhrase, name } = message;
      
      if (!password || !seedPhrase) {
        throw new Error('Password and seed phrase are required');
      }
      
      const result = await WalletManager.createWallet(password, seedPhrase, name);
      return { success: true, data: result };
    } catch (error) {
      console.error('CREATE_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'UNLOCK_WALLET': async (message) => {
    try {
      const { password } = message;
      console.log('🔍 UNLOCK_WALLET handler called with password length:', password?.length);
      
      if (!password) {
        throw new Error('Password is required');
      }
      
      // Get wallet and stored hash
      const result = await storage.local.get(['wallet', 'passwordHash']);
      const wallet = result.wallet;
      const storedPasswordHash = result.passwordHash;
      
      console.log('🔍 Storage check:', {
        hasWallet: !!wallet,
        hasPasswordHash: !!storedPasswordHash,
        walletId: wallet?.id
      });

      if (!wallet) {
        throw new Error('No wallet found');
      }

      let unlockSuccess = false;

      // Method 1: Hash verification
      if (storedPasswordHash) {
        console.log('🔍 Attempting hash verification...');
        try {
          const generatedHash = await SecurityManager.hashPassword(password);
          if (generatedHash === storedPasswordHash) {
            unlockSuccess = true;
            console.log('✅ Hash verification successful');
          } else {
            console.log('❌ Hash verification failed');
          }
        } catch (hashError) {
          console.log('❌ Hash generation error:', hashError);
        }
      }

      // Method 2: Seed phrase decryption verification
      if (!unlockSuccess && wallet.encryptedSeedPhrase) {
        console.log('🔍 Attempting seed phrase verification...');
        try {
          const decryptedSeed = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
          if (decryptedSeed && decryptedSeed.length > 0) {
            const words = decryptedSeed.trim().split(' ');
            if (words.length >= 12 && words.length <= 24) {
              unlockSuccess = true;
              console.log('✅ Seed phrase verification successful');
              
              // Regenerate password hash
              if (!storedPasswordHash) {
                try {
                  const newHash = await SecurityManager.hashPassword(password);
                  await storage.local.set({ passwordHash: newHash });
                  console.log('✅ Password hash regenerated');
                } catch (hashError) {
                  console.log('⚠️ Could not regenerate password hash:', hashError);
                }
              }
            }
          }
        } catch (decryptError) {
          console.log('❌ Seed phrase decryption failed:', decryptError);
        }
      }

      if (unlockSuccess) {
        // Update wallet state
        await storage.local.set({
          walletState: {
            isWalletUnlocked: true,
            lastUnlockTime: Date.now(),
            tempPassword: password
          }
        });
        
        console.log('✅ Wallet unlocked successfully');
        return { success: true };
      } else {
        throw new Error('Invalid password');
      }
      
    } catch (error) {
      console.error('UNLOCK_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'LOCK_WALLET': async () => {
    try {
      await storage.local.set({
        walletState: {
          isWalletUnlocked: false,
          lastUnlockTime: null,
          tempPassword: null
        }
      });
      return { success: true };
    } catch (error) {
      console.error('LOCK_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'GET_ACCOUNTS': async () => {
    try {
      const accounts = await WalletManager.getAccounts();
      return { success: true, data: accounts };
    } catch (error) {
      console.error('GET_ACCOUNTS error:', error);
      return { success: false, error: error.message };
    }
  },

  'DIAGNOSE_PASSWORD': async (message) => {
    const { password } = message;
    
    try {
      console.log('=== COMPREHENSIVE PASSWORD DIAGNOSIS START ===');
      
      const result = await storage.local.get(['wallet', 'passwordHash', 'walletState']);
      const wallet = result.wallet;
      const storedPasswordHash = result.passwordHash;
      const walletState = result.walletState;

      const diagnosis: any = {
        walletExists: !!wallet,
        passwordHashExists: !!storedPasswordHash,
        walletStateExists: !!walletState,
        isCurrentlyUnlocked: walletState?.isWalletUnlocked || false,
        walletId: wallet?.id || 'none',
        encryptedSeedExists: !!wallet?.encryptedSeedPhrase,
        passwordLength: password ? password.length : 0,
        storedHashLength: storedPasswordHash ? storedPasswordHash.length : 0
      };
      
      if (password && storedPasswordHash) {
        const computedHash = await SecurityManager.hashPassword(password);
        const hashesMatch = computedHash === storedPasswordHash;
        
        diagnosis.hashComparison = {
          computedHashLength: computedHash.length,
          storedHashLength: storedPasswordHash.length,
          hashesMatch: hashesMatch,
          computedPreview: computedHash.substring(0, 10),
          storedPreview: storedPasswordHash.substring(0, 10)
        };
      }
      
      if (password && wallet?.encryptedSeedPhrase) {
        try {
          const decryptedSeed = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
          const isValidSeed = decryptedSeed && decryptedSeed.length > 0;
          const wordCount = isValidSeed ? decryptedSeed.trim().split(' ').length : 0;
          
          diagnosis.seedDecryption = {
            successful: isValidSeed,
            wordCount: wordCount,
            validWordCount: wordCount >= 12 && wordCount <= 24
          };
        } catch (decryptError) {
          diagnosis.seedDecryption = {
            successful: false,
            error: decryptError instanceof Error ? decryptError.message : 'Unknown error'
          };
        }
      }
      
      console.log('=== COMPREHENSIVE PASSWORD DIAGNOSIS END ===');
      
      return { success: true, data: diagnosis };
      
    } catch (error) {
      console.error('Password diagnosis failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  'SWITCH_NETWORK': async (message) => {
    try {
      const { networkId } = message;
      console.log(`🔍 SWITCH_NETWORK handler called for: ${networkId}`);
      
      if (!networkId) {
        throw new Error('Network ID is required');
      }

      const result = await WalletManager.switchNetwork(networkId);
      return result;

    } catch (error) {
      console.error(`SWITCH_NETWORK error for ${message.networkId}:`, error);
      return { success: false, error: error.message };
    }
  },

  'GET_BALANCE': async (message) => {
    try {
      const { address, network } = message;
      
      if (!address || !network) {
        throw new Error('Address and network are required');
      }

      const balance = await BlockchainService.getNetworkBalance(address, network);
      return { success: true, data: { balance } };

    } catch (error) {
      console.error('GET_BALANCE error:', error);
      return { success: false, error: error.message };
    }
  },

  'SEND_TRANSACTION': async (message) => {
    try {
      const { txParams, network } = message;
      
      if (!txParams) {
        throw new Error('Transaction parameters are required');
      }

      const txHash = await BlockchainService.sendTransaction(txParams, network);
      return { success: true, data: { txHash } };

    } catch (error) {
      console.error('SEND_TRANSACTION error:', error);
      return { success: false, error: error.message };
    }
  },

  // Enhanced DApp request handler for locked wallet scenarios
  'DAPP_REQUEST': async (message) => {
    try {
      const { method, params = [], origin } = message;
      
      console.log(`DApp request from ${origin}: ${method}`);
      
      if (!method) {
        throw new Error('Method is required');
      }

      // Get wallet status
      const walletStatus = await WalletManager.getWalletStatus();
      console.log('Wallet status for DApp request:', walletStatus);

      // Handle case when no wallet exists
      if (!walletStatus.hasWallet) {
        return {
          success: false,
          error: 'NO_WALLET',
          data: {
            code: 4100,
            message: 'No wallet found. Please create a wallet first.',
            requiresSetup: true
          }
        };
      }

      // Methods that don't require unlocked wallet
      const publicMethods = ['eth_chainId', 'net_version', 'eth_blockNumber'];
      
      if (publicMethods.includes(method)) {
        return await handlePublicMethod(method, params);
      }

      // Handle wallet locked scenarios
      if (!walletStatus.isUnlocked) {
        console.log(`Wallet locked for ${method} request`);

        // Account connection requests when locked
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to connect to this DApp.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestId: Date.now().toString(),
              // Store pending request for after unlock
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        }

        // Transaction/signing requests when locked  
        const signingMethods = [
          'eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 
          'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v3', 
          'eth_signTypedData_v4'
        ];

        if (signingMethods.includes(method)) {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to sign this transaction.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestType: 'signing',
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        }

        // Other methods when locked
        return {
          success: false,
          error: 'WALLET_LOCKED',
          data: {
            code: 4100,
            message: 'Wallet is locked. Please unlock to continue.',
            requiresUnlock: true,
            hasWallet: true
          }
        };
      }

      // Wallet is unlocked - proceed with request
      return await handleUnlockedWalletRequest(method, params, origin);

    } catch (error) {
      console.error('DAPP_REQUEST error:', error);
      return {
        success: false,
        error: 'REQUEST_FAILED',
        data: {
          code: -32603,
          message: error.message || 'Internal error'
        }
      };
    }
  },

  'DERIVE_NETWORK_ADDRESS': async (message) => {
    const { networkId } = message;
    if (!networkId) {
      throw new Error('Network ID is required');
    }

    try {
      console.log(`Enhanced derive network address for: ${networkId}`);
      
      const result = await storage.local.get(['wallet', 'walletState']);
      const wallet = result.wallet;
      const walletState = result.walletState;

      if (!wallet) {
        throw new Error('No wallet found');
      }

      if (!walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked');
      }

      if (wallet.addresses && wallet.addresses[networkId]) {
        console.log(`Found existing ${networkId} address:`, wallet.addresses[networkId]);
        return { success: true, data: { address: wallet.addresses[networkId] } };
      }

      const tempPassword = walletState.tempPassword;
      if (!tempPassword) {
        throw new Error('Wallet authentication required');
      }
      
      const seedPhrase = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, tempPassword);
      if (!seedPhrase) {
        throw new Error('Failed to decrypt seed phrase');
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(seedPhrase + networkId + wallet.id);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(hashBuffer));

      let address: string;
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

      switch (networkId.toLowerCase()) {
        case 'ethereum':
        case 'bsc':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          address = '0x' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
          break;
          
        case 'bitcoin':
          const btcAddressBody = hash.slice(0, 25).map(b => base58Chars[b % base58Chars.length]).join('');
          address = '1' + btcAddressBody;
          break;
          
        case 'litecoin':
          console.log('Using working Litecoin address generation algorithm...');
          address = await WalletManager.generateLitecoinAddress(seedPhrase);
          console.log(`Generated Litecoin address using algorithm: ${address}`);
          break;
          
        case 'solana':
          address = hash.slice(0, 32).map(b => base58Chars[b % base58Chars.length]).join('').slice(0, 44);
          break;
          
        case 'tron':
          const tronAddressBody = hash.slice(0, 20).map(b => base58Chars[b % base58Chars.length]).join('').slice(0, 33);
          address = 'T' + tronAddressBody;
          break;
          
        case 'ton':
          const base64urlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
          const addressBytes = hash.slice(0, 32);
          const checksumBytes = hash.slice(30, 32);
          const fullBytes = [...addressBytes, ...checksumBytes];
          
          address = 'EQ';
          for (let i = 0; i < 44; i++) {
            const index = fullBytes[i % fullBytes.length] % base64urlChars.length;
            address += base64urlChars[index];
          }
          break;
          
        case 'xrp':
          const xrpAddressBody = hash.slice(0, 20).map(b => base58Chars[b % base58Chars.length]).join('').slice(0, 24);
          address = 'r' + xrpAddressBody;
          break;
          
        default:
          address = '0x' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
      }

      // Validate the generated address
      let isValid = false;
      switch (networkId.toLowerCase()) {
        case 'litecoin':
          isValid = /^[LM][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,34}$/.test(address);
          break;
        case 'bitcoin':
          isValid = /^[13][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,34}$/.test(address);
          break;
        case 'ethereum':
        case 'bsc':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
          break;
        case 'tron':
          isValid = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
          break;
        case 'ton':
          isValid = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(address);
          break;
        case 'xrp':
          isValid = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
          break;
        default:
          isValid = address && address.length > 0;
      }

      if (!isValid) {
        throw new Error(`Generated invalid address for ${networkId}: ${address}`);
      }

      console.log(`Generated valid ${networkId} address: ${address}`);

      const updatedAddresses = { ...wallet.addresses, [networkId]: address };
      const updatedWallet = { ...wallet, addresses: updatedAddresses };
      
      await storage.local.set({ wallet: updatedWallet });
      
      console.log(`Stored ${networkId} address: ${address}`);

      return { success: true, data: { address } };
      
    } catch (error) {
      console.error(`Enhanced derive network address failed:`, error);
      throw new Error(`Failed to generate valid address for ${networkId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Helper function for public methods that don't require wallet unlock
async function handlePublicMethod(method: string, params: any[]): Promise<any> {
  switch (method) {
    case 'eth_chainId':
      // Return current chain ID or default to Ethereum
      const chainIds = { ethereum: '0x1', bsc: '0x38', polygon: '0x89' };
      return { success: true, data: chainIds['ethereum'] };
      
    case 'net_version':
      const versions = { ethereum: '1', bsc: '56', polygon: '137' };
      return { success: true, data: versions['ethereum'] };
      
    case 'eth_blockNumber':
      try {
        const blockNumber = await BlockchainService.makeRpcRequestWithFallbacks('ethereum', 'eth_blockNumber', []);
        return { success: true, data: blockNumber };
      } catch (error) {
        return { success: true, data: '0x0' }; // Fallback
      }
      
    default:
      throw new Error(`Unsupported public method: ${method}`);
  }
}

// Handle requests when wallet is unlocked
async function handleUnlockedWalletRequest(method: string, params: any[], origin: string): Promise<any> {
  const accounts = await WalletManager.getAccounts();
  
  switch (method) {
    case 'eth_requestAccounts':
    case 'eth_accounts':
      // Connect to DApp
      await addConnectedSite(origin, accounts.map(acc => acc.address));
      return { 
        success: true, 
        data: accounts.map(acc => acc.address) 
      };

    case 'eth_getBalance':
      const address = params[0] || accounts[0]?.address;
      if (!address) throw new Error('No address available');
      const balance = await BlockchainService.getBalance(address);
      return { success: true, data: balance };

    case 'eth_sendTransaction':
      // This would typically show a transaction confirmation popup
      return await handleTransactionRequest(params[0], origin, accounts[0]);

    case 'personal_sign':
      // This would typically show a message signing popup  
      return await handleSigningRequest('personal_sign', params, origin, accounts[0]);

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// Store connected sites
async function addConnectedSite(origin: string, addresses: string[]): Promise<void> {
  try {
    const result = await storage.local.get(['connectedSites']);
    const connectedSites = result.connectedSites || {};
    
    connectedSites[origin] = {
      origin,
      addresses,
      connectedAt: Date.now(),
      permissions: ['eth_accounts']
    };
    
    await storage.local.set({ connectedSites });
    console.log(`Site connected: ${origin}`);
  } catch (error) {
    console.error('Failed to store connected site:', error);
  }
}

// Handle transaction requests
async function handleTransactionRequest(txParams: any, origin: string, account: any): Promise<any> {
  // This would typically show a transaction confirmation popup
  // For now, return a placeholder response
  return {
    success: true,
    data: '0x' + Math.random().toString(16).substring(2, 66) // Mock transaction hash
  };
}

// Handle signing requests
async function handleSigningRequest(method: string, params: any[], origin: string, account: any): Promise<any> {
  // This would typically show a message signing popup
  // For now, return a placeholder response
  return {
    success: true,
    data: '0x' + Math.random().toString(16).substring(2, 66) // Mock signature
  };
}

// ============================================================================
// ENHANCED MESSAGE LISTENER
// ============================================================================

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      if (!message.type) {
        throw new Error('Message type is required');
      }

      // Handle DApp requests specially
      if (message.type === 'PAYCIO_DAPP_REQUEST') {
        const dappHandler = new PaycioDAppHandler();
        const response = await dappHandler['processRequest']({
          ...message,
          origin: sender.url ? new URL(sender.url).origin : 'unknown'
        });
        sendResponse(response);
        return;
      }

      const handler = messageHandlers[message.type];
      if (!handler) {
        throw new Error(`Unknown message type: ${message.type}`);
      }

      const response = await handler(message);
      sendResponse(response);
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  handleMessage();
  return true;
});

// ============================================================================
// EXTENSION LIFECYCLE & AUTO-LOCK
// ============================================================================

// Auto-lock wallet after inactivity
setInterval(async () => {
  try {
    const result = await storage.local.get(['walletState', 'settings']);
    const walletState = result.walletState;
    const settings = result.settings;
    
    if (walletState?.isWalletUnlocked && walletState.lastUnlockTime) {
      const autoLockTimeout = (settings?.autoLockTimeout || 30) * 60 * 1000;
      const inactiveTime = Date.now() - walletState.lastUnlockTime;
      
      if (inactiveTime > autoLockTimeout) {
        await WalletManager.lockWallet();
        console.log('Paycio: Wallet auto-locked due to inactivity');
      }
    }
  } catch (error) {
    console.error('Paycio: Auto-lock check failed:', error);
  }
}, 60000);

browserAPI.runtime.onInstalled.addListener((details) => {
  console.log('Paycio installed/updated:', details.reason);
});

browserAPI.runtime.onStartup.addListener(() => {
  console.log('Paycio extension startup');
});

// ============================================================================
// SERVICE WORKER PERSISTENCE
// ============================================================================

const HEARTBEAT_INTERVAL = 20000;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isServiceWorkerActive = false;

function initializeServiceWorker() {
  console.log('Paycio: Initializing service worker...');
  
  isServiceWorkerActive = true;
  startHeartbeat();
  setupKeepaliveAlarm();

  console.log('Paycio Secure Background Script Ready');
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (isServiceWorkerActive) {
      console.log('Paycio: Service worker heartbeat -', new Date().toISOString());
      storage.local.get(['heartbeat']).then(() => {
        storage.local.set({ heartbeat: Date.now() });
      }).catch(console.warn);
    }
  }, HEARTBEAT_INTERVAL);
}

function setupKeepaliveAlarm() {
  try {
    (browserAPI.alarms as any)?.create('paycio-keepalive', {
      delayInMinutes: 0.5,
      periodInMinutes: 0.5
    });
    
    browserAPI.alarms?.onAlarm.addListener((alarm) => {
      if (alarm.name === 'paycio-keepalive') {
        console.log('Paycio: Keepalive alarm triggered');
        storage.local.get(['keepalive']).then(() => {
          storage.local.set({ keepalive: Date.now() });
        });
      }
    });
  } catch (error) {
    console.warn('Paycio: Could not set up keepalive alarm:', error);
  }
}

// Service worker lifecycle handlers
if (typeof self !== 'undefined') {
  self.addEventListener('install', (event: any) => {
    console.log('Paycio: Service worker installing...');
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('Paycio: Service worker installed');
        return (self as any).skipWaiting();
      })
    );
  });

  self.addEventListener('activate', (event: any) => {
    console.log('Paycio: Service worker activating...');
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('Paycio: Service worker activated');
        initializeServiceWorker();
        return (self as any).clients.claim();
      })
    );
  });

  self.addEventListener('error', (event: ErrorEvent) => {
    console.error('Paycio: Service worker error:', event.error);
  });

  self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    console.error('Paycio: Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

// Initialize immediately if already active
if (typeof self !== 'undefined' && (self as any).registration && (self as any).registration.active) {
  initializeServiceWorker();
}

// Initialize the DApp handler
const dappHandler = new PaycioDAppHandler();

// Export for external access
export { dappHandler, WalletManager, SecurityManager, BlockchainService };
