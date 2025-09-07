import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { encryptData, decryptData } from '../utils/crypto-utils';
import { deriveWalletFromSeed, deriveAccountFromSeed } from '../utils/key-derivation';
import { storage } from '../utils/storage-utils';
import type { WalletData, WalletAccount } from '../types/index';


// Internal wallet data structure for storage
interface InternalWalletData {
  id: string;
  name: string;
  address: string;
  seedPhrase: string;
  privateKey: string;
  publicKey: string;
  network: string;
  currentNetwork: string;
  derivationPath: string;
  createdAt: number;
  encryptedSeedPhrase: string;
  accounts: WalletAccount[];
  lastAccessed: number;
}

export interface CreateWalletRequest {
  name: string;
  password: string;
  network: string;
  accountCount?: number;
}

export interface ImportWalletRequest {
  name: string;
  seedPhrase: string;
  password: string;
  network: string;
  accountCount?: number;
}

export class WalletManager {
  private wallets: InternalWalletData[] = [];
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  // Initialize the wallet manager
  private async initialize(): Promise<void> {
    await this.loadWallets();
    this.initialized = true;
  }

  // Load wallets from storage
  private async loadWallets(): Promise<void> {
    try {
      const result = await storage.get(['wallets']);
      if (result.wallets) {
        this.wallets = result.wallets;
      }
    } catch (error) {
      // console.error('Failed to load wallets:', error);
      throw error;
    }
  }

  // Save wallets to storage
  private async saveWallets(): Promise<void> {
    try {
      await storage.set({ wallets: this.wallets });
    } catch (error) {
      // console.error('Failed to save wallets:', error);
      throw error;
    }
  }

  // Ensure wallets are loaded before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Generate a real seed phrase using BIP39
  private generateSeedPhrase(): string {
    // Generate 128 bits (12 words) of entropy
    const entropy = ethers.randomBytes(16);
    return bip39.entropyToMnemonic(ethers.hexlify(entropy));
  }

  // Validate seed phrase
  private validateSeedPhrase(seedPhrase: string): boolean {
    return bip39.validateMnemonic(seedPhrase);
  }

  // Create a new wallet with real seed phrase generation
  async createWallet(request: CreateWalletRequest): Promise<WalletData> {
    try {
      // Generate real seed phrase
      const seedPhrase = this.generateSeedPhrase();
      
      // Encrypt seed phrase
      const encryptedSeedPhrase = await encryptData(seedPhrase, request.password);
      
      // Derive wallet accounts
      const accounts = await this.deriveAccounts(seedPhrase, request.network, request.accountCount || 1);
      
      // Get the first account for the main wallet properties
      const firstAccount = accounts[0];
      
      const wallet: InternalWalletData = {
        id: Date.now().toString(),
        name: request.name,
        address: firstAccount.addresses[request.network] || Object.values(firstAccount.addresses)[0],
        seedPhrase: seedPhrase,
        privateKey: firstAccount.privateKey,
        publicKey: firstAccount.publicKey,
        network: request.network,
        currentNetwork: request.network,
        derivationPath: firstAccount.derivationPath,
        createdAt: Date.now(),
        encryptedSeedPhrase: encryptedSeedPhrase,
        accounts: accounts,
        lastAccessed: Date.now()
      };

      this.wallets.push(wallet);
      await this.saveWallets();

      return this.convertToWalletData(wallet);
    } catch (error) {
      // console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  // Convert internal wallet data to public WalletData format
  private convertToWalletData(wallet: InternalWalletData): WalletData {
    return {
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      encryptedSeedPhrase: wallet.encryptedSeedPhrase,
      decryptPrivateKey: async (password: string) => {
        // This method should be implemented by the calling code
        throw new Error('decryptPrivateKey not implemented in wallet manager');
      },
      accounts: wallet.accounts, // Keep full account objects instead of just addresses
      networks: [wallet.network],
      currentNetwork: wallet.currentNetwork,
      derivationPath: wallet.derivationPath,
      balance: wallet.accounts[0]?.balances?.[wallet.currentNetwork] || '0',
      createdAt: wallet.createdAt,
      lastUsed: wallet.lastAccessed
    };
  }

  // Derive accounts from seed phrase
  private async deriveAccounts(seedPhrase: string, network: string, count: number): Promise<WalletAccount[]> {
    const accounts: WalletAccount[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const derivationPath = `m/44'/60'/0'/0/${i}`; // BIP44 path for Ethereum
        const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);
        
        const account: WalletAccount = {
          id: `${Date.now()}-${i}`,
          name: `Account ${i + 1}`,
          addresses: {
            [network]: walletData.address
          },
          privateKey: walletData.privateKey,
          publicKey: walletData.publicKey,
          derivationPath: derivationPath,
          networks: [network],
          balances: {
            [network]: '0'
          },
          nonces: {
            [network]: 0
          },
          createdAt: Date.now(),
          encryptedSeedPhrase: '', // Will be set by the wallet's encrypted seed phrase
          isActive: i === 0 // First account is active
        };

        accounts.push(account);
      } catch (error) {
        // console.error(`Failed to derive account ${i}:`, error);
      }
    }
    
    return accounts;
  }

  // Import wallet from seed phrase
  async importWallet(request: ImportWalletRequest): Promise<WalletData> {
    try {
      // Validate seed phrase
      if (!this.validateSeedPhrase(request.seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Encrypt seed phrase
      const encryptedSeedPhrase = await encryptData(request.seedPhrase, request.password);
      
      // Derive wallet accounts
      const accounts = await this.deriveAccounts(request.seedPhrase, request.network, request.accountCount || 1);
      
      // Get the first account for the main wallet properties
      const firstAccount = accounts[0];
      
      const wallet: InternalWalletData = {
        id: Date.now().toString(),
        name: request.name,
        address: firstAccount.addresses[request.network] || Object.values(firstAccount.addresses)[0],
        seedPhrase: request.seedPhrase,
        privateKey: firstAccount.privateKey,
        publicKey: firstAccount.publicKey,
        network: request.network,
        currentNetwork: request.network,
        derivationPath: firstAccount.derivationPath,
        createdAt: Date.now(),
        encryptedSeedPhrase: encryptedSeedPhrase,
        accounts: accounts,
        lastAccessed: Date.now()
      };

      this.wallets.push(wallet);
      await this.saveWallets();

      return this.convertToWalletData(wallet);
    } catch (error) {
      // console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  // Get internal wallet by ID
  private async getInternalWallet(id: string): Promise<InternalWalletData | undefined> {
    await this.ensureInitialized();
    return this.wallets.find(wallet => wallet.id === id);
  }

  // Get wallet by ID (public interface)
  async getWallet(id: string): Promise<WalletData | undefined> {
    const wallet = await this.getInternalWallet(id);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Get all wallets (public interface)
  async getAllWallets(): Promise<WalletData[]> {
    await this.ensureInitialized();
    return this.wallets.map(wallet => this.convertToWalletData(wallet));
  }

  // Get wallet by name
  getWalletByName(name: string): WalletData | undefined {
    const wallet = this.wallets.find(wallet => wallet.name === name);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Get wallet accounts
  async getWalletAccounts(walletId: string): Promise<WalletAccount[]> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) return [];
    
    // Check if accounts need migration from old format
    const needsMigration = wallet.accounts.some(acc => typeof acc === 'string' || (acc && typeof acc === 'object' && !acc.addresses));
    
    if (needsMigration) {
      console.log('🔧 WalletManager: Migrating accounts from old format to new format');
      await this.migrateAccounts(wallet);
    }
    
    // Safety check: ensure accounts are properly formatted objects, not strings
    const validAccounts = wallet.accounts.filter(acc => {
      if (typeof acc === 'string') {
        return false; // Filter out string accounts
      }
      return acc && typeof acc === 'object' && acc.addresses && Object.keys(acc.addresses).length > 0;
    });
    
    // Return empty array if no valid accounts found
    if (validAccounts.length === 0) {
      // console.log('⚠️ WalletManager: No valid accounts found');
      return [];
    }
    
    return validAccounts;
  }

  // Migrate accounts from old format to new format
  private async migrateAccounts(wallet: InternalWalletData): Promise<void> {
    const migratedAccounts: WalletAccount[] = [];
    
    for (let i = 0; i < wallet.accounts.length; i++) {
      const acc = wallet.accounts[i];
      
      if (typeof acc === 'string') {
        // Convert string address to proper account object
        const migratedAccount: WalletAccount = {
          id: `${wallet.id}-${i}`,
          name: `Account ${i + 1}`,
          addresses: {
            [wallet.currentNetwork]: acc
          },
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          derivationPath: wallet.derivationPath,
          networks: [wallet.currentNetwork],
          balances: {
            [wallet.currentNetwork]: '0'
          },
          nonces: {
            [wallet.currentNetwork]: 0
          },
          createdAt: wallet.createdAt,
          encryptedSeedPhrase: wallet.encryptedSeedPhrase,
          isActive: i === 0
        };
        migratedAccounts.push(migratedAccount);
      } else if (acc && typeof acc === 'object' && !acc.addresses) {
        // Convert old object format to new format
        const migratedAccount: WalletAccount = {
          id: acc.id || `${wallet.id}-${i}`,
          name: acc.name || `Account ${i + 1}`,
          addresses: {
            [wallet.currentNetwork]: Object.values(acc.addresses || {})[0] || wallet.address
          },
          privateKey: acc.privateKey || wallet.privateKey,
          publicKey: acc.publicKey || wallet.publicKey,
          derivationPath: acc.derivationPath || wallet.derivationPath,
          networks: [wallet.currentNetwork],
          balances: {
            [wallet.currentNetwork]: acc.balances?.[wallet.currentNetwork] || '0'
          },
          nonces: {
            [wallet.currentNetwork]: acc.nonces?.[wallet.currentNetwork] || 0
          },
          createdAt: acc.createdAt || wallet.createdAt,
          encryptedSeedPhrase: acc.encryptedSeedPhrase || wallet.encryptedSeedPhrase,
          isActive: i === 0
        };
        migratedAccounts.push(migratedAccount);
      } else {
        // Account is already in correct format
        migratedAccounts.push(acc as WalletAccount);
      }
    }
    
    // Update wallet with migrated accounts
    wallet.accounts = migratedAccounts;
    await this.saveWallets();
    console.log('✅ WalletManager: Accounts migrated successfully');
  }

  // Get account by address on specific network
  async getAccountByAddress(address: string, network?: string): Promise<WalletAccount | undefined> {
    await this.ensureInitialized();
    for (const wallet of this.wallets) {
      const account = wallet.accounts.find(acc => {
        if (network) {
          return acc.addresses[network]?.toLowerCase() === address.toLowerCase();
        }
        // If no network specified, check all networks
        return Object.values(acc.addresses).some(addr => addr.toLowerCase() === address.toLowerCase());
      });
      if (account) return account;
    }
    return undefined;
  }

  // Get account address for specific network
  async getAccountAddressForNetwork(accountId: string, network: string): Promise<string | undefined> {
    await this.ensureInitialized();
    const allAccounts = this.wallets.flatMap(wallet => wallet.accounts);
    const account = allAccounts.find(acc => acc.id === accountId);
    return account?.addresses[network];
  }

  // Add network to existing account
  async addNetworkToAccount(accountId: string, network: string, address: string): Promise<void> {
    await this.ensureInitialized();
    console.log(`🔄 WalletManager.addNetworkToAccount called:`, { accountId, network, address });
    
    const wallet = this.wallets.find(w => w.accounts.some(acc => acc.id === accountId));
    if (wallet) {
      console.log(`✅ Found wallet for account ${accountId}`);
      const account = wallet.accounts.find(acc => acc.id === accountId);
      if (account) {
        console.log(`✅ Found account ${accountId}, current addresses:`, account.addresses);
        console.log(`✅ Found account ${accountId}, current networks:`, account.networks);
        
        // Check if network already exists
        if (account.networks.includes(network)) {
          console.log(`⚠️ Network ${network} already exists in account, updating address only`);
          account.addresses[network] = address;
        } else {
          console.log(`➕ Adding new network ${network} to account`);
          account.addresses[network] = address;
          account.networks.push(network);
        }
        
        account.balances[network] = '0';
        account.nonces[network] = 0;
        
        console.log(`✅ After update - addresses:`, account.addresses);
        console.log(`✅ After update - networks:`, account.networks);
        
        await this.saveWallets();
        console.log(`✅ Wallets saved successfully`);
      } else {
        console.error(`❌ Account ${accountId} not found in wallet`);
      }
    } else {
      console.error(`❌ Wallet not found for account ${accountId}`);
    }
  }

  // Get account private key securely
  async getAccountPrivateKey(walletId: string, accountId: string, password: string): Promise<string | null> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Find the account
      const account = wallet.accounts.find(acc => acc.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Verify password by decrypting the account's seed phrase
      const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);
      if (!seedPhrase) {
        throw new Error('Invalid password');
      }

      return account.privateKey;
    } catch (error) {
      // console.error('Failed to get account private key:', error);
      return null;
    }
  }

  // Get account seed phrase securely
  async getAccountSeedPhrase(walletId: string, accountId: string, password: string): Promise<string | null> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Find the account
      const account = wallet.accounts.find(acc => acc.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Decrypt the account's seed phrase
      const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);
      if (!seedPhrase) {
        throw new Error('Invalid password');
      }

      return seedPhrase;
    } catch (error) {
      // console.error('Failed to get account seed phrase:', error);
      return null;
    }
  }

  // Switch to a specific account
  async switchToAccount(walletId: string, accountId: string): Promise<void> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Find the account
      const account = wallet.accounts.find(acc => acc.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Deactivate all accounts
      wallet.accounts.forEach(acc => {
        acc.isActive = false;
      });

      // Activate the selected account
      account.isActive = true;

      // Update wallet address to match the active account
      wallet.address = account.addresses[wallet.currentNetwork] || Object.values(account.addresses)[0];
      wallet.currentNetwork = wallet.currentNetwork;

      await this.saveWallets();
      // console.log(`✅ Switched to account: ${account.name} (${account.addresses[wallet.currentNetwork] || Object.values(account.addresses)[0]})`);
    } catch (error) {
      // console.error('Failed to switch account:', error);
      throw error;
    }
  }

  // Get active account for a wallet
  async getActiveAccount(walletId: string): Promise<WalletAccount | null> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        return null;
      }

      const activeAccount = wallet.accounts.find(acc => acc.isActive);
      return activeAccount || null;
    } catch (error) {
      // console.error('Failed to get active account:', error);
      return null;
    }
  }

  // Add new account to wallet
  async addAccount(walletId: string, password: string): Promise<WalletAccount> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Decrypt seed phrase
    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }

    // Derive new account
    const newAccountIndex = wallet.accounts.length;
    const derivationPath = `m/44'/60'/0'/0/${newAccountIndex}`;
    const walletData = await deriveAccountFromSeed(seedPhrase, derivationPath);
    
    const newAccount: WalletAccount = {
      id: `${Date.now()}-${newAccountIndex}`,
      name: `Account ${newAccountIndex + 1}`,
      addresses: { [wallet.network]: walletData.address },
      privateKey: walletData.privateKey,
      publicKey: walletData.publicKey,
      derivationPath: derivationPath,
      networks: [wallet.network],
      balances: { [wallet.network]: '0' },
      nonces: { [wallet.network]: 0 },
      createdAt: Date.now(),
      encryptedSeedPhrase: '', // This will be set by the calling function
      isActive: false
    };

    wallet.accounts.push(newAccount);
    wallet.lastAccessed = Date.now();
    
    await this.saveWallets();
    return newAccount;
  }

  // Update account balance for specific network
  async updateAccountBalance(address: string, balance: string, network: string): Promise<void> {
    const account = await this.getAccountByAddress(address, network);
    if (account) {
      account.balances[network] = balance;
      await this.saveWallets();
    }
  }

  // Update account nonce for specific network
  async updateAccountNonce(address: string, nonce: number, network: string): Promise<void> {
    const account = await this.getAccountByAddress(address, network);
    if (account) {
      account.nonces[network] = nonce;
      await this.saveWallets();
    }
  }

  // Export wallet (returns decrypted seed phrase)
  async exportWallet(walletId: string, password: string): Promise<string> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }

    return seedPhrase;
  }

  // Change wallet password
  async changePassword(walletId: string, oldPassword: string, newPassword: string): Promise<void> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Decrypt with old password
    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, oldPassword);
    if (!seedPhrase) {
      throw new Error('Invalid old password');
    }

    // Encrypt with new password
    const newEncryptedSeedPhrase = await encryptData(seedPhrase, newPassword);
    
    wallet.encryptedSeedPhrase = newEncryptedSeedPhrase;
    wallet.lastAccessed = Date.now();
    
    await this.saveWallets();
  }

  // Delete wallet
  async deleteWallet(walletId: string): Promise<void> {
    const index = this.wallets.findIndex(wallet => wallet.id === walletId);
    if (index !== -1) {
      this.wallets.splice(index, 1);
      await this.saveWallets();
    }
  }

  // Get wallet statistics
  getWalletStats(): {
    totalWallets: number;
    totalAccounts: number;
    totalBalance: string;
    networks: string[];
  } {
    const totalWallets = this.wallets.length;
    const totalAccounts = this.wallets.reduce((sum, wallet) => sum + wallet.accounts.length, 0);
    const totalBalance = this.wallets.reduce((sum, wallet) => {
      return sum + wallet.accounts.reduce((accSum, account) => {
        const accountBalance = Object.values(account.balances || {}).reduce((balanceSum, balance) => 
          balanceSum + parseFloat(balance || '0'), 0);
        return accSum + accountBalance;
      }, 0);
    }, 0).toString();
    
    const networks = Array.from(new Set(this.wallets.map(wallet => wallet.network)));

    return {
      totalWallets,
      totalAccounts,
      totalBalance,
      networks
    };
  }

  // Validate wallet password
  async validatePassword(walletId: string, password: string): Promise<boolean> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      return false;
    }

    try {
      const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
      return !!seedPhrase;
    } catch (error) {
      return false;
    }
  }

  // Get wallet by address
  getWalletByAddress(address: string): WalletData | undefined {
    const wallet = this.wallets.find(wallet => 
      wallet.accounts.some(account => 
        Object.values(account.addresses || {}).some(addr => addr.toLowerCase() === address.toLowerCase())
      )
    );
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Backup wallet data
  async backupWallet(walletId: string, password: string): Promise<string> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }

    const backupData = {
      name: wallet.name,
      seedPhrase: seedPhrase,
      network: wallet.network,
      createdAt: wallet.createdAt,
      accounts: wallet.accounts.map(account => ({
        addresses: account.addresses,
        derivationPath: account.derivationPath
      }))
    };

    return JSON.stringify(backupData, null, 2);
  }

  // Restore wallet from backup
  async restoreWallet(backupData: string, password: string): Promise<WalletData> {
    try {
      const data = JSON.parse(backupData);
      
      const request: ImportWalletRequest = {
        name: data.name,
        seedPhrase: data.seedPhrase,
        password: password,
        network: data.network,
        accountCount: data.accounts?.length || 1
      };

      return await this.importWallet(request);
    } catch (error) {
      // console.error('Failed to restore wallet:', error);
      throw new Error('Invalid backup data');
    }
  }

  // Get current wallet (first wallet or specified wallet)
  getCurrentWallet(): WalletData | null {
    if (this.wallets.length === 0) {
      return null;
    }
    
    // Return the most recently accessed wallet
    const sortedWallets = [...this.wallets].sort((a, b) => b.lastAccessed - a.lastAccessed);
    return this.convertToWalletData(sortedWallets[0]);
  }

  // Get current wallet in the format expected by background script
  getCurrentWalletForBackground(): { address: string; currentNetwork: string } | null {
    if (this.wallets.length === 0) return null;
    
    const currentWallet = this.wallets[0]; // For now, use the first wallet
    if (!currentWallet.accounts || currentWallet.accounts.length === 0) return null;
    
    return {
      address: currentWallet.accounts[0].addresses[currentWallet.currentNetwork] || Object.values(currentWallet.accounts[0].addresses)[0],
      currentNetwork: currentWallet.currentNetwork
    };
  }

  // Get current account (first account of current wallet)
  getCurrentAccount(): WalletAccount | null {
    const currentWallet = this.getCurrentWallet();
    if (!currentWallet || currentWallet.accounts.length === 0) {
      return null;
    }
    
    // Find the account object for the current address using in-memory state
    const internal = this.wallets.find(w => w.id === currentWallet.id);
    if (!internal) return null;
    return internal.accounts.find(acc => 
      Object.values(acc.addresses || {}).includes(currentWallet.address)
    ) || null;
  }

  // Get balance for an account
  async getBalance(address: string, network: string): Promise<string> {
    try {
      const account = this.getAccountByAddress(address, network);
      if (!account) {
        throw new Error('Account not found');
      }

      // Import the getRealBalance function
      const { getRealBalance } = await import('../utils/web3-utils');
      const balance = await getRealBalance(address, network);
      
      // Update account balance
      await this.updateAccountBalance(address, balance, network);
      
      return balance;
    } catch (error) {
      // console.error('Error getting balance:', error);
      return '0';
    }
  }

  // Switch network for current wallet
  async switchNetwork(networkId: string): Promise<void> {
    const currentWallet = this.getCurrentWallet();
    if (!currentWallet) {
      throw new Error('No wallet available');
    }

    const wallet = await this.getInternalWallet(currentWallet.id);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.network = networkId;
    wallet.currentNetwork = networkId;
    wallet.lastAccessed = Date.now();
    
    // Update all accounts to use the new network
    wallet.accounts.forEach(account => {
      if (!account.networks.includes(networkId)) {
        account.networks.push(networkId);
      }
    });
    
    await this.saveWallets();
  }

  // Switch network for specific wallet
  async switchWalletNetwork(walletId: string, networkId: string): Promise<void> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.network = networkId;
    wallet.currentNetwork = networkId;
    wallet.lastAccessed = Date.now();
    
    // Update all accounts to use the new network
    wallet.accounts.forEach(account => {
      if (!account.networks.includes(networkId)) {
        account.networks.push(networkId);
      }
    });
    
    await this.saveWallets();
  }

  // Switch to a specific account
  async switchAccount(walletId: string, accountId: string): Promise<void> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Update wallet to use the selected account
    wallet.address = account.addresses[wallet.currentNetwork] || Object.values(account.addresses)[0];
    wallet.privateKey = account.privateKey;
    wallet.publicKey = account.publicKey;
    wallet.derivationPath = account.derivationPath;
    wallet.lastAccessed = Date.now();
    
    await this.saveWallets();
  }

  // Get current account for a wallet
  async getCurrentAccountForWallet(walletId: string): Promise<WalletAccount | null> {
    await this.ensureInitialized();
    
    // console.log('🔍 WalletManager.getCurrentAccountForWallet: Looking for wallet:', walletId);
    // console.log('🔍 Available wallets:', this.wallets.map(w => ({ id: w.id, address: w.address, accountsCount: w.accounts.length })));
    
    const wallet = this.wallets.find(w => w.id === walletId);
    if (!wallet) {
      // console.log('❌ WalletManager.getCurrentAccountForWallet: Wallet not found');
      return null;
    }
    
    // console.log('✅ WalletManager.getCurrentAccountForWallet: Wallet found:', {
    //   id: wallet.id,
    //   address: wallet.address,
    //   accountsCount: wallet.accounts.length,
    //   accountAddresses: wallet.accounts.map(acc => acc.addresses)
    // });
    
    // Safety check: ensure accounts are properly formatted objects, not strings
    const validAccounts = wallet.accounts.filter(acc => {
      if (typeof acc === 'string') {
        // console.warn('🔧 WalletManager: Found string account in getCurrentAccount, skipping:', acc);
        return false; // Filter out string accounts
      }
      return acc && typeof acc === 'object' && acc.addresses && Object.keys(acc.addresses).length > 0;
    });
    
    // Return null if no valid accounts found
    if (validAccounts.length === 0) {
      // console.log('⚠️ WalletManager: No valid accounts found for current account');
      return null;
    }
    
    // First try to find the active account
    let currentAccount = validAccounts.find(acc => acc.isActive);
    
    // If no active account, try to find an account that matches the wallet's current network
    if (!currentAccount) {
      currentAccount = validAccounts.find(acc => acc.networks.includes(wallet.currentNetwork));
    }
    
    // If still not found, try to find an account that matches the wallet's address
    if (!currentAccount) {
      currentAccount = validAccounts.find(acc => 
        Object.values(acc.addresses).includes(wallet.address)
      );
    }
    
    // If still not found, use the first account and make it active
    if (!currentAccount && validAccounts.length > 0) {
      currentAccount = validAccounts[0];
      currentAccount.isActive = true;
      // console.log('🔍 WalletManager.getCurrentAccountForWallet: Using first account and making it active:', currentAccount.addresses[wallet.currentNetwork] || Object.values(currentAccount.addresses)[0]);
    }
    
    // console.log('🔍 WalletManager.getCurrentAccountForWallet: Current account:', currentAccount ? {
    //   id: currentAccount.id,
    //   address: currentAccount.addresses[wallet.currentNetwork] || Object.values(currentAccount.addresses)[0]
    // } : 'null');
    
    return currentAccount || null;
  }

  // Add a new account to a wallet
  async addAccountToWallet(walletId: string, password: string): Promise<WalletAccount> {
    try {
      // console.log('🔍 WalletManager: Looking for wallet with ID:', walletId);
      // console.log('🔍 WalletManager: Available wallets:', this.wallets.map(w => ({ id: w.id, name: w.name })));
      
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        // console.error('❌ WalletManager: Wallet not found with ID:', walletId);
        throw new Error('Wallet not found');
      }

      // console.log('✅ WalletManager: Wallet found:', { 
      //   id: wallet.id, 
      //   name: wallet.name,
      //   hasEncryptedSeedPhrase: !!wallet.encryptedSeedPhrase,
      //   currentAccountsCount: wallet.accounts?.length || 0
      // });

      // Decrypt seed phrase
      // console.log('🔐 WalletManager: Attempting to decrypt seed phrase...');
      const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
      if (!seedPhrase) {
        // console.error('❌ WalletManager: Failed to decrypt seed phrase - invalid password');
        throw new Error('Invalid password');
      }
      
      // console.log('✅ WalletManager: Seed phrase decrypted successfully');

      // Derive new account for the current network
      const newAccountIndex = wallet.accounts.length;
      
      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';
      
      // Use appropriate derivation path based on network
      let derivationPath: string;
      switch (currentNetwork) {
        case 'bitcoin':
          derivationPath = `m/44'/0'/0'/0/${newAccountIndex}`;
          break;
        case 'solana':
          derivationPath = `m/44'/501'/0'/0'/${newAccountIndex}`;
          break;
        case 'tron':
          derivationPath = `m/44'/195'/0'/0/${newAccountIndex}`;
          break;
        case 'ton':
          derivationPath = `m/44'/607'/0'/0/${newAccountIndex}`;
          break;
        case 'xrp':
          derivationPath = `m/44'/144'/0'/0/${newAccountIndex}`;
          break;
        default: // EVM networks (ethereum, polygon, bsc, etc.)
          derivationPath = `m/44'/60'/0'/0/${newAccountIndex}`;
          break;
      }
      
      const walletData = await deriveAccountFromSeed(seedPhrase, derivationPath);
      
      const newAccount: WalletAccount = {
        id: `${Date.now()}-${newAccountIndex}`,
        name: `Account ${newAccountIndex + 1}`,
        addresses: { [currentNetwork]: walletData.address },
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        derivationPath: derivationPath,
        networks: [currentNetwork],
        balances: { [currentNetwork]: '0' },
        nonces: { [currentNetwork]: 0 },
        createdAt: Date.now(),
        encryptedSeedPhrase: '', // This will be set by the calling function
        isActive: false
      };

      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();
      
      await this.saveWallets();
      return newAccount;
    } catch (error) {
      // console.error('Error adding account to wallet:', error);
      throw error;
    }
  }

  // Remove an account from a wallet
  async removeAccountFromWallet(walletId: string, accountId: string): Promise<void> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Don't allow removing the last account
    if (wallet.accounts.length <= 1) {
      throw new Error('Cannot remove the last account');
    }

    const accountIndex = wallet.accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) {
      throw new Error('Account not found');
    }

    // If we're removing the current account, switch to the first account
    const accountToRemove = wallet.accounts[accountIndex];
    if (wallet.address === (accountToRemove.addresses[wallet.currentNetwork] || Object.values(accountToRemove.addresses)[0])) {
      const firstAccount = wallet.accounts.find(acc => acc.id !== accountId);
      if (firstAccount) {
        wallet.address = firstAccount.addresses[wallet.currentNetwork] || Object.values(firstAccount.addresses)[0];
        wallet.privateKey = firstAccount.privateKey;
        wallet.publicKey = firstAccount.publicKey;
        wallet.derivationPath = firstAccount.derivationPath;
      }
    }

    wallet.accounts.splice(accountIndex, 1);
    wallet.lastAccessed = Date.now();
    
    await this.saveWallets();
  }

  // Get account balance
  async getAccountBalance(accountId: string): Promise<string> {
    const account = this.getAllAccounts().find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    try {
      const { getRealBalance } = await import('../utils/web3-utils');
      const primaryNetwork = account.networks[0];
      const primaryAddress = account.addresses[primaryNetwork];
      const balance = await getRealBalance(primaryAddress, primaryNetwork);
      
      // Update account balance
      await this.updateAccountBalance(primaryAddress, balance, primaryNetwork);
      
      return balance;
    } catch (error) {
      // console.error('Error getting account balance:', error);
      return '0';
    }
  }

  // Get all accounts from all wallets
  getAllAccounts(): WalletAccount[] {
    return this.wallets.flatMap(wallet => wallet.accounts);
  }

  // Get accounts for a specific network
  getAccountsByNetwork(network: string): WalletAccount[] {
    return this.getAllAccounts().filter(account => account.networks.includes(network));
  }
} 
