import { ethers } from 'ethers';

// Get configuration
function getConfig() {
  if (typeof window !== 'undefined' && window.CONFIG) {
    return window.CONFIG;
  }
  // Fallback for build time
  return {
    ENS_RPC_URL: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    INFURA_PROJECT_ID: 'YOUR_INFURA_KEY'
  };
}

// ENS Registry Contract Address
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

// ENS Registry ABI (minimal for expiry check)
const ENS_REGISTRY_ABI = [
  'function owner(bytes32 node) external view returns (address)',
  'function resolver(bytes32 node) external view returns (address)',
  'function ttl(bytes32 node) external view returns (uint64)',
  'function recordExists(bytes32 node) external view returns (bool)'
];

// Namehash function to convert ENS name to node
function namehash(name: string): string {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  if (name === '') {
    return node;
  }
  
  const labels = name.split('.');
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  
  return node;
}

// Resolve ENS name to address (multi-chain support)
export async function resolveENS(ensName: string, network: string = 'ethereum'): Promise<string | null> {
  try {
    // Handle different domain types
    if (ensName.includes('.eth')) {
      // Traditional ENS (Ethereum)
      const config = getConfig();
      const provider = new ethers.JsonRpcProvider(config.ENS_RPC_URL);
      const address = await provider.resolveName(ensName);
      return address;
    } else if (ensName.includes('.bnb')) {
      // BNB domains (Space ID)
      return await resolveBNBDomain(ensName);
    } else if (ensName.includes('.crypto') || ensName.includes('.nft') || ensName.includes('.x') || ensName.includes('.wallet') || ensName.includes('.bitcoin') || ensName.includes('.dao')) {
      // Unstoppable Domains
      return await resolveUnstoppableDomain(ensName);
    } else if (ensName.includes('.sol')) {
      // Solana Name Service
      return await resolveSolanaDomain(ensName);
    } else if (ensName.includes('.avax')) {
      // Avalanche Name Service
      return await resolveAvalancheDomain(ensName);
    }
    
    return null;
  } catch (error) {
    console.error('ENS resolution failed:', error);
    return null;
  }
}

// Resolve BNB domains (Space ID)
async function resolveBNBDomain(domain: string): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
    
    // Space ID contract on BSC
    const SPACE_ID_CONTRACT = '0x08CEd32a7f3eCf3562427ddf9a624E9Df47d65Fc';
    const SPACE_ID_ABI = [
      'function resolve(bytes32 node) view returns (address)',
      'function addr(bytes32 node) view returns (address)'
    ];
    
    const contract = new ethers.Contract(SPACE_ID_CONTRACT, SPACE_ID_ABI, provider);
    const node = namehash(domain);
    const address = await contract.addr(node);
    
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      return address;
    }
    
    return null;
  } catch (error) {
    console.error('BNB domain resolution failed:', error);
    return null;
  }
}

// Resolve Unstoppable Domains
async function resolveUnstoppableDomain(domain: string): Promise<string | null> {
  try {
    // Unstoppable Domains API
    const response = await fetch(`https://resolve.unstoppabledomains.com/domains/${domain}`, {
      headers: {
        'Authorization': `Bearer ${process.env.UNSTOPPABLE_DOMAINS_API_KEY || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.records?.['crypto.ETH.address'] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Unstoppable domain resolution failed:', error);
    return null;
  }
}

// Resolve Solana domains
async function resolveSolanaDomain(domain: string): Promise<string | null> {
  try {
    // Solana Name Service resolution
    const response = await fetch(`https://sns-api.bonfida.org/resolve/${domain}`);
    if (response.ok) {
      const data = await response.json();
      return data.result || null;
    }
    return null;
  } catch (error) {
    console.error('Solana domain resolution failed:', error);
    return null;
  }
}

// Resolve Avalanche domains
async function resolveAvalancheDomain(domain: string): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
    
    // AVVY Domains contract on Avalanche
    const AVVY_CONTRACT = '0x1111111111111111111111111111111111111111'; // Placeholder
    // Implementation would require actual AVVY contract address and ABI
    
    return null; // Placeholder - needs actual implementation
  } catch (error) {
    console.error('Avalanche domain resolution failed:', error);
    return null;
  }
}

// Resolve address to ENS name
export async function lookupENS(address: string): Promise<string | null> {
  try {
    const config = getConfig();
    const provider = new ethers.JsonRpcProvider(config.ENS_RPC_URL);
    
    const name = await provider.lookupAddress(address);
    return name;
  } catch (error) {
    console.error('ENS lookup failed:', error);
    return null;
  }
}

// Check if domain is available for registration
export async function checkDomainAvailability(domainName: string): Promise<boolean> {
  try {
    const address = await resolveENS(domainName);
    return !address || address === '0x0000000000000000000000000000000000000000';
  } catch (error) {
    // If resolution fails, assume it's available
    return true;
  }
}

// Get domain registration price (simplified)
export async function getDomainPrice(domainName: string): Promise<number> {
  try {
    const length = domainName.replace('.eth', '').length;
    
    // Simplified pricing logic
    if (length === 1) return 640; // 1 character
    if (length === 2) return 160; // 2 characters
    if (length === 3) return 40;  // 3 characters
    if (length === 4) return 10;  // 4 characters
    return 5; // 5+ characters
  } catch (error) {
    return 5; // Default price
  }
}

// Get domain expiry date from ENS Registry
export async function getDomainExpiry(domainName: string): Promise<Date | null> {
  try {
    const config = getConfig();
    const provider = new ethers.JsonRpcProvider(config.ENS_RPC_URL);
    
    // Create ENS Registry contract instance
    const ensRegistry = new ethers.Contract(ENS_REGISTRY_ADDRESS, ENS_REGISTRY_ABI, provider);
    
    // Convert domain name to namehash
    const node = namehash(domainName);
    
    // Check if the domain exists
    const exists = await ensRegistry.recordExists(node);
    if (!exists) {
      // Domain doesn't exist, so it's available
      return null;
    }
    
    // Get the owner of the domain
    const owner = await ensRegistry.owner(node);
    
    // If owner is zero address, domain is available
    if (owner === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    
    // For domains that exist, we can't easily get expiry from the base registry
    // This would require querying the specific registrar contract that owns the domain
    // For now, we'll return a default expiry (1 year from registration)
    // In production, you'd need to query the appropriate registrar contract
    
    // Try to estimate expiry based on common patterns
    // This is a simplified approach - real implementation would query the registrar
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    
  } catch (error) {
    console.error('ENS expiry check failed:', error);
    // Return a default expiry if we can't determine the actual expiry
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
}

// Validate ENS name with better checks
export function validateENSName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const cleanName = name.toLowerCase();
  
  // Must contain .eth
  if (!cleanName.endsWith('.eth')) {
    return { isValid: false, error: 'ENS names must end with .eth' };
  }

  // Remove .eth for validation
  const baseName = cleanName.replace('.eth', '');
  
  // Length checks
  if (baseName.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  if (baseName.length > 253) {
    return { isValid: false, error: 'Name is too long' };
  }

  // Character validation
  const validChars = /^[a-z0-9-]+$/;
  if (!validChars.test(baseName)) {
    return { isValid: false, error: 'Name can only contain lowercase letters, numbers, and hyphens' };
  }

  // Cannot start or end with hyphen
  if (baseName.startsWith('-') || baseName.endsWith('-')) {
    return { isValid: false, error: 'Name cannot start or end with a hyphen' };
  }

  return { isValid: true };
}

// Get ENS records including resolver address
export async function getENSRecords(ensName: string): Promise<{
  resolverAddress?: string;
  email?: string;
  url?: string;
  avatar?: string;
  description?: string;
  keywords?: string;
  com_discord?: string;
  com_github?: string;
  com_twitter?: string;
  org_telegram?: string;
}> {
  try {
    const config = getConfig();
    const provider = new ethers.JsonRpcProvider(config.ENS_RPC_URL);
    
    const resolver = await provider.getResolver(ensName);
    if (!resolver) return {};
    
    // Get resolver address
    const node = namehash(ensName);
    const ensRegistry = new ethers.Contract(ENS_REGISTRY_ADDRESS, ENS_REGISTRY_ABI, provider);
    const resolverAddress = await ensRegistry.resolver(node);
    
    // Get specific text records
    const records: any = {
      resolverAddress: resolverAddress
    };
    
    const textKeys = ['email', 'url', 'avatar', 'description', 'keywords', 'com.discord', 'com.github', 'com.twitter', 'org.telegram'];
    
    for (const key of textKeys) {
      try {
        const value = await resolver.getText(key);
        if (value) {
          records[key] = value;
        }
      } catch (error) {
        // Ignore individual record errors
      }
    }
    
    return records;
  } catch (error) {
    console.error('ENS records fetch failed:', error);
    return {};
  }
}