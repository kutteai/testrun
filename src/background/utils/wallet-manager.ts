 
 
 
 
import { ethers } from 'ethers';
import { SecureSessionManager, storage as storageUtils } from '../../utils/storage-utils';
import { getUnifiedBrowserAPI } from '../../utils/runtime-utils';
import { storage } from './storage';
import { SecurityManager } from './security-manager';
import { AddressDerivationService } from './address-derivation';
import { addConnectedSite } from '../utils/message-handler';

class WalletManager {
  static async createWallet(password: string, seedPhrase: string, name = 'Main Account'): Promise<{success: boolean, walletId: string}> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!seedPhrase || seedPhrase.split(' ').length < 12) {
      throw new Error('Invalid seed phrase - must be at least 12 words');
    }

    try {
      let passwordHash: string;
      try {
        passwordHash = await this.generatePasswordHashViaServerless(password);
      } catch (serverlessError) {
        passwordHash = await SecurityManager.hashPassword(password);
      }

      const encryptedSeedPhrase = await SecurityManager.encrypt(seedPhrase, password);
      const addresses = await this.generateAddressesFromSeed(seedPhrase);

      const wallet = {
        id: `wallet_${Date.now()}`,
        name: SecurityManager.sanitizeInput(name),
        encryptedSeedPhrase,
        addresses,
        address: addresses.ethereum, // Maintain backward compatibility
        createdAt: Date.now(),
        version: '2.0.0',
      };

      await storage.local.set({
        wallet,
        passwordHash,
        walletState: {
          isWalletUnlocked: false,
          lastUnlockTime: null,
        },
      });

      const verifyResult = await storage.local.get(['passwordHash']);
      if (!verifyResult.passwordHash) {
        // eslint-disable-next-line no-console
        console.error('Password hash was not stored properly during wallet creation');
        throw new Error('Failed to store password hash');
      } else {
      }

      return { success: true, walletId: wallet.id };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateAddressesFromSeed(seedPhrase: string): Promise<Record<string, string>> {
    try {

      const addresses: Record<string, string> = {};

      // Generate addresses for all supported networks
      addresses.ethereum = await this.generateEthereumAddress(seedPhrase, 'ethereum');
      addresses.bitcoin = await this.generateBitcoinAddress(seedPhrase);
      addresses.litecoin = await this.generateLitecoinAddress(seedPhrase);
      addresses.solana = await this.generateSolanaAddress(seedPhrase);
      addresses.tron = await this.generateTronAddress(seedPhrase);
      addresses.ton = await this.generateTonAddress(seedPhrase);
      addresses.xrp = await this.generateXrpAddress(seedPhrase);

      // Add EVM-compatible networks (they all use the same address format)
      addresses.bsc = addresses.ethereum;
      addresses.polygon = addresses.ethereum;
      addresses.arbitrum = addresses.ethereum;
      addresses.optimism = addresses.ethereum;
      addresses.avalanche = addresses.ethereum;

      return addresses;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Address generation failed:', error);
      throw new Error(`Address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateEthereumAddress(seedPhrase: string, networkId: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Ethereum
      return await AddressDerivationService.deriveAddress(seedPhrase, 'ethereum', 0);
    } catch (error) {
      throw new Error(`Ethereum address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateBitcoinAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Bitcoin
      return await AddressDerivationService.deriveAddress(seedPhrase, 'bitcoin', 0);
    } catch (error) {
      throw new Error(`Bitcoin address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateLitecoinAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Litecoin
      return await AddressDerivationService.deriveAddress(seedPhrase, 'litecoin', 0);
    } catch (error) {
      throw new Error(`Litecoin address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateSolanaAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for Solana
      return await AddressDerivationService.deriveAddress(seedPhrase, 'solana', 0);
    } catch (error) {
      throw new Error(`Solana address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateTronAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for TRON
      return await AddressDerivationService.deriveAddress(seedPhrase, 'tron', 0);
    } catch (error) {
      throw new Error(`TRON address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateTonAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for TON
      return await AddressDerivationService.deriveAddress(seedPhrase, 'ton', 0);
    } catch (error) {
      throw new Error(`TON address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateXrpAddress(seedPhrase: string): Promise<string> {
    try {
      // Use secure BIP-39/BIP-44 derivation for XRP
      return await AddressDerivationService.deriveAddress(seedPhrase, 'xrp', 0);
    } catch (error) {
      throw new Error(`XRP address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getWalletStatus(): Promise<{hasWallet: boolean, isUnlocked: boolean, walletId: string | null, lastUnlockTime?: number | null}> {
    try {
      const result = await storage.local.get(['wallet', 'walletState']);
      const { wallet } = result;
      const { walletState } = result;

      return {
        hasWallet: !!wallet,
        isUnlocked: walletState?.isWalletUnlocked || false,
        walletId: wallet?.id || null,
        lastUnlockTime: walletState?.lastUnlockTime || null,
      };
    } catch (error) {
      return {
        hasWallet: false,
        isUnlocked: false,
        walletId: null,
      };
    }
  }

  static async unlockWallet(password: string): Promise<{success: boolean}> {
    if (!password) {
      throw new Error('Password is required');
    }

    try {

      const result = await storage.local.get(['wallet', 'passwordHash']);
      const { wallet } = result;
      const storedPasswordHash = result.passwordHash;

      if (!wallet) {
        throw new Error('No wallet found');
      }

      let unlockSuccess = false;

      // Method 1: Hash verification
      if (storedPasswordHash) {
        const generatedHash = await SecurityManager.hashPassword(password);
        if (generatedHash === storedPasswordHash) {
          unlockSuccess = true;
        }
      }

      // Method 2: Seed phrase decryption verification
      if (!unlockSuccess && wallet.encryptedSeedPhrase) {
        try {
          const decryptedSeed = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
          if (decryptedSeed && decryptedSeed.length > 0) {
            const words = decryptedSeed.trim().split(' ');
            if (words.length >= 12 && words.length <= 24) {
              unlockSuccess = true;

              // Regenerate password hash if missing
              if (!storedPasswordHash) {
                const newHash = await SecurityManager.hashPassword(password);
                await storage.local.set({ passwordHash: newHash });
              }
            }
          }
        } catch (decryptError) {
        }
      }

      if (unlockSuccess) {
        // Create session with enhanced persistence
        await SecureSessionManager.createSession(password);

        // Update wallet state
        // SECURITY FIX: Never store passwords in plaintext
        await storage.local.set({
          walletState: {
            isWalletUnlocked: true,
            lastUnlockTime: Date.now(),
            // tempPassword removed for security
          },
        });


        // Process any pending dApp requests after successful unlock
        await this.processPendingDAppRequests();

        return { success: true };
      }
      throw new Error('Invalid password');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Wallet unlock failed:', error);
      throw error;
    }
  }

  // Process pending dApp requests after wallet unlock
  static async processPendingDAppRequests(): Promise<void> {
    try {
      const result = await storage.local.get(['pendingDAppRequest']);
      const pendingRequest = result.pendingDAppRequest;

      if (pendingRequest) {

        // Check if request is not too old (max 5 minutes)
        const requestAge = Date.now() - pendingRequest.timestamp;
        if (requestAge > 5 * 60 * 1000) {
          await storage.local.remove('pendingDAppRequest');
          return;
        }

        // Get accounts to return to dApp
        const accounts = await this.getAccounts();
        const accountAddresses = accounts.map((acc) => acc.address);

        // Store connection
        if (pendingRequest.origin && accountAddresses.length > 0) {
          await addConnectedSite(pendingRequest.origin, accountAddresses);
        }

        // Clear pending request
        await storage.local.remove('pendingDAppRequest');

        // Notify content script to update dApp
        try {
          const unifiedBrowserAPI = getUnifiedBrowserAPI();
          const tabs = await (unifiedBrowserAPI.tabs as any).query({});
          for (const tab of tabs) {
            if (tab.url && tab.url.startsWith(pendingRequest.origin)) {
              await (unifiedBrowserAPI.tabs as any).sendMessage(tab.id, {
                type: 'PAYCIO_ACCOUNTS_CHANGED',
                accounts: accountAddresses,
              });
            }
          }
        } catch (notifyError) {
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to process pending dApp requests:', error);
    }
  }

  static async lockWallet(): Promise<{success: boolean}> {
    try {

      // Clear persistent session data (password, session info)
      await SecureSessionManager.destroySession();

      // Update wallet state to locked (preserves wallet data)
      await storage.local.set({
        walletState: {
          isWalletUnlocked: false,
          lastUnlockTime: null,
        },
      });

      return { success: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Background: Failed to lock wallet:', error);
      throw error;
    }
  }

  // Enhanced network switching with proper address derivation
  static async switchNetwork(networkId: string): Promise<{success: boolean, data: any}> {
    try {

      const result = await storage.local.get(['wallet', 'walletState']);
      const { wallet } = result;
      const { walletState } = result;

      if (!wallet) {
        throw new Error('No wallet found');
      }

      if (!walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked');
      }

      // Check if address already exists
      if (wallet.addresses && wallet.addresses[networkId]) {
        const address = wallet.addresses[networkId];

        // Update current network
        const updatedWallet = { ...wallet, currentNetwork: networkId, address };

        // Also update the current account's addresses if it exists
        if (wallet.accounts && wallet.accounts.length > 0) {
          const currentAccount = wallet.accounts.find((acc) => acc.isActive) || wallet.accounts[0];
          if (currentAccount && typeof currentAccount === 'object') {
            currentAccount.addresses = { ...currentAccount.addresses, [networkId]: address };
            currentAccount.address = address; // Update the main address field too
          }
        }

        await storage.local.set({ wallet: updatedWallet });

        // Notify DApps about the network change
        await this.notifyDAppsOfNetworkChange(networkId, address);

        return {
          success: true,
          data: { networkId, address },
        };
      }

      // Derive new address
      // SECURITY FIX: Use secure session-based authentication
      const sessionResult = await storageUtils.getSession(['sessionPassword']);
      const password = sessionResult.sessionPassword;

      if (!password) {
        throw new Error('Session expired - please unlock wallet again');
      }

      const seedPhrase = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);
      const newAddress = await AddressDerivationService.deriveAddress(seedPhrase, networkId);

      // Update wallet
      const updatedAddresses = { ...wallet.addresses, [networkId]: newAddress };
      const updatedWallet = {
        ...wallet,
        addresses: updatedAddresses,
        currentNetwork: networkId,
        address: newAddress,
      };

      // Also update the current account's addresses if it exists
      if (wallet.accounts && wallet.accounts.length > 0) {
        const currentAccount = wallet.accounts.find((acc) => acc.isActive) || wallet.accounts[0];
        if (currentAccount && typeof currentAccount === 'object') {
          currentAccount.addresses = { ...currentAccount.addresses, [networkId]: newAddress };
          currentAccount.address = newAddress; // Update the main address field too
        }
      }

      await storage.local.set({ wallet: updatedWallet });

      // Notify DApps about the network change
      await this.notifyDAppsOfNetworkChange(networkId, newAddress);


      return {
        success: true,
        data: { networkId, address: newAddress },
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Network switch failed:', error);
      throw error;
    }
  }

  // Notify DApps about network changes
  private static async notifyDAppsOfNetworkChange(networkId: string, address: string): Promise<void> {
    try {
      // Get chain ID for the network
      const chainIdMap: Record<string, string> = {
        ethereum: '0x1',
        polygon: '0x89',
        bsc: '0x38',
        arbitrum: '0xa4b1',
        optimism: '0xa',
        avalanche: '0xa86a',
        base: '0x2105',
        fantom: '0xfa',
      };

      const chainId = chainIdMap[networkId] || '0x1';
      const networkVersion = parseInt(chainId, 16).toString();

      // Send message to all tabs with PayCio provider
      const unifiedBrowserAPI = getUnifiedBrowserAPI();
      const tabs = await (unifiedBrowserAPI.tabs as any).query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await (unifiedBrowserAPI.tabs as any).sendMessage(tab.id, {
              type: 'PAYCIO_CHAIN_CHANGED',
              chainId,
              networkVersion,
              networkId,
              address,
            });
          } catch (error) {
            // Tab might not have content script, ignore
          }
        }
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to notify DApps of network change:', error);
    }
  }

  static async getAccounts(): Promise<any[]> {
    try {
      const result = await storage.local.get(['wallet', 'walletState']);
      const { wallet } = result;
      const { walletState } = result;


      if (!wallet) {
        return [];
      }

      if (!walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked');
      }

      const accounts = [];

      if (wallet.addresses && typeof wallet.addresses === 'object') {
        for (const [network, address] of Object.entries(wallet.addresses)) {
          accounts.push({
            id: `${wallet.id}_${network}`,
            name: `${wallet.name} (${network.toUpperCase()})`,
            address,
            network,
          });
        }
      } else if (wallet.address) {
        accounts.push({
          id: `${wallet.id}_ethereum`,
          name: wallet.name || 'Main Account',
          address: wallet.address,
          network: 'ethereum',
        });
      }

      return accounts;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('getAccounts error:', error);
      throw new Error(`Failed to get accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getCurrentAccount(network = 'ethereum'): Promise<any> {
    const accounts = await this.getAccounts();
    return accounts.find((account) => account.network === network) || accounts[0] || null;
  }

  static async getCurrentAddress(): Promise<string> {
    const walletStatus = await this.getWalletStatus();
    if (walletStatus.isUnlocked && walletStatus.walletId) {
      const result = await storage.local.get(['wallet']);
      const { wallet } = result;
      if (wallet && wallet.addresses && wallet.currentNetwork) {
        return wallet.addresses[wallet.currentNetwork] || wallet.address || '';
      }
    }
    return '';
  }

  static async getCurrentChainId(): Promise<string> {
    const walletStatus = await this.getWalletStatus();
    if (walletStatus.isUnlocked && walletStatus.walletId) {
      const result = await storage.local.get(['wallet']);
      const { wallet } = result;
      if (wallet && wallet.currentNetwork) {
        // This needs to be more robust, potentially map network name to chainId
        switch (wallet.currentNetwork) {
          case 'ethereum': return '0x1';
          case 'polygon': return '0x89';
          case 'bsc': return '0x38';
          case 'arbitrum': return '0xa4b1';
          case 'optimism': return '0xa';
          case 'avalanche': return '0xa86a';
          case 'base': return '0x2105';
          case 'fantom': return '0xfa';
          default: return '0x1'; // Default to Ethereum
        }
      }
    }
    return '0x1'; // Default to Ethereum
  }

  static async getCurrentNetwork(): Promise<any> {
    const walletStatus = await this.getWalletStatus();
    if (walletStatus.isUnlocked && walletStatus.walletId) {
      const result = await storage.local.get(['wallet']);
      const { wallet } = result;
      if (wallet && wallet.currentNetwork) {
        return { id: wallet.currentNetwork, name: wallet.currentNetwork.charAt(0).toUpperCase() + wallet.currentNetwork.slice(1) };
      }
    }
    return { id: 'ethereum', name: 'Ethereum' };
  }

  static async getCurrentWallet(): Promise<any> {
    const walletStatus = await this.getWalletStatus();
    if (walletStatus.isUnlocked && walletStatus.walletId) {
      const result = await storage.local.get(['wallet']);
      return result.wallet;
    }
    return null;
  }

  // Add Network (dummy implementation for now)
  static async addNetwork(networkConfig: any): Promise<void> {
    // In a real scenario, you'd add this to a list of custom networks in storage
  }

  // Serverless integration methods
  static async generatePasswordHashViaServerless(password: string): Promise<string> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hash',
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serverless hash generation failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Serverless hash generation failed');
      }

      return data.result.hash;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Serverless password hash generation error:', error);
      throw error;
    }
  }

  static async verifyPasswordViaServerless(password: string, storedHash: string): Promise<boolean> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          password,
          storedHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serverless verification failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Serverless verification failed');
      }

      return data.result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Serverless password verification error:', error);
      throw error;
    }
  }

  static async diagnosePasswordViaServerless(password: string, diagnosticData: any): Promise<any> {
    try {
      const response = await fetch('https://ext-wallet.netlify.app/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'diagnose',
          password,
          ...diagnosticData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serverless diagnosis failed: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.result : { error: data.error };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Serverless password diagnosis error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export { WalletManager };
