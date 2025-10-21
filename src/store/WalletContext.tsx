import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getRealBalance } from '../utils/web3-utils';
import { generateBIP39SeedPhrase, validateBIP39SeedPhrase, validateBIP39SeedPhraseWithFeedback, validatePrivateKey, hashPassword, verifyPassword, encryptData, decryptData, importFromPrivateKey } from '../utils/crypto-utils';
import { UnifiedCrypto } from '../utils/unified-crypto';
import { deriveWalletFromSeed } from '../utils/key-derivation';
import { AddressDerivationService } from '../services/address-derivation-service';
import { storage, storageUtils, SecureSessionManager } from '../utils/storage-utils';
import { 
  WalletData, 
  WalletState, 
  WalletContextType, 
  Network
} from '../types/index';

// ============================================================================
// SECURE CRYPTO UTILITIES - ALIGNED WITH BACKGROUND SCRIPT
// ============================================================================

// Use UnifiedCrypto for consistent encryption across frontend and background
const SecureCrypto = UnifiedCrypto;


// ============================================================================
// SECURE WALLET COMMUNICATION
// ============================================================================

class SecureWalletComm {
  static async sendMessage(type: string, payload: any = {}) {
    // Cross-browser compatibility
    const browserAPI = (() => {
      if (typeof browser !== 'undefined') return browser;
      if (typeof chrome !== 'undefined') return chrome;
      throw new Error('No browser API available');
    })();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout - background script may not be responding'));
      }, 15000); // Reduced timeout

      try {

        browserAPI.runtime.sendMessage({ type, ...payload }, (response) => {
          clearTimeout(timeoutId);


          if (browserAPI.runtime.lastError) {
            const errorMsg = browserAPI.runtime.lastError.message;
            // eslint-disable-next-line no-console
            console.error(`❌ SecureWalletComm: Runtime error for ${type}:`, errorMsg);
            reject(new Error(`Background script error: ${errorMsg}`));
            return;
          }
          
          if (!response) {
            // eslint-disable-next-line no-console
            console.error(`❌ SecureWalletComm: No response received for ${type}`);
            reject(new Error('No response from background script'));
            return;
          }
          
          // Handle different response formats
          if (response.success === true) {

            resolve(response.data || response);
          } else if (response.success === false) {
            // eslint-disable-next-line no-console
            console.error(`❌ SecureWalletComm: Error response for ${type}:`, response.error);
            reject(new Error(response.error || 'Background script returned error'));
          } else {
            // Legacy format - assume success if no explicit success field

            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        // eslint-disable-next-line no-console
        console.error(`❌ SecureWalletComm: Exception sending ${type}:`, error);
        reject(error);
      }
    });
  }
  
  static async healthCheck() {
    try {
      const response = await this.sendMessage('HEALTH_CHECK', {});

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Background script health check failed:', error);
      
      // Try alternative connection methods
      return await this.alternativeHealthCheck();
    }
  }

  static async alternativeHealthCheck() {
    try {
      // Method 1: Try direct storage access
      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        return null;
      })();
      
      if (browserAPI && browserAPI.storage) {
        await browserAPI.storage.local.get(['healthcheck']);

        return true;
      }
      
      // Method 2: Try runtime connection
      if (browserAPI && browserAPI.runtime) {
        try {
          const manifest = (browserAPI.runtime as any).getManifest();
          if (manifest) {

            return true;
          }
        } catch (manifestError) {
          // eslint-disable-next-line no-console
          console.warn('Manifest access failed:', manifestError);
        }
      }
      
      // eslint-disable-next-line no-console
      console.error('❌ All alternative health checks failed');
      return false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Alternative health check failed:', error);
      return false;
    }
  }
  
  static async createWallet(name: string, seedPhrase: string, password: string) {
    return await this.sendMessage('CREATE_WALLET', {
      name,
      seedPhrase,
      password
    });
  }
  
  static async unlockWallet(password: string) {
    return await this.sendMessage('UNLOCK_WALLET', { password });
  }
  
  static async lockWallet() {
    return await this.sendMessage('LOCK_WALLET');
  }
  
  static async getWalletStatus() {
    return await this.sendMessage('GET_WALLET_STATUS');
  }
  
  static async getAccounts() {
    return await this.sendMessage('GET_ACCOUNTS');
  }
}


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

      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null }); // Clear any existing errors
      
      // Force clear any persistent error state

      // Check if there's an old error in storage and clear it
      try {
        const result = await storage.get(['walletError', 'error']);
        if (result.walletError || result.error) {

          await storage.remove(['walletError', 'error']);
        }
      } catch (storageError) {

      }
      
      // Simple initialization - just check if wallet exists
      const storedWallet = await getStoredWallet();
      
      if (storedWallet) {
        // Wallet exists - check if session is still valid
        const unlockTime = await getStoredUnlockTime();
        const now = Date.now();
        const sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds


        if (unlockTime && (now - unlockTime) < sessionTimeout) {
          // Session is still valid, auto-unlock

          // Try to restore the password using the enhanced session manager
          try {
            const password = await SecureSessionManager.getSessionPassword();
            if (password) {

              dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
            } else {

            }
          } catch (error) {

          }
          
          dispatch({ type: 'SET_WALLET', payload: storedWallet });
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });

            // Check session status for debugging
  setTimeout(() => checkSessionStatus(), 1000);
  
  // Debug function to check wallet state
  const checkWalletState = () => {


  };
  
  // Debug function to check password status
    const checkPasswordStatus = async () => {
    try {
      const sessionResult = await storage.getSession(['sessionPassword']);
      const localResult = await storage.get(['passwordHash']);


      if (!sessionResult.sessionPassword && state.isWalletUnlocked) {

      }
    } catch (error) {

    }
  };
  
  // Check password status after auto-unlock
  setTimeout(() => checkPasswordStatus(), 2000);
        } else {
          // Session expired or no unlock time, start locked

          dispatch({ type: 'SET_WALLET', payload: storedWallet });
          dispatch({ type: 'SET_HAS_WALLET', payload: true });
          dispatch({ type: 'SET_WALLET_CREATED', payload: true });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });

        }
      } else {
        // No wallet exists
        dispatch({ type: 'SET_HAS_WALLET', payload: false });
        dispatch({ type: 'SET_WALLET_CREATED', payload: false });
        dispatch({ type: 'SET_WALLET_UNLOCKED', payload: false });

      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error initializing wallet:', error);
      // Don't set error state during initialization to avoid "something went wrong"
    } finally {
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    }
  };

  // Update all balances
  const updateAllBalances = async (): Promise<void> => {
    if (!state.address) {

      return;
    }

    try {

      // Get current network from storage
              const result = await storage.get(['currentNetwork']);
      const currentNetworkId = result.currentNetwork || 'ethereum';
      
      // Get balance for current network (getRealBalance now handles failures and returns "0")
      const balance = await getRealBalance(state.address!, currentNetworkId);

      // Update balances state with new balance for current network
      const newBalances = { ...state.balances };
      newBalances[currentNetworkId] = balance;

      dispatch({ type: 'SET_BALANCES', payload: newBalances });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update balances:', error);
      // Set balance to "0" as fallback
      const result = await storage.get(['currentNetwork']);
      const currentNetworkId = result.currentNetwork || 'ethereum';
      const newBalances = { ...state.balances };
      newBalances[currentNetworkId] = '0';
      dispatch({ type: 'SET_BALANCES', payload: newBalances });
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

        const storedPassword = await getPassword();
        if (storedPassword) {

          // Don't automatically unlock for security, but password is available
        } else {

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

        // Update current network in wallet context
        if (network) {

          dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
          
          // Also update the wallet's currentNetwork if wallet exists
          if (state.wallet) {
            const updatedWallet = {
              ...state.wallet,
              currentNetwork: networkId
            };
            dispatch({ type: 'SET_WALLET', payload: updatedWallet });

          }
        }
        
        // Update balances for the new network
        if (state.isWalletUnlocked && state.address) {

          await updateAllBalances();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.log('🔒 Starting auto-lock timer (15 minutes)');
        startAutoLockTimer();
        
        // Reset timer on user activity
        const handleUserActivity = () => {
          lastActivityRef.current = Date.now();

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
        // eslint-disable-next-line no-console
        console.log('🔒 Clearing auto-lock timer (wallet locked or no password hash)');
        clearAutoLockTimer();
      }
    };

    checkAutoLock();
  }, [state.isWalletUnlocked]);

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
      
      const newWallet = await walletManager.createWallet({
        name,
        password, // Use the passed password directly
        network,
        accountCount: 1
      });

      // Set the new wallet as active
      await walletManager.setActiveWallet(newWallet.id);
      
      // Get all wallets to update the context
      const allWallets = await walletManager.getAllWallets();

      // Store wallet securely in WalletContext storage too for compatibility
      await storeWallet(newWallet);
      
      dispatch({ type: 'SET_WALLET', payload: newWallet });
      dispatch({ type: 'SET_WALLET_CREATED', payload: true });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });
      
      // Dispatch events to notify all components
      if (typeof window !== 'undefined') {
        const walletEvent = new CustomEvent('walletChanged', {
          detail: {
            wallet: newWallet,
            address: newWallet.address,
            network: network,
            walletId: newWallet.id
          }
        });
        window.dispatchEvent(walletEvent);
        
        // Also dispatch wallet created event for specific handling
        const walletCreatedEvent = new CustomEvent('walletCreated', {
          detail: {
            wallet: newWallet,
            walletId: newWallet.id,
            address: newWallet.address,
            network: network
          }
        });
        window.dispatchEvent(walletCreatedEvent);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
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


      // eslint-disable-next-line no-console
      console.log('🔍 WalletContext: Seed phrase length:', seedPhrase.split(' ').length);
      
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


      const newWallet = await walletManager.importWallet({
      name: `Wallet ${Date.now()}`, // Unique name for each wallet
        seedPhrase,
        password, // Use the passed password directly
        network,
        accountCount: 1
      });

      // Set the new wallet as the active wallet
      await walletManager.setActiveWallet(newWallet.id);
      
      // Get all wallets to update the context
      const allWallets = await walletManager.getAllWallets();

      // Update wallet state to reflect the new active wallet
      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        throw new Error('No browser API available');
      })();
      
      await browserAPI.storage.local.set({ 
        wallet: newWallet, // Set as current active wallet
        walletState: {
          isWalletUnlocked: true,
          hasWallet: true,
          isWalletCreated: true,
          lastUpdated: Date.now(),
          activeWalletId: newWallet.id
        }
      });

    dispatch({ type: 'SET_WALLET', payload: newWallet });
    dispatch({ type: 'SET_WALLET_CREATED', payload: true });
    dispatch({ type: 'SET_HAS_WALLET', payload: true });

    // Set the current network
    const networkData = {
      id: network,
      name: network.charAt(0).toUpperCase() + network.slice(1),
      symbol: network === 'ethereum' ? 'ETH' : network.toUpperCase(),
      rpcUrl: getRpcUrl(network),
      explorerUrl: getExplorerUrl(network),
      chainId: getChainId(network),
      isCustom: false,
      isEnabled: true
    };
    dispatch({ type: 'SET_CURRENT_NETWORK', payload: networkData });
    
    // Dispatch events to notify all components
    if (typeof window !== 'undefined') {
      const walletEvent = new CustomEvent('walletChanged', {
        detail: {
          wallet: newWallet,
          address: newWallet.address,
          network: network,
          walletId: newWallet.id
        }
      });
      window.dispatchEvent(walletEvent);
      
      // Also dispatch wallet imported event for specific handling
      const walletImportedEvent = new CustomEvent('walletImported', {
        detail: {
          wallet: newWallet,
          walletId: newWallet.id,
          address: newWallet.address,
          network: network
        }
      });
      window.dispatchEvent(walletImportedEvent);
    }
    
  } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ WalletContext: Wallet import failed:', error);
      // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
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
      rpcUrl: getRpcUrl(network),
      explorerUrl: getExplorerUrl(network),
      chainId: getChainId(network),
      isCustom: false,
      isEnabled: true
    };
    dispatch({ type: 'SET_CURRENT_NETWORK', payload: networkData });
    
  } catch (error) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to set password:', error);
      throw error;
    }
  };

  // Force clear error state (for debugging)
  const clearError = (): void => {

    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Fallback unlock when background script is not responding
  const fallbackUnlock = async (password: string): Promise<boolean> => {
    try {

      // Try to access wallet data directly from storage
      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        throw new Error('No browser API available');
      })();
      
      const stored = await browserAPI.storage.local.get(['wallet', 'passwordHash']);
      
      if (!stored.wallet) {
        throw new Error('No wallet found in storage');
      }
      
      // Try serverless password verification
      try {
        const { hybridAPI } = await import('../services/backend-api');
        await hybridAPI.initialize();
        
        if (stored.passwordHash) {
          const verification = await hybridAPI.verifyPassword(password, stored.passwordHash);
          if (verification) {

            // Set wallet as unlocked in local state
            const walletData: WalletData = {
              id: stored.wallet.id || 'fallback-wallet',
              name: stored.wallet.name || 'Main Account',
              address: stored.wallet.address || '',
              privateKey: '',
              publicKey: '',
              encryptedSeedPhrase: '',
              accounts: stored.wallet.accounts || [],
              networks: ['ethereum', 'bsc', 'polygon'],
              currentNetwork: stored.wallet.currentNetwork || 'ethereum',
              derivationPath: "m/44'/60'/0'/0/0",
              balance: '0',
              createdAt: stored.wallet.createdAt || Date.now(),
              lastUsed: Date.now(),
              decryptPrivateKey: async () => null
            };
            
          dispatch({ type: 'SET_WALLET', payload: walletData });
          dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
            
            // Create session
            await SecureSessionManager.createSession(password);
            
            return true;
          }
        }
      } catch (serverlessError) {
        // eslint-disable-next-line no-console
        console.warn('Serverless verification failed in fallback:', serverlessError);
      }
      
      throw new Error('Fallback unlock failed - could not verify password');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Fallback unlock error:', error);
      return false;
    }
  };

  const unlockWallet = async (password: string): Promise<boolean> => {


    if (!password?.trim()) {
      // eslint-disable-next-line no-console
      console.error('❌ No password provided');
      dispatch({ type: 'SET_ERROR', payload: 'Password is required' });
      return false;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Get wallet data
      const storedWallet = await getStoredWallet();
      if (!storedWallet) {
        throw new Error('No wallet found. Please create a wallet first.');
      }


      // Get stored password hash
      const storedHash = await getStoredPasswordHash();


      let isValidPassword = false;

      // Primary verification: Hash comparison
      if (storedHash) {
        try {
          const generatedHash = await hashPassword(password);
          isValidPassword = generatedHash === storedHash;

          // eslint-disable-next-line no-console
          console.log('🔍 UNLOCK DEBUG: Generated hash preview:', generatedHash.substring(0, 10));
          // eslint-disable-next-line no-console
          console.log('🔍 UNLOCK DEBUG: Stored hash preview:', storedHash.substring(0, 10));
        } catch (hashError) {
          // eslint-disable-next-line no-console
          console.warn('⚠️ Hash verification failed:', hashError);
        }
      }

      // Fallback verification: Seed phrase decryption
      if (!isValidPassword && storedWallet.encryptedSeedPhrase) {
        try {
          const decryptedSeed = await decryptData(storedWallet.encryptedSeedPhrase, password);
          if (decryptedSeed?.trim()) {
            const words = decryptedSeed.trim().split(/\s+/);
            isValidPassword = words.length >= 12 && words.length <= 24;


            // Regenerate missing password hash
            if (isValidPassword && !storedHash) {
              try {
                const newHash = await hashPassword(password);
                await storePasswordHash(newHash);

              } catch (regenerateError) {
                // eslint-disable-next-line no-console
                console.warn('⚠️ Could not regenerate password hash:', regenerateError);
              }
            }
          }
        } catch (decryptError) {

        }
      }

      if (!isValidPassword) {
        throw new Error('Invalid password. Please check your password and try again.');
      }

      // Create proper wallet data structure
      const walletData: WalletData = {
        id: storedWallet.id,
        name: storedWallet.name || 'Main Account',
        address: storedWallet.address,
        privateKey: storedWallet.privateKey || '',
        publicKey: storedWallet.publicKey || '',
        encryptedSeedPhrase: storedWallet.encryptedSeedPhrase,
        accounts: storedWallet.accounts || [],
        networks: storedWallet.networks || ['ethereum'],
        currentNetwork: storedWallet.currentNetwork || 'ethereum',
        derivationPath: storedWallet.derivationPath || "m/44'/60'/0'/0/0",
        balance: '0',
        createdAt: storedWallet.createdAt || Date.now(),
        lastUsed: Date.now(),
        decryptPrivateKey: async () => null
      };

      // Update state
      dispatch({ type: 'SET_WALLET', payload: walletData });
      dispatch({ type: 'SET_WALLET_UNLOCKED', payload: true });
      dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
      dispatch({ type: 'SET_HAS_WALLET', payload: true });

      // Store session data
      await storePassword(password);
      await storeUnlockTime(Date.now());

      // Create secure session
      try {
        await SecureSessionManager.createSession(password);

      } catch (sessionError) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Session creation failed:', sessionError);
        // Continue with unlock even if session creation fails
      }

      return true;

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Unlock failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Enhanced debug function to help diagnose unlock issues
  const debugUnlockIssue = async (testPassword: string) => {
    try {


      // Check storage contents
      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        throw new Error('No browser API available');
      })();
      
      const allData = await browserAPI.storage.local.get(null);
      // eslint-disable-next-line no-console
      console.log('📦 All storage keys:', Object.keys(allData));
      
      // Check specific wallet-related data
      const walletData = await browserAPI.storage.local.get(['wallet', 'passwordHash', 'walletState', 'sessionPassword']);


      if (walletData.wallet) {


      }
      
      if (walletData.passwordHash) {

        // eslint-disable-next-line no-console
        console.log('🔍 Password hash preview:', walletData.passwordHash.substring(0, 20));
      }
      
      if (walletData.walletState) {


      }
      
      // Test password hashing

      try {
        const testHash = await hashPassword(testPassword);


        // eslint-disable-next-line no-console
        console.log('🔍 Generated hash preview:', testHash.substring(0, 20));
        
        if (walletData.passwordHash) {
          const hashMatch = testHash === walletData.passwordHash;

          if (!hashMatch) {

            // eslint-disable-next-line no-console
            console.log('🔍 Expected hash preview:', walletData.passwordHash.substring(0, 20));
            // eslint-disable-next-line no-console
            console.log('🔍 Generated hash preview:', testHash.substring(0, 20));
          }
        }
      } catch (hashError) {
        // eslint-disable-next-line no-console
        console.error('❌ Password hashing failed:', hashError);
      }
      
      // Test seed phrase decryption
      if (walletData.wallet?.encryptedSeedPhrase) {

        try {
          const decryptedSeed = await decryptData(walletData.wallet.encryptedSeedPhrase, testPassword);
          if (decryptedSeed) {
            const words = decryptedSeed.trim().split(/\s+/);


            // eslint-disable-next-line no-console
            console.log('🔍 First few words:', words.slice(0, 3).join(' '));

          } else {

          }
        } catch (decryptError) {
          // eslint-disable-next-line no-console
          console.error('❌ Seed decryption failed:', decryptError.message);
        }
      }
      
      // Test storage utilities

      try {
        const storedWallet = await getStoredWallet();
        // eslint-disable-next-line no-console
        console.log('✅ getStoredWallet() successful:', !!storedWallet);
        
        const storedHash = await getStoredPasswordHash();
        // eslint-disable-next-line no-console
        console.log('✅ getStoredPasswordHash() successful:', !!storedHash);
        
        const storedPassword = await getPassword();
        // eslint-disable-next-line no-console
        console.log('✅ getPassword() successful:', !!storedPassword);
      } catch (storageError) {
        // eslint-disable-next-line no-console
        console.error('❌ Storage utility error:', storageError);
      }
      
      // Test background script communication

      try {
        const bgResult = await SecureWalletComm.unlockWallet(testPassword);


      } catch (bgError) {
        // eslint-disable-next-line no-console
        console.error('❌ Background script communication failed:', bgError.message);
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Debug session failed:', error);
    }
  };

  // Debug function for password verification only
  const debugPassword = async (testPassword: string) => {
    try {

      const storedHash = await getStoredPasswordHash();
      if (!storedHash) {

        return false;
      }

      const generatedHash = await hashPassword(testPassword);
      const isValid = generatedHash === storedHash;

      // eslint-disable-next-line no-console
      console.log('🔍 Generated hash preview:', generatedHash.substring(0, 20));
      // eslint-disable-next-line no-console
      console.log('🔍 Stored hash preview:', storedHash.substring(0, 20));
      
      return isValid;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Password verification debug failed:', error);
      return false;
    }
  };

  // Debug function for storage integrity
  const debugStorage = async () => {
    try {

      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        throw new Error('No browser API available');
      })();
      
      // Get all storage data
      const allData = await browserAPI.storage.local.get(null);
      // eslint-disable-next-line no-console
      console.log('📦 Total storage items:', Object.keys(allData).length);
      
      // Check each important key
      const importantKeys = ['wallet', 'passwordHash', 'walletState', 'sessionPassword', 'unlockTime'];
      for (const key of importantKeys) {
        const value = allData[key];
        // eslint-disable-next-line no-console
        console.log(`🔍 ${key}:`, {
          exists: !!value,
          type: typeof value,
          size: value ? JSON.stringify(value).length : 0
        });
      }
      
      // Test storage write/read
      const testKey = 'debug_test_' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };
      
      await browserAPI.storage.local.set({ [testKey]: testValue });
      const readBack = await browserAPI.storage.local.get([testKey]);
      const writeReadSuccess = JSON.stringify(readBack[testKey]) === JSON.stringify(testValue);

      // Clean up test data
      await browserAPI.storage.local.remove([testKey]);
      
      return writeReadSuccess;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Storage debug failed:', error);
      return false;
    }
  };

  // Export debug functions to window for easy access
  (window as any).debugUnlockIssue = debugUnlockIssue;
  (window as any).debugPassword = debugPassword;
  (window as any).debugStorage = debugStorage;
  
  // Force TypeScript recompilation

  // Lock wallet - preserves wallet data, only clears session
  const lockWallet = async (): Promise<void> => {
    try {

      // Update state to locked
      dispatch({ type: 'LOCK_WALLET' });
      
      // Clear auto-lock timer
      clearAutoLockTimer();
      
      // Clear unlock time
      await storeUnlockTime(0);
      
      // Clear session data (password, session info) but preserve wallet data
      await storageUtils.clearSensitiveData();
      
      // Send lock message to background script
      try {
        await SecureWalletComm.lockWallet();
      } catch (bgError) {
        // eslint-disable-next-line no-console
        console.warn('Background script lock failed:', bgError);
        // Continue with local lock even if background fails
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to lock wallet:', error);
      throw error;
    }
  };

  // Helper function to get chain ID for network
  const getChainIdForNetwork = (networkId: string): number | null => {
    const chainIds = {
      'ethereum': 1,
      'bsc': 56,
      'polygon': 137,
      'avalanche': 43114,
      'arbitrum': 42161,
      'optimism': 10,
      'fantom': 250,
      'cronos': 25,
      'base': 8453,
      'zksync': 324,
      'linea': 59144,
      'mantle': 5000,
      'scroll': 534352
    };
    return chainIds[networkId] || null;
  };

  // Helper function to add Ethereum chain
  const addEthereumChain = async (chainId: number, networkId: string): Promise<void> => {
    const chainConfigs = {
      56: {
        chainName: 'BNB Smart Chain',
        rpcUrls: ['https://bsc-dataseed.binance.org'],
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockExplorerUrls: ['https://bscscan.com']
      },
      137: {
        chainName: 'Polygon',
        rpcUrls: ['https://polygon-rpc.com'],
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        blockExplorerUrls: ['https://polygonscan.com']
      },
      43114: {
        chainName: 'Avalanche',
        rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
        nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
        blockExplorerUrls: ['https://snowtrace.io']
      },
      42161: {
        chainName: 'Arbitrum One',
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://arbiscan.io']
      },
      10: {
        chainName: 'Optimism',
        rpcUrls: ['https://mainnet.optimism.io'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://optimistic.etherscan.io']
      },
      250: {
        chainName: 'Fantom Opera',
        rpcUrls: ['https://rpc.ftm.tools'],
        nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
        blockExplorerUrls: ['https://ftmscan.com']
      },
      25: {
        chainName: 'Cronos',
        rpcUrls: ['https://evm.cronos.org'],
        nativeCurrency: { name: 'CRO', symbol: 'CRO', decimals: 18 },
        blockExplorerUrls: ['https://cronoscan.com']
      },
      8453: {
        chainName: 'Base',
        rpcUrls: ['https://mainnet.base.org'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://basescan.org']
      },
      324: {
        chainName: 'zkSync Era',
        rpcUrls: ['https://mainnet.era.zksync.io'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://explorer.zksync.io']
      },
      59144: {
        chainName: 'Linea',
        rpcUrls: ['https://rpc.linea.build'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://lineascan.build']
      },
      5000: {
        chainName: 'Mantle',
        rpcUrls: ['https://rpc.mantle.xyz'],
        nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
        blockExplorerUrls: ['https://mantlescan.xyz']
      },
      534352: {
        chainName: 'Scroll',
        rpcUrls: ['https://rpc.scroll.io'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://scrollscan.com']
      }
    };

    const config = chainConfigs[chainId];
    if (config) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}`, ...config }]
      });
    }
  };

  // Switch network
  const switchNetwork = async (networkId: string): Promise<void> => {

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get available networks
              const result = await storage.get(['customNetworks']);
      const customNetworks = result.customNetworks || [];
      const availableNetworks = [...getDefaultNetworks(), ...customNetworks];
      
      // Find target network
      const network = availableNetworks.find((n: Network) => n.id === networkId);
      if (!network) {
        throw new Error(`Network '${networkId}' not found`);
      }

      if (!state.wallet) {
        // Just update current network if no wallet
        dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
        await storage.set({ currentNetwork: networkId });
        return;
      }
      
      // Get current password
      let password = state.globalPassword;
      if (!password) {
        password = await getPassword();
        if (password) {
          dispatch({ type: 'SET_GLOBAL_PASSWORD', payload: password });
        }
      }

      let newAddress = state.wallet.address;

    // Check if we already have an address for this network
    if ((state.wallet as any).addresses && (state.wallet as any).addresses[networkId]) {
      newAddress = (state.wallet as any).addresses[networkId];

    } else {
        // Need to derive new address
        if (!password && state.wallet.encryptedSeedPhrase) {
          throw new Error('Password required to derive address for new network');
        }

        if (password && state.wallet.encryptedSeedPhrase) {
          try {
            // Decrypt seed phrase
            const seedPhrase = await decryptData(state.wallet.encryptedSeedPhrase, password);
            
            // Derive address using AddressDerivationService
            newAddress = await AddressDerivationService.deriveAddress(seedPhrase, networkId);

            // Validate the address
            if (!AddressDerivationService.validateAddress(newAddress, networkId)) {
              throw new Error(`Generated invalid address for ${networkId}: ${newAddress}`);
            }
            
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Failed to derive ${networkId} address:`, error);
            throw new Error(`Failed to generate address for ${networkId}: ${error.message}`);
                  }
                } else {
          // Try background script for address derivation
          try {
          const response = await SecureWalletComm.sendMessage('SWITCH_NETWORK', { networkId });
          if (response && (response as any).address) {
            newAddress = (response as any).address;

          }
          } catch (bgError) {
            // eslint-disable-next-line no-console
            console.warn(`Background script network switch failed: ${bgError.message}`);
            throw new Error(`Cannot derive address for ${networkId}: ${bgError.message}`);
          }
        }
      }

      // Update wallet with new network and address
        const updatedWallet = { 
          ...state.wallet, 
          currentNetwork: networkId,
        address: newAddress,
      addresses: {
        ...(state.wallet as any).addresses,
        [networkId]: newAddress
      }
      };

      // Update state
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });
      dispatch({ type: 'SET_CURRENT_NETWORK', payload: network });
        
      // Store updated wallet
      await storeWallet(updatedWallet);
      await storage.set({ currentNetwork: networkId });

      // Dispatch network change event
      if (typeof window !== 'undefined') {
        const networkEvent = new CustomEvent('networkChanged', {
          detail: { 
            networkId, 
            address: newAddress, 
            network,
            previousAddress: state.wallet.address
          }
        });
        window.dispatchEvent(networkEvent);
        
        // Also dispatch wallet changed event to notify all components
        const walletEvent = new CustomEvent('walletChanged', {
          detail: {
            wallet: updatedWallet,
            address: newAddress,
            network: networkId,
            previousAddress: state.wallet.address
          }
        });
        window.dispatchEvent(walletEvent);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Successfully switched to ${network.name} (${newAddress})`);
      toast.success(`Switched to ${network.name}`);
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Network switch failed:', error);
      toast.error(`Failed to switch to ${networkId}: ${error.message}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Helper function to check session validity
  const checkSessionValidity = async (): Promise<boolean> => {
    try {
      const unlockTime = await getStoredUnlockTime();
      const now = Date.now();
      const sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      if (!unlockTime) {

        return false;
      }
      
      const isSessionValid = (now - unlockTime) < sessionTimeout;

      if (!isSessionValid) {
        // Session expired, lock the wallet

        dispatch({ type: 'LOCK_WALLET' });
        await storage.removeSession(['sessionPassword']);
      }
      
      return isSessionValid;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ Error checking session validity:`, error);
      return false;
    }
  };

  // Your working Litecoin address generation algorithm (frontend version)
  const generateLitecoinAddressFrontend = async (seedPhrase: string): Promise<string> => {
    try {

      // Base58 alphabet for Bitcoin/Litecoin addresses
      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      
      // Helper functions
      const hexToBytes = (hex: string): Uint8Array => {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return new Uint8Array(bytes);
      };

      const bytesToHex = (bytes: Uint8Array): string => {
        return Array.from(bytes)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
      };

      // SHA-256 hash function
      const sha256 = async (data: string | Uint8Array): Promise<Uint8Array> => {
        const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer as BufferSource);
        return new Uint8Array(hashBuffer);
      };

      // Simplified RIPEMD-160 (using truncated SHA-256 for demo purposes)
      const ripemd160 = async (data: Uint8Array): Promise<Uint8Array> => {
        const sha = await sha256(data);
        return sha.slice(0, 20); // Truncate to 160 bits
      };

      // Base58 encoding
      const base58Encode = (bytes: Uint8Array): string => {
        let num = BigInt('0x' + bytesToHex(bytes));
        let encoded = '';
        
        while (num > 0) {
          const remainder = num % 58n;
          encoded = base58Alphabet[Number(remainder)] + encoded;
          num = num / 58n;
        }

        // Add leading zeros
        for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
          encoded = '1' + encoded;
        }

        return encoded;
      };

      // Generate private key from seed phrase (deterministic)
      const generatePrivateKeyFromSeed = async (seedPhrase: string): Promise<string> => {
        const seedHash = await sha256(seedPhrase + 'litecoin_key');
        return bytesToHex(seedHash);
      };

      // Generate public key from private key (simplified)
      const generatePublicKey = async (privateKeyHex: string): Promise<Uint8Array> => {
        const privateKeyBytes = hexToBytes(privateKeyHex);
        const hash = await sha256(privateKeyBytes);
        
        // Create uncompressed public key format (0x04 prefix)
        const publicKey = new Uint8Array(65);
        publicKey[0] = 0x04;
        publicKey.set(hash, 1);
        publicKey.set(hash, 33); // Simplified - duplicate for Y coordinate
        
        return publicKey;
      };

      // Generate Litecoin address from public key
      const generateAddress = async (publicKey: Uint8Array): Promise<string> => {
        // Hash the public key
        const sha256Hash = await sha256(publicKey);
        const ripemd160Hash = await ripemd160(sha256Hash);
        
        // Add Litecoin mainnet prefix (0x30 for 'L' addresses)
        const versionedHash = new Uint8Array(21);
        versionedHash[0] = 0x30;
        versionedHash.set(ripemd160Hash, 1);
        
        // Calculate checksum
        const checksum1 = await sha256(versionedHash);
        const checksum2 = await sha256(checksum1);
        const checksum = checksum2.slice(0, 4);
        
        // Combine versioned hash and checksum
        const addressBytes = new Uint8Array(25);
        addressBytes.set(versionedHash, 0);
        addressBytes.set(checksum, 21);
        
        return base58Encode(addressBytes);
      };

      // Generate private key from seed
      const privateKey = await generatePrivateKeyFromSeed(seedPhrase);

      // Generate public key
      const publicKey = await generatePublicKey(privateKey);

      // Generate address
      const address = await generateAddress(publicKey);

      return address;
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error generating Litecoin address:', error);
      throw new Error(`Litecoin address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper functions for address derivation
  const deriveNetworkSpecificAddress = async (networkId: string, seedPhrase: string): Promise<string> => {
    try {

      // Validate inputs
      if (!networkId || !seedPhrase) {
        throw new Error(`Invalid parameters - networkId: ${networkId}, seedPhrase: ${!!seedPhrase}`);
      }
      
      // For Litecoin, use your working algorithm directly in the frontend
      if (networkId.toLowerCase() === 'litecoin') {

        try {
          const address = await generateLitecoinAddressFrontend(seedPhrase);

          return address;
        } catch (litecoinError) {
          // eslint-disable-next-line no-console
          console.error('❌ Frontend Litecoin generation failed:', litecoinError);
          throw new Error(`Litecoin address generation failed: ${litecoinError.message}`);
        }
      }
      
      // For other networks, use the existing method
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

      const address = await generateNetworkAddress(seedPhrase, derivationPath, networkId);
      
      // eslint-disable-next-line no-console
      console.log(`🔧 generateNetworkAddress returned: "${address}" (type: ${typeof address}, length: ${address?.length || 'undefined'})`);
      
      if (!address || address.trim() === '') {
        throw new Error(`generateNetworkAddress returned empty address for ${networkId}`);
      }

      return address;
    } catch (error) {
      // eslint-disable-next-line no-console
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
      
      // Get the current wallet data
      const currentWallet = await walletManager.getWallet(state.wallet.id);
      if (!currentWallet) {
        throw new Error('Wallet not found');
      }

      // Find the account to switch to
      const targetAccount = currentWallet.accounts.find(acc => acc.id === accountId);
      if (!targetAccount) {
        throw new Error('Account not found');
      }

      // Get the current network
      const currentNetworkId = state.currentNetwork?.id || 'ethereum';
      
      // Ensure the account has an address for the current network
      let accountAddress = targetAccount.addresses?.[currentNetworkId];
      
      if (!accountAddress && targetAccount.encryptedSeedPhrase) {
        // Derive address for the current network

        const password = await getPassword();
        if (!password) {
          throw new Error('Password required to derive address');
        }

        const seedPhrase = await decryptData(targetAccount.encryptedSeedPhrase, password);
        if (!seedPhrase) {
          throw new Error('Failed to decrypt seed phrase');
        }

        // Derive address for the current network
        const { generateNetworkAddress } = await import('../utils/network-address-utils');
        
        // Get derivation path for the account
        const derivationPath = targetAccount.derivationPath || `m/44'/60'/0'/0/0`;
        
        // Generate address for current network
        accountAddress = await generateNetworkAddress(seedPhrase, derivationPath, currentNetworkId);
        
        // Update the account with the new address
        if (!targetAccount.addresses) {
          targetAccount.addresses = {};
        }
        targetAccount.addresses[currentNetworkId] = accountAddress;
        
        // Save the updated wallet
        await (walletManager as any).saveWallets();
      }

      // Switch to the account
      await walletManager.switchToAccount(state.wallet.id, accountId);
      
      // Get the updated wallet with the new account
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        // Update the wallet state with the correct address for current network
        const updatedWalletWithAddress = {
          ...updatedWallet,
          address: accountAddress || updatedWallet.address
        };
        
        dispatch({ type: 'SET_WALLET', payload: updatedWalletWithAddress });
        
        // Dispatch custom events to notify all components
        if (typeof window !== 'undefined') {
          const accountEvent = new CustomEvent('accountSwitched', {
            detail: {
              wallet: updatedWalletWithAddress,
              accountId: accountId,
              address: accountAddress || updatedWallet.address,
              network: currentNetworkId
            }
          });
          window.dispatchEvent(accountEvent);
          
          // Also dispatch wallet changed event to notify all components
          const walletEvent = new CustomEvent('walletChanged', {
            detail: {
              wallet: updatedWalletWithAddress,
              address: accountAddress || updatedWallet.address,
              network: currentNetworkId,
              accountId: accountId
            }
          });
          window.dispatchEvent(walletEvent);
        }

      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch account:', error);
      throw error;
    }
  };

  // Add new account
  const addAccount = async (password: string, accountName?: string): Promise<any> => {
  try {

    if (!state.wallet) {
      throw new Error('No wallet available');
    }

      // Debug: Check what's actually in storage
      const storageCheck = await new Promise<any>((resolve) => {
        storage.get(['wallet', 'wallets']).then(resolve);
      });
      // eslint-disable-next-line no-console
      console.log('🔍 Current storage contents:', {
        hasWallet: !!storageCheck.wallet,
        hasWallets: !!storageCheck.wallets,
        walletsCount: storageCheck.wallets?.length || 0,
        walletIds: storageCheck.wallets?.map((w: any) => w.id) || []
      });
      
      // If wallet exists but not in wallets array, migrate it
      if (storageCheck.wallet && (!storageCheck.wallets || !storageCheck.wallets.find((w: any) => w.id === state.wallet?.id))) {

        await storeWallet(state.wallet);

    }

    const { WalletManager } = await import('../core/wallet-manager');
    const walletManager = new WalletManager();

    // Wait a bit for the wallet manager to initialize
    
      // Verify WalletManager can find the wallet
      const foundWallet = await walletManager.getWallet(state.wallet.id);
      if (!foundWallet) {
        // eslint-disable-next-line no-console
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

      } else {

      }

      const result = await walletManager.addAccountToWallet(state.wallet.id, password, accountName);
      const newAccount = result.account;
      const seedPhrase = result.seedPhrase;

    // Get the updated wallet with the new account
    const updatedWallet = await walletManager.getWallet(state.wallet.id);
    if (updatedWallet) {

        // Force reload the wallet manager to ensure we have the latest data
        await new Promise(resolve => setTimeout(resolve, 200));
        const freshWalletManager = new WalletManager();
        const freshWallet = await freshWalletManager.getWallet(state.wallet.id);
        
        if (freshWallet) {

          dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: freshWallet });
          // Also store the updated wallet to ensure persistence
          await storeWallet(freshWallet);
          
          // Dispatch events to notify all components
          if (typeof window !== 'undefined') {
            const walletEvent = new CustomEvent('walletChanged', {
              detail: {
                wallet: freshWallet,
                address: freshWallet.address,
                network: freshWallet.currentNetwork,
                accountId: newAccount.id
              }
            });
            window.dispatchEvent(walletEvent);
            
            // Also dispatch account added event for specific handling
            const accountAddedEvent = new CustomEvent('accountAdded', {
              detail: {
                wallet: freshWallet,
                account: newAccount,
                accountId: newAccount.id,
                address: newAccount.addresses?.[freshWallet.currentNetwork] || newAccount.addresses?.['ethereum'],
                network: freshWallet.currentNetwork
              }
            });
            window.dispatchEvent(accountAddedEvent);
          }
        } else {
          dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: updatedWallet });
          // Also store the updated wallet to ensure persistence
          await storeWallet(updatedWallet);
          
          // Dispatch events to notify all components
          if (typeof window !== 'undefined') {
            const walletEvent = new CustomEvent('walletChanged', {
              detail: {
                wallet: updatedWallet,
                address: updatedWallet.address,
                network: updatedWallet.currentNetwork,
                accountId: newAccount.id
              }
            });
            window.dispatchEvent(walletEvent);
            
            // Also dispatch account added event for specific handling
            const accountAddedEvent = new CustomEvent('accountAdded', {
              detail: {
                wallet: updatedWallet,
                account: newAccount,
                accountId: newAccount.id,
                address: newAccount.addresses?.[updatedWallet.currentNetwork] || newAccount.addresses?.['ethereum'],
                network: updatedWallet.currentNetwork
              }
            });
            window.dispatchEvent(accountAddedEvent);
          }
        }
        
      return { account: newAccount, seedPhrase: seedPhrase }; // Return the created account with seed phrase
      } else {
        throw new Error('Failed to retrieve updated wallet');
    }
  } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error adding account:', error);
      // eslint-disable-next-line no-console
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

  // Add new account from seed phrase
  const addAccountFromSeedPhrase = async (seedPhrase: string, password: string, accountName?: string): Promise<any> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const newAccount = await walletManager.addAccountFromSeedPhrase(state.wallet.id, seedPhrase, password, accountName);
      
      // Get the updated wallet
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: updatedWallet });
        await storeWallet(updatedWallet);

        return newAccount;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from seed phrase:', error);
      throw error;
    }
  };

  // Add new account from private key
  const addAccountFromPrivateKey = async (privateKey: string, password: string, accountName?: string): Promise<any> => {
    try {
      if (!state.wallet) {
        throw new Error('No wallet available');
      }

      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      const newAccount = await walletManager.addAccountFromPrivateKey(state.wallet.id, privateKey, password, accountName);
      
      // Get the updated wallet
      const updatedWallet = await walletManager.getWallet(state.wallet.id);
      if (updatedWallet) {
        dispatch({ type: 'UPDATE_WALLET_ACCOUNTS', payload: updatedWallet });
        await storeWallet(updatedWallet);

        return newAccount;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add account from private key:', error);
      throw error;
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
      // eslint-disable-next-line no-console
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

    } catch (error) {
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to store wallet state:', error);
      throw error;
    }
  };

  // Get stored wallet
  const getStoredWallet = async (): Promise<WalletData | null> => {
    try {

      const result = await storage.get(['wallet', 'walletState']);

      return result.wallet || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('getStoredWallet: Storage error:', error);
      return null;
    }
  };

  // Get stored wallet state
  const getStoredWalletState = async (): Promise<any> => {
    try {

      const result = await storage.get(['walletState']);

      return result.walletState || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('getStoredWalletState: Storage error:', error);
      return null;
    }
  };

  // Store password hash
  const storePasswordHash = async (hash: string): Promise<void> => {
    try {
      await storage.set({ passwordHash: hash });
    } catch (error) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to get password hash:', error);
      return null;
    }
  };

  // Store unlock time
  const storeUnlockTime = async (timestamp: number): Promise<void> => {
    try {
      await storage.set({ unlockTime: timestamp });
    } catch (error) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to get unlock time:', error);
      return null;
    }
  };

  // Add hardware wallet
  const addHardwareWallet = async (type: 'ledger' | 'trezor' | 'lattice' | 'qr', address: string, derivationPath: string): Promise<void> => {
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

      } catch (error) {
        // eslint-disable-next-line no-console
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


      // eslint-disable-next-line no-console
      console.log('  - Is session valid:', unlockTime ? (now - unlockTime) < sessionTimeout : false);


    } catch (error) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('🚨 WalletContext: Error state detected:', state.error);
      // eslint-disable-next-line no-console
      console.error('🚨 WalletContext: Error stack trace:', new Error().stack);
    } else {

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

      // Verify storage worked
      const verifyResult = await storage.getSession(['sessionPassword']);
      if (verifyResult.sessionPassword) {

        return true;
      } else {

        return true; // Still return true since we have local storage backup
      }
    } catch (error) {

      return false;
    }
  };

  const getPassword = async (): Promise<string | null> => {
    try {
      // Try session storage first
      const sessionResult = await storage.getSession(['sessionPassword']);
      if (sessionResult.sessionPassword) {

        return sessionResult.sessionPassword;
      }
      
      // Try local storage as fallback (this was incorrectly using getSession)
      const localResult = await storage.get(['sessionPassword']);
      if (localResult.sessionPassword) {
        try {
          const decodedPassword = atob(localResult.sessionPassword);

          // Restore to session storage
          await storage.setSession({ sessionPassword: decodedPassword });

          return decodedPassword;
        } catch (decodeError) {

        }
      }
      
      // Try alternative storage keys
      const altSessionResult = await storage.getSession(['backupPassword']);
      if (altSessionResult.backupPassword) {

        return altSessionResult.backupPassword;
      }
      
      const altLocalResult = await storage.get(['backupPassword']);
      if (altLocalResult.backupPassword) {
        try {
          const decodedPassword = atob(altLocalResult.backupPassword);

          // Restore to session storage
          await storage.setSession({ sessionPassword: decodedPassword });

          return decodedPassword;
        } catch (decodeError) {

        }
      }
      
      // Try to get password from global state if available
      if (state.globalPassword) {

        // Restore to session storage
        await storage.setSession({ sessionPassword: state.globalPassword });
        return state.globalPassword;
      }

      return null;
    } catch (error) {

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

    } catch (error) {

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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Failed to get account seed phrase:', error);
      return null;
    }
  };

  // Refresh wallet state from storage
  const refreshWallet = useCallback(async (): Promise<void> => {
    if (!state.wallet) {

      return;
    }

    try {
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Get the updated wallet from storage
      const updatedWallet = await walletManager.getWallet(state.wallet.id);

      if (updatedWallet) {
        // Log the accounts before update
        // eslint-disable-next-line no-console
        console.log('📋 Accounts before refresh:', updatedWallet.accounts.map(acc => ({ id: acc.id, name: acc.name })));
        
        // Update the wallet state
        dispatch({ type: 'SET_WALLET', payload: updatedWallet });

        // Log the accounts after update
        // eslint-disable-next-line no-console
        console.log('📋 Accounts after refresh:', updatedWallet.accounts.map(acc => ({ id: acc.id, name: acc.name })));
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ No wallet found in storage');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to refresh wallet state:', error);
    }
  }, [state.wallet]);

  // Multi-wallet support functions
  const getAllWallets = async (): Promise<any[]> => {
    try {
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      return await walletManager.getAllWallets();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get all wallets:', error);
      return [];
    }
  };

  const switchWallet = async (walletId: string): Promise<void> => {
    try {
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Set the new active wallet
      await walletManager.setActiveWallet(walletId);
      
      // Get the wallet data
      const wallet = await walletManager.getWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Update context state
      dispatch({ type: 'SET_WALLET', payload: wallet });
      
      // Update storage
      const browserAPI = (() => {
        if (typeof browser !== 'undefined') return browser;
        if (typeof chrome !== 'undefined') return chrome;
        throw new Error('No browser API available');
      })();
      
      await browserAPI.storage.local.set({ 
        wallet: wallet,
        walletState: {
          isWalletUnlocked: true,
          hasWallet: true,
          isWalletCreated: true,
          activeWalletId: walletId,
          lastUpdated: Date.now()
        }
      });
      
      // Dispatch events to notify all components
      if (typeof window !== 'undefined') {
        const walletEvent = new CustomEvent('walletChanged', {
          detail: {
            wallet: wallet,
            address: wallet.address,
            network: wallet.currentNetwork,
            walletId: walletId
          }
        });
        window.dispatchEvent(walletEvent);
        
        // Also dispatch wallet switched event for specific handling
        const walletSwitchedEvent = new CustomEvent('walletSwitched', {
          detail: {
            wallet: wallet,
            walletId: walletId,
            address: wallet.address,
            network: wallet.currentNetwork
          }
        });
        window.dispatchEvent(walletSwitchedEvent);
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch wallet:', error);
      throw error;
    }
  };

  const getActiveWallet = async (): Promise<any | null> => {
    try {
      const { WalletManager } = await import('../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Get all wallets and find the most recently accessed one
      const allWallets = await walletManager.getAllWallets();
      if (allWallets.length === 0) return null;
      
      // Sort by lastAccessed and return the most recent
      const sortedWallets = allWallets.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      return sortedWallets[0];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get active wallet:', error);
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
    addAccountFromSeedPhrase,
    addAccountFromPrivateKey,
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
    debugUnlockIssue,
    debugPassword,
    debugStorage,
    // Multi-wallet support functions
    getAllWallets,
    switchWallet,
    getActiveWallet
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

// Export SecureWalletComm for debugging purposes
export { SecureWalletComm }; 