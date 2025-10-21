import { walletStorage, InternalWalletData } from './wallet-storage';
import type { WalletAccount } from '../../types/index';
import { decryptData } from '../../utils/crypto-utils';
import { deriveWalletFromSeed } from '../../utils/key-derivation';
import { storage } from '../../utils/storage-utils';
import { generateNetworkAddress } from '../../utils/network-address-utils';

export class AccountManagementService {
  private wallets: InternalWalletData[] = [];

  constructor(wallets: InternalWalletData[]) {
    this.wallets = wallets;
  }

  // Get wallet accounts
  async getWalletAccounts(walletId: string, accountDerivationService: any): Promise<WalletAccount[]> {
    const wallet = this.wallets.find((w) => w.id === walletId);
    if (!wallet) return [];

    // Check if accounts need migration from old format
    const needsMigration = wallet.accounts.some((acc) => typeof acc === 'string' || (acc && typeof acc === 'object' && !acc.addresses));

    if (needsMigration) {
      await accountDerivationService.migrateAccounts(wallet);
    }

    // Safety check: ensure accounts are properly formatted objects, not strings
    const validAccounts = wallet.accounts.filter((acc) => {
      if (typeof acc === 'string') {
        return false; // Filter out string accounts
      }
      return acc && typeof acc === 'object' && acc.addresses && Object.keys(acc.addresses).length > 0;
    });

    // Return empty array if no valid accounts found
    if (validAccounts.length === 0) {
      // console.log('⚠️ AccountManagementService: No valid accounts found');
      return [];
    }

    return validAccounts;
  }

  // Get account by address on specific network
  async getAccountByAddress(address: string, network?: string): Promise<WalletAccount | undefined> {
    for (const wallet of this.wallets) {
      const account = wallet.accounts.find((acc) => {
        if (network) {
          return acc.addresses[network]?.toLowerCase() === address.toLowerCase();
        }
        // If no network specified, check all networks
        return Object.values(acc.addresses).some((addr) => addr.toLowerCase() === address.toLowerCase());
      });
      if (account) return account;
    }
    return undefined;
  }

  // Get account address for specific network
  async getAccountAddressForNetwork(accountId: string, network: string): Promise<string | undefined> {
    const allAccounts = this.wallets.flatMap((wallet) => wallet.accounts);
    const account = allAccounts.find((acc) => acc.id === accountId);
    return account?.addresses[network];
  }

  // Add network to existing account
  async addNetworkToAccount(accountId: string, network: string, address: string): Promise<void> {

    const wallet = this.wallets.find((w) => w.accounts.some((acc) => acc.id === accountId));
    if (wallet) {
      const account = wallet.accounts.find((acc) => acc.id === accountId);
      if (account) {

        // Check if network already exists
        if (account.networks.includes(network)) {
          account.addresses[network] = address;
        } else {
          account.addresses[network] = address;
          account.networks.push(network);
        }

        account.balances[network] = '0';
        account.nonces[network] = 0;


        await walletStorage.saveWallets(this.wallets);
      } else {
        // eslint-disable-next-line no-console
        console.error(`❌ Account ${accountId} not found in wallet`);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error(`❌ Wallet not found for account ${accountId}`);
    }
  }

  // Switch to a specific account
  async switchToAccount(walletId: string, accountId: string, ensureInitialized: () => Promise<void>): Promise<void> {
    try {
      await ensureInitialized();
      const wallet = this.wallets.find((w) => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Find the account
      const account = wallet.accounts.find((acc) => acc.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Deactivate all accounts
      wallet.accounts.forEach((acc) => {
        acc.isActive = false;
      });

      // Activate the selected account
      account.isActive = true;

      // Update wallet address to match the active account for current network
      const currentNetworkId = wallet.currentNetwork || 'ethereum';

      // Check if account has address for current network
      let networkAddress = account.addresses[currentNetworkId];

      // If no address for current network, derive one
      if (!networkAddress && account.encryptedSeedPhrase) {
        try {

          // Get the password from storage or prompt user
          const { storageUtils } = await import('../../utils/storage-utils');
          const password = await storageUtils.getPassword();

          if (!password) {
            // eslint-disable-next-line no-console
            console.warn('No password available for address derivation');
            networkAddress = Object.values(account.addresses)[0];
          } else {
            // Decrypt the seed phrase
            const { decryptData } = await import('../../utils/crypto-utils');
            const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);

            if (!seedPhrase) {
              // eslint-disable-next-line no-console
              console.warn('Failed to decrypt seed phrase for address derivation');
              networkAddress = Object.values(account.addresses)[0];
            } else {
              // Import the network address generation utility
              const { generateNetworkAddress } = await import('../../utils/network-address-utils');

              // Get derivation path for the network
              const derivationPaths: Record<string, string> = {
                ethereum: "m/44'/60'/0'/0/0",
                bitcoin: "m/44'/0'/0'/0/0",
                litecoin: "m/44'/2'/0'/0/0",
                solana: "m/44'/501'/0'/0/0",
                tron: "m/44'/195'/0'/0/0",
                ton: "m/44'/396'/0'/0/0",
                xrp: "m/44'/144'/0'/0/0",
                bsc: "m/44'/60'/0'/0/0", // BSC uses same derivation as Ethereum
                polygon: "m/44'/60'/0'/0/0", // Polygon uses same derivation as Ethereum
                avalanche: "m/44'/60'/0'/0/0", // Avalanche uses same derivation as Ethereum
                arbitrum: "m/44'/60'/0'/0/0", // Arbitrum uses same derivation as Ethereum
                optimism: "m/44'/60'/0'/0/0", // Optimism uses same derivation as Ethereum
                base: "m/44'/60'/0'/0/0", // Base uses same derivation as Ethereum
                fantom: "m/44'/60'/0'/0/0", // Fantom uses same derivation as Ethereum
              };

              const derivationPath = derivationPaths[currentNetworkId] || "m/44'/60'/0'/0/0";

              // Derive the address for the current network
              networkAddress = await generateNetworkAddress(seedPhrase, derivationPath, currentNetworkId);

              if (networkAddress) {
                // Add the new address to the account
                account.addresses[currentNetworkId] = networkAddress;
              }
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Failed to derive address for ${currentNetworkId}:`, error);
          // Fallback to first available address
          networkAddress = Object.values(account.addresses)[0];
        }
      }

      // Use the network-specific address or fallback to first available
      wallet.address = networkAddress || Object.values(account.addresses)[0];
      wallet.privateKey = account.privateKey;
      wallet.publicKey = account.publicKey;

      await walletStorage.saveWallets(this.wallets);

      // Dispatch wallet changed event to notify all components
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('walletChanged', {
          detail: {
            wallet,
            account,
            address: wallet.address,
            network: currentNetworkId,
          },
        });
        window.dispatchEvent(event);
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch account:', error);
      throw error;
    }
  }

  // Get active account for a wallet
  async getActiveAccount(walletId: string, ensureInitialized: () => Promise<void>): Promise<WalletAccount | null> {
    try {
      await ensureInitialized();
      const wallet = this.wallets.find((w) => w.id === walletId);
      if (!wallet) {
        return null;
      }

      const activeAccount = wallet.accounts.find((acc) => acc.isActive);
      return activeAccount || null;
    } catch (error) {
       
      // console.error('Failed to get active account:', error);
      return null;
    }
  }

  // Update account balance for specific network
  async updateAccountBalance(address: string, balance: string, network: string, getAccountByAddress: (address: string, network?: string) => Promise<WalletAccount | undefined>): Promise<void> {
    const account = await getAccountByAddress(address, network);
    if (account) {
      account.balances[network] = balance;
      await walletStorage.saveWallets(this.wallets);
    }
  }

  // Update account nonce for specific network
  async updateAccountNonce(address: string, nonce: number, network: string, getAccountByAddress: (address: string, network?: string) => Promise<WalletAccount | undefined>): Promise<void> {
    const account = await getAccountByAddress(address, network);
    if (account) {
      account.nonces[network] = nonce;
      await walletStorage.saveWallets(this.wallets);
    }
  }
}
