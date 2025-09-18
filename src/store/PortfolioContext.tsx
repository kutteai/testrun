import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { NETWORKS } from '../utils/web3-utils';
import { PortfolioManager } from '../core/portfolio-manager';
import { getRealBalance, getMultipleTokenPrices } from '../utils/web3-utils';
import type { PortfolioValue, PortfolioState, PortfolioContextType } from '../types';
import { storage } from '../utils/storage-utils';
import { 
  getDashboardTokensForAllNetworks, 
  getDashboardTokensForCurrentNetwork,
  convertToPortfolioAssets,
  type DashboardTokenData 
} from '../utils/dashboard-token-integration';

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: ReactNode;
}

  // Token IDs for CoinGecko API
  const TOKEN_IDS: Record<string, string> = {
    ethereum: 'ethereum',
    bsc: 'binancecoin',
    polygon: 'matic-network',
    avalanche: 'avalanche-2',
    arbitrum: 'ethereum', // Arbitrum uses ETH
    optimism: 'ethereum', // Optimism uses ETH
    base: 'ethereum', // Base uses ETH
    fantom: 'fantom',
    zksync: 'ethereum', // zkSync uses ETH
    linea: 'ethereum', // Linea uses ETH
    mantle: 'mantle',
    scroll: 'ethereum', // Scroll uses ETH
    'polygon-zkevm': 'ethereum', // Polygon zkEVM uses ETH
    'arbitrum-nova': 'ethereum', // Arbitrum Nova uses ETH
    bitcoin: 'bitcoin',
    solana: 'solana',
    tron: 'tron',
    litecoin: 'litecoin',
    ton: 'the-open-network',
    xrp: 'ripple'
  };

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [portfolioState, setPortfolioState] = useState<PortfolioState>({
    portfolioValue: null,
    portfolioHistory: [],
    isLoading: false,
    error: null
  });

  // Load portfolio from storage
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        const result = await storage.get(['portfolioValue']);
        if (result.portfolioValue) {
          setPortfolioState(prev => ({
            ...prev,
            portfolioValue: result.portfolioValue
          }));
        }
      } catch (error) {
        console.error('Failed to load portfolio data:', error);
      }
    };
    loadPortfolioData();
  }, []);

  const savePortfolioData = async (data: PortfolioValue) => {
    try {
      await storage.set({ portfolioValue: data });
      setPortfolioState(prev => ({
        ...prev,
        portfolioValue: data
      }));
    } catch (error) {
      console.error('Failed to save portfolio data:', error);
    }
  };

  const getWalletData = async () => {
    try {
      const result = await storage.get(['wallet']);
      return result.wallet || null;
    } catch (error) {
      console.error('Failed to get wallet data:', error);
      return null;
    }
  };

  // Update portfolio with real data (Enhanced with multi-chain custom tokens)
  const updatePortfolio = async () => {
    setPortfolioState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Get wallet address from storage
      const walletData = await getWalletData();

      if (!walletData?.address) {
        throw new Error('No wallet found');
      }

      const address = walletData.address;
      
      // Use enhanced dashboard token integration
      const dashboardData = await getDashboardTokensForAllNetworks(address);
      
      // Convert to portfolio asset format
      const assets = convertToPortfolioAssets(dashboardData.assets);
      
      console.log(`✅ Portfolio updated with ${assets.length} assets across ${Object.keys(dashboardData.networkBreakdown).length} networks`);
      console.log('💰 Total USD value:', dashboardData.totalUSD);

      // Update portfolio state with enhanced data
      setPortfolioState(prev => ({
        ...prev,
        isLoading: false,
        portfolioValue: {
          assets: assets,
          totalUSD: dashboardData.totalUSD,
          totalChangePercent: dashboardData.totalChangePercent,
          totalChange24h: 0, // Would need historical data
          rates: {}, // Currency conversion rates
          lastUpdated: Date.now(),
          networkBreakdown: dashboardData.networkBreakdown,
          chainTypeBreakdown: dashboardData.chainTypeBreakdown
        },
        error: null
      }));

      console.log('🎯 Portfolio context updated with multi-chain tokens');

    } catch (error) {
      console.error('Portfolio update failed:', error);
      setPortfolioState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update portfolio'
      }));
    }
  };

  // Legacy function for backward compatibility
  const updatePortfolioLegacy = async () => {
    try {
      const walletData = await getWalletData();
      if (!walletData?.address) return;

      const address = walletData.address;
      const networks = ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base', 'fantom'];
      const assets = [];

      // Fetch native token balances for EVM networks
      for (const network of networks) {
        try {
          const balance = await getRealBalance(address, network);
          const balanceInEth = parseFloat(ethers.formatEther(balance));
          
          if (balanceInEth > 0) {
            assets.push({
              network,
              symbol: NETWORKS[network]?.symbol || network.toUpperCase(),
              balance: balance,
              usdValue: 0,
              change24h: 0,
              changePercent: 0
            });
          }
        } catch (error) {
          console.warn(`Failed to get balance for ${network}:`, error);
        }
      }

      // Get token prices
      const tokenIds = assets.map(asset => TOKEN_IDS[asset.network]).filter(Boolean);
      const prices = await getMultipleTokenPrices(tokenIds);

      // Calculate USD values
      let totalUSD = 0;
      for (const asset of assets) {
        const price = prices[TOKEN_IDS[asset.network]] || 0;
        const balanceInEth = parseFloat(ethers.formatEther(asset.balance));
        asset.usdValue = balanceInEth * price;
        totalUSD += asset.usdValue;
      }

      // Get 24h price changes (legacy implementation)
      const priceChanges = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            // Get real 24h price change from CoinGecko API
            const { get24hPriceChange } = await import('../utils/web3-utils');
            const priceChange = await get24hPriceChange(tokenId);
            return { 
              tokenId, 
              change24h: priceChange.price_change_24h || 0, 
              changePercent: priceChange.price_change_percentage_24h || 0 
            };
          } catch (error) {
            console.error(`Error getting 24h price change for ${tokenId}:`, error);
            return { tokenId, change24h: 0, changePercent: 0 };
          }
        })
      );

      // Update assets with price changes
      for (const asset of assets) {
        const priceChange = priceChanges.find(pc => pc.tokenId === TOKEN_IDS[asset.network]);
        if (priceChange) {
          asset.change24h = priceChange.change24h;
          asset.changePercent = priceChange.changePercent;
        }
      }

      const totalChange24h = assets.reduce((sum, asset) => sum + asset.change24h, 0);
      const totalChangePercent = totalUSD > 0 ? (totalChange24h / totalUSD) * 100 : 0;

      const portfolioValue: PortfolioValue = {
        totalUSD,
        totalChange24h,
        totalChangePercent,
        assets,
        rates: prices,
        lastUpdated: Date.now()
      };

      setPortfolioState(prev => ({
        ...prev,
        portfolioValue,
        isLoading: false
      }));

      savePortfolioData(portfolioValue);
    } catch (error) {
      setPortfolioState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update portfolio'
      }));
      toast.error('Failed to update portfolio');
    }
  };

  // Get asset value
  const getAssetValue = (network: string, symbol: string): number => {
    if (!portfolioState.portfolioValue) return 0;
    
    const asset = portfolioState.portfolioValue.assets.find(
      a => a.network === network && a.symbol === symbol
    );
    
    return asset ? asset.usdValue : 0;
  };

  // Get total value
  const getTotalValue = (): number => {
    return portfolioState.portfolioValue?.totalUSD || 0;
  };

  // Refresh rates
  const refreshRates = async (): Promise<void> => {
    try {
      if (!portfolioState.portfolioValue) {
        await updatePortfolio();
        return;
      }

      // Get current rates
      const tokenIds = portfolioState.portfolioValue.assets
        .map(asset => TOKEN_IDS[asset.network])
        .filter(Boolean);
      
      const newRates = await getMultipleTokenPrices(tokenIds);

        setPortfolioState(prev => ({
          ...prev,
        portfolioValue: prev.portfolioValue ? {
          ...prev.portfolioValue,
          rates: newRates,
          lastUpdated: Date.now()
        } : null
      }));

      toast.success('Portfolio rates updated');
    } catch (error) {
      toast.error('Failed to refresh rates');
    }
  };

  // Get real portfolio data
  const getPortfolioData = async (): Promise<PortfolioValue> => {
    try {
      const { PortfolioManager } = await import('../core/portfolio-manager');
      const portfolioManager = new PortfolioManager();
      
      // Get real portfolio data from blockchain
      const portfolio = await portfolioManager.getPortfolio();
      
      return {
        totalUSD: portfolio.totalUSD,
        totalChange24h: portfolio.totalChange24h,
        totalChangePercent: portfolio.totalChangePercent,
        assets: portfolio.assets,
        rates: portfolio.rates,
        lastUpdated: portfolio.lastUpdated
      };
    } catch (error) {
      console.error('Error getting portfolio data:', error);
      return {
        totalUSD: 0,
        totalChange24h: 0,
        totalChangePercent: 0,
        assets: [],
        rates: {},
        lastUpdated: Date.now()
      };
    }
  };

  const value: PortfolioContextType = {
    portfolioState: portfolioState,
    portfolioValue: portfolioState.portfolioValue,
    portfolioHistory: [], // This property is not used in the current context, so it's set to an empty array.
    updatePortfolio,
    getAssetValue,
    getTotalValue,
    refreshRates
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}; 