const CONFIG = {
  // Required for Ethereum and EVM chains
  INFURA_PROJECT_ID: 'your_infura_project_id_here',
  ALCHEMY_API_KEY: 'your_alchemy_api_key_here',

  // Optional - for transaction history and block explorer data
  ETHERSCAN_API_KEY: 'your_etherscan_api_key_here',
  BSCSCAN_API_KEY: 'your_bscscan_api_key_here',
  POLYGONSCAN_API_KEY: 'your_polygonscan_api_key_here',
  AVALANCHESCAN_API_KEY: 'your_avalanchescan_api_key_here',
  ARBITRUMSCAN_API_KEY: 'your_arbitrumscan_api_key_here',
  OPTIMISMSCAN_API_KEY: 'your_optimismscan_api_key_here',

  // Optional - for price data and portfolio tracking
  COINGECKO_API_KEY: 'your_coingecko_api_key_here',
  COINMARKETCAP_API_KEY: 'your_coinmarketcap_api_key_here',

  // Optional - for NFT data
  OPENSEA_API_KEY: 'your_opensea_api_key_here',
  ALCHEMY_NFT_API_KEY: 'your_alchemy_nft_api_key_here',

  // Optional - for DeFi data
  DEFI_PULSE_API_KEY: 'your_defi_pulse_api_key_here',

  // Optional - for ENS resolution
  ENS_RPC_URL: 'https://mainnet.infura.io/v3/your_infura_project_id_here',

  // Optional - for IPFS
  IPFS_GATEWAY: 'https://ipfs.io/ipfs/',

  // Optional - for additional RPC endpoints
  CUSTOM_RPC_ENDPOINTS: {
    // Add your custom RPC endpoints here
    // 'custom_chain': 'https://your-custom-rpc-endpoint.com'
  },

  // Security settings
  SECURITY: {
    AUTO_LOCK_TIMEOUT: 15, // minutes
    MAX_FAILED_ATTEMPTS: 5,
    SESSION_TIMEOUT: 30, // minutes
    REQUIRE_PASSWORD: true,
    ENABLE_BIOMETRIC: false, // Set to true if you want biometric auth
  },

  // Feature flags
  FEATURES: {
    ENABLE_NFT_SUPPORT: true,
    ENABLE_DEFI_INTEGRATION: true,
    ENABLE_PORTFOLIO_TRACKING: true,
    ENABLE_HARDWARE_WALLET: true,
    ENABLE_WALLET_CONNECT: true,
  },

  // Network configurations
  NETWORKS: {
    ethereum: {
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
      chainId: '0x1',
      explorerUrl: 'https://etherscan.io',
      symbol: 'ETH',
      decimals: 18,
      isEnabled: true,
    },
    bsc: {
      rpcUrl: 'https://bsc-dataseed.binance.org',
      chainId: '0x38',
      explorerUrl: 'https://bscscan.com',
      symbol: 'BNB',
      decimals: 18,
      isEnabled: true,
    },
    polygon: {
      rpcUrl: 'https://polygon-rpc.com',
      chainId: '0x89',
      explorerUrl: 'https://polygonscan.com',
      symbol: 'MATIC',
      decimals: 18,
      isEnabled: true,
    },
    avalanche: {
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: '0xa86a',
      explorerUrl: 'https://snowtrace.io',
      symbol: 'AVAX',
      decimals: 18,
      isEnabled: true,
    },
    arbitrum: {
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: '0xa4b1',
      explorerUrl: 'https://arbiscan.io',
      symbol: 'ETH',
      decimals: 18,
      isEnabled: true,
    },
    optimism: {
      rpcUrl: 'https://mainnet.optimism.io',
      chainId: '0xa',
      explorerUrl: 'https://optimistic.etherscan.io',
      symbol: 'ETH',
      decimals: 18,
      isEnabled: true,
    },
  },
};

// Validate required configuration
function validateConfig() {
  const required = ['INFURA_PROJECT_ID'];
  const missing = required.filter((key) => !CONFIG[key] || CONFIG[key].includes('your_'));

  if (missing.length > 0) {
    console.warn('Missing required configuration:', missing);
    console.warn('Please update config.js with your API keys');
  }
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, validateConfig };
} else {
  window.CONFIG = CONFIG;
  window.validateConfig = validateConfig;
}
