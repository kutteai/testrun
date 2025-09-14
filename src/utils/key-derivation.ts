import { ethers } from 'ethers';
import { validateBIP39SeedPhrase } from './crypto-utils';
import * as bip39 from 'bip39';
// @ts-ignore
import { HDKey } from 'hdkey';

export interface HDWallet {
  seedPhrase: string;
  privateKey: string;
  publicKey: string;
  address: string;
  network: string;
  derivationPath: string;
  mnemonic: string;
}

export interface WalletAccount {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
  network: string;
}

// Generate HD wallet from seed phrase (real implementation)
export async function generateHDWallet(
  seedPhrase: string, 
  _network: string = 'ethereum', 
  derivationPath: string = "m/44'/60'/0'/0/0"
): Promise<HDWallet> {
  try {
    const { ethers } = await import('ethers');
    const bip39 = await import('bip39');
    
    // Validate seed phrase
    if (!bip39.validateMnemonic(seedPhrase)) {
      throw new Error('Invalid seed phrase');
    }
    
    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    
    // Create HD node
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    
    // Derive wallet from path
    const derivedWallet = hdNode.derivePath(derivationPath);
    
    return {
      address: derivedWallet.address,
      privateKey: derivedWallet.privateKey,
      publicKey: derivedWallet.publicKey,
      mnemonic: seedPhrase,
      derivationPath: derivationPath,
      seedPhrase: seedPhrase,
      network: _network
    };
  } catch (error) {
    console.error('Error generating HD wallet:', error);
    throw error;
  }
}

// Derive wallet from seed phrase (real implementation)
export async function deriveWalletFromSeed(seedPhrase: string, network: string = 'ethereum'): Promise<{
  privateKey: string;
  publicKey: string;
  address: string;
  seedPhrase: string;
  derivationPath: string;
}> {
  if (!validateBIP39SeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  const derivationPath = getDerivationPath(network);
  const wallet = await generateHDWallet(seedPhrase, network, derivationPath);
  
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
    seedPhrase: wallet.mnemonic,
    derivationPath: wallet.derivationPath
  };
}

// Derive account with specific derivation path (for adding new accounts)
export async function deriveAccountFromSeed(seedPhrase: string, derivationPath: string, network?: string): Promise<{
  privateKey: string;
  publicKey: string;
  address: string;
  derivationPath: string;
}> {
  if (!validateBIP39SeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  try {
    // Import the network-specific address generation utility
    const { generateNetworkAddress } = await import('./network-address-utils');
    
    // Determine network type from derivation path or network parameter
    const isEVMNetwork = derivationPath.includes("44'/60'") || 
                        derivationPath.includes("44'/195'") || // TRON
                        derivationPath.includes("44'/60'/0'/0/");

    if (isEVMNetwork) {
      // Use ethers.js HDNodeWallet for EVM networks
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      const hdNode = ethers.HDNodeWallet.fromSeed(seed);
      const derivedWallet = hdNode.derivePath(derivationPath);
      
      return {
        privateKey: derivedWallet.privateKey,
        publicKey: derivedWallet.publicKey,
        address: derivedWallet.address,
        derivationPath
      };
    } else {
      // For non-EVM networks, use proper address generation
      const networkAddress = await generateNetworkAddress(seedPhrase, derivationPath, network || 'unknown');
      
      console.log(`🔧 Generated ${network || 'unknown'} address: ${networkAddress} (from path: ${derivationPath})`);
      
      // For Solana and other non-EVM networks, we need to generate the proper private key
      if (network === 'solana') {
        // For Solana, we need to use the BIP32 derivation to get the proper private key
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const { BIP32Factory } = await import('bip32');
        const ecc = await import('tiny-secp256k1');
        const bip32 = BIP32Factory(ecc);
        const root = bip32.fromSeed(seed);
        const child = root.derivePath(derivationPath);
        
        // Use the first 32 bytes as the Solana private key seed
        const solanaSeed = child.privateKey.slice(0, 32);
        const { Keypair } = await import('@solana/web3.js');
        const keypair = Keypair.fromSeed(solanaSeed);
        
        return {
          privateKey: Buffer.from(keypair.secretKey).toString('base64'),
          publicKey: keypair.publicKey.toString(),
          address: networkAddress,
          derivationPath
        };
      } else {
        // For other non-EVM networks, use ethers for now
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        const derivedWallet = hdNode.derivePath(derivationPath);
        
        return {
          privateKey: derivedWallet.privateKey,
          publicKey: derivedWallet.publicKey,
          address: networkAddress,
          derivationPath
        };
      }
    }
  } catch (error) {
    console.error('Failed to derive account:', error);
    throw new Error(`Failed to derive account: ${error}`);
  }
}

// Generate multiple accounts from seed phrase
export async function generateMultipleAccounts(
  seedPhrase: string, 
  network: string, 
  count: number = 5
): Promise<WalletAccount[]> {
  if (!validateBIP39SeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  try {
    const accounts: WalletAccount[] = [];
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    
    for (let i = 0; i < count; i++) {
      const derivationPath = getDerivationPath(network, i);
      const derivedWallet = hdNode.derivePath(derivationPath);
      
      accounts.push({
        address: derivedWallet.address,
        privateKey: derivedWallet.privateKey,
        publicKey: derivedWallet.publicKey,
        derivationPath,
        network
      });
    }
    
    return accounts;
  } catch (error) {
    console.error('Failed to generate multiple accounts:', error);
    throw new Error(`Failed to generate accounts: ${error}`);
  }
}

// Import wallet from private key
export function importWalletFromPrivateKey(
  privateKey: string,
  network: string = 'ethereum'
): HDWallet {
  // Normalize private key format
  let normalizedKey = privateKey.trim();
  if (!normalizedKey.startsWith('0x')) {
    normalizedKey = '0x' + normalizedKey;
  }
  
  // Validate length (should be 66 characters with 0x prefix)
  if (normalizedKey.length !== 66) {
    throw new Error('Invalid private key format: must be 64 characters (with or without 0x prefix)');
  }

  // Real implementation: derive public key and address from private key
  try {
    const wallet = new ethers.Wallet(normalizedKey);
    // Derive public key from private key
    const publicKey = ethers.SigningKey.computePublicKey(normalizedKey);
    const address = wallet.address;

    return {
      seedPhrase: '', // Not available when importing from private key
      privateKey: normalizedKey,
      publicKey,
      address,
      network,
      derivationPath: 'm/44\'/60\'/0\'/0/0',
      mnemonic: '' // Not available when importing from private key
    };
  } catch {
    throw new Error('Invalid private key');
  }
}

// Import wallet from seed phrase
export async function importWalletFromSeedPhrase(
  seedPhrase: string,
  network: string = 'ethereum'
): Promise<HDWallet> {
  return await generateHDWallet(seedPhrase, network);
}

// Validate private key
export function validatePrivateKey(privateKey: string): boolean {
  try {
    // Check if it's a valid private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Try to create a wallet from the private key
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

// Derive address from private key
export function deriveAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    throw new Error('Invalid private key');
  }
}

// Generate random private key
export function generateRandomPrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

// Convert seed phrase to private key (real implementation)
export async function seedPhraseToPrivateKey(seedPhrase: string, derivationPath: string = "m/44'/60'/0'/0/0"): Promise<string> {
  if (!validateBIP39SeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  const derivedWallet = await generateHDWallet(seedPhrase, 'ethereum', derivationPath);
  return derivedWallet.privateKey;
}

// Get derivation path for different networks (real implementation)
export function getDerivationPath(network: string, accountIndex: number = 0): string {
  const paths: Record<string, string> = {
    ethereum: `m/44'/60'/0'/0/${accountIndex}`,
    bsc: `m/44'/60'/0'/0/${accountIndex}`,
    polygon: `m/44'/60'/0'/0/${accountIndex}`,
    avalanche: `m/44'/60'/0'/0/${accountIndex}`,
    arbitrum: `m/44'/60'/0'/0/${accountIndex}`,
    optimism: `m/44'/60'/0'/0/${accountIndex}`,
    bitcoin: `m/44'/0'/0'/0/${accountIndex}`,
    litecoin: `m/44'/2'/0'/0/${accountIndex}`,
    solana: `m/44'/501'/0'/0'/${accountIndex}`,
    tron: `m/44'/195'/0'/0/${accountIndex}`,
    xrp: `m/44'/144'/0'/0/${accountIndex}`,
    ton: `m/44'/396'/0'/0/${accountIndex}`
  };
  
  return paths[network] || paths.ethereum;
}

// Generate wallet for specific network (real implementation)
export async function generateNetworkWallet(
  seedPhrase: string,
  network: string,
  accountIndex: number = 0
): Promise<HDWallet> {
  if (!validateBIP39SeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  const derivationPath = getDerivationPath(network, accountIndex);
  return await generateHDWallet(seedPhrase, network, derivationPath);
}

// Export wallet data (for backup)
export function exportWalletData(wallet: HDWallet): string {
  const data = {
    seedPhrase: wallet.seedPhrase,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
    network: wallet.network,
    derivationPath: wallet.derivationPath,
    timestamp: Date.now()
  };
  
  return JSON.stringify(data, null, 2);
}

// Import wallet data (from backup)
export function importWalletData(data: string): HDWallet {
  try {
    const walletData = JSON.parse(data);
    
    if (!walletData.address || !walletData.network) {
      throw new Error('Invalid wallet data format');
    }
    
    return {
      seedPhrase: walletData.seedPhrase || '',
      privateKey: walletData.privateKey || '',
      publicKey: walletData.publicKey || '',
      address: walletData.address,
      network: walletData.network,
      derivationPath: walletData.derivationPath || 'm/44\'/60\'/0\'/0/0',
      mnemonic: walletData.mnemonic || ''
    };
  } catch (error) {
    throw new Error('Failed to parse wallet data');
  }
} 

// Validate derivation path
export function validateDerivationPath(path: string): boolean {
  try {
    // Basic validation for BIP44 derivation paths
    const parts = path.split('/');
    if (parts[0] !== 'm') return false;
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.endsWith("'")) {
        const num = parseInt(part.slice(0, -1));
        if (isNaN(num) || num < 0 || num > 0x7fffffff) return false;
      } else {
        const num = parseInt(part);
        if (isNaN(num) || num < 0 || num > 0x7fffffff) return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Get network from derivation path
export function getNetworkFromPath(derivationPath: string): string {
  const parts = derivationPath.split('/');
  if (parts.length < 3) return 'ethereum';
  
  const coinType = parseInt(parts[2].replace("'", ""));
  
  const networkMap: Record<number, string> = {
    0: 'bitcoin',
    2: 'litecoin',
    60: 'ethereum',
    144: 'xrp',
    195: 'tron',
    396: 'ton',
    501: 'solana'
  };
  
  return networkMap[coinType] || 'ethereum';
} 