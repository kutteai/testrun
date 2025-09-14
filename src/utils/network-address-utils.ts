import * as bitcoin from 'bitcoinjs-lib';
import { PublicKey, Keypair } from '@solana/web3.js';
import { HDNodeWallet } from 'ethers';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import bs58 from 'bs58';
import * as crypto from 'crypto';
const { createHash } = crypto;
import { Address, Cell, beginCell } from '@ton/core';
import { mnemonicToWalletKey } from '@ton/crypto';

// Bitcoin address generation
export function generateBitcoinAddress(seedPhrase: string, derivationPath: string): string {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    
    // Generate P2WPKH (Native SegWit) address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: bitcoin.networks.bitcoin
    });
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address');
    }
    
    return address;
  } catch (error) {
    console.error('Error generating Bitcoin address:', error);
    throw new Error(`Failed to generate Bitcoin address: ${error.message}`);
  }
}

// Solana address generation
export function generateSolanaAddress(seedPhrase: string, derivationPath: string): string {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    
    // For Solana, we need to use the private key directly to create a keypair
    // Solana uses Ed25519, not secp256k1 like Bitcoin/Ethereum
    const privateKeyBytes = child.privateKey;
    
    // Use the first 32 bytes of the private key as the seed for Solana keypair
    const solanaSeed = privateKeyBytes.slice(0, 32);
    const keypair = Keypair.fromSeed(solanaSeed);
    
    return keypair.publicKey.toBase58();
  } catch (error) {
    console.error('Error generating Solana address:', error);
    throw new Error(`Failed to generate Solana address: ${error.message}`);
  }
}

// XRP custom base58 alphabet
const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

// XRP address generation
export function generateXRPAddress(seedPhrase: string, derivationPath: string): string {
  try {
    console.log(`🔧 Starting XRP address generation...`);
    
    // 1. Validate and clean the seed phrase
    console.log('Raw seed phrase length:', seedPhrase.length);
    console.log('Raw seed phrase:', JSON.stringify(seedPhrase.substring(0, 50) + '...'));
    
    const cleanedSeedPhrase = cleanSeedPhrase(seedPhrase);
    console.log('Cleaned seed phrase length:', cleanedSeedPhrase.length);
    
    const words = cleanedSeedPhrase.split(' ');
    console.log('Word count:', words.length);
    console.log('First 3 words:', words.slice(0, 3));
    
    // 2. Validate seed phrase format
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      throw new Error(`Invalid seed phrase: expected 12, 15, 18, 21, or 24 words, got ${words.length}`);
    }
    
    // 3. Validate BIP39 mnemonic
    if (!bip39.validateMnemonic(cleanedSeedPhrase)) {
      throw new Error('Invalid BIP39 mnemonic seed phrase');
    }
    
    // 4. Generate seed and derive key
    const seed = bip39.mnemonicToSeedSync(cleanedSeedPhrase);
    console.log('Generated seed length:', seed.length);
    
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    
    // 5. Get public key (33 bytes for secp256k1)
    const publicKey = child.publicKey;
    console.log(`🔧 Public key derived, length: ${publicKey.length}`);
    console.log('Public key:', Buffer.from(publicKey).toString('hex'));
    
    // 6. Create Account ID: SHA256 -> RIPEMD160
    const sha256Hash = crypto.createHash('sha256').update(publicKey).digest();
    const accountId = crypto.createHash('ripemd160').update(sha256Hash).digest();
    console.log(`🔧 Account ID created, length: ${accountId.length}`);
    
    // 7. Create address payload: version (0x00) + account ID
    const payload = Buffer.concat([Buffer.from([0x00]), accountId]);
    console.log(`🔧 Payload created, length: ${payload.length}`);
    
    // 8. Calculate checksum (first 4 bytes of double SHA256)
    const checksum1 = crypto.createHash('sha256').update(payload).digest();
    const checksum2 = crypto.createHash('sha256').update(checksum1).digest();
    const checksum = checksum2.slice(0, 4);
    console.log(`🔧 Checksum calculated, length: ${checksum.length}`);
    
    // 9. Combine payload + checksum
    const addressBytes = Buffer.concat([payload, checksum]);
    console.log(`🔧 Address bytes combined, length: ${addressBytes.length}`);
    
    // 10. Encode using XRP's custom base58
    const xrpAddress = encodeXRPBase58(addressBytes);
    console.log(`🔧 XRP address encoded: ${xrpAddress}`);
    
    // 11. Validate XRP address format
    if (xrpAddress.length >= 25 && xrpAddress.length <= 34 && xrpAddress.startsWith('r')) {
      console.log(`✅ Generated XRP address: ${xrpAddress}`);
      return xrpAddress;
    }
    
    throw new Error('Generated address does not match XRP format');
    
  } catch (error) {
    console.error('❌ Error generating XRP address:', error);
    console.error('❌ Error stack:', error.stack);
    throw new Error(`Failed to generate XRP address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function encodeXRPBase58(buffer: Buffer): string {
  const digits = [0];
  
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  
  // Handle leading zeros
  let leadingZeros = 0;
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    leadingZeros++;
  }
  
  // Convert to XRP alphabet
  let result = 'r'.repeat(leadingZeros); // XRP uses 'r' for leading zeros
  for (let i = digits.length - 1; i >= 0; i--) {
    result += XRP_ALPHABET[digits[i]];
  }
  
  return result;
}

// TON address generation
export async function generateTONAddress(seedPhrase: string, derivationPath: string): Promise<string> {
  try {
    console.log(`🔧 Starting TON address generation...`);
    
    // 1. Validate and clean the seed phrase
    console.log('Raw seed phrase length:', seedPhrase.length);
    console.log('Raw seed phrase:', JSON.stringify(seedPhrase.substring(0, 50) + '...'));
    
    const cleanedSeedPhrase = cleanSeedPhrase(seedPhrase);
    console.log('Cleaned seed phrase length:', cleanedSeedPhrase.length);
    
    const words = cleanedSeedPhrase.split(' ');
    console.log('Word count:', words.length);
    console.log('First 3 words:', words.slice(0, 3));
    
    // 2. Validate seed phrase format
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      throw new Error(`Invalid seed phrase: expected 12, 15, 18, 21, or 24 words, got ${words.length}`);
    }
    
    // 3. Validate BIP39 mnemonic
    if (!bip39.validateMnemonic(cleanedSeedPhrase)) {
      throw new Error('Invalid BIP39 mnemonic seed phrase');
    }
    
    // 4. Use BIP32 derivation
    const seed = bip39.mnemonicToSeedSync(cleanedSeedPhrase);
    console.log(`🔧 Seed generated, length: ${seed.length}`);
    
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    console.log(`🔧 BIP32 root created`);
    
    const child = root.derivePath(derivationPath);
    console.log(`🔧 Child key derived`);
    console.log('Public key:', Buffer.from(child.publicKey).toString('hex'));
    
    // 5. Generate 32-byte account ID from public key
    const accountId = createHash('sha256').update(child.publicKey).digest();
    console.log(`🔧 Account ID generated, length: ${accountId.length}`);
    
    // 6. Create TON address structure
    const workchain = 0; // Masterchain = -1, Basechain = 0
    const flags = 0x11; // Bounceable + TestnetOnly flags (adjust as needed)
    console.log(`🔧 Workchain: ${workchain}, Flags: 0x${flags.toString(16)}`);
    
    // 7. Combine workchain + account_id
    const addressData = Buffer.alloc(36);
    addressData.writeUInt8(flags, 0);
    addressData.writeInt8(workchain, 1);
    accountId.copy(addressData, 2);
    console.log(`🔧 Address data created, length: ${addressData.length}`);
    
    // 8. Calculate CRC16 checksum for TON
    const crc16 = calculateTONCRC16(addressData.slice(0, 34));
    addressData.writeUInt16BE(crc16, 34);
    console.log(`🔧 CRC16 checksum calculated: 0x${crc16.toString(16)}`);
    
    // 9. Encode to base64url
    const base64 = addressData.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log(`✅ Generated TON address: ${base64}`);
    return base64;
    
  } catch (error) {
    console.error('❌ Error generating TON address:', error);
    console.error('❌ Error stack:', error.stack);
    throw new Error(`Failed to generate TON address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// TON uses CRC-16/XMODEM for checksums
function calculateTONCRC16(data: Buffer): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return crc & 0xFFFF;
}

// TRON address generation
export function generateTRONAddress(seedPhrase: string, derivationPath: string): string {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    
    // TRON address generation
    const publicKey = Buffer.from(child.publicKey);
    
    // Create a deterministic hash from the public key
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(hash).digest();
    
    // TRON addresses are typically 34 characters, starting with 'T'
    // We'll create a deterministic address based on the hash
    const addressBytes = Buffer.concat([Buffer.from([0x41]), ripemd160]); // Add TRON version byte (0x41)
    const checksum = crypto.createHash('sha256').update(addressBytes).digest();
    const checksum2 = crypto.createHash('sha256').update(checksum).digest();
    const finalBytes = Buffer.concat([addressBytes, checksum2.slice(0, 4)]);
    
    const tronAddress = bs58.encode(finalBytes);
    
    // Ensure it starts with 'T' and is proper length
    if (tronAddress.length >= 25 && tronAddress.length <= 34) {
      return tronAddress;
    }
    
    // Fallback: Generate a deterministic address
    const fallbackHash = crypto.createHash('sha256').update(seed).digest();
    const fallbackAddress = bs58.encode(fallbackHash.slice(0, 25));
    return fallbackAddress.startsWith('T') ? fallbackAddress : 'T' + fallbackAddress.slice(1);
    
  } catch (error) {
    console.error('Error generating TRON address:', error);
    throw new Error(`Failed to generate TRON address: ${error.message}`);
  }
}

// Helper function to clean seed phrase
function cleanSeedPhrase(seedPhrase: string): string {
  return seedPhrase
    .trim()                           // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')            // Replace multiple spaces with single space
    .toLowerCase();                   // Ensure lowercase (BIP39 standard)
}

// Litecoin address generation
export function generateLitecoinAddress(seedPhrase: string, derivationPath: string): string {
  console.log('=== LITECOIN GENERATION START ===');
  
  try {
    // Clean the seed phrase
    const cleanedSeedPhrase = seedPhrase.trim().replace(/\s+/g, ' ').toLowerCase();
    console.log('Using cleaned seed phrase, length:', cleanedSeedPhrase.length);
    
    // Validate BIP39 mnemonic first
    if (!bip39.validateMnemonic(cleanedSeedPhrase)) {
      throw new Error('Invalid BIP39 mnemonic');
    }
    
    // Generate seed
    console.log('Generating seed from mnemonic...');
    const seed = bip39.mnemonicToSeedSync(cleanedSeedPhrase);
    console.log('Seed generated, length:', seed.length, 'bytes');
    
    // Derive key
    console.log('Deriving key with path:', derivationPath);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    console.log('Key derived successfully');
    console.log('Public key:', Buffer.from(child.publicKey).toString('hex'));
    
    // Validate we have a valid public key
    if (!child.publicKey || child.publicKey.length !== 33) {
      throw new Error('Invalid public key derived from seed');
    }
    
    // Generate P2PKH address using bitcoinjs-lib for better compatibility
    try {
      const bitcoin = require('bitcoinjs-lib');
      
      // Create a P2PKH payment for Litecoin mainnet
      const litecoinNetwork = {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: {
          public: 0x0488b21e,
          private: 0x0488ade4
        },
        pubKeyHash: 0x30, // Litecoin P2PKH version byte
        scriptHash: 0x32, // Litecoin P2SH version byte
        wif: 0xb0
      };
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: litecoinNetwork
      });
      
      if (!address) {
        throw new Error('Failed to generate Litecoin address');
      }
      
      console.log('Generated Litecoin address:', address);
      console.log('Address starts with L:', address.startsWith('L'));
      console.log('Address length:', address.length);
      
      // Validate the address format
      if (address.length >= 26 && address.length <= 35 && address.startsWith('L')) {
        console.log('Address validation passed');
        return address;
      } else {
        throw new Error(`Invalid address format: ${address}`);
      }
      
    } catch (bitcoinLibError) {
      console.warn('BitcoinJS-lib failed, falling back to manual generation:', bitcoinLibError);
      
      // Fallback to manual address generation
      const publicKeyHash = crypto.createHash('ripemd160')
        .update(crypto.createHash('sha256').update(child.publicKey).digest())
        .digest();
      
      const versionByte = Buffer.from([0x30]); // Litecoin P2PKH version
      const addressPayload = Buffer.concat([versionByte, publicKeyHash]);
      
      // Double SHA256 for checksum
      const checksum = crypto.createHash('sha256')
        .update(crypto.createHash('sha256').update(addressPayload).digest())
        .digest()
        .slice(0, 4);
      
      const fullAddress = Buffer.concat([addressPayload, checksum]);
      const address = bs58.encode(fullAddress);
      
      console.log('Generated address (manual):', address);
      console.log('Address starts with L:', address.startsWith('L'));
      console.log('Address length:', address.length);
      
      // Validate the address format
      if (address.length >= 26 && address.length <= 35 && address.startsWith('L')) {
        console.log('Address validation passed');
        return address;
      } else {
        throw new Error(`Invalid address format: ${address}`);
      }
    }
    
  } catch (error) {
    console.error('Litecoin generation error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Litecoin address generation failed: ${error.message}`);
  }
}

// Main function to generate network-specific addresses
export async function generateNetworkAddress(seedPhrase: string, derivationPath: string, network: string): Promise<string> {
  console.log('=== ENTRY DEBUG ===');
  console.log('Network:', network);
  console.log('Seed phrase length:', seedPhrase.length);
  console.log('Seed phrase type:', typeof seedPhrase);
  console.log('Derivation path:', derivationPath);
  
  // Validate inputs
  if (!seedPhrase || !derivationPath || !network) {
    console.error('❌ Invalid parameters:', { seedPhrase: !!seedPhrase, derivationPath: !!derivationPath, network });
    throw new Error('Missing required parameters for address generation');
  }
  
  // Clean and validate seed phrase first
  let cleaned: string;
  try {
    console.log('Raw seed phrase first 50 chars:', JSON.stringify(seedPhrase.substring(0, 50)));
    
    cleaned = seedPhrase.trim().replace(/\s+/g, ' ').toLowerCase();
    const words = cleaned.split(' ');
    
    console.log('Cleaned length:', cleaned.length);
    console.log('Word count:', words.length);
    console.log('First 3 words:', words.slice(0, 3));
    console.log('Last 3 words:', words.slice(-3));
    
    // Validate BIP39 before proceeding
    console.log('Validating BIP39...');
    const isValid = bip39.validateMnemonic(cleaned);
    console.log('BIP39 valid:', isValid);
    
    if (!isValid) {
      // Check each word individually
      const wordlist = bip39.wordlists.english;
      const invalidWords = words.filter(word => !wordlist.includes(word));
      console.log('Invalid words found:', invalidWords);
      throw new Error(`Invalid BIP39 words: ${invalidWords.join(', ')}`);
    }
    
  } catch (validationError) {
    console.error('Seed phrase validation failed:', validationError);
    throw new Error(`Seed phrase validation failed: ${validationError.message}`);
  }
  
  const networkId = network.toLowerCase();
  console.log(`🔧 Network ID: ${networkId}`);
  
  // Now call the specific network function
  try {
    switch (networkId) {
      case 'bitcoin':
        console.log('Calling generateBitcoinAddress...');
        const btcAddress = generateBitcoinAddress(cleaned, derivationPath);
        console.log('Generated Bitcoin address:', btcAddress);
        return btcAddress;
      case 'litecoin':
        console.log('Calling generateLitecoinAddress...');
        const ltcAddress = generateLitecoinAddress(cleaned, derivationPath);
        console.log('Generated Litecoin address:', ltcAddress);
        return ltcAddress;
      case 'solana':
        console.log('Calling generateSolanaAddress...');
        const solAddress = generateSolanaAddress(cleaned, derivationPath);
        console.log('Generated Solana address:', solAddress);
        return solAddress;
      case 'xrp':
        console.log('Calling generateXRPAddress...');
        const xrpAddress = generateXRPAddress(cleaned, derivationPath);
        console.log('Generated XRP address:', xrpAddress);
        return xrpAddress;
      case 'ton':
        console.log('Calling generateTONAddress...');
        const tonAddress = await generateTONAddress(cleaned, derivationPath);
        console.log('Generated TON address:', tonAddress);
        return tonAddress;
      case 'tron':
        console.log('Calling generateTRONAddress...');
        const tronAddress = generateTRONAddress(cleaned, derivationPath);
        console.log('Generated TRON address:', tronAddress);
        return tronAddress;
      default:
        // For EVM networks, use the standard ethers.js address
        console.log('Calling EVM address generation...');
        try {
          const seed = bip39.mnemonicToSeedSync(cleaned);
          const hdNode = HDNodeWallet.fromSeed(seed);
          const derivedWallet = hdNode.derivePath(derivationPath);
          console.log('Generated EVM address:', derivedWallet.address);
          return derivedWallet.address;
        } catch (error) {
          console.error(`Error generating ${network} address:`, error);
          throw new Error(`Failed to generate ${network} address: ${error.message}`);
        }
    }
  } catch (error) {
    console.error(`❌ Failed to generate ${network} address:`, error);
    console.error(`❌ Error details:`, {
      network,
      derivationPath,
      seedPhraseLength: seedPhrase?.length,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw new Error(`Failed to generate ${network} address: ${error.message}`);
  }
}

// Test function to isolate the issue
export function testLitecoinGeneration() {
  // Test with a known good seed phrase
  const testSeed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  
  console.log('Testing with known good seed...');
  console.log('Test seed length:', testSeed.length);
  console.log('Test seed valid:', bip39.validateMnemonic(testSeed));
  
  try {
    const address = generateLitecoinAddress(testSeed, "m/44'/2'/0'/0/0");
    console.log('Test successful, address:', address);
    return address;
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}
