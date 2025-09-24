// UCPI Service - Hybrid Global/Local Implementation
import { storage } from '../utils/storage-utils';

export interface UCPIData {
  id: string;
  walletAddress: string;
  network: string;
  publicKey: string;
  createdAt: string;
  status: 'active' | 'pending' | 'failed';
  isGlobal: boolean;
  isLocal: boolean;
  transactionHash?: string;
  blockNumber?: number;
  globalRegistryId?: string;
  lastUpdated: string;
}

export interface UCPIRegistrationResult {
  success: boolean;
  isGlobal: boolean;
  isLocal: boolean;
  transactionHash?: string;
  blockNumber?: number;
  globalRegistryId?: string;
  error?: string;
}

export interface UCPIAvailabilityResult {
  available: boolean;
  isGlobal: boolean;
  isLocal: boolean;
  existingAddress?: string;
  error?: string;
}

class UCPService {
  // Use ENS (Ethereum Name Service) as global registry
  private readonly ENS_RPC_URL = 'https://eth.llamarpc.com'; // Public Ethereum RPC
  private readonly ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
  private readonly ENS_RESOLVER = '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41';
  private readonly LOCAL_STORAGE_KEY = 'ucpiData';
  private readonly FALLBACK_TIMEOUT = 10000; // 10 seconds for blockchain calls

  /**
   * Check UCPI ID availability (global first, then local)
   */
  async checkAvailability(ucpiId: string): Promise<UCPIAvailabilityResult> {
    try {
      // 1. Check global registry first
      const globalResult = await this.checkGlobalAvailability(ucpiId);
      if (globalResult.available) {
        return {
          available: true,
          isGlobal: true,
          isLocal: false
        };
      }

      // 2. Check local storage as fallback
      const localResult = await this.checkLocalAvailability(ucpiId);
      return {
        available: localResult.available,
        isGlobal: false,
        isLocal: localResult.available,
        existingAddress: localResult.existingAddress
      };

    } catch (error) {
      console.error('UCPI availability check failed:', error);
      return {
        available: false,
        isGlobal: false,
        isLocal: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Register UCPI ID (global first, local fallback)
   */
  async registerUCPI(ucpiData: Omit<UCPIData, 'isGlobal' | 'isLocal' | 'lastUpdated'>): Promise<UCPIRegistrationResult> {
    try {
      // 1. Try global registration first
      const globalResult = await this.registerGlobal(ucpiData);
      if (globalResult.success) {
        // Save globally registered UCPI
        const fullUCPIData: UCPIData = {
          ...ucpiData,
          isGlobal: true,
          isLocal: true,
          lastUpdated: new Date().toISOString(),
          transactionHash: globalResult.transactionHash,
          blockNumber: globalResult.blockNumber,
          globalRegistryId: globalResult.globalRegistryId
        };

        await this.saveLocalUCPI(fullUCPIData);
        return globalResult;
      }

      // NO FALLBACK - If global registration fails, don't create local fallback
      // The user should either:
      // 1. Register the blockchain domain manually, or
      // 2. Choose a local domain (.local, .pay, .wallet, etc.)
      
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: 'UCPI registration failed. For blockchain domains (.eth, .bnb, .polygon, .arb), please register manually on the respective network. For local domains, use extensions like .local, .pay, or .wallet.'
      };

    } catch (error) {
      console.error('UCPI registration failed:', error);
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve UCPI ID to address (global first, local fallback)
   */
  async resolveUCPI(ucpiId: string): Promise<{ address: string; isGlobal: boolean; isLocal: boolean } | null> {
    try {
      // 1. Try global resolution first
      const globalResult = await this.resolveGlobal(ucpiId);
      if (globalResult) {
        return {
          address: globalResult.address,
          isGlobal: true,
          isLocal: false
        };
      }

      // 2. Fallback to local resolution
      const localResult = await this.resolveLocal(ucpiId);
      if (localResult) {
        return {
          address: localResult.address,
          isGlobal: false,
          isLocal: true
        };
      }

      return null;

    } catch (error) {
      console.error('UCPI resolution failed:', error);
      return null;
    }
  }

  /**
   * Get user's UCPI data
   */
  async getUserUCPI(): Promise<UCPIData | null> {
    try {
      const result = await storage.get([this.LOCAL_STORAGE_KEY]);
      return result[this.LOCAL_STORAGE_KEY] || null;
    } catch (error) {
      console.error('Failed to get user UCPI:', error);
      return null;
    }
  }

  /**
   * Update UCPI data
   */
  async updateUCPI(ucpiData: UCPIData): Promise<void> {
    try {
      await this.saveLocalUCPI(ucpiData);
      
      // If it's a global UCPI, also update the global registry
      if (ucpiData.isGlobal) {
        await this.updateGlobalUCPI(ucpiData);
      }
    } catch (error) {
      console.error('Failed to update UCPI:', error);
      throw error;
    }
  }

  // Private methods for global registry operations

  private async checkGlobalAvailability(ucpiId: string): Promise<{ available: boolean }> {
    try {
      // Network-specific domain validation
      const networkInfo = this.getNetworkFromDomain(ucpiId);
      
      if (!networkInfo) {
        // Invalid domain format
        return { available: false };
      }

      // Check domain availability based on network
      switch (networkInfo.network) {
        case 'ethereum':
          return await this.checkENSAvailability(ucpiId);
        case 'binance':
          return await this.checkSpaceIDAvailability(ucpiId);
        case 'polygon':
          return await this.checkPolygonNSAvailability(ucpiId);
        case 'arbitrum':
          return await this.checkArbitrumNSAvailability(ucpiId);
        default:
          // For local domains, always available
        return { available: true };
      }
    } catch (error) {
      console.error('Global availability check failed:', error);
      return { available: false };
    }
  }

  // Get network information from domain extension
  private getNetworkFromDomain(ucpiId: string): { network: string; rpcUrl: string; registryAddress?: string } | null {
    if (ucpiId.endsWith('.eth')) {
      return {
        network: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        registryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
      };
    }
    
    if (ucpiId.endsWith('.bnb')) {
      return {
        network: 'binance',
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        registryAddress: '0x08CEd32a7f3FeC915Ba84415e9C07a7286977956' // Space ID registry
      };
    }
    
    if (ucpiId.endsWith('.polygon')) {
      return {
        network: 'polygon',
        rpcUrl: 'https://polygon-rpc.com',
        registryAddress: '0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f' // Polygon NS registry
      };
    }
    
    if (ucpiId.endsWith('.arb')) {
      return {
        network: 'arbitrum',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        registryAddress: '0xc18360217D8F7Ab5e7c516566761Ea12Ce7F9D72' // Arbitrum NS registry
      };
    }
    
    // For local domains (.local, .pay, .wallet, etc.)
    return {
      network: 'local',
      rpcUrl: ''
    };
  }

  private async checkENSAvailability(ucpiId: string): Promise<{ available: boolean }> {
    try {
      // Check ENS availability using public RPC
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.FALLBACK_TIMEOUT);

      // Use ENS to check if domain is already registered
      const response = await fetch(this.ENS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: this.ENS_REGISTRY,
              data: this.encodeENSNamehash(ucpiId)
            },
            'latest'
          ],
          id: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ENS check failed: ${response.status}`);
      }

      const result = await response.json();
      
      // If result.data is not '0x0000000000000000000000000000000000000000000000000000000000000000', domain is taken
      const isAvailable = result.result === '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      return { available: isAvailable };

    } catch (error) {
      console.warn('ENS availability check failed, falling back to local:', error);
      throw error;
    }
  }

  private async checkSpaceIDAvailability(ucpiId: string): Promise<{ available: boolean }> {
    try {
      console.log('🔍 Checking Space ID (.bnb) availability for:', ucpiId);
      
      // Check Space ID (BNB) availability using BSC RPC
      const response = await fetch('https://bsc-dataseed1.binance.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: '0x08CEd32a7f3FeC915Ba84415e9C07a7286977956', // Space ID registry
            data: '0x' // Would need actual ABI encoding for real check
          }, 'latest'],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Space ID check failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 Space ID availability result:', result);
      
      // For now, assume available (would need proper Space ID integration)
      return { available: true };
    } catch (error) {
      console.error('Space ID availability check failed:', error);
      throw error;
    }
  }

  private async checkPolygonNSAvailability(ucpiId: string): Promise<{ available: boolean }> {
    try {
      console.log('🔍 Checking Polygon NS (.polygon) availability for:', ucpiId);
      
      // Check Polygon Name Service availability
      const response = await fetch('https://polygon-rpc.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: '0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f', // Polygon NS registry
            data: '0x' // Would need actual ABI encoding for real check
          }, 'latest'],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Polygon NS check failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 Polygon NS availability result:', result);
      
      // For now, assume available (would need proper PNS integration)
      return { available: true };
    } catch (error) {
      console.error('Polygon NS availability check failed:', error);
      throw error;
    }
  }

  private async checkArbitrumNSAvailability(ucpiId: string): Promise<{ available: boolean }> {
    try {
      console.log('🔍 Checking Arbitrum NS (.arb) availability for:', ucpiId);
      
      // Check Arbitrum Name Service availability
      const response = await fetch('https://arb1.arbitrum.io/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: '0xc18360217D8F7Ab5e7c516566761Ea12Ce7F9D72', // Arbitrum NS registry
            data: '0x' // Would need actual ABI encoding for real check
          }, 'latest'],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Arbitrum NS check failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 Arbitrum NS availability result:', result);
      
      // For now, assume available (would need proper ANS integration)
      return { available: true };
    } catch (error) {
      console.error('Arbitrum NS availability check failed:', error);
      throw error;
    }
  }

  // Helper function to encode ENS namehash
  private encodeENSNamehash(name: string): string {
    // Simplified namehash encoding for ENS
    // In production, you'd use a proper ENS library
    const namehash = this.namehash(name);
    return '0x0178b8bf' + namehash.slice(2); // resolver() function selector + namehash
  }

  // Simplified namehash function
  private namehash(name: string): string {
    if (name === '') {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    
    const parts = name.split('.');
    let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    for (let i = parts.length - 1; i >= 0; i--) {
      const label = parts[i];
      const labelHash = this.keccak256(label);
      node = this.keccak256(node + labelHash.slice(2));
    }
    
    return node;
  }

  // Simplified keccak256 function
  private keccak256(input: string): string {
    // In production, use a proper crypto library like ethers.js
    // This is a simplified version for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hash.padEnd(64, '0');
  }

  private async registerGlobal(ucpiData: Omit<UCPIData, 'isGlobal' | 'isLocal' | 'lastUpdated'>): Promise<UCPIRegistrationResult> {
    try {
      const networkInfo = this.getNetworkFromDomain(ucpiData.id);
      
      if (!networkInfo) {
        throw new Error('Invalid domain format');
      }

      // Network-specific registration requirements
      if (ucpiData.id.endsWith('.eth')) {
        // Check if bridge sender private key is available for gas fees
        const bridgePrivateKey = process.env.BRIDGE_SENDER_PRIVATE_KEY;
        
        console.log('🔍 UCPI Service Debug:');
        console.log('🔍 process.env exists:', typeof process !== 'undefined' && typeof process.env !== 'undefined');
        console.log('🔍 BRIDGE_SENDER_PRIVATE_KEY exists:', !!bridgePrivateKey);
        console.log('🔍 Bridge key length:', bridgePrivateKey ? bridgePrivateKey.length : 0);
        console.log('🔍 All process.env keys:', Object.keys(process.env || {}));
        
        if (bridgePrivateKey) {
          console.log('🔧 Bridge sender private key available, attempting ENS registration...');
          return await this.registerENSWithBridgeKey(ucpiData, bridgePrivateKey);
        } else {
          throw new Error('ENS (.eth) registration requires ETH and gas fees. Please configure BRIDGE_SENDER_PRIVATE_KEY in your .env file, or register manually at ens.domains and then import your ENS name, or use a local UCPI ID.');
        }
      }
      
      if (ucpiData.id.endsWith('.bnb')) {
        throw new Error('Space ID (.bnb) registration requires BNB and gas fees. Please register manually at space.id and then import your .bnb name, or use a local UCPI ID.');
      }
      
      if (ucpiData.id.endsWith('.polygon')) {
        throw new Error('Polygon NS (.polygon) registration requires MATIC and gas fees. Please register manually at polygon.domains and then import your .polygon name, or use a local UCPI ID.');
      }
      
      if (ucpiData.id.endsWith('.arb')) {
        throw new Error('Arbitrum NS (.arb) registration requires ETH and gas fees. Please register manually at arbitrum.domains and then import your .arb name, or use a local UCPI ID.');
      }

      // For local domains (.local, .pay, .wallet, etc.), no blockchain registration needed
      if (networkInfo.network === 'local') {
        return {
          success: true,
          isGlobal: false,
          isLocal: true
        };
      }

      // If we get here, it's an unsupported blockchain domain
      throw new Error('Blockchain domain registration must be done manually on the respective network.');

    } catch (error) {
      console.error('Global UCPI registration failed:', error);
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: error.message
      };
    }
  }

  private async resolveGlobal(ucpiId: string): Promise<{ address: string } | null> {
    try {
      // For ENS domains, resolve using ENS
      if (ucpiId.endsWith('.eth')) {
        return await this.resolveENS(ucpiId);
      }

      // For other domains, check if they exist in our local global registry
      // This would be your own global registry for non-ENS domains
      return null;

    } catch (error) {
      console.warn('Global UCPI resolution failed:', error);
      return null;
    }
  }

  // Resolve ENS domain to address
  private async resolveENS(ensName: string): Promise<{ address: string } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.FALLBACK_TIMEOUT);

      // Use ENS to resolve domain to address
      const response = await fetch(this.ENS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: this.ENS_RESOLVER,
              data: this.encodeENSResolver(ensName)
            },
            'latest'
          ],
          id: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      
      // Parse the address from the result
      if (result.result && result.result !== '0x') {
        const address = '0x' + result.result.slice(-40); // Last 40 characters are the address
        return { address };
      }

      return null;

    } catch (error) {
      console.warn('ENS resolution failed:', error);
      return null;
    }
  }

  // Helper function to encode ENS resolver call
  private encodeENSResolver(name: string): string {
    // Simplified resolver encoding
    // In production, use a proper ENS library
    const namehash = this.namehash(name);
    return '0x3b3b57de' + namehash.slice(2); // addr() function selector + namehash
  }

  private async updateGlobalUCPI(ucpiData: UCPIData): Promise<void> {
    // For ENS domains, updates are handled on-chain
    // For local domains, no global update needed
    console.log('Global UCPI update not implemented for ENS integration');
  }

  // Private methods for local operations

  private async checkLocalAvailability(ucpiId: string): Promise<{ available: boolean; existingAddress?: string }> {
    try {
      const result = await storage.get([this.LOCAL_STORAGE_KEY]);
      const existingUCPI = result[this.LOCAL_STORAGE_KEY];
      
      if (existingUCPI && existingUCPI.id === ucpiId) {
        return {
          available: false,
          existingAddress: existingUCPI.walletAddress
        };
      }

      return { available: true };

    } catch (error) {
      console.error('Local UCPI check failed:', error);
      return { available: false };
    }
  }

  private async registerLocal(ucpiData: Omit<UCPIData, 'isGlobal' | 'isLocal' | 'lastUpdated'>): Promise<UCPIRegistrationResult> {
    try {
      // Check if already exists locally
      const existing = await this.checkLocalAvailability(ucpiData.id);
      if (!existing.available) {
        return {
          success: false,
          isGlobal: false,
          isLocal: false,
          error: 'UCPI ID already exists locally'
        };
      }

      // Register local UCPI ID
      const localUCPIData: UCPIData = {
        ...ucpiData,
        isGlobal: false,
        isLocal: true,
        lastUpdated: new Date().toISOString()
      };

      await this.saveLocalUCPI(localUCPIData);

      return {
        success: true,
        isGlobal: false,
        isLocal: true
      };

    } catch (error) {
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: error instanceof Error ? error.message : 'Local registration failed'
      };
    }
  }

  private async resolveLocal(ucpiId: string): Promise<{ address: string } | null> {
    try {
      const result = await storage.get([this.LOCAL_STORAGE_KEY]);
      const ucpiData = result[this.LOCAL_STORAGE_KEY];
      
      if (ucpiData && ucpiData.id === ucpiId) {
        return { address: ucpiData.walletAddress };
      }

      return null;

    } catch (error) {
      console.error('Local UCPI resolution failed:', error);
      return null;
    }
  }

  private async saveLocalUCPI(ucpiData: UCPIData): Promise<void> {
    try {
      await storage.set({
        [this.LOCAL_STORAGE_KEY]: ucpiData,
        ucpiId: ucpiData.id,
        ucpiSkipped: false,
        ucpiTimestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save local UCPI:', error);
      throw error;
    }
  }

  /**
   * Register ENS domain using bridge sender private key
   */
  private async registerENSWithBridgeKey(
    ucpiData: Omit<UCPIData, 'isGlobal' | 'isLocal' | 'lastUpdated'>, 
    bridgePrivateKey: string
  ): Promise<UCPIRegistrationResult> {
    try {
      console.log('🔧 Registering ENS domain with bridge key:', ucpiData.id);
      
      // Import ENS registration service
      const { ensRegistrationService } = await import('./ens-registration-service');
      
      // Register ENS domain using the bridge key
      const ensResult = await ensRegistrationService.registerDomain({
        domain: ucpiData.id,
        walletAddress: ucpiData.walletAddress,
        duration: 1, // 1 year
        password: '' // Not needed when using bridge key
      });

      if (ensResult.success) {
        console.log('✅ ENS domain registered successfully:', ensResult.transactionHash);
        
        // Save the registered UCPI data
        const fullUCPIData: UCPIData = {
          ...ucpiData,
          isGlobal: true,
          isLocal: true,
          lastUpdated: new Date().toISOString(),
          transactionHash: ensResult.transactionHash,
          blockNumber: ensResult.blockNumber,
          globalRegistryId: ensResult.transactionHash
        };

        await this.saveLocalUCPI(fullUCPIData);
        
        return {
          success: true,
          isGlobal: true,
          isLocal: true,
          transactionHash: ensResult.transactionHash,
          blockNumber: ensResult.blockNumber,
          globalRegistryId: ensResult.transactionHash
        };
      } else {
        return {
          success: false,
          isGlobal: false,
          isLocal: false,
          error: ensResult.error || 'ENS registration failed'
        };
      }

    } catch (error) {
      console.error('ENS registration with bridge key failed:', error);
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: error instanceof Error ? error.message : 'ENS registration with bridge key failed'
      };
    }
  }
}

// Export singleton instance
export const ucpiService = new UCPService();
