import { walletStorage } from './wallet-storage';

export class WalletInitializationService {
  private wallets: any[]; // Assuming any[] for now, will refine type later if needed
  private initialized: boolean = false;

  constructor(wallets: any[]) {
    this.wallets = wallets;
  }

  // Initialize the wallet manager
  public async initialize(): Promise<void> {
    this.wallets = await walletStorage.loadWallets();
    this.initialized = true;
  }

  // Ensure wallets are loaded before any operation
  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
