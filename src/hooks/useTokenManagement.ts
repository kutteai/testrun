import { useState, useEffect, useCallback } from 'react';
import { tokenManagementService, AccountToken, AccountTokenData } from '../services/token-management-service';
import { tokenSearchAPI, TokenSearchResult } from '../services/token-search-api';

export interface UseTokenManagementReturn {
  // State
  tokens: AccountToken[];
  loading: boolean;
  error: string | null;
  searchResults: TokenSearchResult[];
  searchLoading: boolean;
  
  // Actions
  searchTokens: (query: string, network: string) => Promise<void>;
  addToken: (network: string, token: TokenSearchResult) => Promise<void>;
  removeToken: (network: string, tokenAddress: string) => Promise<void>;
  setTokenEnabled: (network: string, tokenAddress: string, enabled: boolean) => Promise<void>;
  refreshTokens: () => Promise<void>;
  
  // Data
  getTokensForNetwork: (network: string) => AccountToken[];
  getEnabledTokensForNetwork: (network: string) => AccountToken[];
  getTokenStats: () => Promise<{
    totalTokens: number;
    networksCount: number;
    enabledTokens: number;
    networks: Record<string, { total: number; enabled: number }>;
  }>;
}

/**
 * Hook for managing tokens by account and network
 */
export function useTokenManagement(accountId: string): UseTokenManagementReturn {
  const [tokens, setTokens] = useState<AccountToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load tokens for account
  const loadTokens = useCallback(async () => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const accountData = await tokenManagementService.getAccountTokens(accountId);
      if (accountData) {
        // Flatten all tokens from all networks
        const allTokens: AccountToken[] = [];
        for (const networkData of Object.values(accountData.networks)) {
          allTokens.push(...networkData.tokens);
        }
        setTokens(allTokens);
      } else {
        setTokens([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Search for tokens
  const searchTokens = useCallback(async (query: string, network: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    setError(null);
    
    try {
      const results = await tokenSearchAPI.searchTokens(query, {
        network,
        limit: 10,
        includeUnverified: false
      });
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search tokens');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Add token to account
  const addToken = useCallback(async (network: string, token: TokenSearchResult) => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await tokenManagementService.addTokenToAccount(accountId, network, token);
      await loadTokens(); // Refresh tokens
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add token');
    } finally {
      setLoading(false);
    }
  }, [accountId, loadTokens]);

  // Remove token from account
  const removeToken = useCallback(async (network: string, tokenAddress: string) => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await tokenManagementService.removeTokenFromAccount(accountId, network, tokenAddress);
      await loadTokens(); // Refresh tokens
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove token');
    } finally {
      setLoading(false);
    }
  }, [accountId, loadTokens]);

  // Set token enabled/disabled
  const setTokenEnabled = useCallback(async (network: string, tokenAddress: string, enabled: boolean) => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await tokenManagementService.setTokenEnabled(accountId, network, tokenAddress, enabled);
      await loadTokens(); // Refresh tokens
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update token');
    } finally {
      setLoading(false);
    }
  }, [accountId, loadTokens]);

  // Refresh tokens
  const refreshTokens = useCallback(async () => {
    await loadTokens();
  }, [loadTokens]);

  // Get tokens for specific network
  const getTokensForNetwork = useCallback((network: string): AccountToken[] => {
    return tokens.filter(token => token.network === network);
  }, [tokens]);

  // Get enabled tokens for specific network
  const getEnabledTokensForNetwork = useCallback((network: string): AccountToken[] => {
    return tokens.filter(token => token.network === network && token.isEnabled);
  }, [tokens]);

  // Get token statistics
  const getTokenStats = useCallback(async () => {
    if (!accountId) {
      return {
        totalTokens: 0,
        networksCount: 0,
        enabledTokens: 0,
        networks: {}
      };
    }
    
    try {
      return await tokenManagementService.getAccountTokenStats(accountId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to get token stats:', err);
      return {
        totalTokens: 0,
        networksCount: 0,
        enabledTokens: 0,
        networks: {}
      };
    }
  }, [accountId]);

  // Load tokens on mount and when accountId changes
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return {
    // State
    tokens,
    loading,
    error,
    searchResults,
    searchLoading,
    
    // Actions
    searchTokens,
    addToken,
    removeToken,
    setTokenEnabled,
    refreshTokens,
    
    // Data
    getTokensForNetwork,
    getEnabledTokensForNetwork,
    getTokenStats
  };
}

/**
 * Hook for managing tokens for a specific network
 */
export function useNetworkTokens(accountId: string, network: string) {
  const tokenManagement = useTokenManagement(accountId);
  
  const networkTokens = tokenManagement.getTokensForNetwork(network);
  const enabledTokens = tokenManagement.getEnabledTokensForNetwork(network);
  
  return {
    ...tokenManagement,
    networkTokens,
    enabledTokens
  };
}
