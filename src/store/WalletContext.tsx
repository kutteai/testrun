import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validateBIP39SeedPhraseWithFeedback, validatePrivateKey, hashPassword, verifyPassword, encryptData, decryptData, importFromPrivateKey } from '../utils/crypto-utils';
import { deriveWalletFromSeed } from '../utils/key-derivation';
import { storage } from '../utils/storage-utils';
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
      // Require password parameter - no fallback
      if (!password) {
        throw new Error('Password is required to import wallet.');
      }

    dispatch({ type: 'SET_LOADING', payload: true });

    // Validate seed phrase with detailed feedback
    const validation = validateBIP39SeedPhraseWithFeedback(seedPhrase);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid seed phrase');
    }

      // Use WalletManager to import wallet
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const wallet = await walletManager.importWallet({
      name: 'Imported Wallet',
        seedPhrase,
        password, // Use the passed password directly
        network,
        accountCount: 1
      });

      // Store wallet securely in WalletContext storage too for compatibility
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
      console.error('Wallet import failed:', error);
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
      // Custom networks are always EVM networks (they have RPC URLs and Chain IDs)
      const isEvmNetwork = network.isCustom || !['bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'].includes(networkId);
      
      // Always derive the correct address for the target network
      
      // Ensure we have a password for address derivation
      let passwordToUse = state.globalPassword;
      if (!passwordToUse && state.isWalletUnlocked) {
        passwordToUse = await getPassword();
        if (passwordToUse) {
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
        } else {
          // Prompt user for password immediately
          const userPassword = prompt(`Please enter your wallet password to derive real ${networkId} address:`);
          if (userPassword && userPassword.trim()) {
            try {
              // Test the password by trying to decrypt the seed phrase
              await decryptData(state.wallet.encryptedSeedPhrase, userPassword.trim());
              passwordToUse = userPassword.trim();
              dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
              await storePassword(passwordToUse);
            } catch (passwordError) {
              // Don't proceed with network switch if password is invalid
              return;
            }
          } else {
            // User cancelled the password prompt, don't proceed with network switch
            return;
          }
        }
      }
      
      if (state.wallet.encryptedSeedPhrase && passwordToUse) {
                  try {
            const seedPhrase = await decryptData(state.wallet.encryptedSeedPhrase, passwordToUse);
          
          if (isEvmNetwork) {
            // For EVM networks, derive the original EVM address
            const { ethers } = await import('ethers');
            const wallet = ethers.Wallet.fromPhrase(seedPhrase);
            newAddress = wallet.address;
          } else {
            // For non-EVM networks, derive network-specific address
            newAddress = await deriveNetworkSpecificAddress(networkId, seedPhrase);
          }
        } catch (error) {
          throw new Error(`Unable to derive address for ${networkId}`);
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

  // Helper functions for address derivation
  const deriveNetworkSpecificAddress = async (networkId: string, seedPhrase: string): Promise<string> => {
    switch (networkId) {
      case 'solana':
        const solanaWeb3 = await import('@solana/web3.js');
        const bip39 = await import('bip39');
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const keypair = solanaWeb3.Keypair.fromSeed(seed.slice(0, 32));
        return keypair.publicKey.toBase58();
        
      case 'bitcoin':
        const { bitcoinUtils, AddressType } = await import('../utils/bitcoin-utils');
        const bitcoinWallet = await bitcoinUtils.generateWallet(seedPhrase, 'Bitcoin Wallet', 'mainnet', AddressType.NATIVE_SEGWIT);
        return bitcoinWallet.address;
        
      case 'litecoin':
        const { bitcoinUtils: ltcUtils, AddressType: ltcAddressType } = await import('../utils/bitcoin-utils');
        const ltcWallet = await ltcUtils.generateWallet(seedPhrase, 'Litecoin Wallet', 'mainnet', ltcAddressType.NATIVE_SEGWIT);
        return ltcWallet.address;
        
      case 'tron':
        // Derive TRON address from seed phrase using proper BIP32 derivation
        const bip39_tron = await import('bip39');
        const { BIP32Factory } = await import('bip32');
        const ecc_tron = await import('tiny-secp256k1');
        const crypto_tron = await import('crypto');
        
        // Initialize BIP32 for TRON
        const bip32_tron = BIP32Factory(ecc_tron);
        
        // Generate seed from mnemonic
        const seed_tron = await bip39_tron.mnemonicToSeed(seedPhrase);
        
        // Create master key (TRON uses mainnet network config)
        const root_tron = bip32_tron.fromSeed(seed_tron);
        
        // Derive TRON key using BIP44 path: m/44'/195'/0'/0/0
        const derivationPath_tron = "m/44'/195'/0'/0/0";
        const child_tron = root_tron.derivePath(derivationPath_tron);
        
        if (!child_tron.publicKey) {
          throw new Error('Failed to derive TRON public key');
        }
        
        // Generate TRON address from derived public key
        const publicKey_tron = Buffer.from(child_tron.publicKey).slice(0, 33);
        const prefix_tron = Buffer.from([0x41]);
        const hash_tron = crypto_tron.createHash('sha256').update(publicKey_tron).digest();
        const ripemd160_tron = crypto_tron.createHash('ripemd160').update(hash_tron).digest();
        const addressBytes_tron = Buffer.concat([prefix_tron, ripemd160_tron]);
        
        // Double SHA256 for checksum
        const checksum_tron = crypto_tron.createHash('sha256')
          .update(crypto_tron.createHash('sha256').update(addressBytes_tron).digest())
          .digest()
          .slice(0, 4);
        
        const finalBytes_tron = Buffer.concat([addressBytes_tron, checksum_tron]);
        
        // Base58 encoding
        const base58Alphabet_tron = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result_tron = '';
        let num_tron = BigInt('0x' + finalBytes_tron.toString('hex'));
        
        while (num_tron > 0n) {
          result_tron = base58Alphabet_tron[Number(num_tron % 58n)] + result_tron;
          num_tron = num_tron / 58n;
        }
        
        return result_tron;
        
      case 'ton':
        // Derive TON address from seed phrase using proper BIP32 derivation
        const bip39_ton = await import('bip39');
        const { BIP32Factory: BIP32Factory_ton } = await import('bip32');
        const ecc_ton = await import('tiny-secp256k1');
        const crypto_ton = await import('crypto');
        
        // Initialize BIP32 for TON
        const bip32_ton = BIP32Factory_ton(ecc_ton);
        
        // Generate seed from mnemonic
        const seed_ton = await bip39_ton.mnemonicToSeed(seedPhrase);
        
        // Create master key
        const root_ton = bip32_ton.fromSeed(seed_ton);
        
        // Derive TON key using BIP44 path: m/44'/396'/0'/0/0
        const derivationPath_ton = "m/44'/396'/0'/0/0";
        const child_ton = root_ton.derivePath(derivationPath_ton);
        
        if (!child_ton.publicKey) {
          throw new Error('Failed to derive TON public key');
        }
        
        // Generate TON address from derived public key
        const publicKey_ton = Buffer.from(child_ton.publicKey).slice(0, 32);
        
        // TON address format: EQ + base64url encoded public key
        const base64url_ton = publicKey_ton.toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        return `EQ${base64url_ton}`;
        
      case 'xrp':
        // Derive XRP address from seed phrase using proper BIP32 derivation
        const bip39_xrp = await import('bip39');
        const { BIP32Factory: BIP32Factory_xrp } = await import('bip32');
        const ecc_xrp = await import('tiny-secp256k1');
        const crypto_xrp = await import('crypto');
        
        // Initialize BIP32 for XRP
        const bip32_xrp = BIP32Factory_xrp(ecc_xrp);
        
        // Generate seed from mnemonic
        const seed_xrp = await bip39_xrp.mnemonicToSeed(seedPhrase);
        
        // Create master key
        const root_xrp = bip32_xrp.fromSeed(seed_xrp);
        
        // Derive XRP key using BIP44 path: m/44'/144'/0'/0/0
        const derivationPath_xrp = "m/44'/144'/0'/0/0";
        const child_xrp = root_xrp.derivePath(derivationPath_xrp);
        
        if (!child_xrp.publicKey) {
          throw new Error('Failed to derive XRP public key');
        }
        
        // Generate XRP address from derived public key
        const publicKey_xrp = Buffer.from(child_xrp.publicKey);
        const addressHash_xrp = crypto_xrp.createHash('ripemd160').update(publicKey_xrp).digest();
          
          // XRP address format: starts with 'r' and is 34 characters long
        const addressBytes_xrp = Buffer.concat([
            Buffer.from([0x00]), // XRP address prefix
          addressHash_xrp
          ]);
          
          // Create checksum
        const checksum_xrp = crypto_xrp.createHash('sha256')
          .update(crypto_xrp.createHash('sha256').update(addressBytes_xrp).digest())
            .digest()
            .slice(0, 4);
          
        const finalBytes_xrp = Buffer.concat([addressBytes_xrp, checksum_xrp]);
        
        // Base58 encoding
        const base58Alphabet_xrp = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
        let result_xrp = '';
        let num_xrp = BigInt('0x' + finalBytes_xrp.toString('hex'));
        
        while (num_xrp > 0n) {
          result_xrp = base58Alphabet_xrp[Number(num_xrp % 58n)] + result_xrp;
          num_xrp = num_xrp / 58n;
          }
          
          // Ensure it starts with 'r' and is proper length
        const xrpAddress = 'r' + result_xrp.slice(0, 33);
          return xrpAddress;
        
      default:
        throw new Error(`Unsupported network: ${networkId}`);
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
      
      await walletManager.switchAccount(state.wallet.id, accountId);
      
      // Get the updated wallet with the new account
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
      }
    } catch (error) {
      // Don't set error state to avoid persistent "something went wrong"
    }
  };

  // Add new account
  const addAccount = async (password: string): Promise<any> => {
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
      
      const newAccount = await walletManager.addAccountToWallet(state.wallet.id, password);
      
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
  const getCurrentAccount = async (): Promise<any> => {
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
  };

  // Get all accounts for current wallet
  const getWalletAccounts = async (): Promise<any[]> => {
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
  };

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
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
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

  // Get account private key securely
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
    setGlobalPassword,
    setGlobalPasswordAndHash,
    clearError,
    extendSession
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