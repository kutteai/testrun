// Config injection utility for PayCio Wallet
// This ensures CONFIG is available in all contexts (popup, background, content, injected)

// Declare the global PAYCIO_CONFIG that webpack injects
declare const PAYCIO_CONFIG: any;

// Initialize CONFIG on window object
export function initializeConfig() {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // If PAYCIO_CONFIG is available from webpack, use it
      if (typeof PAYCIO_CONFIG !== 'undefined') {
        (window as any).CONFIG = PAYCIO_CONFIG;

        return PAYCIO_CONFIG;
      }
      
      // If CONFIG is already available, use it
      if ((window as any).CONFIG) {

        return (window as any).CONFIG;
      }
    }
    
    // Fallback: create default config
    const defaultConfig = {
      INFURA_PROJECT_ID: 'f9231922e4914834b76b67b67367f3f2',
      ALCHEMY_API_KEY: '',
      ETHERSCAN_API_KEY: '',
      BSCSCAN_API_KEY: '',
      POLYGONSCAN_API_KEY: '',
      AVALANCHESCAN_API_KEY: '',
      ARBITRUMSCAN_API_KEY: '',
      OPTIMISMSCAN_API_KEY: '',
      COINGECKO_API_KEY: '',
      COINMARKETCAP_API_KEY: '',
      MORALIS_API_KEY: '',
      DEXSCREENER_API_KEY: '',
      BRIDGE_SENDER_PRIVATE_KEY: '',
      WALLETCONNECT_PROJECT_ID: '',
      REACT_APP_BACKEND_URL: '',
      POLYGON_RPC_URL: '',
      POLYGON_USDC_ADDRESS: '',
      BSC_RPC_URL: '',
      BSC_USDT_ADDRESS: '',
      ETHEREUM_RPC_URL: '',
      L1_ETH_ADDRESS: '',
      OPENSEA_API_KEY: '',
      ALCHEMY_NFT_API_KEY: '',
      DEFI_PULSE_API_KEY: '',
      ENS_RPC_URL: 'https://eth.llamarpc.com',
      IPFS_GATEWAY: 'https://ipfs.io/ipfs/',
      CUSTOM_RPC_ENDPOINTS: {},
      SECURITY: {
        AUTO_LOCK_TIMEOUT: 30,
        MAX_FAILED_ATTEMPTS: 5,
        SESSION_TIMEOUT: 30,
        REQUIRE_PASSWORD: true,
        ENABLE_BIOMETRIC: false,
      },
      FEATURES: {
        ENABLE_NFT_SUPPORT: true,
        ENABLE_DEFI_INTEGRATION: true,
        ENABLE_PORTFOLIO_TRACKING: true,
        ENABLE_HARDWARE_WALLET: true,
        ENABLE_WALLET_CONNECT: true,
      },
      NETWORKS: {
        ethereum: {
          rpcUrl: 'https://mainnet.infura.io/v3/f9231922e4914834b76b67b67367f3f2',
          chainId: '0x1',
          explorerUrl: 'https://etherscan.io',
          symbol: 'ETH',
          decimals: 18,
          isEnabled: true
        },
        bsc: {
          rpcUrl: 'https://bsc-dataseed.binance.org',
          chainId: '0x38',
          explorerUrl: 'https://bscscan.com',
          symbol: 'BNB',
          decimals: 18,
          isEnabled: true
        },
        polygon: {
          rpcUrl: 'https://polygon-rpc.com',
          chainId: '0x89',
          explorerUrl: 'https://polygonscan.com',
          symbol: 'MATIC',
          decimals: 18,
          isEnabled: true
        },
        avalanche: {
          rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
          chainId: '0xa86a',
          explorerUrl: 'https://snowtrace.io',
          symbol: 'AVAX',
          decimals: 18,
          isEnabled: true
        },
        arbitrum: {
          rpcUrl: 'https://arb1.arbitrum.io/rpc',
          chainId: '0xa4b1',
          explorerUrl: 'https://arbiscan.io',
          symbol: 'ETH',
          decimals: 18,
          isEnabled: true
        },
        optimism: {
          rpcUrl: 'https://mainnet.optimism.io',
          chainId: '0xa',
          explorerUrl: 'https://optimistic.etherscan.io',
          symbol: 'ETH',
          decimals: 18,
          isEnabled: true
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      (window as any).CONFIG = defaultConfig;
    }

    return defaultConfig;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ PayCio: Failed to initialize CONFIG:', error);
    return null;
  }
}

// Get CONFIG with fallback
export function getConfig() {
  try {
    // Try to get from window first
    if (typeof window !== 'undefined' && (window as any).CONFIG) {
      return (window as any).CONFIG;
    }
    
    // Try to get from global PAYCIO_CONFIG
    if (typeof PAYCIO_CONFIG !== 'undefined') {
      return PAYCIO_CONFIG;
    }
    
    // Initialize and return default config
    return initializeConfig();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ PayCio: Failed to get CONFIG:', error);
    return initializeConfig();
  }
}

// Initialize config immediately when this module is loaded
if (typeof window !== 'undefined') {
  initializeConfig();
}


