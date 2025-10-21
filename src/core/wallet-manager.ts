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
    try { // TODO: Review useless catch block // TODO: Review useless catch block
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
    try { // TODO: Review useless catch block // TODO: Review useless catch block
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
    try { // TODO: Review useless catch block // TODO: Review useless catch block
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
        // Decrypt private key using the stored password hash
        // For now, return the private key directly (in production, implement proper decryption)
        return wallet.privateKey;
      },
      accounts: wallet.accounts, // Keep full account objects instead of just addresses
      networks: [wallet.network],
      currentNetwork: wallet.currentNetwork,
      derivationPath: wallet.derivationPath,
      balance: wallet.accounts[0]?.balances?.[wallet.currentNetwork] || '0',
      createdAt: wallet.createdAt,
      lastUsed: wallet.lastAccessed,
      lastAccessed: wallet.lastAccessed // Add lastAccessed property for multi-wallet support
    };
  }

  // Derive accounts from seed phrase
  private async deriveAccounts(seedPhrase: string, network: string, count: number): Promise<WalletAccount[]> {
    const accounts: WalletAccount[] = [];
    
    // Define all supported networks for multi-chain account generation
    const supportedNetworks = [
      'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 
      'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
    ];
    
    for (let i = 0; i < count; i++) {
      try {
        const derivationPath = `m/44'/60'/0'/0/${i}`; // BIP44 path for Ethereum
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
        const { generateNetworkAddress } = await import('../utils/network-address-utils');
        
        for (const networkId of supportedNetworks) {
          if (networkId !== network) {
            try {
              // Use network-specific derivation paths
              let networkDerivationPath = derivationPath;
              
              // Use proper BIP44 coin types for different networks
              switch (networkId) {
                case 'bitcoin':
                  networkDerivationPath = `m/44'/0'/0'/0/${i}`;
                  break;
                case 'litecoin':
                  networkDerivationPath = `m/44'/2'/0'/0/${i}`;
                  break;
                case 'solana':
                  networkDerivationPath = `m/44'/501'/0'/0/${i}`;
                  break;
                case 'tron':
                  networkDerivationPath = `m/44'/195'/0'/0/${i}`;
                  break;
                case 'xrp':
                  networkDerivationPath = `m/44'/144'/0'/0/${i}`;
                  break;
                case 'ton':
                  networkDerivationPath = `m/44'/607'/0'/0/${i}`;
                  break;
                default:
                  // EVM networks use Ethereum derivation path
                  networkDerivationPath = `m/44'/60'/0'/0/${i}`;
              }
              
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
          derivationPath: derivationPath,
          networks: supportedNetworks, // Account supports all networks
          balances,
          nonces,
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
    try { // TODO: Review useless catch block // TODO: Review useless catch block
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

  // Set active wallet
  async setActiveWallet(walletId: string): Promise<void> {
    await this.ensureInitialized();
    const wallet = this.wallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    // Update lastAccessed for the active wallet
    wallet.lastAccessed = Date.now();
    
    // Save the updated wallets
    await this.saveWallets();

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

    const wallet = this.wallets.find(w => w.accounts.some(acc => acc.id === accountId));
    if (wallet) {

      const account = wallet.accounts.find(acc => acc.id === accountId);
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


        await this.saveWallets();

      } else {
        // eslint-disable-next-line no-console
        console.error(`❌ Account ${accountId} not found in wallet`);
      }
    } else {
      // eslint-disable-next-line no-console
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

      // Update wallet address to match the active account for current network
      const currentNetworkId = wallet.currentNetwork || 'ethereum';
      
      // Check if account has address for current network
      let networkAddress = account.addresses[currentNetworkId];
      
      // If no address for current network, derive one
      if (!networkAddress && account.encryptedSeedPhrase) {
        try {

          // Get the password from storage or prompt user
          const { storageUtils } = await import('../utils/storage-utils');
          const password = await storageUtils.getPassword();
          
          if (!password) {
            // eslint-disable-next-line no-console
            console.warn('No password available for address derivation');
            networkAddress = Object.values(account.addresses)[0];
          } else {
            // Decrypt the seed phrase
            const { decryptData } = await import('../utils/crypto-utils');
            const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);
            
            if (!seedPhrase) {
              // eslint-disable-next-line no-console
              console.warn('Failed to decrypt seed phrase for address derivation');
              networkAddress = Object.values(account.addresses)[0];
            } else {
              // Import the network address generation utility
              const { generateNetworkAddress } = await import('../utils/network-address-utils');
              
              // Get derivation path for the network
              const derivationPaths: Record<string, string> = {
                'ethereum': "m/44'/60'/0'/0/0",
                'bitcoin': "m/44'/0'/0'/0/0",
                'litecoin': "m/44'/2'/0'/0/0", 
                'solana': "m/44'/501'/0'/0/0",
                'tron': "m/44'/195'/0'/0/0",
                'ton': "m/44'/396'/0'/0/0",
                'xrp': "m/44'/144'/0'/0/0",
                'bsc': "m/44'/60'/0'/0/0", // BSC uses same derivation as Ethereum
                'polygon': "m/44'/60'/0'/0/0", // Polygon uses same derivation as Ethereum
                'avalanche': "m/44'/60'/0'/0/0", // Avalanche uses same derivation as Ethereum
                'arbitrum': "m/44'/60'/0'/0/0", // Arbitrum uses same derivation as Ethereum
                'optimism': "m/44'/60'/0'/0/0", // Optimism uses same derivation as Ethereum
                'base': "m/44'/60'/0'/0/0", // Base uses same derivation as Ethereum
                'fantom': "m/44'/60'/0'/0/0", // Fantom uses same derivation as Ethereum
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

      await this.saveWallets();
      
      // Dispatch wallet changed event to notify all components
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('walletChanged', {
          detail: {
            wallet: wallet,
            account: account,
            address: wallet.address,
            network: currentNetworkId
          }
        });
        window.dispatchEvent(event);
      }
      
      // eslint-disable-next-line no-console
      console.log(`✅ Switched to account: ${account.name} (${wallet.address}) on ${currentNetworkId}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch account:', error);
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
  async addAccount(walletId: string, password: string, accountName?: string, accountType?: string): Promise<WalletAccount> {
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
          const networkDerivationPath = this.getNetworkDerivationPath(networkId, newAccountIndex);
          const networkWalletData = await deriveAccountFromSeed(seedPhrase, networkDerivationPath, networkId);
          addresses[networkId] = networkWalletData.address;
          // eslint-disable-next-line no-console
          console.log(`✅ Generated ${networkId} address: ${networkWalletData.address} (path: ${networkDerivationPath})`);
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
      addresses: addresses,
      privateKey: walletData.privateKey,
      publicKey: walletData.publicKey,
      derivationPath: derivationPath,
      networks: networks,
      balances: balances,
      nonces: nonces,
      createdAt: Date.now(),
      encryptedSeedPhrase: '', // This will be set by the calling function
      isActive: false
    };

    wallet.accounts.push(newAccount);
    wallet.lastAccessed = Date.now();
    
    // Automatically activate the new account
    await this.switchToAccount(walletId, newAccount.id);
    
    await this.saveWallets();
    return newAccount;
  }

  // Helper method to get network-specific derivation paths
  private getNetworkDerivationPath(networkId: string, accountIndex: number): string {
    switch (networkId) {
      case 'bitcoin':
        return `m/84'/0'/0'/${accountIndex}`; // Native SegWit
      case 'solana':
        return `m/44'/501'/${accountIndex}'/0'`; // Solana BIP44
      case 'ton':
        return `m/44'/607'/${accountIndex}'/0'`; // TON BIP44
      case 'xrp':
        return `m/44'/144'/${accountIndex}'/0'`; // XRP BIP44
      default:
        return `m/44'/60'/0'/0/${accountIndex}`; // Default Ethereum path
    }
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
    
    // Update all accounts to use the new network and ensure they have addresses for it
    for (const account of wallet.accounts) {
      if (!account.networks.includes(networkId)) {
        account.networks.push(networkId);
      }
      
      // Ensure account has address for the new network
      if (!account.addresses[networkId] && account.encryptedSeedPhrase) {
        try {

          // Get the password from storage
          const { storageUtils } = await import('../utils/storage-utils');
          const password = await storageUtils.getPassword();
          
          if (!password) {
            // eslint-disable-next-line no-console
            console.warn('No password available for address derivation during network switch');
          } else {
            // Decrypt the seed phrase
            const { decryptData } = await import('../utils/crypto-utils');
            const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);
            
            if (!seedPhrase) {
              // eslint-disable-next-line no-console
              console.warn('Failed to decrypt seed phrase for address derivation during network switch');
            } else {
              // Import the network address generation utility
              const { generateNetworkAddress } = await import('../utils/network-address-utils');
              
              // Get derivation path for the network
              const derivationPaths: Record<string, string> = {
                'ethereum': "m/44'/60'/0'/0/0",
                'bitcoin': "m/44'/0'/0'/0/0",
                'litecoin': "m/44'/2'/0'/0/0", 
                'solana': "m/44'/501'/0'/0/0",
                'tron': "m/44'/195'/0'/0/0",
                'ton': "m/44'/396'/0'/0/0",
                'xrp': "m/44'/144'/0'/0/0",
                'bsc': "m/44'/60'/0'/0/0", // BSC uses same derivation as Ethereum
                'polygon': "m/44'/60'/0'/0/0", // Polygon uses same derivation as Ethereum
                'avalanche': "m/44'/60'/0'/0/0", // Avalanche uses same derivation as Ethereum
                'arbitrum': "m/44'/60'/0'/0/0", // Arbitrum uses same derivation as Ethereum
                'optimism': "m/44'/60'/0'/0/0", // Optimism uses same derivation as Ethereum
                'base': "m/44'/60'/0'/0/0", // Base uses same derivation as Ethereum
                'fantom': "m/44'/60'/0'/0/0", // Fantom uses same derivation as Ethereum
              };
              
              const derivationPath = derivationPaths[networkId] || "m/44'/60'/0'/0/0";
              
              // Derive the address for the new network
              const networkAddress = await generateNetworkAddress(seedPhrase, derivationPath, networkId);
              
              if (networkAddress) {
                account.addresses[networkId] = networkAddress;

              }
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Failed to derive ${networkId} address for account ${account.id}:`, error);
        }
      }
    }
    
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

    // eslint-disable-next-line no-console
    console.log('🔍 Available wallets:', this.wallets.map(w => ({ id: w.id, address: w.address, accountsCount: w.accounts.length })));
    
    const wallet = this.wallets.find(w => w.id === walletId);
    if (!wallet) {

      return null;
    }
    
    // eslint-disable-next-line no-console
    console.log('✅ WalletManager.getCurrentAccountForWallet: Wallet found:', {
      id: wallet.id,
      address: wallet.address,
      accountsCount: wallet.accounts.length,
      accountAddresses: wallet.accounts.map(acc => acc.addresses)
    });
    
    // Safety check: ensure accounts are properly formatted objects, not strings
    const validAccounts = wallet.accounts.filter(acc => {
      if (typeof acc === 'string') {
        // eslint-disable-next-line no-console
        console.warn('🔧 WalletManager: Found string account in getCurrentAccount, skipping:', acc);
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
    
    // eslint-disable-next-line no-console
    console.log('🔍 WalletManager.getCurrentAccountForWallet: Current account:', currentAccount ? {
      id: currentAccount.id,
      name: currentAccount.name,
      address: currentAccount.addresses[wallet.currentNetwork] || Object.values(currentAccount.addresses)[0]
    } : 'null');
    
    return currentAccount || null;
  }

  // Add a new account to a wallet from external seed phrase
  async addAccountFromSeedPhrase(walletId: string, seedPhrase: string, password: string, accountName?: string): Promise<WalletAccount> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate seed phrase
      if (!this.validateSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';
      
      // Use appropriate derivation path based on network
      let derivationPath: string;
      switch (currentNetwork) {
        case 'bitcoin':
          derivationPath = "m/44'/0'/0'/0/0";
          break;
        case 'litecoin':
          derivationPath = "m/44'/2'/0'/0/0";
          break;
        case 'solana':
          derivationPath = "m/44'/501'/0'/0/0";
          break;
        case 'tron':
          derivationPath = "m/44'/195'/0'/0/0";
          break;
        case 'ton':
          derivationPath = "m/44'/396'/0'/0/0";
          break;
        case 'xrp':
          derivationPath = "m/44'/144'/0'/0/0";
          break;
        default:
          derivationPath = "m/44'/60'/0'/0/0"; // Ethereum and EVM chains
      }

      // Derive account from the provided seed phrase
      const { generateNetworkAddress } = await import('../utils/network-address-utils');
      const address = await generateNetworkAddress(seedPhrase, derivationPath, currentNetwork);
      
      // Get private key and public key
      const { deriveWalletFromSeed } = await import('../utils/key-derivation');
      const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);
      
      // Encrypt the seed phrase for this account
      const encryptedSeedPhrase = await encryptData(seedPhrase, password);
      
      // Generate addresses for all supported networks
      const supportedNetworks = [
        'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 
        'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
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
            let networkDerivationPath = derivationPath;
            
            switch (networkId) {
              case 'bitcoin':
                networkDerivationPath = "m/44'/0'/0'/0/0";
                break;
              case 'litecoin':
                networkDerivationPath = "m/44'/2'/0'/0/0";
                break;
              case 'solana':
                networkDerivationPath = "m/44'/501'/0'/0/0";
                break;
              case 'tron':
                networkDerivationPath = "m/44'/195'/0'/0/0";
                break;
              case 'xrp':
                networkDerivationPath = "m/44'/144'/0'/0/0";
                break;
              case 'ton':
                networkDerivationPath = "m/44'/396'/0'/0/0";
                break;
              default:
                // EVM networks use Ethereum derivation path
                networkDerivationPath = "m/44'/60'/0'/0/0";
            }
            
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
        derivationPath: derivationPath,
        networks: supportedNetworks, // Account supports all networks
        balances,
        nonces,
        createdAt: Date.now(),
        encryptedSeedPhrase: encryptedSeedPhrase,
        isActive: false,
        accountType: 'seed-phrase' // Mark as seed phrase account
      };

      // Add to wallet
      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();
      
      await this.saveWallets();
      
      // eslint-disable-next-line no-console
      console.log(`✅ Added account from seed phrase: ${newAccount.name} (${address})`);
      return newAccount;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from seed phrase:', error);
      throw error;
    }
  }

  // Add a new account to a wallet from private key
  async addAccountFromPrivateKey(walletId: string, privateKey: string, password: string, accountName?: string): Promise<WalletAccount> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate private key
      const { validatePrivateKey } = await import('../utils/crypto-utils');
      if (!validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key');
      }

      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';
      
      // Import from private key
      const { importFromPrivateKey } = await import('../utils/crypto-utils');
      const walletData = importFromPrivateKey(privateKey, currentNetwork);
      
      // Encrypt the private key for this account
      const encryptedPrivateKey = await encryptData(privateKey, password);
      
      // Generate addresses for ALL supported networks using the private key
      const { deriveAddressesFromPrivateKey, getSupportedNetworksForPrivateKey } = await import('../utils/private-key-address-utils');
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
        accountType: 'private-key' // Mark as private key account (now supports all networks)
      };

      // Add to wallet
      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();
      
      await this.saveWallets();
      
      // eslint-disable-next-line no-console
      console.log(`✅ Added account from private key: ${newAccount.name} (${walletData.address})`);
      return newAccount;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from private key:', error);
      throw error;
    }
  }

  // Add a new account to a wallet (generates new seed phrase for each account)
  async addAccountToWallet(walletId: string, password: string, accountName?: string): Promise<{account: WalletAccount, seedPhrase: string}> {
    try {
      const wallet = await this.getInternalWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Generate a NEW seed phrase for this account (not derived from wallet's seed)
      const newSeedPhrase = this.generateSeedPhrase();
      
      // Get current network from storage or default to ethereum
      const currentNetworkData = await storage.get('currentNetwork');
      const currentNetwork = currentNetworkData?.currentNetwork || 'ethereum';
      
      // Use appropriate derivation path based on network (always use index 0 for new seed phrases)
      let derivationPath: string;
      switch (currentNetwork) {
        case 'bitcoin':
          derivationPath = "m/44'/0'/0'/0/0";
          break;
        case 'litecoin':
          derivationPath = "m/44'/2'/0'/0/0";
          break;
        case 'solana':
          derivationPath = "m/44'/501'/0'/0/0";
          break;
        case 'tron':
          derivationPath = "m/44'/195'/0'/0/0";
          break;
        case 'ton':
          derivationPath = "m/44'/396'/0'/0/0";
          break;
        case 'xrp':
          derivationPath = "m/44'/144'/0'/0/0";
          break;
        default: // EVM networks (ethereum, polygon, bsc, etc.)
          derivationPath = "m/44'/60'/0'/0/0";
          break;
      }
      
      // Derive account from the NEW seed phrase
      const { generateNetworkAddress } = await import('../utils/network-address-utils');
      const address = await generateNetworkAddress(newSeedPhrase, derivationPath, currentNetwork);
      
      // Get private key and public key
      const { deriveWalletFromSeed } = await import('../utils/key-derivation');
      const walletData = await deriveWalletFromSeed(newSeedPhrase, derivationPath);
      
      // Encrypt the NEW seed phrase for this account
      const encryptedSeedPhrase = await encryptData(newSeedPhrase, password);
      
      // Generate addresses for all supported networks
      const supportedNetworks = [
        'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 
        'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
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
            let networkDerivationPath = derivationPath;
            
            switch (networkId) {
              case 'bitcoin':
                networkDerivationPath = "m/44'/0'/0'/0/0";
                break;
              case 'litecoin':
                networkDerivationPath = "m/44'/2'/0'/0/0";
                break;
              case 'solana':
                networkDerivationPath = "m/44'/501'/0'/0/0";
                break;
              case 'tron':
                networkDerivationPath = "m/44'/195'/0'/0/0";
                break;
              case 'xrp':
                networkDerivationPath = "m/44'/144'/0'/0/0";
                break;
              case 'ton':
                networkDerivationPath = "m/44'/396'/0'/0/0";
                break;
              default:
                // EVM networks use Ethereum derivation path
                networkDerivationPath = "m/44'/60'/0'/0/0";
            }
            
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
        derivationPath: derivationPath,
        networks: supportedNetworks,
        balances,
        nonces,
        createdAt: Date.now(),
        encryptedSeedPhrase: encryptedSeedPhrase, // Each account has its own encrypted seed phrase
        isActive: false,
        accountType: 'seed-phrase' // Mark as seed phrase account
      };

      wallet.accounts.push(newAccount);
      wallet.lastAccessed = Date.now();
      
      await this.saveWallets();
      
      // eslint-disable-next-line no-console
      console.log(`✅ Added new account with generated seed phrase: ${newAccount.name} (${address})`);
      return { account: newAccount, seedPhrase: newSeedPhrase };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding account to wallet:', error);
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

  // Update account name
  async updateAccountName(walletId: string, accountId: string, newName: string): Promise<void> {

    const wallet = this.wallets.find(w => w.id === walletId);
    if (!wallet) {
      // eslint-disable-next-line no-console
      console.error('❌ Wallet not found:', walletId);
      throw new Error('Wallet not found');
    }

    const account = wallet.accounts.find(acc => acc.id === accountId);
    if (!account) {
      // eslint-disable-next-line no-console
      console.error('❌ Account not found:', accountId);
      throw new Error('Account not found');
    }

    // Update the account name
    account.name = newName;
    wallet.lastAccessed = Date.now();

    // Save the updated wallet
    await this.saveWallets();

    // Verify the change was saved
    const savedWallet = this.wallets.find(w => w.id === walletId);
    const savedAccount = savedWallet?.accounts.find(acc => acc.id === accountId);


  }
} 
