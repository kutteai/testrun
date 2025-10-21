// Private key and address utilities
import { ethers, isAddress } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { HDKey } from 'hdkey';
import * as bip39 from 'bip39';

// Initialize ECPair with tiny-secp256k1
const ECPair = ECPairFactory(ecc);

export interface AddressResult {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
}

export class PrivateKeyAddressUtils {
  static generateEthereumAddress(privateKey: string): string {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    } catch (error) {
      throw new Error(`Failed to generate Ethereum address: ${error.message}`);
    }
  }

  static generateBitcoinAddress(privateKey: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    try {
      const privateKeyBuffer = Buffer.from(privateKey, 'hex');
      const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
      });
      return address!;
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin address: ${error.message}`);
    }
  }

  static generateLitecoinAddress(privateKey: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    try {
      const privateKeyBuffer = Buffer.from(privateKey, 'hex');
      const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
      // Use Bitcoin network for Litecoin (similar structure)
      const { address } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
      });
      return address!;
    } catch (error) {
      throw new Error(`Failed to generate Litecoin address: ${error.message}`);
    }
  }

  static deriveFromSeedPhrase(seedPhrase: string, derivationPath: string, network: string): AddressResult {
    try {
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      const seed = bip39.mnemonicToSeed(seedPhrase);
      const hdkey = HDKey.fromMasterSeed(seed);
      const derived = hdkey.derive(derivationPath);

      if (!derived.privateKey || !derived.publicKey) {
        throw new Error('Failed to derive keys');
      }

      let address: string;
      const privateKey = derived.privateKey.toString('hex');
      const publicKey = derived.publicKey.toString('hex');

      switch (network.toLowerCase()) {
        case 'ethereum':
        case 'bsc':
        case 'polygon':
        case 'arbitrum':
        case 'optimism': {
          const wallet = new ethers.Wallet(privateKey);
          address = wallet.address;
          }
          break;
        case 'bitcoin':
          address = this.generateBitcoinAddress(privateKey);
          break;
        case 'litecoin':
          address = this.generateLitecoinAddress(privateKey);
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }

      return {
        address,
        privateKey,
        publicKey,
        derivationPath,
      };
    } catch (error) {
      throw new Error(`Failed to derive address: ${error.message}`);
    }
  }

  static validatePrivateKey(privateKey: string, network: string): boolean {
    try {
      switch (network.toLowerCase()) {
        case 'ethereum':
        case 'bsc':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
          new ethers.Wallet(privateKey);
          return true;
        case 'bitcoin':
        case 'litecoin':
          ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
          return true;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  static validateAddress(address: string, network: string): boolean {
    try {
      switch (network.toLowerCase()) {
        case 'ethereum':
        case 'bsc':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
          return isAddress(address);
        case 'bitcoin':
          return bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin) !== null;
        case 'litecoin':
          try {
            bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
            return true;
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export default PrivateKeyAddressUtils;
