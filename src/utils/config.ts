// Configuration utility for environment variables and settings
export interface Config {
  INFURA_PROJECT_ID: string;
  COINGECKO_API_KEY?: string;
  ENS_RPC_URL?: string;
  ETHERSCAN_API_KEY?: string;
  COINMARKETCAP_API_KEY?: string;
  MORALIS_API_KEY?: string;
  DEXSCREENER_API_KEY?: string;
}

// Get configuration from environment variables
export function getConfig(): Config {
  // Try to get from environment variables first
  const getEnvVar = (key: string): string => {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.CONFIG) {
        return window.CONFIG[key] || '';
      }
      
      // Check if we're in Node.js environment
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
      }
      
      return '';
    } catch {
      return '';
    }
  };

  return {
    INFURA_PROJECT_ID: getEnvVar('INFURA_PROJECT_ID'),
    COINGECKO_API_KEY: getEnvVar('COINGECKO_API_KEY'),
    ENS_RPC_URL: getEnvVar('ENS_RPC_URL'),
    ETHERSCAN_API_KEY: getEnvVar('ETHERSCAN_API_KEY'),
    COINMARKETCAP_API_KEY: getEnvVar('COINMARKETCAP_API_KEY'),
    MORALIS_API_KEY: getEnvVar('MORALIS_API_KEY'),
    DEXSCREENER_API_KEY: getEnvVar('DEXSCREENER_API_KEY')
  };
}

// Get Infura project ID specifically
export function getInfuraProjectId(): string {
  return getConfig().INFURA_PROJECT_ID;
}

// Get Ethereum RPC URL
export function getEthereumRpcUrl(): string {
  const config = getConfig();
  return `https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID}`;
}

// Validate configuration
export function validateConfig(): boolean {
  const config = getConfig();
  return !!config.INFURA_PROJECT_ID;
}




