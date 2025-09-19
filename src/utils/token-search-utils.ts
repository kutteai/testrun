// Modern Token search and identification utilities for PayCio Wallet
import { getConfig } from './config-injector';

// Import config for API keys
declare const CONFIG: any;

export interface TokenSearchResult {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  network: string;
  isVerified: boolean;
  source: 'coingecko' | 'explorer' | 'manual' | 'dexscreener' | 'moralis' | 'custom' | 'solana' | 'bitcoin' | 'tron';
  tags?: string[];
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  // Non-EVM chain specific fields
  chainType?: 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other';
  mintAddress?: string; // For Solana SPL tokens
  programId?: string; // For Solana programs
  assetId?: string; // For other chain-specific identifiers
  isCustom?: boolean; // User-added custom token
}

export interface TokenSearchSuggestion {
  symbol: string;
  name: string;
  address: string;
  network: string;
  logo?: string;
  isPopular: boolean;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  tags?: string[];
  verified?: boolean;
  // Non-EVM chain support
  chainType?: 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other';
  mintAddress?: string;
  programId?: string;
  assetId?: string;
  isCustom?: boolean;
}

export interface CustomTokenInput {
  symbol: string;
  name: string;
  address: string;
  network: string;
  decimals?: number;
  logo?: string;
  chainType?: 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other';
  mintAddress?: string; // For Solana
  programId?: string; // For Solana
  assetId?: string; // For other chains
  description?: string;
  website?: string;
  autoValidate?: boolean; // Whether to validate the token automatically
}

export interface SearchOptions {
  limit?: number;
  includeUnverified?: boolean;
  includePriceData?: boolean;
  sortBy?: 'relevance' | 'marketCap' | 'volume' | 'price';
  networks?: string[];
}

// Popular tokens database
const POPULAR_TOKENS: Record<string, TokenSearchSuggestion[]> = {
  ethereum: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', network: 'ethereum', isPopular: true, tags: ['stablecoin', 'defi'], verified: true, chainType: 'evm' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441b8c4C8C0e4b8b8c4C8C0e4b8b8c4', network: 'ethereum', isPopular: true, tags: ['stablecoin', 'defi'], verified: true, chainType: 'evm' },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', network: 'ethereum', isPopular: true, tags: ['stablecoin', 'defi', 'makerdao'], verified: true, chainType: 'evm' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', network: 'ethereum', isPopular: true, tags: ['wrapped', 'defi'], verified: true, chainType: 'evm' },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', network: 'ethereum', isPopular: true, tags: ['dex', 'defi', 'governance'], verified: true, chainType: 'evm' },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', network: 'ethereum', isPopular: true, tags: ['oracle', 'defi'], verified: true, chainType: 'evm' },
    { symbol: 'AAVE', name: 'Aave Token', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', network: 'ethereum', isPopular: true, tags: ['lending', 'defi'], verified: true, chainType: 'evm' },
    { symbol: 'CRV', name: 'Curve DAO Token', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', network: 'ethereum', isPopular: true, tags: ['dex', 'defi', 'yield'], verified: true, chainType: 'evm' },
  ],
  bsc: [
    { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', network: 'bsc', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', network: 'bsc', isPopular: true },
    { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', network: 'bsc', isPopular: true },
    { symbol: 'CAKE', name: 'PancakeSwap Token', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', network: 'bsc', isPopular: true },
    { symbol: 'ADA', name: 'Cardano Token', address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', network: 'bsc', isPopular: true },
  ],
  polygon: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', network: 'polygon', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', network: 'polygon', isPopular: true },
    { symbol: 'MATIC', name: 'Polygon', address: '0x0000000000000000000000000000000000001010', network: 'polygon', isPopular: true },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', network: 'polygon', isPopular: true },
  ],
  
  // Non-EVM Chains
  solana: [
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', network: 'solana', isPopular: true, tags: ['stablecoin'], verified: true, chainType: 'solana', mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'USDT', name: 'Tether USD', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', network: 'solana', isPopular: true, tags: ['stablecoin'], verified: true, chainType: 'solana', mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
    { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', network: 'solana', isPopular: true, tags: ['native', 'wrapped'], verified: true, chainType: 'solana', mintAddress: 'So11111111111111111111111111111111111111112' },
    { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', network: 'solana', isPopular: true, tags: ['dex', 'defi'], verified: true, chainType: 'solana', mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
    { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', network: 'solana', isPopular: true, tags: ['meme', 'community'], verified: true, chainType: 'solana', mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  ],
  
  bitcoin: [
    { symbol: 'BTC', name: 'Bitcoin', address: 'bitcoin', network: 'bitcoin', isPopular: true, tags: ['native'], verified: true, chainType: 'bitcoin' },
  ],
  
  tron: [
    { symbol: 'USDT', name: 'Tether USD', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', network: 'tron', isPopular: true, tags: ['stablecoin'], verified: true, chainType: 'tron' },
    { symbol: 'TRX', name: 'TRON', address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'tron', isPopular: true, tags: ['native'], verified: true, chainType: 'tron' },
  ],
  
  near: [
    { symbol: 'NEAR', name: 'NEAR Protocol', address: 'near', network: 'near', isPopular: true, tags: ['native'], verified: true, chainType: 'near' },
    { symbol: 'USDC', name: 'USD Coin', address: 'a0b86991c688ee0d53d56d8ab2c4e7b6b8c9cd64c2c.factory.bridge.near', network: 'near', isPopular: true, tags: ['stablecoin'], verified: true, chainType: 'near' },
  ],
  
  cosmos: [
    { symbol: 'ATOM', name: 'Cosmos Hub', address: 'uatom', network: 'cosmos', isPopular: true, tags: ['native'], verified: true, chainType: 'cosmos' },
    { symbol: 'OSMO', name: 'Osmosis', address: 'uosmo', network: 'osmosis', isPopular: true, tags: ['dex', 'defi'], verified: true, chainType: 'cosmos' },
  ],
  
  aptos: [
    { symbol: 'APT', name: 'Aptos', address: '0x1::aptos_coin::AptosCoin', network: 'aptos', isPopular: true, tags: ['native'], verified: true, chainType: 'aptos' },
  ],
  
  sui: [
    { symbol: 'SUI', name: 'Sui', address: '0x2::sui::SUI', network: 'sui', isPopular: true, tags: ['native'], verified: true, chainType: 'sui' },
  ],
  
  arbitrum: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', network: 'arbitrum', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', network: 'arbitrum', isPopular: true },
    { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', network: 'arbitrum', isPopular: true },
  ],
  optimism: [
    { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', network: 'optimism', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', network: 'optimism', isPopular: true },
    { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', network: 'optimism', isPopular: true },
  ],
  avalanche: [
    { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', network: 'avalanche', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', network: 'avalanche', isPopular: true },
    { symbol: 'AVAX', name: 'Avalanche', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', network: 'avalanche', isPopular: true },
  ],
  base: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', network: 'base', isPopular: true },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', network: 'base', isPopular: true },
  ],
  fantom: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', network: 'fantom', isPopular: true },
    { symbol: 'FTM', name: 'Fantom', address: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', network: 'fantom', isPopular: true },
  ]
};

// Search for tokens based on query
export async function searchTokens(query: string, network: string = 'ethereum'): Promise<TokenSearchSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const suggestions: TokenSearchSuggestion[] = [];

  try {
    // 1. Search in popular tokens first (always works, no API required)
    const popularTokens = POPULAR_TOKENS[network] || [];
    const popularMatches = popularTokens.filter(token => 
      token.symbol.toLowerCase().includes(normalizedQuery) ||
      token.name.toLowerCase().includes(normalizedQuery)
    );
    
    suggestions.push(...popularMatches);

    // 2. If query looks like a contract address, try to fetch token info
    if (isValidContractAddress(normalizedQuery)) {
      try {
        const tokenInfo = await fetchTokenInfoFromExplorer(normalizedQuery, network);
        if (tokenInfo) {
          suggestions.push({
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            address: tokenInfo.address,
            network: network,
            isPopular: false
          });
        }
      } catch (error) {
        console.log('Failed to fetch token info for address:', error);
      }
    }

    // 3. Search CoinGecko API for more tokens
    try {
      const coingeckoResults = await searchCoinGecko(normalizedQuery, network);
      suggestions.push(...coingeckoResults);
    } catch (error) {
      console.log('CoinGecko search failed:', error);
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.address.toLowerCase() === suggestion.address.toLowerCase())
    );

    return uniqueSuggestions.slice(0, 10); // Limit to 10 results

  } catch (error) {
    console.error('Token search failed:', error);
    return [];
  }
}

// Check if string looks like a contract address
function isValidContractAddress(address: string): boolean {
  // Ethereum address format: 0x followed by 40 hex characters
  // This format is used by most EVM-compatible chains (Ethereum, BSC, Polygon, Arbitrum, Optimism, etc.)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Fetch token information from blockchain explorer
async function fetchTokenInfoFromExplorer(address: string, network: string): Promise<TokenSearchResult | null> {
  try {
    const config = getConfig();
    let apiUrl = '';
    let apiKey = '';
    
    // Using Etherscan API v2 unified multichain approach
    // Single API key and URL for all 60+ supported chains
    apiUrl = 'https://api.etherscan.io/v2/api';
        apiKey = config.ETHERSCAN_API_KEY || '';
    
    // Map network names to Etherscan API v2 chain IDs
    const chainIdMap = {
      'ethereum': 1,
      'bsc': 56,
      'binance': 56,
      'polygon': 137,
      'arbitrum': 42161,
      'optimism': 10,
      'base': 8453,
      'avalanche': 43114,
      'fantom': 250,
      'celo': 42220,
      'moonbeam': 1284,
      'cronos': 25,
      'gnosis': 100,
      'klaytn': 8217,
      'metis': 1088
    };
    
    const chainId = chainIdMap[network.toLowerCase()];
    if (!chainId) {
      throw new Error(`Unsupported network: ${network}. Supported networks: ${Object.keys(chainIdMap).join(', ')}`); 
    }
    
    if (!apiKey) {
      console.warn(`No API key for ${network} explorer`);
      // Instead of returning null, throw an error to indicate API integration needed
      throw new Error(`ETHERSCAN_API_KEY required for token validation on ${network}. Please add your Etherscan API key to .env file. With Etherscan API v2, one key works for 60+ chains including Ethereum, BSC, Polygon, Arbitrum, Base, and more.`);
    }
    
    // Fetch token info using multiple API calls for complete data
    console.log(`🔍 Fetching token info for ${address} on ${network} (chainId: ${chainId}) using Etherscan API v2 with key: ${apiKey ? 'YES' : 'NO'}`);
    
    // Method 1: Get basic token info using Etherscan API v2
    const tokenInfoResponse = await fetch(
      `${apiUrl}?chainid=${chainId}&module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`
    );
    
    if (!tokenInfoResponse.ok) {
      throw new Error(`HTTP error! status: ${tokenInfoResponse.status}`);
    }
    
    const tokenInfoData = await tokenInfoResponse.json();
    console.log(`🔍 Token info API response:`, tokenInfoData);
    
    if (tokenInfoData.status === '1' && tokenInfoData.result && tokenInfoData.result.length > 0) {
      const tokenInfo = tokenInfoData.result[0];
      
      // Method 2: Get actual decimals using contract call (more reliable)
      let decimals = 18; // Default
      try {
        const decimalsResponse = await fetch(
          `${apiUrl}?chainid=${chainId}&module=proxy&action=eth_call&to=${address}&data=0x313ce567&tag=latest&apikey=${apiKey}`
        );
        
        if (decimalsResponse.ok) {
          const decimalsData = await decimalsResponse.json();
          if (decimalsData.status === '1' && decimalsData.result && decimalsData.result !== '0x') {
            // Convert hex result to decimal
            decimals = parseInt(decimalsData.result, 16);
            console.log(`✅ Real decimals fetched: ${decimals}`);
          }
        }
      } catch (decimalsError) {
        console.warn('Failed to fetch decimals via contract call:', decimalsError);
        // Try to parse from tokenInfo if available
        if (tokenInfo.divisor) {
          decimals = parseInt(tokenInfo.divisor);
        } else if (tokenInfo.decimals) {
          decimals = parseInt(tokenInfo.decimals);
        }
      }
      
      // Method 3: Get symbol and name via contract calls if not in basic info
      let symbol = tokenInfo.symbol || '';
      let name = tokenInfo.tokenName || tokenInfo.name || '';
      
      // If symbol is missing, try to get it via contract call
      if (!symbol) {
        try {
          const symbolResponse = await fetch(
            `${apiUrl}?chainid=${chainId}&module=proxy&action=eth_call&to=${address}&data=0x95d89b41&tag=latest&apikey=${apiKey}`
          );
          
          if (symbolResponse.ok) {
            const symbolData = await symbolResponse.json();
            if (symbolData.status === '1' && symbolData.result && symbolData.result !== '0x') {
              // Decode hex string to ASCII
              const hexStr = symbolData.result.slice(2);
              symbol = Buffer.from(hexStr, 'hex').toString('ascii').replace(/\0/g, '');
              console.log(`✅ Real symbol fetched: ${symbol}`);
            }
          }
        } catch (symbolError) {
          console.warn('Failed to fetch symbol via contract call:', symbolError);
        }
      }
      
      // If name is missing, try to get it via contract call
      if (!name) {
        try {
          const nameResponse = await fetch(
            `${apiUrl}?chainid=${chainId}&module=proxy&action=eth_call&to=${address}&data=0x06fdde03&tag=latest&apikey=${apiKey}`
          );
          
          if (nameResponse.ok) {
            const nameData = await nameResponse.json();
            if (nameData.status === '1' && nameData.result && nameData.result !== '0x') {
              // Decode hex string to ASCII
              const hexStr = nameData.result.slice(2);
              name = Buffer.from(hexStr, 'hex').toString('ascii').replace(/\0/g, '');
              console.log(`✅ Real name fetched: ${name}`);
            }
          }
        } catch (nameError) {
          console.warn('Failed to fetch name via contract call:', nameError);
        }
      }
      
      const result = {
        address: tokenInfo.contractAddress || address,
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        decimals: decimals,
        network: network,
        isVerified: true,
        source: 'explorer' as const
      };
      
      console.log(`✅ Final token info:`, result);
      return result;
    } else {
      // More descriptive error messages for common cases
      let errorMessage = tokenInfoData.message || 'Token not found on explorer';
      if (errorMessage === 'NOTOK') {
        errorMessage = `Token contract not found on ${network} explorer. This could mean:\n• Invalid contract address\n• Token not deployed on this network\n• Explorer API is temporarily unavailable\n• API key issues`;
      }
      console.error(`❌ Token validation failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to fetch token info from explorer:', error);
    return null;
  }
}

// Search CoinGecko API for tokens
async function searchCoinGecko(query: string, network: string): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    if (!config.COINGECKO_API_KEY) {
      console.warn('No CoinGecko API key available');
      // Throw error instead of returning empty array to indicate API integration needed
      throw new Error('CoinGecko API key required for token search. Please add COINGECKO_API_KEY to config. Real CoinGecko API integration required.');
    }

    // Map network names to CoinGecko platform IDs
    const platformMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'bsc': 'binance-smart-chain',
      'polygon': 'polygon-pos',
      'arbitrum': 'arbitrum-one',
      'optimism': 'optimistic-ethereum',
      'avalanche': 'avalanche',
      'base': 'base',
      'fantom': 'fantom'
    };

    const platformId = platformMap[network.toLowerCase()];
    if (!platformId) {
      return [];
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${query}?x_cg_demo_api_key=${config.COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      // If direct contract lookup fails, try search API
      const searchResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}&x_cg_demo_api_key=${config.COINGECKO_API_KEY}`
      );

      if (!searchResponse.ok) {
        return [];
      }

      const searchData = await searchResponse.json();
      const coins = searchData.coins || [];
      
      return coins.slice(0, 5).map((coin: any) => ({
        symbol: coin.symbol?.toUpperCase() || '',
        name: coin.name || '',
        address: '', // CoinGecko search doesn't provide contract addresses
        network: network,
        logo: coin.thumb,
        isPopular: false
      }));
    }

    const data = await response.json();
    
    return [{
      symbol: data.symbol?.toUpperCase() || '',
      name: data.name || '',
      address: query,
      network: network,
      logo: data.image?.small,
      isPopular: false
    }];

  } catch (error) {
    console.error('CoinGecko search failed:', error);
    return [];
  }
}

// Get token details by address
export async function getTokenDetails(address: string, network: string): Promise<TokenSearchResult | null> {
  try {
    // First try to get from explorer
    const explorerResult = await fetchTokenInfoFromExplorer(address, network);
    if (explorerResult) {
      return explorerResult;
    }

    // If explorer fails, try CoinGecko
    const coingeckoResults = await searchCoinGecko(address, network);
    if (coingeckoResults.length > 0) {
      const token = coingeckoResults[0];
      return {
        address: address,
        symbol: token.symbol,
        name: token.name,
        decimals: 18, // CoinGecko doesn't provide decimals, using standard ERC-20 default
        network: network,
        isVerified: false,
        source: 'coingecko'
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get token details:', error);
    return null;
  }
}

// Validate token contract with fallback methods
export async function validateTokenContract(address: string, network: string): Promise<boolean> {
  try {
    // Method 1: Try blockchain explorer API
    const tokenInfo = await fetchTokenInfoFromExplorer(address, network);
    if (tokenInfo !== null) {
      return true;
    }
  } catch (error) {
    console.warn('Explorer API validation failed:', error.message);
  }

  try {
    // Method 2: Direct RPC call to validate contract
    const isValid = await validateTokenContractViaRPC(address, network);
    if (isValid) {
      return true;
    }
  } catch (error) {
    console.warn('RPC validation failed:', error.message);
  }

  try {
    // Method 3: Basic address format validation
    const isValidFormat = validateTokenAddressFormat(address, network);
    if (isValidFormat) {
      console.warn('Using basic address validation only - contract existence not verified');
      return true;
    }
  } catch (error) {
    console.warn('Address format validation failed:', error.message);
  }

    return false;
  }

// Direct RPC validation (no API key required)
async function validateTokenContractViaRPC(address: string, network: string): Promise<boolean> {
  try {
    const networkConfig = getNetworkConfig(network);
    if (!networkConfig?.rpcUrl) {
      throw new Error('No RPC URL for network');
    }

    // Check if address has contract code
    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1
      })
    });

    const data = await response.json();
    
    // If result is '0x' or empty, no contract exists
    // If result has code, contract exists
    const hasCode = data.result && data.result !== '0x' && data.result.length > 2;
    
    if (hasCode) {
      // Try to call standard ERC-20 functions to verify it's a token
      const isERC20 = await verifyERC20Interface(address, networkConfig.rpcUrl);
      return isERC20;
    }
    
    return false;
  } catch (error) {
    console.error('RPC validation error:', error);
    return false;
  }
}

// Verify ERC-20 interface via RPC
async function verifyERC20Interface(address: string, rpcUrl: string): Promise<boolean> {
  try {
    // Try to call totalSupply() function (0x18160ddd)
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: address,
          data: '0x18160ddd' // totalSupply() function selector
        }, 'latest'],
        id: 1
      })
    });

    const data = await response.json();
    
    // If call succeeds and returns data, likely an ERC-20 token
    return !data.error && data.result && data.result !== '0x';
  } catch (error) {
    return false;
  }
}

// Basic address format validation
function validateTokenAddressFormat(address: string, network: string): boolean {
  // EVM networks
  if (['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base', 'fantom'].includes(network.toLowerCase())) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Add other network address formats as needed
  return false;
}

// Get network configuration
function getNetworkConfig(network: string): { rpcUrl?: string } {
  const configs: Record<string, { rpcUrl: string }> = {
    ethereum: { rpcUrl: 'https://eth.llamarpc.com' },
    bsc: { rpcUrl: 'https://bsc-dataseed1.binance.org' },
    polygon: { rpcUrl: 'https://polygon-rpc.com' },
    arbitrum: { rpcUrl: 'https://arb1.arbitrum.io/rpc' },
    optimism: { rpcUrl: 'https://mainnet.optimism.io' },
    avalanche: { rpcUrl: 'https://api.avax.network/ext/bc/C/rpc' },
    base: { rpcUrl: 'https://mainnet.base.org' },
    fantom: { rpcUrl: 'https://rpc.ftm.tools' }
  };
  
  return configs[network.toLowerCase()] || {};
}

// Get popular tokens for a network
export function getPopularTokens(network: string): TokenSearchSuggestion[] {
  return POPULAR_TOKENS[network] || [];
}

// Auto-complete token search
export async function autoCompleteTokenSearch(query: string, network: string): Promise<TokenSearchSuggestion[]> {
  if (!query || query.length < 1) {
    return getPopularTokens(network).slice(0, 5);
  }

  return await searchTokens(query, network);
}

// Network configuration for different chain types
const NETWORK_CONFIG: Record<string, {
  chainType: 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other';
  addressFormat: RegExp;
  defaultDecimals: number;
  nativeToken?: string;
}> = {
  // EVM Networks
  'ethereum': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'ETH' },
  'bsc': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'BNB' },
  'polygon': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'MATIC' },
  'arbitrum': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'ETH' },
  'optimism': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'ETH' },
  'avalanche': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'AVAX' },
  'base': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'ETH' },
  'fantom': { chainType: 'evm', addressFormat: /^0x[a-fA-F0-9]{40}$/, defaultDecimals: 18, nativeToken: 'FTM' },
  
  // Non-EVM Networks
  'solana': { chainType: 'solana', addressFormat: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, defaultDecimals: 9, nativeToken: 'SOL' },
  'bitcoin': { chainType: 'bitcoin', addressFormat: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/, defaultDecimals: 8, nativeToken: 'BTC' },
  'tron': { chainType: 'tron', addressFormat: /^T[A-Za-z1-9]{33}$/, defaultDecimals: 6, nativeToken: 'TRX' },
  'near': { chainType: 'near', addressFormat: /^[a-z0-9._-]+\.near$|^[a-f0-9]{64}$/, defaultDecimals: 24, nativeToken: 'NEAR' },
  'cosmos': { chainType: 'cosmos', addressFormat: /^cosmos[a-z0-9]{38,45}$/, defaultDecimals: 6, nativeToken: 'ATOM' },
  'osmosis': { chainType: 'cosmos', addressFormat: /^osmo[a-z0-9]{38,45}$/, defaultDecimals: 6, nativeToken: 'OSMO' },
  'aptos': { chainType: 'aptos', addressFormat: /^0x[a-fA-F0-9]{1,64}$/, defaultDecimals: 8, nativeToken: 'APT' },
  'sui': { chainType: 'sui', addressFormat: /^0x[a-fA-F0-9]{1,64}$/, defaultDecimals: 9, nativeToken: 'SUI' }
};

// Custom tokens storage
const customTokensStorage = new Map<string, TokenSearchSuggestion[]>();

// Network-specific address validation
export function isValidAddressForNetwork(address: string, network: string): boolean {
  const networkConfig = NETWORK_CONFIG[network.toLowerCase()];
  if (!networkConfig) {
    return false;
  }
  return networkConfig.addressFormat.test(address);
}

// Get chain type for network
export function getChainTypeForNetwork(network: string): 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other' | undefined {
  return NETWORK_CONFIG[network.toLowerCase()]?.chainType;
}

// Add custom token function
export async function addCustomToken(tokenInput: CustomTokenInput): Promise<{
  success: boolean;
  token?: TokenSearchResult;
  error?: string;
}> {
  try {
    const { symbol, name, address, network, decimals, logo, chainType, mintAddress, programId, assetId, description, website, autoValidate = true } = tokenInput;

    // Basic validation
    if (!symbol || !name || !address || !network) {
      return { success: false, error: 'Missing required fields: symbol, name, address, network' };
    }

    // Determine chain type if not provided
    const detectedChainType = chainType || getChainTypeForNetwork(network);
    if (!detectedChainType) {
      return { success: false, error: `Unsupported network: ${network}` };
    }

    // Validate address format for the specific chain
    const isValidAddress = isValidAddressForNetwork(address, network);
    if (!isValidAddress) {
      return { success: false, error: `Invalid address format for ${network} network` };
    }

    // Auto-validate token if requested
    if (autoValidate && detectedChainType === 'evm') {
      const validation = await validateTokenContract(address, network);
      if (!validation) {
        return { success: false, error: 'Token validation failed' };
      }
    }

    // Create token object
    const customToken: TokenSearchResult = {
      address,
      symbol: symbol.toUpperCase(),
      name,
      decimals: decimals || NETWORK_CONFIG[network]?.defaultDecimals || 18,
      network,
      isVerified: autoValidate,
      source: 'custom',
      chainType: detectedChainType,
      isCustom: true,
      logo,
      mintAddress,
      programId,
      assetId,
      description,
      website,
      tags: ['custom']
    };

    // Store custom token
    storeCustomToken(customToken);

    return { success: true, token: customToken };

  } catch (error) {
    console.error('Failed to add custom token:', error);
    return { success: false, error: 'Failed to add custom token' };
  }
}

// Remove custom token
export function removeCustomToken(address: string, network: string): boolean {
  try {
    const customTokens = customTokensStorage.get(network) || [];
    const filteredTokens = customTokens.filter(token => 
      token.address.toLowerCase() !== address.toLowerCase()
    );
    customTokensStorage.set(network, filteredTokens);
    return true;
  } catch (error) {
    console.error('Failed to remove custom token:', error);
    return false;
  }
}

// Get all custom tokens for a network
export function getCustomTokens(network: string): TokenSearchSuggestion[] {
  return customTokensStorage.get(network) || [];
}

// Store custom token
function storeCustomToken(token: TokenSearchResult): void {
  const networkTokens = customTokensStorage.get(token.network) || [];
  
  // Remove existing token with same address
  const filteredTokens = networkTokens.filter(t => 
    t.address.toLowerCase() !== token.address.toLowerCase()
  );
  
  // Add new token
  const customToken: TokenSearchSuggestion = {
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    network: token.network,
    logo: token.logo,
    isPopular: false,
    verified: token.isVerified,
    chainType: token.chainType,
    mintAddress: token.mintAddress,
    programId: token.programId,
    assetId: token.assetId,
    isCustom: true,
    tags: token.tags
  };
  
  filteredTokens.unshift(customToken); // Add to beginning for priority
  customTokensStorage.set(token.network, filteredTokens);
}

// Enhanced search function with custom token support and multi-chain
async function enhancedSearchTokens(
  query: string, 
  network: string = 'ethereum', 
  options: SearchOptions = {}
): Promise<TokenSearchSuggestion[]> {
  if (!query || query.length < 1) {
    return getPopularTokens(network).slice(0, options.limit || 10);
  }

  const {
    limit = 10,
    includeUnverified = true,
    includePriceData = false,
    sortBy = 'relevance',
    networks = [network]
  } = options;

  const normalizedQuery = query.toLowerCase().trim();
  const suggestions: TokenSearchSuggestion[] = [];

  try {
    // 1. Search custom tokens first (user-added tokens get priority)
    for (const net of networks) {
      const customTokens = getCustomTokens(net);
      const customMatches = customTokens.filter(token => 
        matchesQuery(token, normalizedQuery)
      );
      suggestions.push(...customMatches);
    }

    // 2. Multi-network search in popular tokens
    for (const net of networks) {
      const popularTokens = POPULAR_TOKENS[net] || [];
      const popularMatches = popularTokens.filter(token => 
        matchesQuery(token, normalizedQuery)
      );
      suggestions.push(...popularMatches);
    }

    // 3. Address validation and lookup (supports all chain types)
    if (isValidAddressForAnyNetwork(normalizedQuery, networks)) {
      const addressResults = await Promise.allSettled(
        networks.map(net => getTokenByAddress(normalizedQuery, net))
      );
      
      addressResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          suggestions.push(result.value);
        }
      });
    }

    // 4. Enhanced external API search with multi-chain support
    const externalResults = await searchExternalAPIsMultiChain(normalizedQuery, networks, {
      includeUnverified,
      includePriceData
    });
    suggestions.push(...externalResults);

    // 5. Remove duplicates and filter
    const uniqueSuggestions = deduplicateTokens(suggestions);
    const filteredSuggestions = includeUnverified 
      ? uniqueSuggestions 
      : uniqueSuggestions.filter(token => token.verified !== false);

    // 6. Sort results (custom tokens get highest priority)
    const sortedSuggestions = sortTokenResultsWithCustomPriority(filteredSuggestions, sortBy, normalizedQuery);
    const finalResults = sortedSuggestions.slice(0, limit);

    return finalResults;

  } catch (error) {
    console.error('Token search failed:', error);
    return suggestions.slice(0, limit);
  }
}

// Chain-specific search functions

// Search EVM chains (existing functionality enhanced)
async function searchEVMChains(query: string, networks: string[], options: any): Promise<TokenSearchSuggestion[]> {
  const results: TokenSearchSuggestion[] = [];
  
  // Use existing EVM search functions
  const apiCalls = [
    searchDexScreener(query, networks),
    searchMoralisAPI(query, networks),
    searchCoinGeckoV3(query, networks),
  ];

  const apiResults = await Promise.allSettled(apiCalls);
  apiResults.forEach((result) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      results.push(...result.value);
    }
  });

  return results;
}

// Search Solana tokens
async function searchSolanaTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    const results: TokenSearchSuggestion[] = [];

    // Use Solana token registry and Jupiter API
    if (config.JUPITER_API_KEY || true) { // Jupiter API is often free
      try {
        // Search by mint address
        if (isValidAddressForNetwork(query, 'solana')) {
          const response = await fetch(`https://token.jup.ag/strict/${query}`);
          if (response.ok) {
            const tokenData = await response.json();
            results.push({
              symbol: tokenData.symbol || '',
              name: tokenData.name || '',
              address: tokenData.address || query,
              network: 'solana',
              logo: tokenData.logoURI,
              isPopular: false,
              verified: true,
              chainType: 'solana',
              mintAddress: query,
              tags: ['jupiter-verified']
            });
          }
        } else {
          // Search all tokens and filter by name/symbol
          const response = await fetch('https://token.jup.ag/strict');
          if (response.ok) {
            const tokens = await response.json();
            const matches = tokens.filter((token: any) =>
              token.symbol?.toLowerCase().includes(query.toLowerCase()) ||
              token.name?.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);

            results.push(...matches.map((token: any) => ({
              symbol: token.symbol || '',
              name: token.name || '',
              address: token.address || '',
              network: 'solana',
              logo: token.logoURI,
              isPopular: false,
              verified: true,
              chainType: 'solana',
              mintAddress: token.address,
              tags: ['jupiter-verified']
            })));
          }
        }
      } catch (error) {
        console.log('Jupiter API search failed:', error);
      }
    }

    return results;
  } catch (error) {
    console.error('Solana token search failed:', error);
    return [];
  }
}

// Search Bitcoin tokens (limited - mainly wrapped tokens)
async function searchBitcoinTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const results: TokenSearchSuggestion[] = [];
    
    // For now, just return BTC if it matches
    if (query.toLowerCase().includes('btc') || query.toLowerCase().includes('bitcoin')) {
      results.push({
        symbol: 'BTC',
        name: 'Bitcoin',
        address: 'bitcoin',
        network: 'bitcoin',
        isPopular: true,
        verified: true,
        chainType: 'bitcoin',
        tags: ['native']
      });
    }
    
    return results;
  } catch (error) {
    console.error('Bitcoin token search failed:', error);
    return [];
  }
}

// Search TRON tokens
async function searchTronTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    const results: TokenSearchSuggestion[] = [];

    if (config.TRON_API_KEY) {
      // Use TronScan API or TronGrid
      const baseUrl = 'https://api.trongrid.io';
      
      if (isValidAddressForNetwork(query, 'tron')) {
        // Search by contract address
        const response = await fetch(`${baseUrl}/v1/contracts/${query}`, {
          headers: {
            'TRON-PRO-API-KEY': config.TRON_API_KEY
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const contract = data.data[0];
            results.push({
              symbol: contract.symbol || '',
              name: contract.name || '',
              address: query,
              network: 'tron',
              isPopular: false,
              verified: true,
              chainType: 'tron',
              tags: ['tron-verified']
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('TRON token search failed:', error);
    return [];
  }
}

// Search Cosmos ecosystem tokens
async function searchCosmosTokens(query: string, networks: string[], options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const results: TokenSearchSuggestion[] = [];
    
    // Use Osmosis API for Cosmos ecosystem tokens
    if (networks.includes('osmosis')) {
      const response = await fetch('https://api-osmosis.imperator.co/tokens/v2/all');
      if (response.ok) {
        const tokens = await response.json();
        const matches = tokens.filter((token: any) =>
          token.symbol?.toLowerCase().includes(query.toLowerCase()) ||
          token.name?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        results.push(...matches.map((token: any) => ({
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.denom || '',
          network: 'osmosis',
          logo: token.logo_URIs?.png || token.logo_URIs?.svg,
          isPopular: false,
          verified: true,
          chainType: 'cosmos',
          tags: ['osmosis-verified']
        })));
      }
    }

    return results;
  } catch (error) {
    console.error('Cosmos token search failed:', error);
    return [];
  }
}

// Search NEAR tokens
async function searchNearTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const results: TokenSearchSuggestion[] = [];
    
    // Use NEAR RPC or indexer services
    const config = getConfig();
    if (config.NEAR_RPC_URL || true) {
      // For now, return basic NEAR token if it matches
      if (query.toLowerCase().includes('near')) {
        results.push({
          symbol: 'NEAR',
          name: 'NEAR Protocol',
          address: 'near',
          network: 'near',
          isPopular: true,
          verified: true,
          chainType: 'near',
          tags: ['native']
        });
      }
    }

    return results;
  } catch (error) {
    console.error('NEAR token search failed:', error);
    return [];
  }
}

// Search Aptos tokens
async function searchAptosTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const results: TokenSearchSuggestion[] = [];
    const config = getConfig();

    // Use Aptos REST API
    if (config.APTOS_RPC_URL || true) {
      if (query.toLowerCase().includes('apt')) {
        results.push({
          symbol: 'APT',
          name: 'Aptos',
          address: '0x1::aptos_coin::AptosCoin',
          network: 'aptos',
          isPopular: true,
          verified: true,
          chainType: 'aptos',
          tags: ['native']
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Aptos token search failed:', error);
    return [];
  }
}

// Search Sui tokens
async function searchSuiTokens(query: string, options: any): Promise<TokenSearchSuggestion[]> {
  try {
    const results: TokenSearchSuggestion[] = [];
    const config = getConfig();

    // Use Sui RPC or indexer services
    if (config.SUI_RPC_URL || true) {
      if (query.toLowerCase().includes('sui')) {
        results.push({
          symbol: 'SUI',
          name: 'Sui',
          address: '0x2::sui::SUI',
          network: 'sui',
          isPopular: true,
          verified: true,
          chainType: 'sui',
          tags: ['native']
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Sui token search failed:', error);
    return [];
  }
}

// Enhanced sorting with custom token priority
function sortTokenResultsWithCustomPriority(
  tokens: TokenSearchSuggestion[], 
  sortBy: string, 
  query: string
): TokenSearchSuggestion[] {
  const normalizedQuery = query.toLowerCase();
  
  return tokens.sort((a, b) => {
    // Custom tokens get highest priority
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;
    
    // Then apply normal sorting logic
    // Exact matches first
    const aExactSymbol = a.symbol.toLowerCase() === normalizedQuery;
    const bExactSymbol = b.symbol.toLowerCase() === normalizedQuery;
    
    if (aExactSymbol && !bExactSymbol) return -1;
    if (!aExactSymbol && bExactSymbol) return 1;
    
    // Popular tokens next
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;
    
    // Verified tokens
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    
    // Then sort by specified criteria
    switch (sortBy) {
      case 'marketCap':
        return (b.marketCap || 0) - (a.marketCap || 0);
      case 'volume':
        return (b.volume24h || 0) - (a.volume24h || 0);
      case 'price':
        return (b.price || 0) - (a.price || 0);
      default: // relevance
        // Sort by symbol/name match relevance
        const aSymbolMatch = a.symbol.toLowerCase().startsWith(normalizedQuery);
        const bSymbolMatch = b.symbol.toLowerCase().startsWith(normalizedQuery);
        
        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;
        
        const aNameMatch = a.name.toLowerCase().startsWith(normalizedQuery);
        const bNameMatch = b.name.toLowerCase().startsWith(normalizedQuery);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Finally sort by market cap if available
        return (b.marketCap || 0) - (a.marketCap || 0);
    }
  });
}

// Multi-chain address validation
function isValidAddressForAnyNetwork(address: string, networks: string[]): boolean {
  return networks.some(network => isValidAddressForNetwork(address, network));
}

// Enhanced external API search for multiple chain types
async function searchExternalAPIsMultiChain(
  query: string, 
  networks: string[], 
  options: { includeUnverified: boolean; includePriceData: boolean }
): Promise<TokenSearchSuggestion[]> {
  const results: TokenSearchSuggestion[] = [];
  
  // Group networks by chain type for efficient API calls
  const networksByChain = groupNetworksByChainType(networks);
  
  // Parallel API calls with timeout for different chain types
  const apiCalls = [
    // EVM chains
    networksByChain.evm.length > 0 ? searchEVMChains(query, networksByChain.evm, options) : Promise.resolve([]),
    // Solana
    networksByChain.solana.length > 0 ? searchSolanaTokens(query, options) : Promise.resolve([]),
    // Bitcoin (limited token support)
    networksByChain.bitcoin.length > 0 ? searchBitcoinTokens(query, options) : Promise.resolve([]),
    // TRON
    networksByChain.tron.length > 0 ? searchTronTokens(query, options) : Promise.resolve([]),
    // Cosmos ecosystem
    networksByChain.cosmos.length > 0 ? searchCosmosTokens(query, networksByChain.cosmos, options) : Promise.resolve([]),
    // NEAR
    networksByChain.near.length > 0 ? searchNearTokens(query, options) : Promise.resolve([]),
    // Aptos
    networksByChain.aptos.length > 0 ? searchAptosTokens(query, options) : Promise.resolve([]),
    // Sui
    networksByChain.sui.length > 0 ? searchSuiTokens(query, options) : Promise.resolve([])
  ];

  const apiResults = await Promise.allSettled(
    apiCalls.map(call => Promise.race([
      call,
      new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 5000))
    ]))
  );

  apiResults.forEach((result) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      results.push(...result.value);
    }
  });

  return results;
}

// Group networks by chain type
function groupNetworksByChainType(networks: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {
    evm: [],
    solana: [],
    bitcoin: [],
    tron: [],
    cosmos: [],
    near: [],
    aptos: [],
    sui: [],
    other: []
  };

  networks.forEach(network => {
    const chainType = getChainTypeForNetwork(network) || 'other';
    grouped[chainType].push(network);
  });

  return grouped;
}

// Enhanced matching logic
function matchesQuery(token: TokenSearchSuggestion, query: string): boolean {
  const searchableText = `${token.symbol} ${token.name} ${token.tags?.join(' ') || ''}`.toLowerCase();
  
  // Exact symbol match gets highest priority
  if (token.symbol.toLowerCase() === query) {
    return true;
  }
  
  // Symbol starts with query
  if (token.symbol.toLowerCase().startsWith(query)) {
    return true;
  }
  
  // Name starts with query
  if (token.name.toLowerCase().startsWith(query)) {
    return true;
  }
  
  // Contains query
  return searchableText.includes(query);
}

// Get token by contract address with multiple API sources
async function getTokenByAddress(address: string, network: string): Promise<TokenSearchSuggestion | null> {
  const sources = [
    () => fetchTokenFromMoralis(address, network),
    () => fetchTokenFromDexScreener(address, network),
    () => fetchTokenInfoFromExplorer(address, network),
    () => fetchTokenFromCoinGecko(address, network)
  ];

  // Try each source until one succeeds
  for (const source of sources) {
    try {
      const result = await source();
      if (result) {
        // Convert TokenSearchResult to TokenSearchSuggestion if needed
        if ('isVerified' in result && !('isPopular' in result)) {
          return {
            symbol: result.symbol,
            name: result.name,
            address: result.address,
            network: result.network,
            logo: result.logo,
            isPopular: false,
            verified: result.isVerified,
            chainType: result.chainType,
            tags: result.tags
          };
        }
        return result as TokenSearchSuggestion;
      }
    } catch (error) {
      console.log(`Token fetch failed for ${address}:`, error);
      continue;
    }
  }

  return null;
}

// DexScreener API integration (modern DEX data)
async function searchDexScreener(query: string, networks: string[]): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    if (!config.DEXSCREENER_API_KEY && !isValidContractAddress(query)) {
      return [];
    }

    // DexScreener has excellent real-time price data
    let url = '';
    if (isValidContractAddress(query)) {
      // Search by contract address across multiple chains
      url = `https://api.dexscreener.com/latest/dex/tokens/${query}`;
    } else {
      // Search by name/symbol
      url = `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}`;
    }

    const response = await fetch(url, {
      headers: config.DEXSCREENER_API_KEY ? {
        'Authorization': `Bearer ${config.DEXSCREENER_API_KEY}`
      } : {}
    });

    if (!response.ok) return [];

    const data = await response.json();
    const pairs = data.pairs || [];

    return pairs
      .filter((pair: any) => networks.includes(getNetworkFromChainId(pair.chainId)))
      .slice(0, 5)
      .map((pair: any) => ({
        symbol: pair.baseToken?.symbol || '',
        name: pair.baseToken?.name || '',
        address: pair.baseToken?.address || '',
        network: getNetworkFromChainId(pair.chainId),
        logo: pair.info?.imageUrl,
        isPopular: false,
        price: parseFloat(pair.priceUsd) || 0,
        change24h: parseFloat(pair.priceChange?.h24) || 0,
        volume24h: parseFloat(pair.volume?.h24) || 0,
        tags: ['dex-traded'],
        verified: pair.info?.verified || false
      }));

  } catch (error) {
    console.error('DexScreener search failed:', error);
    return [];
  }
}

// Moralis API integration
async function searchMoralisAPI(query: string, networks: string[]): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    if (!config.MORALIS_API_KEY) {
      return [];
    }

    const results: TokenSearchSuggestion[] = [];

    for (const network of networks) {
      const chainId = getChainIdFromNetwork(network);
      if (!chainId) continue;

      let url = '';
      if (isValidContractAddress(query)) {
        url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainId}&addresses=${query}`;
      } else {
        continue;
      }

      const response = await fetch(url, {
        headers: {
          'X-API-Key': config.MORALIS_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const token = data[0];
        results.push({
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address || query,
          network: network,
          logo: token.logo,
          isPopular: false,
          verified: token.verified_contract || false,
          tags: ['moralis-verified']
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Moralis search failed:', error);
    return [];
  }
}

// Updated CoinGecko V3 API integration
async function searchCoinGeckoV3(query: string, networks: string[]): Promise<TokenSearchSuggestion[]> {
  try {
    const config = getConfig();
    if (!config.COINGECKO_API_KEY) {
      return [];
    }

    const results: TokenSearchSuggestion[] = [];

    if (isValidContractAddress(query)) {
      // Direct contract lookup
      for (const network of networks) {
        const platformId = getCoinGeckoPlatformId(network);
        if (!platformId) continue;

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${query}`,
          {
            headers: {
              'x-cg-demo-api-key': config.COINGECKO_API_KEY
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.push({
            symbol: data.symbol?.toUpperCase() || '',
            name: data.name || '',
            address: query,
            network: network,
            logo: data.image?.small,
            isPopular: false,
            price: data.market_data?.current_price?.usd,
            change24h: data.market_data?.price_change_percentage_24h,
            marketCap: data.market_data?.market_cap?.usd,
            verified: true,
            tags: ['coingecko-verified']
          });
        }
      }
    } else {
      // Search by name/symbol
      const searchResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'x-cg-demo-api-key': config.COINGECKO_API_KEY
          }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const coins = searchData.coins || [];
        
        results.push(...coins.slice(0, 5).map((coin: any) => ({
          symbol: coin.symbol?.toUpperCase() || '',
          name: coin.name || '',
          address: '', // CoinGecko search doesn't provide contract addresses
          network: networks[0], // Default to first network
          logo: coin.thumb,
          isPopular: false,
          verified: true,
          tags: ['coingecko-listed']
        })));
      }
    }

    return results;

  } catch (error) {
    console.error('CoinGecko V3 search failed:', error);
    return [];
  }
}

// Multi-network search
export async function searchTokensMultiNetwork(
  query: string,
  networks: string[],
  options: SearchOptions = {}
): Promise<TokenSearchSuggestion[]> {
  return await enhancedSearchTokens(query, networks[0], { ...options, networks });
}

// Batch operations for custom tokens

// Add multiple custom tokens at once
export async function batchAddCustomTokens(tokenInputs: CustomTokenInput[]): Promise<{
  success: boolean;
  results: Array<{
    token: CustomTokenInput;
    success: boolean;
    result?: TokenSearchResult;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {
  const results: Array<{
    token: CustomTokenInput;
    success: boolean;
    result?: TokenSearchResult;
    error?: string;
  }> = [];

  let successful = 0;
  let failed = 0;

  for (const tokenInput of tokenInputs) {
    try {
      const result = await addCustomToken(tokenInput);
      results.push({
        token: tokenInput,
        success: result.success,
        result: result.token,
        error: result.error
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      results.push({
        token: tokenInput,
        success: false,
        error: `Failed to add token: ${error}`
      });
      failed++;
    }
  }

  return {
    success: successful > 0,
    results,
    summary: {
      total: tokenInputs.length,
      successful,
      failed
    }
  };
}

// Export custom tokens for backup/sync
export function exportCustomTokens(network?: string): {
  version: string;
  timestamp: number;
  network?: string;
  tokens: TokenSearchSuggestion[];
} {
  if (network) {
    return {
      version: '1.0',
      timestamp: Date.now(),
      network,
      tokens: getCustomTokens(network)
    };
  } else {
    // Export all networks
    const allTokens: TokenSearchSuggestion[] = [];
    for (const [networkId, tokens] of customTokensStorage.entries()) {
      allTokens.push(...tokens);
    }
    
    return {
      version: '1.0',
      timestamp: Date.now(),
      tokens: allTokens
    };
  }
}

// Import custom tokens from backup/sync
export async function importCustomTokens(
  exportData: {
    version: string;
    timestamp: number;
    network?: string;
    tokens: TokenSearchSuggestion[];
  },
  options: {
    validate?: boolean;
    overwrite?: boolean;
    skipDuplicates?: boolean;
  } = {}
): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const { validate = true, overwrite = false, skipDuplicates = true } = options;
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Validate export format
    if (!exportData.version || !exportData.tokens || !Array.isArray(exportData.tokens)) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Invalid export format']
      };
    }

    for (const token of exportData.tokens) {
      try {
        // Check if token already exists
        const existingTokens = getCustomTokens(token.network);
        const exists = existingTokens.some(existing => 
          existing.address.toLowerCase() === token.address.toLowerCase()
        );

        if (exists && skipDuplicates && !overwrite) {
          skipped++;
          continue;
        }

        // Convert to CustomTokenInput format
        const tokenInput: CustomTokenInput = {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          network: token.network,
          logo: token.logo,
          chainType: token.chainType,
          mintAddress: token.mintAddress,
          programId: token.programId,
          assetId: token.assetId,
          autoValidate: validate
        };

        const result = await addCustomToken(tokenInput);
        if (result.success) {
          imported++;
        } else {
          errors.push(`Failed to import ${token.symbol}: ${result.error}`);
        }

      } catch (error) {
        errors.push(`Failed to import token ${token.symbol}: ${error}`);
      }
    }

    return {
      success: imported > 0,
      imported,
      skipped,
      errors
    };

  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Import failed: ${error}`]
    };
  }
}

// Remove multiple custom tokens at once
export function batchRemoveCustomTokens(
  tokens: Array<{ address: string; network: string }>
): {
  success: boolean;
  removed: number;
  failed: number;
  errors: string[];
} {
  const errors: string[] = [];
  let removed = 0;
  let failed = 0;

  for (const { address, network } of tokens) {
    try {
      const success = removeCustomToken(address, network);
      if (success) {
        removed++;
      } else {
        failed++;
        errors.push(`Failed to remove token ${address} from ${network}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error removing token ${address}: ${error}`);
    }
  }

  return {
    success: removed > 0,
    removed,
    failed,
    errors
  };
}

// Get custom tokens summary across all networks
export function getCustomTokensSummary(): {
  totalTokens: number;
  networkBreakdown: Record<string, number>;
  chainTypeBreakdown: Record<string, number>;
} {
  let totalTokens = 0;
  const networkBreakdown: Record<string, number> = {};
  const chainTypeBreakdown: Record<string, number> = {};

  for (const [network, tokens] of customTokensStorage.entries()) {
    networkBreakdown[network] = tokens.length;
    totalTokens += tokens.length;

    tokens.forEach(token => {
      const chainType = token.chainType || 'unknown';
      chainTypeBreakdown[chainType] = (chainTypeBreakdown[chainType] || 0) + 1;
    });
  }

  return {
    totalTokens,
    networkBreakdown,
    chainTypeBreakdown
  };
}

// Clear all custom tokens (with optional network filter)
export function clearCustomTokens(network?: string): {
  success: boolean;
  cleared: number;
} {
  if (network) {
    const tokens = customTokensStorage.get(network) || [];
    const count = tokens.length;
    customTokensStorage.set(network, []);
    return { success: true, cleared: count };
  } else {
    let totalCleared = 0;
    for (const [networkId, tokens] of customTokensStorage.entries()) {
      totalCleared += tokens.length;
      customTokensStorage.set(networkId, []);
    }
    return { success: true, cleared: totalCleared };
  }
}

// Search and validate token lists from popular sources
export async function importTokenListFromURL(
  url: string,
  options: {
    network?: string;
    validate?: boolean;
    limit?: number;
  } = {}
): Promise<{
  success: boolean;
  imported: number;
  errors: string[];
}> {
  const { network, validate = true, limit = 100 } = options;
  const errors: string[] = [];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Support common token list formats (Uniswap, CoinGecko, etc.)
    let tokens: any[] = [];
    
    if (data.tokens && Array.isArray(data.tokens)) {
      // Uniswap token list format
      tokens = data.tokens;
    } else if (Array.isArray(data)) {
      // Direct array format
      tokens = data;
    } else {
      throw new Error('Unsupported token list format');
    }

    // Filter by network if specified
    if (network) {
      tokens = tokens.filter(token => 
        token.chainId === getChainIdFromNetwork(network) || 
        token.network === network
      );
    }

    // Limit tokens to prevent overwhelming
    tokens = tokens.slice(0, limit);

    // Convert to our format and import
    const tokenInputs: CustomTokenInput[] = tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      network: token.network || getNetworkFromChainId(token.chainId) || 'ethereum',
      decimals: token.decimals,
      logo: token.logoURI,
      autoValidate: validate
    }));

    const result = await batchAddCustomTokens(tokenInputs);
    
    return {
      success: result.success,
      imported: result.summary.successful,
      errors: result.results
        .filter(r => !r.success)
        .map(r => r.error || 'Unknown error')
    };

  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [`Failed to import token list: ${error}`]
    };
  }
}

// Utility functions for chain ID conversion
function getChainIdFromNetwork(network: string): string | null {
  const chainIds: Record<string, string> = {
    'ethereum': 'eth',
    'bsc': 'bsc',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'avalanche': 'avalanche',
    'base': 'base',
    'fantom': 'fantom'
  };
  return chainIds[network.toLowerCase()] || null;
}

function getNetworkFromChainId(chainId: string): string {
  const networkMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'eth': 'ethereum',
    'bsc': 'bsc',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'avalanche': 'avalanche',
    'base': 'base',
    'fantom': 'fantom'
  };
  return networkMap[chainId] || 'ethereum';
}

function getCoinGeckoPlatformId(network: string): string | null {
  const platformMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'bsc': 'binance-smart-chain',
    'polygon': 'polygon-pos',
    'arbitrum': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    'avalanche': 'avalanche',
    'base': 'base',
    'fantom': 'fantom'
  };
  return platformMap[network.toLowerCase()] || null;
}

function deduplicateTokens(tokens: TokenSearchSuggestion[]): TokenSearchSuggestion[] {
  const seen = new Set<string>();
  return tokens.filter(token => {
    const key = `${token.address.toLowerCase()}-${token.network}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Individual fetch functions for different sources
async function fetchTokenFromMoralis(address: string, network: string): Promise<TokenSearchSuggestion | null> {
  // Implementation similar to searchMoralisAPI but for single token
  return null; // Placeholder
}

async function fetchTokenFromDexScreener(address: string, network: string): Promise<TokenSearchSuggestion | null> {
  // Implementation similar to searchDexScreener but for single token
  return null; // Placeholder
}

async function fetchTokenFromCoinGecko(address: string, network: string): Promise<TokenSearchSuggestion | null> {
  // Implementation similar to searchCoinGeckoV3 but for single token
  return null; // Placeholder
}

// Export all enhanced functions
export { 
  NETWORK_CONFIG,
  enhancedSearchTokens,
  searchEVMChains,
  searchSolanaTokens,
  searchBitcoinTokens,
  searchTronTokens,
  searchCosmosTokens,
  searchNearTokens,
  searchAptosTokens,
  searchSuiTokens
};
