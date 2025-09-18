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

      // 2. Fallback to local registration
      const localResult = await this.registerLocal(ucpiData);
      if (localResult.success) {
        const fullUCPIData: UCPIData = {
          ...ucpiData,
          isGlobal: false,
          isLocal: true,
          lastUpdated: new Date().toISOString()
        };

        await this.saveLocalUCPI(fullUCPIData);
        return localResult;
      }

      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: 'Both global and local registration failed'
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
      // Check if it's an ENS domain (.eth)
      if (!ucpiId.endsWith('.eth')) {
        // For non-ENS domains, check if they're available locally
        return { available: true };
      }

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
      // For ENS domains, we can't register them directly (requires ETH and gas fees)
      // Instead, we'll provide instructions to the user
      if (ucpiData.id.endsWith('.eth')) {
        return {
          success: false,
          isGlobal: false,
          isLocal: false,
          error: 'ENS registration requires ETH and gas fees. Please register manually at ens.domains or use a local UCPI ID.'
        };
      }

      // Real UCPI global registration requires actual blockchain transaction
      throw new Error('UCPI global registration requires real blockchain integration with ENS or similar registry. No mock data provided.');

    } catch (error) {
      console.warn('Global UCPI registration failed, falling back to local:', error);
      return {
        success: false,
        isGlobal: false,
        isLocal: false,
        error: error instanceof Error ? error.message : 'Global registration failed'
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

      // Real UCPI local registration requires actual blockchain transaction
      throw new Error('UCPI local registration requires real blockchain integration. No mock data provided.');

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
}

// Export singleton instance
export const ucpiService = new UCPService();
