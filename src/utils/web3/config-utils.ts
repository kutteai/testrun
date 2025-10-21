import { getConfig as getConfigFromInjector } from '../config-injector';

export interface NetworkConfig {
  name: string;
  symbol: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  apiKey: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

declare global {
  interface Window {
    CONFIG?: {
      INFURA_PROJECT_ID: string;
      ALCHEMY_API_KEY: string;
      ETHERSCAN_API_KEY: string;
      ALCHEMY_NFT_API_KEY: string;
      ENS_RPC_URL: string;
      COINGECKO_API_KEY: string;
      OPENSEA_API_KEY: string;
      COINMARKETCAP_API_KEY: string;
      DEFI_PULSE_API_KEY: string;
      IPFS_GATEWAY: string;
      SECURITY: {
        AUTO_LOCK_TIMEOUT: number;
        MAX_FAILED_ATTEMPTS: number;
        SESSION_TIMEOUT: number;
        REQUIRE_PASSWORD: boolean;
        ENABLE_BIOMETRIC: boolean;
      };
      FEATURES: {
        ENABLE_NFT_SUPPORT: boolean;
        ENABLE_DEFI_INTEGRATION: boolean;
        ENABLE_PORTFOLIO_TRACKING: boolean;
        ENABLE_HARDWARE_WALLET: boolean;
        ENABLE_WALLET_CONNECT: boolean;
      };
      NETWORKS: Record<string, any>;
    };
  }
}

// Get configuration from environment
export const getConfig = () => {
  try {
    const config = getConfigFromInjector();
    if (config) {
      return config;
    }
  } catch (error) {
  }

  const defaultConfig = {
    INFURA_PROJECT_ID: 'f9231922e4914834b76b67b67367f3f2',
    ETHERSCAN_API_KEY: '',
    ALCHEMY_API_KEY: '',
    ALCHEMY_NFT_API_KEY: '',
    ENS_RPC_URL: 'https://eth.llamarpc.com',
    COINGECKO_API_KEY: '',
    OPENSEA_API_KEY: '',
    COINMARKETCAP_API_KEY: '',
    DEFI_PULSE_API_KEY: '',
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/',
  };
  return defaultConfig;
};

// Safe config loading - only load when needed
export let config: any = null;
export let INFURA_PROJECT_ID = 'f9231922e4914834b76b67b67367f3f2';
export let ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

export const getSafeConfig = () => {
  if (!config) {
    try {
      config = getConfig();

      // Use your specific Infura key directly
      INFURA_PROJECT_ID = config.INFURA_PROJECT_ID || 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
    } catch (error) {
      config = {
        INFURA_PROJECT_ID: 'f9231922e4914834b76b67b67367f3f2',
        ETHERSCAN_API_KEY: '',
        ALCHEMY_API_KEY: '',
        ALCHEMY_NFT_API_KEY: '',
        ENS_RPC_URL: 'https://eth.llamarpc.com',
        COINGECKO_API_KEY: '',
        OPENSEA_API_KEY: '',
        COINMARKETCAP_API_KEY: '',
        DEFI_PULSE_API_KEY: '',
        IPFS_GATEWAY: 'https://ipfs.io/ipfs/',
      };
      INFURA_PROJECT_ID = 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
    }
  }
  return config;
};
