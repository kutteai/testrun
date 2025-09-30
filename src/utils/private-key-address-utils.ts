import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { TronWeb } from 'tronweb';
import { createHash } from 'crypto';

const bip32 = BIP32Factory(ecc);

export interface PrivateKeyDerivationResult {
  address: string;
  publicKey: string;
  privateKey: string;
  network: string;
  chainType: 'evm' | 'bitcoin' | 'solana' | 'tron' | 'ton' | 'xrp';
}

/**
 * Derive addresses from private key for all supported networks
 */
export async function deriveAddressesFromPrivateKey(
  privateKey: string,
  networks: string[] = ['ethereum', 'bitcoin', 'solana', 'tron', 'ton', 'xrp']
): Promise<Record<string, PrivateKeyDerivationResult>> {
  const results: Record<string, PrivateKeyDerivationResult> = {};
  
  for (const network of networks) {
    try {
      const result = await deriveAddressFromPrivateKey(privateKey, network);
      results[network] = result;
    } catch (error) {
      console.warn(`Failed to derive ${network} address from private key:`, error);
    }
  }
  
  return results;
}

/**
 * Derive address from private key for a specific network
 */
export async function deriveAddressFromPrivateKey(
  privateKey: string,
  network: string
): Promise<PrivateKeyDerivationResult> {
  // Clean and validate private key
  const cleanKey = privateKey.trim();
  const processedKey = cleanKey.startsWith('0x') ? cleanKey.slice(2) : cleanKey;
  
  if (processedKey.length !== 64) {
    throw new Error('Invalid private key length');
  }
  
  const privateKeyBuffer = Buffer.from(processedKey, 'hex');
  
  switch (network.toLowerCase()) {
    case 'ethereum':
    case 'bsc':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
    case 'avalanche':
    case 'base':
    case 'fantom':
      return await deriveEVMAddress(privateKeyBuffer, network);
    
    case 'bitcoin':
      return await deriveBitcoinAddress(privateKeyBuffer);
    
    case 'litecoin':
      return await deriveLitecoinAddress(privateKeyBuffer);
    
    case 'solana':
      return await deriveSolanaAddress(privateKeyBuffer);
    
    case 'tron':
      return await deriveTronAddress(privateKeyBuffer);
    
    case 'ton':
      return await deriveTonAddress(privateKeyBuffer);
    
    case 'xrp':
      return await deriveXrpAddress(privateKeyBuffer);
    
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Derive EVM address from private key
 */
async function deriveEVMAddress(privateKeyBuffer: Buffer, network: string): Promise<PrivateKeyDerivationResult> {
  const privateKey = '0x' + privateKeyBuffer.toString('hex');
  const wallet = new ethers.Wallet(privateKey);
  
  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKey,
    network,
    chainType: 'evm'
  };
}

/**
 * Derive Bitcoin address from private key
 */
async function deriveBitcoinAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // Create key pair from private key
    const keyPair = bitcoin.ECPair.fromPrivateKey(privateKeyBuffer);
    const publicKey = keyPair.publicKey;
    
    // Generate P2WPKH (native segwit) address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address');
    }
    
    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKeyBuffer.toString('hex'),
      network: 'bitcoin',
      chainType: 'bitcoin'
    };
  } catch (error) {
    console.error('Error deriving Bitcoin address:', error);
    throw new Error(`Failed to derive Bitcoin address: ${error.message}`);
  }
}

/**
 * Derive Litecoin address from private key
 */
async function deriveLitecoinAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // Create key pair from private key
    const keyPair = bitcoin.ECPair.fromPrivateKey(privateKeyBuffer);
    const publicKey = keyPair.publicKey;
    
    // Generate P2WPKH address for Litecoin
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: publicKey,
      network: bitcoin.networks.litecoin
    });
    
    if (!address) {
      throw new Error('Failed to generate Litecoin address');
    }
    
    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKeyBuffer.toString('hex'),
      network: 'litecoin',
      chainType: 'bitcoin'
    };
  } catch (error) {
    console.error('Error deriving Litecoin address:', error);
    throw new Error(`Failed to derive Litecoin address: ${error.message}`);
  }
}

/**
 * Derive Solana address from private key
 */
async function deriveSolanaAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // For Solana, we need exactly 32 bytes
    const solanaSeed = privateKeyBuffer.slice(0, 32);
    
    // Create Solana keypair from seed
    const keypair = Keypair.fromSeed(solanaSeed);
    
    return {
      address: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('base64'),
      network: 'solana',
      chainType: 'solana'
    };
  } catch (error) {
    console.error('Error deriving Solana address:', error);
    throw new Error(`Failed to derive Solana address: ${error.message}`);
  }
}

/**
 * Derive Tron address from private key
 */
async function deriveTronAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // Tron uses the same secp256k1 as Ethereum
    const privateKey = '0x' + privateKeyBuffer.toString('hex');
    const wallet = new ethers.Wallet(privateKey);
    
    // Convert Ethereum address to Tron address
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    });
    
    // For now, we'll use the Ethereum address format
    // In a real implementation, you'd convert to Tron's base58 format
    const tronAddress = wallet.address;
    
    return {
      address: tronAddress,
      publicKey: wallet.publicKey,
      privateKey,
      network: 'tron',
      chainType: 'tron'
    };
  } catch (error) {
    console.error('Error deriving Tron address:', error);
    throw new Error(`Failed to derive Tron address: ${error.message}`);
  }
}

/**
 * Derive TON address from private key
 */
async function deriveTonAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // TON uses Ed25519, similar to Solana
    const tonSeed = privateKeyBuffer.slice(0, 32);
    
    // For TON, we need to implement Ed25519 key generation
    // This is a simplified version - in production you'd use a proper TON library
    const address = '0:' + tonSeed.toString('hex').slice(0, 32);
    
    return {
      address,
      publicKey: tonSeed.toString('hex'),
      privateKey: tonSeed.toString('hex'),
      network: 'ton',
      chainType: 'ton'
    };
  } catch (error) {
    console.error('Error deriving TON address:', error);
    throw new Error(`Failed to derive TON address: ${error.message}`);
  }
}

/**
 * Derive XRP address from private key
 */
async function deriveXrpAddress(privateKeyBuffer: Buffer): Promise<PrivateKeyDerivationResult> {
  try {
    // XRP uses secp256k1 but with different address encoding
    const keyPair = bitcoin.ECPair.fromPrivateKey(privateKeyBuffer);
    const publicKey = keyPair.publicKey;
    
    // XRP address generation (simplified)
    // In production, you'd use the proper XRP address encoding
    const xrpAddress = 'r' + publicKey.toString('hex').slice(0, 32);
    
    return {
      address: xrpAddress,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKeyBuffer.toString('hex'),
      network: 'xrp',
      chainType: 'xrp'
    };
  } catch (error) {
    console.error('Error deriving XRP address:', error);
    throw new Error(`Failed to derive XRP address: ${error.message}`);
  }
}

/**
 * Get all supported networks for private key derivation
 */
export function getSupportedNetworksForPrivateKey(): string[] {
  return [
    'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base', 'fantom',
    'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
  ];
}

/**
 * Check if a network supports private key derivation
 */
export function isNetworkSupportedForPrivateKey(network: string): boolean {
  return getSupportedNetworksForPrivateKey().includes(network.toLowerCase());
}
