import { encryptData, decryptData } from '../../utils/crypto-utils';
import { storage } from '../../utils/storage-utils';
import type { WalletData, WalletAccount } from '../../types/index';
import { CreateWalletRequest, ImportWalletRequest, WalletManager as CoreWalletManager } from '../../core/wallet-manager';
import { deriveWalletFromSeed } from '../../utils/key-derivation';
import { NETWORK_CONFIGS } from '../../background/index';

// Internal wallet data structure for storage - mirroring CoreWalletManager's InternalWalletData
interface InternalWalletData {
  id: string;
  name: string;
  address: string;
  network: string;
  currentNetwork: string;
  derivationPath: string;
  createdAt: number;
  encryptedSeedPhrase: string;
  accounts: WalletAccount[];
  lastAccessed: number;
}

export class WalletManagementService {
  private wallets: InternalWalletData[] = [];
  private coreWalletManagerInstance: CoreWalletManager;
  private initialized: boolean = false;

  constructor() {
    this.coreWalletManagerInstance = new CoreWalletManager();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadWalletData();
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Load wallet data from storage for this service's internal state
  private async loadWalletData(): Promise<void> {
    try {
      const result = await storage.get(['wallets']);
      if (result.wallets) {
        this.wallets = result.wallets;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load wallet data:', error);
    }
  }

  // Save wallet data to storage for this service's internal state
  private async saveWalletData(): Promise<void> {
    try {
      await storage.set({
        wallets: this.wallets,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save wallet data:', error);
    }
  }

  // Get internal wallet by ID
  private async getInternalWallet(id: string): Promise<InternalWalletData | undefined> {
    await this.ensureInitialized();
    return this.wallets.find((wallet) => wallet.id === id);
  }

  // Convert internal wallet data to public WalletData format
  private convertToWalletData(wallet: InternalWalletData): WalletData {
    return {
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      encryptedSeedPhrase: wallet.encryptedSeedPhrase,
      accounts: wallet.accounts,
      networks: [wallet.network],
      currentNetwork: wallet.currentNetwork,
      derivationPath: wallet.derivationPath,
      balance: wallet.accounts[0]?.balances?.[wallet.currentNetwork] || '0',
      createdAt: wallet.createdAt,
      lastUsed: wallet.lastAccessed,
      lastAccessed: wallet.lastAccessed,
      decryptPrivateKey: async (password: string) => {
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
        if (!seedPhrase) {
          throw new Error('Invalid password');
        }
        const derivedWallet = await deriveWalletFromSeed(seedPhrase, wallet.derivationPath);
        return derivedWallet.privateKey;
      },
      getPrivateKey: async (password: string) => {
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
        if (!seedPhrase) {
          throw new Error('Invalid password');
        }
        const derivedWallet = await deriveWalletFromSeed(seedPhrase, wallet.derivationPath);
        return derivedWallet.privateKey;
      },
      getPublicKey: async (password: string) => {
    const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
    if (!seedPhrase) {
      throw new Error('Invalid password');
    }
        const derivedWallet = await deriveWalletFromSeed(seedPhrase, wallet.derivationPath);
        return derivedWallet.publicKey;
      },
    };
  }

  // Public methods that delegate to CoreWalletManager and manage internal state
  public async createWallet(request: CreateWalletRequest): Promise<WalletData> {
    const createdWallet = await this.coreWalletManagerInstance.createWallet(request);
    await this.loadWalletData(); // Reload wallets after creation
    return createdWallet;
  }

  public async importWallet(request: ImportWalletRequest): Promise<WalletData> {
    const importedWallet = await this.coreWalletManagerInstance.importWallet(request);
    await this.loadWalletData(); // Reload wallets after import
    return importedWallet;
  }

  public async addAccount(walletId: string, password: string, accountName?: string): Promise<WalletAccount> {
    const newAccount = await this.coreWalletManagerInstance.addAccount(walletId, password, accountName);
    await this.loadWalletData(); // Reload wallets after adding account
    return newAccount;
  }

  public async removeAccount(walletId: string, accountId: string): Promise<void> {
    await this.coreWalletManagerInstance.removeAccountFromWallet(walletId, accountId);
    await this.loadWalletData(); // Reload wallets after removing account
  }

  public async getAccountPrivateKey(walletId: string, accountId: string, password: string): Promise<string | null> {
    return this.coreWalletManagerInstance.getAccountPrivateKey(walletId, accountId, password);
  }

  public async getAccountSeedPhrase(walletId: string, accountId: string, password: string): Promise<string | null> {
    return this.coreWalletManagerInstance.getAccountSeedPhrase(walletId, accountId, password);
  }

  public async getWalletAccounts(walletId: string): Promise<WalletAccount[]> {
    return this.coreWalletManagerInstance.getWalletAccounts(walletId);
  }

  public async switchAccount(walletId: string, accountId: string): Promise<void> {
    await this.coreWalletManagerInstance.switchToAccount(walletId, accountId);
    await this.loadWalletData(); // Reload wallets after switching account
  }

  public async switchNetwork(networkId: string): Promise<void> {
    await this.coreWalletManagerInstance.switchNetwork(networkId);
    await this.loadWalletData(); // Reload wallets after switching network
  }

  public async backupWallet(walletId: string, password: string): Promise<string> {
    return this.coreWalletManagerInstance.backupWallet(walletId, password);
  }

  public async restoreWallet(backupData: string, password: string): Promise<WalletData> {
    try {
      const data = JSON.parse(backupData);

      const request: ImportWalletRequest = {
        name: data.name,
        seedPhrase: data.seedPhrase,
        password,
        network: data.network,
        accountCount: data.accounts?.length || 1,
      };

      // Delegate to WalletManager for actual wallet import
      const importedWallet = await this.coreWalletManagerInstance.importWallet(request);
      await this.loadWalletData(); // Reload wallets after import
      return importedWallet;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to restore wallet:', error);
      throw new Error('Invalid backup data or failed to import wallet');
    }
  }

  public async getCurrentWallet(): Promise<WalletData | null> {
    const currentWallet = await this.coreWalletManagerInstance.getCurrentWallet();
    return currentWallet;
  }

  public async updateWalletName(walletId: string, newName: string): Promise<void> {
    await this.coreWalletManagerInstance.updateWalletName(walletId, newName);
    await this.loadWalletData();
  }

  public async updateAccountName(walletId: string, accountId: string, newName: string): Promise<void> {
    await this.coreWalletManagerInstance.updateAccountName(walletId, accountId, newName);
    await this.loadWalletData();
  }

  public async deleteWallet(walletId: string): Promise<void> {
    await this.coreWalletManagerInstance.deleteWallet(walletId);
    await this.loadWalletData();
  }

  public async getAccountBalance(accountId: string): Promise<string> {
    return this.coreWalletManagerInstance.getAccountBalance(accountId);
  }

  public async validatePassword(walletId: string, password: string): Promise<boolean> {
    return this.coreWalletManagerInstance.validatePassword(walletId, password);
  }

  public async getCurrentAccount(): Promise<WalletAccount | null> {
    const currentWallet = await this.coreWalletManagerInstance.getCurrentWallet();
    if (!currentWallet) return null;
    return this.coreWalletManagerInstance.getCurrentAccountForWallet(currentWallet.id);
  }

  public async changePassword(walletId: string, oldPassword: string, newPassword: string): Promise<void> {
    await this.coreWalletManagerInstance.changePassword(walletId, oldPassword, newPassword);
    await this.loadWalletData();
  }

  public async getWallet(id: string): Promise<WalletData | undefined> {
    const wallet = await this.getInternalWallet(id);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  public async getAllWallets(): Promise<WalletData[]> {
    await this.ensureInitialized();
    return Promise.all(this.wallets.map(wallet => this.convertToWalletData(wallet)));
  }

  public async setActiveWallet(walletId: string): Promise<void> {
    await this.coreWalletManagerInstance.setActiveWallet(walletId);
    await this.loadWalletData();
  }

  public getWalletByName(name: string): WalletData | undefined {
    const wallet = this.wallets.find(wallet => wallet.name === name);
    return wallet ? this.convertToWalletData(wallet) : undefined;
  }

  public async exportWallet(walletId: string, password: string): Promise<string> {
    return this.coreWalletManagerInstance.exportWallet(walletId, password);
  }

  public async getCurrentWalletForBackground(): Promise<{ address: string; currentNetwork: string } | null> {
    const currentWallet = await this.coreWalletManagerInstance.getCurrentWalletForBackground();
    return currentWallet;
  }
}
