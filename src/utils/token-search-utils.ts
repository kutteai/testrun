// Token search and identification utilities for PayCio Wallet
import { getConfig } from './config-injector';

export interface TokenSearchResult {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  price?: number;
  change24h?: number;
  network: string;
  isVerified: boolean;
  source: 'coingecko' | 'explorer' | 'manual';
}

export interface TokenSearchSuggestion {
  symbol: string;
  name: string;
  address: string;
  network: string;
  logo?: string;
  isPopular: boolean;
}

// Popular tokens database
const POPULAR_TOKENS: Record<string, TokenSearchSuggestion[]> = {
  ethereum: [
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', network: 'ethereum', isPopular: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441b8c4C8C0e4b8b8c4C8C0e4b8b8c4', network: 'ethereum', isPopular: true },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', network: 'ethereum', isPopular: true },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', network: 'ethereum', isPopular: true },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', network: 'ethereum', isPopular: true },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', network: 'ethereum', isPopular: true },
    { symbol: 'AAVE', name: 'Aave Token', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', network: 'ethereum', isPopular: true },
    { symbol: 'CRV', name: 'Curve DAO Token', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', network: 'ethereum', isPopular: true },
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
    // 1. Search in popular tokens first
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
    
    // Determine the correct API endpoint based on network
    switch (network.toLowerCase()) {
      case 'bsc':
      case 'binance':
        apiUrl = 'https://api.bscscan.com/api';
        apiKey = config.BSCSCAN_API_KEY || '';
        break;
      case 'ethereum':
        apiUrl = 'https://api.etherscan.io/api';
        apiKey = config.ETHERSCAN_API_KEY || '';
        break;
      case 'polygon':
        apiUrl = 'https://api.polygonscan.com/api';
        apiKey = config.POLYGONSCAN_API_KEY || '';
        break;
      case 'arbitrum':
        apiUrl = 'https://api.arbiscan.io/api';
        apiKey = config.ARBITRUMSCAN_API_KEY || '';
        break;
      case 'optimism':
        apiUrl = 'https://api-optimistic.etherscan.io/api';
        apiKey = config.OPTIMISMSCAN_API_KEY || '';
        break;
      case 'avalanche':
        apiUrl = 'https://api.snowtrace.io/api';
        apiKey = config.SNOWTRACE_API_KEY || '';
        break;
      case 'base':
        apiUrl = 'https://api.basescan.org/api';
        apiKey = config.BASESCAN_API_KEY || '';
        break;
      case 'fantom':
        apiUrl = 'https://api.ftmscan.com/api';
        apiKey = config.FTMSCAN_API_KEY || '';
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
    
    if (!apiKey) {
      console.warn(`No API key for ${network} explorer`);
      return null;
    }
    
    // Fetch token info from explorer API
    const response = await fetch(
      `${apiUrl}?module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1' && data.result && data.result.length > 0) {
      const tokenInfo = data.result[0];
      return {
        address: tokenInfo.contractAddress || address,
        symbol: tokenInfo.symbol || '',
        name: tokenInfo.tokenName || '',
        decimals: parseInt(tokenInfo.divisor) || 18,
        network: network,
        isVerified: true,
        source: 'explorer'
      };
    } else {
      throw new Error(data.message || 'Token not found on explorer');
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
      return [];
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
        decimals: 18, // Default decimals
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

// Validate token contract
export async function validateTokenContract(address: string, network: string): Promise<boolean> {
  try {
    const tokenInfo = await fetchTokenInfoFromExplorer(address, network);
    return tokenInfo !== null;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
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
