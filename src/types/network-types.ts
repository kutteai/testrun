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

