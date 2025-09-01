import { ethers } from 'ethers';
import { getConfig } from './config';

// ERC-20 Token ABI for balanceOf function
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
];

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  price?: number;
}

// Get real token balance from blockchain
export async function getTokenBalance(
  tokenAddress: string, 
  walletAddress: string, 
  rpcUrl: string
): Promise<TokenBalance | null> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get token metadata
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);
    
    // Only return tokens with balance > 0
    const balanceValue = ethers.formatUnits(balance, decimals);
    if (parseFloat(balanceValue) > 0) {
      return {
        address: tokenAddress,
        symbol,
        name,
        balance: balanceValue,
        decimals
      };
    }
    
    return null; // No balance
  } catch (error) {
    console.error(`Error fetching balance for token ${tokenAddress}:`, error);
    return null;
  }
}

// Get token price from CoinGecko API
export async function getTokenPrice(tokenAddress: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch token price');
    }
    
    const data = await response.json();
    return data[tokenAddress.toLowerCase()]?.usd || null;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

// Get popular token addresses for auto-detection
export const POPULAR_TOKENS = [
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6
  },
  {
    address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18
  },
  {
    address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 18
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18
  },
  {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18
  }
];

// Auto-detect tokens with balances for a wallet address (only > 0 balances)
export async function detectTokensWithBalances(
  walletAddress: string,
  rpcUrl: string
): Promise<TokenBalance[]> {
  console.log('🔍 Auto-detecting tokens with balances > 0 for:', walletAddress);
  
  const tokensWithBalances: TokenBalance[] = [];
  
  // Check popular tokens
  for (const token of POPULAR_TOKENS) {
    try {
      const balance = await getTokenBalance(token.address, walletAddress, rpcUrl);
      if (balance && parseFloat(balance.balance) > 0) {
        // Get price
        const price = await getTokenPrice(token.address);
        if (price) {
          balance.price = price;
        }
        
        tokensWithBalances.push(balance);
        console.log(`✅ Found ${balance.symbol}: ${balance.balance}`);
      }
    } catch (error) {
      console.error(`Error checking ${token.symbol}:`, error);
    }
  }
  
  console.log(`🎯 Found ${tokensWithBalances.length} tokens with balances > 0`);
  return tokensWithBalances;
}

// Get all popular tokens with real balances (including 0 balances)
export async function getAllPopularTokens(
  walletAddress: string,
  rpcUrl: string
): Promise<TokenBalance[]> {
  console.log('🔍 Getting all popular tokens for:', walletAddress);
  
  const allTokens: TokenBalance[] = [];
  
  // Check popular tokens
  for (const token of POPULAR_TOKENS) {
    try {
      const balance = await getTokenBalance(token.address, walletAddress, rpcUrl);
      if (balance) {
        // Get price
        const price = await getTokenPrice(token.address);
        if (price) {
          balance.price = price;
        }
        
        allTokens.push(balance);
        console.log(`✅ ${balance.symbol}: ${balance.balance}`);
      }
    } catch (error) {
      console.error(`Error checking ${token.symbol}:`, error);
      // Add token with 0 balance if we can't fetch it
      allTokens.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        balance: '0',
        decimals: token.decimals,
        price: 0
      });
    }
  }
  
  console.log(`🎯 Found ${allTokens.length} tokens total`);
  return allTokens;
}

// Get network RPC URL
export function getNetworkRPCUrl(network: string): string {
  const config = getConfig();
  
  const rpcUrls: Record<string, string> = {
    ethereum: `https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID}`,
    bsc: 'https://bsc-dataseed1.binance.org/',
    polygon: 'https://polygon-rpc.com/',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io/',
    base: 'https://mainnet.base.org/',
    fantom: 'https://rpc.ftm.tools/',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    zksync: 'https://mainnet.era.zksync.io',
    linea: 'https://rpc.linea.build',
    mantle: 'https://rpc.mantle.xyz',
    scroll: 'https://rpc.scroll.io',
    'polygon-zkevm': 'https://zkevm-rpc.com',
    'arbitrum-nova': 'https://nova.arbitrum.io/rpc'
  };
  
  return rpcUrls[network] || rpcUrls.ethereum;
}
