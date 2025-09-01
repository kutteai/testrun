import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validatePrivateKey, hashPassword, verifyPassword, encryptData, decryptData } from '../utils/crypto-utils';
import { deriveWalletFromSeed, importWalletFromPrivateKey as importFromPrivateKey } from '../utils/key-derivation';
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
        accounts: action.payload.accounts || [action.payload.address],
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
      
      // Check if there's an old error in Chrome storage and clear it
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const result = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['walletError', 'error'], resolve);
          });
          if (result.walletError || result.error) {
            console.log('🧹 WalletContext: Found old error in storage, clearing...', { walletError: result.walletError, error: result.error });
            await new Promise<void>((resolve) => {
              chrome.storage.local.remove(['walletError', 'error'], resolve);
            });
          }
        } catch (storageError) {
          console.log('Could not check/clear storage errors:', storageError);
        }
      }
      
      // Check if Chrome storage API is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('Chrome storage API not available, setting default state');
        dispatch({ type: 'SET_HAS_WALLET', payload: false });
        dispatch({ type: 'SET_WALLET_CREATED', payload: false });
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });
        return;
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
            const result = await chrome.storage.session.get(['sessionPassword']);
            if (result.sessionPassword) {
              console.log('✅ WalletContext: Restored password from session storage');
              dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: result.sessionPassword });
              toast('🔐 Password restored from session - real address derivation available', { duration: 5000 });
            } else {
              console.log('⚠️ WalletContext: No password in session storage - will use fallback addresses');
              toast('⚠️ Password not in session - using deterministic addresses', { duration: 5000 });
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
      const sessionResult = await chrome.storage.session.get(['sessionPassword']);
      const localResult = await chrome.storage.local.get(['passwordHash']);
      
      console.log('🔍 Password Status Check:');
      console.log('- Session Password:', sessionResult.sessionPassword ? 'EXISTS' : 'MISSING');
      console.log('- Local Password Hash:', localResult.passwordHash ? 'EXISTS' : 'MISSING');
      console.log('- Global Password in State:', state.globalPassword ? 'EXISTS' : 'MISSING');
      console.log('- Wallet Unlocked:', state.isWalletUnlocked);
      console.log('- Current Address:', state.wallet?.address || 'NONE');
      console.log('- Current Network:', state.wallet?.currentNetwork || 'NONE');
      
      if (!sessionResult.sessionPassword && state.isWalletUnlocked) {
        console.log('⚠️ WARNING: Wallet is unlocked but no session password found!');
        toast('⚠️ Password session issue detected', { duration: 3000 });
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
      // Don't show error toast or set error state for balance updates
      // This prevents "something went wrong" from balance update failures
    }
  };

  // Initialize wallet on mount - SINGLE useEffect
  useEffect(() => {
    initializeWallet();
  }, []); // Only run once on mount

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

  // Create new wallet with real implementation
  const createWallet = async (name: string, network: string, password?: string): Promise<void> => {
    try {
      const passwordToUse = password || state.globalPassword;
      if (!passwordToUse) {
        throw new Error('Password is required to create wallet.');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      // Use WalletManager to create wallet
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const walletData = await walletManager.createWallet({
        name,
        password: passwordToUse,
        network,
        accountCount: 1
      });

      // Store wallet securely in WalletContext storage too for compatibility
      await storeWallet(walletData);
      
      dispatch({ type: 'SET_WALLET', payload: walletData });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      toast.success('Wallet created successfully');
    } catch (error) {
      console.error('Wallet creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
      toast.error(errorMessage);
      // Don't set error state to avoid persistent "something went wrong"
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

 // Import wallet from seed phrase with real implementation
const importWallet = async (seedPhrase: string, network: string, password?: string): Promise<void> => {
  try {
      const passwordToUse = password || state.globalPassword;
      if (!passwordToUse) {
        throw new Error('Password is required to import wallet.');
      }

    dispatch({ type: 'SET_LOADING', payload: true });

    // Validate seed phrase
    if (!validateBIP39SeedPhrase(seedPhrase)) {
      throw new Error('Invalid seed phrase');
    }

      // Use WalletManager to import wallet
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const wallet = await walletManager.importWallet({
      name: 'Imported Wallet',
        seedPhrase,
        password: passwordToUse,
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
    
    toast.success('Wallet imported successfully');
  } catch (error) {
      console.error('Wallet import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import wallet';
      toast.error(errorMessage);
      // Don't set error state to avoid persistent "something went wrong"
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

  // Import wallet from private key
const importWalletFromPrivateKey = async (privateKey: string, network: string, password?: string): Promise<void> => {
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
      console.error('Private key import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import wallet from private key';
      toast.error(errorMessage);
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
      toast.success('Password set successfully');
    } catch (error) {
      console.error('Failed to set password:', error);
      toast.error('Failed to set password');
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
        toast.success('Wallet unlocked successfully');
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
        toast.success('Wallet unlocked successfully');
        return true;
      } else {
        toast.error('Invalid password');
        return false;
      }
    } catch (error) {
      console.error('Unlock wallet failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlock wallet';
      toast.error(errorMessage);
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
    
    toast.success('Wallet locked');
  };

   // Switch network
   const switchNetwork = async (networkId: string): Promise<void> => {
    try {
      console.log(`🔄 Starting network switch to: ${networkId}`);
      
      // Debug: Check current wallet state
      console.log('🔍 Wallet State Check:');
      console.log('- Has Wallet:', state.hasWallet);
      console.log('- Wallet Created:', state.isWalletCreated);
      console.log('- Wallet Unlocked:', state.isWalletUnlocked);
      console.log('- Current Address:', state.wallet?.address || 'NONE');
      console.log('- Current Network:', state.wallet?.currentNetwork || 'NONE');
      console.log('- Has Encrypted Seed:', !!state.wallet?.encryptedSeedPhrase);
      console.log('- Has Global Password:', !!state.globalPassword);
      
      // Always try to restore password at the start of network switch
      if (state.isWalletUnlocked) {
        const storedPassword = await getPassword();
        if (storedPassword) {
          console.log('✅ Restored password at start of network switch');
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: storedPassword });
        } else {
          console.log('⚠️ No password found at start of network switch - will prompt user if needed');
        }
      }
      
      // Load networks consistently
      const result = await chrome.storage.local.get(['customNetworks']);
      const customNetworks = result.customNetworks || [];
      const availableNetworks = [...getDefaultNetworks(), ...customNetworks];
      
      // Find the network
      const network = availableNetworks.find((n: Network) => n.id === networkId);
      if (!network) {
        throw new Error(`Network '${networkId}' not found`);
      }

      console.log(`✅ Found network: ${network.name}`);
      
      // Update current network first
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
      
      if (!state.wallet) {
        console.log('⚠️ No wallet available for address derivation');
        return;
      }
      
        let newAddress = state.wallet.address;
      const isEvmNetwork = !['bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'].includes(networkId);
      
      // Always derive the correct address for the target network
      console.log(`🔄 Deriving address for network: ${networkId} (EVM: ${isEvmNetwork})`);
      
      // Ensure we have a password for address derivation
      let passwordToUse = state.globalPassword;
      if (!passwordToUse && state.isWalletUnlocked) {
        console.log('🔑 No password in state, attempting to restore from storage...');
        passwordToUse = await getPassword();
        if (passwordToUse) {
          console.log('✅ Password restored from storage');
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
        } else {
          console.log('⚠️ No password in storage, prompting user...');
          // Prompt user for password immediately
          const userPassword = prompt(`Please enter your wallet password to derive real ${networkId} address:`);
          if (userPassword && userPassword.trim()) {
            try {
              // Test the password by trying to decrypt the seed phrase
              await decryptData(state.wallet.encryptedSeedPhrase, userPassword.trim());
              passwordToUse = userPassword.trim();
              dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: passwordToUse });
              await storePassword(passwordToUse);
              console.log('✅ User password validated and stored');
            } catch (passwordError) {
              console.log('❌ Invalid password provided');
              toast.error('Invalid password provided');
              passwordToUse = null;
            }
          } else {
            console.log('⚠️ No password provided by user');
            passwordToUse = null;
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
            console.log(`🔄 Derived EVM address: ${newAddress}`);
          } else {
            // For non-EVM networks, derive network-specific address
            newAddress = await deriveNetworkSpecificAddress(networkId, seedPhrase);
            console.log(`🔄 Derived ${networkId} address: ${newAddress}`);
          }
        } catch (error) {
          console.error(`Failed to derive address for ${networkId}:`, error);
          newAddress = generateFallbackAddress(networkId, state.wallet.id);
          console.log(`🔄 Using fallback address: ${newAddress}`);
        }
              } else {
          console.log('⚠️ No seed phrase or password available, using fallback address');
          newAddress = generateFallbackAddress(networkId, state.wallet.id);
          console.log(`🔄 Using fallback address: ${newAddress}`);
        }
      
      // Validate address format
      const isEvmAddress = newAddress.startsWith('0x') && newAddress.length === 42;
      const isBitcoinAddress = newAddress.startsWith('bc1') || newAddress.startsWith('1') || newAddress.startsWith('3');
      const isSolanaAddress = newAddress.startsWith('SOL') || newAddress.length === 44;
      const isTronAddress = newAddress.startsWith('T') && newAddress.length === 34;
      const isTonAddress = newAddress.startsWith('EQ') && newAddress.length === 48;
      const isXrpAddress = newAddress.startsWith('r') && newAddress.length === 34;
      
      console.log(`🔄 Address validation:`);
      console.log(`- Network: ${networkId}`);
      console.log(`- Address: ${newAddress}`);
      console.log(`- EVM format: ${isEvmAddress}`);
      console.log(`- Bitcoin format: ${isBitcoinAddress}`);
      console.log(`- Solana format: ${isSolanaAddress}`);
      console.log(`- TRON format: ${isTronAddress}`);
      console.log(`- TON format: ${isTonAddress}`);
      console.log(`- XRP format: ${isXrpAddress}`);
      
      console.log(`🔄 Address update: ${state.wallet.address} -> ${newAddress}`);
      console.log(`🔄 Network change: ${state.wallet.currentNetwork} -> ${networkId}`);
      
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
      console.log(`✅ Network switched to ${network.name}. Address changed: ${addressChanged}`);
      console.log(`✅ Final address: ${newAddress}`);
      
      // Show detailed toast with address info
      if (addressChanged) {
        toast.success(`Switched to ${network.name}\nNew address: ${newAddress.slice(0, 8)}...${newAddress.slice(-6)}\nFormat: ${isEvmAddress ? 'EVM' : isBitcoinAddress ? 'Bitcoin' : isSolanaAddress ? 'Solana' : isTronAddress ? 'TRON' : isTonAddress ? 'TON' : isXrpAddress ? 'XRP' : 'Unknown'}`);
      } else {
        toast.success(`Switched to ${network.name} (address unchanged)`);
      }
      
    } catch (error) {
      console.error('Network switch failed:', error);
      toast.error(`Failed to switch network: ${error.message}`);
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
        const crypto = await import('crypto');
        const seedHash = crypto.createHash('sha256').update(seedPhrase + 'tron').digest('hex');
        const addressHash = crypto.createHash('sha256').update(Buffer.from(seedHash, 'hex')).digest('hex');
        return `T${addressHash.slice(0, 33)}`;
        
      case 'ton':
        const crypto_ton = await import('crypto');
        const bip39_ton = await import('bip39');
        const seed_ton = await bip39_ton.mnemonicToSeed(seedPhrase);
        // Generate TON address using deterministic derivation
        const tonSeed = crypto_ton.createHash('sha256').update(seedPhrase + 'ton').digest('hex');
        const tonAddress = crypto_ton.createHash('sha256').update(Buffer.from(tonSeed, 'hex')).digest('hex');
        return `EQ${tonAddress.slice(0, 48)}`; // TON address format
        
      case 'xrp':
        const xrpl = await import('xrpl');
        const bip39_xrp = await import('bip39');
        const seed_xrp = await bip39_xrp.mnemonicToSeed(seedPhrase);
        // Use proper XRP derivation path
        const wallet_xrp = xrpl.Wallet.fromSeed(seed_xrp.slice(0, 32).toString('hex'));
        return wallet_xrp.address; // XRP address format (r...)
        
      default:
        return state.wallet?.address || '';
    }
  };

  const generateFallbackAddress = (networkId: string, walletId: string): string => {
    const fallbackSeed = hashString(walletId + networkId);
    
    switch (networkId) {
      case 'bitcoin':
        return `bc1${fallbackSeed.slice(0, 32)}`;
      case 'solana':
        return `SOL${fallbackSeed.slice(0, 40)}`;
      case 'tron':
        return `T${fallbackSeed.slice(0, 33)}`;
      case 'litecoin':
        return `L${fallbackSeed.slice(0, 33)}`;
      case 'ton':
        return `EQ${fallbackSeed.slice(0, 48)}`;
      case 'xrp':
        return `r${fallbackSeed.slice(0, 34)}`;
      default:
        return fallbackSeed;
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
      // Don't set error state to avoid persistent "something went wrong"
    }
  };

  // Add new account
  const addAccount = async (password: string): Promise<void> => {
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
        chrome.storage.local.get(['wallet', 'wallets'], resolve);
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
    await new Promise(resolve => setTimeout(resolve, 100));
    
      // Verify WalletManager can find the wallet
      const foundWallet = await walletManager.getWallet(state.wallet.id);
      if (!foundWallet) {
        console.error('❌ WalletManager cannot find wallet after migration. Attempting emergency fix...');
        
        // Emergency fix: Force store the wallet again
        await storeWallet(state.wallet);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait longer
        
        // Try to create a new WalletManager instance
        const newWalletManager = new WalletManager();
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        address: newAccount.address 
      });
    
    // Get the updated wallet with the new account
    const updatedWallet = await walletManager.getWallet(state.wallet.id);
    if (updatedWallet) {
        console.log('✅ Updated wallet retrieved with accounts:', updatedWallet.accounts?.length || 0);
      dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: updatedWallet });
      toast.success('New account added successfully');
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
    toast.error(errorMessage);
      // Don't set error state to avoid persistent "something went wrong"
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
      console.error('Error removing account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove account';
      toast.error(errorMessage);
      // Don't set error state to avoid persistent "something went wrong"
    }
  };

  // Get current account
  const getCurrentAccount = async (): Promise<any> => {
    if (!state.wallet) {
      console.log('🔍 getCurrentAccount: No wallet in state');
      return null;
    }

    console.log('🔍 getCurrentAccount: Looking for current account for wallet:', {
      walletId: state.wallet.id,
      walletAddress: state.wallet.address,
      accountsCount: state.wallet.accounts?.length || 0
    });

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    // Wait a bit for the wallet manager to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let currentAccount = await walletManager.getCurrentAccountForWallet(state.wallet.id);
    console.log('🔍 getCurrentAccount: Found current account from WalletManager:', currentAccount ? {
      id: currentAccount.id,
      address: currentAccount.address
    } : 'null');
    
    // Debug logging (console only)
    console.log('🔍 WM Current Account:', currentAccount ? 'Found' : 'Not Found');
    if (currentAccount) {
      console.log('🔍 WM Current Type:', typeof currentAccount, 'Value:', currentAccount);
    }
    
    // If no current account found in WalletManager but wallet has address, create a fallback account
    if (!currentAccount && state.wallet.address) {
      console.log('🔄 getCurrentAccount: No current account in WalletManager, creating fallback account from wallet data');
      currentAccount = {
        id: state.wallet.id + '-main',
        address: state.wallet.address,
        privateKey: state.wallet.privateKey || '',
        publicKey: state.wallet.publicKey || '',
        derivationPath: state.wallet.derivationPath || "m/44'/60'/0'/0/0",
        network: state.wallet.currentNetwork || 'ethereum',
        balance: state.wallet.balance || '0',
        nonce: 0,
        createdAt: state.wallet.createdAt || Date.now()
      };
      console.log('✅ getCurrentAccount: Created fallback current account:', currentAccount);
      console.log('✅ getCurrentAccount: About to return account object:', currentAccount);
      
      // Debug logging (console only)
      console.log('🔍 Created Fallback Current:', currentAccount);
    }
    
    console.log('🔍 getCurrentAccount: Final return value:', currentAccount);
    console.log('🔍 getCurrentAccount FINAL RETURN: Type=', typeof currentAccount, 'Value=', currentAccount);
    return currentAccount;
  };

  // Get all accounts for current wallet
  const getWalletAccounts = async (): Promise<any[]> => {
    if (!state.wallet) {
      console.log('🔍 getWalletAccounts: No wallet in state');
      return [];
    }

    console.log('🔍 getWalletAccounts: Getting accounts for wallet:', {
      walletId: state.wallet.id,
      stateAccountsCount: state.wallet.accounts?.length || 0
    });

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    // Wait a bit for the wallet manager to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let accounts = await walletManager.getWalletAccounts(state.wallet.id);
    console.log('🔍 getWalletAccounts: Retrieved accounts from WalletManager:', {
      count: accounts.length,
      addresses: accounts.map(acc => acc?.address)
    });
    
    // Debug logging (console only)
    console.log('🔍 WM Retrieved:', accounts.length, 'accounts');
    if (accounts.length > 0) {
      console.log('🔍 WM First Account Type:', typeof accounts[0], 'Value:', accounts[0]);
    }
    
    // If no accounts found in WalletManager but wallet has address, create a fallback account
    if (accounts.length === 0 && state.wallet.address) {
      console.log('🔄 getWalletAccounts: No accounts in WalletManager, creating fallback account from wallet data');
      const fallbackAccount = {
        id: state.wallet.id + '-main',
        address: state.wallet.address,
        privateKey: state.wallet.privateKey || '',
        publicKey: state.wallet.publicKey || '',
        derivationPath: state.wallet.derivationPath || "m/44'/60'/0'/0/0",
        network: state.wallet.currentNetwork || 'ethereum',
        balance: state.wallet.balance || '0',
        nonce: 0,
        createdAt: state.wallet.createdAt || Date.now()
      };
      accounts = [fallbackAccount];
      console.log('✅ getWalletAccounts: Created fallback account:', fallbackAccount);
      console.log('✅ getWalletAccounts: About to return accounts array:', accounts);
      
      // Debug logging (console only)
      console.log('🔍 Created Fallback Account:', fallbackAccount);
      console.log('🔍 Fallback Array Length:', accounts.length, 'Type:', typeof accounts[0]);
    }
    
    console.log('🔍 getWalletAccounts: Final return value:', accounts);
    console.log('🔍 getWalletAccounts FINAL RETURN: Length=', accounts.length, 'Type=', typeof accounts, 'FirstType=', accounts.length > 0 ? typeof accounts[0] : 'none');
    return accounts;
  };

  // Get balance for specific address and network
  const getBalance = async (address: string, network: string): Promise<string> => {
    try {
      const balance = await getRealBalance(address, network);
      return balance;
    } catch (error) {
      toast.error('Failed to get balance');
      // Don't set error state to avoid persistent "something went wrong"
      return '0';
    }
  };

  // Store wallet securely
  const storeWallet = async (wallet: WalletData): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      // Check if ChromeAPI is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('storeWallet: Chrome storage API not available');
        resolve();
        return;
      }
      
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
        const result = await new Promise<any>((resolve) => {
          chrome.storage.local.get(['wallets'], resolve);
        });
        
        let existingWallets = result.wallets || [];
        
        // Update or add the wallet
        const existingIndex = existingWallets.findIndex((w: any) => w.id === wallet.id);
        if (existingIndex >= 0) {
          existingWallets[existingIndex] = internalWallet;
        } else {
          existingWallets.push(internalWallet);
        }
        
        // Store in both formats for compatibility
    chrome.storage.local.set({ 
          wallet, // Keep original format for WalletContext
          wallets: existingWallets, // WalletManager format
      walletState: {
        isWalletUnlocked: state.isWalletUnlocked,
        hasWallet: true,
        isWalletCreated: true,
        lastUpdated: Date.now()
        }
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to store wallet:', chrome.runtime.lastError);
            reject(new Error('Failed to store wallet'));
          } else {
            console.log('✅ Wallet stored in both formats for compatibility');
            resolve();
        }
      });
    } catch (error) {
        console.error('Error storing wallet:', error);
        reject(error);
      }
    });
  };

  // Store wallet state
  const storeWalletState = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if Chrome storage API is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('storeWalletState: Chrome storage API not available');
        resolve();
        return;
      }
      
    chrome.storage.local.set({ 
      walletState: {
        isWalletUnlocked: state.isWalletUnlocked,
        hasWallet: state.hasWallet,
        isWalletCreated: state.isWalletCreated,
        lastUpdated: Date.now()
      }
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to store wallet state:', chrome.runtime.lastError);
          reject(new Error('Failed to store wallet state'));
        } else {
          resolve();
        }
      });
    });
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    return new Promise((resolve) => {
      console.log('getStoredWallet: Starting Chrome storage access...');
      
      // Check if Chrome storage API is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('getStoredWallet: Chrome storage API not available');
        resolve(null);
        return;
      }
      
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
      
      // Check if Chrome storage API is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('getStoredWalletState: Chrome storage API not available');
        resolve(null);
        return;
      }
      
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
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ passwordHash: hash }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to store password hash:', chrome.runtime.lastError);
          reject(new Error('Failed to store password hash'));
        } else {
          resolve();
        }
      });
    });
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
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ unlockTime: timestamp }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to store unlock time:', chrome.runtime.lastError);
          reject(new Error('Failed to store unlock time'));
        } else {
          resolve();
        }
      });
    });
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
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
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
      // Store in both session and local storage for redundancy
      const promises = [
        chrome.storage.session.set({ sessionPassword: password }),
        chrome.storage.local.set({ sessionPassword: btoa(password) }) // Encoded in local storage
      ];
      
      await Promise.all(promises);
      console.log('✅ Password stored in both session and local storage');
      
      // Verify storage worked
      const verifyResult = await chrome.storage.session.get(['sessionPassword']);
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
      const sessionResult = await chrome.storage.session.get(['sessionPassword']);
      if (sessionResult.sessionPassword) {
        console.log('✅ Password retrieved from session storage');
        return sessionResult.sessionPassword;
      }
      
      // Try local storage as fallback
      const localResult = await chrome.storage.local.get(['sessionPassword']);
      if (localResult.sessionPassword) {
        try {
          const decodedPassword = atob(localResult.sessionPassword);
          console.log('✅ Password retrieved from local storage fallback');
          // Restore to session storage
          await chrome.storage.session.set({ sessionPassword: decodedPassword });
          console.log('✅ Password restored to session storage');
          return decodedPassword;
        } catch (decodeError) {
          console.log('❌ Could not decode password from local storage:', decodeError);
        }
      }
      
      // Try alternative storage keys
      const altSessionResult = await chrome.storage.session.get(['backupPassword']);
      if (altSessionResult.backupPassword) {
        console.log('✅ Password retrieved from alternative session storage');
        return altSessionResult.backupPassword;
      }
      
      const altLocalResult = await chrome.storage.local.get(['backupPassword']);
      if (altLocalResult.backupPassword) {
        try {
          const decodedPassword = atob(altLocalResult.backupPassword);
          console.log('✅ Password retrieved from alternative local storage');
          // Restore to session storage
          await chrome.storage.session.set({ sessionPassword: decodedPassword });
          console.log('✅ Password restored to session storage');
          return decodedPassword;
        } catch (decodeError) {
          console.log('❌ Could not decode alternative password from local storage:', decodeError);
        }
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
      await chrome.storage.session.remove(['sessionPassword']);
      await chrome.storage.local.remove(['sessionPassword']);
      console.log('✅ Password cleared from all storage');
    } catch (error) {
      console.log('⚠️ Error clearing password:', error);
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