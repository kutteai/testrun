import { NetworkConfig } from '../types/network-types';
import { getConfig, getSafeConfig } from './config-utils';
import { getNetworks } from './web3/network-utils';

// Explicitly import functions that are part of web3Utils
import { getBalance, getRealBalance } from './web3/balance-utils';
import { getTokenBalance, get24hPriceChange, getMultipleTokenPrices, getTokenPrice, getTokenPrices } from './web3/token-utils';
import { getTransactionCount, signTransaction, sendSignedTransaction, sendRawTransaction } from './web3/transaction-utils';
import { getTransactionReceipt, getTransactionHistory, getTokenTransactions } from './web3/etherscan-utils';
import { getEnsAddress, getEnsName } from './web3/ens-utils';
import { getNftMetadata, getNftsForAddress } from './web3/nft-utils';
import { getGasPrice, estimateGas } from './web3/gas-utils';

// Re-export all from utility files that are NOT explicitly imported above (to avoid conflicts)
export * from './config-utils';
export * from './web3/token-metadata-utils';

export const web3Utils = {
  getNetworks,
  getBalance,
  getRealBalance,
  getTokenBalance,
  get24hPriceChange,
  getMultipleTokenPrices,
  getTokenPrice,
  getTokenPrices,
  getTransactionCount,
  signTransaction,
  sendSignedTransaction,
  sendRawTransaction,
  getTransactionReceipt,
  getTransactionHistory,
  getTokenTransactions,
  getEnsAddress,
  getEnsName,
  getNftMetadata,
  getNftsForAddress,
  getGasPrice,
  estimateGas
};

export default web3Utils;