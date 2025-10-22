import { getNetworks } from '../network-utils';
import { getConfig, getSafeConfig } from '../../utils/config-utils';

// Get token metadata from a given contract address (real implementation)
export async function getTokenMetadata(
  tokenAddress: string,
  network: string
): Promise<any> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x06fdde03' //ERC20: name()
        }, 'latest'],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const nameData = await response.json();

    const symbolResponse = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x95d89b41' //ERC20: symbol()
        }, 'latest'],
        id: 2
      })
    });

    if (!symbolResponse.ok) {
      throw new Error(`HTTP error! status: ${symbolResponse.status}`);
    }

    const symbolData = await symbolResponse.json();

    const decimalsResponse = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x313ce567' //ERC20: decimals()
        }, 'latest'],
        id: 3
      })
    });

    if (!decimalsResponse.ok) {
      throw new Error(`HTTP error! status: ${decimalsResponse.status}`);
    }

    const decimalsData = await decimalsResponse.json();

    const name = nameData.result ? String.fromCharCode(...nameData.result.slice(66).match(/.{2}/g).map((byte: string) => parseInt(byte, 16))) : '';
    const symbol = symbolData.result ? String.fromCharCode(...symbolData.result.slice(66).match(/.{2}/g).map((byte: string) => parseInt(byte, 16))) : '';
    const decimals = decimalsData.result ? parseInt(decimalsData.result, 16) : 0;

    return {
      name,
      symbol,
      decimals,
      address: tokenAddress
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting token metadata:', error);
    return null;
  }
}

// Get token price from CoinGecko (real implementation)
export async function getTokenPrice(tokenId: string): Promise<number> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data[tokenId]?.usd || 0;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting token price:', error);
    return 0;
  }
}

// Get multiple token prices (real implementation)
export async function getTokenPrices(tokenIds: string[]): Promise<Record<string, number>> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const ids = tokenIds.join(',');
    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const prices: Record<string, number> = {};
    tokenIds.forEach(id => {
      prices[id] = data[id]?.usd || 0;
    });

    return prices;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting token prices:', error);
    return {};
  }
}

// Alias for backward compatibility
export const getMultipleTokenPrices = getTokenPrices;

// Get 24h price change from CoinGecko (real implementation)
export async function get24hPriceChange(tokenId: string): Promise<any> {
  try {
    const config = getConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for price change data');
    }

    const url = apiKey ? 
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1&x_cg_demo_api_key=${apiKey}` :
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Calculate 24h price change
    const prices = data.prices;
    if (prices && prices.length >= 2) {
      const currentPrice = prices[prices.length - 1][1];
      const previousPrice = prices[0][1];
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = ((priceChange / previousPrice) * 100);

      return {
        price_change_24h: priceChange,
        price_change_percentage_24h: priceChangePercent,
        current_price: currentPrice
      };
    }

    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting 24h price change:', error);
    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0
    };
  }
}




