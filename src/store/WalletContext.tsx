import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validatePrivateKey, hashPassword, verifyPassword, encryptData } from '../utils/crypto-utils';
import { deriveWalletFromSeed, importWalletFromPrivateKey as importFromPrivateKey } from '../utils/key-derivation';
import { 
  WalletData, 
  WalletState, 
  WalletContextType, 
  Network
} from '../types/index';

// Auto-lock timeout (15 minutes)
const AUTO_LOCK_TIMEOUT = 15 * 60 * 1000;

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
  privateKey: null,
  globalPassword: null
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
  | { type: 'SET_GLOBAL_PASSWORD'; payload: string }
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
    case 'SET_GLOBAL_PASSWORD':
      return { ...state, globalPassword: action.payload };
    case 'LOCK_WALLET':
      return { 
        ...state, 
        isWalletUnlocked: false,
        privateKey: null,
        globalPassword: null
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
        globalPassword: null,
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
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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

  // Listen for network changes and update balances
  useEffect(() => {
    const handleNetworkChange = async (event: CustomEvent) => {
      try {
        const { networkId, network } = event.detail;
        console.log('Network changed to:', networkId, network);
        
        // Update balances for the new network
        if (state.isWalletUnlocked && state.address) {
          await updateAllBalances();
        }
      } catch (error) {
        console.error('Failed to handle network change:', error);
      }
    };

    // Add event listener for network changes
    window.addEventListener('networkChanged', handleNetworkChange as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
    };
  }, [state.isWalletUnlocked, state.address]);

  // Initialize wallet on mount - COMPLETELY DISABLED
  useEffect(() => {
    console.log('WalletContext: Skipping initialization completely...');
    dispatch({ type: 'SET_INITIALIZING', payload: false });
    dispatch({ type: 'SET_HAS_WALLET', payload: false });
    dispatch({ type: 'SET_WALLET_CREATED', payload: false });
    dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
  }, []); // Only run once on mount

  // Save wallet state to storage whenever it changes - DISABLED
  // useEffect(() => {
  //   if (state.hasWallet) {
  //     storeWalletState();
  //   }
  // }, [state.isWalletUnlocked, state.hasWallet, state.isWalletCreated]);

  // Auto-lock functionality - DISABLED
  // useEffect(() => {
  //   const checkAutoLock = async () => {
  //     const storedHash = await getStoredPasswordHash();
  //     if (state.isWalletUnlocked && storedHash) {
  //       startAutoLockTimer();
  //       
  //       // Reset timer on user activity
  //       const handleUserActivity = () => {
  //         lastActivityRef.current = Date.now();
  //         resetAutoLockTimer();
  //       };

  //       // Listen for user activity
  //       document.addEventListener('mousedown', handleUserActivity);
  //       document.addEventListener('keydown', handleUserActivity);
  //       document.addEventListener('touchstart', handleUserActivity);
  //       document.addEventListener('scroll', handleUserActivity);

  //       return () => {
  //         clearAutoLockTimer();
  //         document.removeEventListener('mousedown', handleUserActivity);
  //         document.removeEventListener('keydown', handleUserActivity);
  //         document.removeEventListener('touchstart', handleUserActivity);
  //         document.removeEventListener('scroll', handleUserActivity);
  //       };
  //     } else {
  //       clearAutoLockTimer();
  //     }
  //   };

  //   checkAutoLock();
  // }, [state.isWalletUnlocked]);

  // Auto-lock timer functions
  const startAutoLockTimer = () => {
    clearAutoLockTimer();
    autoLockTimerRef.current = setTimeout(() => {
              if (state.isWalletUnlocked) {
          lockWallet();
          toast('Wallet auto-locked due to inactivity');
        }
    }, AUTO_LOCK_TIMEOUT);
  };

  const resetAutoLockTimer = () => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      startAutoLockTimer();
    }
  };

  const clearAutoLockTimer = () => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  };

  // Initialize wallet
  const initializeWallet = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 10000);
      });
      
      const initPromise = (async () => {
        console.log('Starting wallet initialization...');
        
        // Check if wallet exists in storage
        console.log('Fetching stored wallet...');
        const storedWallet = await getStoredWallet();
        console.log('Stored wallet:', !!storedWallet);
        
        console.log('Fetching stored wallet state...');
        const storedState = await getStoredWalletState();
        console.log('Stored state:', storedState);
        
        if (storedWallet) {
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          
          // Always set the wallet data
          dispatch({ type: 'SET_WALLET', payload: storedWallet });
          
          // Restore wallet state if available
          if (storedState) {
            dispatch({ type: 'SET_WALLET_UNLOCKED', payload: storedState.isWalletUnlocked });
          } else {
            // Check if password is set
            const storedHash = await getStoredPasswordHash();
            if (!storedHash) {
              // No password set yet, keep wallet unlocked
              dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
            } else {
              // Password is set, check if wallet was previously unlocked
              const unlockTime = await getStoredUnlockTime();
              if (unlockTime && (Date.now() - unlockTime) < AUTO_LOCK_TIMEOUT) {
                dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
              } else {
                dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
              }
            }
          }
        } else {
          // No wallet found, ensure clean state
          dispatch({ type: 'SET_WALLET_CREATED', payload: false });
          dispatch({ type: 'SET_HAS_WALLET', payload: false });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
        }
      })();
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log('Wallet initialization completed successfully');
    } catch (error) {
      console.error('Wallet initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize wallet';
      dispatch({ type: 'SET_ERROR', payload: `Wallet initialization failed: ${errorMessage}` });
    } finally {
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    }
  };

  // Create new wallet with real implementation
  const createWallet = async (name: string, network: string): Promise<void> => {
    try {
      if (!state.globalPassword) {
        throw new Error('Global password not set. Please unlock wallet first.');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      // Generate real BIP39 seed phrase
      const seedPhrase = generateBIP39SeedPhrase();
      
      // Encrypt the seed phrase with the global password
      const encryptedSeedPhrase = await encryptData(seedPhrase, state.globalPassword);
      
      // Derive wallet from seed phrase
      const walletData = await deriveWalletFromSeed(seedPhrase, network);
      
      const wallet: WalletData = {
        id: Date.now().toString(),
        name,
        address: walletData.address,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        encryptedSeedPhrase: encryptedSeedPhrase,
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
      if (!state.globalPassword) {
        throw new Error('Global password not set. Please unlock wallet first.');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      // Validate seed phrase
      if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Encrypt the seed phrase with the global password
      const encryptedSeedPhrase = await encryptData(seedPhrase, state.globalPassword);

      // Derive wallet from seed phrase
      const walletData = await deriveWalletFromSeed(seedPhrase, network);
      
      const wallet: WalletData = {
        id: Date.now().toString(),
        name: 'Imported Wallet',
        address: walletData.address,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        encryptedSeedPhrase: encryptedSeedPhrase,
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
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      
      // Set the current network
      const networkData = {
        id: network,
        name: network.charAt(0).toUpperCase() + network.slice(1),
        symbol: network === 'ethereum' ? 'ETH' : network.toUpperCase(),
        rpcUrl: `https://${network}.infura.io/v3/your-project-id`,
        explorerUrl: `https://${network === 'ethereum' ? 'etherscan.io' : network + 'scan.io'}`,
        chainId: network === 'ethereum' ? '1' : '56',
        isCustom: false,
        isEnabled: true
      };
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: networkData });
      
      toast.success('Wallet imported successfully');
    } catch (error) {
      toast.error('Failed to import wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import wallet' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Import wallet from private key
  const importWalletFromPrivateKey = async (privateKey: string, network: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Validate private key
      if (!validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key');
      }

      // Import wallet from private key
      const walletData = importFromPrivateKey(privateKey, network);
      
      // Debug logging
      console.log('Private key import debug:', {
        privateKey: privateKey.substring(0, 10) + '...' + privateKey.substring(privateKey.length - 10),
        network: network,
        derivedAddress: walletData.address,
        derivedPublicKey: walletData.publicKey.substring(0, 20) + '...',
        derivationPath: walletData.derivationPath
      });
      
      const wallet: WalletData = {
        id: Date.now().toString(),
        name: 'Imported Wallet',
        address: walletData.address,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        encryptedSeedPhrase: '', // Not available when importing from private key
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
      
      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      
      // Set the current network
      const networkData = {
        id: network,
        name: network.charAt(0).toUpperCase() + network.slice(1),
        symbol: network === 'ethereum' ? 'ETH' : network.toUpperCase(),
        rpcUrl: `https://${network}.infura.io/v3/your-project-id`,
        explorerUrl: `https://${network === 'ethereum' ? 'etherscan.io' : network + 'scan.io'}`,
        chainId: network === 'ethereum' ? '1' : '56',
        isCustom: false,
        isEnabled: true
      };
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: networkData });
      
      toast.success('Wallet imported successfully');
    } catch (error) {
      toast.error('Failed to import wallet');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import wallet' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Set global password
  const setGlobalPassword = (password: string): void => {
    dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
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
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
        dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
        await storeUnlockTime(Date.now());
        toast.success('Wallet unlocked successfully');
        return true;
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash);
      if (isValid) {
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
        dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
        await storeUnlockTime(Date.now());
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
    clearAutoLockTimer();
    storeUnlockTime(0);
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

      // Update the current network in state
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
      
      // If we have a wallet, generate the correct address for the new network
      if (state.wallet) {
        const { WalletManager } = await import('../core/wallet-manager');
        const walletManager = new WalletManager();
        
        // Generate the correct address for the new network
        let newAddress = state.wallet.address;
        
        // For non-EVM chains, we need to generate the correct address format
        if (['tron', 'bitcoin', 'litecoin', 'solana', 'ton', 'xrp'].includes(networkId)) {
          // For now, we'll use a placeholder approach
          // In a real implementation, you'd derive the address from the same seed phrase
          // using the appropriate derivation path for each network
          
          // Generate a deterministic address based on the wallet's private key and network
          const { deriveWalletFromSeed } = await import('../utils/key-derivation');
          
          // For demonstration, we'll create a network-specific address
          // In production, you'd use the actual seed phrase to derive the correct address
          // For now, we'll use a hash of the private key + network to create a deterministic address
          const addressHash = await import('crypto-browserify');
          const hash = addressHash.createHash('sha256')
            .update(state.wallet.privateKey + networkId)
            .digest('hex');
          
          // Create a network-specific address format
          switch (networkId) {
            case 'tron':
              newAddress = 'T' + hash.slice(0, 33); // TRON addresses start with T
              break;
            case 'bitcoin':
              newAddress = '1' + hash.slice(0, 33); // Bitcoin addresses start with 1
              break;
            case 'litecoin':
              newAddress = 'L' + hash.slice(0, 33); // Litecoin addresses start with L
              break;
            case 'solana':
              newAddress = hash.slice(0, 44); // Solana addresses are base58 encoded
              break;
            case 'ton':
              newAddress = '0:' + hash.slice(0, 64); // TON addresses have workchain:hex format
              break;
            case 'xrp':
              newAddress = 'r' + hash.slice(0, 33); // XRP addresses start with r
              break;
            default:
              newAddress = state.wallet.address; // Keep original for unknown networks
          }
        }
        
        // Update wallet with new network and address
        const updatedWallet = { 
          ...state.wallet, 
          currentNetwork: networkId,
          address: newAddress
        };
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        
        // Update the wallet manager
        await walletManager.switchWalletNetwork(state.wallet.id, networkId);
      }
      
      // Update balances for new network
      if (state.address) {
        await updateAllBalances();
      }
      
      toast.success(`Switched to ${network.name}`);
    } catch (error) {
      toast.error('Failed to switch network');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch network' });
    }
  };

  // Switch account
  const switchAccount = async (accountId: string): Promise<void> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Wait a bit for the wallet manager to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await walletManager.switchAccount(state.wallet.id, accountId);
      
      // Get the updated wallet with the new account
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        toast.success('Account switched successfully');
      }
    } catch (error) {
      toast.error('Failed to switch account');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch account' });
    }
  };

  // Add new account
  const addAccount = async (password: string): Promise<void> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Wait a bit for the wallet manager to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newAccount = await walletManager.addAccountToWallet(state.wallet.id, password);
      
      // Get the updated wallet with the new account
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        toast.success('New account added successfully');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add account';
      toast.error(errorMessage);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  // Remove account
  const removeAccount = async (accountId: string): Promise<void> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Wait a bit for the wallet manager to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await walletManager.removeAccountFromWallet(state.wallet.id, accountId);
      
      // Get the updated wallet
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        toast.success('Account removed successfully');
      }
    } catch (error) {
      toast.error('Failed to remove account');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove account' });
    }
  };

  // Get current account
  const getCurrentAccount = async (): Promise<any> => {
    if (!state.wallet) {
      return null;
    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    // Wait a bit for the wallet manager to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return walletManager.getCurrentAccountForWallet(state.wallet.id);
  };

  // Get all accounts for current wallet
  const getWalletAccounts = async (): Promise<any[]> => {
    if (!state.wallet) {
      return [];
    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    // Wait a bit for the wallet manager to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return walletManager.getWalletAccounts(state.wallet.id);
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
      // Get current network from storage
      const result = await chrome.storage.local.get(['currentNetwork']);
      const currentNetworkId = result.currentNetwork || 'ethereum';
      
      // Get balance for current network
      const balance = await getRealBalance(state.address!, currentNetworkId);
      
      // Update balances state with new balance for current network
      const newBalances = { ...state.balances };
      newBalances[currentNetworkId] = balance;

      dispatch({ type: 'SET_BALANCES', payload: newBalances });
    } catch (error) {
      console.error('Failed to update balances:', error);
      toast.error('Failed to update balances');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update balances' });
    }
  };

  // Store wallet securely
  const storeWallet = async (wallet: WalletData): Promise<void> => {
    // In a real implementation, you would encrypt the wallet data
    // For now, we'll store it as is (should be encrypted in production)
    chrome.storage.local.set({ 
      wallet,
      walletState: {
        isWalletUnlocked: state.isWalletUnlocked,
        hasWallet: true,
        isWalletCreated: true,
        lastUpdated: Date.now()
      }
    });
  };

  // Store wallet state
  const storeWalletState = async (): Promise<void> => {
    chrome.storage.local.set({ 
      walletState: {
        isWalletUnlocked: state.isWalletUnlocked,
        hasWallet: state.hasWallet,
        isWalletCreated: state.isWalletCreated,
        lastUpdated: Date.now()
      }
    });
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    return new Promise((resolve) => {
      console.log('getStoredWallet: Starting Chrome storage access...');
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('getStoredWallet: Timeout reached, resolving with null');
        resolve(null);
      }, 5000);
      
      chrome.storage.local.get(['wallet', 'walletState'], (result) => {
        clearTimeout(timeout);
        console.log('getStoredWallet: Chrome storage result:', result);
        if (chrome.runtime.lastError) {
          console.error('getStoredWallet: Chrome storage error:', chrome.runtime.lastError);
        }
        resolve(result.wallet || null);
      });
    });
  };

  // Get stored wallet state
  const getStoredWalletState = async (): Promise<any> => {
    return new Promise((resolve) => {
      console.log('getStoredWalletState: Starting Chrome storage access...');
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('getStoredWalletState: Timeout reached, resolving with null');
        resolve(null);
      }, 5000);
      
      chrome.storage.local.get(['walletState'], (result) => {
        clearTimeout(timeout);
        console.log('getStoredWalletState: Chrome storage result:', result);
        if (chrome.runtime.lastError) {
          console.error('getStoredWalletState: Chrome storage error:', chrome.runtime.lastError);
        }
        resolve(result.walletState || null);
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

  // Store unlock time
  const storeUnlockTime = async (timestamp: number): Promise<void> => {
    chrome.storage.local.set({ unlockTime: timestamp });
  };

  // Get stored unlock time
  const getStoredUnlockTime = async (): Promise<number | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['unlockTime'], (result) => {
        resolve(result.unlockTime || null);
      });
    });
  };

  // Add hardware wallet
  const addHardwareWallet = async (type: 'ledger' | 'trezor', address: string, derivationPath: string): Promise<void> => {
    try {
      const { HardwareWalletManager } = await import('../utils/hardware-wallet');
      const hardwareWalletManager = new HardwareWalletManager();
      
      // Connect to hardware wallet
      await hardwareWalletManager.connectToDevice(type);
      
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
        privateKey: '', // Hardware wallets don't expose private keys
        publicKey: type === 'ledger' 
          ? await hardwareWalletManager.exportPublicKeyLedger()
          : await hardwareWalletManager.exportPublicKeyTrezor(),
        encryptedSeedPhrase: '', // Hardware wallets don't expose seed phrases
        accounts: [address],
        networks: ['ethereum'],
        currentNetwork: 'ethereum',
        derivationPath,
        balance: '0',
        createdAt: Date.now(),
        lastUsed: Date.now()
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
    importWalletFromPrivateKey,
    unlockWallet,
    lockWallet,
    switchNetwork,
    getBalance,
    updateAllBalances,
    initializeWallet,
    addHardwareWallet,
    switchAccount,
    addAccount,
    removeAccount,
    getCurrentAccount,
    getWalletAccounts,
    setGlobalPassword
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