import { getConfig as getConfigFromInjector } from './config-injector';
import { NetworkConfig } from "../types/network-types";

const getConfig = () => {
  try {
    const config = getConfigFromInjector();
    if (config) {

      return config;
    }
  } catch (error) {
    // Intentionally empty, will return default config if an error occurs
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
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
  };

  return defaultConfig;
};

let config: any = null;
const INFURA_PROJECT_ID = 'f9231922e4914834b76b67b67367f3f2';
const ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

const getSafeConfig = () => {
  let INFURA_PROJECT_ID_val;
  let ethereumRpcUrl_val;
  if (!config) {
    try {
      config = getConfig();

      // Use your specific Infura key directly
      INFURA_PROJECT_ID_val = config.INFURA_PROJECT_ID || 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl_val = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID_val}`;
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
        IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
      };
      INFURA_PROJECT_ID_val = 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl_val = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID_val}`;
    }
  }
  return config;
};

export { getConfig, getSafeConfig };
