import { getRealBalance, getMultipleTokenPrices } from '../utils/web3-utils';

export interface PortfolioValue {
  totalUSD: number;
  totalChange24h: number;
  totalChangePercent: number;
  assets: Array<{
    network: string;
    symbol: string;
    balance: string;
    usdValue: number;
    change24h: number;
    changePercent: number;
  }>;
  rates: Record<string, number>;
  lastUpdated: number;
}

export interface PortfolioHistoryEntry {
  timestamp: number;
  totalUSD: number;
  change24h: number;
}

// Token IDs for CoinGecko API
const TOKEN_IDS: Record<string, string> = {
  ethereum: 'ethereum',
  bsc: 'binancecoin',
  polygon: 'matic-network',
  avalanche: 'avalanche-2',
  arbitrum: 'ethereum',
  optimism: 'ethereum',
  bitcoin: 'bitcoin',
  solana: 'solana',
  tron: 'tron',
  litecoin: 'litecoin',
  ton: 'the-open-network',
  xrp: 'ripple'
};

export class PortfolioManager {
  private portfolioValue: PortfolioValue | null = null;
  private history: PortfolioHistoryEntry[] = [];

  constructor() {
    this.loadPortfolioData();
  }

  // Load portfolio data from storage
  private async loadPortfolioData(): Promise<void> {
    try {
      chrome.storage.local.get(['portfolioValue', 'portfolioHistory'], (result) => {
      if (result.portfolioValue) {
        this.portfolioValue = result.portfolioValue;
      }
      if (result.portfolioHistory) {
        this.history = result.portfolioHistory;
      }
      });
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    }
  }

  // Save portfolio data to storage
  private async savePortfolioData(): Promise<void> {
    try {
      chrome.storage.local.set({
        portfolioValue: this.portfolioValue,
        portfolioHistory: this.history
      });
    } catch (error) {
      console.error('Failed to save portfolio data:', error);
    }
  }

  // Update portfolio with real data
  async updatePortfolio(): Promise<PortfolioValue> {
    try {
      // Get wallet address from storage
      const walletData = await this.getWalletFromStorage();
      if (!walletData?.address) {
        throw new Error('No wallet found');
      }

      const address = walletData.address;
      const networks = ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'];
      const assets = [];

      // Fetch real balances for all networks
      for (const network of networks) {
        try {
          const balance = await getRealBalance(address, network);
          const balanceInEth = parseFloat(balance) / Math.pow(10, 18); // Convert from wei to ETH
          
          if (balanceInEth > 0.0001) { // Only include significant balances
            assets.push({
              network,
              symbol: this.getNetworkSymbol(network),
              balance: balance,
              usdValue: 0, // Will be calculated after getting prices
              change24h: 0,
              changePercent: 0
            });
          }
        } catch (error) {
          console.warn(`Failed to get balance for ${network}:`, error);
        }
      }

      // Get real token prices from CoinGecko
      const tokenIds = assets.map(asset => TOKEN_IDS[asset.network]).filter(Boolean);
      const prices = await getMultipleTokenPrices(tokenIds);

      // Calculate real USD values
      let totalUSD = 0;
      for (const asset of assets) {
        const price = prices[TOKEN_IDS[asset.network]] || 0;
        const balanceInEth = parseFloat(asset.balance) / Math.pow(10, 18);
        asset.usdValue = balanceInEth * price;
        totalUSD += asset.usdValue;
      }

      // Get 24h price changes from CoinGecko
      const priceChanges = await this.get24hPriceChanges(tokenIds);
      
      // Update assets with real price changes
      let totalChange24h = 0;
      for (const asset of assets) {
        const tokenId = TOKEN_IDS[asset.network];
        const priceChange = priceChanges[tokenId];
        if (priceChange) {
          asset.change24h = (asset.usdValue * priceChange.changePercent) / 100;
          asset.changePercent = priceChange.changePercent;
          totalChange24h += asset.change24h;
        }
      }

      const totalChangePercent = totalUSD > 0 ? (totalChange24h / (totalUSD - totalChange24h)) * 100 : 0;

    this.portfolioValue = {
      totalUSD,
      totalChange24h,
      totalChangePercent,
        assets,
        rates: prices,
      lastUpdated: Date.now()
    };

    // Add to history
    this.history.push({
      timestamp: Date.now(),
      totalUSD,
      change24h: totalChange24h
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.history = this.history.filter(entry => entry.timestamp > thirtyDaysAgo);

    await this.savePortfolioData();
    return this.portfolioValue;
    } catch (error) {
      console.error('Failed to update portfolio:', error);
      throw error;
    }
  }

  // Get 24h price changes from CoinGecko
  private async get24hPriceChanges(tokenIds: string[]): Promise<Record<string, { changePercent: number }>> {
    try {
      const config = this.getConfig();
      const apiKey = config.COINGECKO_API_KEY;
      
      const baseUrl = 'https://api.coingecko.com/api/v3';
      const ids = tokenIds.join(',');
      const url = apiKey 
        ? apiKey ? 
          `${baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${apiKey}` :
          `${baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        : `${baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const changes: Record<string, { changePercent: number }> = {};
      tokenIds.forEach(id => {
        changes[id] = {
          changePercent: data[id]?.usd_24h_change || 0
        };
      });

      return changes;
    } catch (error) {
      console.error('Error getting 24h price changes:', error);
      return {};
    }
  }

  // Get wallet from storage
  private async getWalletFromStorage(): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['wallet'], (result) => {
        resolve(result.wallet || null);
      });
    });
  }

  // Get network symbol
  private getNetworkSymbol(network: string): string {
    const symbols: Record<string, string> = {
      ethereum: 'ETH',
      bsc: 'BNB',
      polygon: 'MATIC',
      avalanche: 'AVAX',
      arbitrum: 'ETH',
      optimism: 'ETH',
      bitcoin: 'BTC',
      solana: 'SOL',
      tron: 'TRX',
      litecoin: 'LTC',
      ton: 'TON',
      xrp: 'XRP'
    };
    return symbols[network] || network.toUpperCase();
  }

  // Get configuration
  private getConfig() {
    if (typeof window !== 'undefined' && (window as any).CONFIG) {
      return (window as any).CONFIG;
    }
    return {
      COINGECKO_API_KEY: ''
    };
  }

  // Get current portfolio value
  getPortfolioValue(): PortfolioValue | null {
    return this.portfolioValue;
  }

  // Get portfolio (alias for getPortfolioValue for compatibility)
  getPortfolio(): PortfolioValue | null {
    return this.portfolioValue;
  }

  // Get portfolio history
  getPortfolioHistory(): PortfolioHistoryEntry[] {
    return this.history;
  }

  // Get asset value by network and symbol
  getAssetValue(network: string, symbol: string): number {
    if (!this.portfolioValue) return 0;
    
    const asset = this.portfolioValue.assets.find(
      a => a.network === network && a.symbol === symbol
    );
    
    return asset ? asset.usdValue : 0;
  }

  // Get total portfolio value
  getTotalValue(): number {
    return this.portfolioValue?.totalUSD || 0;
  }

  // Refresh portfolio data
  async refreshPortfolio(): Promise<void> {
    await this.updatePortfolio();
  }

  // Clear portfolio data
  async clearPortfolio(): Promise<void> {
    this.portfolioValue = null;
    this.history = [];
        await this.savePortfolioData();
  }

  // Get portfolio statistics
  getStatistics(): {
    totalValue: number;
    totalChange24h: number;
    totalChangePercent: number;
    assetCount: number;
    lastUpdated: number | null;
  } {
    if (!this.portfolioValue) {
      return {
        totalValue: 0,
        totalChange24h: 0,
        totalChangePercent: 0,
        assetCount: 0,
        lastUpdated: null
      };
    }

    return {
      totalValue: this.portfolioValue.totalUSD,
      totalChange24h: this.portfolioValue.totalChange24h,
      totalChangePercent: this.portfolioValue.totalChangePercent,
      assetCount: this.portfolioValue.assets.length,
      lastUpdated: this.portfolioValue.lastUpdated
    };
  }
} 