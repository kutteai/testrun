import { ethers } from 'ethers';
import { getNetworks,  } from './network-utils';
import { NetworkConfig } from '../../types/network-types';
import { getSafeConfig } from './config-utils';
import { realTimeGasService } from './real-time-gas-prices';

// Get gas price (real implementation with fallbacks)
export async function getGasPrice(network: string): Promise<string> {
  try {
    const networkConfig = getNetworks()[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }


    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const gasPrice = data.result || '0x0';

    // Convert to Gwei for better readability and validation
    const gasPriceWei = BigInt(gasPrice);
    const gasPriceGwei = Number(gasPriceWei) / 1e9;


    // Validate gas price is reasonable (not too high or too low)
    if (gasPriceGwei < 0.01) {
      // eslint-disable-next-line no-console
      console.warn(`PayCio: Gas price seems too low (${gasPriceGwei} Gwei), using fallback`);
      return getFallbackGasPrice(network);
    }

    if (gasPriceGwei > 1000) {
      // eslint-disable-next-line no-console
      console.warn(`PayCio: Gas price seems too high (${gasPriceGwei} Gwei), using fallback`);
      return getFallbackGasPrice(network);
    }

    return gasPrice;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // eslint-disable-next-line no-console
      console.error('Gas price request timed out, using fallback');
      return await getFallbackGasPrice(network);
    }
    // eslint-disable-next-line no-console
    console.error('Error getting gas price, using fallback:', error);
    return await getFallbackGasPrice(network);
  }
}

// Enhanced fallback gas prices with real-time API integration
async function getFallbackGasPrice(network: string): Promise<string> {
  try {
    // Try to get real-time gas prices first
    const gasData = await realTimeGasService.getGasPrices(network);

    // Convert to Wei hex format - use standard speed
    const gasPriceWei = ethers.parseUnits(gasData.standard.toString(), 'wei');
    const gasPriceHex = `0x${gasPriceWei.toString(16)}`;

    console.log(`PayCio: Using real-time gas price for ${network}: ${Math.floor(gasData.standard / 1e9)} Gwei`);
    return gasPriceHex;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.warn(`PayCio: Error getting real-time gas price for ${network}, using static fallback:`, error);

    // Default to a minimal gas price if real-time fetching fails
    return '0x3B9ACA00'; // 1 Gwei in hex, a very low but functional gas price
  }
}

// Estimate gas limit (real implementation)
export async function estimateGas(
  from: string,
  to: string,
  value: string,
  txData: string = '0x',
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
        method: 'eth_estimateGas',
        params: [{
          from,
          to,
          value,
          data: txData,
        }],
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
    console.error('Error estimating gas:', error);
    return '0x0';
  }
}
