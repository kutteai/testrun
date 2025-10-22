import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { getNetworks } from '../utils/web3/network-utils'; // Corrected import
import web3Utils from '../utils/web3-utils'; // Import web3Utils as default
import { PortfolioManager } from '../core/portfolio-manager';
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
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to save portfolio data:', error);
    }
  };

  const getWalletData = async () => {
    try {
      const result = await storage.get(['wallet']);
      return result.wallet || null;
    } catch (error) {
      // eslint-disable-next-line no-console
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
      
      // eslint-disable-next-line no-console
      console.log(`✅ Portfolio updated with ${assets.length} assets across ${Object.keys(dashboardData.networkBreakdown).length} networks`);

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

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Portfolio update failed:', error);
      setPortfolioState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update portfolio'
      }));
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
      
      const newRates = await web3Utils.getMultipleTokenPrices(tokenIds); // Use web3Utils.getMultipleTokenPrices

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
      const portfolioManager = new PortfolioManager();
      const walletData = await getWalletData();

      if (!walletData || !walletData.currentWallet || !walletData.currentWallet.id) {
        throw new Error('No current wallet available.');
      }

      const { id: walletId, accounts, currentNetwork } = walletData.currentWallet;
      if (!currentNetwork || !currentNetwork.id) {
        throw new Error('No current network available.');
      }
      const networkId = currentNetwork.id; // Extract networkId as string

      // Get real portfolio data from blockchain by calling updatePortfolio
      const portfolio = await portfolioManager.updatePortfolio(walletId, accounts, networkId); // Call updatePortfolio
      
      return {
        totalUSD: portfolio.totalBalance,
        totalChange24h: portfolio.change24h,
        totalChangePercent: (portfolio.change24h / portfolio.totalBalance) * 100, // Assuming change24h is absolute for now
        assets: portfolio.assets.map((asset: any) => ({ // Map to PortfolioValueAsset structure
          network: asset.network,
          symbol: asset.symbol,
          balance: asset.balance.toString(), // Ensure balance is string
          usdValue: asset.usdValue,
          change24h: asset.priceData?.usd24hChange || 0,
          changePercent: asset.priceData?.usd24hChangePercent || 0
        })),
        rates: portfolio.prices || {},
        lastUpdated: portfolio.lastUpdate
      };
    } catch (error) {
      // eslint-disable-next-line no-console
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