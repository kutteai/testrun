import { getSafeConfig } from '../../utils/config-utils';

// Get transaction receipt using Etherscan V2 Multichain API
export async function getTransactionReceipt(txHash: string, network: string): Promise<any | null> {
  try {
    const config = getSafeConfig();
    const apiKey = config.ETHERSCAN_API_KEY; // Use Etherscan API key for all networks

    if (!apiKey) {
      throw new Error('Etherscan API key required for transaction data');
    }

    // Map network to Etherscan V2 API chain ID
    const chainIdMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
      optimism: '10',
      base: '8453',
      fantom: '250',
      zksync: '324',
      linea: '59144',
      mantle: '5000',
      scroll: '534352',
      'polygon-zkevm': '1101',
      'arbitrum-nova': '42170',
    };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API
    const baseUrl = 'https://api.etherscan.io/api/v2';
    const url = `${baseUrl}/transactions/${txHash}?chainid=${chainId}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.status !== '1') {
      throw new Error(`API error: ${responseData.message}`);
    }

    return responseData.result;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting transaction receipt:', error);
    return null;
  }
}

// Get transaction history using Etherscan V2 API
export async function getTransactionHistory(address: string, network: string, page: number = 1, offset: number = 20): Promise<any[]> {
  try {
    const config = getSafeConfig();
    const apiKey = config.ETHERSCAN_API_KEY;

    if (!apiKey) {
      throw new Error('Etherscan API key required for transaction history');
    }

    const chainIdMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
      optimism: '10',
    };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API for transaction list
    const baseUrl = 'https://api.etherscan.io/api/v2';
    const url = `${baseUrl}/transactions?address=${address}&chainid=${chainId}&page=${page}&offset=${offset}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.status !== '1') {
      throw new Error(`API error: ${responseData.message}`);
    }

    return responseData.result || [];
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting transaction history:', error);
    return [];
  }
}

// Get token transactions using Etherscan V2 API
export async function getTokenTransactions(address: string, network: string, contractAddress?: string): Promise<any[]> {
  try {
    const config = getSafeConfig();
    const apiKey = config.ETHERSCAN_API_KEY;

    if (!apiKey) {
      throw new Error('Etherscan API key required for token transactions');
    }

    const chainIdMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
      optimism: '10',
    };

    const chainId = chainIdMap[network];
    if (!chainId) {
      throw new Error(`Unsupported network for Etherscan V2 API: ${network}`);
    }

    // Use Etherscan V2 Multichain API for token transactions
    const baseUrl = 'https://api.etherscan.io/api/v2';
    let url = `${baseUrl}/tokens/transactions?address=${address}&chainid=${chainId}&apikey=${apiKey}`;

    if (contractAddress) {
      url += `&contractaddress=${contractAddress}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result || [];
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting token transactions:', error);
    return [];
  }
}





