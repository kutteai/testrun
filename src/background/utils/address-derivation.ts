 
 
 
import { ethers } from 'ethers';
import { SecureAddressDerivation } from '../../utils/secure-address-derivation';

class AddressDerivationService {
  private static derivationPaths: Record<string, string> = {
    // EVM networks (all use Ethereum path)
    ethereum: "m/44'/60'/0'/0/0",
    polygon: "m/44'/60'/0'/0/0",
    bsc: "m/44'/60'/0'/0/0",
    arbitrum: "m/44'/60'/0'/0/0",
    optimism: "m/44'/60'/0'/0/0",
    avalanche: "m/44'/60'/0'/0/0",
    base: "m/44'/60'/0'/0/0",
    fantom: "m/44'/60'/0'/0/0",

    // Non-EVM networks
    bitcoin: "m/44'/0'/0'/0/0",
    litecoin: "m/44'/2'/0'/0/0",
    solana: "m/44'/501'/0'/0/0",
    tron: "m/44'/195'/0'/0/0",
    ton: "m/44'/396'/0'/0/0",
    xrp: "m/44'/144'/0'/0/0",
  };

  private static isEvmNetwork(networkId: string): boolean {
    const evmNetworks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism',
      'avalanche', 'base', 'fantom', 'zksync', 'linea',
      'mantle', 'scroll', 'polygon-zkevm', 'arbitrum-nova',
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
      }
      return await this.deriveNonEvmAddress(seedPhrase, network, accountIndex);
    } catch (error) {
      // eslint-disable-next-line no-console
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

      const { address } = derivedWallet;

      // Validate address format
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Generated invalid address format');
      }

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
      // Use secure BIP-39/BIP-44 derivation for Bitcoin
      const result = await SecureAddressDerivation.generateBitcoinAddress(seedPhrase, accountIndex);
      return result.address;
    } catch (error) {
      throw new Error(`Bitcoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveLitecoinAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Litecoin
      const result = await SecureAddressDerivation.generateLitecoinAddress(seedPhrase, accountIndex);
      return result.address;
    } catch (error) {
      throw new Error(`Litecoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveSolanaAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Solana
      const result = await SecureAddressDerivation.generateSolanaAddress(seedPhrase, accountIndex);
      return result.address;
    } catch (error) {
      throw new Error(`Solana address generation failed: ${error.message}`);
    }
  }

  private static async deriveTronAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for TRON
      const result = await SecureAddressDerivation.generateTronAddress(seedPhrase, accountIndex);
      return result.address;
    } catch (error) {
      throw new Error(`TRON address generation failed: ${error.message}`);
    }
  }

  private static async deriveTonAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for TON
      const result = await SecureAddressDerivation.generateTonAddress(seedPhrase, accountIndex);
      return result.address;
    } catch (error) {
      throw new Error(`TON address generation failed: ${error.message}`);
    }
  }

  private static async deriveXrpAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for XRP
      const result = await SecureAddressDerivation.generateXrpAddress(seedPhrase, accountIndex);
      return result.address;
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
      ton: /^(EQ|UQ)[A-Za-z0-9_-]{44,48}$/,
      xrp: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/,
    };

    const pattern = patterns[network.toLowerCase()];
    return pattern ? pattern.test(address) : false;
  }

  // Get all addresses for a wallet from seed phrase
  static async deriveAllAddresses(seedPhrase: string, accountIndex = 0): Promise<Record<string, string>> {
    const networks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche',
      'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp',
    ];

    const addresses: Record<string, string> = {};

    for (const network of networks) {
      try {
        addresses[network] = await this.deriveAddress(seedPhrase, network, accountIndex);
      } catch (error) {
        // eslint-disable-next-line no-console
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

export { AddressDerivationService };
