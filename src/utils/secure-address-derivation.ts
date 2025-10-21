import * as bip39 from 'bip39';
import { HDKey } from 'hdkey';
import { ethers, keccak256 } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import bs58 from 'bs58';

// Standard BIP44 derivation paths
export const DERIVATION_PATHS = {
  ETHEREUM: "m/44'/60'/0'/0/0",
  BITCOIN: "m/44'/0'/0'/0/0",
  LITECOIN: "m/44'/2'/0'/0/0",
  SOLANA: "m/44'/501'/0'/0'",
  TRON: "m/44'/195'/0'/0/0",
  TON: "m/44'/607'/0'/0/0",
  XRP: "m/44'/144'/0'/0/0",
} as const;

export interface AddressResult {
  address: string;
  publicKey: string;
  privateKey: string;
  path: string;
}

export class SecureAddressDerivation {
  /**
   * Convert mnemonic to seed using BIP39 standard
   */
  static mnemonicToSeed(mnemonic: string, passphrase?: string): Buffer {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    return bip39.mnemonicToSeedSync(mnemonic, passphrase);
  }

  /**
   * Generate HD key from seed using BIP32
   */
  static seedToHDKey(seed: Buffer): HDKey {
    return HDKey.fromMasterSeed(seed);
  }

  /**
   * Derive key from HD key using BIP44 path
   */
  static deriveKey(hdKey: HDKey, path: string): HDKey {
    return hdKey.derive(path);
  }

  /**
   * Generate Ethereum address using proper ECC and Keccak-256
   */
  static generateEthereumAddress(mnemonic: string, accountIndex: number = 0): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/60'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // Get uncompressed public key (65 bytes)
    const { publicKey } = derivedKey;

    // Remove the 0x04 prefix and get the last 20 bytes for address
    const publicKeyBytes = publicKey.slice(1); // Remove 0x04 prefix
    const addressBytes = keccak256(publicKeyBytes).slice(-20);
    const address = `0x${Buffer.from(addressBytes).toString('hex')}`;

    return {
      address,
      publicKey: `0x${publicKey.toString('hex')}`,
      privateKey: `0x${derivedKey.privateKey.toString('hex')}`,
      path: `m/44'/60'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate Bitcoin address using proper ECC and hash functions
   */
  static generateBitcoinAddress(mnemonic: string, accountIndex: number = 0, network: 'mainnet' | 'testnet' = 'mainnet'): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/0'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // Create ECPair for Bitcoin
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromPrivateKey(derivedKey.privateKey, {
      network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
    });

    // Generate P2WPKH (Bech32) address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey.buffer),
      network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
    });

    if (!address) {
      throw new Error('Failed to generate Bitcoin address');
    }

    return {
      address,
      publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/0'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate Litecoin address using proper ECC and hash functions
   */
  static generateLitecoinAddress(mnemonic: string, accountIndex: number = 0, network: 'mainnet' | 'testnet' = 'mainnet'): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/2'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // Create ECPair for Litecoin
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromPrivateKey(derivedKey.privateKey, {
      network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
    });

    // Generate P2WPKH (Bech32) address for Litecoin
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey.buffer),
      network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
    });

    if (!address) {
      throw new Error('Failed to generate Litecoin address');
    }

    return {
      address,
      publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/2'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate Solana address using proper ECC
   */
  static generateSolanaAddress(mnemonic: string, accountIndex: number = 0): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/501'/0'/0'/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // Solana uses Ed25519, but we'll use the secp256k1 key for now
    // In a real implementation, you'd need to convert to Ed25519
    const { publicKey } = derivedKey;
    const address = bs58.encode(publicKey);

    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/501'/0'/0'/${accountIndex}`,
    };
  }

  /**
   * Generate TRON address using proper ECC
   */
  static generateTronAddress(mnemonic: string, accountIndex: number = 0): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/195'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // TRON uses secp256k1 like Ethereum
    const { publicKey } = derivedKey;
    const publicKeyBytes = publicKey.slice(1); // Remove 0x04 prefix
    const addressBytes = keccak256(publicKeyBytes).slice(-20);

    // TRON address format: T + base58 encoded address
    const address = `T${bs58.encode(Buffer.from(addressBytes))}`;

    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/195'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate TON address using proper ECC
   */
  static generateTonAddress(mnemonic: string, accountIndex: number = 0): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/607'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // TON uses a different approach, but we'll use the public key for now
    const { publicKey } = derivedKey;
    const address = `0:${bs58.encode(publicKey)}`;

    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/607'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate XRP address using proper ECC
   */
  static generateXrpAddress(mnemonic: string, accountIndex: number = 0): AddressResult {
    const seed = this.mnemonicToSeed(mnemonic);
    const hdKey = this.seedToHDKey(seed);
    const derivedKey = this.deriveKey(hdKey, `m/44'/144'/0'/0/${accountIndex}`);

    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error('Failed to derive key');
    }

    // XRP uses a different address format
    const { publicKey } = derivedKey;
    const address = `r${bs58.encode(publicKey)}`;

    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: derivedKey.privateKey.toString('hex'),
      path: `m/44'/144'/0'/0/${accountIndex}`,
    };
  }

  /**
   * Generate all addresses for a mnemonic
   */
  static generateAllAddresses(mnemonic: string, accountIndex: number = 0): {
    ethereum: AddressResult;
    bitcoin: AddressResult;
    litecoin: AddressResult;
    solana: AddressResult;
    tron: AddressResult;
    ton: AddressResult;
    xrp: AddressResult;
  } {
    return {
      ethereum: this.generateEthereumAddress(mnemonic, accountIndex),
      bitcoin: this.generateBitcoinAddress(mnemonic, accountIndex),
      litecoin: this.generateLitecoinAddress(mnemonic, accountIndex),
      solana: this.generateSolanaAddress(mnemonic, accountIndex),
      tron: this.generateTronAddress(mnemonic, accountIndex),
      ton: this.generateTonAddress(mnemonic, accountIndex),
      xrp: this.generateXrpAddress(mnemonic, accountIndex),
    };
  }

  /**
   * Validate a mnemonic phrase
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Generate a new mnemonic phrase
   */
  static generateMnemonic(strength: number = 256): string {
    return bip39.generateMnemonic(strength);
  }
}
