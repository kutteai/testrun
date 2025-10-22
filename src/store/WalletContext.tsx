import React, { createContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import web3Utils from '../utils/web3-utils'; // Changed to default import
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validateBIP39SeedPhraseWithFeedback, validatePrivateKey, hashPassword, verifyPassword, encryptData, decryptData, importFromPrivateKey } from '../utils/crypto-utils';
import { UnifiedCrypto } from '../utils/unified-crypto';
import { deriveWalletFromSeed, deriveAccountFromSeed } from '../utils/key-derivation';
import { AddressDerivationService } from '../services/address-derivation-service';
import { storage, storageUtils, SecureSessionManager } from '../utils/storage-utils';
import {
  WalletData,
  WalletState,
  WalletContextType,
  Network,
  WalletAccount
} from '../types/index';
import { WalletManager as CoreWalletManager } from '../core/wallet-manager'; // Renamed to avoid conflict
import { PrivateKeyAddressUtils } from '../utils/private-key-address-utils';
import { generateNetworkAddress } from '../utils/network-address-utils';
import { getNetworks } from '../utils/web3/network-utils'; // Correctly import getNetworks

// ============================================================================
// SECURE CRYPTO UTILITIES - ALIGNED WITH BACKGROUND SCRIPT
// ============================================================================

// Use UnifiedCrypto for consistent encryption across frontend and background
const SecureCrypto = UnifiedCrypto;


// ============================================================================
// SECURE WALLET COMMUNICATION
// ============================================================================


// Auto-lock timeout (15 minutes)
const AUTO_LOCK_TIMEOUT = 15 * 60 * 1000;

// Simple hash function for deterministic address generation
const hashString = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
};

// Configuration helper
const getConfig = () => {
  if (typeof window !== 'undefined' && (window as any).CONFIG) {
    return (window as any).CONFIG;
  }
  return {
    INFURA_PROJECT_ID: 'f9231922e4914834b76b67b67367f3f2',
  };
};

// Helper functions for network configuration
const getExplorerUrl = (network: string): string => {
  const explorers = {
    ethereum: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
    avalanche: 'https://snowtrace.io'
  };
  return explorers[network] || `https://${network}scan.com`;
};

const getChainId = (network: string): string => {
  const chainIds = {
    ethereum: '0x1',
    bsc: '0x38',
    polygon: '0x89',
    arbitrum: '0xa4b1',
    optimism: '0xa',
    avalanche: '0xa86a'
  };
  return chainIds[network] || '0x1';
};

const getRpcUrl = (network: string): string => {
  const config = getConfig();
  const infuraProjectId = config.INFURA_PROJECT_ID || 'f9231922e4914834b76b67b67367f3f2';
  
  const rpcUrls = {
    ethereum: `https://mainnet.infura.io/v3/${infuraProjectId}`,
    bsc: 'https://bsc-dataseed1.binance.org',
    polygon: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
    arbitrum: `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
    optimism: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
    avalanche: 'https://api.avax.network/ext/bc/C/rpc'
  };
  
  return rpcUrls[network] || `https://mainnet.infura.io/v3/${infuraProjectId}`;
};

// Remove local getDefaultNetworks definition as it's imported now


// Internal wallet data structure (from core/wallet-manager)
interface InternalWalletData extends WalletData {
  // Add any internal-specific properties here if needed
}

// Initial state for the wallet context
const initialWalletState: WalletState = {
  wallets: [],
  currentWallet: null,
  isWalletUnlocked: false,
  hasWallet: false,
  balances: {},
  isLoading: false,
  error: null,
  isWalletCreated: false,
  isInitializing: true,
  currentNetwork: getNetworks()['ethereum'] || null, // Use getNetworks()
  currentAccount: null,
  globalPassword: null,
  address: null, // Ensure address is initialized
};

type Action =
  | { type: 'SET_WALLETS'; payload: WalletData[] }
  | { type: 'SET_CURRENT_WALLET'; payload: WalletData | null }
  | { type: 'SET_IS_WALLET_UNLOCKED'; payload: boolean }
  | { type: 'SET_HAS_WALLET'; payload: boolean }
  | { type: 'SET_BALANCES'; payload: Record<string, string> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_IS_WALLET_CREATED'; payload: boolean }
  | { type: 'SET_IS_INITIALIZING'; payload: boolean }
  | { type: 'SET_ADDRESS'; payload: string | null } // Still needed for some UI elements, but derived from currentWallet
  | { type: 'SET_CURRENT_NETWORK'; payload: Network | null }
  | { type: 'SET_CURRENT_ACCOUNT'; payload: WalletAccount | null }
  | { type: 'SET_GLOBAL_PASSWORD'; payload: string | null }
  | { type: 'UPDATE_WALLET_STATE'; payload: WalletData[] }
  | { type: 'ADD_NEW_ACCOUNT'; payload: { walletId: string; account: WalletAccount; } }
  | { type: 'REMOVE_ACCOUNT'; payload: { walletId: string; accountId: string } }
  | { type: 'UPDATE_ACCOUNT_DATA'; payload: { walletId: string; accountId: string; network: string; balance?: string; nonce?: number } }
  | { type: 'UPDATE_WALLET_NAME'; payload: { walletId: string; name: string } }
  | { type: 'UPDATE_ACCOUNT_NAME'; payload: { walletId: string; accountId: string; name: string } }
  | { type: 'LOCK_WALLET' }
  | { type: 'CLEAR_WALLET' };

// Reducer
const walletReducer = (state: WalletState, action: Action): WalletState => {
  switch (action.type) {
    case 'SET_WALLETS':
      return { ...state, wallets: action.payload };
    case 'SET_CURRENT_WALLET':
      return { ...state, currentWallet: action.payload };
    case 'SET_IS_WALLET_UNLOCKED':
      return { ...state, isWalletUnlocked: action.payload };
    case 'SET_HAS_WALLET':
      return { ...state, hasWallet: action.payload };
    case 'SET_BALANCES':
      return { ...state, balances: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_IS_WALLET_CREATED':
      return { ...state, isWalletCreated: action.payload };
    case 'SET_IS_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    case 'SET_ADDRESS': // Handle SET_ADDRESS action
      return { ...state, address: action.payload };
    case 'SET_CURRENT_NETWORK':
      return { ...state, currentNetwork: action.payload };
    case 'SET_CURRENT_ACCOUNT':
      return { ...state, currentAccount: action.payload };
    case 'SET_GLOBAL_PASSWORD':
      return { ...state, globalPassword: action.payload };
    case 'UPDATE_WALLET_STATE':
      return { ...state, wallets: action.payload };
    case 'ADD_NEW_ACCOUNT': {
      const { walletId, account } = action.payload;
      const updatedWallets = state.wallets.map((w) =>
        w.id === walletId
          ? {
              ...w,
              accounts: [...w.accounts, account],
              lastAccessed: Date.now(),
            }
          : w
      );
      return {
        ...state,
        wallets: updatedWallets,
        currentWallet: state.currentWallet && state.currentWallet.id === walletId
          ? { ...state.currentWallet, accounts: [...state.currentWallet.accounts, account] }
          : state.currentWallet,
      };
    }
    case 'REMOVE_ACCOUNT': {
      const { walletId, accountId } = action.payload;
      const updatedWallets = state.wallets.map((w) =>
        w.id === walletId
          ? {
              ...w,
              accounts: w.accounts.filter((acc) => acc.id !== accountId),
              lastAccessed: Date.now(),
            }
          : w
      );
      return {
        ...state,
        wallets: updatedWallets,
        currentWallet: state.currentWallet && state.currentWallet.id === walletId
          ? { ...state.currentWallet, accounts: state.currentWallet.accounts.filter((acc) => acc.id !== accountId) }
          : state.currentWallet,
        currentAccount: state.currentAccount && state.currentAccount.id === accountId ? null : state.currentAccount,
      };
    }
    case 'UPDATE_ACCOUNT_DATA': {
      const { walletId, accountId, network, balance, nonce } = action.payload;
      const updatedWallets = state.wallets.map((w) =>
        w.id === walletId
          ? {
              ...w,
              accounts: w.accounts.map((acc) =>
                acc.id === accountId
                  ? {
                      ...acc,
                      balances: balance ? { ...acc.balances, [network]: balance } : acc.balances,
                      nonces: nonce !== undefined ? { ...acc.nonces, [network]: nonce } : acc.nonces,
                    }
                  : acc
              ),
              lastAccessed: Date.now(),
            }
          : w
      );
      const updatedCurrentWallet = updatedWallets.find(w => w.id === state.currentWallet?.id);
      const updatedCurrentAccount = updatedCurrentWallet?.accounts.find(acc => acc.id === state.currentAccount?.id);
      return {
        ...state,
        wallets: updatedWallets,
        currentWallet: updatedCurrentWallet ? { ...updatedCurrentWallet, accounts: updatedCurrentWallet.accounts } : null,
        currentAccount: updatedCurrentAccount || null,
      };
    }
    case 'UPDATE_WALLET_NAME': {
      const { walletId, name } = action.payload;
      const updatedWallets = state.wallets.map((w) =>
        w.id === walletId
          ? { ...w, name, lastAccessed: Date.now() }
          : w
      );
      const updatedCurrentWallet = updatedWallets.find(w => w.id === state.currentWallet?.id);
      return {
        ...state,
        wallets: updatedWallets,
        currentWallet: updatedCurrentWallet || null,
      };
    }
    case 'UPDATE_ACCOUNT_NAME': {
      const { walletId, accountId, name } = action.payload;
      const updatedWallets = state.wallets.map((w) =>
        w.id === walletId
          ? {
              ...w,
              accounts: w.accounts.map((acc) =>
                acc.id === accountId ? { ...acc, name } : acc
              ),
              lastAccessed: Date.now(),
            }
          : w
      );
      const updatedCurrentWallet = updatedWallets.find(w => w.id === state.currentWallet?.id);
      const updatedCurrentAccount = updatedCurrentWallet?.accounts.find(acc => acc.id === state.currentAccount?.id);
      return {
        ...state,
        wallets: updatedWallets,
        currentWallet: updatedCurrentWallet ? { ...updatedCurrentWallet, accounts: updatedCurrentWallet.accounts } : null,
        currentAccount: updatedCurrentAccount || null,
      };
    }
    case 'LOCK_WALLET':
      return {
        ...state,
        isWalletUnlocked: false,
        globalPassword: null,
        wallets: state.wallets.map(w => ({
          ...w,
          accounts: w.accounts.map(acc => ({
            ...acc,
            getPrivateKey: async () => null, // Clear sensitive data
            getPublicKey: async () => null, // Clear sensitive data
          })),
          decryptPrivateKey: async () => null, // Clear sensitive data
          getPrivateKey: async () => null, // Clear sensitive data
          getPublicKey: async () => null, // Clear sensitive data
        })),
        currentWallet: state.currentWallet ? {
          ...state.currentWallet,
          accounts: state.currentWallet.accounts.map(acc => ({ ...acc, getPrivateKey: async () => null, getPublicKey: async () => null })),
          decryptPrivateKey: async () => null, // Clear sensitive data
          getPrivateKey: async () => null, // Clear sensitive data
          getPublicKey: async () => null, // Clear sensitive data
        } : null,
        currentAccount: state.currentAccount ? {
          ...state.currentAccount,
          getPrivateKey: async () => null, getPublicKey: async () => null
        } : null,
      };
    case 'CLEAR_WALLET':
      return {
        ...initialWalletState,
        isInitializing: false,
      };
    default:
      return state;
  }
};

// Create context
export const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Wallet provider
export const WalletProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [state, dispatch] = useReducer(walletReducer, initialWalletState);
  const { wallets, currentWallet, currentAccount, isWalletUnlocked, hasWallet, isLoading, error, isWalletCreated, isInitializing, currentNetwork, globalPassword, address } = state;
  const walletManagerRef = useRef<CoreWalletManager | null>(null); // Use CoreWalletManager
  const addressDerivationServiceRef = useRef<AddressDerivationService | null>(null);

  useEffect(() => {
    walletManagerRef.current = new CoreWalletManager();
    addressDerivationServiceRef.current = new AddressDerivationService();
  }, []);

  // Convert internal wallet data to public WalletData format
  const convertToWalletData = useCallback((wallet: InternalWalletData): WalletData => {
    const currentAccount = wallet.accounts.find(acc => acc.isActive) || wallet.accounts[0];

    return {
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      encryptedSeedPhrase: wallet.encryptedSeedPhrase,
      accounts: wallet.accounts,
      networks: wallet.accounts.flatMap(acc => acc.networks).filter((value, index, self) => self.indexOf(value) === index),
      currentNetwork: wallet.currentNetwork, // This is already a Network object
      derivationPath: wallet.derivationPath,
      balance: currentAccount?.balances?.[wallet.currentNetwork?.id || ''] || '0', // Use currentNetwork.id
      createdAt: wallet.createdAt,
      lastUsed: wallet.lastAccessed,
      lastAccessed: wallet.lastAccessed, // Ensure lastAccessed is always available
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
  }, []);

  // Load wallet from storage
  const loadWallet = useCallback(async () => {
    dispatch({ type: 'SET_IS_INITIALIZING', payload: true });
    try {
      const storedWallets = await walletManagerRef.current?.getAllWallets();
      if (storedWallets && storedWallets.length > 0) {
        dispatch({ type: 'SET_WALLETS', payload: storedWallets });
        const lastAccessedWallet = storedWallets.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
        dispatch({ type: 'SET_CURRENT_WALLET', payload: lastAccessedWallet });
        dispatch({ type: 'SET_HAS_WALLET', payload: true });
        dispatch({ type: 'SET_IS_WALLET_CREATED', payload: true });

        const storedPassword = await SecureSessionManager.getSessionPassword();
        if (storedPassword) {
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: storedPassword });
          dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
          const activeAccount = await walletManagerRef.current?.getActiveAccount(lastAccessedWallet.id);
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: activeAccount || null });
          // Retrieve the full Network object instead of just constructing a partial one
          const allNetworks = getNetworks();
          const currentNetworkObject: Network = {
            ...allNetworks[lastAccessedWallet.currentNetwork?.id || 'ethereum'],
            id: lastAccessedWallet.currentNetwork?.id || 'ethereum',
            isCustom: false,
            isEnabled: true,
          };
          dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
          dispatch({ type: 'SET_ADDRESS', payload: lastAccessedWallet.address }); // Set address from loaded wallet
        } else {
          dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: false });
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: null });
          dispatch({ type: 'SET_CURRENT_NETWORK', payload: null });
          dispatch({ type: 'SET_ADDRESS', payload: null }); // Clear address if no password
        }

      } else {
        dispatch({ type: 'SET_HAS_WALLET', payload: false });
        dispatch({ type: 'SET_IS_WALLET_CREATED', payload: false });
        dispatch({ type: 'SET_WALLETS', payload: [] });
        dispatch({ type: 'SET_CURRENT_WALLET', payload: null });
        dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: false });
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: null });
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: null });
        dispatch({ type: 'SET_ADDRESS', payload: null }); // Clear address if no wallets
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load wallet data.' });
      dispatch({ type: 'SET_HAS_WALLET', payload: false });
      dispatch({ type: 'SET_IS_WALLET_CREATED', payload: false });
    } finally {
      dispatch({ type: 'SET_IS_INITIALIZING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Lock wallet
  const lockWallet = useCallback(() => {
    SecureSessionManager.clearSession();
    dispatch({ type: 'LOCK_WALLET' });
    toast.success('Wallet locked.');
  }, [dispatch]);

  // Unlock wallet
  const unlockWallet = useCallback(async (password: string) => {
    if (!walletManagerRef.current) {
      console.error('WalletManager not initialized.');
      toast.error('Wallet manager not ready.');
      return false;
    }

    if (!currentWallet) {
      console.error('No current wallet to unlock.');
      toast.error('No wallet selected to unlock.');
      return false;
    }

    try {
      const isValid = await walletManagerRef.current.validatePassword(currentWallet.id, password);
      if (isValid) {
        await SecureSessionManager.createSession(password);
        dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
        dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
        // After unlock, refresh current account and network
        const activeAccount = await walletManagerRef.current.getActiveAccount(currentWallet.id);
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: activeAccount || null });
        const allNetworks = getNetworks();
        const currentNetworkObject: Network = {
          ...allNetworks[currentWallet.currentNetwork?.id || 'ethereum'],
          id: currentWallet.currentNetwork?.id || 'ethereum',
          isCustom: false,
          isEnabled: true,
        };
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
        dispatch({ type: 'SET_ADDRESS', payload: currentWallet.address }); // Set address after unlock
        toast.success('Wallet unlocked successfully!');
        return true;
      } else {
        toast.error('Incorrect password.');
        return false;
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      toast.error(`Failed to unlock wallet: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [currentWallet, dispatch]);

  // Create a new wallet
  const createWallet = useCallback(async (name: string, network: string, password: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const newWallet = await walletManagerRef.current.createWallet({ name, network, password });
      await SecureSessionManager.createSession(password);
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
      dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      dispatch({ type: 'SET_IS_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_WALLETS', payload: [...wallets, newWallet] });
      dispatch({ type: 'SET_CURRENT_WALLET', payload: newWallet });
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: newWallet.accounts[0] || null }); // Set first account as current
      const allNetworks = getNetworks();
      const currentNetworkObject: Network = {
        ...allNetworks[newWallet.currentNetwork?.id || 'ethereum'],
        id: newWallet.currentNetwork?.id || 'ethereum',
        isCustom: false,
        isEnabled: true,
      };
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
      dispatch({ type: 'SET_ADDRESS', payload: newWallet.address }); // Set address for new wallet
      toast.success('Wallet created successfully!');
    } catch (error) {
      console.error('Error creating wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to create wallet: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to create wallet: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [wallets, dispatch]);

  // Import wallet from seed phrase
  const importWallet = useCallback(async (seedPhrase: string, network: string, password: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      // ImportWalletRequest requires a name, generate a default one.
      const importedWallet = await walletManagerRef.current.importWallet({ name: `Imported Wallet ${Date.now()}`, seedPhrase, network, password });
      await SecureSessionManager.createSession(password);
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
      dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      dispatch({ type: 'SET_IS_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_WALLETS', payload: [...wallets, importedWallet] });
      dispatch({ type: 'SET_CURRENT_WALLET', payload: importedWallet });
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: importedWallet.accounts[0] || null }); // Set first account as current
      const allNetworks = getNetworks();
      const currentNetworkObject: Network = {
        ...allNetworks[importedWallet.currentNetwork?.id || 'ethereum'],
        id: importedWallet.currentNetwork?.id || 'ethereum',
        isCustom: false,
        isEnabled: true,
      };
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
      dispatch({ type: 'SET_ADDRESS', payload: importedWallet.address }); // Set address for imported wallet
      toast.success('Wallet imported successfully!');
    } catch (error) {
      console.error('Error importing wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to import wallet: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to import wallet: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [wallets, dispatch]);

  // Import wallet from private key
  const importWalletFromPrivateKey = useCallback(async (privateKey: string, network: string, password: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const targetWalletId = currentWallet?.id || (wallets.length > 0 ? wallets[0].id : '');
      let importedAccount: WalletAccount;
      let newWallet: WalletData | null = null;

      if (targetWalletId) {
        // Add account to an existing wallet
        importedAccount = await walletManagerRef.current.addAccountFromPrivateKey(
          targetWalletId,
          privateKey,
          password,
          `Imported PK Account ${Date.now()}`
        );
        const updatedTargetWallet = await walletManagerRef.current.getWallet(targetWalletId);
        if (updatedTargetWallet) {
          dispatch({ type: 'SET_WALLETS', payload: wallets.map(w => w.id === targetWalletId ? updatedTargetWallet : w) });
          dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedTargetWallet });
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: importedAccount });
        } else {
          // This case implies an error in fetching the updated wallet
          throw new Error('Failed to retrieve updated wallet after adding account.');
        }
      } else {
        // No existing wallet, create a new one with this account
        importedAccount = await walletManagerRef.current.addAccountFromPrivateKey(
          'new-wallet-temp-id', // Temporary ID, will be replaced by createWallet
          privateKey,
          password,
          `Imported PK Wallet ${Date.now()}`
        );

        newWallet = {
          id: Date.now().toString(),
          name: `Imported PK Wallet ${Date.now()}`,
          address: importedAccount.addresses[network] || Object.values(importedAccount.addresses)[0],
          encryptedSeedPhrase: importedAccount.encryptedSeedPhrase, // This is the encrypted private key
          accounts: [importedAccount],
          networks: [network],
          currentNetwork: (getNetworks()[network] ? { ...getNetworks()[network], id: network, isCustom: false, isEnabled: true } : null), // Convert string to Network object
          derivationPath: importedAccount.derivationPath,
          balance: importedAccount.balances[network] || '0',
          createdAt: Date.now(),
          lastUsed: Date.now(),
          lastAccessed: Date.now(),
          decryptPrivateKey: importedAccount.getPrivateKey,
          getPrivateKey: importedAccount.getPrivateKey,
          getPublicKey: importedAccount.getPublicKey,
        };
        dispatch({ type: 'SET_WALLETS', payload: [...wallets, newWallet] });
        dispatch({ type: 'SET_CURRENT_WALLET', payload: newWallet });
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: importedAccount });
      }

      await SecureSessionManager.createSession(password);
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
      dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      dispatch({ type: 'SET_IS_WALLET_CREATED', payload: true });

      if (newWallet) { // If a new wallet was created, set its network
        const allNetworks = getNetworks();
        const currentNetworkObject: Network = {
          ...allNetworks[newWallet.currentNetwork?.id || 'ethereum'],
          id: newWallet.currentNetwork?.id || 'ethereum',
          isCustom: false,
          isEnabled: true,
        };
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
      } else if (currentWallet) { // If added to existing wallet, update its network if needed
        const allNetworks = getNetworks();
        const currentNetworkObject: Network = {
          ...allNetworks[currentWallet.currentNetwork?.id || 'ethereum'],
          id: currentWallet.currentNetwork?.id || 'ethereum',
          isCustom: false,
          isEnabled: true,
        };
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
      }
      dispatch({ type: 'SET_ADDRESS', payload: newWallet?.address || currentWallet?.address || null }); // Set address for imported wallet
      toast.success('Account imported from private key successfully!');
    } catch (error) {
      console.error('Error importing wallet from private key:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to import wallet from private key: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to import wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [wallets, currentWallet, dispatch]);

  // Initialize wallet (this function might be refined or removed based on final flow)
  const initializeWallet = useCallback(async () => {
    if (!walletManagerRef.current) {
      console.warn('WalletManager not initialized during initializeWallet.');
      return;
    }
    await loadWallet();
  }, [loadWallet]);

  // Add hardware wallet - placeholder for now
  const addHardwareWallet = useCallback(async (type: 'ledger' | 'trezor' | 'lattice' | 'qr', address: string, derivationPath: string) => {
    console.log('Add hardware wallet placeholder', type, address, derivationPath);
    toast.success(`Hardware wallet (${type}) added successfully! (Placeholder)`);
  }, []);

  // Get balance for an address on a specific network
  const getBalance = useCallback(async (address: string, network: string): Promise<string> => {
    try {
      const balance = await web3Utils.getRealBalance(address, network); // Use web3Utils.getRealBalance
      return balance;
    } catch (error: any) {
      console.error(`Error getting balance for ${address} on ${network}:`, error);
      return '0';
    }
  }, []);

  // Add new account to wallet
  const addAccount = useCallback(async (walletId: string, password: string, accountName?: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const { account, seedPhrase } = await walletManagerRef.current.addAccountToWallet(walletId, password, accountName);
      dispatch({ type: 'ADD_NEW_ACCOUNT', payload: { walletId, account } });
      // If the new account is for the current wallet, update currentWallet and currentAccount
      if (currentWallet?.id === walletId) {
        const updatedWallet = await walletManagerRef.current.getWallet(walletId);
        if (updatedWallet) {
          dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: account });
        }
      }
      toast.success(`Account '${account.name}' added successfully.`);
      return { account, seedPhrase };
    } catch (error) {
      console.error('Error adding new account:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to add new account: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to add new account: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, dispatch]);

  // Add account from seed phrase
  const addAccountFromSeedPhrase = useCallback(async (walletId: string, seedPhrase: string, password: string, accountName?: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const newAccount = await walletManagerRef.current.addAccountFromSeedPhrase(walletId, seedPhrase, password, accountName);
      dispatch({ type: 'ADD_NEW_ACCOUNT', payload: { walletId, account: newAccount } });
      // If the new account is for the current wallet, update currentWallet and currentAccount
      if (currentWallet?.id === walletId) {
        const updatedWallet = await walletManagerRef.current.getWallet(walletId);
        if (updatedWallet) {
          dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: newAccount });
        }
      }
      toast.success(`Account '${newAccount.name}' imported successfully from seed phrase.`);
      return newAccount;
    } catch (error) {
      console.error('Error adding account from seed phrase:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to import account from seed phrase: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to import account from seed phrase: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, dispatch]);

  // Add account from private key
  const addAccountFromPrivateKey = useCallback(async (walletId: string, privateKey: string, password: string, accountName?: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const newAccount = await walletManagerRef.current.addAccountFromPrivateKey(walletId, privateKey, password, accountName);
      dispatch({ type: 'ADD_NEW_ACCOUNT', payload: { walletId, account: newAccount } });
      // If the new account is for the current wallet, update currentWallet and currentAccount
      if (currentWallet?.id === walletId) {
        const updatedWallet = await walletManagerRef.current.getWallet(walletId);
        if (updatedWallet) {
          dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
          dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: newAccount });
        }
      }
      toast.success(`Account '${newAccount.name}' imported successfully from private key.`);
      return newAccount;
    } catch (error) {
      console.error('Error adding account from private key:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to import account from private key: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to import account from private key: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, dispatch]);

  // Remove account
  const removeAccount = useCallback(async (walletId: string, accountId: string) => {
    if (!walletManagerRef.current) {
      throw new Error('WalletManager not initialized.');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await walletManagerRef.current.removeAccountFromWallet(walletId, accountId);
      dispatch({ type: 'REMOVE_ACCOUNT', payload: { walletId, accountId } });
      // If the removed account was the current account, clear it
      if (currentAccount?.id === accountId) {
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: null });
      }
      // If the removed account was in the current wallet, update the current wallet
      if (currentWallet?.id === walletId) {
        const updatedWallet = await walletManagerRef.current.getWallet(walletId);
        if (updatedWallet) {
          dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
        }
      }
      toast.success('Account removed successfully.');
    } catch (error) {
      console.error('Error removing account:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to remove account: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to remove account: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, currentAccount, dispatch]);

  // Get current account
  const getCurrentAccount = useCallback(async (): Promise<WalletAccount | null> => {
    if (!walletManagerRef.current || !currentWallet) {
      return null;
    }
    return walletManagerRef.current.getCurrentAccountForWallet(currentWallet.id);
  }, [currentWallet]);

  // Get wallet accounts
  const getWalletAccounts = useCallback(async (walletId: string): Promise<WalletAccount[]> => {
    if (!walletManagerRef.current) {
      return [];
    }
    return walletManagerRef.current.getWalletAccounts(walletId);
  }, []);

  // Get password (from SecureSessionManager)
  const getPassword = useCallback(async (): Promise<string | null> => {
    return SecureSessionManager.getSessionPassword();
  }, []);

  // Decrypt private key (via current wallet)
  const decryptPrivateKey = useCallback(async (password: string): Promise<string | null> => {
    if (!currentWallet) {
      throw new Error('No current wallet selected.');
    }
    return currentWallet.decryptPrivateKey(password);
  }, [currentWallet]);

  // Get account private key
  const getAccountPrivateKey = useCallback(async (accountId: string, password: string): Promise<string | null> => {
    if (!walletManagerRef.current || !currentWallet) return null;
    return walletManagerRef.current.getAccountPrivateKey(currentWallet.id, accountId, password);
  }, [currentWallet]);

  // Get account public key
  const getAccountPublicKey = useCallback(async (accountId: string, password: string): Promise<string | null> => {
    if (!walletManagerRef.current || !currentWallet) return null;
    const account = currentWallet.accounts.find(acc => acc.id === accountId);
    if (!account) return null;
    return account.getPublicKey(password);
  }, [currentWallet]);

  // Get account seed phrase
  const getAccountSeedPhrase = useCallback(async (accountId: string, password: string): Promise<string | null> => {
    if (!walletManagerRef.current || !currentWallet) return null;
    return walletManagerRef.current.getAccountSeedPhrase(currentWallet.id, accountId, password);
  }, [currentWallet]);

  // Refresh wallet
  const refreshWallet = useCallback(async () => {
    await loadWallet();
  }, [loadWallet]);

  // Set global password
  const setGlobalPassword = useCallback((password: string) => {
    dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
  }, [dispatch]);

  // Set global password and hash
  const setGlobalPasswordAndHash = useCallback(async (password: string) => {
    await SecureSessionManager.createSession(password); // Corrected to createSession
    dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
  }, [dispatch]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  // Extend session
  const extendSession = useCallback(async () => {
    // SecureSessionManager does not have a public extendSession method, but its session logic handles timeouts.
    // No explicit action needed here unless SecureSessionManager is modified to expose such a method.
    console.log('Extend session called - SecureSessionManager handles session extension implicitly.');
  }, []);

  // Debug session status
  const debugSessionStatus = useCallback(async () => {
    console.log('SecureSessionManager Status:', await SecureSessionManager.hasActiveSession() ? 'Active' : 'Inactive'); // Corrected to hasActiveSession
  }, []);

  // Debug password (for testing purposes)
  const debugPassword = useCallback(async (testPassword: string): Promise<boolean> => {
    if (!currentWallet) return false;
    return walletManagerRef.current?.validatePassword(currentWallet.id, testPassword) || false;
  }, [currentWallet]);

  // Debug unlock issue
  const debugUnlockIssue = useCallback(async (testPassword: string) => {
    console.log('Debug Unlock Issue:');
    console.log('Current Wallet:', currentWallet);
    console.log('Attempting unlock with test password...');
    const unlocked = await unlockWallet(testPassword);
    console.log('Unlocked:', unlocked);
  }, [currentWallet, unlockWallet]);

  // Debug storage
  const debugStorage = useCallback(async (): Promise<boolean> => {
    console.log('Storage contents:', await storage.get(null));
    return true;
  }, []);

  // Multi-wallet support functions
  const getAllWallets = useCallback(async (): Promise<WalletData[]> => {
    return walletManagerRef.current?.getAllWallets() || [];
  }, []);

  const switchWallet = useCallback(async (walletId: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await walletManagerRef.current.setActiveWallet(walletId);
      const targetWallet = await walletManagerRef.current.getWallet(walletId);
      if (targetWallet) {
        dispatch({ type: 'SET_CURRENT_WALLET', payload: targetWallet });
        const activeAccount = await walletManagerRef.current.getActiveAccount(walletId);
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: activeAccount || null });
        const allNetworks = getNetworks();
        const currentNetworkObject: Network = {
          ...allNetworks[targetWallet.currentNetwork?.id || 'ethereum'],
          id: targetWallet.currentNetwork?.id || 'ethereum',
          isCustom: false,
          isEnabled: true,
        };
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
        dispatch({ type: 'SET_ADDRESS', payload: targetWallet.address }); // Set address for switched wallet
        toast.success(`Switched to wallet: ${targetWallet.name}`);
      } else {
        throw new Error('Target wallet not found after setting active.');
      }
    } catch (error) {
      console.error('Error switching wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to switch wallet: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to switch wallet: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const getActiveWallet = useCallback(async (): Promise<WalletData | null> => {
    if (!walletManagerRef.current) return null;
    const activeWalletInternal = walletManagerRef.current.getCurrentWallet();
    return activeWalletInternal ? activeWalletInternal : null;
  }, []);

  // Update wallet name
  const updateWalletName = useCallback(async (walletId: string, newName: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await walletManagerRef.current.updateWalletName(walletId, newName);
      dispatch({ type: 'UPDATE_WALLET_NAME', payload: { walletId, name: newName } });
      if (currentWallet?.id === walletId) {
        dispatch({ type: 'SET_CURRENT_WALLET', payload: { ...currentWallet, name: newName } });
      }
      toast.success('Wallet name updated successfully!');
    } catch (error) {
      console.error('Error updating wallet name:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update wallet name: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to update wallet name: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, dispatch]);

  // Update account name
  const updateAccountName = useCallback(async (walletId: string, accountId: string, newName: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await walletManagerRef.current.updateAccountName(walletId, accountId, newName);
      dispatch({ type: 'UPDATE_ACCOUNT_NAME', payload: { walletId, accountId, name: newName } });
      if (currentAccount?.id === accountId) {
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: { ...currentAccount, name: newName } });
      }
      if (currentWallet?.id === walletId) {
        const updatedAccounts = currentWallet.accounts.map(acc =>
          acc.id === accountId ? { ...acc, name: newName } : acc
        );
        dispatch({ type: 'SET_CURRENT_WALLET', payload: { ...currentWallet, accounts: updatedAccounts } });
      }
      toast.success('Account name updated successfully!');
    } catch (error) {
      console.error('Error updating account name:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update account name: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to update account name: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, currentAccount, dispatch]);

  // Export wallet
  const exportWallet = useCallback(async (walletId: string, password: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const exportedData = await walletManagerRef.current.exportWallet(walletId, password);
      toast.success('Wallet exported successfully!');
      return exportedData;
    } catch (error) {
      console.error('Error exporting wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to export wallet: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to export wallet: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // Import wallet from backup
  const importWalletFromBackup = useCallback(async (backupData: string, password: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const importedWallet = await walletManagerRef.current.restoreWallet(backupData, password);
      await SecureSessionManager.createSession(password); // Corrected to createSession
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
      dispatch({ type: 'SET_IS_WALLET_UNLOCKED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      dispatch({ type: 'SET_IS_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_WALLETS', payload: [...wallets, importedWallet] });
      dispatch({ type: 'SET_CURRENT_WALLET', payload: importedWallet });
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: importedWallet.accounts[0] || null }); // Set first account as current
      const allNetworks = getNetworks();
      const currentNetworkObject: Network = {
        ...allNetworks[importedWallet.currentNetwork?.id || 'ethereum'],
        id: importedWallet.currentNetwork?.id || 'ethereum',
        isCustom: false,
        isEnabled: true,
      };
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
      dispatch({ type: 'SET_ADDRESS', payload: importedWallet.address }); // Set address for imported wallet
      toast.success('Wallet restored successfully from backup!');
    } catch (error) {
      console.error('Error restoring wallet from backup:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to restore wallet from backup: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to restore wallet from backup: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [wallets, dispatch]);

  // Update account balance and nonce locally and in storage
  const updateAccountData = useCallback(async (walletId: string, accountId: string, network: string, balance?: string, nonce?: number) => {
    try {
      if (!globalPassword) {
        console.warn('Cannot update account data without global password. Wallet is locked.');
        return;
      }
      if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');

      // Update in WalletManager first, which will persist to storage
      if (balance !== undefined) {
        const account = await walletManagerRef.current.getAccountByAddress(currentWallet?.address || '', network);
        if (account && account.id === accountId) { // Ensure we are updating the correct account
          await walletManagerRef.current.updateAccountBalance(account.addresses[network] || '', balance, network);
        }
      }
      if (nonce !== undefined) {
        const account = await walletManagerRef.current.getAccountByAddress(currentWallet?.address || '', network);
        if (account && account.id === accountId) { // Ensure we are updating the correct account
          await walletManagerRef.current.updateAccountNonce(account.addresses[network] || '', nonce, network);
        }
      }

      // Then dispatch to update context state
      dispatch({ type: 'UPDATE_ACCOUNT_DATA', payload: { walletId, accountId, network, balance, nonce } });

      // After updating, refresh current wallet and account to reflect changes
      const updatedWallet = await walletManagerRef.current.getWallet(walletId);
      if (updatedWallet) {
        dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
        const updatedAccount = updatedWallet.accounts.find(acc => acc.id === accountId);
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: updatedAccount || null });
      }

    } catch (error) {
      console.error('Error updating account data:', error);
      toast.error(`Failed to update account data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [globalPassword, currentWallet, dispatch]);

  // Delete wallet
  const deleteWallet = useCallback(async (walletId: string) => {
    if (!walletManagerRef.current) throw new Error('WalletManager not initialized.');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await walletManagerRef.current.deleteWallet(walletId);
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      dispatch({ type: 'SET_WALLETS', payload: updatedWallets });
      if (currentWallet?.id === walletId) {
        dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallets.length > 0 ? updatedWallets[0] : null });
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: null });
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: null });
        dispatch({ type: 'SET_ADDRESS', payload: null }); // Clear address if current wallet is deleted
      }
      toast.success('Wallet deleted successfully.');
    } catch (error) {
      console.error('Error deleting wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete wallet: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to delete wallet: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [wallets, currentWallet, dispatch]);

  // Switch network for current wallet
  const switchNetwork = useCallback(async (networkId: string) => {
    if (!walletManagerRef.current || !currentWallet || !globalPassword) {
      throw new Error('WalletManager not initialized, no current wallet, or no password.');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await walletManagerRef.current.switchWalletNetwork(currentWallet.id, networkId);
      const updatedWallet = await walletManagerRef.current.getWallet(currentWallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLETS', payload: wallets.map(w => w.id === updatedWallet.id ? updatedWallet : w) });
        dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
        const allNetworks = getNetworks();
        const currentNetworkObject: Network = {
          ...allNetworks[networkId],
          id: networkId,
          isCustom: false,
          isEnabled: true,
        };
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
        toast.success(`Switched to network: ${networkId}`);
      }
    } catch (error) {
      console.error('Error switching network:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to switch network: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to switch network: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, wallets, globalPassword, dispatch]);

  // Switch account for current wallet
  const switchAccount = useCallback(async (walletId: string, accountId: string) => {
    if (!walletManagerRef.current || !currentWallet || !globalPassword) {
      throw new Error('WalletManager not initialized, no current wallet, or no password.');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await walletManagerRef.current.switchAccount(walletId, accountId);
      const updatedWallet = await walletManagerRef.current.getWallet(walletId);
      if (updatedWallet) {
        dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedWallet });
        const activeAccount = await walletManagerRef.current.getActiveAccount(walletId);
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: activeAccount || null });
        // Update current network if account's network differs
        if (activeAccount && activeAccount.networks.length > 0 && activeAccount.networks[0] !== currentNetwork?.id) {
          const newNetworkId = activeAccount.networks[0];
          const allNetworks = getNetworks();
          const currentNetworkObject: Network = {
            ...allNetworks[newNetworkId],
            id: newNetworkId,
            isCustom: false,
            isEnabled: true,
          };
          dispatch({ type: 'SET_CURRENT_NETWORK', payload: currentNetworkObject });
        }
        toast.success(`Switched to account: ${activeAccount?.name}`);
      }
    } catch (error) {
      console.error('Error switching account:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to switch account: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to switch account: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, currentNetwork, globalPassword, dispatch]);

  // Update account balances for all accounts in the current wallet
  const updateAllBalances = useCallback(async () => {
    if (!walletManagerRef.current || !currentWallet || !globalPassword) {
      console.warn('Cannot update all balances: WalletManager not initialized, no current wallet, or no password.');
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const updatedAccounts = await Promise.all(
        currentWallet.accounts.map(async (account) => {
          const newBalances: { [key: string]: string } = {};
          for (const networkId of account.networks) {
            try {
              const address = account.addresses[networkId];
              if (address) {
                const balance = await web3Utils.getRealBalance(address, networkId); // Use web3Utils.getRealBalance
                newBalances[networkId] = balance;
                // Update in WalletManager as well
                await walletManagerRef.current?.updateAccountBalance(address, balance, networkId);
              }
            } catch (error) {
              console.error(`Failed to get balance for account ${account.id} on network ${networkId}:`, error);
              newBalances[networkId] = account.balances[networkId] || '0'; // Keep old balance or default to 0
            }
          }
          return {
            ...account,
            balances: newBalances,
            getPrivateKey: account.getPrivateKey,
            getPublicKey: account.getPublicKey,
          };
        })
      );

      const updatedCurrentWallet: WalletData = {
        ...currentWallet,
        accounts: updatedAccounts,
        balance: updatedAccounts[0]?.balances?.[currentWallet.currentNetwork?.id || ''] || '0', // Use currentNetwork.id
        lastAccessed: Date.now(),
      };

      const updatedWallets = wallets.map(w => w.id === updatedCurrentWallet.id ? updatedCurrentWallet : w);
      // Persist the updated wallets
      await storage.set({ wallets: updatedWallets }); // Corrected: pass an object to storage.set

      dispatch({ type: 'SET_WALLETS', payload: updatedWallets });
      dispatch({ type: 'SET_CURRENT_WALLET', payload: updatedCurrentWallet });
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: updatedCurrentWallet.accounts.find(acc => acc.isActive) || updatedCurrentWallet.accounts[0] });

      toast.success('Balances updated successfully!');
    } catch (error) {
      console.error('Error updating all balances:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update balances: ${error instanceof Error ? error.message : String(error)}` });
      toast.error(`Failed to update balances: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentWallet, wallets, globalPassword, dispatch]);

  const contextValue = useMemo(
    () => ({
      wallets: state.wallets,
      currentWallet: state.currentWallet,
      isWalletUnlocked: state.isWalletUnlocked,
      hasWallet: state.hasWallet,
      balances: state.balances,
      isLoading: state.isLoading,
      error: state.error,
      isWalletCreated: state.isWalletCreated,
      isInitializing: state.isInitializing,
      address: state.currentWallet?.address || null, // Derived from currentWallet
      currentNetwork: state.currentNetwork,
      currentAccount: state.currentAccount,
      globalPassword: state.globalPassword,
      lockWallet,
      unlockWallet,
      createWallet,
      importWallet,
      importWalletFromPrivateKey,
      initializeWallet,
      addHardwareWallet,
      switchAccount,
      addAccount,
      addAccountFromSeedPhrase,
      addAccountFromPrivateKey,
      removeAccount,
      getCurrentAccount,
      getWalletAccounts,
      getPassword,
      decryptPrivateKey,
      getAccountPrivateKey,
      getAccountPublicKey,
      getAccountSeedPhrase,
      refreshWallet,
      setGlobalPassword,
      setGlobalPasswordAndHash,
      clearError,
      extendSession,
      debugSessionStatus,
      debugPassword,
      debugUnlockIssue,
      debugStorage,
      getAllWallets,
      switchWallet,
      getActiveWallet,
      updateWalletName,
      updateAccountName,
      exportWallet,
      importWalletFromBackup,
      updateAllBalances,
      deleteWallet,
      getBalance,
      updateAccountData,
      switchNetwork,
    }),
    [state.wallets, state.currentWallet, state.isWalletUnlocked, state.hasWallet, state.balances, state.isLoading, state.error,
      state.isWalletCreated, state.isInitializing, state.currentNetwork, state.currentAccount, state.globalPassword,
      lockWallet, unlockWallet, createWallet, importWallet, importWalletFromPrivateKey, initializeWallet, addHardwareWallet,
      switchAccount, addAccount, addAccountFromSeedPhrase, addAccountFromPrivateKey, removeAccount, getCurrentAccount,
      getWalletAccounts, getPassword, decryptPrivateKey, getAccountPrivateKey, getAccountPublicKey, getAccountSeedPhrase,
      refreshWallet, setGlobalPassword, setGlobalPasswordAndHash, clearError, extendSession, debugSessionStatus,
      debugPassword, debugUnlockIssue, debugStorage, getAllWallets, switchWallet, getActiveWallet, updateWalletName,
      updateAccountName, exportWallet, importWalletFromBackup, updateAllBalances, deleteWallet, getBalance, updateAccountData,
      switchNetwork
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 