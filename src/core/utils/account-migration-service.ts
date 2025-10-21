import { WalletAccount } from '../../types/index';
import { walletStorage, InternalWalletData } from './wallet-storage';
import { deriveWalletFromSeed } from '../../utils/key-derivation';
import { generateNetworkAddress } from '../../utils/network-address-utils';

export class AccountMigrationService {
  constructor(private wallets: InternalWalletData[]) {}

  // Migrate accounts from old format to new format
  public async migrateAccounts(wallet: InternalWalletData): Promise<void> {
    const migratedAccounts: WalletAccount[] = [];

    for (let i = 0; i < wallet.accounts.length; i++) {
      const acc = wallet.accounts[i];

      if (typeof acc === 'string') {
        // Convert string address to proper account object
        const migratedAccount: WalletAccount = {
          id: `${wallet.id}-${i}`,
          name: `Account ${i + 1}`,
          addresses: {
            [wallet.currentNetwork]: acc,
          },
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          derivationPath: wallet.derivationPath,
          networks: [wallet.currentNetwork],
          balances: {
            [wallet.currentNetwork]: '0',
          },
          nonces: {
            [wallet.currentNetwork]: 0,
          },
          createdAt: wallet.createdAt,
          encryptedSeedPhrase: wallet.encryptedSeedPhrase,
          isActive: i === 0,
        };
        migratedAccounts.push(migratedAccount);
      } else if (acc && typeof acc === 'object' && !acc.addresses) {
        // Convert old object format to new format
        const migratedAccount: WalletAccount = {
          id: acc.id || `${wallet.id}-${i}`,
          name: acc.name || `Account ${i + 1}`,
          addresses: {
            [wallet.currentNetwork]: Object.values(acc.addresses || {})[0] || wallet.address,
          },
          privateKey: acc.privateKey || wallet.privateKey,
          publicKey: acc.publicKey || wallet.publicKey,
          derivationPath: acc.derivationPath || wallet.derivationPath,
          networks: [wallet.currentNetwork],
          balances: {
            [wallet.currentNetwork]: acc.balances?.[wallet.currentNetwork] || '0',
          },
          nonces: {
            [wallet.currentNetwork]: acc.nonces?.[wallet.currentNetwork] || 0,
          },
          createdAt: acc.createdAt || wallet.createdAt,
          encryptedSeedPhrase: acc.encryptedSeedPhrase || wallet.encryptedSeedPhrase,
          isActive: i === 0,
        };
        migratedAccounts.push(migratedAccount);
      } else {
        // Account is already in correct format
        migratedAccounts.push(acc as WalletAccount);
      }
    }

    // Update wallet with migrated accounts
    wallet.accounts = migratedAccounts;
    await walletStorage.saveWallets(this.wallets);
  }
}
