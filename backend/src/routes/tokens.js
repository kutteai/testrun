import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { ethers } from 'ethers';

const router = express.Router();

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

// Network configurations
const NETWORKS = {
  ethereum: {
    rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    explorer: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  bsc: {
    rpc: process.env.BSC_RPC || 'https://bsc-dataseed1.binance.org',
    explorer: 'https://api.bscscan.com/api',
    apiKey: process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
  },
  polygon: {
    rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://api.polygonscan.com/api',
    apiKey: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
  },
};

// Helper functions (moved to top to avoid no-use-before-define)
// Validate via blockchain explorer
async function validateViaExplorer(address, networkConfig) {
  const response = await axios.get(networkConfig.explorer, {
    params: {
      module: 'token',
      action: 'tokeninfo',
      contractaddress: address,
      apikey: networkConfig.apiKey,
    },
    timeout: 10000,
  });

  const { data } = response;
  if (data.status === '1' && data.result && data.result.length > 0) {
    const tokenInfo = data.result[0];
    return {
      symbol: tokenInfo.symbol || '',
      name: tokenInfo.tokenName || '',
      decimals: parseInt(tokenInfo.divisor, 10) || 18,
      address: tokenInfo.contractAddress || address,
      totalSupply: tokenInfo.totalSupply || '0',
    };
  }

  throw new Error(data.message || 'Token not found');
}

// Validate via direct RPC call
async function validateViaRPC(address, networkConfig) {
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);

  // Check if contract exists
  const code = await provider.getCode(address);
  if (code === '0x') {
    throw new Error('No contract found at address');
  }

  // Try to get token info
  const tokenContract = new ethers.Contract(address, [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ], provider);

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply(),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(),
      address,
    };
  } catch (_err) {
    throw new Error('Contract does not implement ERC-20 interface');
  }
}

// Get detailed token info via explorer
async function getTokenInfoViaExplorer(address, networkConfig) {
  return validateViaExplorer(address, networkConfig);
}

// Get detailed token info via RPC
async function getTokenInfoViaRPC(address, networkConfig) {
  return validateViaRPC(address, networkConfig);
}

// Validate token contract
router.post('/validate', async (req, res) => {
  try {
    const { address, network } = req.body;

    if (!address || !network) {
      return res.status(400).json({
        error: { message: 'Address and network are required', status: 400 },
      });
    }

    const cacheKey = `validate_${network}_${address}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const networkConfig = NETWORKS[network.toLowerCase()];
    if (!networkConfig) {
      return res.status(400).json({
        error: { message: `Unsupported network: ${network}`, status: 400 },
      });
    }

    let tokenInfo = null;
    let validationMethod = 'none';

    // Method 1: Try explorer API
    if (networkConfig.apiKey) {
      try {
        tokenInfo = await validateViaExplorer(address, networkConfig);
        validationMethod = 'explorer';
      } catch (_err) {
        console.warn('Explorer validation failed:', _err.message);
      }
    }

    // Method 2: Try direct RPC
    if (!tokenInfo) {
      try {
        tokenInfo = await validateViaRPC(address, networkConfig);
        validationMethod = 'rpc';
      } catch (_err) {
        console.warn('RPC validation failed:', _err.message);
      }
    }

    const result = {
      isValid: !!tokenInfo,
      tokenInfo,
      validationMethod,
      network,
      address,
    };

    // Cache successful results
    if (result.isValid) {
      cache.set(cacheKey, result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      error: { message: 'Token validation failed', status: 500 },
    });
  }
});

// Get token information
router.get('/:network/:address', async (req, res) => {
  try {
    const { network, address } = req.params;

    const cacheKey = `token_${network}_${address}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const networkConfig = NETWORKS[network.toLowerCase()];
    if (!networkConfig) {
      return res.status(400).json({
        error: { message: `Unsupported network: ${network}`, status: 400 },
      });
    }

    let tokenInfo = null;

    // Try explorer first, then RPC
    if (networkConfig.apiKey) {
      try {
        tokenInfo = await getTokenInfoViaExplorer(address, networkConfig);
      } catch (_err) {
        console.warn('Explorer failed, trying RPC:', _err.message);
      }
    }

    if (!tokenInfo) {
      tokenInfo = await getTokenInfoViaRPC(address, networkConfig);
    }

    if (tokenInfo) {
      cache.set(cacheKey, tokenInfo);
    }

    return res.json(tokenInfo || { error: 'Token not found' });
  } catch (error) {
    console.error('Get token info error:', error);
    return res.status(500).json({
      error: { message: 'Failed to get token information', status: 500 },
    });
  }
});

export default router;
