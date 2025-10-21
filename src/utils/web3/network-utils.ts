import { getSafeConfig } from '../../utils/config-utils';
import { NetworkConfig } from '../../types/network-types';

let _networks: Record<string, NetworkConfig> | null = null;

export const getNetworks = (): Record<string, NetworkConfig> => {
  if (!_networks) {
    const config = getSafeConfig(); // Get the latest config
    const ethereumRpcUrl = `https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID}`;

    // Merge static networks with dynamic ones from config
    const staticNetworks: Record<string, NetworkConfig> = {
      ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        chainId: '1',
        rpcUrl: ethereumRpcUrl,
        explorerUrl: 'https://etherscan.io',
        apiKey: config?.ETHERSCAN_API_KEY || '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      bsc: {
        name: 'Binance Smart Chain',
        symbol: 'BNB',
        chainId: '56',
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        explorerUrl: 'https://bscscan.com',
        apiKey: config?.ETHERSCAN_API_KEY || '',
        nativeCurrency: {
          name: 'BNB',
          symbol: 'BNB',
          decimals: 18
        }
      },
      polygon: {
        name: 'Polygon',
        symbol: 'MATIC',
        chainId: '137',
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        apiKey: config?.ETHERSCAN_API_KEY || '',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18
        }
      },
      avalanche: {
        name: 'Avalanche',
        symbol: 'AVAX',
        chainId: '43114',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        explorerUrl: 'https://snowtrace.io',
        apiKey: '',
        nativeCurrency: {
          name: 'Avalanche',
          symbol: 'AVAX',
          decimals: 18
        }
      },
      arbitrum: {
        name: 'Arbitrum One',
        symbol: 'ETH',
        chainId: '42161',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      optimism: {
        name: 'Optimism',
        symbol: 'ETH',
        chainId: '10',
        rpcUrl: 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      base: {
        name: 'Base',
        symbol: 'ETH',
        chainId: '8453',
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      fantom: {
        name: 'Fantom',
        symbol: 'FTM',
        chainId: '250',
        rpcUrl: 'https://rpc.ftm.tools',
        explorerUrl: 'https://ftmscan.com',
        apiKey: '',
        nativeCurrency: {
          name: 'Fantom',
          symbol: 'FTM',
          decimals: 18
        }
      },
      zksync: {
        name: 'zkSync Era',
        symbol: 'ETH',
        chainId: '324',
        rpcUrl: 'https://mainnet.era.zksync.io',
        explorerUrl: 'https://explorer.zksync.io',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      linea: {
        name: 'Linea',
        symbol: 'ETH',
        chainId: '59144',
        rpcUrl: 'https://rpc.linea.build',
        explorerUrl: 'https://lineascan.build',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      mantle: {
        name: 'Mantle',
        symbol: 'MNT',
        chainId: '5000',
        rpcUrl: 'https://rpc.mantle.xyz',
        explorerUrl: 'https://explorer.mantle.xyz',
        apiKey: '',
        nativeCurrency: {
          name: 'Mantle',
          symbol: 'MNT',
          decimals: 18
        }
      },
      scroll: {
        name: 'Scroll',
        symbol: 'ETH',
        chainId: '534352',
        rpcUrl: 'https://rpc.scroll.io',
        explorerUrl: 'https://scrollscan.com',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      'polygon-zkevm': {
        name: 'Polygon zkEVM',
        symbol: 'ETH',
        chainId: '1101',
        rpcUrl: 'https://zkevm-rpc.com',
        explorerUrl: 'https://zkevm.polygonscan.com',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      'arbitrum-nova': {
        name: 'Arbitrum Nova',
        symbol: 'ETH',
        chainId: '42170',
        rpcUrl: 'https://nova.arbitrum.io/rpc',
        explorerUrl: 'https://nova.arbiscan.io',
        apiKey: '',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    };

    _networks = { ...staticNetworks, ...config.NETWORKS };
  }
  return _networks;
};

export const NETWORKS = new Proxy({} as Record<string, NetworkConfig>, {
  get(target, prop) {
    return getNetworks()[prop as string];
  }
});

export const getChainTypeForNetwork = (network: string): 'EVM' | 'OTHER' => {
  const evmNetworks = [
    'ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base', 'fantom', 'zksync', 'linea', 'mantle', 'scroll', 'polygon-zkevm', 'arbitrum-nova',
  ];
  if (evmNetworks.includes(network.toLowerCase())) {
    return 'EVM';
  }
  return 'OTHER';
};
