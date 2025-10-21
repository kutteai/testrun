import { ethers } from 'ethers';
import { getGasPrice, estimateGas, sendRawTransaction, getTransactionReceipt } from './web3-utils';
import { nonEVMTransactionManager } from './non-evm-transaction-manager';

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  network: string;
  status: 'pending' | 'confirmed' | 'failed' | 'replaced';
  blockNumber?: number;
  confirmations: number;
  timestamp: number;
  error?: string;
}

export interface GasEstimate {
  slow: {
    gasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    estimatedCost: string;
  };
  standard: {
    gasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    estimatedCost: string;
  };
  fast: {
    gasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    estimatedCost: string;
  };
}

export interface TransactionOptions {
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
}

export class TransactionManager {
  private transactions: Map<string, Transaction> = new Map();
  private providers: Map<string, ethers.Provider> = new Map();

  // Get or create provider for network
  private getProvider(network: string): ethers.Provider {
    if (!this.providers.has(network)) {
      const rpcUrl = this.getRpcUrl(network);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      this.providers.set(network, provider);
    }
    return this.providers.get(network)!;
  }

  // Send transaction with real implementation (EVM and Non-EVM support)
  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    value: string,
    data: string = '0x',
    network: string,
    privateKey: string,
    options: TransactionOptions = {}
  ): Promise<Transaction> {
    try {
      // Check if this is a non-EVM chain
      const nonEVMChains = ['bitcoin', 'solana', 'tron', 'ton', 'xrp'];
      const isNonEVM = nonEVMChains.includes(network.toLowerCase());

      if (isNonEVM) {
        // Handle non-EVM transaction
        const amount = parseFloat(value) || 0;
        const result = await nonEVMTransactionManager.sendTransaction(
          network,
          fromAddress,
          toAddress,
          amount,
          privateKey,
          options.network || 'mainnet'
        );

        if (!result.success) {
          throw new Error(result.error || 'Non-EVM transaction failed');
        }

        // Create transaction object for non-EVM
        const transaction: Transaction = {
          id: `${network}-${result.txHash}`,
          hash: result.txHash,
          from: fromAddress,
          to: toAddress,
          value: value,
          data: '0x', // Non-EVM chains don't use data field
          gasLimit: '0', // Non-EVM chains don't use gas
          gasPrice: '0', // Non-EVM chains don't use gas
          nonce: 0, // Non-EVM chains don't use nonce
          network: network,
          status: 'pending',
          confirmations: 0,
          timestamp: Date.now()
        };

        // Store transaction
        this.transactions.set(transaction.id, transaction);

        // Start monitoring
        this.monitorTransaction(transaction);

        return transaction;
      }

      // Handle EVM transaction (existing logic)
      const provider = this.getProvider(network);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Get current nonce if not provided
      const nonce = options.nonce ?? await wallet.getNonce();

      // Get gas estimates
      const gasEstimates = await this.getGasEstimates(network, fromAddress, toAddress, value, data);

      // Prepare transaction
      const tx: ethers.TransactionRequest = {
        to: toAddress,
        value: value,
        data: data,
        nonce: nonce,
        chainId: options.chainId || this.getChainId(network)
      };

      // Set gas parameters
      if (options.maxFeePerGas && options.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        tx.maxFeePerGas = options.maxFeePerGas;
        tx.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      } else {
        // Legacy transaction
        tx.gasPrice = options.gasPrice || gasEstimates.standard.gasPrice;
      }

      // Set gas limit
      tx.gasLimit = options.gasLimit || await estimateGas(fromAddress, toAddress, value, data, network);

      // Sign and send transaction
      const signedTx = await wallet.signTransaction(tx);
      const txHash = await sendRawTransaction(signedTx, network);

      // Create transaction object
      const transaction: Transaction = {
        id: `${network}-${txHash}`,
        hash: txHash,
        from: fromAddress,
        to: toAddress,
        value: value,
        data: data,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        nonce: nonce,
        network: network,
        status: 'pending',
        confirmations: 0,
        timestamp: Date.now()
      };

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Start monitoring
      this.monitorTransaction(transaction);

      return transaction;
    } catch (error) {
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  // Get gas estimates for different speeds
  async getGasEstimates(
    network: string,
    fromAddress: string,
    toAddress: string,
    value: string,
    data: string = '0x'
  ): Promise<GasEstimate> {
    try {
      // Get current gas price
      const currentGasPrice = await getGasPrice(network);
      const gasPriceBigInt = BigInt(currentGasPrice);
      
      // Estimate gas limit
      const gasLimit = await estimateGas(fromAddress, toAddress, value, data, network);
      const gasLimitBigInt = BigInt(gasLimit);

      // Calculate different gas price tiers
      const slowGasPrice = gasPriceBigInt * 80n / 100n; // 80% of current
      const standardGasPrice = gasPriceBigInt;
      const fastGasPrice = gasPriceBigInt * 120n / 100n; // 120% of current

      // For EIP-1559 networks, calculate maxFeePerGas and maxPriorityFeePerGas
      const baseFee = await this.getBaseFee(network);
      const maxPriorityFeePerGas = gasPriceBigInt - baseFee;

      return {
        slow: {
          gasPrice: slowGasPrice.toString(),
          maxFeePerGas: baseFee > 0 ? (slowGasPrice + maxPriorityFeePerGas).toString() : undefined,
          maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
          estimatedCost: (slowGasPrice * gasLimitBigInt).toString()
        },
        standard: {
          gasPrice: standardGasPrice.toString(),
          maxFeePerGas: baseFee > 0 ? (standardGasPrice + maxPriorityFeePerGas).toString() : undefined,
          maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
          estimatedCost: (standardGasPrice * gasLimitBigInt).toString()
        },
        fast: {
          gasPrice: fastGasPrice.toString(),
          maxFeePerGas: baseFee > 0 ? (fastGasPrice + maxPriorityFeePerGas).toString() : undefined,
          maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
          estimatedCost: (fastGasPrice * gasLimitBigInt).toString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to get gas estimates: ${error}`);
    }
  }

  // Monitor transaction status
  private async monitorTransaction(transaction: Transaction): Promise<void> {
    const checkStatus = async () => {
      try {
        const receipt = await getTransactionReceipt(transaction.hash, transaction.network);
        
        if (receipt) {
          transaction.status = receipt.status ? 'confirmed' : 'failed';
          transaction.blockNumber = parseInt(receipt.hash, 16);
          transaction.confirmations = 1; // Simplified
          
          if (transaction.status === 'failed') {
            transaction.error = 'Transaction reverted';
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to check transaction status: ${error}`);
      }
    };

    // Check immediately
    await checkStatus();

    // Check every 10 seconds for 5 minutes
    const interval = setInterval(async () => {
      await checkStatus();
      
      if (transaction.status !== 'pending') {
        clearInterval(interval);
      }
    }, 10000);

    // Stop monitoring after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (transaction.status === 'pending') {
        transaction.status = 'failed';
        transaction.error = 'Transaction timeout';
      }
    }, 300000);
  }

  // Get transaction by ID
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  // Get all transactions
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  // Get transactions by address
  getTransactionsByAddress(address: string): Transaction[] {
    return this.getAllTransactions().filter(
      tx => tx.from.toLowerCase() === address.toLowerCase() || 
            tx.to.toLowerCase() === address.toLowerCase()
    );
  }

  // Get transactions by network
  getTransactionsByNetwork(network: string): Transaction[] {
    return this.getAllTransactions().filter(tx => tx.network === network);
  }

  // Get pending transactions
  getPendingTransactions(): Transaction[] {
    return this.getAllTransactions().filter(tx => tx.status === 'pending');
  }

  // Cancel transaction (replace with higher gas price)
  async cancelTransaction(
    transactionId: string,
    privateKey: string,
    newGasPrice: string
  ): Promise<Transaction> {
    const originalTx = this.transactions.get(transactionId);
    if (!originalTx || originalTx.status !== 'pending') {
      throw new Error('Transaction not found or not pending');
    }

    // Create cancel transaction (send to self with 0 value)
    const cancelTx = await this.sendTransaction(
      originalTx.from,
      originalTx.from,
      '0x0',
      '0x',
      originalTx.network,
      privateKey,
      {
        nonce: originalTx.nonce,
        gasPrice: newGasPrice
      }
    );

    // Mark original transaction as replaced
    originalTx.status = 'replaced';
    originalTx.error = 'Replaced by user';

    return cancelTx;
  }

  // Speed up transaction (replace with higher gas price)
  async speedUpTransaction(
    transactionId: string,
    privateKey: string,
    newGasPrice: string
  ): Promise<Transaction> {
    const originalTx = this.transactions.get(transactionId);
    if (!originalTx || originalTx.status !== 'pending') {
      throw new Error('Transaction not found or not pending');
    }

    // Create replacement transaction with same parameters but higher gas price
    const speedUpTx = await this.sendTransaction(
      originalTx.from,
      originalTx.to,
      originalTx.value,
      originalTx.data,
      originalTx.network,
      privateKey,
      {
        nonce: originalTx.nonce,
        gasPrice: newGasPrice
      }
    );

    // Mark original transaction as replaced
    originalTx.status = 'replaced';
    originalTx.error = 'Replaced by user';

    return speedUpTx;
  }

  // Get base fee for EIP-1559
  private async getBaseFee(network: string): Promise<bigint> {
    try {
      const provider = this.getProvider(network);
      const block = await provider.getBlock('latest');
      return block?.baseFeePerGas || 0n;
    } catch {
      return 0n; // Fallback to legacy gas pricing
    }
  }

  // Get RPC URL for network
  private getRpcUrl(network: string): string {
    const urls: Record<string, string> = {
      ethereum: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io'
    };
    return urls[network] || urls.ethereum;
  }

  // Get chain ID for network
  private getChainId(network: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      bsc: 56,
      avalanche: 43114,
      arbitrum: 42161,
      optimism: 10
    };
    return chainIds[network] || 1;
  }

  // Clear old transactions (older than 24 hours)
  clearOldTransactions(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.timestamp < oneDayAgo && transaction.status !== 'pending') {
        this.transactions.delete(id);
      }
    }
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager(); 