import type { Network } from '../types';

/**
 * Default network configurations for supported chains
 */

export const DEFAULT_NETWORKS: Network[] = [
  // Ethereum Mainnet
  {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'EVM',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
  },
  // Polygon
  {
    id: 'polygon',
    name: 'Polygon',
    type: 'EVM',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    symbol: 'MATIC',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
  },
  // BSC
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    type: 'EVM',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    symbol: 'BNB',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg',
  },
  // Arbitrum
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    type: 'EVM',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    symbol: 'ETH',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
  },
  // Optimism
  {
    id: 'optimism',
    name: 'Optimism',
    type: 'EVM',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
  },
  // Avalanche
  {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    type: 'EVM',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    symbol: 'AVAX',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
  },
  // Fantom
  {
    id: 'fantom',
    name: 'Fantom',
    type: 'EVM',
    chainId: 250,
    rpcUrl: 'https://rpc.ftm.tools',
    explorerUrl: 'https://ftmscan.com',
    symbol: 'FTM',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_fantom.jpg',
  },
  // Base
  {
    id: 'base',
    name: 'Base',
    type: 'EVM',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    symbol: 'ETH',
    decimals: 18,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
  },
  // Bitcoin
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    type: 'Bitcoin',
    rpcUrl: 'https://blockstream.info/api',
    explorerUrl: 'https://blockstream.info',
    symbol: 'BTC',
    decimals: 8,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_bitcoin.jpg',
  },
  // Solana
  {
    id: 'solana',
    name: 'Solana',
    type: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    symbol: 'SOL',
    decimals: 9,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_solana.jpg',
  },
  // TRON
  {
    id: 'tron',
    name: 'TRON',
    type: 'TRON',
    rpcUrl: 'https://api.trongrid.io',
    explorerUrl: 'https://tronscan.org',
    symbol: 'TRX',
    decimals: 6,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_tron.jpg',
  },
  // Litecoin
  {
    id: 'litecoin',
    name: 'Litecoin',
    type: 'Litecoin',
    rpcUrl: 'https://litecoinspace.org/api',
    explorerUrl: 'https://litecoinspace.org',
    symbol: 'LTC',
    decimals: 8,
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_litecoin.jpg',
  },
];

// Testnet networks
export const TESTNET_NETWORKS: Network[] = [
  {
    id: 'sepolia',
    name: 'Sepolia',
    type: 'EVM',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: true,
  },
  {
    id: 'goerli',
    name: 'Goerli',
    type: 'EVM',
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://goerli.etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: true,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    type: 'EVM',
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    symbol: 'MATIC',
    decimals: 18,
    isTestnet: true,
  },
  {
    id: 'bsc-testnet',
    name: 'BSC Testnet',
    type: 'EVM',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    symbol: 'BNB',
    decimals: 18,
    isTestnet: true,
  },
];

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number): Network | undefined {
  return [...DEFAULT_NETWORKS, ...TESTNET_NETWORKS].find(
    network => network.chainId === chainId
  );
}

/**
 * Get network by ID
 */
export function getNetworkById(id: string): Network | undefined {
  return [...DEFAULT_NETWORKS, ...TESTNET_NETWORKS].find(
    network => network.id === id
  );
}

/**
 * Check if network is EVM compatible
 */
export function isEVMNetwork(network: Network): boolean {
  return network.type === 'EVM';
}

/**
 * Standard HD paths for different networks
 */
export const HD_PATHS = {
  ethereum: "m/44'/60'/0'/0",
  bitcoin: "m/44'/0'/0'/0",
  litecoin: "m/44'/2'/0'/0",
  solana: "m/44'/501'/0'/0",
  tron: "m/44'/195'/0'/0",
} as const;

/**
 * Get HD path for network
 */
export function getHDPath(network: Network, index: number = 0): string {
  const basePath = network.type === 'EVM' 
    ? HD_PATHS.ethereum 
    : HD_PATHS[network.id as keyof typeof HD_PATHS] || HD_PATHS.ethereum;
  
  return `${basePath}/${index}`;
}