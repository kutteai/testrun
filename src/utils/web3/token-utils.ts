import { getNetworks } from './network-utils';
import { getSafeConfig } from './config-utils';

// Get token balance (real implementation)
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  network: string,
): Promise<string> {
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
          data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}`,
        }, 'latest'],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || '0x0';
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting token balance:', error);
    return '0x0';
  }
}

// Get token price from CoinGecko (real implementation)
export async function getTokenPrice(tokenId: string): Promise<number> {
  try {
    const config = getSafeConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const url = apiKey
      ? `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data[tokenId]?.usd || 0;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting token price:', error);
    return 0;
  }
}

// Get multiple token prices (real implementation)
export async function getTokenPrices(tokenIds: string[]): Promise<Record<string, number>> {
  try {
    const config = getSafeConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for token pricing');
    }

    const ids = tokenIds.join(',');
    const url = apiKey
      ? `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const prices: Record<string, number> = {};
    tokenIds.forEach((id) => {
      prices[id] = data[id]?.usd || 0;
    });

    return prices;
  } catch (error: any) {
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
    const config = getSafeConfig();
    const apiKey = config.COINGECKO_API_KEY;

    if (!apiKey) {
      throw new Error('CoinGecko API key required for price change data');
    }

    const url = apiKey
      ? `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1&x_cg_demo_api_key=${apiKey}`
      : `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Calculate 24h price change
    const { prices } = data;
    if (prices && prices.length >= 2) {
      const currentPrice = prices[prices.length - 1][1];
      const previousPrice = prices[0][1];
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = ((priceChange / previousPrice) * 100);

      return {
        price_change_24h: priceChange,
        price_change_percentage_24h: priceChangePercent,
        current_price: currentPrice,
      };
    }

    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0,
    };
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting 24h price change:', error);
    return {
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      current_price: 0,
    };
  }
}
