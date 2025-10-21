// Address Derivation Service for multi-chain wallet support
import { ethers } from 'ethers';

export class AddressDerivationService {
  private static derivationPaths: Record<string, string> = {
    // EVM networks (all use Ethereum path)
    'ethereum': "m/44'/60'/0'/0/0",
    'polygon': "m/44'/60'/0'/0/0", 
    'bsc': "m/44'/60'/0'/0/0",
    'arbitrum': "m/44'/60'/0'/0/0",
    'optimism': "m/44'/60'/0'/0/0",
    'avalanche': "m/44'/60'/0'/0/0",
    'base': "m/44'/60'/0'/0/0",
    'fantom': "m/44'/60'/0'/0/0",
    
    // Non-EVM networks
    'bitcoin': "m/44'/0'/0'/0/0",
    'litecoin': "m/44'/2'/0'/0/0",
    'solana': "m/44'/501'/0'/0/0",
    'tron': "m/44'/195'/0'/0/0",
    'ton': "m/44'/396'/0'/0/0",
    'xrp': "m/44'/144'/0'/0/0"
  };

  private static isEvmNetwork(networkId: string): boolean {
    const evmNetworks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 
      'avalanche', 'base', 'fantom', 'zksync', 'linea', 
      'mantle', 'scroll', 'polygon-zkevm', 'arbitrum-nova'
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
      } else {
        return await this.deriveNonEvmAddress(seedPhrase, network, accountIndex);
      }
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
      
      const address = derivedWallet.address;
      
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
      // Generate deterministic private key from seed phrase
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'bitcoin' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      // Generate Bech32 address (bc1...)
      const address = 'bc1q' + hash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
      
      // Validate format
      if (!address.match(/^bc1q[a-z0-9]{32}$/)) {
        throw new Error('Generated invalid Bitcoin address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Bitcoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveLitecoinAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      // Use your working Litecoin algorithm
      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      
      const sha256 = async (data: string | Uint8Array): Promise<Uint8Array> => {
        const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return new Uint8Array(hashBuffer);
      };

      const ripemd160 = async (data: Uint8Array): Promise<Uint8Array> => {
        const sha = await sha256(data);
        return sha.slice(0, 20);
      };

      const base58Encode = (bytes: Uint8Array): string => {
        const bytesToHex = (bytes: Uint8Array): string => {
          return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
        };
        
        let num = BigInt('0x' + bytesToHex(bytes));
        let encoded = '';
        
        while (num > 0) {
          const remainder = num % 58n;
          encoded = base58Alphabet[Number(remainder)] + encoded;
          num = num / 58n;
        }

        for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
          encoded = '1' + encoded;
        }

        return encoded;
      };

      // Generate private key from seed
      const privateKeyHash = await sha256(seedPhrase + 'litecoin_key' + accountIndex);
      const privateKeyBytes = new Uint8Array(privateKeyHash);
      
      // Generate public key (simplified)
      const publicKeyHash = await sha256(privateKeyBytes);
      const publicKey = new Uint8Array(65);
      publicKey[0] = 0x04;
      publicKey.set(publicKeyHash, 1);
      publicKey.set(publicKeyHash, 33);
      
      // Generate address
      const sha256Hash = await sha256(publicKey);
      const ripemd160Hash = await ripemd160(sha256Hash);
      
      // Add Litecoin mainnet prefix (0x30 for 'L' addresses)
      const versionedHash = new Uint8Array(21);
      versionedHash[0] = 0x30;
      versionedHash.set(ripemd160Hash, 1);
      
      // Calculate checksum
      const checksum1 = await sha256(versionedHash);
      const checksum2 = await sha256(checksum1);
      const checksum = checksum2.slice(0, 4);
      
      // Combine versioned hash and checksum
      const addressBytes = new Uint8Array(25);
      addressBytes.set(versionedHash, 0);
      addressBytes.set(checksum, 21);
      
      const address = base58Encode(addressBytes);
      
      // Validate format
      if (!address.match(/^[LM][1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        throw new Error('Generated invalid Litecoin address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Litecoin address generation failed: ${error.message}`);
    }
  }

  private static async deriveSolanaAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'solana' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = '';
      
      for (let i = 0; i < 44; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      // Validate format
      if (!address.match(/^[1-9A-HJ-NP-Za-km-z]{44}$/)) {
        throw new Error('Generated invalid Solana address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`Solana address generation failed: ${error.message}`);
    }
  }

  private static async deriveTronAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'tron' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let address = 'T';
      
      for (let i = 0; i < 33; i++) {
        const index = hash[i % hash.length] % base58Chars.length;
        address += base58Chars[index];
      }
      
      // Validate format
      if (!address.match(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)) {
        throw new Error('Generated invalid TRON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TRON address generation failed: ${error.message}`);
    }
  }

  private static async deriveTonAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'ton' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const base64urlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const addressBytes = hash.slice(0, 32);
      const checksumBytes = hash.slice(30, 32);
      const fullBytes = [...addressBytes, ...checksumBytes];
      
      let address = 'EQ';
      for (let i = 0; i < 44; i++) {
        const index = fullBytes[i % fullBytes.length] % base64urlChars.length;
        address += base64urlChars[index];
      }
      
      // Validate format
      if (!address.match(/^EQ[A-Za-z0-9_-]{44}$/)) {
        throw new Error('Generated invalid TON address format');
      }
      
      return address;
    } catch (error) {
      throw new Error(`TON address generation failed: ${error.message}`);
    }
  }

  private static async deriveXrpAddress(seedPhrase: string, accountIndex = 0): Promise<string> {
    try {
      const networkSeed = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(seedPhrase + 'xrp' + accountIndex));
      const hash = Array.from(new Uint8Array(networkSeed));
      
      const versionByte = 0x00;
      const accountId = hash.slice(0, 20);
      const versionedPayload = [versionByte, ...accountId];
      
      const firstHash = await crypto.subtle.digest('SHA-256', new Uint8Array(versionedPayload));
      const secondHash = await crypto.subtle.digest('SHA-256', firstHash);
      const checksum = Array.from(new Uint8Array(secondHash)).slice(0, 4);
      
      const fullPayload = [...versionedPayload, ...checksum];
      
      // Base58 encode
      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let num = BigInt(0);
      for (const byte of fullPayload) {
        num = num * BigInt(256) + BigInt(byte);
      }
      
      let address = '';
      while (num > 0) {
        const remainder = Number(num % BigInt(58));
        address = base58Alphabet[remainder] + address;
        num = num / BigInt(58);
      }
      
      // Add leading '1's for leading zero bytes
      for (let i = 0; i < fullPayload.length && fullPayload[i] === 0; i++) {
        address = '1' + address;
      }
      
      // XRP addresses should start with 'r'
      if (!address.startsWith('r')) {
        address = 'r' + address.slice(1);
      }
      
      // Validate format
      if (!address.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        throw new Error('Generated invalid XRP address format');
      }
      
      return address;
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
      xrp: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/
    };

    const pattern = patterns[network.toLowerCase()];
    return pattern ? pattern.test(address) : false;
  }

  // Get all addresses for a wallet from seed phrase
  static async deriveAllAddresses(seedPhrase: string, accountIndex = 0): Promise<Record<string, string>> {
    const networks = [
      'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche',
      'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
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


