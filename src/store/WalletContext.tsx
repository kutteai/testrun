import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
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
  | { type: 'CLEAR_WALLET' }
  | { type: 'RESTORE_SESSION'; payload: { wallet: WalletData; isUnlocked: boolean } };

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
        hasWallet: true,
        isWalletCreated: true
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
        isInitializing: false,
        isWalletCreated: false
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        wallet: action.payload.wallet,
        address: action.payload.wallet.address,
        accounts: [action.payload.wallet.address],
        hasWallet: true,
        isWalletCreated: true,
        isWalletUnlocked: action.payload.isUnlocked,
        isInitializing: false
      };
    default:
      return state;
  }
};

// Session storage keys
const STORAGE_KEYS = {
  WALLET_DATA: 'wallet_data',
  WALLET_SESSION: 'wallet_session',
  SESSION_TIMESTAMP: 'session_timestamp',
  AUTO_LOCK_TIME: 'auto_lock_time'
};

// Session timeout (15 minutes by default)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

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

  // Initialize wallet and check for existing session
  const initializeWallet = async (): Promise<void> => {
    try {
      console.log('Starting wallet initialization...');
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 10000);
      });
      
      const initPromise = (async () => {
        // Check if wallet exists in storage
        console.log('Fetching stored wallet...');
        const storedWallet = await getStoredWallet();
        console.log('Stored wallet:', !!storedWallet);
        
        if (storedWallet) {
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          
          // Check for active session
          console.log('Checking session...');
          const sessionState = await checkSession();
          console.log('Session state:', sessionState);
          
          if (sessionState.isValid) {
            // Restore session
            dispatch({ 
              type: 'RESTORE_SESSION', 
              payload: { 
                wallet: storedWallet, 
                isUnlocked: true 
              }
            });
            
            // Update session timestamp
            await updateSessionTimestamp();
            
            console.log('Session restored successfully');
          } else {
            // Session expired or invalid
            dispatch({ 
              type: 'RESTORE_SESSION', 
              payload: { 
                wallet: storedWallet, 
                isUnlocked: false 
              }
            });
            
            // Clear expired session
            await clearSession();
            
            console.log('Session expired, wallet locked');
          }
        } else {
          // No wallet found
          dispatch({ type: 'SET_HAS_WALLET', payload: false });
          dispatch({ type: 'SET_WALLET_CREATED', payload: false });
          console.log('No wallet found');
        }
      })();
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log('Wallet initialization completed successfully');
      
    } catch (error) {
      console.error('Wallet initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize wallet';
      dispatch({ type: 'SET_ERROR', payload: `Wallet initialization failed: ${errorMessage}` });
    } finally {
      console.log('Setting isInitializing to false');
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    }
  };

  // Check session validity
  const checkSession = async (): Promise<{ isValid: boolean; timeRemaining: number }> => {
    try {
      const sessionData = await getSessionData();
      
      if (!sessionData.exists) {
        return { isValid: false, timeRemaining: 0 };
      }
      
      const now = Date.now();
      const sessionAge = now - sessionData.timestamp;
      const timeRemaining = SESSION_TIMEOUT - sessionAge;
      
      const isValid = sessionAge < SESSION_TIMEOUT;
      
      return { isValid, timeRemaining };
    } catch (error) {
      console.error('Error checking session:', error);
      return { isValid: false, timeRemaining: 0 };
    }
  };

  // Create new session
  const createSession = async (): Promise<void> => {
    try {
      const sessionData = {
        isActive: true,
        timestamp: Date.now(),
        autoLockTime: SESSION_TIMEOUT
      };
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.WALLET_SESSION]: sessionData,
        [STORAGE_KEYS.SESSION_TIMESTAMP]: Date.now()
      });
      
      console.log('New session created');
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Update session timestamp
  const updateSessionTimestamp = async (): Promise<void> => {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSION_TIMESTAMP]: Date.now()
      });
    } catch (error) {
      console.error('Error updating session timestamp:', error);
    }
  };

  // Clear session
  const clearSession = async (): Promise<void> => {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.WALLET_SESSION,
        STORAGE_KEYS.SESSION_TIMESTAMP
      ]);
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  // Get session data
  const getSessionData = async (): Promise<{ exists: boolean; timestamp: number; isActive: boolean }> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.WALLET_SESSION, STORAGE_KEYS.SESSION_TIMESTAMP], (result) => {
        const sessionData = result[STORAGE_KEYS.WALLET_SESSION];
        const timestamp = result[STORAGE_KEYS.SESSION_TIMESTAMP];
        
        resolve({
          exists: !!sessionData && !!timestamp,
          timestamp: timestamp || 0,
          isActive: sessionData?.isActive || false
        });
      });
    });
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
        encryptedSeedPhrase: walletData.seedPhrase,
        accounts: [walletData.address],
        networks: [network],
        currentNetwork: network,
        derivationPath: walletData.derivationPath,
        balance: '0',
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Store wallet securely
      await storeWallet(wallet);
      
      // Create session
      await createSession();
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      toast.success('Wallet created successfully');
    } catch (error) {
      console.error('Failed to create wallet:', error);
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
        encryptedSeedPhrase: walletData.seedPhrase,
        accounts: [walletData.address],
        networks: [network],
        currentNetwork: network,
        derivationPath: walletData.derivationPath,
        balance: '0',
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Store wallet securely
      await storeWallet(wallet);
      
      // Create session
      await createSession();
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      toast.success('Wallet imported successfully');
    } catch (error) {
      console.error('Failed to import wallet:', error);
      toast.error('Failed to import wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import wallet' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Unlock wallet with real password verification and session creation
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
        
        // Set wallet and create session
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
        await createSession();
        
        toast.success('Wallet unlocked successfully');
        return true;
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash);
      if (isValid) {
        // Set wallet and create session
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
        await createSession();
        
        toast.success('Wallet unlocked successfully');
        return true;
      } else {
        toast.error('Invalid password');
        return false;
      }
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      toast.error('Failed to unlock wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to unlock wallet' });
      return false;
    }
  };

  // Lock wallet and clear session
  const lockWallet = (): void => {
    dispatch({ type: 'LOCK_WALLET' });
    clearSession();
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
      
      // Update session timestamp
      await updateSessionTimestamp();
      
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
      
      // Update session timestamp on activity
      await updateSessionTimestamp();
      
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
      
      // Update session timestamp
      await updateSessionTimestamp();
    } catch (error) {
      toast.error('Failed to update balances');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update balances' });
    }
  };

  // Store wallet securely
  const storeWallet = async (wallet: WalletData): Promise<void> => {
    try {
      await chrome.storage.local.set({ 
        [STORAGE_KEYS.WALLET_DATA]: {
          ...wallet,
          lastAccessed: Date.now()
        }
      });
    } catch (error) {
      console.error('Error storing wallet:', error);
      throw error;
    }
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get([STORAGE_KEYS.WALLET_DATA], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome storage error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result[STORAGE_KEYS.WALLET_DATA] || null);
          }
        });
      } catch (error) {
        console.error('Storage access error:', error);
        reject(error);
      }
    });
  };

  // Store password hash
  const storePasswordHash = async (hash: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ passwordHash: hash });
    } catch (error) {
      console.error('Error storing password hash:', error);
      throw error;
    }
  };

  // Get stored password hash
  const getStoredPasswordHash = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['passwordHash'], (result) => {
        resolve(result.passwordHash || null);
      });
    });
  };

  // Session activity tracker (update session on user activity)
  useEffect(() => {
    if (state.isWalletUnlocked) {
      const handleActivity = () => {
        updateSessionTimestamp();
      };

      // Listen for user activity
      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);

      // Cleanup listeners
      return () => {
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
      };
    }
  }, [state.isWalletUnlocked]);

  // Auto-lock timer
  useEffect(() => {
    if (state.isWalletUnlocked) {
      const checkSessionExpiry = async () => {
        const sessionCheck = await checkSession();
        
        if (!sessionCheck.isValid) {
          console.log('Session expired, locking wallet');
          dispatch({ type: 'LOCK_WALLET' });
          await clearSession();
          toast('Session expired. Please unlock your wallet.');
        }
      };

      // Check session every minute
      const interval = setInterval(checkSessionExpiry, 60000);

      return () => clearInterval(interval);
    }
  }, [state.isWalletUnlocked]);

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
    addHardwareWallet: async (type: 'ledger' | 'trezor', address: string, derivationPath: string) => {
      // Placeholder implementation for hardware wallet support
      console.log('Hardware wallet support not yet implemented:', { type, address, derivationPath });
      toast.error('Hardware wallet support coming soon');
    }
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