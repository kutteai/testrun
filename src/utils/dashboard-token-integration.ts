// Dashboard token integration for multi-chain custom tokens
import { loadDashboardTokens, type DashboardAsset } from './token-persistence-utils';
import { getMultiChainTokenBalance, getMultiChainTokenPrice } from './multi-chain-balance-utils';
import { getChainTypeForNetwork, NETWORK_CONFIG } from './token-search-utils';

export interface DashboardTokenData {
  assets: DashboardAsset[];
  totalUSD: number;
  totalChangePercent: number;
  networkBreakdown: Record<string, { count: number; value: number }>;
  chainTypeBreakdown: Record<string, { count: number; value: number }>;
}

// Get all tokens for dashboard display across all networks
export async function getDashboardTokensForAllNetworks(
  walletAddress: string
): Promise<DashboardTokenData> {
  try {

    const allAssets: DashboardAsset[] = [];
    const networkBreakdown: Record<string, { count: number; value: number }> = {};
    const chainTypeBreakdown: Record<string, { count: number; value: number }> = {};
    
    // Get supported networks
    const supportedNetworks = Object.keys(NETWORK_CONFIG);
    
    // Load tokens for each network in parallel
    const networkPromises = supportedNetworks.map(async (network) => {
      try {
        const assets = await loadDashboardTokens(walletAddress, network);
        return { network, assets };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load tokens for ${network}:`, error);
        return { network, assets: [] };
      }
    });
    
    const networkResults = await Promise.allSettled(networkPromises);
    
    networkResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { network, assets } = result.value;
        
        if (assets.length > 0) {
          allAssets.push(...assets);
          
          // Calculate network breakdown
          const networkValue = assets.reduce((sum, asset) => sum + asset.usdValue, 0);
          networkBreakdown[network] = {
            count: assets.length,
            value: networkValue
          };
          
          // Calculate chain type breakdown
          assets.forEach(asset => {
            const chainType = asset.chainType;
            if (!chainTypeBreakdown[chainType]) {
              chainTypeBreakdown[chainType] = { count: 0, value: 0 };
            }
            chainTypeBreakdown[chainType].count++;
            chainTypeBreakdown[chainType].value += asset.usdValue;
          });
        }
      }
    });
    
    // Calculate totals
    const totalUSD = allAssets.reduce((sum, asset) => sum + asset.usdValue, 0);
    const totalChangePercent = 0; // Would need historical data for this
    
    // eslint-disable-next-line no-console
    console.log(`✅ Loaded ${allAssets.length} dashboard assets across ${Object.keys(networkBreakdown).length} networks`);

    return {
      assets: allAssets,
      totalUSD,
      totalChangePercent,
      networkBreakdown,
      chainTypeBreakdown
    };
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load dashboard tokens:', error);
    return {
      assets: [],
      totalUSD: 0,
      totalChangePercent: 0,
      networkBreakdown: {},
      chainTypeBreakdown: {}
    };
  }
}

// Get tokens for current network only (for network-specific dashboard)
export async function getDashboardTokensForCurrentNetwork(
  walletAddress: string,
  currentNetwork: string
): Promise<DashboardAsset[]> {
  try {

    const assets = await loadDashboardTokens(walletAddress, currentNetwork);

    return assets;
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load dashboard tokens for ${currentNetwork}:`, error);
    return [];
  }
}

// Refresh token balances for dashboard
export async function refreshDashboardTokenBalances(
  walletAddress: string,
  network?: string
): Promise<DashboardTokenData> {
  try {

    if (network) {
      // Refresh single network
      const assets = await getDashboardTokensForCurrentNetwork(walletAddress, network);
      const totalUSD = assets.reduce((sum, asset) => sum + asset.usdValue, 0);
      
      return {
        assets,
        totalUSD,
        totalChangePercent: 0,
        networkBreakdown: { [network]: { count: assets.length, value: totalUSD } },
        chainTypeBreakdown: {}
      };
    } else {
      // Refresh all networks
      return await getDashboardTokensForAllNetworks(walletAddress);
    }
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to refresh dashboard token balances:', error);
    throw new Error('Failed to refresh balances');
  }
}

// Convert DashboardAsset to portfolio asset format
export function convertToPortfolioAssets(dashboardAssets: DashboardAsset[]): any[] {
  return dashboardAssets.map(asset => ({
    network: asset.network,
    symbol: asset.symbol,
    name: asset.name,
    address: asset.address,
    balance: asset.balance,
    usdValue: asset.usdValue,
    price: asset.price,
    change24h: asset.change24h,
    changePercent: asset.changePercent,
    logo: asset.logo,
    chainType: asset.chainType,
    isNative: asset.isNative,
    // Additional portfolio-specific fields
    holdings: asset.balance,
    value: asset.usdValue
  }));
}

// Get portfolio summary from dashboard tokens
export function getPortfolioSummary(dashboardData: DashboardTokenData): {
  totalUSD: number;
  totalAssets: number;
  totalNetworks: number;
  totalChainTypes: number;
  topAssetsByValue: DashboardAsset[];
} {
  const { assets, totalUSD, networkBreakdown, chainTypeBreakdown } = dashboardData;
  
  // Sort assets by USD value
  const topAssetsByValue = [...assets]
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 10);
  
  return {
    totalUSD,
    totalAssets: assets.length,
    totalNetworks: Object.keys(networkBreakdown).length,
    totalChainTypes: Object.keys(chainTypeBreakdown).length,
    topAssetsByValue
  };
}

export {
  type DashboardTokenData,
  type DashboardAsset
};
