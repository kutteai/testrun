import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, hashPassword, verifyPassword } from '../utils/crypto-utils';
import { deriveWalletFromSeed } from '../utils/key-derivation';
import { 
  WalletData, 
  WalletState, 
  WalletContextType, 
  Network
} from '../types/index';

// Initial state
const initialState: WalletState = {
  wallet: null,
  isWalletUnlocked: false,
  hasWallet: false,
  balances: {},
  isLoading: false,
  error: null,
  isWalletCreated: false,
  isInitializing: false,
  address: null,
  currentNetwork: null,
  networks: [],
  accounts: [],
  privateKey: null
};

// Action types
type WalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_WALLET_CREATED'; payload: boolean }
  | { type: 'SET_WALLET'; payload: WalletData }
  | { type: 'SET_WALLET_UNLOCKED'; payload: boolean }
  | { type: 'SET_BALANCES'; payload: Record<string, string> }
  | { type: 'SET_CURRENT_NETWORK'; payload: Network }
  | { type: 'SET_HAS_WALLET'; payload: boolean }
  | { type: 'LOCK_WALLET' }
  | { type: 'CLEAR_WALLET' };

// Reducer
const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    case 'SET_WALLET_CREATED':
      return { ...state, isWalletCreated: action.payload };
    case 'SET_WALLET':
      return { 
        ...state, 
        wallet: action.payload,
        address: action.payload.address,
        accounts: [action.payload.address],
        isWalletUnlocked: true,
        hasWallet: true
      };
    case 'SET_WALLET_UNLOCKED':
      return { ...state, isWalletUnlocked: action.payload };
    case 'SET_BALANCES':
      return { ...state, balances: { ...state.balances, ...action.payload } };
    case 'SET_CURRENT_NETWORK':
      return { ...state, currentNetwork: action.payload };
    case 'SET_HAS_WALLET':
      return { ...state, hasWallet: action.payload };
    case 'LOCK_WALLET':
      return { 
        ...state, 
        isWalletUnlocked: false,
        privateKey: null
      };
    case 'CLEAR_WALLET':
      return { 
        ...state, 
        wallet: null,
        isWalletUnlocked: false,
        hasWallet: false,
        balances: {},
        address: null,
        accounts: [],
        privateKey: null,
        isInitializing: false
      };
    default:
      return state;
  }
};

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  // Auto-update balances when wallet is unlocked
  useEffect(() => {
    if (state.isWalletUnlocked && state.address) {
      updateAllBalances();
    }
  }, [state.isWalletUnlocked, state.address]);

  // Initialize wallet
  const initializeWallet = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      
      // Check if wallet exists in storage
      const storedWallet = await getStoredWallet();
      if (storedWallet) {
        dispatch({ type: 'SET_WALLET_CREATED', payload: true });
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
      }
    } catch (error) {
      toast.error('Failed to initialize wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize wallet' });
    } finally {
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    }
  };

  // Create new wallet with real implementation
  const createWallet = async (name: string, network: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Generate real BIP39 seed phrase
      const seedPhrase = generateBIP39SeedPhrase();
      
      // Derive wallet from seed phrase
      const walletData = await deriveWalletFromSeed(seedPhrase, network);
      
      const wallet: WalletData = {
        id: Date.now().toString(),
        name,
        address: walletData.address,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        seedPhrase: walletData.seedPhrase,
        network,
        currentNetwork: network,
        derivationPath: walletData.derivationPath,
        createdAt: Date.now()
      };

      // Store wallet securely
      await storeWallet(wallet);
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      toast.success('Wallet created successfully');
    } catch (error) {
      toast.error('Failed to create wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create wallet' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Import wallet from seed phrase with real implementation
  const importWallet = async (seedPhrase: string, network: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Validate seed phrase
      if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Derive wallet from seed phrase
      const walletData = await deriveWalletFromSeed(seedPhrase, network);
      
      const wallet: WalletData = {
        id: Date.now().toString(),
        name: 'Imported Wallet',
        address: walletData.address,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        seedPhrase: walletData.seedPhrase,
        network,
        currentNetwork: network,
        derivationPath: walletData.derivationPath,
        createdAt: Date.now()
      };

      // Store wallet securely
      await storeWallet(wallet);
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      toast.success('Wallet imported successfully');
    } catch (error) {
      toast.error('Failed to import wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import wallet' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Unlock wallet with real password verification
  const unlockWallet = async (password: string): Promise<boolean> => {
    try {
      const storedWallet = await getStoredWallet();
      if (!storedWallet) {
        throw new Error('No wallet found');
      }

      // Get stored password hash
      const storedHash = await getStoredPasswordHash();
      if (!storedHash) {
        // First time unlock, create password hash
        const hash = await hashPassword(password);
        await storePasswordHash(hash);
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
        toast.success('Wallet unlocked successfully');
        return true;
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash);
      if (isValid) {
      dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
        toast.success('Wallet unlocked successfully');
      return true;
      } else {
        toast.error('Invalid password');
        return false;
      }
    } catch (error) {
      toast.error('Failed to unlock wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to unlock wallet' });
      return false;
    }
  };

  // Lock wallet
  const lockWallet = (): void => {
    dispatch({ type: 'LOCK_WALLET' });
    toast.success('Wallet locked');
  };

  // Switch network
  const switchNetwork = async (networkId: string): Promise<void> => {
    try {
      toast(`Switching to network: ${networkId}`);
      
      // Find the network
      const network = state.networks.find(n => n.id === networkId);
      if (!network) {
        throw new Error('Network not found');
      }

      dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
      
      // Update balances for new network
      if (state.address) {
        await updateAllBalances();
      }
    } catch (error) {
      toast.error('Failed to switch network');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch network' });
    }
  };

  // Get balance for specific address and network
  const getBalance = async (address: string, network: string): Promise<string> => {
    try {
      const balance = await getRealBalance(address, network);
      return balance;
    } catch (error) {
      toast.error('Failed to get balance');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get balance' });
      return '0';
    }
  };

  // Update all balances
  const updateAllBalances = async (): Promise<void> => {
    if (!state.address) return;

    try {
      const newBalances: Record<string, string> = {};
      
      for (const network of state.networks) {
        const balance = await getRealBalance(state.address!, network.id);
        newBalances[`${state.address}_${network.id}`] = balance;
      }

      dispatch({ type: 'SET_BALANCES', payload: newBalances });
    } catch (error) {
      toast.error('Failed to update balances');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update balances' });
    }
  };

  // Store wallet securely
  const storeWallet = async (wallet: WalletData): Promise<void> => {
    // In a real implementation, you would encrypt the wallet data
    // For now, we'll store it as is (should be encrypted in production)
    chrome.storage.local.set({ wallet });
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['wallet'], (result) => {
        resolve(result.wallet || null);
      });
    });
  };

  // Store password hash
  const storePasswordHash = async (hash: string): Promise<void> => {
    chrome.storage.local.set({ passwordHash: hash });
  };

  // Get stored password hash
  const getStoredPasswordHash = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['passwordHash'], (result) => {
        resolve(result.passwordHash || null);
      });
    });
  };

  // Add hardware wallet
  const addHardwareWallet = async (type: 'ledger' | 'trezor', address: string, derivationPath: string): Promise<void> => {
    try {
      const { hardwareWalletManager } = await import('../utils/hardware-wallet');
      
      // Connect to hardware wallet
      await hardwareWalletManager.connectHardwareWallet(type);
      
      // Verify the address matches
      const addresses = await hardwareWalletManager.getHardwareWalletAddresses(derivationPath);
      if (!addresses.includes(address)) {
        throw new Error('Address verification failed');
      }

      // Create hardware wallet data
      const hardwareWallet: WalletData = {
        id: `hw_${type}_${Date.now()}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Wallet`,
        address,
        seedPhrase: '', // Hardware wallets don't expose seed phrases
        privateKey: '', // Hardware wallets don't expose private keys
        publicKey: await hardwareWalletManager.exportPublicKey(`hw_${type}_${Date.now()}`, derivationPath),
        network: 'ethereum',
        currentNetwork: 'ethereum',
        derivationPath,
        createdAt: Date.now()
      };

      // Store hardware wallet
      await storeWallet(hardwareWallet);
      
      dispatch({ type: 'SET_WALLET', payload: hardwareWallet });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} wallet added successfully`);
    } catch (error) {
      toast.error(`Failed to add ${type} wallet`);
      dispatch({ type: 'SET_ERROR', payload: `Failed to add ${type} wallet` });
    }
  };

  const value: WalletContextType = {
    ...state,
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    switchNetwork,
    getBalance,
    updateAllBalances,
    initializeWallet,
    addHardwareWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 