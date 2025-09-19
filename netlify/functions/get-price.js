exports.handler = async (event, context) => {
  // Enable CORS for Chrome extension
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { network, address, symbols } = JSON.parse(event.body || '{}');
    
    let price = 0;
    let source = 'none';
    let error = null;

    try {
      if (symbols) {
        // Get native token prices
        const prices = await getNativePrices(symbols);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            prices,
            timestamp: new Date().toISOString()
          })
        };
      } else if (network && address) {
        // Get specific token price
        price = await getTokenPrice(address, network);
        source = 'api';
      } else {
        throw new Error('Invalid parameters');
      }
    } catch (err) {
      error = err.message;
      console.error('Price fetch error:', err);
    }

    const result = {
      network,
      address,
      price,
      source,
      error,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Price handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Price fetch failed',
        message: error.message
      })
    };
  }
};

// Get token price from CoinGecko
async function getTokenPrice(address, network) {
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
    throw new Error(`Unsupported network for price: ${network}`);
  }

  try {
    // Try CoinGecko API
    let cgUrl = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd`;
    if (process.env.COINGECKO_API_KEY) {
      cgUrl += `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}`;
    }

    const response = await fetch(cgUrl);
    const data = await response.json();
    
    const tokenData = data[address.toLowerCase()];
    if (tokenData && tokenData.usd) {
      return tokenData.usd;
    }
  } catch (error) {
    console.warn('CoinGecko failed, trying DEX price:', error);
  }

  // Fallback to DEX price
  try {
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const dexData = await dexResponse.json();
    
    if (dexData.pairs && dexData.pairs.length > 0) {
      const pair = dexData.pairs[0];
      return parseFloat(pair.priceUsd) || 0;
    }
  } catch (error) {
    console.warn('DEX price failed:', error);
  }

  return 0;
}

// Get native token prices
async function getNativePrices(symbols) {
  try {
    let url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd`;
    if (process.env.COINGECKO_API_KEY) {
      url += `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}`;
    }

    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Native price fetch failed:', error);
    // Return empty prices object
    const emptyPrices = {};
    symbols.forEach(symbol => {
      emptyPrices[symbol] = { usd: 0 };
    });
    return emptyPrices;
  }
}
