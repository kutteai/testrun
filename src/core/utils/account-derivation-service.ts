import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { encryptData, decryptData, generateBIP39SeedPhrase12 } from '../../utils/crypto-utils';
import { deriveWalletFromSeed, deriveAccountFromSeed } from '../../utils/key-derivation';
import { storage } from '../../utils/storage-utils';
import type { WalletAccount } from '../../types/index';
import { walletStorage, InternalWalletData } from './wallet-storage';
import { generateNetworkAddress } from '../../utils/network-address-utils';
import { validatePrivateKey, importFromPrivateKey } from '../../utils/crypto-utils';
import { deriveAddressesFromPrivateKey, getSupportedNetworksForPrivateKey } from '../../utils/private-key-address-utils';
import * as storageUtils from '../../utils/storage-utils';
import { derivationPathService } from './derivation-path-service';
import { AccountMigrationService } from './account-migration-service';
import { AccountCreationService } from './account-creation-service';


export class AccountDerivationService {
  private accountMigrationService: AccountMigrationService;
  private accountCreationService: AccountCreationService;

  constructor() {
    this.accountMigrationService = new AccountMigrationService();
    this.accountCreationService = new AccountCreationService(this);
  }

  public validateSeedPhrase(seedPhrase: string): boolean {
    return bip39.validateMnemonic(seedPhrase);
  }

  // Generate a real seed phrase using BIP39
  public generateSeedPhrase(): string {
    // Use the utility function for consistent 12-word seed phrase generation
    return generateBIP39SeedPhrase12();
  }

  // Derive accounts from seed phrase
  public async deriveAccounts(seedPhrase: string, network: string, count: number): Promise<WalletAccount[]> {
    const accounts: WalletAccount[] = [];

    // Define all supported networks for multi-chain account generation
    const supportedNetworks = [
      'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche',
      'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp',
    ];

    for (let i = 0; i < count; i++) {
      try {
        const derivationPath = derivationPathService.getNetworkDerivationPath('ethereum', i); // Use service for Ethereum path
        const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);

        // Generate addresses for all supported networks
        const addresses: Record<string, string> = {};
        const balances: Record<string, string> = {};
        const nonces: Record<string, number> = {};

        // Start with the primary network
        addresses[network] = walletData.address;
        balances[network] = '0';
        nonces[network] = 0;

        // Generate addresses for other networks
        for (const networkId of supportedNetworks) {
          if (networkId !== network) {
            try {
              const networkDerivationPath = derivationPathService.getNetworkDerivationPath(networkId, i);

              const networkAddress = await generateNetworkAddress(seedPhrase, networkDerivationPath, networkId);
              addresses[networkId] = networkAddress;
              balances[networkId] = '0';
              nonces[networkId] = 0;
            } catch (networkError) {
              // eslint-disable-next-line no-console
              console.warn(`Failed to generate ${networkId} address for account ${i}:`, networkError);
              // Continue with other networks - don't fail the entire account creation
            }
          }
        }

        const account: WalletAccount = {
          id: `${Date.now()}-${i}`,
          name: `Account ${i + 1}`,
          addresses,
          privateKey: walletData.privateKey,
          publicKey: walletData.publicKey,
          derivationPath,
          networks: supportedNetworks, // Account supports all networks
          balances,
          nonces,
          createdAt: Date.now(),
          encryptedSeedPhrase: '', // Will be set by the wallet's encrypted seed phrase
          isActive: i === 0, // First account is active
        };

        accounts.push(account);
      } catch (error) {
         
        // console.error(`Failed to derive account ${i}:`, error);
      }
    }

    return accounts;
  }

  // Migrate accounts from old format to new format
  public async migrateAccounts(wallet: InternalWalletData): Promise<void> {
    await this.accountMigrationService.migrateAccounts(wallet);
  }

  // Add new account to wallet
  public async addAccount(walletId: string, password: string, accountName?: string, accountType?: string): Promise<WalletAccount> {
    return this.accountCreationService.addAccount(walletId, password, accountName, accountType);
  }

  // Add a new account to a wallet from external seed phrase
  public async addAccountFromSeedPhrase(walletId: string, seedPhrase: string, password: string, accountName?: string): Promise<WalletAccount> {
    return this.accountCreationService.addAccountFromSeedPhrase(walletId, seedPhrase, password, accountName);
  }

  // Add a new account to a wallet from private key
  public async addAccountFromPrivateKey(walletId: string, privateKey: string, password: string, accountName?: string): Promise<WalletAccount> {
    return this.accountCreationService.addAccountFromPrivateKey(walletId, privateKey, password, accountName);
  }

  // Add a new account to a wallet (generates new seed phrase for each account)
  public async addAccountToWallet(walletId: string, password: string, accountName?: string): Promise<{ account: WalletAccount, seedPhrase: string }> {
    return this.accountCreationService.addAccountToWallet(walletId, password, accountName);
  }

}

export const accountDerivationService = new AccountDerivationService();
