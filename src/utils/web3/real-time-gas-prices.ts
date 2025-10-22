import { ethers } from 'ethers';
import axios from 'axios';
import { getSafeConfig } from './config-utils';

// Real-time gas price fetching service using Etherscan API
class RealTimeGasService {
  private getEtherscanApiKey(): string {
    const config = getSafeConfig();
    const apiKey = config.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('Etherscan API key is not configured.');
    }
    return apiKey;
  }

  async getGasPrices(network: string): Promise<{ standard: number; fast: number; fastest: number }> {
    try {
      const apiKey = this.getEtherscanApiKey();
      const url = `https://api.etherscan.io/api?module=gastracker&action=gasestimator&apikey=${apiKey}`;

      const response = await axios.get(url);
      const data = response.data.result;

      if (!data || data.status === '0') {
        throw new Error(data.message || 'Failed to fetch gas prices from Etherscan.');
      }

      // Etherscan API returns gas prices in Gwei, convert to Wei
      const standard = Math.round(parseFloat(data.ProposeGasPrice) * 1e9);
      const fast = Math.round(parseFloat(data.FastGasPrice) * 1e9);
      const fastest = Math.round(parseFloat(data.FastestGasPrice) * 1e9);

      console.log(`PayCio: Fetched real-time gas prices for ${network}: Standard ${data.ProposeGasPrice} Gwei`);

      return {
        standard,
        fast,
        fastest,
      };
    } catch (error) {
      console.error(`PayCio: Error fetching real-time gas prices for ${network}:`, error);
      // Fallback to a reasonable default if API call fails
      return {
        standard: 20 * 1e9, // 20 Gwei in Wei
        fast: 30 * 1e9,
        fastest: 50 * 1e9,
      };
    }
  }
}

export const realTimeGasService = new RealTimeGasService();
