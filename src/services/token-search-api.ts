import { getConfig } from '../config';

export interface TokenSearchResult {
  symbol: string;
  name: string;
  address: string;
  network: string;
  decimals: number;
  logo?: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  isVerified: boolean;
  chainType: 'evm' | 'bitcoin' | 'solana' | 'tron' | 'ton' | 'xrp';
  tags?: string[];
}

export interface TokenSearchOptions {
  network?: string;
  accountId?: string;
  limit?: number;
  includeUnverified?: boolean;
  includePriceData?: boolean;
  sortBy?: 'relevance' | 'market_cap' | 'volume' | 'name';
}

export interface AccountTokenData {
  accountId: string;
  network: string;
  tokens: TokenSearchResult[];
  lastUpdated: number;
}

/**
 * Enhanced API-based token search service
 */
export class TokenSearchAPI {
  private cache: Map<string, { data: TokenSearchResult[]; expiry: number }> = new Map();
  private readonly CACHE_DURATION = 300000; // 5 minutes cache

  /**
   * Search for tokens using multiple APIs
   */
  async searchTokens(
    query: string, 
    options: TokenSearchOptions = {}
  ): Promise<TokenSearchResult[]> {
    const {
      network = 'ethereum',
      limit = 20,
      includeUnverified = true,
      includePriceData = true,
      sortBy = 'relevance'
    } = options;

    if (!query || query.length < 2) {
      return this.getPopularTokens(network, limit);
    }

    const cacheKey = `search_${query}_${network}_${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const results: TokenSearchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    try {
      // Parallel API calls for comprehensive results
      const apiCalls = [
        this.searchCoinGecko(normalizedQuery, network, limit),
        this.searchDexScreener(normalizedQuery, network, limit),
        this.searchMoralis(normalizedQuery, network, limit),
        this.searchCoinMarketCap(normalizedQuery, network, limit),
        this.searchByAddress(normalizedQuery, network)
      ];

      const apiResults = await Promise.allSettled(apiCalls);
      
      apiResults.forEach((result) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          results.push(...result.value);
        }
      });

      // Remove duplicates and filter
      const uniqueResults = this.deduplicateTokens(results);
      const filteredResults = includeUnverified 
        ? uniqueResults 
        : uniqueResults.filter(token => token.isVerified);
      
      const sortedResults = this.sortTokens(filteredResults, sortBy);
      const finalResults = sortedResults.slice(0, limit);

      // Cache results
      this.cache.set(cacheKey, {
        data: finalResults,
        expiry: Date.now() + this.CACHE_DURATION
      });

      return finalResults;

    } catch (error) {
      console.error('Token search failed:', error);
      return this.getPopularTokens(network, limit);
    }
  }

  /**
   * Search CoinGecko API
   */
  private async searchCoinGecko(
    query: string, 
    network: string, 
    limit: number
  ): Promise<TokenSearchResult[]> {
    try {
      const config = getConfig();
      const apiKey = config.COINGECKO_API_KEY;
      
      const url = apiKey 
        ? `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}&x_cg_demo_api_key=${apiKey}`
        : `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

      const data = await response.json();
      const results: TokenSearchResult[] = [];

      for (const coin of data.coins.slice(0, limit)) {
        results.push({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          address: coin.id, // CoinGecko uses coin ID
          network: this.mapCoinGeckoToNetwork(coin.id, network),
          decimals: 18,
          logo: coin.thumb,
          isVerified: true,
          chainType: this.getChainTypeForNetwork(network)
        });
      }

      return results;
    } catch (error) {
      console.error('CoinGecko search failed:', error);
      return [];
    }
  }

  /**
   * Search DexScreener API (DEX data)
   */
  private async searchDexScreener(
    query: string, 
    network: string, 
    limit: number
  ): Promise<TokenSearchResult[]> {
    try {
      const chainId = this.getChainIdForNetwork(network);
      const url = `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}&chainId=${chainId}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`DexScreener API error: ${response.status}`);

      const data = await response.json();
      const results: TokenSearchResult[] = [];

      for (const pair of data.pairs.slice(0, limit)) {
        if (pair.baseToken) {
          results.push({
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            address: pair.baseToken.address,
            network: network,
            decimals: pair.baseToken.decimals || 18,
            logo: pair.baseToken.image,
            price: parseFloat(pair.priceUsd) || 0,
            marketCap: parseFloat(pair.marketCap) || 0,
            volume24h: parseFloat(pair.volume?.h24) || 0,
            isVerified: true,
            chainType: this.getChainTypeForNetwork(network)
          });
        }
      }

      return results;
    } catch (error) {
      console.error('DexScreener search failed:', error);
      return [];
    }
  }

  /**
   * Search Moralis API
   */
  private async searchMoralis(
    query: string, 
    network: string, 
    limit: number
  ): Promise<TokenSearchResult[]> {
    try {
      const config = getConfig();
      const apiKey = config.MORALIS_API_KEY;
      
      if (!apiKey) {
        console.warn('Moralis API key not configured');
        return [];
      }

      const chainId = this.getChainIdForNetwork(network);
      const url = `https://deep-index.moralis.io/api/v2/token/search?chain=${chainId}&q=${encodeURIComponent(query)}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Moralis API error: ${response.status}`);

      const data = await response.json();
      const results: TokenSearchResult[] = [];

      for (const token of data.result || []) {
        results.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          network: network,
          decimals: token.decimals || 18,
          logo: token.logo,
          isVerified: true,
          chainType: this.getChainTypeForNetwork(network)
        });
      }

      return results;
    } catch (error) {
      console.error('Moralis search failed:', error);
      return [];
    }
  }

  /**
   * Search CoinMarketCap API
   */
  private async searchCoinMarketCap(
    query: string, 
    network: string, 
    limit: number
  ): Promise<TokenSearchResult[]> {
    try {
      const config = getConfig();
      const apiKey = config.COINMARKETCAP_API_KEY;
      
      if (!apiKey) {
        console.warn('CoinMarketCap API key not configured');
        return [];
      }

      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`CoinMarketCap API error: ${response.status}`);

      const data = await response.json();
      const results: TokenSearchResult[] = [];

      for (const token of data.data || []) {
        results.push({
          symbol: token.symbol,
          name: token.name,
          address: token.platform?.token_address || token.id,
          network: this.mapCoinMarketCapToNetwork(token.platform?.name, network),
          decimals: 18,
          logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${token.id}.png`,
          marketCap: token.quote?.USD?.market_cap || 0,
          volume24h: token.quote?.USD?.volume_24h || 0,
          isVerified: true,
          chainType: this.getChainTypeForNetwork(network)
        });
      }

      return results;
    } catch (error) {
      console.error('CoinMarketCap search failed:', error);
      return [];
    }
  }

  /**
   * Search by contract address
   */
  private async searchByAddress(
    query: string, 
    network: string
  ): Promise<TokenSearchResult[]> {
    if (!this.isValidAddress(query)) {
      return [];
    }

    try {
      // Try to fetch token info from blockchain explorer
      const tokenInfo = await this.fetchTokenFromExplorer(query, network);
      return tokenInfo ? [tokenInfo] : [];
    } catch (error) {
      console.error('Address search failed:', error);
      return [];
    }
  }

  /**
   * Get popular tokens for a network
   */
  private async getPopularTokens(network: string, limit: number): Promise<TokenSearchResult[]> {
    const cacheKey = `popular_${network}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data.slice(0, limit);
    }

    try {
      const config = getConfig();
      const apiKey = config.COINGECKO_API_KEY;
      
      const url = apiKey 
        ? `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&x_cg_demo_api_key=${apiKey}`
        : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Popular tokens API error: ${response.status}`);

      const data = await response.json();
      const results: TokenSearchResult[] = [];

      for (const coin of data) {
        results.push({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          address: coin.id,
          network: this.mapCoinGeckoToNetwork(coin.id, network),
          decimals: 18,
          logo: coin.image,
          price: coin.current_price,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
          isVerified: true,
          chainType: this.getChainTypeForNetwork(network)
        });
      }

      // Cache popular tokens for longer
      this.cache.set(cacheKey, {
        data: results,
        expiry: Date.now() + (this.CACHE_DURATION * 2)
      });

      return results;
    } catch (error) {
      console.error('Failed to fetch popular tokens:', error);
      return [];
    }
  }

  /**
   * Fetch token info from blockchain explorer
   */
  private async fetchTokenFromExplorer(
    address: string, 
    network: string
  ): Promise<TokenSearchResult | null> {
    try {
      const config = getConfig();
      const apiKey = config.ETHERSCAN_API_KEY;
      
      if (!apiKey) {
        console.warn('Etherscan API key not configured');
        return null;
      }

      const chainId = this.getChainIdForNetwork(network);
      const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Explorer API error: ${response.status}`);

      const data = await response.json();
      
      if (data.status === '1' && data.result && data.result.length > 0) {
        const token = data.result[0];
        return {
          symbol: token.symbol,
          name: token.name,
          address: token.contractAddress,
          network: network,
          decimals: parseInt(token.divisor) || 18,
          isVerified: true,
          chainType: this.getChainTypeForNetwork(network)
        };
      }

      return null;
    } catch (error) {
      console.error('Explorer fetch failed:', error);
      return null;
    }
  }

  /**
   * Get tokens for a specific account and network
   */
  async getAccountTokens(
    accountId: string, 
    network: string
  ): Promise<TokenSearchResult[]> {
    const cacheKey = `account_${accountId}_${network}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      // This would integrate with your account system
      // For now, return empty array - implement based on your account structure
      return [];
    } catch (error) {
      console.error('Failed to get account tokens:', error);
      return [];
    }
  }

  /**
   * Save token to account
   */
  async saveTokenToAccount(
    accountId: string, 
    network: string, 
    token: TokenSearchResult
  ): Promise<void> {
    try {
      // Implement token saving to account
      console.log(`Saving token ${token.symbol} to account ${accountId} on ${network}`);
    } catch (error) {
      console.error('Failed to save token to account:', error);
      throw error;
    }
  }

  /**
   * Remove token from account
   */
  async removeTokenFromAccount(
    accountId: string, 
    network: string, 
    tokenAddress: string
  ): Promise<void> {
    try {
      // Implement token removal from account
      console.log(`Removing token ${tokenAddress} from account ${accountId} on ${network}`);
    } catch (error) {
      console.error('Failed to remove token from account:', error);
      throw error;
    }
  }

  // Helper methods
  private deduplicateTokens(tokens: TokenSearchResult[]): TokenSearchResult[] {
    const seen = new Set<string>();
    return tokens.filter(token => {
      const key = `${token.address.toLowerCase()}_${token.network}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortTokens(tokens: TokenSearchResult[], sortBy: string): TokenSearchResult[] {
    switch (sortBy) {
      case 'market_cap':
        return tokens.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      case 'volume':
        return tokens.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
      case 'name':
        return tokens.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return tokens; // relevance - keep original order
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private getChainIdForNetwork(network: string): string {
    const chainIds: Record<string, string> = {
      'ethereum': '1',
      'bsc': '56',
      'polygon': '137',
      'arbitrum': '42161',
      'optimism': '10',
      'avalanche': '43114',
      'base': '8453',
      'fantom': '250'
    };
    return chainIds[network.toLowerCase()] || '1';
  }

  private getChainTypeForNetwork(network: string): 'evm' | 'bitcoin' | 'solana' | 'tron' | 'ton' | 'xrp' {
    const evmNetworks = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base', 'fantom'];
    if (evmNetworks.includes(network.toLowerCase())) return 'evm';
    if (network.toLowerCase() === 'bitcoin') return 'bitcoin';
    if (network.toLowerCase() === 'solana') return 'solana';
    if (network.toLowerCase() === 'tron') return 'tron';
    if (network.toLowerCase() === 'ton') return 'ton';
    if (network.toLowerCase() === 'xrp') return 'xrp';
    return 'evm'; // default
  }

  private mapCoinGeckoToNetwork(coinId: string, network: string): string {
    // Map CoinGecko coin IDs to networks
    return network;
  }

  private mapCoinMarketCapToNetwork(platform: string, network: string): string {
    // Map CoinMarketCap platforms to networks
    return network;
  }
}

// Export singleton instance
export const tokenSearchAPI = new TokenSearchAPI();
