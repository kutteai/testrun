import { storage } from '../utils/storage-utils';
import { tokenSearchAPI, TokenSearchResult } from './token-search-api';

export interface AccountToken {
  id: string;
  accountId: string;
  network: string;
  token: TokenSearchResult;
  isEnabled: boolean;
  addedAt: number;
  lastUpdated: number;
}

export interface NetworkTokens {
  network: string;
  tokens: AccountToken[];
  lastUpdated: number;
}

export interface AccountTokenData {
  accountId: string;
  networks: Record<string, NetworkTokens>;
  lastUpdated: number;
}

/**
 * Token Management Service - Organizes tokens by account and network
 */
export class TokenManagementService {
  private readonly STORAGE_KEY = 'accountTokens';
  private readonly CACHE_DURATION = 300000; // 5 minutes

  /**
   * Get all tokens for a specific account
   */
  async getAccountTokens(accountId: string): Promise<AccountTokenData | null> {
    try {
      const result = await storage.get([this.STORAGE_KEY]);
      const allAccountTokens = result[this.STORAGE_KEY] || {};
      return allAccountTokens[accountId] || null;
    } catch (error) {
      console.error('Failed to get account tokens:', error);
      return null;
    }
  }

  /**
   * Get tokens for a specific account and network
   */
  async getAccountNetworkTokens(
    accountId: string, 
    network: string
  ): Promise<AccountToken[]> {
    try {
      const accountData = await this.getAccountTokens(accountId);
      if (!accountData) return [];

      const networkTokens = accountData.networks[network];
      return networkTokens?.tokens || [];
    } catch (error) {
      console.error('Failed to get account network tokens:', error);
      return [];
    }
  }

  /**
   * Add token to account for specific network
   */
  async addTokenToAccount(
    accountId: string,
    network: string,
    token: TokenSearchResult
  ): Promise<void> {
    try {
      const accountData = await this.getAccountTokens(accountId) || {
        accountId,
        networks: {},
        lastUpdated: Date.now()
      };

      // Initialize network if not exists
      if (!accountData.networks[network]) {
        accountData.networks[network] = {
          network,
          tokens: [],
          lastUpdated: Date.now()
        };
      }

      // Check if token already exists
      const existingToken = accountData.networks[network].tokens.find(
        t => t.token.address.toLowerCase() === token.address.toLowerCase()
      );

      if (existingToken) {
        throw new Error('Token already exists in this account');
      }

      // Create new account token
      const accountToken: AccountToken = {
        id: `${accountId}_${network}_${token.address}`,
        accountId,
        network,
        token,
        isEnabled: true,
        addedAt: Date.now(),
        lastUpdated: Date.now()
      };

      // Add to network tokens
      accountData.networks[network].tokens.push(accountToken);
      accountData.networks[network].lastUpdated = Date.now();
      accountData.lastUpdated = Date.now();

      // Save to storage
      await this.saveAccountTokens(accountId, accountData);
      
      console.log(`✅ Added token ${token.symbol} to account ${accountId} on ${network}`);
    } catch (error) {
      console.error('Failed to add token to account:', error);
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
      const accountData = await this.getAccountTokens(accountId);
      if (!accountData || !accountData.networks[network]) {
        throw new Error('Token not found');
      }

      // Remove token from network
      accountData.networks[network].tokens = accountData.networks[network].tokens.filter(
        t => t.token.address.toLowerCase() !== tokenAddress.toLowerCase()
      );
      accountData.networks[network].lastUpdated = Date.now();
      accountData.lastUpdated = Date.now();

      // Save to storage
      await this.saveAccountTokens(accountId, accountData);
      
      console.log(`✅ Removed token ${tokenAddress} from account ${accountId} on ${network}`);
    } catch (error) {
      console.error('Failed to remove token from account:', error);
      throw error;
    }
  }

  /**
   * Enable/disable token for account
   */
  async setTokenEnabled(
    accountId: string,
    network: string,
    tokenAddress: string,
    enabled: boolean
  ): Promise<void> {
    try {
      const accountData = await this.getAccountTokens(accountId);
      if (!accountData || !accountData.networks[network]) {
        throw new Error('Token not found');
      }

      const token = accountData.networks[network].tokens.find(
        t => t.token.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (!token) {
        throw new Error('Token not found');
      }

      token.isEnabled = enabled;
      token.lastUpdated = Date.now();
      accountData.networks[network].lastUpdated = Date.now();
      accountData.lastUpdated = Date.now();

      await this.saveAccountTokens(accountId, accountData);
      
      console.log(`✅ ${enabled ? 'Enabled' : 'Disabled'} token ${tokenAddress} for account ${accountId}`);
    } catch (error) {
      console.error('Failed to set token enabled:', error);
      throw error;
    }
  }

  /**
   * Get enabled tokens for account and network
   */
  async getEnabledTokens(
    accountId: string,
    network: string
  ): Promise<AccountToken[]> {
    try {
      const tokens = await this.getAccountNetworkTokens(accountId, network);
      return tokens.filter(token => token.isEnabled);
    } catch (error) {
      console.error('Failed to get enabled tokens:', error);
      return [];
    }
  }

  /**
   * Search and add token to account
   */
  async searchAndAddToken(
    accountId: string,
    network: string,
    query: string
  ): Promise<TokenSearchResult[]> {
    try {
      // Search for tokens
      const searchResults = await tokenSearchAPI.searchTokens(query, {
        network,
        limit: 10,
        includeUnverified: false
      });

      return searchResults;
    } catch (error) {
      console.error('Failed to search tokens:', error);
      return [];
    }
  }

  /**
   * Get all accounts with their token data
   */
  async getAllAccountsTokenData(): Promise<Record<string, AccountTokenData>> {
    try {
      const result = await storage.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || {};
    } catch (error) {
      console.error('Failed to get all accounts token data:', error);
      return {};
    }
  }

  /**
   * Get token statistics for account
   */
  async getAccountTokenStats(accountId: string): Promise<{
    totalTokens: number;
    networksCount: number;
    enabledTokens: number;
    networks: Record<string, { total: number; enabled: number }>;
  }> {
    try {
      const accountData = await this.getAccountTokens(accountId);
      if (!accountData) {
        return {
          totalTokens: 0,
          networksCount: 0,
          enabledTokens: 0,
          networks: {}
        };
      }

      let totalTokens = 0;
      let enabledTokens = 0;
      const networks: Record<string, { total: number; enabled: number }> = {};

      for (const [network, networkData] of Object.entries(accountData.networks)) {
        const total = networkData.tokens.length;
        const enabled = networkData.tokens.filter(t => t.isEnabled).length;
        
        totalTokens += total;
        enabledTokens += enabled;
        networks[network] = { total, enabled };
      }

      return {
        totalTokens,
        networksCount: Object.keys(accountData.networks).length,
        enabledTokens,
        networks
      };
    } catch (error) {
      console.error('Failed to get account token stats:', error);
      return {
        totalTokens: 0,
        networksCount: 0,
        enabledTokens: 0,
        networks: {}
      };
    }
  }

  /**
   * Clean up old tokens (remove tokens not updated in 30 days)
   */
  async cleanupOldTokens(accountId: string, daysOld: number = 30): Promise<void> {
    try {
      const accountData = await this.getAccountTokens(accountId);
      if (!accountData) return;

      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let hasChanges = false;

      for (const [network, networkData] of Object.entries(accountData.networks)) {
        const originalLength = networkData.tokens.length;
        networkData.tokens = networkData.tokens.filter(
          token => token.lastUpdated > cutoffTime
        );
        
        if (networkData.tokens.length !== originalLength) {
          hasChanges = true;
          networkData.lastUpdated = Date.now();
        }
      }

      if (hasChanges) {
        accountData.lastUpdated = Date.now();
        await this.saveAccountTokens(accountId, accountData);
        console.log(`✅ Cleaned up old tokens for account ${accountId}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old tokens:', error);
    }
  }

  /**
   * Export account tokens data
   */
  async exportAccountTokens(accountId: string): Promise<AccountTokenData | null> {
    try {
      return await this.getAccountTokens(accountId);
    } catch (error) {
      console.error('Failed to export account tokens:', error);
      return null;
    }
  }

  /**
   * Import account tokens data
   */
  async importAccountTokens(accountId: string, data: AccountTokenData): Promise<void> {
    try {
      await this.saveAccountTokens(accountId, data);
      console.log(`✅ Imported tokens for account ${accountId}`);
    } catch (error) {
      console.error('Failed to import account tokens:', error);
      throw error;
    }
  }

  /**
   * Save account tokens to storage
   */
  private async saveAccountTokens(accountId: string, data: AccountTokenData): Promise<void> {
    try {
      const result = await storage.get([this.STORAGE_KEY]);
      const allAccountTokens = result[this.STORAGE_KEY] || {};
      allAccountTokens[accountId] = data;
      
      await storage.set({ [this.STORAGE_KEY]: allAccountTokens });
    } catch (error) {
      console.error('Failed to save account tokens:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenManagementService = new TokenManagementService();
