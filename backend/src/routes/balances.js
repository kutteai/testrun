const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const { ethers } = require('ethers');
const router = express.Router();

// Cache for 1 minute (balances change frequently)
const cache = new NodeCache({ stdTTL: 60 });

// Network configurations
const NETWORKS = {
  ethereum: { rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com' },
  bsc: { rpc: process.env.BSC_RPC || 'https://bsc-dataseed1.binance.org' },
  polygon: { rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com' },
  arbitrum: { rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc' },
  optimism: { rpc: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io' },
  avalanche: { rpc: process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc' }
};

// Get native token balance
router.get('/native/:network/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    const cacheKey = `balance_native_${network}_${address}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const networkConfig = NETWORKS[network.toLowerCase()];
    if (!networkConfig) {
      return res.status(400).json({
        error: { message: `Unsupported network: ${network}`, status: 400 }
      });
    }

    let balance = '0';
    
    // Handle different network types
    switch (network.toLowerCase()) {
      case 'bitcoin':
        balance = await getBitcoinBalance(address);
        break;
      case 'litecoin':
        balance = await getLitecoinBalance(address);
        break;
      case 'solana':
        balance = await getSolanaBalance(address);
        break;
      default:
        // EVM networks
        balance = await getEvmBalance(address, networkConfig.rpc);
    }

    const result = {
      network,
      address,
      balance,
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.json({
      network: req.params.network,
      address: req.params.address,
      balance: '0',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get token balance
router.get('/token/:network/:tokenAddress/:walletAddress', async (req, res) => {
  try {
    const { network, tokenAddress, walletAddress } = req.params;
    
    const cacheKey = `balance_token_${network}_${tokenAddress}_${walletAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const networkConfig = NETWORKS[network.toLowerCase()];
    if (!networkConfig) {
      return res.status(400).json({
        error: { message: `Unsupported network: ${network}`, status: 400 }
      });
    }

    const balance = await getTokenBalance(tokenAddress, walletAddress, networkConfig.rpc);

    const result = {
      network,
      tokenAddress,
      walletAddress,
      balance,
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Token balance fetch error:', error);
    res.json({
      network: req.params.network,
      tokenAddress: req.params.tokenAddress,
      walletAddress: req.params.walletAddress,
      balance: '0',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get multiple balances in one call
router.post('/batch', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        error: { message: 'Requests must be an array', status: 400 }
      });
    }

    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const { type, network, address, tokenAddress } = request;
        
        if (type === 'native') {
          const response = await axios.get(`http://localhost:${process.env.PORT || 3001}/api/balances/native/${network}/${address}`);
          return response.data;
        } else if (type === 'token') {
          const response = await axios.get(`http://localhost:${process.env.PORT || 3001}/api/balances/token/${network}/${tokenAddress}/${address}`);
          return response.data;
        }
        
        throw new Error('Invalid request type');
      })
    );

    const balances = results.map((result, index) => ({
      request: requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    res.json({ balances });
  } catch (error) {
    console.error('Batch balance fetch error:', error);
    res.status(500).json({
      error: { message: 'Batch balance fetch failed', status: 500 }
    });
  }
});

// Helper functions
async function getEvmBalance(address, rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

async function getTokenBalance(tokenAddress, walletAddress, rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const tokenContract = new ethers.Contract(tokenAddress, [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ], provider);

  const [balance, decimals] = await Promise.all([
    tokenContract.balanceOf(walletAddress),
    tokenContract.decimals()
  ]);

  return ethers.formatUnits(balance, decimals);
}

async function getBitcoinBalance(address) {
  try {
    const response = await axios.get(`https://blockstream.info/api/address/${address}`, { timeout: 10000 });
    const data = response.data;
    const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    const balanceBTC = balanceSatoshis / 100000000;
    return balanceBTC.toFixed(8);
  } catch (error) {
    return '0';
  }
}

async function getLitecoinBalance(address) {
  try {
    const response = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`, { timeout: 10000 });
    const data = response.data;
    const balanceLTC = data.balance / 100000000;
    return balanceLTC.toFixed(8);
  } catch (error) {
    return '0';
  }
}

async function getSolanaBalance(address) {
  try {
    const response = await axios.post('https://api.mainnet-beta.solana.com', {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    }, { timeout: 10000 });
    
    const balanceSOL = (response.data.result?.value || 0) / 1000000000;
    return balanceSOL.toFixed(9);
  } catch (error) {
    return '0';
  }
}

module.exports = router;
