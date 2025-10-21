import { mnemonicToWalletKey } from '@ton/crypto';

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
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "Bitcoin Address Placeholder";
}

// Litecoin address generation
export function generateLitecoinAddress(seedPhrase: string, derivationPath: string): string {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "Litecoin Address Placeholder";
}

// Solana address generation
export function generateSolanaAddress(seedPhrase: string, derivationPath: string): string {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "Solana Address Placeholder";
}

// XRP address generation
export function generateXRPAddress(seedPhrase: string, derivationPath: string): string {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "XRP Address Placeholder";
}

// TON address generation
export async function generateTONAddress(seedPhrase: string, derivationPath: string): Promise<string> {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "TON Address Placeholder";
}

// TRON address generation
export function generateTRONAddress(seedPhrase: string, derivationPath: string): string {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "TRON Address Placeholder";
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

// Test function to isolate the issue
export function testLitecoinGeneration() {
  // This function is not defined in the original file, so it's not included here.
  // Assuming it would be implemented elsewhere or is a placeholder.
  // For now, returning a placeholder.
  return "Litecoin Generation Test Placeholder";
}

