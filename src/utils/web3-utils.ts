import { NetworkConfig } from '../types/network-types';
import { getConfig, getSafeConfig } from './config-utils';
import { getNetworks, NETWORKS } from './web3/network-utils';
import { getBalance, getRealBalance } from './web3/balance-utils';
import { getTokenBalance } from './web3/token-utils';

import {
  getTransactionCount,
  signTransaction,
  sendSignedTransaction,
  signMessage,
  signTypedData,
  sendRawTransaction
} from './web3/transaction-utils';
import {
  getTransactionReceipt,
  getTransactionHistory,
  getTokenTransactions
} from './web3/etherscan-utils';
import {
  getEnsAddress,
  getEnsName
} from './web3/ens-utils';
import {
  getNftMetadata,
  getNftsForAddress
} from './web3/nft-utils';

export * from './config-utils';
export * from './web3/balance-utils';
export * from './web3/token-utils';
export * from './web3/gas-utils';
export * from './web3/transaction-utils';
export * from './web3/etherscan-utils';
export * from './web3/token-metadata-utils';
export * from './web3/ens-utils';
export * from './web3/nft-utils';

// Get NFT metadata from OpenSea API (real implementation)
export async function getNftMetadata(contractAddress: string, tokenId: string, network: string): Promise<any> {
  try {
    const config = getConfig();

    const chainId = getNetworks().find((n: NetworkConfig) => n.name === network)?.chainId;
    if (!chainId) {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Using a placeholder for OpenSea API key - in a real app, this should be securely managed
    const openseaApiKey = config.openseaApiKey; // Replace with your actual OpenSea API key
    const openseaApiUrl = `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}/`;

    const response = await fetch(openseaApiUrl, {
      headers: {
        'X-API-KEY': openseaApiKey,
      },
    });

    if (!response.ok) {
      // Handle cases like 404 Not Found, 429 Too Many Requests, etc.
      if (response.status === 404) {
        console.warn(`NFT metadata not found for ${contractAddress}:${tokenId} on network ${network}`);
        return null;
      } else {
        throw new Error(`OpenSea API error: ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching NFT metadata for ${contractAddress}:${tokenId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

export const web3Utils = {
  getNetworks,
  NETWORKS,
  getBalance,
  getTokenBalance,
  getTransactionCount,
  signTransaction,
  sendSignedTransaction,
  signMessage,
  signTypedData,
  sendRawTransaction,
  getTransactionReceipt,
  getTransactionHistory,
  getTokenTransactions,
  getEnsAddress,
  getEnsName,
  getNftMetadata,
  getNftsForAddress
};

export default web3Utils;