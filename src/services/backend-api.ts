// Backend API service for PayCio Wallet
// This service handles all external API calls through our Node.js backend
import { getConfig } from '../utils/config-injector';

interface BackendConfig {
  baseUrl: string;
  timeout: number;
}

class BackendAPI {
  private config: BackendConfig;

  constructor() {
    this.config = {
      // Use deployed Netlify Functions
      baseUrl: getConfig().REACT_APP_BACKEND_URL || 'https://ext-wallet.netlify.app/.netlify/functions',
      timeout: 30000
    };
  }

  // Generic request method for Netlify Functions
  private async request<T>(functionName: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/${functionName}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: { message: `HTTP ${response.status}`, status: response.status } 
      }));
      throw new Error(error.error?.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Token validation
  async validateToken(address: string, network: string): Promise<{
    isValid: boolean;
    tokenInfo?: {
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
      address: string;
    };
    validationMethod: string;
    network: string;
    address: string;
  }> {
    return this.request('validate-token', {
      method: 'POST',
      body: JSON.stringify({ address, network })
    });
  }

  // Get token information
  async getTokenInfo(network: string, address: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    address: string;
  }> {
    return this.request(`/tokens/${network}/${address}`);
  }

  // Get native token balance
  async getNativeBalance(network: string, address: string): Promise<{
    network: string;
    address: string;
    balance: string;
    timestamp: string;
    error?: string;
  }> {
    return this.request('get-balance', {
      method: 'POST',
      body: JSON.stringify({ network, address, type: 'native' })
    });
  }

  // Get token balance
  async getTokenBalance(network: string, tokenAddress: string, walletAddress: string): Promise<{
    network: string;
    tokenAddress: string;
    walletAddress: string;
    balance: string;
    timestamp: string;
    error?: string;
  }> {
    return this.request('get-balance', {
      method: 'POST',
      body: JSON.stringify({ network, address: walletAddress, tokenAddress, type: 'token' })
    });
  }

  // Get multiple balances in one call
  async getBatchBalances(requests: Array<{
    type: 'native' | 'token';
    network: string;
    address: string;
    tokenAddress?: string;
  }>): Promise<{
    balances: Array<{
      request: any;
      success: boolean;
      data: any;
      error?: string;
    }>;
  }> {
    return this.request('/balances/batch', {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }

  // Get token price
  async getTokenPrice(network: string, address: string): Promise<{
    network: string;
    address: string;
    price: number;
    source: string;
    timestamp: string;
    error?: string;
  }> {
    return this.request('get-price', {
      method: 'POST',
      body: JSON.stringify({ network, address })
    });
  }

  // Get multiple prices in one call
  async getBatchPrices(tokens: Array<{
    network: string;
    address: string;
  }>): Promise<{
    prices: Array<{
      token: any;
      success: boolean;
      data: any;
      error?: string;
    }>;
  }> {
    return this.request('/prices/batch', {
      method: 'POST',
      body: JSON.stringify({ tokens })
    });
  }

  // Get native token prices
  async getNativePrices(symbols: string[]): Promise<{
    prices: Record<string, { usd: number }>;
    timestamp: string;
  }> {
    return this.request(`/prices/native/${symbols.join(',')}`);
  }

  // Get supported networks
  async getNetworks(): Promise<{
    networks: Array<{
      id: string;
      name: string;
      symbol: string;
      chainId?: number;
      rpc?: string;
      explorer: string;
      type: string;
      isSupported: boolean;
    }>;
  }> {
    return this.request('/networks');
  }

  // Get specific network info
  async getNetwork(networkId: string): Promise<{
    id: string;
    name: string;
    symbol: string;
    chainId?: number;
    rpc?: string;
    explorer: string;
    type: string;
    isSupported: boolean;
  }> {
    return this.request(`/networks/${networkId}`);
  }

  // Test network connection
  async testNetwork(networkId: string, rpcUrl?: string, chainId?: string): Promise<{
    networkId: string;
    rpcUrl: string;
    isConnected: boolean;
    responseTime: number;
    blockNumber?: number;
    chainId?: string;
    error?: string;
    timestamp: string;
  }> {
    return this.request('test-network', {
      method: 'POST',
      body: JSON.stringify({ networkId, rpcUrl, chainId })
    });
  }

  // Validate custom network
  async validateCustomNetwork(networkData: {
    name: string;
    symbol: string;
    chainId?: string;
    rpcUrl: string;
    explorerUrl?: string;
  }): Promise<{
    isValid: boolean;
    name: string;
    symbol: string;
    chainId?: string;
    rpcUrl: string;
    explorerUrl?: string;
    responseTime: number;
    blockNumber?: number;
    error?: string;
    timestamp: string;
  }> {
    return this.request('/networks/validate', {
      method: 'POST',
      body: JSON.stringify(networkData)
    });
  }

  // Password verification functions
  async generatePasswordHash(password: string): Promise<{
    hash: string;
    algorithm: string;
    length: number;
  }> {
    return this.request('verify-password', {
      method: 'POST',
      body: JSON.stringify({ action: 'hash', password })
    }).then(response => (response as any).result);
  }

  async verifyPassword(password: string, storedHash: string): Promise<{
    matches: boolean;
    generatedHash: string;
    storedHash: string;
    algorithm: string;
  }> {
    return this.request('verify-password', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify', password, storedHash })
    }).then(response => (response as any).result);
  }

  async diagnosePassword(password: string, data: {
    storedHash?: string;
    encryptedData?: string;
    testData?: any;
  }): Promise<any> {
    return this.request('verify-password', {
      method: 'POST',
      body: JSON.stringify({ action: 'diagnose', password, ...data })
    }).then(response => (response as any).result);
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
  }> {
    return this.request('/health', { method: 'GET' });
  }

  // Check if backend is available
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Backend API not available:', error);
      return false;
    }
  }
}

// Singleton instance
export const backendAPI = new BackendAPI();

// Fallback service that uses backend when available, falls back to direct calls
export class HybridAPIService {
  private useBackend = false;

  async initialize(): Promise<void> {
    this.useBackend = await backendAPI.isAvailable();

  }

  async validateToken(address: string, network: string): Promise<boolean> {
    if (this.useBackend) {
      try {
        const result = await backendAPI.validateToken(address, network);
        return result.isValid;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend token validation failed, falling back to direct:', error);
        this.useBackend = false;
      }
    }

    // Fallback to existing direct validation
    const { validateTokenContract } = await import('../utils/token-search-utils');
    return validateTokenContract(address, network);
  }

  async getBalance(address: string, network: string): Promise<string> {
    if (this.useBackend) {
      try {
        const result = await backendAPI.getNativeBalance(network, address);
        return result.balance;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend balance fetch failed, falling back to direct:', error);
        this.useBackend = false;
      }
    }

    // Fallback to existing direct balance fetching
    const { getRealBalance } = await import('../utils/web3-utils');
    return getRealBalance(address, network);
  }

  async getTokenPrice(network: string, address: string): Promise<number> {
    if (this.useBackend) {
      try {
        const result = await backendAPI.getTokenPrice(network, address);
        return result.price;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend price fetch failed, falling back to direct:', error);
        this.useBackend = false;
      }
    }

    // Fallback to existing direct price fetching
    return 0; // Implement direct price fetching if needed
  }

  // Password verification functions
  async generatePasswordHash(password: string): Promise<string> {
    if (this.useBackend) {
      try {
        const result = await backendAPI.generatePasswordHash(password);
        return result.hash;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend password hash failed, falling back to local:', error);
        this.useBackend = false;
      }
    }

    // Fallback: Simple hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (this.useBackend) {
      try {
        const result = await backendAPI.verifyPassword(password, storedHash);
        return result.matches;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend password verify failed, falling back to local:', error);
        this.useBackend = false;
      }
    }

    // Fallback to local verification
    const generatedHash = await this.generatePasswordHash(password);
    return generatedHash === storedHash;
  }

  async diagnosePassword(password: string, data: any): Promise<any> {
    if (this.useBackend) {
      try {
        return await backendAPI.diagnosePassword(password, data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Backend password diagnosis failed:', error);
        return { error: 'Backend diagnosis unavailable' };
      }
    }

    return { error: 'Backend not available for diagnosis' };
  }
}

export const hybridAPI = new HybridAPIService();
