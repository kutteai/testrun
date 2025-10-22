import { mnemonicToWalletKey } from '@ton/crypto';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { HDNodeWallet } from 'ethers';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as crypto from 'crypto';
const { createHash } = crypto;

// Standard BIP44 derivation paths
export const DERIVATION_PATHS: Record<string, string> = {
  ethereum: "m/44'/60'/0'/0/0",
  bitcoin: "m/44'/0'/0'/0/0",
  litecoin: "m/44'/2'/0'/0/0",
  solana: "m/44'/501'/0'/0'",
  tron: "m/44'/195'/0'/0/0",
  ton: "m/44'/607'/0'/0/0", // Changed from 396 to 607 for consistency if needed
  xrp: "m/44'/144'/0'/0/0",
  bsc: "m/44'/60'/0'/0/0", // BSC uses same derivation as Ethereum
  polygon: "m/44'/60'/0'/0/0", // Polygon uses same derivation as Ethereum
  avalanche: "m/44'/60'/0'/0/0", // Avalanche uses same derivation as Ethereum
  arbitrum: "m/44'/60'/0'/0/0", // Arbitrum uses same derivation as Ethereum
  optimism: "m/44'/60'/0'/0/0", // Optimism uses same derivation as Ethereum
  base: "m/44'/60'/0'/0/0", // Base uses same derivation as Ethereum
  fantom: "m/44'/60'/0'/0/0", // Fantom uses same derivation as Ethereum
};

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
    // eslint-disable-next-line no-console
    console.error('Error generating Bitcoin address:', error);
    throw new Error(`Failed to generate Bitcoin address: ${error.message}`);
  }
}

// Litecoin address generation
export function generateLitecoinAddress(seedPhrase: string, derivationPath: string): string {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);

    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);

    // Validate we have a valid public key
    if (!child.publicKey || child.publicKey.length !== 33) {
      throw new Error('Invalid public key derived from seed');
    }

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
      pubkey: Buffer.from(child.publicKey),
      network: litecoinNetwork
    });

    if (!address) {
      throw new Error('Failed to generate Litecoin address');
    }

    // Validate the address format
    if (address.length < 26 || address.length > 35 || !address.startsWith('L')) {
      throw new Error(`Invalid Litecoin address format: ${address}`);
    }

    return address;

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Litecoin generation error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Litecoin address generation failed: ${error.message}`);
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

    if (!privateKeyBytes) {
      throw new Error('Could not derive private key for Solana');
    }
    
    // Use the first 32 bytes of the private key as the seed for Solana keypair
    const solanaSeed = privateKeyBytes.slice(0, 32);
    const keypair = Keypair.fromSeed(solanaSeed);
    
    return keypair.publicKey.toBase58();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating Solana address:', error);
    throw new Error(`Failed to generate Solana address: ${error.message}`);
  }
}

// XRP custom base58 alphabet
const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

// XRP address generation
export function generateXRPAddress(seedPhrase: string, derivationPath: string): string {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);

    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);
    
    // 5. Get public key (33 bytes for secp256k1)
    const publicKey = child.publicKey;

    // 6. Create Account ID: SHA256 -> RIPEMD160
    const sha256Hash = crypto.createHash('sha256').update(publicKey).digest();
    const accountId = crypto.createHash('ripemd160').update(sha256Hash).digest();

    // 7. Create address payload: version (0x00) + account ID
    const payload = Buffer.concat([Buffer.from([0x00]), accountId]);

    // 8. Calculate checksum (first 4 bytes of double SHA256)
    const checksum1 = crypto.createHash('sha256').update(payload).digest();
    const checksum2 = crypto.createHash('sha256').update(checksum1).digest();
    const checksum = checksum2.slice(0, 4);

    // 9. Combine payload + checksum
    const addressBytes = Buffer.concat([payload, checksum]);

    // 10. Encode using XRP's custom base58
    const xrpAddress = encodeXRPBase58(addressBytes);

    // 11. Validate XRP address format
    if (xrpAddress.length < 25 || xrpAddress.length > 34 || !xrpAddress.startsWith('r')) {
      throw new Error('Generated address does not match XRP format');
    }
    
    return xrpAddress;
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error generating XRP address:', error);
    // eslint-disable-next-line no-console
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
  let result = 'r'.repeat(leadingZeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    result += XRP_ALPHABET[digits[i]];
  }
  
  return result;
}

// TON address generation
export async function generateTONAddress(seedPhrase: string, derivationPath: string): Promise<string> {
  try {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);

    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(derivationPath);

    // 5. Generate 32-byte account ID from public key
    const accountId = createHash('sha256').update(child.publicKey).digest();

    // 6. Create TON address structure
    const workchain = 0; // Masterchain = -1, Basechain = 0
    const flags = 0x11; // Bounceable + TestnetOnly flags (adjust as needed)
    
    // 7. Combine workchain + account_id
    const addressData = Buffer.alloc(36);
    addressData.writeUInt8(flags, 0);
    addressData.writeInt8(workchain, 1);
    accountId.copy(addressData, 2);

    // 8. Calculate CRC16 checksum for TON
    const crc16 = calculateTONCRC16(addressData.slice(0, 34));
    addressData.writeUInt16BE(crc16, 34);
    
    // 9. Encode to base64url
    const base64 = addressData.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64;
    
    } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error generating TON address:', error);
    // eslint-disable-next-line no-console
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
    const addressBytes = Buffer.concat([Buffer.from([0x41]), ripemd160]); // Add TRON version byte (0x41)
    const checksum = crypto.createHash('sha256').update(addressBytes).digest();
    const checksum2 = crypto.createHash('sha256').update(checksum).digest();
    const finalBytes = Buffer.concat([addressBytes, checksum2.slice(0, 4)]);

    const tronAddress = bs58.encode(finalBytes);

    // TRON addresses always start with 'T'
    if (!tronAddress.startsWith('T')) {
      throw new Error('Generated TRON address does not start with T');
    }

    // Ensure it is proper length
    if (tronAddress.length < 25 || tronAddress.length > 34) {
      throw new Error(`Generated TRON address has invalid length: ${tronAddress.length}`);
    }

    return tronAddress;

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating TRON address:', error);
    throw new Error(`Failed to generate TRON address: ${error.message}`);
  }
}

// Main function to generate network-specific addresses
export async function generateNetworkAddress(seedPhrase: string, derivationPath: string, network: string): Promise<string> {


  // Validate inputs
  if (!seedPhrase || !derivationPath || !network) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid parameters:', { seedPhrase: !!seedPhrase, derivationPath: !!derivationPath, network });
    throw new Error('Missing required parameters for address generation');
  }
  
  // Clean and validate seed phrase first
  let cleaned: string;
  try {
    // eslint-disable-next-line no-console
    console.log('Raw seed phrase first 50 chars:', JSON.stringify(seedPhrase.substring(0, 50)));
    
    cleaned = seedPhrase.trim().replace(/\s+/g, ' ').toLowerCase();
    const words = cleaned.split(' ');


    // eslint-disable-next-line no-console
    console.log('First 3 words:', words.slice(0, 3));
    // eslint-disable-next-line no-console
    console.log('Last 3 words:', words.slice(-3));
    
    // Validate BIP39 before proceeding

    const isValid = bip39.validateMnemonic(cleaned);

    if (!isValid) {
      // Check each word individually
      const wordlist = bip39.wordlists.english;
      const invalidWords = words.filter(word => !wordlist.includes(word));

      throw new Error(`Invalid BIP39 words: ${invalidWords.join(', ')}`);
    }
    
  } catch (validationError) {
    // eslint-disable-next-line no-console
    console.error('Seed phrase validation failed:', validationError);
    throw new Error(`Seed phrase validation failed: ${validationError.message}`);
  }
  
  const networkId = network.toLowerCase();

  // Get the derivation path for the specific network
  const networkDerivationPath = DERIVATION_PATHS[networkId] || derivationPath; // Fallback to provided path if not found

  // Now call the specific network function
  try {
    switch (networkId) {
        case 'bitcoin': {
        return generateBitcoinAddress(cleaned, networkDerivationPath);
        }
        case 'litecoin': {
        return generateLitecoinAddress(cleaned, networkDerivationPath);
        }
        case 'solana': {
        return generateSolanaAddress(cleaned, networkDerivationPath);
        }
      case 'xrp': {
        return generateXRPAddress(cleaned, networkDerivationPath);
        }
      case 'ton': {
        return await generateTONAddress(cleaned, networkDerivationPath);
        }
        case 'tron': {
        return generateTRONAddress(cleaned, networkDerivationPath);
        }
        default:
        // For EVM networks, use the standard ethers.js address

        try {
          const seed = bip39.mnemonicToSeedSync(cleaned);
          const hdNode = HDNodeWallet.fromSeed(seed);
          const derivedWallet = hdNode.derivePath(networkDerivationPath); // Use network-specific derivation path

          return derivedWallet.address;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error generating ${network} address:`, error);
          throw new Error(`Failed to generate ${network} address: ${error.message}`);
        }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Failed to generate ${network} address:`, error);
    // eslint-disable-next-line no-console
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

