import { ethers } from 'ethers';

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

// Extend Window interface to include CONFIG
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

import { getConfig as getConfigFromInjector } from './config-injector';

// Get configuration from environment
const getConfig = () => {
  try {
    const config = getConfigFromInjector();
    if (config) {
      console.log('PayCio: Using injected CONFIG:', config);
      return config;
    }
  } catch (error) {
    console.log('PayCio: Config injection failed, using fallback:', error.message);
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
  console.log('PayCio: Using default config:', defaultConfig);
  return defaultConfig;
};

// Network configurations with dynamic RPC URLs
let config: any = null;
let INFURA_PROJECT_ID = 'f9231922e4914834b76b67b67367f3f2';
let ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

// Safe config loading - only load when needed
const getSafeConfig = () => {
  if (!config) {
    try {
      config = getConfig();
      console.log('PayCio: Config loaded:', config);
      console.log('PayCio: Infura Project ID:', config.INFURA_PROJECT_ID);
      
      // Use your specific Infura key directly
      INFURA_PROJECT_ID = config.INFURA_PROJECT_ID || 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
    } catch (error) {
      console.log('PayCio: Config loading failed, using defaults:', error.message);
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
      INFURA_PROJECT_ID = 'f9231922e4914834b76b67b67367f3f2';
      ethereumRpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
    }
  }
  return config;
};

console.log('PayCio: Using Infura RPC URL:', ethereumRpcUrl);

// Lazy-loaded networks configuration
let _networks: Record<string, NetworkConfig> | null = null;

export const getNetworks = (): Record<string, NetworkConfig> => {
  if (!_networks) {
    _networks = {
      ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        chainId: '1',
        rpcUrl: ethereumRpcUrl,
        explorerUrl: 'https://etherscan.io',
        apiKey: getSafeConfig()?.ETHERSCAN_API_KEY || '',
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
        apiKey: getSafeConfig()?.ETHERSCAN_API_KEY || '',
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
    apiKey: getSafeConfig()?.ETHERSCAN_API_KEY || '',
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
  }
  return _networks;
};

// Backward compatibility - export NETWORKS as a getter
export const NETWORKS = new Proxy({} as Record<string, NetworkConfig>, {
  get(target, prop) {
    return getNetworks()[prop as string];
  }
});

// Get balance from RPC (real implementation)
export async function getBalance(address: string, network: string): Promise<string> {
  try {
    console.log(`🔍 DEBUG: getBalance called with address="${address}" (length: ${address?.length}), network="${network}"`);
    console.log(`🔍 DEBUG: address starts with 0x: ${address?.startsWith('0x')}`);
    
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    // Ensure address has 0x prefix for Ethereum-compatible networks
    let formattedAddress = address;
    if (network === 'ethereum' || network === 'bsc' || network === 'polygon' || network === 'arbitrum' || network === 'optimism' || network === 'avalanche') {
      if (!address.startsWith('0x')) {
        formattedAddress = '0x' + address;
        console.log(`🔧 DEBUG: Added 0x prefix to address: ${formattedAddress}`);
      }
      
      // Check if the address has the correct length (42 characters for 0x + 40 hex chars)
      if (formattedAddress.length !== 42) {
        console.error(`❌ DEBUG: Invalid EVM address length: ${formattedAddress.length} (expected 42)`);
        console.error(`❌ DEBUG: Address: "${formattedAddress}"`);
        throw new Error(`Invalid address length: ${formattedAddress.length} characters, expected 42 for EVM address`);
      }
    }
    
    console.log(`PayCio: Getting balance for ${formattedAddress} on ${network} using RPC: ${networkConfig.rpcUrl}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [formattedAddress, 'latest'],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`PayCio: RPC response for balance:`, data);
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Balance request timed out for', network);
    } else {
      console.error('Error getting balance for', network, ':', error);
    }
    // Always return "0" instead of throwing error
    return '0';
  }
}

// Get real balance with proper fallback handling
export async function getRealBalance(address: string, network: string): Promise<string> {
  try {
    console.log(`🔍 Getting real balance for ${address} on ${network}`);
    
    // Handle different network types
    switch (network.toLowerCase()) {
      case 'bitcoin':
        return await getBitcoinBalance(address);
      case 'litecoin':
        return await getLitecoinBalance(address);
      case 'solana':
        return await getSolanaBalance(address);
      case 'tron':
        return await getTronBalance(address);
      case 'ton':
        return await getTonBalance(address);
      case 'xrp':
        return await getXrpBalance(address);
      default:
        // EVM networks (Ethereum, BSC, Polygon, etc.)
        return await getBalance(address, network);
    }
  } catch (error) {
    console.error(`❌ Failed to get balance for ${address} on ${network}:`, error);
    // Always return "0" instead of throwing error
    return '0';
  }
}

// Non-EVM balance fetchers with proper fallback
async function getBitcoinBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    if (!response.ok) throw new Error('Bitcoin API failed');
    const data = await response.json();
    const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const balanceBTC = balanceSatoshis / 100000000;
    return balanceBTC.toFixed(8);
  } catch (error) {
    console.error('Bitcoin balance fetch failed:', error);
    return '0';
  }
}

async function getLitecoinBalance(address: string): Promise<string> {
  try {
    // Using BlockCypher API for Litecoin
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    if (!response.ok) throw new Error('Litecoin API failed');
    const data = await response.json();
    const balanceLTC = data.balance / 100000000; // Convert from litoshis to LTC
    return balanceLTC.toFixed(8);
  } catch (error) {
    console.error('Litecoin balance fetch failed:', error);
    return '0';
  }
}

async function getSolanaBalance(address: string): Promise<string> {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    if (!response.ok) throw new Error('Solana API failed');
    const data = await response.json();
    const balanceSOL = (data.result?.value || 0) / 1000000000; // Convert from lamports to SOL
    return balanceSOL.toFixed(9);
  } catch (error) {
    console.error('Solana balance fetch failed:', error);
    return '0';
  }
}

async function getTronBalance(address: string): Promise<string> {
  try {
    const response = await fetch('https://api.trongrid.io/v1/accounts/' + address);
    if (!response.ok) throw new Error('Tron API failed');
    const data = await response.json();
    const balanceTRX = (data.data?.[0]?.balance || 0) / 1000000; // Convert from sun to TRX
    return balanceTRX.toFixed(6);
  } catch (error) {
    console.error('Tron balance fetch failed:', error);
    return '0';
  }
}

async function getTonBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${address}`);
    if (!response.ok) throw new Error('TON API failed');
    const data = await response.json();
    const balanceTON = (data.result?.balance || 0) / 1000000000; // Convert from nanotons to TON
    return balanceTON.toFixed(9);
  } catch (error) {
    console.error('TON balance fetch failed:', error);
    return '0';
  }
}

async function getXrpBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://data.ripple.com/v2/accounts/${address}/balances`);
    if (!response.ok) throw new Error('XRP API failed');
    const data = await response.json();
    const xrpBalance = data.balances?.find((b: any) => b.currency === 'XRP');
    return xrpBalance?.value || '0';
  } catch (error) {
    console.error('XRP balance fetch failed:', error);
    return '0';
  }
}

// Get token balance (real implementation)
export async function getTokenBalance(
  tokenAddress: string, 
  walletAddress: string, 
  network: string
): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}`
        }, 'latest'],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0x0';
  }
}

// Get gas price (real implementation with fallbacks)
export async function getGasPrice(network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    console.log(`PayCio: Getting gas price for ${network} using RPC: ${networkConfig.rpcUrl}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`PayCio: Gas price response:`, data);
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const gasPrice = data.result || '0x0';
    
    // Convert to Gwei for better readability and validation
    const gasPriceWei = BigInt(gasPrice);
    const gasPriceGwei = Number(gasPriceWei) / 1e9;
    
    console.log(`PayCio: Gas price for ${network}: ${gasPriceGwei.toFixed(2)} Gwei`);
    
    // Validate gas price is reasonable (not too high or too low)
    if (gasPriceGwei < 0.01) {
      console.warn(`PayCio: Gas price seems too low (${gasPriceGwei} Gwei), using fallback`);
      return getFallbackGasPrice(network);
    }
    
    if (gasPriceGwei > 1000) {
      console.warn(`PayCio: Gas price seems too high (${gasPriceGwei} Gwei), using fallback`);
      return getFallbackGasPrice(network);
    }

    return gasPrice;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Gas price request timed out, using fallback');
      return await getFallbackGasPrice(network);
    }
    console.error('Error getting gas price, using fallback:', error);
    return await getFallbackGasPrice(network);
  }
}

// Enhanced fallback gas prices with real-time API integration
async function getFallbackGasPrice(network: string): Promise<string> {
  try {
    // Try to get real-time gas prices first
    const { realTimeGasService } = await import('./real-time-gas-prices');
    const gasData = await realTimeGasService.getGasPrices(network);
    
    // Convert to Wei hex format
    const gasPriceWei = ethers.parseUnits(gasData.gasPrice.toString(), 'gwei');
    const gasPriceHex = '0x' + gasPriceWei.toString(16);
    
    console.log(`PayCio: Using real-time gas price for ${network}: ${gasData.gasPrice} Gwei`);
    return gasPriceHex;
    
  } catch (error) {
    console.warn(`PayCio: Real-time gas price failed for ${network}, using static fallback:`, error);
    
    // Static fallback prices (updated to current realistic values)
    const fallbackPrices: Record<string, string> = {
      'ethereum': '0x12a05f200',  // 5 Gwei (current ETH gas price)
      'bsc': '0x3b9aca00',        // 1 Gwei (current BSC gas price) 
      'polygon': '0x77359400',     // 2 Gwei (current Polygon gas price)
      'avalanche': '0x3b9aca00',   // 1 Gwei (current AVAX gas price)
      'arbitrum': '0x5f5e100',    // 0.1 Gwei (L2 cheaper gas)
      'optimism': '0x5f5e100',     // 0.1 Gwei (L2 cheaper gas)
      'base': '0x5f5e100',         // 0.1 Gwei (L2 cheaper gas)
      'fantom': '0x3b9aca00',      // 1 Gwei
    };
    
    const fallbackPrice = fallbackPrices[network] || '0x3b9aca00'; // Default 1 Gwei
    const gasPriceGwei = Number(BigInt(fallbackPrice)) / 1e9;
    console.log(`PayCio: Using static fallback gas price for ${network}: ${gasPriceGwei} Gwei`);
    return fallbackPrice;
  }
}

// Estimate gas limit (real implementation)
export async function estimateGas(
  from: string,
  to: string,
  value: string,
  txData: string = '0x',
  network: string
): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_estimateGas',
        params: [{
          from,
          to,
          value,
          data: txData
        }],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    console.error('Error estimating gas:', error);
    return '0x0';
  }
}

// Get transaction count (nonce) - real implementation
export async function getTransactionCount(address: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error) {
    console.error('Error getting transaction count:', error);
    return '0x0';
  }
}

// Sign transaction with private key - real implementation
export async function signTransaction(
  transaction: any,
  privateKey: string,
  network: string
): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey);
    
    // Prepare transaction object
    const tx = {
      to: transaction.to,
      value: transaction.value || '0x0',
      data: transaction.data || '0x',
      gasLimit: transaction.gasLimit || '0x5208', // Default 21000
      gasPrice: transaction.gasPrice || await getGasPrice(network),
      nonce: transaction.nonce || await getTransactionCount(wallet.address, network)
    };
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    return signedTx;
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
}

// Send signed transaction - real implementation
export async function sendSignedTransaction(signedTransaction: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTransaction],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  } catch (error) {
    console.error('Error sending signed transaction:', error);
    throw error;
  }
}

// Sign message - real implementation
export async function signMessage(message: string, privateKey: string): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

// Sign typed data - real implementation
export async function signTypedData(
  typedData: any,
  privateKey: string
): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.value
    );
    
    return signature;
  } catch (error) {
    console.error('Error signing typed data:', error);
    throw error;
  }
}

// Send raw transaction (real implementation)
export async function sendRawTransaction(signedTransaction: string, network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTransaction],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

// Get transaction receipt using Etherscan V2 Multichain API
export async function getTransactionReceipt(txHash: string, network: string): Promise<any | null> {
  try {
    const config = getConfig();
    const apiKey = config.ETHERSCAN_API_KEY; // Use Etherscan API key for all networks
    
    if (!apiKey) {
      throw new Error('Etherscan API key required for transaction data');
    }

      // Map network to Etherscan V2 API chain ID
  const chainIdMap: Record<string, string> = {
    ethereum: '1',
    bsc: '56',
    polygon: '137',
    avalanche: '43114',
    arbitrum: '42161',
    optimism: '10',
    base: '8453',
    fantom: '250',
    zksync: '324',
    linea: '59144',
    mantle: '5000',
    scroll: '534352',
    'polygon-zkevm': '1101',
    'arbitrum-nova': '42170'
  };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API
    const baseUrl = 'https://api.etherscan.io/api/v2';
    const url = `${baseUrl}/transactions/${txHash}?chainid=${chainId}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (responseData.status !== '1') {
      throw new Error(`API error: ${responseData.message}`);
    }

    return responseData.result;
  } catch (error) {
    console.error('Error getting transaction receipt:', error);
    return null;
  }
}

// Get transaction history using Etherscan V2 API
export async function getTransactionHistory(address: string, network: string, page: number = 1, offset: number = 20): Promise<any[]> {
  try {
    const config = getConfig();
    const apiKey = config.ETHERSCAN_API_KEY;
    
    if (!apiKey) {
      throw new Error('Etherscan API key required for transaction history');
    }

    const chainIdMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
      optimism: '10'
    };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API for transaction list
    const baseUrl = 'https://api.etherscan.io/api/v2';
    const url = `${baseUrl}/transactions?address=${address}&chainid=${chainId}&page=${page}&offset=${offset}&apikey=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (responseData.status !== '1') {
      throw new Error(`API error: ${responseData.message}`);
    }

    return responseData.result || [];
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

// Get token transactions using Etherscan V2 API
export async function getTokenTransactions(address: string, network: string, contractAddress?: string): Promise<any[]> {
  try {
    const config = getConfig();
    const apiKey = config.ETHERSCAN_API_KEY;
    
    if (!apiKey) {
      throw new Error('Etherscan API key required for token transactions');
    }

    const chainIdMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
      optimism: '10'
    };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API for token transactions
    const baseUrl = 'https://api.etherscan.io/api/v2';
    let url = `${baseUrl}/tokens/transactions?address=${address}&chainid=${chainId}&apikey=${apiKey}`;
    
    if (contractAddress) {
      url += `&contractaddress=${contractAddress}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (responseData.status !== '1') {
      throw new Error(`API error: ${responseData.message}`);
    }

    return responseData.result || [];
  } catch (error) {
    console.error('Error getting token transactions:', error);
    return [];
  }
}

// Get token price from CoinGecko (real implementation)
export async function getTokenPrice(tokenId: string): Promise<number> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;
    
    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data[tokenId]?.usd || 0;
  } catch (error) {
    console.error('Error getting token price:', error);
    return 0;
  }
}

// Get multiple token prices (real implementation)
export async function getTokenPrices(tokenIds: string[]): Promise<Record<string, number>> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;
    
    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const ids = tokenIds.join(',');
    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const prices: Record<string, number> = {};
    tokenIds.forEach(id => {
      prices[id] = data[id]?.usd || 0;
    });

    return prices;
  } catch (error) {
    console.error('Error getting token prices:', error);
    return {};
  }
} 

// Alias for backward compatibility
export const getMultipleTokenPrices = getTokenPrices;

// Get 24h price change from CoinGecko (real implementation)
export async function get24hPriceChange(tokenId: string): Promise<any> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;
    
    if (!apiKey) {
      throw new Error('CoinGecko API key required for price change data');
    }

    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Calculate 24h price change
    const prices = data.prices;
    if (prices && prices.length >= 2) {
      const currentPrice = prices[prices.length - 1][1];
      const previousPrice = prices[0][1];
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = ((priceChange / previousPrice) * 100);
      
      return {
        price_change_24h: priceChange,
        price_change_percentage_24h: priceChangePercent,
        current_price: currentPrice
      };
    }

    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0
    };
  } catch (error) {
    console.error('Error getting 24h price change:', error);
    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0
    };
  }
} 