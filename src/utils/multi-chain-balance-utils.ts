// Multi-chain token balance utilities for PayCio Wallet
import { ethers } from 'ethers';
import { getConfig } from './config-injector';
import { getChainTypeForNetwork, NETWORK_CONFIG } from './token-search-utils';

// Enhanced TokenBalance interface with multi-chain support
export interface MultiChainTokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  network: string;
  chainType: 'evm' | 'solana' | 'bitcoin' | 'tron' | 'cosmos' | 'near' | 'aptos' | 'sui' | 'other';
  price?: number;
  usdValue?: number;
  // Chain-specific fields
  mintAddress?: string; // Solana SPL tokens
  programId?: string; // Solana programs
  assetId?: string; // Other chains
  isNative?: boolean; // Native token (ETH, SOL, BTC, etc.)
}

// ERC-20 Token ABI for EVM chains
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

// Network RPC URLs with multi-chain support
export function getNetworkRPCUrl(network: string): string | null {
  const config = getConfig();
  
  const rpcUrls: Record<string, string> = {
    // EVM Networks
    ethereum: config.ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID}` || 'https://eth.llamarpc.com',
    bsc: config.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
    polygon: config.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
    arbitrum: config.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    optimism: config.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io/',
    base: config.BASE_RPC_URL || 'https://mainnet.base.org/',
    fantom: config.FANTOM_RPC_URL || 'https://rpc.ftm.tools/',
    avalanche: config.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    
    // Non-EVM Networks
    solana: config.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    bitcoin: config.BITCOIN_RPC_URL || 'https://blockstream.info/api',
    tron: config.TRON_RPC_URL || 'https://api.trongrid.io',
    near: config.NEAR_RPC_URL || 'https://rpc.mainnet.near.org',
    cosmos: config.COSMOS_RPC_URL || 'https://cosmos-rpc.quickapi.com',
    aptos: config.APTOS_RPC_URL || 'https://fullnode.mainnet.aptoslabs.com/v1',
    sui: config.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io'
  };
  
  return rpcUrls[network] || null;
}

// Get token balance for any supported chain
export async function getMultiChainTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const chainType = getChainTypeForNetwork(network);
  if (!chainType) {
    console.error(`Unsupported network: ${network}`);
    return null;
  }

  try {
    switch (chainType) {
      case 'evm':
        return await getEVMTokenBalance(tokenAddress, walletAddress, network);
      case 'solana':
        return await getSolanaTokenBalance(tokenAddress, walletAddress, network);
      case 'bitcoin':
        return await getBitcoinTokenBalance(tokenAddress, walletAddress, network);
      case 'tron':
        return await getTronTokenBalance(tokenAddress, walletAddress, network);
      case 'cosmos':
        return await getCosmosTokenBalance(tokenAddress, walletAddress, network);
      case 'near':
        return await getNearTokenBalance(tokenAddress, walletAddress, network);
      case 'aptos':
        return await getAptosTokenBalance(tokenAddress, walletAddress, network);
      case 'sui':
        return await getSuiTokenBalance(tokenAddress, walletAddress, network);
      default:
        console.error(`Balance fetching not implemented for chain type: ${chainType}`);
        return null;
    }
  } catch (error) {
    console.error(`Error fetching balance for ${tokenAddress} on ${network}:`, error);
    return null;
  }
}

// EVM token balance (existing functionality enhanced)
async function getEVMTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Handle native tokens (ETH, BNB, MATIC, etc.)
    if (tokenAddress.toLowerCase() === 'native' || tokenAddress === '0x0000000000000000000000000000000000000000') {
      const balance = await provider.getBalance(walletAddress);
      const networkConfig = NETWORK_CONFIG[network];
      
      return {
        address: 'native',
        symbol: networkConfig?.nativeToken || 'ETH',
        name: `${networkConfig?.nativeToken || 'Ethereum'} Native Token`,
        balance: ethers.formatEther(balance),
        decimals: 18,
        network,
        chainType: 'evm',
        isNative: true
      };
    }

    // ERC-20 tokens
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);
    
    const balanceValue = ethers.formatUnits(balance, decimals);
    
    return {
      address: tokenAddress,
      symbol,
      name,
      balance: balanceValue,
      decimals: Number(decimals),
      network,
      chainType: 'evm'
    };
    
  } catch (error) {
    console.error(`EVM balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Solana SPL token balance
async function getSolanaTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Handle native SOL
    if (tokenAddress.toLowerCase() === 'native' || tokenAddress === 'So11111111111111111111111111111111111111112') {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [walletAddress]
        })
      });

      const data = await response.json();
      if (data.result) {
        const balance = (data.result.value / 1e9).toString(); // Convert lamports to SOL
        
        return {
          address: 'native',
          symbol: 'SOL',
          name: 'Solana',
          balance,
          decimals: 9,
          network,
          chainType: 'solana',
          isNative: true
        };
      }
    }

    // SPL tokens
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: tokenAddress },
          { encoding: 'jsonParsed' }
        ]
      })
    });

    const data = await response.json();
    if (data.result?.value?.length > 0) {
      const tokenAccount = data.result.value[0];
      const tokenInfo = tokenAccount.account.data.parsed.info;
      
      // Get token metadata
      const metadataResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [tokenAddress, { encoding: 'jsonParsed' }]
        })
      });

      const metadataData = await metadataResponse.json();
      const decimals = metadataData.result?.value?.data?.parsed?.info?.decimals || 9;
      
      const balance = (parseInt(tokenInfo.tokenAmount.amount) / Math.pow(10, decimals)).toString();
      
      return {
        address: tokenAddress,
        symbol: tokenInfo.tokenAmount.uiAmountString ? 'SPL' : 'UNKNOWN',
        name: 'SPL Token',
        balance,
        decimals,
        network,
        chainType: 'solana',
        mintAddress: tokenAddress
      };
    }

    return null;
    
  } catch (error) {
    console.error(`Solana balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Bitcoin balance (limited to native BTC and Omni Layer)
async function getBitcoinTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native BTC
    if (tokenAddress.toLowerCase() === 'native' || tokenAddress === 'bitcoin') {
      const response = await fetch(`${rpcUrl}/address/${walletAddress}`);
      const data = await response.json();
      
      if (data.chain_stats) {
        const balance = (data.chain_stats.funded_txo_sum / 1e8).toString(); // Convert satoshis to BTC
        
        return {
          address: 'native',
          symbol: 'BTC',
          name: 'Bitcoin',
          balance,
          decimals: 8,
          network,
          chainType: 'bitcoin',
          isNative: true
        };
      }
    }

    // Omni Layer tokens (like USDT)
    if (tokenAddress === '31') { // USDT Omni property ID
      // Note: This would require specialized Omni Layer API integration
      // For now, return a placeholder
      return {
        address: tokenAddress,
        symbol: 'USDT',
        name: 'Tether USD (Omni)',
        balance: '0', // Would need Omni Layer API
        decimals: 8,
        network,
        chainType: 'bitcoin',
        assetId: tokenAddress
      };
    }

    return null;
    
  } catch (error) {
    console.error(`Bitcoin balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// TRON TRC-20 token balance
async function getTronTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const config = getConfig();
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native TRX
    if (tokenAddress.toLowerCase() === 'native' || tokenAddress.toLowerCase().includes('tron')) {
      const response = await fetch(`${rpcUrl}/v1/accounts/${walletAddress}`, {
        headers: config.TRON_API_KEY ? {
          'TRON-PRO-API-KEY': config.TRON_API_KEY
        } : {}
      });

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const balance = (data.data[0].balance / 1e6).toString(); // Convert sun to TRX
        
        return {
          address: 'native',
          symbol: 'TRX',
          name: 'TRON',
          balance,
          decimals: 6,
          network,
          chainType: 'tron',
          isNative: true
        };
      }
    }

    // TRC-20 tokens
    const response = await fetch(`${rpcUrl}/v1/accounts/${walletAddress}/transactions/trc20`, {
      headers: config.TRON_API_KEY ? {
        'TRON-PRO-API-KEY': config.TRON_API_KEY
      } : {}
    });

    const data = await response.json();
    if (data.data) {
      // This would require more sophisticated TRC-20 balance checking
      // For now, return a placeholder
      return {
        address: tokenAddress,
        symbol: 'TRC20',
        name: 'TRC-20 Token',
        balance: '0', // Would need proper TRC-20 balance API
        decimals: 6,
        network,
        chainType: 'tron'
      };
    }

    return null;
    
  } catch (error) {
    console.error(`TRON balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Cosmos ecosystem token balance
async function getCosmosTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native ATOM
    if (tokenAddress === 'uatom' || tokenAddress.toLowerCase() === 'native') {
      const response = await fetch(`${rpcUrl}/cosmos/bank/v1beta1/balances/${walletAddress}`);
      const data = await response.json();
      
      if (data.balances) {
        const atomBalance = data.balances.find((b: any) => b.denom === 'uatom');
        if (atomBalance) {
          const balance = (parseInt(atomBalance.amount) / 1e6).toString(); // Convert uatom to ATOM
          
          return {
            address: 'uatom',
            symbol: 'ATOM',
            name: 'Cosmos Hub',
            balance,
            decimals: 6,
            network,
            chainType: 'cosmos',
            isNative: true
          };
        }
      }
    }

    return null;
    
  } catch (error) {
    console.error(`Cosmos balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// NEAR token balance
async function getNearTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native NEAR
    if (tokenAddress === 'near' || tokenAddress.toLowerCase() === 'native') {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'view_account',
            finality: 'final',
            account_id: walletAddress
          }
        })
      });

      const data = await response.json();
      if (data.result) {
        const balance = (parseInt(data.result.amount) / 1e24).toString(); // Convert yoctoNEAR to NEAR
        
        return {
          address: 'native',
          symbol: 'NEAR',
          name: 'NEAR Protocol',
          balance,
          decimals: 24,
          network,
          chainType: 'near',
          isNative: true
        };
      }
    }

    return null;
    
  } catch (error) {
    console.error(`NEAR balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Aptos token balance
async function getAptosTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native APT
    if (tokenAddress.includes('aptos_coin') || tokenAddress.toLowerCase() === 'native') {
      const response = await fetch(`${rpcUrl}/accounts/${walletAddress}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`);
      const data = await response.json();
      
      if (data.data) {
        const balance = (parseInt(data.data.coin.value) / 1e8).toString(); // Convert to APT
        
        return {
          address: 'native',
          symbol: 'APT',
          name: 'Aptos',
          balance,
          decimals: 8,
          network,
          chainType: 'aptos',
          isNative: true
        };
      }
    }

    return null;
    
  } catch (error) {
    console.error(`Aptos balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Sui token balance
async function getSuiTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string
): Promise<MultiChainTokenBalance | null> {
  const rpcUrl = getNetworkRPCUrl(network);
  if (!rpcUrl) return null;

  try {
    // Native SUI
    if (tokenAddress.includes('sui::SUI') || tokenAddress.toLowerCase() === 'native') {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_getBalance',
          params: [walletAddress]
        })
      });

      const data = await response.json();
      if (data.result) {
        const balance = (parseInt(data.result.totalBalance) / 1e9).toString(); // Convert to SUI
        
        return {
          address: 'native',
          symbol: 'SUI',
          name: 'Sui',
          balance,
          decimals: 9,
          network,
          chainType: 'sui',
          isNative: true
        };
      }
    }

    return null;
    
  } catch (error) {
    console.error(`Sui balance fetch failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Get token price from CoinGecko API with multi-chain support
export async function getMultiChainTokenPrice(
  tokenAddress: string,
  network: string,
  chainType: string
): Promise<number | null> {
  try {
    const config = getConfig();
    
    // Handle native tokens
    if (tokenAddress === 'native' || tokenAddress.toLowerCase().includes('native')) {
      const nativeTokenIds: Record<string, string> = {
        ethereum: 'ethereum',
        bsc: 'binancecoin',
        polygon: 'matic-network',
        arbitrum: 'ethereum', // ETH on Arbitrum
        optimism: 'ethereum', // ETH on Optimism
        avalanche: 'avalanche-2',
        base: 'ethereum', // ETH on Base
        fantom: 'fantom',
        solana: 'solana',
        bitcoin: 'bitcoin',
        tron: 'tron',
        near: 'near',
        cosmos: 'cosmos',
        aptos: 'aptos',
        sui: 'sui'
      };

      const tokenId = nativeTokenIds[network];
      if (tokenId) {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`,
          {
            headers: config.COINGECKO_API_KEY ? {
              'x-cg-demo-api-key': config.COINGECKO_API_KEY
            } : {}
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data[tokenId]?.usd || null;
        }
      }
    }

    // Handle contract addresses for EVM chains
    if (chainType === 'evm') {
      const platformIds: Record<string, string> = {
        ethereum: 'ethereum',
        bsc: 'binance-smart-chain',
        polygon: 'polygon-pos',
        arbitrum: 'arbitrum-one',
        optimism: 'optimistic-ethereum',
        avalanche: 'avalanche',
        base: 'base',
        fantom: 'fantom'
      };

      const platformId = platformIds[network];
      if (platformId) {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/token_price/${platformId}?contract_addresses=${tokenAddress}&vs_currencies=usd`,
          {
            headers: config.COINGECKO_API_KEY ? {
              'x-cg-demo-api-key': config.COINGECKO_API_KEY
            } : {}
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data[tokenAddress.toLowerCase()]?.usd || null;
        }
      }
    }

    return null;
    
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

// Auto-detect tokens with balances for any supported chain
export async function detectMultiChainTokensWithBalances(
  walletAddress: string,
  network: string,
  tokenList?: string[]
): Promise<MultiChainTokenBalance[]> {
  console.log(`🔍 Auto-detecting tokens with balances on ${network} for:`, walletAddress);
  
  const tokensWithBalances: MultiChainTokenBalance[] = [];
  const chainType = getChainTypeForNetwork(network);
  
  if (!chainType) {
    console.error(`Unsupported network: ${network}`);
    return [];
  }

  try {
    // Always check native token first
    const nativeBalance = await getMultiChainTokenBalance('native', walletAddress, network);
    if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
      const price = await getMultiChainTokenPrice('native', network, chainType);
      if (price) {
        nativeBalance.price = price;
        nativeBalance.usdValue = parseFloat(nativeBalance.balance) * price;
      }
      tokensWithBalances.push(nativeBalance);
      console.log(`✅ Found ${nativeBalance.symbol}: ${nativeBalance.balance}`);
    }

    // Check provided token list or popular tokens
    const tokensToCheck = tokenList || getPopularTokensForNetwork(network);
    
    for (const tokenAddress of tokensToCheck) {
      try {
        const balance = await getMultiChainTokenBalance(tokenAddress, walletAddress, network);
        if (balance && parseFloat(balance.balance) > 0) {
          const price = await getMultiChainTokenPrice(tokenAddress, network, chainType);
          if (price) {
            balance.price = price;
            balance.usdValue = parseFloat(balance.balance) * price;
          }
          
          tokensWithBalances.push(balance);
          console.log(`✅ Found ${balance.symbol}: ${balance.balance}`);
        }
      } catch (error) {
        console.error(`Error checking token ${tokenAddress}:`, error);
      }
    }
    
  } catch (error) {
    console.error(`Error detecting tokens on ${network}:`, error);
  }

  console.log(`🎯 Found ${tokensWithBalances.length} tokens with balances on ${network}`);
  return tokensWithBalances;
}

// Get popular tokens for a specific network
function getPopularTokensForNetwork(network: string): string[] {
  const popularTokens: Record<string, string[]> = {
    ethereum: [
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0xA0b86a33E6441b8C4C8C0e4b8b8c4C8C0e4b8b8c4', // USDC
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
      '0x514910771AF9Ca656af840dff83E8264EcF986CA'  // LINK
    ],
    bsc: [
      '0x55d398326f99059fF775485246999027B3197955', // USDT
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
      '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'  // CAKE
    ],
    polygon: [
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'  // USDC
    ],
    solana: [
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'  // RAY
    ],
    tron: [
      'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT
    ],
    bitcoin: [
      '31' // USDT Omni
    ]
  };

  return popularTokens[network] || [];
}

// Export main functions
export {
  getMultiChainTokenBalance,
  getMultiChainTokenPrice,
  detectMultiChainTokensWithBalances,
  getPopularTokensForNetwork
};
