import { WalletAccount } from '../../types/index';
import { walletStorage, InternalWalletData } from './wallet-storage';
import { deriveWalletFromSeed, deriveAccountFromSeed } from '../../utils/key-derivation';
import { encryptData, decryptData, generateBIP39SeedPhrase12 } from '../../utils/crypto-utils';
import { generateNetworkAddress } from '../../utils/network-address-utils';
import { validatePrivateKey, importFromPrivateKey } from '../../utils/crypto-utils';
import { deriveAddressesFromPrivateKey, getSupportedNetworksForPrivateKey } from '../../utils/private-key-address-utils';
import { derivationPathService } from './derivation-path-service';
import { AccountDerivationService } from './account-derivation-service';
import { storage } from '../../utils/storage-utils';


export class AccountCreationService {
  constructor(private accountDerivationService: AccountDerivationService) {}

  // Add new account to wallet
  public async addAccount(walletId: string, password: string, accountName?: string, accountType?: string): Promise<WalletAccount> {
    const wallets = await walletStorage.loadWallets();
    const wallet = wallets.find((w) => w.id === walletId);
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
    const derivationPath = derivationPathService.getNetworkDerivationPath(wallet.currentNetwork, newAccountIndex);
    const walletData = await deriveAccountFromSeed(seedPhrase, derivationPath);

    // Generate addresses for all supported networks
    const addresses: { [key: string]: string } = {};
    const balances: { [key: string]: string } = {};
    const nonces: { [key: string]: number } = {};
    const networks: string[] = [];

    // Supported networks for address derivation
    const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'bitcoin', 'solana', 'ton', 'xrp'];

    for (const networkId of supportedNetworks) {
      try {
        // Use the same private key for EVM networks, derive different addresses for others
        if (['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'].includes(networkId)) {
          addresses[networkId] = walletData.address; // Same address for EVM networks
        } else {
          // For non-EVM networks, derive specific addresses
          const networkDerivationPath = derivationPathService.getNetworkDerivationPath(networkId, newAccountIndex);
          const networkWalletData = await deriveAccountFromSeed(seedPhrase, networkDerivationPath, networkId);
          addresses[networkId] = networkWalletData.address;
        }
        balances[networkId] = '0';
        nonces[networkId] = 0;
        networks.push(networkId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`❌ Failed to derive address for ${networkId}:`, error);
        // Skip this network if derivation fails
      }
    }

    const newAccount: WalletAccount = {
      id: `${Date.now()}-${newAccountIndex}`,
      name: accountName || `Account ${newAccountIndex + 1}`,
      addresses,
      privateKey: walletData.privateKey,
      publicKey: walletData.publicKey,
      derivationPath,
      networks,
      balances,
      nonces,
      createdAt: Date.now(),
      encryptedSeedPhrase: '', // This will be set by the calling function
      isActive: false,
    };

    wallet.accounts.push(newAccount);
    wallet.lastAccessed = Date.now();

    // Automatically activate the new account
    // await this.switchToAccount(walletId, newAccount.id); // This will be handled by WalletManager

    await walletStorage.saveWallets(wallets);
    return newAccount;
  }

  // Add a new account to a wallet from external seed phrase
  public async addAccountFromSeedPhrase(walletId: string, seedPhrase: string, password: string, accountName?: string): Promise<WalletAccount> {
    try {
      const wallets = await walletStorage.loadWallets();
      const wallet = wallets.find((w) => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate seed phrase
      if (!this.accountDerivationService.validateSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';

      // Use appropriate derivation path based on network
      const derivationPath = derivationPathService.getNetworkDerivationPath(currentNetwork, 0);

      // Derive account from the provided seed phrase
      const address = await generateNetworkAddress(seedPhrase, derivationPath, currentNetwork);

      // Get private key and public key
      const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);

      // Encrypt the seed phrase for this account
      const encryptedSeedPhrase = await encryptData(seedPhrase, password);

      // Generate addresses for all supported networks
      const supportedNetworks = [
        'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche',
        'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp',
      ];

      const addresses: Record<string, string> = {};
      const balances: Record<string, string> = {};
      const nonces: Record<string, number> = {};

      // Start with the current network
      addresses[currentNetwork] = address;
      balances[currentNetwork] = '0';
      nonces[currentNetwork] = 0;

      // Generate addresses for other networks
      for (const networkId of supportedNetworks) {
        if (networkId !== currentNetwork) {
          try {
            // Use network-specific derivation paths (always use index 0 for imported seed phrases)
            const networkDerivationPath = derivationPathService.getNetworkDerivationPath(networkId, 0);

            const networkAddress = await generateNetworkAddress(seedPhrase, networkDerivationPath, networkId);
            addresses[networkId] = networkAddress;
            balances[networkId] = '0';
            nonces[networkId] = 0;
          } catch (networkError) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to generate ${networkId} address for new account:`, networkError);
          }
        }
      }

      const newAccount: WalletAccount = {
        id: `${Date.now()}-${wallet.accounts.length}`,
        name: accountName || `Imported Account ${wallet.accounts.length + 1}`,
        addresses,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        derivationPath,
        networks: supportedNetworks, // Account supports all networks
        balances,
        nonces,
        createdAt: Date.now(),
        encryptedSeedPhrase,
        isActive: false,
        accountType: 'seed-phrase', // Mark as seed phrase account
      };

      // Add to wallet
      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();

      await walletStorage.saveWallets(wallets);

      return newAccount;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from seed phrase:', error);
      throw error;
    }
  }

  // Add a new account to a wallet from private key
  public async addAccountFromPrivateKey(walletId: string, privateKey: string, password: string, accountName?: string): Promise<WalletAccount> {
    try {
      const wallets = await walletStorage.loadWallets();
      const wallet = wallets.find((w) => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate private key
      if (!validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key');
      }

      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';

      // Import from private key
      const walletData = importFromPrivateKey(privateKey, currentNetwork);

      // Encrypt the private key for this account
      const encryptedPrivateKey = await encryptData(privateKey, password);

      // Generate addresses for ALL supported networks using the private key
      const supportedNetworks = getSupportedNetworksForPrivateKey();
      const addresses: Record<string, string> = {};
      const balances: Record<string, string> = {};
      const nonces: Record<string, number> = {};

      // Generate addresses for all supported networks using the private key
      const derivationResults = await deriveAddressesFromPrivateKey(privateKey, supportedNetworks);

      for (const [networkId, result] of Object.entries(derivationResults)) {
        try {
          addresses[networkId] = result.address;
          balances[networkId] = '0';
          nonces[networkId] = 0;
        } catch (networkError) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to generate ${networkId} address for private key account:`, networkError);
        }
      }

      const newAccount: WalletAccount = {
        id: `${Date.now()}-${wallet.accounts.length}`,
        name: accountName || `Private Key Account ${wallet.accounts.length + 1}`,
        addresses,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        derivationPath: walletData.derivationPath,
        networks: supportedNetworks, // Now supports ALL networks
        balances,
        nonces,
        createdAt: Date.now(),
        encryptedSeedPhrase: encryptedPrivateKey, // Store encrypted private key in this field
        isActive: false,
        accountType: 'private-key', // Mark as private key account (now supports all networks)
      };

      // Add to wallet
      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();

      await walletStorage.saveWallets(wallets);

      return newAccount;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from private key:', error);
      throw error;
    }
  }

  // Add a new account to a wallet (generates new seed phrase for each account)
  public async addAccountToWallet(walletId: string, password: string, accountName?: string): Promise<{ account: WalletAccount, seedPhrase: string }> {
    try {
      const wallets = await walletStorage.loadWallets();
      const wallet = wallets.find((w) => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Generate a NEW seed phrase for this account (not derived from wallet's seed)
      const newSeedPhrase = this.accountDerivationService.generateSeedPhrase();

      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';

      // Use appropriate derivation path based on network (always use index 0 for new seed phrases)
      const derivationPath = derivationPathService.getNetworkDerivationPath(currentNetwork, 0);

      // Derive account from the NEW seed phrase
      const address = await generateNetworkAddress(newSeedPhrase, derivationPath, currentNetwork);

      // Get private key and public key
      const walletData = await deriveWalletFromSeed(newSeedPhrase, derivationPath);

      // Encrypt the NEW seed phrase for this account
      const encryptedSeedPhrase = await encryptData(newSeedPhrase, password);

      // Generate addresses for all supported networks
      const supportedNetworks = [
        'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche',
        'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp',
      ];

      const addresses: Record<string, string> = {};
      const balances: Record<string, string> = {};
      const nonces: Record<string, number> = {};

      // Start with the current network
      addresses[currentNetwork] = address;
      balances[currentNetwork] = '0';
      nonces[currentNetwork] = 0;

      // Generate addresses for other networks
      for (const networkId of supportedNetworks) {
        if (networkId !== currentNetwork) {
          try {
            // Use network-specific derivation paths
            const networkDerivationPath = derivationPathService.getNetworkDerivationPath(networkId, 0);

            const networkAddress = await generateNetworkAddress(newSeedPhrase, networkDerivationPath, networkId);
            addresses[networkId] = networkAddress;
            balances[networkId] = '0';
            nonces[networkId] = 0;
          } catch (networkError) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to generate ${networkId} address for new account:`, networkError);
          }
        }
      }

      const newAccount: WalletAccount = {
        id: `${Date.now()}-${wallet.accounts.length}`,
        name: accountName || `Account ${wallet.accounts.length + 1}`,
        addresses,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        derivationPath,
        networks: supportedNetworks,
        balances,
        nonces,
        createdAt: Date.now(),
        encryptedSeedPhrase, // Each account has its own encrypted seed phrase
        isActive: false,
        accountType: 'seed-phrase', // Mark as seed phrase account
      };

      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();

      await walletStorage.saveWallets(wallets);

      return { account: newAccount, seedPhrase: newSeedPhrase };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding account to wallet:', error);
      throw error;
    }
  }
}
