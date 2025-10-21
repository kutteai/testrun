import { encryptData, decryptData } from '../../utils/crypto-utils';
import { storage } from '../../utils/storage-utils';
import type { WalletData, WalletAccount } from '../../types/index';
import { walletStorage, InternalWalletData } from './wallet-storage';
import { deriveWalletFromSeed } from '../../utils/key-derivation';
import { generateNetworkAddress } from '../../utils/network-address-utils';

export class WalletManagementService {
  private wallets: InternalWalletData[] = [];

  constructor(wallets: InternalWalletData[]) {
    this.wallets = wallets;
  }

  public convertToWalletData(wallet: InternalWalletData): WalletData {
    return {
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      encryptedSeedPhrase: wallet.encryptedSeedPhrase,
      decryptPrivateKey: async (password: string) =>
        wallet.privateKey,
      accounts: wallet.accounts,
      networks: [wallet.network],
      currentNetwork: wallet.currentNetwork,
      derivationPath: wallet.derivationPath,
      balance: wallet.accounts[0]?.balances?.[wallet.currentNetwork] || '0',
      createdAt: wallet.createdAt,
      lastUsed: wallet.lastAccessed,
      lastAccessed: wallet.lastAccessed,
    };
  }

  // Get internal wallet by ID
  public async getInternalWallet(id: string): Promise<InternalWalletData | undefined> {
    // Assuming wallets are already loaded in WalletManager and passed to this service
    return this.wallets.find((wallet) => wallet.id === id);
  }

  // Get wallet by ID (public interface)
  public async getWallet(id: string): Promise<WalletData | undefined> {
    const wallet = await this.getInternalWallet(id);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Get all wallets (public interface)
  public async getAllWallets(): Promise<WalletData[]> {
    return this.wallets.map((wallet) => this.convertToWalletData(wallet));
  }

  // Set active wallet
  public async setActiveWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.lastAccessed = Date.now();
    await walletStorage.saveWallets(this.wallets);
  }

  // Get wallet by name
  public getWalletByName(name: string): WalletData | undefined {
    const wallet = this.wallets.find((wallet) => wallet.name === name);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Export wallet (returns decrypted seed phrase)
  public async exportWallet(walletId: string, password: string): Promise<string> {
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
  public async changePassword(walletId: string, oldPassword: string, newPassword: string): Promise<void> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, oldPassword);
    if (!seedPhrase) {
      throw new Error('Invalid old password');
    }

    const newEncryptedSeedPhrase = await encryptData(seedPhrase, newPassword);

    wallet.encryptedSeedPhrase = newEncryptedSeedPhrase;
    wallet.lastAccessed = Date.now();

    await walletStorage.saveWallets(this.wallets);
  }

  // Delete wallet
  public async deleteWallet(walletId: string): Promise<void> {
    const index = this.wallets.findIndex((wallet) => wallet.id === walletId);
    if (index !== -1) {
      this.wallets.splice(index, 1);
      await walletStorage.saveWallets(this.wallets);
    }
  }

  // Get wallet statistics
  public getWalletStats(): {
    totalWallets: number;
    totalAccounts: number;
    totalBalance: string;
    networks: string[];
    } {
    const totalWallets = this.wallets.length;
    const totalAccounts = this.wallets.reduce((sum, wallet) => sum + wallet.accounts.length, 0);
    const totalBalance = this.wallets.reduce((sum: number, wallet) => sum + wallet.accounts.reduce((accSum: number, account) => {
      const accountBalance = (Object.values(account.balances || {}) as string[]).reduce((balanceSum: number, balance: string) => balanceSum + parseFloat(balance || '0'), 0);
      return accSum + accountBalance;
    }, 0), 0).toString();

    const networks = Array.from(new Set(this.wallets.map((wallet) => wallet.network)));

    return {
      totalWallets,
      totalAccounts,
      totalBalance,
      networks,
    };
  }

  // Validate wallet password
  public async validatePassword(walletId: string, password: string): Promise<boolean> {
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
  public getWalletByAddress(address: string): WalletData | undefined {
    const wallet = this.wallets.find((wallet) => wallet.accounts.some((account) => Object.values(account.addresses || {}).some((addr) => (addr as string).toLowerCase() === address.toLowerCase())));
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Backup wallet data
  public async backupWallet(walletId: string, password: string): Promise<string> {
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
      seedPhrase,
      network: wallet.network,
      createdAt: wallet.createdAt,
      accounts: wallet.accounts.map((account) => ({
        addresses: account.addresses,
        derivationPath: account.derivationPath,
      })),
    };

    return JSON.stringify(backupData, null, 2);
  }

  // Restore wallet from backup
  public async restoreWallet(backupData: string, password: string): Promise<WalletData> {
    try {
      const data = JSON.parse(backupData);

      const request = {
        name: data.name,
        seedPhrase: data.seedPhrase,
        password,
        network: data.network,
        accountCount: data.accounts?.length || 1,
      };

      // This method will be implemented in WalletManager, it should delegate to createWallet or importWallet.
      // For now, we will just return a placeholder.
      throw new Error('Restore wallet logic needs to be delegated to WalletManager');
    } catch (error) {
      throw new Error('Invalid backup data');
    }
  }

  // Get current wallet
  public async getCurrentWallet(): Promise<WalletData | undefined> {
    const currentWalletId = (await storage.get('currentWallet'))?.currentWallet;
    if (!currentWalletId) {
      return undefined;
    }
    const wallet = await this.getInternalWallet(currentWalletId);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  // Get current wallet for background
  public async getCurrentWalletForBackground(): Promise<{ address: string; currentNetwork: string } | undefined> {
    const currentWallet = await this.getCurrentWallet();
    if (!currentWallet) {
      return undefined;
    }
    return { address: currentWallet.address, currentNetwork: currentWallet.currentNetwork };
  }

  // Get current account
  public async getCurrentAccount(): Promise<WalletAccount | undefined> {
    const currentWallet = await this.getCurrentWallet();
    if (!currentWallet) {
      return undefined;
    }
    const wallet = await this.getInternalWallet(currentWallet.id);
    if (!wallet || !wallet.accounts.length) {
      return undefined;
    }
    const currentAccountId = (await storage.get('currentAccount'))?.currentAccount;
    if (currentAccountId) {
      return wallet.accounts.find(acc => acc.id === currentAccountId);
    }
    return wallet.accounts[0]; // Default to first account
  }

  // Switch network for a specific wallet
  public async switchNetwork(walletId: string, networkId: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.currentNetwork = networkId;
    wallet.lastAccessed = Date.now();

    // Update the current network in storage
    await storage.set({ currentNetwork: networkId });
    await walletStorage.saveWallets(this.wallets);
  }

  // Switch network for all accounts within a wallet
  public async switchWalletNetwork(walletId: string, networkId: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.accounts.forEach((account) => {
      if (!account.networks.includes(networkId)) {
        account.networks.push(networkId);
      }
      account.balances[networkId] = account.balances[networkId] || '0';
      account.nonces[networkId] = account.nonces[networkId] || 0;
    });

    wallet.currentNetwork = networkId;
    wallet.lastAccessed = Date.now();
    await walletStorage.saveWallets(this.wallets);
    await storage.set({ currentNetwork: networkId });
  }

  // Switch active account within a wallet
  public async switchAccount(walletId: string, accountId: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    wallet.accounts.forEach((acc) => (acc.isActive = acc.id === accountId));
    wallet.lastAccessed = Date.now();

    // Update the current account in storage
    await storage.set({ currentAccount: accountId });
    await walletStorage.saveWallets(this.wallets);
  }

  // Get private key for a specific account (requires password)
  public async getAccountPrivateKey(walletId: string, accountId: string, password: string): Promise<string> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // If the private key is encrypted in the account (e.g., for imported private key accounts)
    if (account.accountType === 'private-key' && account.encryptedSeedPhrase) {
      const decryptedPrivateKey = await decryptData(account.encryptedSeedPhrase, password);
      if (!decryptedPrivateKey) {
        throw new Error('Invalid password');
      }
      return decryptedPrivateKey;
    }

    // Otherwise, derive from the wallet's seed phrase
    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }

    const derivedWallet = await deriveWalletFromSeed(seedPhrase, account.derivationPath);
    return derivedWallet.privateKey;
  }

  // Get seed phrase for a specific account (requires password)
  public async getAccountSeedPhrase(walletId: string, accountId: string, password: string): Promise<string> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // If the account has its own encrypted seed phrase (e.g., imported via seed phrase)
    if (account.accountType === 'seed-phrase' && account.encryptedSeedPhrase) {
      const decryptedSeedPhrase = await decryptData(account.encryptedSeedPhrase, password);
      if (!decryptedSeedPhrase) {
        throw new Error('Invalid password');
      }
      return decryptedSeedPhrase;
    }

    // Otherwise, return the wallet's seed phrase
    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }
    return seedPhrase;
  }

  // Get current active account for a given wallet
  public getCurrentAccountForWallet(walletId: string): WalletAccount | undefined {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      return undefined;
    }
    return wallet.accounts.find((acc) => acc.isActive);
  }

  // Remove an account from a wallet
  public async removeAccountFromWallet(walletId: string, accountId: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const initialAccountCount = wallet.accounts.length;
    wallet.accounts = wallet.accounts.filter(account => account.id !== accountId);

    if (wallet.accounts.length === initialAccountCount) {
      throw new Error('Account not found in wallet');
    }

    // If the removed account was the active one, activate the first remaining account if any
    if (!wallet.accounts.some(acc => acc.isActive) && wallet.accounts.length > 0) {
      wallet.accounts[0].isActive = true;
      await storage.set({ currentAccount: wallet.accounts[0].id });
    } else if (wallet.accounts.length === 0) {
      // If no accounts left, clear currentAccount from storage
      await storage.remove('currentAccount');
    }

    wallet.lastAccessed = Date.now();
    await walletStorage.saveWallets(this.wallets);
  }

  // Get balance for a specific account and network
  public async getAccountBalance(walletId: string, accountId: string, networkId: string): Promise<string> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    const account = wallet.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account.balances[networkId] || '0';
  }

  // Get all accounts for a wallet
  public async getAllAccounts(walletId: string): Promise<WalletAccount[]> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return wallet.accounts;
  }

  // Get accounts filtered by network
  public async getAccountsByNetwork(walletId: string, networkId: string): Promise<WalletAccount[]> {
    const wallet = await this.getInternalWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return wallet.accounts.filter(account => account.networks.includes(networkId));
  }

  // Update account name
  public async updateAccountName(walletId: string, accountId: string, newName: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    account.name = newName;
    wallet.lastAccessed = Date.now();
    await walletStorage.saveWallets(this.wallets);
  }
}
