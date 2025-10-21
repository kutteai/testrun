import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';

const router = express.Router();

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

// Network configurations
const SUPPORTED_NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    type: 'evm',
  },
  bsc: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    rpc: process.env.BSC_RPC || 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    type: 'evm',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    chainId: 137,
    rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    type: 'evm',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    chainId: 42161,
    rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    type: 'evm',
  },
  optimism: {
    name: 'Optimism',
    symbol: 'ETH',
    chainId: 10,
    rpc: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    type: 'evm',
  },
  avalanche: {
    name: 'Avalanche',
    symbol: 'AVAX',
    chainId: 43114,
    rpc: process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    type: 'evm',
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    explorer: 'https://blockstream.info',
    type: 'utxo',
  },
  litecoin: {
    name: 'Litecoin',
    symbol: 'LTC',
    explorer: 'https://blockchair.com/litecoin',
    type: 'utxo',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    rpc: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://solscan.io',
    type: 'solana',
  },
};

// Get all supported networks
router.get('/', (req, res) => {
  try {
    const networks = Object.entries(SUPPORTED_NETWORKS).map(([id, config]) => ({
      id,
      ...config,
      isSupported: true,
    }));

    return res.json({ networks });
  } catch (error) {
    console.error('Get networks error:', error);
    return res.status(500).json({
      error: { message: 'Failed to get networks', status: 500 },
    });
  }
});

// Get specific network info
router.get('/:networkId', (req, res) => {
  try {
    const { networkId } = req.params;
    const network = SUPPORTED_NETWORKS[networkId.toLowerCase()];

    if (!network) {
      return res.status(404).json({
        error: { message: `Network ${networkId} not found`, status: 404 },
      });
    }

    return res.json({
      id: networkId,
      ...network,
      isSupported: true,
    });
  } catch (error) {
    console.error('Get network error:', error);
    return res.status(500).json({
      error: { message: 'Failed to get network info', status: 500 },
    });
  }
});

// Test network connection
router.post('/test', async (req, res) => {
  try {
    const { networkId, rpcUrl } = req.body;

    if (!networkId) {
      return res.status(400).json({
        error: { message: 'Network ID is required', status: 400 },
      });
    }

    const cacheKey = `test_${networkId}_${rpcUrl || 'default'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const network = SUPPORTED_NETWORKS[networkId.toLowerCase()];
    const testRpcUrl = rpcUrl || network?.rpc;

    if (!testRpcUrl) {
      return res.status(400).json({
        error: { message: 'No RPC URL available for network', status: 400 },
      });
    }

    const startTime = Date.now();
    let isConnected = false;
    let blockNumber = null;
    let errorMessage = null; // Renamed 'error' to 'errorMessage'

    try {
      if (network?.type === 'evm') {
        const response = await axios.post(testRpcUrl, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }, { timeout: 10000 });

        if (response.data.result) {
          isConnected = true;
          blockNumber = parseInt(response.data.result, 16);
        }
      } else if (network?.type === 'solana') {
        const response = await axios.post(testRpcUrl, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot',
        }, { timeout: 10000 });

        if (response.data.result !== undefined) {
          isConnected = true;
          blockNumber = response.data.result;
        }
      } else {
        // For non-RPC networks like Bitcoin, just test HTTP connectivity
        const response = await axios.get(testRpcUrl.replace('/api', ''), {
          timeout: 10000,
          validateStatus: () => true,
        });
        isConnected = response.status < 500;
      }
    } catch (err) {
      errorMessage = err.message;
    }

    const responseTime = Date.now() - startTime;

    const result = {
      networkId,
      rpcUrl: testRpcUrl,
      isConnected,
      responseTime,
      blockNumber,
      error: errorMessage, // Use errorMessage here
      timestamp: new Date().toISOString(),
    };

    // Cache successful connections for 1 minute
    if (isConnected) {
      cache.set(cacheKey, result, 60);
    }

    return res.json(result);
  } catch (error) {
    console.error('Network test error:', error);
    return res.status(500).json({
      error: { message: 'Network test failed', status: 500 },
    });
  }
});

// Add custom network (validation only - storage handled by frontend)
router.post('/validate', async (req, res) => {
  try {
    const {
      name, symbol, chainId, rpcUrl, explorerUrl,
    } = req.body;

    if (!name || !symbol || !rpcUrl) {
      return res.status(400).json({
        error: { message: 'Name, symbol, and RPC URL are required', status: 400 },
      });
    }

    // Test the RPC connection
    const testResult = await axios.post(`http://localhost:${process.env.PORT || 3001}/api/networks/test`, {
      networkId: 'custom',
      rpcUrl,
    });

    const validation = {
      isValid: testResult.data.isConnected,
      name,
      symbol,
      chainId,
      rpcUrl,
      explorerUrl,
      responseTime: testResult.data.responseTime,
      blockNumber: testResult.data.blockNumber,
      error: testResult.data.error,
      timestamp: new Date().toISOString(),
    };

    return res.json(validation);
  } catch (error) {
    console.error('Network validation error:', error);
    return res.status(500).json({
      error: { message: 'Network validation failed', status: 500 },
    });
  }
});

export default router;
