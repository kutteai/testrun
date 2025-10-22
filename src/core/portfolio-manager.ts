import web3Utils from '../utils/web3-utils'; // Import web3Utils
import { storage } from '../utils/storage-utils';
import { WalletManager as CoreWalletManager } from '../core/wallet-manager'; // Import WalletManager
import { WalletAccount } from '../types'; // New import

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
  private portfolio: Record<string, any> = {}; // { [walletId]: { totalBalance, assets, history } }
  private prices: Record<string, any> = {}; // { [tokenSymbol]: { usdPrice, last24hChange } }
  private historicalPrices: Record<string, any> = {}; // { [tokenSymbol]: [{ timestamp, usdPrice }] }
  private coreWalletManager: CoreWalletManager;

  constructor() {
    // Initialize with data from storage or defaults
    this.loadPortfolio();
    this.coreWalletManager = new CoreWalletManager(); // Instantiate CoreWalletManager
  }

  // Load portfolio from storage
  private async loadPortfolio(): Promise<void> {
    try {
      const result = await storage.get(['portfolio', 'prices', 'historicalPrices']);
      if (result.portfolio) {
        this.portfolio = result.portfolio;
      }
      if (result.prices) {
        this.prices = result.prices;
      }
      if (result.historicalPrices) {
        this.historicalPrices = result.historicalPrices;
      }
    } catch (error) {
      console.error('Failed to load portfolio from storage:', error);
    }
  }

  // Save portfolio to storage
  private async savePortfolio(): Promise<void> {
    try {
      await storage.set({
        portfolio: this.portfolio,
        prices: this.prices,
        historicalPrices: this.historicalPrices
      });
    } catch (error) {
      console.error('Failed to save portfolio to storage:', error);
    }
  }

  async updatePortfolio(walletId: string, accounts: WalletAccount[], network: string): Promise<any> {
    try {
      let totalBalance = 0;
      const assetBalances: any[] = [];

      for (const account of accounts) {
        const address = account.addresses[network] || account.addresses[account.networks[0]];
        if (!address) continue;

        // Fetch native token balance
        const nativeBalance = parseFloat(await web3Utils.getRealBalance(address, network)); // Use web3Utils
        totalBalance += nativeBalance;
        assetBalances.push({ type: 'native', symbol: network, balance: nativeBalance });

        // Fetch token balances (ERC20, Solana SPL, etc.)
        const tokens = await this.getTokenListForNetwork(network);
        for (const token of tokens) {
          const tokenBalance = parseFloat(await web3Utils.getTokenBalance(token.address, address, network)); // Use web3Utils
          if (tokenBalance > 0) {
            assetBalances.push({ type: 'token', ...token, balance: tokenBalance });
            totalBalance += tokenBalance; // This needs to be price-adjusted later
          }
        }
      }

      // Get prices for all assets
      const symbols = assetBalances.map(asset => asset.symbol).filter(Boolean);
      const uniqueSymbols = [...new Set(symbols)];
      const newPrices = await web3Utils.getMultipleTokenPrices(uniqueSymbols); // Use web3Utils
      this.prices = { ...this.prices, ...newPrices };

      // Update total balance with price adjustments and calculate 24h change
      let adjustedTotalBalance = 0;
      const assetsWithPrices = assetBalances.map(asset => {
        const priceData = this.prices[asset.symbol];
        const usdValue = asset.balance * (priceData?.usdPrice || 0);
        adjustedTotalBalance += usdValue;
        return { ...asset, usdValue, priceData };
      });

      // Calculate 24h price changes for display
      const portfolio24hChange = this.calculate24hChange(assetsWithPrices);

      this.portfolio[walletId] = {
        totalBalance: adjustedTotalBalance,
        assets: assetsWithPrices,
        lastUpdate: Date.now(),
        change24h: portfolio24hChange,
      };
      await this.savePortfolio();

      return this.portfolio[walletId];
    } catch (error) {
      console.error('Error updating portfolio:', error);
      throw error;
    }
  }

  private calculate24hChange(assetsWithPrices: any[]): number {
    // This is a simplified calculation. A real implementation would involve fetching
    // historical prices 24 hours ago for each asset and comparing.
    // For now, we'll use the 24hPriceChange from the fetched current price data.

    let totalCurrentValue = 0;
    let totalValue24hAgo = 0;

    assetsWithPrices.forEach(asset => {
      if (asset.priceData && typeof asset.priceData.usdPrice === 'number' && typeof asset.priceData.usd24hChange === 'number') {
        totalCurrentValue += asset.usdValue;
        // Estimate value 24h ago based on current price and 24h change percentage
        const price24hAgo = asset.priceData.usdPrice / (1 + (asset.priceData.usd24hChange / 100));
        totalValue24hAgo += asset.balance * price24hAgo;
      }
    });

    if (totalValue24hAgo === 0) return 0;

    return ((totalCurrentValue - totalValue24hAgo) / totalValue24hAgo) * 100;
  }

  // Get asset prices (USD)
  async getAssetPrices(symbols: string[]): Promise<Record<string, any>> {
    try {
      const prices = await web3Utils.getMultipleTokenPrices(symbols); // Use web3Utils
      this.prices = { ...this.prices, ...prices };
      await this.savePortfolio();
      return prices;
    } catch (error) {
      console.error('Error fetching asset prices:', error);
      return {};
    }
  }

  // Get historical prices for an asset
  async getHistoricalPrices(symbol: string, days: number): Promise<any[]> {
    try {
      // This is a placeholder. A real implementation would fetch from a historical data API.
      // For now, we return dummy data.
      const historicalData = [];
      for (let i = 0; i < days; i++) {
        historicalData.push({
          timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
          usdPrice: this.prices[symbol]?.usdPrice * (1 + (Math.random() - 0.5) * 0.1) // Simulate price fluctuation
        });
      }
      this.historicalPrices[symbol] = historicalData;
      await this.savePortfolio();
      return historicalData;
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return [];
    }
  }

  // Helper to get token list for a network (placeholder for a real token registry)
  private async getTokenListForNetwork(network: string): Promise<any[]> {
    // In a real application, this would fetch from a token registry or API
    if (network === 'ethereum') {
      return [
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        // Add more tokens
      ];
    }
    return [];
  }

  // Get total portfolio balance (sum of all wallets' totalBalance)
  getTotalPortfolioBalance(): number {
    return Object.values(this.portfolio).reduce((sum: number, p: any) => sum + p.totalBalance, 0);
  }

  // Get portfolio assets across all wallets
  getAllPortfolioAssets(): any[] {
    const allAssets: Record<string, any> = {};
    Object.values(this.portfolio).forEach((p: any) => {
      p.assets.forEach((asset: any) => {
        if (allAssets[asset.symbol]) {
          allAssets[asset.symbol].balance += asset.balance;
          allAssets[asset.symbol].usdValue += asset.usdValue;
        } else {
          allAssets[asset.symbol] = { ...asset };
        }
      });
    });
    return Object.values(allAssets);
  }

  // Get individual wallet portfolio
  getWalletPortfolio(walletId: string): any | null {
    return this.portfolio[walletId] || null;
  }

  // Refresh specific wallet balance (for a native token or ERC20)
  async refreshAssetBalance(walletId: string, accountId: string, network: string, assetAddress: string = ''): Promise<void> {
    try {
      const walletPortfolio = this.portfolio[walletId];
      if (!walletPortfolio) throw new Error('Wallet portfolio not found');

      const account = await this.coreWalletManager.getAccountById(walletId, accountId); // Use coreWalletManager
      if (!account) throw new Error('Account not found');

      const address = account.addresses[network] || account.addresses[account.networks[0]];
      if (!address) throw new Error('Address not found for network');

      let updatedBalance = 0;
      let assetToUpdate = walletPortfolio.assets.find((a: any) => a.address === assetAddress && a.network === network);

      if (!assetAddress) {
        // Native token
        updatedBalance = parseFloat(await web3Utils.getRealBalance(address, network)); // Use web3Utils
        if (assetToUpdate) {
          assetToUpdate.balance = updatedBalance;
        } else {
          // Add native asset if it wasn't there initially
          assetToUpdate = { type: 'native', symbol: network, balance: updatedBalance, network };
          walletPortfolio.assets.push(assetToUpdate);
        }
      } else {
        // ERC20 token
        updatedBalance = parseFloat(await web3Utils.getTokenBalance(assetAddress, address, network)); // Use web3Utils
        if (assetToUpdate) {
          assetToUpdate.balance = updatedBalance;
        } else {
          // Attempt to get token metadata and add as new asset
          const tokenMetadata = await web3Utils.getTokenMetadata(assetAddress, network); // Use web3Utils
          if (tokenMetadata) {
            assetToUpdate = { type: 'token', address: assetAddress, symbol: tokenMetadata.symbol, name: tokenMetadata.name, decimals: tokenMetadata.decimals, balance: updatedBalance, network };
            walletPortfolio.assets.push(assetToUpdate);
          }
        }
      }

      // Recalculate USD value for the updated asset
      if (assetToUpdate) {
        const priceData = this.prices[assetToUpdate.symbol];
        assetToUpdate.usdValue = assetToUpdate.balance * (priceData?.usdPrice || 0);
      }

      // Recalculate total balance and 24h change for the wallet
      walletPortfolio.totalBalance = walletPortfolio.assets.reduce((sum: number, a: any) => sum + (a.usdValue || 0), 0);
      walletPortfolio.change24h = this.calculate24hChange(walletPortfolio.assets);
      walletPortfolio.lastUpdate = Date.now();

      await this.savePortfolio();
    } catch (error) {
      console.error(`Error refreshing asset balance for ${assetAddress || network}:`, error);
      throw error;
    }
  }

  // Get account by ID (wrapper for CoreWalletManager)
  async getAccountById(walletId: string, accountId: string): Promise<WalletAccount | null> {
    const wallet = await this.coreWalletManager.getWallet(walletId);
    if (!wallet) {
      return null;
    }
    return wallet.accounts.find(acc => acc.id === accountId) || null;
  }
} 