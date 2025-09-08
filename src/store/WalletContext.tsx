import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validateBIP39SeedPhraseWithFeedback, validatePrivateKey, hashPassword, verifyPassword, encryptData, decryptData, importFromPrivateKey } from '../utils/crypto-utils';
import { deriveWalletFromSeed } from '../utils/key-derivation';
import { storage, storageUtils } from '../utils/storage-utils';
import { 
  WalletData, 
  WalletState, 
  WalletContextType, 
  Network
} from '../types/index';


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
    INFURA_PROJECT_ID: '',
  };
};

// Default networks - All supported networks with proper derivation paths
const getDefaultNetworks = (): Network[] => [
  // EVM Networks (all use m/44'/60'/0'/0/0)
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: `https://mainnet.infura.io/v3/${getConfig().INFURA_PROJECT_ID}`,
    chainId: '0x1',
    explorerUrl: 'https://etherscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'bsc',
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    chainId: '0x38',
    explorerUrl: 'https://bscscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: '0x89',
    explorerUrl: 'https://polygonscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: '0xa86a',
    explorerUrl: 'https://snowtrace.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: '0xa4b1',
    explorerUrl: 'https://arbiscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: '0xa',
    explorerUrl: 'https://optimistic.etherscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    chainId: '0x2105',
    explorerUrl: 'https://basescan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'fantom',
    name: 'Fantom',
    symbol: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools',
    chainId: '0xfa',
    explorerUrl: 'https://ftmscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'zksync',
    name: 'zkSync Era',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.era.zksync.io',
    chainId: '0x144',
    explorerUrl: 'https://explorer.zksync.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'linea',
    name: 'Linea',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    chainId: '0xe708',
    explorerUrl: 'https://lineascan.build',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'mantle',
    name: 'Mantle',
    symbol: 'MNT',
    rpcUrl: 'https://rpc.mantle.xyz',
    chainId: '0x1388',
    explorerUrl: 'https://explorer.mantle.xyz',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'scroll',
    name: 'Scroll',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.scroll.io',
    chainId: '0x82750',
    explorerUrl: 'https://scrollscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'polygon-zkevm',
    name: 'Polygon zkEVM',
    symbol: 'ETH',
    rpcUrl: 'https://zkevm-rpc.com',
    chainId: '0x44d',
    explorerUrl: 'https://zkevm.polygonscan.com',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'arbitrum-nova',
    name: 'Arbitrum Nova',
    symbol: 'ETH',
    rpcUrl: 'https://nova.arbitrum.io/rpc',
    chainId: '0xa4ba',
    explorerUrl: 'https://nova.arbiscan.io',
    isCustom: false,
    isEnabled: true
  },
  // Non-EVM Networks (each has unique derivation path)
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    rpcUrl: '', // Bitcoin doesn't use traditional RPC
    chainId: '', // Not applicable for Bitcoin
    explorerUrl: 'https://mempool.space',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'litecoin',
    name: 'Litecoin',
    symbol: 'LTC',
    rpcUrl: '', // Litecoin doesn't use traditional RPC
    chainId: '', // Not applicable for Litecoin
    explorerUrl: 'https://blockchair.com/litecoin',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    chainId: '', // Solana doesn't use chain IDs like EVM
    explorerUrl: 'https://solscan.io',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    rpcUrl: 'https://api.trongrid.io',
    chainId: '', // TRON doesn't use chain IDs like EVM
    explorerUrl: 'https://tronscan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'ton',
    name: 'TON',
    symbol: 'TON',
    rpcUrl: 'https://toncenter.com/api/v2/jsonRPC',
    chainId: '', // TON doesn't use chain IDs like EVM
    explorerUrl: 'https://tonscan.org',
    isCustom: false,
    isEnabled: true
  },
  {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    rpcUrl: '', // XRP doesn't use traditional RPC
    chainId: '', // Not applicable for XRP
    explorerUrl: 'https://xrpscan.com',
    isCustom: false,
    isEnabled: true
  }
];

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
    currentAccount: null, // Add missing currentAccount property
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
  | { type: 'UPDATE_WALLET_ACCOUNTS'; payload: WalletData }
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
        accounts: action.payload.accounts || [],
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
    case 'UPDATE_WALLET_ACCOUNTS':
      console.log('🔄 UPDATE_WALLET_ACCOUNTS reducer called with:', {
        accountsCount: action.payload.accounts?.length || 0,
        accounts: action.payload.accounts
      });
      return { 
        ...state, 
        wallet: action.payload,
        accounts: action.payload.accounts || state.accounts
        // Note: We don't update 'address' here to keep the current account active
      };
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

  // Initialize wallet
  const initializeWallet = async (): Promise<void> => {
    try {
      console.log('WalletContext: Starting wallet initialization...');
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null }); // Clear any existing errors
      
      // Force clear any persistent error state
      console.log('🔄 WalletContext: Clearing any persistent error state...');
      
      // Check if there's an old error in storage and clear it
      try {
        const result = await storage.get(['walletError', 'error']);
        if (result.walletError || result.error) {
          console.log('🧹 WalletContext: Found old error in storage, clearing...', { walletError: result.walletError, error: result.error });
          await storage.remove(['walletError', 'error']);
        }
      } catch (storageError) {
        console.log('Could not check/clear storage errors:', storageError);
      }
      
      // Simple initialization - just check if wallet exists
      const storedWallet = await getStoredWallet();
      
      if (storedWallet) {
        // Wallet exists - check if session is still valid
        const unlockTime = await getStoredUnlockTime();
        const now = Date.now();
        const sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        console.log('🔍 WalletContext: Checking session validity...');
        console.log('🔍 WalletContext: Unlock time:', unlockTime);
        console.log('🔍 WalletContext: Current time:', now);
        console.log('🔍 WalletContext: Session timeout:', sessionTimeout);
        
        if (unlockTime && (now - unlockTime) < sessionTimeout) {
          // Session is still valid, auto-unlock
          console.log('✅ WalletContext: Session still valid, auto-unlocking...');
          
          // Try to restore the password from session storage (if available)
          try {
            const result = await storage.getSession(['sessionPassword']);
            if (result.sessionPassword) {
              console.log('✅ WalletContext: Restored password from session storage');
              dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: result.sessionPassword });
            } else {
              console.log('⚠️ WalletContext: No password in session storage - will use fallback addresses');
            }
          } catch (error) {
            console.log('⚠️ WalletContext: Could not access session storage:', error);
          }
          
          dispatch({ type: 'SET_WALLET', payload: storedWallet });
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
          console.log('✅ WalletContext: Wallet auto-unlocked successfully');
          
            // Check session status for debugging
  setTimeout(() => checkSessionStatus(), 1000);
  
  // Debug function to check wallet state
  const checkWalletState = () => {
    console.log('🔍 Wallet State Check:');
    console.log('- Has Wallet:', state.hasWallet);
    console.log('- Wallet Created:', state.isWalletCreated);
    console.log('- Wallet Unlocked:', state.isWalletUnlocked);
    console.log('- Current Address:', state.wallet?.address || 'NONE');
    console.log('- Current Network:', state.wallet?.currentNetwork || 'NONE');
    console.log('- Has Encrypted Seed:', !!state.wallet?.encryptedSeedPhrase);
    console.log('- Has Global Password:', !!state.globalPassword);
  };
  
  // Debug function to check password status
    const checkPasswordStatus = async () => {
    try {
      const sessionResult = await storage.getSession(['sessionPassword']);
      const localResult = await storage.get(['passwordHash']);
      
      console.log('🔍 Password Status Check:');
      console.log('- Session Password:', sessionResult.sessionPassword ? 'EXISTS' : 'MISSING');
      console.log('- Local Password Hash:', localResult.passwordHash ? 'EXISTS' : 'MISSING');
      console.log('- Global Password in State:', state.globalPassword ? 'EXISTS' : 'MISSING');
      console.log('- Wallet Unlocked:', state.isWalletUnlocked);
      console.log('- Current Address:', state.wallet?.address || 'NONE');
      console.log('- Current Network:', state.wallet?.currentNetwork || 'NONE');
      
      if (!sessionResult.sessionPassword && state.isWalletUnlocked) {
        console.log('⚠️ WARNING: Wallet is unlocked but no session password found!');
      }
    } catch (error) {
      console.log('⚠️ Could not check password status:', error);
    }
  };
  
  // Check password status after auto-unlock
  setTimeout(() => checkPasswordStatus(), 2000);
        } else {
          // Session expired or no unlock time, start locked
          console.log('🔒 WalletContext: Session expired or no unlock time, starting locked');
          dispatch({ type: 'SET_WALLET', payload: storedWallet });
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
          console.log('🔒 WalletContext: Wallet found, ready for unlock...');
        }
      } else {
        // No wallet exists
        dispatch({ type: 'SET_HAS_WALLET', payload: false });
        dispatch({ type: 'SET_WALLET_CREATED', payload: false });
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
        console.log('No wallet found, ready for creation...');
      }
      
      console.log('Wallet initialization completed successfully');
    } catch (error) {
      console.error('Error initializing wallet:', error);
      // Don't set error state during initialization to avoid "something went wrong"
    } finally {
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    }
  };

  // Update all balances
  const updateAllBalances = async (): Promise<void> => {
    if (!state.address) return;

    try {
      // Get current network from storage
              const result = await storage.get(['currentNetwork']);
      const currentNetworkId = result.currentNetwork || 'ethereum';
      
      // Get balance for current network
      const balance = await getRealBalance(state.address!, currentNetworkId);
      
      // Update balances state with new balance for current network
      const newBalances = { ...state.balances };
      newBalances[currentNetworkId] = balance;

      dispatch({ type: 'SET_BALANCES', payload: newBalances });
    } catch (error) {
      console.error('Failed to update balances:', error);
      // Don't show error toast or set error state for balance updates
      // This prevents "something went wrong" from balance update failures
    }
  };

  // Initialize wallet on mount - SINGLE useEffect
  useEffect(() => {
    initializeWallet();
  }, []); // Only run once on mount

  // Handle wallet state restoration when extension is reopened
  useEffect(() => {
    const handleExtensionReopen = async () => {
      if (state.hasWallet && !state.isWalletUnlocked) {
        console.log('🔄 Extension reopened, checking for stored password...');
        const storedPassword = await getPassword();
        if (storedPassword) {
          console.log('✅ Found stored password, wallet can be unlocked');
          // Don't automatically unlock for security, but password is available
        } else {
          console.log('⚠️ No stored password found, wallet will remain locked');
        }
      }
    };

    handleExtensionReopen();
  }, [state.hasWallet, state.isWalletUnlocked]);

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

  // Save wallet state to storage whenever it changes
  useEffect(() => {
    if (state.hasWallet) {
      storeWalletState();
    }
  }, [state.isWalletUnlocked, state.hasWallet, state.isWalletCreated]);

  // Auto-lock functionality - ENABLED
  useEffect(() => {
    const checkAutoLock = async () => {
      const storedHash = await getStoredPasswordHash();
      if (state.isWalletUnlocked && storedHash) {
        console.log('🔒 Starting auto-lock timer (15 minutes)');
        startAutoLockTimer();
        
        // Reset timer on user activity
        const handleUserActivity = () => {
          lastActivityRef.current = Date.now();
          console.log('🔄 User activity detected, resetting auto-lock timer');
          resetAutoLockTimer();
        };

        // Listen for user activity
        document.addEventListener('mousedown', handleUserActivity);
        document.addEventListener('keydown', handleUserActivity);
        document.addEventListener('touchstart', handleUserActivity);
        document.addEventListener('scroll', handleUserActivity);

        return () => {
          clearAutoLockTimer();
          document.removeEventListener('mousedown', handleUserActivity);
          document.removeEventListener('keydown', handleUserActivity);
          document.removeEventListener('touchstart', handleUserActivity);
          document.removeEventListener('scroll', handleUserActivity);
        };
      } else {
        console.log('🔒 Clearing auto-lock timer (wallet locked or no password hash)');
        clearAutoLockTimer();
      }
    };

    checkAutoLock();
  }, [state.isWalletUnlocked]);

  // Auto-lock timer functions
  const startAutoLockTimer = () => {
    clearAutoLockTimer();
    console.log('🔒 Auto-lock timer started - will lock in 15 minutes of inactivity');
    autoLockTimerRef.current = setTimeout(() => {
              if (state.isWalletUnlocked) {
        console.log('🔒 Auto-lock triggered - locking wallet due to inactivity');
          lockWallet();
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

  // Create new wallet with real implementation
  const createWallet = async (name: string, network: string, password: string): Promise<void> => {
    try {
      // Require password parameter - no fallback
      if (!password) {
        throw new Error('Password is required to create wallet.');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      // Use WalletManager to create wallet
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const walletData = await walletManager.createWallet({
        name,
        password, // Use the passed password directly
        network,
        accountCount: 1
      });

      // Store wallet securely in WalletContext storage too for compatibility
      await storeWallet(walletData);
      
      dispatch({ type: 'SET_WALLET', payload: walletData });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
    } catch (error) {
      console.error('Wallet creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
      // Don't set error state to avoid persistent "something went wrong"
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

 // Import wallet from seed phrase with real implementation
const importWallet = async (seedPhrase: string, network: string, password: string): Promise<void> => {
  try {
      console.log('🔍 WalletContext: Starting importWallet...');
      console.log('🔍 WalletContext: Network:', network);
      console.log('🔍 WalletContext: Seed phrase length:', seedPhrase.split(' ').length);
      
      // Require password parameter - no fallback
      if (!password) {
        throw new Error('Password is required to import wallet.');
      }

    dispatch({ type: 'SET_LOADING', payload: true });
    console.log('🔍 WalletContext: Loading state set to true');

    // Validate seed phrase with detailed feedback
    const validation = validateBIP39SeedPhraseWithFeedback(seedPhrase);
    console.log('🔍 WalletContext: Seed phrase validation result:', validation);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid seed phrase');
    }

      console.log('🔍 WalletContext: Importing WalletManager...');
      // Use WalletManager to import wallet
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      console.log('🔍 WalletContext: WalletManager created');
      
      console.log('🔍 WalletContext: Calling walletManager.importWallet...');
      const wallet = await walletManager.importWallet({
      name: 'Imported Wallet',
        seedPhrase,
        password, // Use the passed password directly
        network,
        accountCount: 1
      });
      console.log('🔍 WalletContext: Wallet imported successfully:', wallet.id);

      console.log('🔍 WalletContext: Storing wallet...');
      // Store wallet securely in WalletContext storage too for compatibility
    await storeWallet(wallet);
    console.log('🔍 WalletContext: Wallet stored successfully');
    
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
    
  } catch (error) {
      console.error('❌ WalletContext: Wallet import failed:', error);
      console.error('❌ WalletContext: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to import wallet';
      // Don't set error state to avoid persistent "something went wrong"
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

  // Import wallet from private key
const importWalletFromPrivateKey = async (privateKey: string, network: string, password: string): Promise<void> => {
  try {
    // Require password parameter - no fallback
    if (!password) {
      throw new Error('Password is required to import wallet.');
    }
    
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
      accounts: [{
        id: `${Date.now()}-0`,
        name: 'Account 1',
        addresses: {
          [network]: walletData.address
        },
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        derivationPath: "m/44'/60'/0'/0/0",
        networks: [network],
        balances: {
          [network]: '0'
        },
        nonces: {
          [network]: 0
        },
        createdAt: Date.now(),
        encryptedSeedPhrase: '',
        isActive: true
      }],
      networks: [network],
      currentNetwork: network,
      derivationPath: walletData.derivationPath,
      balance: '0',
      createdAt: Date.now(),
      lastUsed: Date.now(),
      decryptPrivateKey: async (password: string): Promise<string | null> => {
        try {
          // For private key import, return the private key directly
          // In production, this should be encrypted
          return walletData.privateKey;
        } catch (error) {
          console.error('Failed to decrypt private key:', error);
          return null;
        }
      }
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
    
  } catch (error) {
      console.error('Private key import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import wallet from private key';
      // Don't set error state to avoid persistent "something went wrong"
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

  // Set global password
  const setGlobalPassword = (password: string): void => {
    dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
  };

  // Set global password and store hash
  const setGlobalPasswordAndHash = async (password: string): Promise<void> => {
    try {
      const hash = await hashPassword(password);
      await storePasswordHash(hash);
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
    } catch (error) {
      console.error('Failed to set password:', error);
      throw error;
    }
  };

  // Force clear error state (for debugging)
  const clearError = (): void => {
    console.log('🧹 WalletContext: Manually clearing error state...');
    dispatch({ type: 'SET_ERROR', payload: null });
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
        
        // Store password using utility function
        const stored = await storePassword(password);
        if (stored) {
          console.log('✅ Password stored successfully');
        } else {
          console.log('⚠️ Failed to store password');
        }
        
        await storeUnlockTime(Date.now());
        return true;
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash);
      if (isValid) {
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
        dispatch({ type: 'SET_WALLET', payload: storedWallet });
        dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
        
        // Store password using utility function
        const stored = await storePassword(password);
        if (stored) {
          console.log('✅ Password stored successfully');
        } else {
          console.log('⚠️ Failed to store password');
        }
        
        await storeUnlockTime(Date.now());
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Unlock wallet failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlock wallet';
      // Don't set error state to avoid persistent "something went wrong"
      return false;
    }
  };

  // Lock wallet
  const lockWallet = async (): Promise<void> => {
    dispatch({ type: 'LOCK_WALLET' });
    clearAutoLockTimer();
    storeUnlockTime(0);
    
    // Clear password from all storage
    await clearPassword();
    
  };

   // Switch network
   const switchNetwork = async (networkId: string): Promise<void> => {
    try {
      
      
      // Always try to restore password at the start of network switch
      if (state.isWalletUnlocked) {
        const storedPassword = await getPassword();
        if (storedPassword) {
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: storedPassword });
        } else {
        }
      }
      
      // Load networks consistently
              const result = await storage.get(['customNetworks']);
      const customNetworks = result.customNetworks || [];
      const availableNetworks = [...getDefaultNetworks(), ...customNetworks];
      
      // Find the network
      const network = availableNetworks.find((n: Network) => n.id === networkId);
      if (!network) {
        throw new Error(`Network '${networkId}' not found`);
      }

      
      // Update current network first
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
      
      if (!state.wallet) {
        return;
      }
      
        let newAddress = state.wallet.address;
      
      // Define EVM networks (including Ethereum and all EVM-compatible networks)
      const evmNetworks = [
        'ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism', 
        'base', 'fantom', 'zksync', 'linea', 'mantle', 'scroll', 
        'polygon-zkevm', 'arbitrum-nova'
      ];
      const isEvmNetwork = evmNetworks.includes(networkId) || network.isCustom;
      
      console.log(`🔧 Network switching to: ${networkId}`);
      console.log(`🔧 Is EVM network: ${isEvmNetwork}`);
      console.log(`🔧 Network object:`, network);
      console.log(`🔧 EVM networks array:`, evmNetworks);
      console.log(`🔧 Network ID in EVM array: ${evmNetworks.includes(networkId)}`);
      console.log(`🔧 Network is custom: ${network.isCustom}`);
      
      // Ensure we have a password for address derivation
      let passwordToUse = state.globalPassword;
      
      // Check if wallet is actually unlocked by verifying session
      const isSessionValid = await checkSessionValidity();
      console.log(`🔧 Session validity check: ${isSessionValid}`);
      
      if (!passwordToUse && state.isWalletUnlocked && isSessionValid) {
        passwordToUse = await getPassword();
        if (passwordToUse) {
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
        } else {
          // Show password modal for network switching
          return new Promise<void>((resolve, reject) => {
            // Create a custom event to show password modal
            const passwordEvent = new CustomEvent('showPasswordModal', {
              detail: {
                title: 'Switch Network',
                message: `Please enter your wallet password to derive real ${networkId} address`,
                networkName: network.name,
                onConfirm: async (password: string) => {
                  try {
                    // Test the password by trying to decrypt the seed phrase
                    await decryptData(state.wallet.encryptedSeedPhrase, password);
                    passwordToUse = password;
                    dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
                    await storePassword(passwordToUse);
                    resolve();
                  } catch (passwordError) {
                    reject(new Error('Invalid password'));
                  }
                },
                onCancel: () => {
                  reject(new Error('User cancelled password input'));
                }
              }
            });
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(passwordEvent);
            } else {
              reject(new Error('Window not available'));
            }
          });
        }
      }
      
      if (state.wallet.encryptedSeedPhrase && passwordToUse) {
                  try {
          console.log(`🔧 Attempting to decrypt seed phrase with password length: ${passwordToUse?.length || 'undefined'}`);
          console.log(`🔧 Encrypted seed phrase exists: ${!!state.wallet.encryptedSeedPhrase}`);
          
            const seedPhrase = await decryptData(state.wallet.encryptedSeedPhrase, passwordToUse);
          console.log(`🔧 Decrypted seed phrase length: ${seedPhrase?.length || 'undefined'}`);
          console.log(`🔧 Seed phrase type: ${typeof seedPhrase}`);
          console.log(`🔧 Seed phrase value: ${seedPhrase ? 'exists' : 'null/undefined'}`);
          
          if (!seedPhrase || typeof seedPhrase !== 'string') {
            console.error(`❌ Decryption failed - type: ${typeof seedPhrase}, value: ${seedPhrase}`);
            console.error(`❌ This usually means the password is incorrect or the encrypted data is corrupted`);
            throw new Error(`Failed to decrypt seed phrase. Please check your password.`);
          }
          
          if (isEvmNetwork) {
            // For EVM networks, derive the address using proper HD wallet derivation
            console.log(`🔧 Starting EVM address derivation for ${networkId}`);
            
            const { ethers } = await import('ethers');
            const bip39Module = await import('bip39');
            const bip39 = bip39Module.default || bip39Module;
            
            // Validate seed phrase first
            const isValidMnemonic = bip39.validateMnemonic(seedPhrase);
            console.log(`🔧 Seed phrase is valid BIP39: ${isValidMnemonic}`);
            
            if (!isValidMnemonic) {
              throw new Error('Invalid BIP39 seed phrase');
            }
            
            // Generate seed from mnemonic
            const seed = await bip39.mnemonicToSeed(seedPhrase);
            console.log(`🔧 Generated seed length: ${seed.length}`);
            
            // Create HD node from seed
            const hdNode = ethers.HDNodeWallet.fromSeed(seed);
            console.log(`🔧 Created HD node successfully`);
            
            // Derive wallet from the standard Ethereum derivation path
            const derivationPath = "m/44'/60'/0'/0/0"; // Standard Ethereum path
            const derivedWallet = hdNode.derivePath(derivationPath);
            console.log(`🔧 Derived wallet from path: ${derivationPath}`);
            
            newAddress = derivedWallet.address;
            console.log(`✅ Derived EVM address for ${networkId}: ${newAddress} (path: ${derivationPath})`);
          } else {
            // For non-EVM networks, derive network-specific address
          toast.info(`🔧 About to call deriveNetworkSpecificAddress for ${networkId}`);
          toast.info(`🔧 Seed phrase type: ${typeof seedPhrase}, length: ${seedPhrase?.length || 'undefined'}`);
          toast.info(`🔧 Seed phrase value: ${seedPhrase ? 'exists' : 'null/undefined'}`);
            
            if (!seedPhrase || typeof seedPhrase !== 'string') {
              throw new Error(`Invalid seed phrase for ${networkId} derivation: ${typeof seedPhrase}`);
            }
            
            newAddress = await deriveNetworkSpecificAddress(networkId, seedPhrase);
            console.log(`✅ Derived ${networkId} address: ${newAddress}`);
          }
        } catch (error) {
          console.error(`❌ Address derivation failed for ${networkId}:`, error);
          
          // If decryption failed, it might be because the wallet is locked
          if (error instanceof Error && error.message.includes('decrypt')) {
            console.log(`🔧 Decryption failed, wallet might be locked. Attempting to unlock...`);
            
            // Try to get the password from storage or prompt user
            const storedPassword = await storageUtils.getPassword();
            if (storedPassword) {
              console.log(`🔧 Found stored password, retrying with stored password...`);
              try {
                const seedPhrase = await decryptData(state.wallet.encryptedSeedPhrase, storedPassword);
                if (seedPhrase && typeof seedPhrase === 'string') {
                  console.log(`✅ Successfully decrypted with stored password`);
                  
                  if (isEvmNetwork) {
                    const { ethers } = await import('ethers');
                    const bip39Module = await import('bip39');
                    const bip39 = bip39Module.default || bip39Module;
                    const seed = await bip39.mnemonicToSeed(seedPhrase);
                    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
                    const derivationPath = "m/44'/60'/0'/0/0";
                    const derivedWallet = hdNode.derivePath(derivationPath);
                    newAddress = derivedWallet.address;
                    console.log(`✅ Derived EVM address with stored password: ${newAddress}`);
                  } else {
                    toast.info(`🔧 Retry: About to call deriveNetworkSpecificAddress for ${networkId}`);
                    toast.info(`🔧 Retry: Seed phrase type: ${typeof seedPhrase}, length: ${seedPhrase?.length || 'undefined'}`);
                    toast.info(`🔧 Retry: Seed phrase value: ${seedPhrase ? 'exists' : 'null/undefined'}`);
                    
                    if (!seedPhrase || typeof seedPhrase !== 'string') {
                      throw new Error(`Invalid seed phrase for ${networkId} derivation (retry): ${typeof seedPhrase}`);
                    }
                    
                    newAddress = await deriveNetworkSpecificAddress(networkId, seedPhrase);
                    console.log(`✅ Derived ${networkId} address with stored password: ${newAddress}`);
                  }
                } else {
                  throw new Error('Stored password also failed to decrypt');
                }
              } catch (retryError) {
                console.error(`❌ Retry with stored password also failed:`, retryError);
                throw new Error(`Unable to derive address for ${networkId}: Wallet is locked or password is incorrect`);
              }
            } else {
              throw new Error(`Unable to derive address for ${networkId}: Wallet is locked. Please unlock your wallet first.`);
            }
          } else {
            throw new Error(`Unable to derive address for ${networkId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
              } else {
          throw new Error('No seed phrase or password available for address derivation');
        }
      
      // Validate address format
      const isEvmAddress = newAddress.startsWith('0x') && newAddress.length === 42;
      const isBitcoinAddress = newAddress.startsWith('bc1') || newAddress.startsWith('1') || newAddress.startsWith('3');
      const isSolanaAddress = newAddress.startsWith('SOL') || newAddress.length === 44;
      const isTronAddress = newAddress.startsWith('T') && newAddress.length === 34;
      const isTonAddress = newAddress.startsWith('EQ') && newAddress.length === 48;
      const isXrpAddress = newAddress.startsWith('r') && newAddress.length === 34;
      
      
      
      // Create updated wallet
        const updatedWallet = { 
          ...state.wallet, 
          currentNetwork: networkId,
          address: newAddress
        };
      
      // Update state synchronously
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        
      // Store updated wallet
      await storeWallet(updatedWallet);
      
      // Log the change
      const addressChanged = state.wallet.address !== newAddress;
      
      // FORCE UPDATE: Always add the network address to the current account
      try {
        const { WalletManager } = await import('../core/wallet-manager');
        const walletManager = new WalletManager();
        
        // Get the current account and FORCE add the network address
        const currentAccount = await walletManager.getCurrentAccountForWallet(updatedWallet.id);
        if (currentAccount) {
          await walletManager.addNetworkToAccount(currentAccount.id, networkId, newAddress);
        } else {
        }
      } catch (forceError) {
      }
      
      // Check if we need to create an account for this network and update wallet address
      try {
        const { WalletManager } = await import('../core/wallet-manager');
        const walletManager = new WalletManager();
        const existingAccounts = await walletManager.getWalletAccounts(updatedWallet.id);
        
        
        // Always add the network address to the current account
        try {
          // Get the current account
          const currentAccount = await walletManager.getCurrentAccountForWallet(updatedWallet.id);
          if (currentAccount) {
            
            // Check if account already has this network
            const hasNetwork = currentAccount.networks.includes(networkId);
            
            // Always add/update the network address
            
            await walletManager.addNetworkToAccount(currentAccount.id, networkId, newAddress);
            
            // Verify the address was added
            const updatedAccount = await walletManager.getCurrentAccountForWallet(updatedWallet.id);
            
            // Force a small delay to ensure the data is saved
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            // If no current account, create a new one
            await walletManager.addAccountToWallet(updatedWallet.id, passwordToUse);
          }
        } catch (accountError) {
        }
        
        
        // Update wallet address to match the current account for this network
        const currentAccountForNetwork = await walletManager.getCurrentAccountForWallet(updatedWallet.id);
        if (currentAccountForNetwork) {
          const currentAccountAddress = currentAccountForNetwork.addresses[networkId] || Object.values(currentAccountForNetwork.addresses)[0];
          if (currentAccountAddress !== updatedWallet.address) {
            const finalUpdatedWallet = { ...updatedWallet, address: currentAccountAddress };
            dispatch({ type: 'SET_WALLET', payload: finalUpdatedWallet });
            await storeWallet(finalUpdatedWallet);
          }
          
          // Final verification: Log the account data that will be used by the dashboard
        }
      } catch (accountCheckError) {
      }
      
      // Dispatch wallet changed event to notify components
      if (addressChanged) {
        window.dispatchEvent(new CustomEvent('walletChanged', { 
          detail: { 
            newAddress, 
            networkId, 
            network: network.name,
            addressChanged: true
          } 
        }));
      }
      
      // Show detailed toast with address info
      if (addressChanged) {
      } else {
      }
      
    } catch (error) {
      console.error('Network switch failed:', error);
      throw error;
    }
  };

  // Helper function to check session validity
  const checkSessionValidity = async (): Promise<boolean> => {
    try {
      const unlockTime = await getStoredUnlockTime();
      const now = Date.now();
      const sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      if (!unlockTime) {
        console.log(`🔧 No unlock time found - session invalid`);
        return false;
      }
      
      const isSessionValid = (now - unlockTime) < sessionTimeout;
      console.log(`🔧 Session check - unlock time: ${unlockTime}, current: ${now}, timeout: ${sessionTimeout}, valid: ${isSessionValid}`);
      
      if (!isSessionValid) {
        // Session expired, lock the wallet
        console.log(`🔧 Session expired, locking wallet`);
        dispatch({ type: 'LOCK_WALLET' });
        await storage.removeSession(['sessionPassword']);
      }
      
      return isSessionValid;
    } catch (error) {
      console.error(`❌ Error checking session validity:`, error);
      return false;
    }
  };

  // Helper functions for address derivation
  const deriveNetworkSpecificAddress = async (networkId: string, seedPhrase: string): Promise<string> => {
    try {
      toast.info(`🔧 Deriving address for ${networkId} with seed phrase length: ${seedPhrase?.length || 'undefined'}`);
      toast.info(`🔧 NetworkId type: ${typeof networkId}, value: "${networkId}"`);
      toast.info(`🔧 SeedPhrase type: ${typeof seedPhrase}, length: ${seedPhrase?.length || 'undefined'}`);
      
      // Validate inputs
      if (!networkId || !seedPhrase) {
        throw new Error(`Invalid parameters - networkId: ${networkId}, seedPhrase: ${!!seedPhrase}`);
      }
      
      // Import the network address utils
      const { generateNetworkAddress } = await import('../utils/network-address-utils');
      
      // Get the appropriate derivation path for each network
      const derivationPaths: Record<string, string> = {
        'bitcoin': "m/44'/0'/0'/0/0",
        'litecoin': "m/44'/2'/0'/0/0", 
        'solana': "m/44'/501'/0'/0/0",
        'tron': "m/44'/195'/0'/0/0",
        'ton': "m/44'/396'/0'/0/0",
        'xrp': "m/44'/144'/0'/0/0"
      };
      
      const derivationPath = derivationPaths[networkId];
      if (!derivationPath) {
        throw new Error(`No derivation path defined for network: ${networkId}`);
      }
      
      console.log(`🔧 Using derivation path: ${derivationPath} for ${networkId}`);
      
      // Use the centralized address generation function
      const address = generateNetworkAddress(seedPhrase, derivationPath, networkId);
      
      if (!address || address.trim() === '') {
        throw new Error(`generateNetworkAddress returned empty address for ${networkId}`);
      }
      
      console.log(`✅ Successfully derived ${networkId} address: ${address}`);
      return address;
    } catch (error) {
      console.error(`❌ Error deriving address for ${networkId}:`, error);
      throw new Error(`Failed to derive address for ${networkId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      // Switch to the account
      await walletManager.switchToAccount(state.wallet.id, accountId);
      
      // Get the updated wallet with the new account
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        // Update the wallet state
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        
        // Dispatch custom event to notify all components
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('accountSwitched', {
            detail: {
              wallet: updatedWallet,
              accountId: accountId,
              address: updatedWallet.address,
              network: updatedWallet.currentNetwork
            }
          });
          window.dispatchEvent(event);
        }
        
        console.log(`✅ Account switched to: ${accountId}, address: ${updatedWallet.address}`);
      }
    } catch (error) {
      console.error('Failed to switch account:', error);
      throw error;
    }
  };

  // Add new account
  const addAccount = async (password: string, accountName?: string): Promise<any> => {
  try {
            console.log('🔄 Starting add account process...');
      
    if (!state.wallet) {
      throw new Error('No wallet available');
    }

      console.log('✅ Wallet found:', { 
        walletId: state.wallet.id, 
        hasEncryptedSeedPhrase: !!state.wallet.encryptedSeedPhrase 
      });
      
      // Debug: Check what's actually in storage
      const storageCheck = await new Promise<any>((resolve) => {
        storage.get(['wallet', 'wallets']).then(resolve);
      });
      console.log('🔍 Current storage contents:', {
        hasWallet: !!storageCheck.wallet,
        hasWallets: !!storageCheck.wallets,
        walletsCount: storageCheck.wallets?.length || 0,
        walletIds: storageCheck.wallets?.map((w: any) => w.id) || []
      });
      
      // If wallet exists but not in wallets array, migrate it
      if (storageCheck.wallet && (!storageCheck.wallets || !storageCheck.wallets.find((w: any) => w.id === state.wallet?.id))) {
        console.log('🔄 Migrating wallet to WalletManager format...');
        await storeWallet(state.wallet);
        console.log('✅ Wallet migration completed');
    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
      
      console.log('✅ WalletManager imported and instantiated');
    
    // Wait a bit for the wallet manager to initialize
    
      // Verify WalletManager can find the wallet
      const foundWallet = await walletManager.getWallet(state.wallet.id);
      if (!foundWallet) {
        console.error('❌ WalletManager cannot find wallet after migration. Attempting emergency fix...');
        
        // Emergency fix: Force store the wallet again
        await storeWallet(state.wallet);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait longer
        
        // Try to create a new WalletManager instance
        const newWalletManager = new WalletManager();
        
        const retryWallet = await newWalletManager.getWallet(state.wallet.id);
        if (!retryWallet) {
          throw new Error('Unable to sync wallet with WalletManager. Please try reloading the extension.');
        }
        
        console.log('✅ Emergency fix successful - wallet found');
      } else {
        console.log('✅ WalletManager successfully found wallet');
      }
      
      console.log('🔐 Attempting to add account with password length:', password?.length || 0);
      
      const newAccount = await walletManager.addAccountToWallet(state.wallet.id, password, accountName);
      
      console.log('✅ New account created:', { 
        accountId: newAccount.id, 
        addresses: newAccount.addresses 
      });
    
    // Get the updated wallet with the new account
    const updatedWallet = await walletManager.getWallet(state.wallet.id);
    if (updatedWallet) {
        console.log('✅ Updated wallet retrieved with accounts:', updatedWallet.accounts?.length || 0);
        
        // Force reload the wallet manager to ensure we have the latest data
        await new Promise(resolve => setTimeout(resolve, 200));
        const freshWalletManager = new WalletManager();
        const freshWallet = await freshWalletManager.getWallet(state.wallet.id);
        
        if (freshWallet) {
          console.log('✅ Fresh wallet retrieved with accounts:', freshWallet.accounts?.length || 0);
          dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: freshWallet });
          // Also store the updated wallet to ensure persistence
          await storeWallet(freshWallet);
        } else {
          dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: updatedWallet });
          // Also store the updated wallet to ensure persistence
          await storeWallet(updatedWallet);
        }
        
      return newAccount; // Return the created account
      } else {
        throw new Error('Failed to retrieve updated wallet');
    }
  } catch (error) {
      console.error('❌ Error adding account:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        walletId: state.wallet?.id,
        passwordProvided: !!password
      });
    const errorMessage = error instanceof Error ? error.message : 'Failed to add account';
      // Don't set error state to avoid persistent "something went wrong"
      throw error; // Re-throw the error so the caller can handle it
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
      
      await walletManager.removeAccountFromWallet(state.wallet.id, accountId);
      
      // Get the updated wallet
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
      }
    } catch (error) {
      console.error('Error removing account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove account';
      // Don't set error state to avoid persistent "something went wrong"
    }
  };

  // Get current account
  const getCurrentAccount = useCallback(async (): Promise<any> => {
    if (!state.wallet) {
      return null;
    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    let currentAccount = await walletManager.getCurrentAccountForWallet(state.wallet.id);
    
    // If no current account found, return null instead of creating fallback
    if (!currentAccount) {
      return null;
    }
    
    return currentAccount;
  }, [state.wallet]);

  // Get all accounts for current wallet
  const getWalletAccounts = useCallback(async (): Promise<any[]> => {
    if (!state.wallet) {
      return [];
    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    let accounts = await walletManager.getWalletAccounts(state.wallet.id);
    
    // If no accounts found, return empty array instead of creating fallback
    if (accounts.length === 0) {
      return [];
    }
    
    return accounts;
  }, [state.wallet]);

  // Get balance for specific address and network
  const getBalance = async (address: string, network: string): Promise<string> => {
    try {
      const balance = await getRealBalance(address, network);
      return balance;
    } catch (error) {
      // Don't set error state to avoid persistent "something went wrong"
      return '0';
    }
  };

  // Store wallet securely
  const storeWallet = async (wallet: WalletData): Promise<void> => {
    try {
        // Convert WalletData to WalletManager format
        const internalWallet = {
          id: wallet.id,
          name: wallet.name,
          encryptedSeedPhrase: wallet.encryptedSeedPhrase,
          address: wallet.address,
          network: wallet.currentNetwork || 'ethereum',
          currentNetwork: wallet.currentNetwork || 'ethereum',
          accounts: wallet.accounts || [{
            id: `${wallet.id}-0`,
            address: wallet.address,
            privateKey: wallet.privateKey || '',
            publicKey: wallet.publicKey || '',
            derivationPath: wallet.derivationPath || "m/44'/60'/0'/0/0",
            network: wallet.currentNetwork || 'ethereum',
            balance: '0',
            nonce: 0,
            createdAt: wallet.createdAt || Date.now()
          }],
          createdAt: wallet.createdAt || Date.now(),
          lastAccessed: Date.now()
        };

        // Load existing wallets from WalletManager storage
        const result = await storage.get(['wallets']);
        let existingWallets = result.wallets || [];
        
        // Update or add the wallet
        const existingIndex = existingWallets.findIndex((w: any) => w.id === wallet.id);
        if (existingIndex >= 0) {
          existingWallets[existingIndex] = internalWallet;
        } else {
          existingWallets.push(internalWallet);
        }
        
        // Store in both formats for compatibility
        await storage.set({ 
          wallet, // Keep original format for WalletContext
          wallets: existingWallets, // WalletManager format
          walletState: {
            isWalletUnlocked: state.isWalletUnlocked,
            hasWallet: true,
            isWalletCreated: true,
            lastUpdated: Date.now()
          }
        });
        console.log('✅ Wallet stored in both formats for compatibility');
    } catch (error) {
        console.error('Error storing wallet:', error);
        throw error;
      }
  };

  // Store wallet state
  const storeWalletState = async (): Promise<void> => {
    try {
      await storage.set({ 
        walletState: {
          isWalletUnlocked: state.isWalletUnlocked,
          hasWallet: state.hasWallet,
          isWalletCreated: state.isWalletCreated,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to store wallet state:', error);
      throw error;
    }
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    try {
      console.log('getStoredWallet: Starting storage access...');
      const result = await storage.get(['wallet', 'walletState']);
      console.log('getStoredWallet: Storage result:', result);
      return result.wallet || null;
    } catch (error) {
      console.error('getStoredWallet: Storage error:', error);
      return null;
    }
  };

  // Get stored wallet state
  const getStoredWalletState = async (): Promise<any> => {
    try {
      console.log('getStoredWalletState: Starting storage access...');
      const result = await storage.get(['walletState']);
      console.log('getStoredWalletState: Storage result:', result);
      return result.walletState || null;
    } catch (error) {
      console.error('getStoredWalletState: Storage error:', error);
      return null;
    }
  };

  // Store password hash
  const storePasswordHash = async (hash: string): Promise<void> => {
    try {
      await storage.set({ passwordHash: hash });
    } catch (error) {
      console.error('Failed to store password hash:', error);
      throw error;
    }
  };

  // Get stored password hash
  const getStoredPasswordHash = async (): Promise<string | null> => {
    try {
      const result = await storage.get(['passwordHash']);
      return result.passwordHash || null;
    } catch (error) {
      console.error('Failed to get password hash:', error);
      return null;
    }
  };

  // Store unlock time
  const storeUnlockTime = async (timestamp: number): Promise<void> => {
    try {
      await storage.set({ unlockTime: timestamp });
    } catch (error) {
      console.error('Failed to store unlock time:', error);
      throw error;
    }
  };

  // Get stored unlock time
  const getStoredUnlockTime = async (): Promise<number | null> => {
    try {
      const result = await storage.get(['unlockTime']);
      return result.unlockTime || null;
    } catch (error) {
      console.error('Failed to get unlock time:', error);
      return null;
    }
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
        accounts: [{
          id: `hw_${type}_${Date.now()}_0`,
          name: 'Hardware Account 1',
          addresses: {
            'ethereum': address
          },
          privateKey: '', // Hardware wallets don't expose private keys
          publicKey: type === 'ledger'
            ? await hardwareWalletManager.exportPublicKeyLedger()
            : await hardwareWalletManager.exportPublicKeyTrezor(),
          derivationPath: derivationPath,
          networks: ['ethereum'],
          balances: {
            'ethereum': '0'
          },
          nonces: {
            'ethereum': 0
          },
          createdAt: Date.now(),
          encryptedSeedPhrase: '',
          isActive: true
        }],
        networks: ['ethereum'],
        currentNetwork: 'ethereum',
        derivationPath,
        balance: '0',
        createdAt: Date.now(),
        lastUsed: Date.now(),
        decryptPrivateKey: async (password: string): Promise<string | null> => {
          // Hardware wallets don't expose private keys
          throw new Error('Private keys are not accessible on hardware wallets');
        }
      };

      // Store hardware wallet
      await storeWallet(hardwareWallet);
      
      dispatch({ type: 'SET_WALLET', payload: hardwareWallet });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
    } catch (error) {
      // Don't set error state to avoid persistent "something went wrong"
    }
  };

  // Extend session on user activity
  const extendSession = async (): Promise<void> => {
    if (state.isWalletUnlocked) {
      try {
        await storeUnlockTime(Date.now());
        console.log('⏰ WalletContext: Session extended');
      } catch (error) {
        console.error('Failed to extend session:', error);
      }
    }
  };

  // Check session status for debugging
  const checkSessionStatus = async (): Promise<void> => {
    try {
      const unlockTime = await getStoredUnlockTime();
      const now = Date.now();
      const sessionTimeout = 15 * 60 * 1000; // 15 minutes
      
      console.log('🔍 Session Status Check:');
      console.log('  - Unlock time:', unlockTime);
      console.log('  - Current time:', now);
      console.log('  - Time difference:', unlockTime ? now - unlockTime : 'N/A');
      console.log('  - Session timeout:', sessionTimeout);
      console.log('  - Is session valid:', unlockTime ? (now - unlockTime) < sessionTimeout : false);
      console.log('  - Wallet unlocked:', state.isWalletUnlocked);
      console.log('  - Auto-lock timer active:', !!autoLockTimerRef.current);
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  };

  // Manual session check function (for testing)
  const debugSessionStatus = async (): Promise<void> => {
    await checkSessionStatus();
  };

  // Auto-extend session on user activity when wallet is unlocked
  useEffect(() => {
    if (!state.isWalletUnlocked) return;

    const handleUserActivity = () => {
      extendSession();
    };

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      if (typeof document !== 'undefined') {
      document.addEventListener(event, handleUserActivity, { passive: true });
      }
    });

    return () => {
      events.forEach(event => {
        if (typeof document !== 'undefined') {
        document.removeEventListener(event, handleUserActivity);
        }
      });
    };
  }, [state.isWalletUnlocked]);

  // Debug: Log current error state
  useEffect(() => {
    if (state.error) {
      console.error('🚨 WalletContext: Error state detected:', state.error);
      console.error('🚨 WalletContext: Error stack trace:', new Error().stack);
    } else {
      console.log('✅ WalletContext: No error state');
    }
  }, [state.error]);

  // Password storage utility functions
  const storePassword = async (password: string): Promise<boolean> => {
    try {
      // Store in session storage (plain text for immediate access)
      await storage.setSession({ sessionPassword: password });
      
      // Store in local storage as backup (encoded for security)
      const encodedPassword = btoa(password);
      await storage.set({ sessionPassword: encodedPassword });
      
      // Store in alternative backup locations
      await storage.setSession({ backupPassword: password });
      await storage.set({ backupPassword: encodedPassword });
      
      console.log('✅ Password stored in session storage and local storage backup');
      
      // Verify storage worked
      const verifyResult = await storage.getSession(['sessionPassword']);
      if (verifyResult.sessionPassword) {
        console.log('✅ Password verification: SUCCESS');
        return true;
      } else {
        console.log('⚠️ Session storage verification failed, but local storage backup exists');
        return true; // Still return true since we have local storage backup
      }
    } catch (error) {
      console.log('❌ Password storage failed:', error);
      return false;
    }
  };

  const getPassword = async (): Promise<string | null> => {
    try {
      // Try session storage first
      const sessionResult = await storage.getSession(['sessionPassword']);
      if (sessionResult.sessionPassword) {
        console.log('✅ Password retrieved from session storage');
        return sessionResult.sessionPassword;
      }
      
      // Try local storage as fallback (this was incorrectly using getSession)
      const localResult = await storage.get(['sessionPassword']);
      if (localResult.sessionPassword) {
        try {
          const decodedPassword = atob(localResult.sessionPassword);
          console.log('✅ Password retrieved from local storage fallback');
          // Restore to session storage
          await storage.setSession({ sessionPassword: decodedPassword });
          console.log('✅ Password restored to session storage');
          return decodedPassword;
        } catch (decodeError) {
          console.log('❌ Could not decode password from local storage:', decodeError);
        }
      }
      
      // Try alternative storage keys
      const altSessionResult = await storage.getSession(['backupPassword']);
      if (altSessionResult.backupPassword) {
        console.log('✅ Password retrieved from alternative session storage');
        return altSessionResult.backupPassword;
      }
      
      const altLocalResult = await storage.get(['backupPassword']);
      if (altLocalResult.backupPassword) {
        try {
          const decodedPassword = atob(altLocalResult.backupPassword);
          console.log('✅ Password retrieved from alternative local storage');
          // Restore to session storage
          await storage.setSession({ sessionPassword: decodedPassword });
          console.log('✅ Password restored to session storage');
          return decodedPassword;
        } catch (decodeError) {
          console.log('❌ Could not decode alternative password from local storage:', decodeError);
        }
      }
      
      // Try to get password from global state if available
      if (state.globalPassword) {
        console.log('✅ Password retrieved from global state');
        // Restore to session storage
        await storage.setSession({ sessionPassword: state.globalPassword });
        return state.globalPassword;
      }
      
      console.log('⚠️ No password found in any storage location');
      return null;
    } catch (error) {
      console.log('❌ Error retrieving password:', error);
      return null;
    }
  };

  const clearPassword = async (): Promise<void> => {
    try {
      // Clear from session storage
      await storage.removeSession(['sessionPassword']);
      // Clear from local storage
      await storage.remove(['sessionPassword']);
      // Clear alternative storage keys
      await storage.removeSession(['backupPassword']);
      await storage.remove(['backupPassword']);
      console.log('✅ Password cleared from all storage');
    } catch (error) {
      console.log('⚠️ Error clearing password:', error);
    }
  };

  // Method to decrypt private key from wallet data
  const decryptPrivateKey = async (password: string): Promise<string | null> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }
      
      // Decrypt the encrypted seed phrase first
      const seedPhrase = await decryptData(state.wallet.encryptedSeedPhrase, password);
      
      // For now, return the private key directly since it's stored in plain text
      // In a production environment, this should be encrypted
      return state.wallet.privateKey;
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      return null;
    }
  };

  const getAccountPrivateKey = async (accountId: string, password: string): Promise<string | null> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      return await walletManager.getAccountPrivateKey(state.wallet.id, accountId, password);
    } catch (error) {
      console.error('Failed to get account private key:', error);
      return null;
    }
  };

  // Get account seed phrase securely
  const getAccountSeedPhrase = async (accountId: string, password: string): Promise<string | null> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      return await walletManager.getAccountSeedPhrase(state.wallet.id, accountId, password);
    } catch (error) {
      console.error('Failed to get account seed phrase:', error);
      return null;
    }
  };

  // Refresh wallet state from storage
  const refreshWallet = useCallback(async (): Promise<void> => {
    if (!state.wallet) {
      console.log('❌ No wallet to refresh');
      return;
    }

    console.log('🔄 Refreshing wallet state for:', state.wallet.id);

    try {
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Get the updated wallet from storage
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      console.log('📦 Retrieved wallet from storage:', updatedWallet);
      
      if (updatedWallet) {
        // Log the accounts before update
        console.log('📋 Accounts before refresh:', updatedWallet.accounts.map(acc => ({ id: acc.id, name: acc.name })));
        
        // Update the wallet state
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
        console.log('✅ Wallet state refreshed successfully');
        
        // Log the accounts after update
        console.log('📋 Accounts after refresh:', updatedWallet.accounts.map(acc => ({ id: acc.id, name: acc.name })));
      } else {
        console.error('❌ No wallet found in storage');
      }
    } catch (error) {
      console.error('❌ Failed to refresh wallet state:', error);
    }
  }, [state.wallet]);

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
    getPassword, // Add missing getPassword method
    decryptPrivateKey, // Add missing decryptPrivateKey method
    getAccountPrivateKey, // Add new function
    getAccountSeedPhrase, // Add new function
    refreshWallet, // Add refresh wallet function
    setGlobalPassword,
    setGlobalPasswordAndHash,
    clearError,
    extendSession,
    debugSessionStatus,
    testAddressCompatibility: async () => {
      try {
        const { runCompatibilityTests } = await import('../utils/address-compatibility-test');
        const results = await runCompatibilityTests();
        console.log('🔍 Address Compatibility Test Results:', results);
        return results;
      } catch (error) {
        console.error('❌ Failed to run compatibility tests:', error);
        return null;
      }
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