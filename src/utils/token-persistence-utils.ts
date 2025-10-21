// Token persistence and dashboard integration utilities
import { storage } from './storage-utils';
import { getMultiChainTokenBalance, getMultiChainTokenPrice, type MultiChainTokenBalance } from './multi-chain-balance-utils';
import { getChainTypeForNetwork } from './token-search-utils';

export interface PersistedToken {
  id: string;
  symbol: string;
  name: string;
  address: string;
  network: string;
  decimals: number;
  logo?: string;
  isCustom: boolean;
  isEnabled: boolean;
  isAutoDetected?: boolean;
  chainType?: string;
  mintAddress?: string;
  programId?: string;
  assetId?: string;
  addedAt: number;
}

export interface TokenWithBalance extends PersistedToken {
  balance: string;
  price: number;
  usdValue: number;
  change24h: number;
}

export interface DashboardAsset {
  symbol: string;
  name: string;
  address: string;
  network: string;
  balance: string;
  usdValue: number;
  price: number;
  change24h: number;
  changePercent: number;
  logo?: string;
  chainType: string;
  isNative?: boolean;
}

// Storage keys for different token types
const STORAGE_KEYS = {
  CUSTOM_TOKENS: 'customTokens',
  AUTO_DISCOVERED_TOKENS: 'autoDiscoveredTokens',
  ENABLED_TOKENS: 'enabledTokens',
  REMOVED_DEFAULT_TOKENS: 'removedDefaultTokens',
  REMOVED_AUTO_TOKENS: 'removedAutoDiscoveredTokens',
  TOKEN_SETTINGS: 'tokenSettings'
};

// Save custom token with proper persistence
export async function saveCustomToken(token: PersistedToken): Promise<void> {
  try {
    const result = await storage.get([STORAGE_KEYS.CUSTOM_TOKENS]);
    const savedTokens = result[STORAGE_KEYS.CUSTOM_TOKENS] || [];
    
    // Remove existing token with same address and network
    const filteredTokens = savedTokens.filter((t: PersistedToken) => 
      !(t.address.toLowerCase() === token.address.toLowerCase() && t.network === token.network)
    );
    
    // Add new token
    const updatedTokens = [...filteredTokens, { ...token, addedAt: Date.now() }];
    
    await storage.set({ [STORAGE_KEYS.CUSTOM_TOKENS]: updatedTokens });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save custom token:', error);
    throw new Error('Failed to persist custom token');
  }
}

// Load all custom tokens
export async function loadCustomTokens(): Promise<PersistedToken[]> {
  try {
    const result = await storage.get([STORAGE_KEYS.CUSTOM_TOKENS]);
    return result[STORAGE_KEYS.CUSTOM_TOKENS] || [];
    } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load custom tokens:', error);
      return [];
    }
  }

// Remove custom token permanently
export async function removeCustomTokenPermanently(address: string, network: string): Promise<void> {
  try {
    const result = await storage.get([STORAGE_KEYS.CUSTOM_TOKENS]);
    const savedTokens = result[STORAGE_KEYS.CUSTOM_TOKENS] || [];
    
    const updatedTokens = savedTokens.filter((token: PersistedToken) => 
      !(token.address.toLowerCase() === address.toLowerCase() && token.network === network)
    );
    
    await storage.set({ [STORAGE_KEYS.CUSTOM_TOKENS]: updatedTokens });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove custom token:', error);
    throw new Error('Failed to remove custom token');
  }
}

// Get enabled tokens for a specific network
export async function getEnabledTokensForNetwork(network: string): Promise<PersistedToken[]> {
  try {
    const [customTokens, enabledTokensResult] = await Promise.all([
      loadCustomTokens(),
      storage.get([STORAGE_KEYS.ENABLED_TOKENS])
    ]);
    
    const enabledTokenIds = enabledTokensResult[STORAGE_KEYS.ENABLED_TOKENS] || [];
    
    // Filter custom tokens by network and enabled status
    return customTokens.filter(token => 
      token.network === network && 
      (enabledTokenIds.length === 0 || enabledTokenIds.includes(token.id) || token.isEnabled !== false)
    );
    
    } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get enabled tokens for network:', error);
    return [];
  }
}

// Load tokens with real balances for dashboard
export async function loadDashboardTokens(
  walletAddress: string, 
  network: string
): Promise<DashboardAsset[]> {
  try {

    const chainType = getChainTypeForNetwork(network);
    if (!chainType) {
      // eslint-disable-next-line no-console
      console.warn('Unsupported network for dashboard tokens:', network);
      return [];
    }

    // Get enabled custom tokens for this network
    const enabledTokens = await getEnabledTokensForNetwork(network);

    const dashboardAssets: DashboardAsset[] = [];

    // Always include native token
    try {
      const nativeBalance = await getMultiChainTokenBalance('native', walletAddress, network);
      if (nativeBalance) {
        const price = await getMultiChainTokenPrice('native', network, chainType);
        const usdValue = price ? parseFloat(nativeBalance.balance) * price : 0;
        
        dashboardAssets.push({
          symbol: nativeBalance.symbol,
          name: nativeBalance.name,
          address: 'native',
          network: network,
          balance: nativeBalance.balance,
          usdValue: usdValue,
          price: price || 0,
          change24h: 0, // Would need historical price data
          changePercent: 0,
          chainType: chainType,
          isNative: true
        });

      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load native token balance:', error);
    }

    // Load custom token balances
    for (const token of enabledTokens) {
      try {
        const balance = await getMultiChainTokenBalance(token.address, walletAddress, network);
        if (balance && parseFloat(balance.balance) >= 0) { // Include even 0 balances for enabled tokens
          const price = await getMultiChainTokenPrice(token.address, network, chainType);
          const usdValue = price ? parseFloat(balance.balance) * price : 0;
          
          dashboardAssets.push({
            symbol: balance.symbol,
            name: balance.name,
            address: token.address,
            network: network,
            balance: balance.balance,
            usdValue: usdValue,
            price: price || 0,
            change24h: 0,
            changePercent: 0,
            logo: token.logo,
            chainType: chainType,
            isNative: false
          });

        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load balance for custom token ${token.symbol}:`, error);
        
        // Still add the token with 0 balance if it's enabled
        dashboardAssets.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          network: network,
          balance: '0',
          usdValue: 0,
          price: 0,
          change24h: 0,
          changePercent: 0,
          logo: token.logo,
          chainType: chainType,
          isNative: false
        });
      }
    }

    return dashboardAssets;
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load dashboard tokens:', error);
    return [];
  }
}

// Save token enabled/disabled state
export async function setTokenEnabled(tokenId: string, enabled: boolean): Promise<void> {
  try {
    const result = await storage.get([STORAGE_KEYS.ENABLED_TOKENS]);
    const enabledTokens = result[STORAGE_KEYS.ENABLED_TOKENS] || [];
    
    if (enabled) {
      // Add to enabled list if not already there
      if (!enabledTokens.includes(tokenId)) {
        enabledTokens.push(tokenId);
      }
    } else {
      // Remove from enabled list
      const index = enabledTokens.indexOf(tokenId);
      if (index > -1) {
        enabledTokens.splice(index, 1);
      }
    }
    
    await storage.set({ [STORAGE_KEYS.ENABLED_TOKENS]: enabledTokens });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to set token enabled state:', error);
    throw new Error('Failed to update token state');
  }
}

// Get all enabled tokens across all networks (for dashboard)
export async function getAllEnabledTokensWithBalances(
  walletAddress: string
): Promise<Record<string, DashboardAsset[]>> {
  try {
    const networks = Object.keys(NETWORK_CONFIG);
    const tokensByNetwork: Record<string, DashboardAsset[]> = {};
    
    // Load tokens for each network in parallel
    const networkPromises = networks.map(async (network) => {
      const assets = await loadDashboardTokens(walletAddress, network);
      return { network, assets };
    });
    
    const results = await Promise.allSettled(networkPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { network, assets } = result.value;
        if (assets.length > 0) {
          tokensByNetwork[network] = assets;
        }
      }
    });
    
    return tokensByNetwork;
    
    } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load all enabled tokens:', error);
    return {};
  }
}

// Migrate old token storage format to new format
export async function migrateTokenStorage(): Promise<void> {
  try {

    const result = await storage.get(['user_tokens', 'tokens', STORAGE_KEYS.CUSTOM_TOKENS]);
    
    // Check if we have old format tokens
    const oldUserTokens = result.user_tokens || [];
    const oldTokens = result.tokens || [];
    const newCustomTokens = result[STORAGE_KEYS.CUSTOM_TOKENS] || [];
    
    if ((oldUserTokens.length > 0 || oldTokens.length > 0) && newCustomTokens.length === 0) {

      const tokensToMigrate = [...oldUserTokens, ...oldTokens];
      const migratedTokens: PersistedToken[] = tokensToMigrate.map((token: any) => ({
        id: token.id || `migrated-${Date.now()}-${Math.random()}`,
        symbol: token.symbol || 'UNKNOWN',
        name: token.name || 'Unknown Token',
        address: token.address || '',
        network: token.network || 'ethereum',
        decimals: token.decimals || 18,
        logo: token.logo,
        isCustom: token.isCustom || true,
        isEnabled: token.isEnabled !== false,
        isAutoDetected: token.isAutoDetected || false,
        chainType: token.chainType || 'evm',
        mintAddress: token.mintAddress,
        programId: token.programId,
        assetId: token.assetId,
        addedAt: token.addedAt || Date.now()
      }));
      
      await storage.set({ [STORAGE_KEYS.CUSTOM_TOKENS]: migratedTokens });
      
      // Clean up old storage keys
      await storage.remove(['user_tokens', 'tokens']);

    }
    
    } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to migrate token storage:', error);
  }
}

// Export all tokens for backup (with balances)
export async function exportTokensWithBalances(
  walletAddress: string,
  network?: string
): Promise<{
  version: string;
  timestamp: number;
  walletAddress: string;
  network?: string;
  tokens: Array<PersistedToken & { balance?: string; usdValue?: number }>;
}> {
  try {
    const customTokens = await loadCustomTokens();
    const tokensToExport = network 
      ? customTokens.filter(t => t.network === network)
      : customTokens;
    
    // Fetch current balances for export
    const tokensWithBalances = await Promise.all(
      tokensToExport.map(async (token) => {
        try {
          const balance = await getMultiChainTokenBalance(token.address, walletAddress, token.network);
          const chainType = getChainTypeForNetwork(token.network);
          const price = await getMultiChainTokenPrice(token.address, token.network, chainType || 'other');
          
          return {
            ...token,
            balance: balance?.balance || '0',
            usdValue: balance && price ? parseFloat(balance.balance) * price : 0
          };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to get balance for ${token.symbol}:`, error);
          return {
            ...token,
            balance: '0',
            usdValue: 0
          };
        }
      })
    );
    
    return {
      version: '2.0',
      timestamp: Date.now(),
      walletAddress,
      network,
      tokens: tokensWithBalances
    };
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to export tokens with balances:', error);
    throw new Error('Export failed');
  }
}

// Clear all token-related storage (for debugging)
export async function clearAllTokenStorage(): Promise<void> {
  try {
    await storage.remove([
      STORAGE_KEYS.CUSTOM_TOKENS,
      STORAGE_KEYS.AUTO_DISCOVERED_TOKENS,
      STORAGE_KEYS.ENABLED_TOKENS,
      STORAGE_KEYS.REMOVED_DEFAULT_TOKENS,
      STORAGE_KEYS.REMOVED_AUTO_TOKENS,
      STORAGE_KEYS.TOKEN_SETTINGS,
      'user_tokens', // Legacy
      'tokens' // Legacy
    ]);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear token storage:', error);
    throw new Error('Failed to clear storage');
  }
}

// Get token statistics
export async function getTokenStatistics(): Promise<{
  totalCustomTokens: number;
  totalEnabledTokens: number;
  networkBreakdown: Record<string, number>;
  chainTypeBreakdown: Record<string, number>;
}> {
  try {
    const [customTokens, enabledResult] = await Promise.all([
      loadCustomTokens(),
      storage.get([STORAGE_KEYS.ENABLED_TOKENS])
    ]);
    
    const enabledTokenIds = enabledResult[STORAGE_KEYS.ENABLED_TOKENS] || [];
    const enabledCustomTokens = customTokens.filter(token => 
      enabledTokenIds.includes(token.id) || token.isEnabled !== false
    );
    
    const networkBreakdown: Record<string, number> = {};
    const chainTypeBreakdown: Record<string, number> = {};
    
    customTokens.forEach(token => {
      networkBreakdown[token.network] = (networkBreakdown[token.network] || 0) + 1;
      const chainType = token.chainType || 'unknown';
      chainTypeBreakdown[chainType] = (chainTypeBreakdown[chainType] || 0) + 1;
    });
    
    return {
      totalCustomTokens: customTokens.length,
      totalEnabledTokens: enabledCustomTokens.length,
      networkBreakdown,
      chainTypeBreakdown
    };
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get token statistics:', error);
    return {
      totalCustomTokens: 0,
      totalEnabledTokens: 0,
      networkBreakdown: {},
      chainTypeBreakdown: {}
    };
  }
}

// Initialize token persistence system
export async function initializeTokenPersistence(): Promise<void> {
  try {

    // Run migration if needed
    await migrateTokenStorage();
    
    // Verify storage integrity
    const customTokens = await loadCustomTokens();

    // Log network breakdown
    const stats = await getTokenStatistics();

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize token persistence:', error);
  }
}

// Import NETWORK_CONFIG to avoid circular dependency
let NETWORK_CONFIG: any;
try {
  import('./token-search-utils').then(module => {
    NETWORK_CONFIG = module.NETWORK_CONFIG;
  });
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to import NETWORK_CONFIG:', error);
  NETWORK_CONFIG = {};
}

export {
  STORAGE_KEYS
};
