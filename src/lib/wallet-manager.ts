import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import type { Account, Network, Wallet } from '../types';
import { getHDPath } from './networks';
import { encrypt, decrypt, validateMnemonic, mnemonicToSeed } from './crypto';

/**
 * Multi-chain wallet manager
 * Handles wallet creation, import, and account derivation
 */

export class WalletManager {
  /**
   * Create new HD wallet with mnemonic
   */
  static async createHDWallet(
    password: string,
    mnemonic: string,
    walletName: string = 'Wallet 1'
  ): Promise<{ wallet: Wallet; mnemonic: string }> {
    // Validate mnemonic
    if (!await validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Encrypt mnemonic
    const encryptedSeed = await encrypt(mnemonic, password);

    const wallet: Wallet = {
      id: crypto.randomUUID(),
      name: walletName,
      accounts: [],
      encryptedSeed: JSON.stringify(encryptedSeed),
      createdAt: Date.now(),
    };

    return { wallet, mnemonic };
  }

  /**
   * Derive account from HD wallet for specific network
   */
  static async deriveAccount(
    mnemonic: string,
    network: Network,
    index: number = 0,
    accountName?: string
  ): Promise<Account> {
    const seed = await mnemonicToSeed(mnemonic);
    const hdPath = getHDPath(network, index);

    let address: string;
    let publicKey: string;

    switch (network.type) {
      case 'EVM': {
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        const derivedNode = hdNode.derivePath(hdPath);
        address = derivedNode.address;
        publicKey = derivedNode.publicKey;
        break;
      }

      case 'Bitcoin':
      case 'Litecoin': {
        const root = bip32.fromSeed(seed);
        const child = root.derivePath(hdPath);
        
        const network = network.type === 'Bitcoin' 
          ? bitcoin.networks.bitcoin 
          : bitcoin.networks.litecoin;
        
        const { address: btcAddress } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network,
        });
        
        if (!btcAddress) throw new Error('Failed to derive Bitcoin address');
        
        address = btcAddress;
        publicKey = child.publicKey.toString('hex');
        break;
      }

      case 'Solana': {
        const derivedSeed = seed.slice(0, 32);
        const keypair = Keypair.fromSeed(derivedSeed);
        address = keypair.publicKey.toBase58();
        publicKey = keypair.publicKey.toBase58();
        break;
      }

      case 'TRON': {
        // TRON uses similar derivation to Ethereum
        const TronWeb = (await import('tronweb')).default;
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        const derivedNode = hdNode.derivePath(hdPath);
        
        // Convert ETH-style address to TRON address
        const tronWeb = new TronWeb({ fullHost: network.rpcUrl });
        address = tronWeb.address.fromHex('41' + derivedNode.address.slice(2));
        publicKey = derivedNode.publicKey;
        break;
      }

      default:
        throw new Error(`Unsupported network type: ${network.type}`);
    }

    return {
      id: crypto.randomUUID(),
      name: accountName || `${network.name} Account ${index + 1}`,
      address,
      publicKey,
      type: 'hd',
      hdPath,
      createdAt: Date.now(),
    };
  }

  /**
   * Import account from private key
   */
  static async importFromPrivateKey(
    privateKey: string,
    network: Network,
    accountName: string = 'Imported Account'
  ): Promise<Account> {
    let address: string;
    let publicKey: string;

    try {
      switch (network.type) {
        case 'EVM': {
          const wallet = new ethers.Wallet(privateKey);
          address = wallet.address;
          publicKey = wallet.publicKey;
          break;
        }

        case 'Solana': {
          const secretKey = Buffer.from(privateKey, 'hex');
          const keypair = Keypair.fromSecretKey(secretKey);
          address = keypair.publicKey.toBase58();
          publicKey = keypair.publicKey.toBase58();
          break;
        }

        case 'Bitcoin':
        case 'Litecoin': {
          const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
          const networkConfig = network.type === 'Bitcoin' 
            ? bitcoin.networks.bitcoin 
            : bitcoin.networks.litecoin;
          
          const { address: btcAddress } = bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network: networkConfig,
          });
          
          if (!btcAddress) throw new Error('Failed to derive address');
          address = btcAddress;
          publicKey = keyPair.publicKey.toString('hex');
          break;
        }

        case 'TRON': {
          const TronWeb = (await import('tronweb')).default;
          const tronWeb = new TronWeb({ fullHost: network.rpcUrl });
          address = tronWeb.address.fromPrivateKey(privateKey);
          publicKey = tronWeb.utils.crypto.getPubKeyFromPriKey(privateKey);
          break;
        }

        default:
          throw new Error(`Unsupported network type: ${network.type}`);
      }

      return {
        id: crypto.randomUUID(),
        name: accountName,
        address,
        publicKey,
        type: 'imported',
        createdAt: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to import private key: ${(error as Error).message}`);
    }
  }

  /**
   * Get private key for account (requires password)
   */
  static async getPrivateKey(
    account: Account,
    wallet: Wallet,
    password: string
  ): Promise<string> {
    if (account.type === 'hardware') {
      throw new Error('Cannot export private key from hardware wallet');
    }

    if (account.type === 'imported') {
      throw new Error('Imported accounts store private keys separately');
    }

    if (!wallet.encryptedSeed) {
      throw new Error('Wallet has no encrypted seed');
    }

    // Decrypt mnemonic
    const encryptedVault = JSON.parse(wallet.encryptedSeed);
    const mnemonic = await decrypt(encryptedVault, password);
    
    const seed = await mnemonicToSeed(mnemonic);
    const hdPath = account.hdPath || "m/44'/60'/0'/0/0";

    // Derive private key based on network
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    const derivedNode = hdNode.derivePath(hdPath);
    
    return derivedNode.privateKey;
  }

  /**
   * Validate address format for network
   */
  static isValidAddress(address: string, network: Network): boolean {
    try {
      switch (network.type) {
        case 'EVM':
          return ethers.isAddress(address);

        case 'Solana':
          try {
            new PublicKey(address);
            return true;
          } catch {
            return false;
          }

        case 'Bitcoin':
        case 'Litecoin':
          // Basic Bitcoin address validation
          return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
                 /^bc1[a-z0-9]{39,87}$/.test(address);

        case 'TRON':
          return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Format address for display
   */
  static formatAddress(address: string, length: number = 8): string {
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }
}