import { ethers } from 'ethers';
import type { ResolvedAddress } from '../types';

/**
 * ENS and Unstoppable Domains resolver
 * Resolves human-readable names to blockchain addresses
 */

export class ENSResolver {
  private provider: ethers.Provider;
  private unstoppableDomainsContract: ethers.Contract | null = null;

  // Unstoppable Domains registry on Polygon
  private static readonly UD_REGISTRY_ADDRESS = '0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f';
  
  // Supported Unstoppable Domains TLDs
  private static readonly UD_TLDS = [
    '.crypto', '.nft', '.x', '.wallet', '.bitcoin', 
    '.dao', '.888', '.zil', '.blockchain'
  ];

  constructor(rpcUrl: string = 'https://eth.llamarpc.com') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.initializeUDContract();
  }

  /**
   * Initialize Unstoppable Domains contract
   */
  private async initializeUDContract() {
    const abi = [
      'function get(string calldata key, uint256 tokenId) external view returns (string memory)',
      'function getMany(string[] calldata keys, uint256 tokenId) external view returns (string[] memory)',
      'function namehash(string[] calldata labels) external pure returns (uint256)',
    ];

    try {
      const polygonProvider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      this.unstoppableDomainsContract = new ethers.Contract(
        ENSResolver.UD_REGISTRY_ADDRESS,
        abi,
        polygonProvider
      );
    } catch (error) {
      console.error('Failed to initialize Unstoppable Domains contract:', error);
    }
  }

  /**
   * Resolve any supported domain name to address
   */
  async resolve(nameOrAddress: string): Promise<ResolvedAddress | null> {
    // Check if it's already an address
    if (ethers.isAddress(nameOrAddress)) {
      return {
        address: nameOrAddress,
        domain: nameOrAddress,
        type: 'address',
      };
    }

    // Try ENS first
    if (nameOrAddress.endsWith('.eth')) {
      return await this.resolveENS(nameOrAddress);
    }

    // Try Unstoppable Domains
    for (const tld of ENSResolver.UD_TLDS) {
      if (nameOrAddress.endsWith(tld)) {
        return await this.resolveUnstoppable(nameOrAddress);
      }
    }

    return null;
  }

  /**
   * Resolve ENS name to address
   */
  async resolveENS(name: string): Promise<ResolvedAddress | null> {
    try {
      const address = await this.provider.resolveName(name);
      
      if (!address) return null;

      // Try to get avatar
      let avatar: string | undefined;
      try {
        const resolver = await this.provider.getResolver(name);
        if (resolver) {
          avatar = await resolver.getAvatar();
        }
      } catch {
        // Avatar fetch failed, continue without it
      }

      return {
        address,
        domain: name,
        type: 'ens',
        avatar: avatar?.url,
      };
    } catch (error) {
      console.error('ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Resolve Unstoppable Domain to address
   */
  async resolveUnstoppable(domain: string): Promise<ResolvedAddress | null> {
    if (!this.unstoppableDomainsContract) {
      console.error('Unstoppable Domains contract not initialized');
      return null;
    }

    try {
      // Get domain token ID (namehash)
      const labels = domain.split('.').reverse();
      const tokenId = await this.unstoppableDomainsContract.namehash(labels);

      // Get ETH address
      const address = await this.unstoppableDomainsContract.get(
        'crypto.ETH.address',
        tokenId
      );

      if (!address || address === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return {
        address,
        domain,
        type: 'unstoppable',
      };
    } catch (error) {
      console.error('Unstoppable Domains resolution failed:', error);
      return null;
    }
  }

  /**
   * Reverse resolve address to ENS name
   */
  async reverseResolve(address: string): Promise<string | null> {
    try {
      const name = await this.provider.lookupAddress(address);
      return name;
    } catch (error) {
      console.error('Reverse ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Get ENS avatar for address
   */
  async getAvatar(addressOrName: string): Promise<string | null> {
    try {
      let name: string | null;

      if (ethers.isAddress(addressOrName)) {
        name = await this.reverseResolve(addressOrName);
      } else {
        name = addressOrName;
      }

      if (!name) return null;

      const resolver = await this.provider.getResolver(name);
      if (!resolver) return null;

      const avatar = await resolver.getAvatar();
      return avatar?.url || null;
    } catch (error) {
      console.error('Avatar fetch failed:', error);
      return null;
    }
  }

  /**
   * Get ENS text records
   */
  async getTextRecords(name: string, keys: string[]): Promise<Record<string, string>> {
    try {
      const resolver = await this.provider.getResolver(name);
      if (!resolver) return {};

      const records: Record<string, string> = {};
      
      for (const key of keys) {
        try {
          const value = await resolver.getText(key);
          if (value) {
            records[key] = value;
          }
        } catch {
          // Skip failed records
        }
      }

      return records;
    } catch (error) {
      console.error('Text records fetch failed:', error);
      return {};
    }
  }

  /**
   * Check if string is a valid domain name
   */
  static isDomainName(str: string): boolean {
    if (ethers.isAddress(str)) return false;

    // Check for .eth
    if (str.endsWith('.eth')) return true;

    // Check for Unstoppable Domains TLDs
    return ENSResolver.UD_TLDS.some(tld => str.endsWith(tld));
  }

  /**
   * Batch resolve multiple names
   */
  async batchResolve(names: string[]): Promise<Map<string, ResolvedAddress | null>> {
    const results = new Map<string, ResolvedAddress | null>();

    await Promise.all(
      names.map(async (name) => {
        const resolved = await this.resolve(name);
        results.set(name, resolved);
      })
    );

    return results;
  }
}

/**
 * Global ENS resolver instance
 */
let globalResolver: ENSResolver | null = null;

export function getENSResolver(rpcUrl?: string): ENSResolver {
  if (!globalResolver || rpcUrl) {
    globalResolver = new ENSResolver(rpcUrl);
  }
  return globalResolver;
}