import { storage } from '../../utils/storage-utils';
// import type { WalletData, WalletAccount } from '../../types/index';

// Internal wallet data structure for storage
export interface InternalWalletData {
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
  accounts: any[]; // Using any[] for now to avoid circular dependency
  lastAccessed: number;
}

class WalletStorage {
  constructor() {}

  // Load wallets from storage
  async loadWallets(): Promise<InternalWalletData[]> {
    const result = await storage.get(['wallets']);
    return result.wallets || [];
  }

  // Save wallets to storage
  async saveWallets(wallets: InternalWalletData[]): Promise<void> {
    await storage.set({ wallets });
  }
}

export const walletStorage = new WalletStorage();
