require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const router = express.Router();

// Cache for 2 minutes (prices change frequently)
const cache = new NodeCache({ stdTTL: 120 });

// Helper to map network names to CoinGecko platform IDs
const platformMap = {
  ethereum: 'ethereum',
  bsc: 'binance-smart-chain',
  polygon: 'polygon-pos',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  avalanche: 'avalanche',
  // Add other networks as needed
};

/**
 * Fetches token price from CoinGecko API.
 * @param {string} contractAddress - The contract address of the token.
 * @param {string} network - The network of the token (e.g., 'ethereum', 'bsc').
 * @returns {Promise<number|null>} The price of the token in USD, or null if not found/error.
 */
async function getPriceFromCoinGecko(contractAddress, network) {
  const platform = platformMap[network.toLowerCase()];
  if (!platform) {
    console.warn(`CoinGecko: Unsupported network: ${network}`);
    return null;
  }

  const cacheKey = `coingecko-${network}-${contractAddress}`;
  const cachedPrice = cache.get(cacheKey);
  if (cachedPrice) {
    return cachedPrice;
  }

  try {
  const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${platform}`, {
    params: {
        contract_addresses: contractAddress,
      vs_currencies: 'usd',
        x_cg_pro_api_key: process.env.COINGECKO_API_KEY, // Use API key if available
    },
      timeout: 10000, // 10 seconds timeout
  });

  const { data } = response;
    const tokenData = data[contractAddress.toLowerCase()];
  if (!tokenData || !tokenData.usd) {
      console.warn(`CoinGecko: Price data for ${contractAddress} on ${network} not found.`);
      return null;
    }

    const price = tokenData.usd;
    cache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error(`Error fetching price from CoinGecko for ${contractAddress} on ${network}:`, error.message);
    return null;
  }
}

/**
 * Fetches token price from CoinMarketCap API.
 * CoinMarketCap usually works with symbols or internal IDs. This implementation assumes `symbol` is provided.
 * @param {string} symbol - The symbol of the cryptocurrency (e.g., 'ETH', 'BTC').
 * @returns {Promise<number|null>} The price of the token in USD, or null if not found/error.
 */
async function getPriceFromCoinMarketCap(symbol) {
  const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
  const COINMARKETCAP_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

  if (!COINMARKETCAP_API_KEY) {
    console.warn('COINMARKETCAP_API_KEY is not set. Skipping CoinMarketCap price fetch.');
    return null;
  }

  const cacheKey = `coinmarketcap-${symbol}`;
  const cachedPrice = cache.get(cacheKey);
  if (cachedPrice) {
    return cachedPrice;
  }

  try {
    const response = await axios.get(`${COINMARKETCAP_BASE_URL}/cryptocurrency/quotes/latest`, {
      headers: {
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
      },
      params: {
        symbol: symbol,
      },
      timeout: 10000, // 10 seconds timeout
    });

    const data = response.data;

    if (data.status.error_code !== 0) {
      console.error(`CoinMarketCap API error: ${data.status.error_message}`);
      return null;
    }

    const currencyData = data.data[symbol.toUpperCase()];
    if (!currencyData || !currencyData.quote || !currencyData.quote.USD) {
      console.warn(`CoinMarketCap: Price data for ${symbol} not found.`);
      return null;
    }

    const price = currencyData.quote.USD.price;
    cache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error(`Error fetching price from CoinMarketCap for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetches the price of a token from various sources, with fallbacks.
 * Expects either a contractAddress (for EVM chains) or a symbol (for native tokens/non-EVM).
 * @param {string} identifier - The contract address or symbol of the token.
 * @param {string} network - The network of the token.
 * @param {string} [type='address'] - 'address' if identifier is a contract address, 'symbol' if it's a token symbol.
 * @returns {Promise<number|null>} The price of the token in USD, or null if not found/error.
 */
router.get('/price', async (req, res) => {
  const { identifier, network, type = 'address' } = req.query;

  if (!identifier || !network) {
    return res.status(400).json({
      success: false,
      error: 'Missing identifier or network query parameters.',
    });
    }

    let price = null;

  // Try CoinMarketCap first if identifier is a symbol
  if (type === 'symbol') {
    try {
      price = await getPriceFromCoinMarketCap(identifier);
      if (price !== null) {
        return res.json({ success: true, price });
      }
    } catch (error) {
      console.warn(`CoinMarketCap failed for symbol ${identifier}:`, error.message);
    }
  }

  // Then try CoinGecko if identifier is a contract address or as a fallback for symbol
  if (type === 'address' || price === null) {
    try {
      price = await getPriceFromCoinGecko(identifier, network);
      if (price !== null) {
        return res.json({ success: true, price });
      }
    } catch (error) {
      console.warn(`CoinGecko failed for ${type} ${identifier} on ${network}:`, error.message);
    }
  }

  // Fallback if no price found
  if (price === null) {
    return res.status(404).json({
      success: false,
      error: `Price not found for ${identifier} on ${network}.`,
    });
  }
});

module.exports = router;
