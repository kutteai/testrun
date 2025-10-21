// Real-time gas price fetcher for multiple networks
// Uses external APIs to get accurate gas prices with no mock data fallbacks
import { getConfig } from './config-injector';

export interface GasPriceData {
  network: string;
  gasPrice: number; // in Gwei
  maxFeePerGas?: number; // in Gwei (EIP-1559)
  maxPriorityFeePerGas?: number; // in Gwei (EIP-1559)
  slow: number;
  standard: number;
  fast: number;
  source: string;
  timestamp: number;
}

export interface NetworkGasAPIs {
  name: string;
  rpcUrl: string;
  gasStationUrl?: string;
  apiKey?: string;
  chainId: number;
}

// Network-specific gas price APIs
const NETWORK_GAS_APIS: Record<string, NetworkGasAPIs> = {
  ethereum: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    gasStationUrl: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
    chainId: 1
  },
  bsc: {
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    gasStationUrl: 'https://api.bscscan.com/api?module=gastracker&action=gasoracle',
    chainId: 56
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    gasStationUrl: 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle',
    chainId: 137
  },
  avalanche: {
    name: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    gasStationUrl: 'https://api.snowtrace.io/api?module=gastracker&action=gasoracle',
    chainId: 43114
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    gasStationUrl: 'https://api.arbiscan.io/api?module=gastracker&action=gasoracle',
    chainId: 42161
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    gasStationUrl: 'https://api-optimistic.etherscan.io/api?module=gastracker&action=gasoracle',
    chainId: 10
  },
  base: {
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453
  },
  fantom: {
    name: 'Fantom',
    rpcUrl: 'https://rpc.ftm.tools',
    gasStationUrl: 'https://api.ftmscan.com/api?module=gastracker&action=gasoracle',
    chainId: 250
  }
};

export class RealTimeGasPriceService {
  private cache: Map<string, { data: GasPriceData; expiry: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  // Get real-time gas prices for a network
  async getGasPrices(network: string): Promise<GasPriceData> {
    // Check cache first
    const cached = this.cache.get(network);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const networkConfig = NETWORK_GAS_APIS[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}. Real gas price API integration required.`);
    }

    let gasPriceData: GasPriceData;

    try {
      // Method 1: Try gas station API first (most accurate)
      if (networkConfig.gasStationUrl) {
        gasPriceData = await this.fetchFromGasStation(network, networkConfig);
      } else {
        // Method 2: Fallback to RPC call
        gasPriceData = await this.fetchFromRPC(network, networkConfig);
      }

      // Cache the result
      this.cache.set(network, {
        data: gasPriceData,
        expiry: Date.now() + this.CACHE_DURATION
      });

      return gasPriceData;

    } catch (error) {
      // NO FALLBACK - throw error for real API integration
      throw new Error(`Failed to fetch real-time gas prices for ${network}: ${error.message}. Real gas price API integration required.`);
    }
  }

  // Fetch gas prices from network-specific gas station APIs
  private async fetchFromGasStation(network: string, config: NetworkGasAPIs): Promise<GasPriceData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(config.gasStationUrl!, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gas station API error: ${response.status}`);
      }

      const data = await response.json();

      // Parse response based on network
      let gasPriceData: GasPriceData;

      switch (network) {
        case 'ethereum':
          gasPriceData = this.parseEthereumGasData(data, network);
          break;
        case 'bsc':
          gasPriceData = this.parseBSCGasData(data, network);
          break;
        case 'polygon':
          gasPriceData = this.parsePolygonGasData(data, network);
          break;
        default:
          gasPriceData = this.parseGenericGasData(data, network);
      }

      return gasPriceData;

    } catch (error) {
      throw new Error(`Gas station API failed: ${error.message}`);
    }
  }

  // Fetch gas prices from RPC
  private async fetchFromRPC(network: string, config: NetworkGasAPIs): Promise<GasPriceData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const gasPriceWei = BigInt(data.result || '0x0');
      const gasPriceGwei = Number(gasPriceWei) / 1e9;

      return {
        network,
        gasPrice: gasPriceGwei,
        slow: gasPriceGwei * 0.8,
        standard: gasPriceGwei,
        fast: gasPriceGwei * 1.2,
        source: 'RPC',
        timestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`RPC gas price fetch failed: ${error.message}`);
    }
  }

  // Parse Ethereum gas station response
  private parseEthereumGasData(data: any, network: string): GasPriceData {
    if (data.status !== '1' || !data.result) {
      throw new Error('Invalid Ethereum gas station response');
    }

    const result = data.result;
    return {
      network,
      gasPrice: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      maxFeePerGas: parseFloat(result.suggestBaseFee || '0'),
      maxPriorityFeePerGas: 2, // Standard tip
      slow: parseFloat(result.SafeGasPrice || '0'),
      standard: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      fast: parseFloat(result.FastGasPrice || '0'),
      source: 'Etherscan Gas Tracker',
      timestamp: Date.now()
    };
  }

  // Parse BSC gas station response
  private parseBSCGasData(data: any, network: string): GasPriceData {
    if (data.status !== '1' || !data.result) {
      throw new Error('Invalid BSC gas station response');
    }

    const result = data.result;
    return {
      network,
      gasPrice: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      slow: parseFloat(result.SafeGasPrice || '0'),
      standard: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      fast: parseFloat(result.FastGasPrice || '0'),
      source: 'BSCScan Gas Tracker',
      timestamp: Date.now()
    };
  }

  // Parse Polygon gas station response
  private parsePolygonGasData(data: any, network: string): GasPriceData {
    if (data.status !== '1' || !data.result) {
      throw new Error('Invalid Polygon gas station response');
    }

    const result = data.result;
    return {
      network,
      gasPrice: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      slow: parseFloat(result.SafeGasPrice || '0'),
      standard: parseFloat(result.ProposeGasPrice || result.StandardGasPrice || '0'),
      fast: parseFloat(result.FastGasPrice || '0'),
      source: 'PolygonScan Gas Tracker',
      timestamp: Date.now()
    };
  }

  // Parse generic gas station response
  private parseGenericGasData(data: any, network: string): GasPriceData {
    // Try to parse common gas station formats
    const gasPrice = parseFloat(
      data.result?.ProposeGasPrice ||
      data.result?.StandardGasPrice ||
      data.result?.gasPrice ||
      data.gasPrice ||
      '0'
    );

    if (gasPrice === 0) {
      throw new Error('Could not parse gas price from response');
    }

    return {
      network,
      gasPrice,
      slow: gasPrice * 0.8,
      standard: gasPrice,
      fast: gasPrice * 1.2,
      source: 'Gas Station API',
      timestamp: Date.now()
    };
  }

  // Get supported networks
  getSupportedNetworks(): string[] {
    return Object.keys(NETWORK_GAS_APIS);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache status
  getCacheStatus(): Array<{ network: string; cached: boolean; age: number }> {
    const status: Array<{ network: string; cached: boolean; age: number }> = [];
    
    for (const network of this.getSupportedNetworks()) {
      const cached = this.cache.get(network);
      status.push({
        network,
        cached: !!cached && cached.expiry > Date.now(),
        age: cached ? Date.now() - (cached.expiry - this.CACHE_DURATION) : 0
      });
    }
    
    return status;
  }
}

// Export singleton instance
export const realTimeGasService = new RealTimeGasPriceService();

// Utility functions
export const gasUtils = {
  // Get real-time gas prices
  getRealTimeGasPrice: (network: string) => realTimeGasService.getGasPrices(network),
  
  // Get supported networks
  getSupportedNetworks: () => realTimeGasService.getSupportedNetworks(),
  
  // Convert Wei to Gwei
  weiToGwei: (wei: string | bigint): number => {
    return Number(BigInt(wei)) / 1e9;
  },
  
  // Convert Gwei to Wei
  gweiToWei: (gwei: number): string => {
    return (BigInt(Math.floor(gwei * 1e9))).toString();
  },
  
  // Format gas price for display
  formatGasPrice: (gwei: number): string => {
    if (gwei < 0.01) return `${(gwei * 1000).toFixed(1)} mGwei`;
    if (gwei < 1) return `${gwei.toFixed(2)} Gwei`;
    return `${gwei.toFixed(1)} Gwei`;
  },
  
  // Estimate transaction cost in USD (approximate)
  estimateCostUSD: (gasLimit: number, gasPriceGwei: number, ethPriceUSD: number = 2000): string => {
    const gasCostETH = (gasLimit * gasPriceGwei) / 1e9;
    const gasCostUSD = gasCostETH * ethPriceUSD;
    return `$${gasCostUSD.toFixed(2)}`;
  }
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).realTimeGasService = realTimeGasService;
  (window as any).gasUtils = gasUtils;
  
  // Quick test function
  (window as any).testGasPrices = async () => {
    const networks = ['ethereum', 'bsc', 'polygon'];

    for (const network of networks) {
      try {
        const gasData = await realTimeGasService.getGasPrices(network);

      } catch (error) {

      }
    }
  };
}
