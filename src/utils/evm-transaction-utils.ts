import { ethers } from 'ethers';

export interface EVMTransaction {
  hash: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  type: 'receive' | 'send';
  address: string;
  fee?: number;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
  nonce?: number;
  to?: string;
  from?: string;
}

// Get EVM transactions from Etherscan-like APIs
export async function getEVMTransactions(
  address: string,
  rpcUrl: string,
  network: string
): Promise<EVMTransaction[]> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();
    
    // Get transaction history (last 50 blocks for performance)
    const transactions: EVMTransaction[] = [];
    const startBlock = Math.max(0, latestBlock - 50);
    
    for (let blockNumber = startBlock; blockNumber <= latestBlock; blockNumber++) {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block) continue;
        
        for (const tx of block.transactions) {
          // Check if tx is a full transaction object or just a hash
          if (typeof tx === 'string') {
            // If it's just a hash, skip for now (we'd need to fetch the full transaction)
            continue;
          }
          
          // Type assertion to help TypeScript understand this is a transaction object
          const transactionObj = tx as any;
          
          // Now we know tx is a full transaction object
          if (transactionObj.to && (transactionObj.to.toLowerCase() === address.toLowerCase() || 
              transactionObj.from.toLowerCase() === address.toLowerCase())) {
            
            const type = transactionObj.to.toLowerCase() === address.toLowerCase() ? 'receive' : 'send';
            const amount = parseFloat(ethers.formatEther(transactionObj.value));
            
            const transaction: EVMTransaction = {
              hash: transactionObj.hash,
              amount,
              confirmations: latestBlock - blockNumber + 1,
              blockHeight: blockNumber,
              timestamp: block.timestamp,
              type,
              address,
              status: 'confirmed',
              gasUsed: transactionObj.gasLimit?.toString() || '0',
              gasPrice: transactionObj.gasPrice?.toString() || '0',
              nonce: transactionObj.nonce,
              to: transactionObj.to,
              from: transactionObj.from
            };
            
            transactions.push(transaction);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error fetching block ${blockNumber}:`, error);
        continue;
      }
    }
    
    // Sort by timestamp (newest first)
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching EVM transactions:', error);
    return [];
  }
}

// Get transaction details from Etherscan API
export async function getTransactionFromEtherscan(
  txHash: string,
  apiKey: string = ''
): Promise<any> {
  try {
    const baseUrl = 'https://api.etherscan.io/api';
    const url = `${baseUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching transaction from Etherscan:', error);
    return null;
  }
}

// Get transaction receipt
export async function getTransactionReceipt(
  txHash: string,
  rpcUrl: string
): Promise<any> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching transaction receipt:', error);
    return null;
  }
}

// Calculate transaction fee
export function calculateTransactionFee(
  gasUsed: string,
  gasPrice: string
): string {
  try {
    const fee = ethers.parseUnits(gasUsed, 'wei') * ethers.parseUnits(gasPrice, 'wei');
    return ethers.formatEther(fee);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error calculating transaction fee:', error);
    return '0';
  }
}

// Get pending transactions for an address
export async function getPendingTransactions(
  address: string,
  rpcUrl: string
): Promise<EVMTransaction[]> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get pending transactions from mempool
    const pendingTxs: EVMTransaction[] = [];
    
    // Note: This is a simplified implementation
    // In a real implementation, you'd need to subscribe to mempool events
    // or use a service like Alchemy/Infura that provides mempool access
    
    return pendingTxs;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching pending transactions:', error);
    return [];
  }
}
