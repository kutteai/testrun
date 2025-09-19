const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const router = express.Router();

// Cache for 2 minutes (prices change frequently)
const cache = new NodeCache({ stdTTL: 120 });

// Get token price
router.get('/:network/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    const cacheKey = `price_${network}_${address}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let price = null;
    let source = 'none';

    // Try CoinGecko first
    if (process.env.COINGECKO_API_KEY) {
      try {
        price = await getPriceFromCoinGecko(address, network);
        source = 'coingecko';
      } catch (error) {
        console.warn('CoinGecko price fetch failed:', error.message);
      }
    }

    // Fallback to CoinMarketCap
    if (!price && process.env.COINMARKETCAP_API_KEY) {
      try {
        price = await getPriceFromCoinMarketCap(address, network);
        source = 'coinmarketcap';
      } catch (error) {
        console.warn('CoinMarketCap price fetch failed:', error.message);
      }
    }

    // Fallback to DEX price APIs
    if (!price) {
      try {
        price = await getPriceFromDEX(address, network);
        source = 'dex';
      } catch (error) {
        console.warn('DEX price fetch failed:', error.message);
      }
    }

    const result = {
      network,
      address,
      price: price || 0,
      source,
      timestamp: new Date().toISOString()
    };

    // Cache successful results
    if (price) {
      cache.set(cacheKey, result);
    }

    res.json(result);
  } catch (error) {
    console.error('Price fetch error:', error);
    res.json({
      network: req.params.network,
      address: req.params.address,
      price: 0,
      source: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get multiple prices in one call
router.post('/batch', async (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens)) {
      return res.status(400).json({
        error: { message: 'Tokens must be an array', status: 400 }
      });
    }

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const { network, address } = token;
        const response = await axios.get(`http://localhost:${process.env.PORT || 3001}/api/prices/${network}/${address}`);
        return response.data;
      })
    );

    const prices = results.map((result, index) => ({
      token: tokens[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    res.json({ prices });
  } catch (error) {
    console.error('Batch price fetch error:', error);
    res.status(500).json({
      error: { message: 'Batch price fetch failed', status: 500 }
    });
  }
});

// Get native token prices
router.get('/native/:symbols', async (req, res) => {
  try {
    const symbols = req.params.symbols.split(',');
    
    const cacheKey = `native_prices_${symbols.join('_')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const prices = await getNativePrices(symbols);
    
    const result = {
      prices,
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Native price fetch error:', error);
    res.status(500).json({
      error: { message: 'Native price fetch failed', status: 500 }
    });
  }
});

// Helper functions
async function getPriceFromCoinGecko(address, network) {
  const platformMap = {
    ethereum: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
    arbitrum: 'arbitrum-one',
    optimism: 'optimistic-ethereum',
    avalanche: 'avalanche'
  };

  const platform = platformMap[network.toLowerCase()];
  if (!platform) {
    throw new Error(`Unsupported network for CoinGecko: ${network}`);
  }

  const response = await axios.get('https://api.coingecko.com/api/v3/simple/token_price/' + platform, {
    params: {
      contract_addresses: address,
      vs_currencies: 'usd',
      x_cg_pro_api_key: process.env.COINGECKO_API_KEY
    },
    timeout: 10000
  });

  const data = response.data;
  const tokenData = data[address.toLowerCase()];
  if (!tokenData || !tokenData.usd) {
    throw new Error('Price not found');
  }

  return tokenData.usd;
}

async function getPriceFromCoinMarketCap(address, network) {
  // CoinMarketCap implementation
  throw new Error('CoinMarketCap integration not implemented');
}

async function getPriceFromDEX(address, network) {
  // Try different DEX APIs based on network
  switch (network.toLowerCase()) {
    case 'ethereum':
      return await getPriceFromUniswap(address);
    case 'bsc':
      return await getPriceFromPancakeSwap(address);
    case 'polygon':
      return await getPriceFromQuickSwap(address);
    default:
      throw new Error(`No DEX price source for ${network}`);
  }
}

async function getPriceFromUniswap(address) {
  // Simplified Uniswap price fetch via DexScreener
  const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
    timeout: 10000
  });

  const data = response.data;
  if (data.pairs && data.pairs.length > 0) {
    const pair = data.pairs[0];
    return parseFloat(pair.priceUsd) || 0;
  }

  throw new Error('Price not found on DEX');
}

async function getPriceFromPancakeSwap(address) {
  return await getPriceFromUniswap(address); // DexScreener supports BSC too
}

async function getPriceFromQuickSwap(address) {
  return await getPriceFromUniswap(address); // DexScreener supports Polygon too
}

async function getNativePrices(symbols) {
  const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: {
      ids: symbols.join(','),
      vs_currencies: 'usd',
      x_cg_pro_api_key: process.env.COINGECKO_API_KEY
    },
    timeout: 10000
  });

  return response.data;
}

module.exports = router;
