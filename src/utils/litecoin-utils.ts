import { createHash, randomBytes } from 'crypto-browserify';

// Litecoin network constants
export const LITECOIN_NETWORKS = {
  mainnet: {
    name: 'Litecoin Mainnet',
    symbol: 'LTC',
    bip32: 0x019da462,
    bip44: 2,
    addressPrefix: 0x30,
    scriptPrefix: 0x32,
    wifPrefix: 0xb0,
    segwitPrefix: 'ltc',
    rpcUrl: 'https://litecoinspace.org/api',
    explorer: 'https://blockchair.com/litecoin'
  },
  testnet: {
    name: 'Litecoin Testnet',
    symbol: 'tLTC',
    bip32: 0x0436ef7d,
    bip44: 2,
    addressPrefix: 0x6f,
    scriptPrefix: 0x3a,
    wifPrefix: 0xef,
    segwitPrefix: 'tltc',
    rpcUrl: 'https://testnet.litecoinspace.org/api',
    explorer: 'https://blockchair.com/litecoin/testnet'
  }
};

// Litecoin address types
export enum AddressType {
  LEGACY = 'legacy',
  SEGWIT = 'segwit',
  NATIVE_SEGWIT = 'native_segwit'
}

// Litecoin transaction interface
export interface LitecoinTransaction {
  txid: string;
  blockHeight: number;
  timestamp: number;
  amount: number;
  fee: number;
  type: 'send' | 'receive';
  address: string;
  confirmations: number;
  vout: number;
  vin: number;
}

// Litecoin wallet interface
export interface LitecoinWallet {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  privateKey: string;
  addressType: AddressType;
  balance: number;
  unconfirmedBalance: number;
  network: 'mainnet' | 'testnet';
  derivationPath: string;
  createdAt: number;
}

// Base58 alphabet
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Base58 encoding utility
function base58Encode(buffer: Buffer): string {
  if (buffer.length === 0) return '';
  
  // Convert to big integer
  let num = BigInt('0x' + buffer.toString('hex'));
  let str = '';
  
  // Convert to base58
  while (num > 0) {
    const mod = Number(num % BigInt(58));
    str = BASE58_ALPHABET[mod] + str;
    num = num / BigInt(58);
  }
  
  // Handle leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    str = '1' + str;
  }
  
  return str;
}

// RIPEMD-160 hash (simplified implementation)
function ripemd160(buffer: Buffer): Buffer {
  // In a real implementation, you'd use the actual RIPEMD-160 algorithm
  // For now, we'll use a simplified approach with SHA-256
  const sha256Hash = createHash('sha256').update(buffer).digest();
  return sha256Hash.slice(0, 20); // Truncate to 20 bytes
}

// Double SHA-256 hash
function doubleSha256(buffer: Buffer): Buffer {
  return createHash('sha256').update(createHash('sha256').update(buffer).digest()).digest();
}

// Simplified secp256k1 public key generation
function getPublicKeyFromPrivate(privateKey: Buffer): Buffer {
  // This is a simplified implementation
  // In production, use a proper secp256k1 library like 'secp256k1' or 'tiny-secp256k1'
  const hash = createHash('sha256').update(privateKey).digest();
  
  // Create a compressed public key format (33 bytes: 0x02/0x03 + 32 bytes)
  const prefix = hash[0] % 2 === 0 ? 0x02 : 0x03;
  const publicKey = Buffer.alloc(33);
  publicKey[0] = prefix;
  hash.copy(publicKey, 1, 0, 32);
  
  return publicKey;
}

// Bech32 encoding for native SegWit (simplified)
function bech32Encode(hrp: string, data: Buffer): string {
  // This is a simplified bech32 implementation
  // For production, use a proper bech32 library
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  
  // Convert 8-bit data to 5-bit
  const fiveBitData: number[] = [];
  let acc = 0;
  let bits = 0;
  
  for (const byte of data) {
    acc = (acc << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      fiveBitData.push((acc >> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    fiveBitData.push((acc << (5 - bits)) & 31);
  }
  
  // Simple checksum (not proper bech32 checksum)
  const checksum = [0, 0, 0, 0, 0, 0]; // 6 characters
  
  // Build the address
  let result = hrp + '1';
  for (const value of fiveBitData) {
    result += alphabet[value];
  }
  for (const value of checksum) {
    result += alphabet[value];
  }
  
  return result;
}

// Litecoin address generator
export class LitecoinAddressGenerator {
  private network: typeof LITECOIN_NETWORKS.mainnet;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = LITECOIN_NETWORKS[network];
  }

  // Generate secure private key
  private generatePrivateKey(): Buffer {
    let privateKey: Buffer;
    do {
      privateKey = randomBytes(32);
    } while (privateKey.every(byte => byte === 0)); // Ensure non-zero key
    
    return privateKey;
  }

  // Generate legacy P2PKH address
  private generateLegacyAddress(publicKey: Buffer): string {
    try {
      // Create public key hash (HASH160)
      const sha256Hash = createHash('sha256').update(publicKey).digest();
      const hash160 = ripemd160(sha256Hash);
      
      // Add version byte
    const versionedHash = Buffer.concat([Buffer.from([this.network.addressPrefix]), hash160]);
      
      // Calculate checksum (first 4 bytes of double SHA-256)
      const checksum = doubleSha256(versionedHash).slice(0, 4);
      
      // Combine version + hash + checksum
      const fullAddress = Buffer.concat([versionedHash, checksum]);
      
      return base58Encode(fullAddress);
    } catch (error) {
      console.error('Error generating legacy address:', error);
      throw new Error('Failed to generate legacy address');
    }
  }

  // Generate P2SH-SegWit address
  private generateSegWitAddress(publicKey: Buffer): string {
    try {
      // Create witness script (0x0014 + 20-byte pubkey hash)
      const sha256Hash = createHash('sha256').update(publicKey).digest();
      const hash160 = ripemd160(sha256Hash);
      const witnessScript = Buffer.concat([Buffer.from([0x00, 0x14]), hash160]);
      
      // Hash the witness script
      const scriptHash = ripemd160(createHash('sha256').update(witnessScript).digest());
      
      // Add version byte for P2SH
      const versionedHash = Buffer.concat([Buffer.from([this.network.scriptPrefix]), scriptHash]);
      
      // Calculate checksum
      const checksum = doubleSha256(versionedHash).slice(0, 4);
      
      // Combine version + hash + checksum
      const fullAddress = Buffer.concat([versionedHash, checksum]);
      
      return base58Encode(fullAddress);
    } catch (error) {
      console.error('Error generating SegWit address:', error);
      throw new Error('Failed to generate SegWit address');
    }
  }

  // Generate native SegWit (Bech32) address
  private generateNativeSegWitAddress(publicKey: Buffer): string {
    try {
      // Create public key hash
      const sha256Hash = createHash('sha256').update(publicKey).digest();
      const hash160 = ripemd160(sha256Hash);
      
      // Create witness program (version 0 + 20-byte hash)
      const witnessProgram = Buffer.concat([Buffer.from([0x00]), hash160]);
      
      // Encode as bech32
      return bech32Encode(this.network.segwitPrefix, witnessProgram);
    } catch (error) {
      console.error('Error generating native SegWit address:', error);
      throw new Error('Failed to generate native SegWit address');
    }
  }

  // Create WIF (Wallet Import Format)
  private createWIF(privateKey: Buffer, compressed: boolean = true): string {
    try {
    const version = Buffer.from([this.network.wifPrefix]);
    const keyData = compressed ? Buffer.concat([privateKey, Buffer.from([0x01])]) : privateKey;
    const versionedKey = Buffer.concat([version, keyData]);
      
      const checksum = doubleSha256(versionedKey).slice(0, 4);
      const fullWif = Buffer.concat([versionedKey, checksum]);
      
      return base58Encode(fullWif);
    } catch (error) {
      console.error('Error creating WIF:', error);
      throw new Error('Failed to create WIF');
    }
  }

  // Generate complete Litecoin wallet
  generateWallet(name: string, addressType: AddressType = AddressType.NATIVE_SEGWIT): LitecoinWallet {
    try {
    const privateKey = this.generatePrivateKey();
      const publicKey = getPublicKeyFromPrivate(privateKey);
    
    let address: string;
    switch (addressType) {
      case AddressType.LEGACY:
        address = this.generateLegacyAddress(publicKey);
        break;
      case AddressType.SEGWIT:
        address = this.generateSegWitAddress(publicKey);
        break;
      case AddressType.NATIVE_SEGWIT:
      default:
        address = this.generateNativeSegWitAddress(publicKey);
        break;
    }

      const walletId = createHash('sha256').update(privateKey).digest('hex').slice(0, 16);

    return {
        id: walletId,
      name,
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKey.toString('hex'),
      addressType,
      balance: 0,
      unconfirmedBalance: 0,
      network: this.network === LITECOIN_NETWORKS.mainnet ? 'mainnet' : 'testnet',
      derivationPath: `m/44'/2'/0'/0/0`,
      createdAt: Date.now()
    };
    } catch (error) {
      console.error('Error generating Litecoin wallet:', error);
      throw new Error('Failed to generate Litecoin wallet');
    }
  }
}

// Litecoin API utilities
export class LitecoinAPI {
  private baseUrl: string;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.baseUrl = network === 'mainnet' 
      ? 'https://litecoinspace.org/api'
      : 'https://testnet.litecoinspace.org/api';
  }

  // Get address balance with proper error handling
  async getBalance(address: string): Promise<{ confirmed: number; unconfirmed: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/address/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        confirmed: (data.chain_stats?.funded_txo_sum || 0) / 100000000,
        unconfirmed: ((data.mempool_stats?.funded_txo_sum || 0) - (data.mempool_stats?.spent_txo_sum || 0)) / 100000000
      };
    } catch (error) {
      console.error('Error fetching Litecoin balance:', error);
      throw new Error(`Failed to fetch Litecoin balance: ${error.message}. Real Litecoin API integration required.`);
    }
  }

  // Get address transactions with proper error handling
  async getTransactions(address: string): Promise<LitecoinTransaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/address/${address}/txs`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.slice(0, 10).map((tx: any) => ({
        txid: tx.txid,
        blockHeight: tx.status?.block_height || 0,
        timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
        amount: tx.value ? tx.value / 100000000 : 0,
        fee: tx.fee ? tx.fee / 100000000 : 0,
        type: tx.vin?.[0]?.prevout?.scriptpubkey_address === address ? 'send' : 'receive' as 'send' | 'receive',
        address,
        confirmations: tx.status?.confirmed ? tx.status.confirmations : 0,
        vout: tx.vout?.length || 0,
        vin: tx.vin?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching Litecoin transactions:', error);
      throw new Error(`Failed to fetch Litecoin transactions: ${error.message}. Real Litecoin API integration required.`);
    }
  }

  // Get fee rates
  async getFeeRates(): Promise<{ slow: number; medium: number; fast: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/fee-estimates`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        slow: data['1'] || 10,
        medium: data['3'] || 20,
        fast: data['6'] || 30
      };
    } catch (error) {
      console.error('Error fetching Litecoin fee rates:', error);
      throw new Error(`Failed to fetch Litecoin fee rates: ${error.message}. Real Litecoin API integration required.`);
    }
  }
}

// Export main utilities
export const litecoinUtils = {
  generateWallet: (name: string, network: 'mainnet' | 'testnet' = 'mainnet', addressType: AddressType = AddressType.NATIVE_SEGWIT) => {
    const generator = new LitecoinAddressGenerator(network);
    return generator.generateWallet(name, addressType);
  },
  
  getBalance: async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new LitecoinAPI(network);
    return api.getBalance(address);
  },
  
  getTransactions: async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new LitecoinAPI(network);
    return api.getTransactions(address);
  },
  
  getFeeRates: async (network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new LitecoinAPI(network);
    return api.getFeeRates();
  }
};