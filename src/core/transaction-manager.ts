import { ethers } from 'ethers';
import { estimateGas, getTransactionReceipt, NETWORKS } from '../utils/web3-utils';
import { WalletManager } from './wallet-manager';
import { storage } from '../utils/storage-utils';

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  data: string;
  network: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  confirmations: number;
  timestamp: number;
  fee: string;
  type: 'send' | 'receive' | 'contract';
  metadata?: {
    tokenSymbol?: string;
    tokenName?: string;
    tokenAddress?: string;
    methodName?: string;
    methodArgs?: any[];
  };
}

export interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  network: string;
  password: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  transaction?: Transaction;
}

export class TransactionManager {
  private transactions: Transaction[] = [];
  private pendingTransactions: Transaction[] = [];
  private pendingTimeouts: Map<string, any> = new Map();
  private walletManager: WalletManager;

  constructor() {
    this.walletManager = new WalletManager();
    this.loadTransactions();
    this.startPendingTransactionMonitoring();
  }

  // Load transactions from storage
  private async loadTransactions(): Promise<void> {
    try {
      const result = await storage.get(['transactions']);
      if (result.transactions) {
        this.transactions = result.transactions;
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }

  // Save transactions to storage
  private async saveTransactions(): Promise<void> {
    try {
      await storage.set({ transactions: this.transactions });
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  }

  // Save pending transactions to storage
  private async savePendingTransactions(): Promise<void> {
    try {
      await storage.set({ pendingTransactions: this.pendingTransactions });
    } catch (error) {
      console.error('Failed to save pending transactions:', error);
    }
  }

  // Get wallet from storage
  private async getWalletFromStorage(): Promise<any> {
    try {
      const result = await storage.get(['wallet']);
      return result.wallet || null;
    } catch (error) {
      console.error('Failed to get wallet from storage:', error);
      return null;
    }
  }

  // Send transaction with real implementation
  async sendTransaction(to: string, value: string, network: string): Promise<string> {
    try {
      const currentWallet = this.walletManager.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('No wallet available');
      }

      const currentAccount = this.walletManager.getCurrentAccount();
      if (!currentAccount) {
        throw new Error('No account available');
      }

      // Import real blockchain utilities
      const { ethers } = await import('ethers');
      const { 
        getRealBalance, 
        estimateGas, 
        getGasPrice, 
        getTransactionCount,
        signTransaction,
        sendSignedTransaction
      } = await import('../utils/web3-utils');

      // Validate balance
      const balance = await getRealBalance(currentAccount.address, network);
      const valueWei = ethers.parseEther(value);
      const balanceWei = BigInt(balance);
      
      if (balanceWei < valueWei) {
        throw new Error('Insufficient balance');
      }

      // Get gas price and estimate gas
      const gasPrice = await getGasPrice(network);
      const gasLimit = await estimateGas(
        currentAccount.address,
        to,
        valueWei.toString(),
        '0x',
        network
      );

      // Calculate total cost
      const gasCost = BigInt(gasLimit) * BigInt(gasPrice);
      const totalCost = valueWei + gasCost;

      if (balanceWei < totalCost) {
        throw new Error('Insufficient balance for gas fees');
      }

      // Get nonce
      const nonce = await getTransactionCount(currentAccount.address, network);

      // Create transaction object
      const transaction = {
        to: to,
        value: valueWei.toString(),
        data: '0x',
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce
      };

      // Sign transaction (in real implementation, this would prompt for password)
      const signedTx = await signTransaction(transaction, currentAccount.privateKey, network);

      // Send transaction
      const txHash = await sendSignedTransaction(signedTx, network);

      // Add to pending transactions
      const pendingTx: Transaction = {
        id: txHash,
        hash: txHash,
        from: currentAccount.address,
        to: to,
        value: value,
        network: network,
        status: 'pending',
        timestamp: Date.now(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        nonce: parseInt(nonce, 16),
        gasLimit: gasLimit,
        data: '0x',
        confirmations: 0,
        fee: (BigInt(gasLimit) * BigInt(gasPrice)).toString(),
        type: 'send'
      };

      this.pendingTransactions.push(pendingTx);
      this.savePendingTransactions();

      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // Monitor transaction status
  private async monitorTransaction(transaction: Transaction): Promise<void> {
    const networkConfig = NETWORKS[transaction.network];
    if (!networkConfig) return;

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    const checkStatus = async () => {
      try {
        const receipt = await getTransactionReceipt(transaction.hash, transaction.network);
        
        if (receipt) {
          // Transaction confirmed
          transaction.status = receipt.status === '0x1' ? 'confirmed' : 'failed';
          transaction.blockNumber = parseInt(receipt.blockNumber, 16);
          transaction.confirmations = parseInt(receipt.confirmations, 16);
          
          // Update in storage
          await this.saveTransactions();
          
          // Stop monitoring
          const timeoutId = this.pendingTimeouts.get(transaction.hash);
          if (timeoutId) {
            clearTimeout(timeoutId);
            this.pendingTimeouts.delete(transaction.hash);
          }
        } else {
          // Still pending, check again in 10 seconds
          const timeoutId = setTimeout(checkStatus, 10000);
          this.pendingTimeouts.set(transaction.hash, timeoutId);
        }
      } catch (error) {
        console.error(`Error monitoring transaction ${transaction.hash}:`, error);
        // Continue monitoring even if there's an error
        const timeoutId = setTimeout(checkStatus, 30000);
        this.pendingTimeouts.set(transaction.hash, timeoutId);
      }
    };

    // Start monitoring
    checkStatus();
  }

  // Start monitoring all pending transactions
  private startPendingTransactionMonitoring(): void {
    const pendingTxs = this.transactions.filter(tx => tx.status === 'pending');
    pendingTxs.forEach(tx => {
      this.monitorTransaction(tx);
    });
  }

  // Get transaction by hash
  getTransaction(hash: string): Transaction | undefined {
    return this.transactions.find(tx => tx.hash === hash);
  }

  // Get all transactions
  getAllTransactions(): Transaction[] {
    return this.transactions;
  }

  // Get transactions by network
  getTransactionsByNetwork(network: string): Transaction[] {
    return this.transactions.filter(tx => tx.network === network);
  }

  // Get pending transactions
  getPendingTransactions(): Transaction[] {
    return this.transactions.filter(tx => tx.status === 'pending');
  }

  // Get transaction history
  getTransactionHistory(limit: number = 50): Transaction[] {
    return this.transactions.slice(0, limit);
  }

  // Refresh transaction status
  async refreshTransaction(hash: string): Promise<Transaction | null> {
    const transaction = this.getTransaction(hash);
    if (!transaction) return null;

    try {
      const receipt = await getTransactionReceipt(hash, transaction.network);
      
      if (receipt) {
        transaction.status = receipt.status === '0x1' ? 'confirmed' : 'failed';
        transaction.blockNumber = parseInt(receipt.blockNumber, 16);
        transaction.confirmations = parseInt(receipt.confirmations, 16);
        
        await this.saveTransactions();
        return transaction;
      }
    } catch (error) {
      console.error(`Error refreshing transaction ${hash}:`, error);
    }

    return transaction;
  }

  // Refresh all pending transactions
  async refreshPendingTransactions(): Promise<void> {
    const pendingTxs = this.getPendingTransactions();
    
    for (const tx of pendingTxs) {
      await this.refreshTransaction(tx.hash);
    }
  }

  // Clear transaction history
  async clearTransactionHistory(): Promise<void> {
    this.transactions = [];
    await this.saveTransactions();
  }

  // Get transaction statistics
  getTransactionStats(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    totalValue: string;
    totalFees: string;
  } {
    const total = this.transactions.length;
    const pending = this.transactions.filter(tx => tx.status === 'pending').length;
    const confirmed = this.transactions.filter(tx => tx.status === 'confirmed').length;
    const failed = this.transactions.filter(tx => tx.status === 'failed').length;
    
    const totalValue = this.transactions
      .filter(tx => tx.type === 'send')
      .reduce((sum, tx) => sum + parseFloat(tx.value), 0)
      .toString();
    
    const totalFees = this.transactions
      .reduce((sum, tx) => sum + parseFloat(tx.fee), 0)
      .toString();

    return {
      total,
      pending,
      confirmed,
      failed,
      totalValue,
      totalFees
    };
  }

  // Estimate transaction fee
  async estimateTransactionFee(
    to: string,
    value: string,
    data: string = '0x',
    network: string
  ): Promise<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
  }> {
    try {
      const networkConfig = NETWORKS[network];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      
      // Get wallet address for estimation
      const walletData = await this.getWalletFromStorage();
      if (!walletData?.address) {
        throw new Error('No wallet found');
      }

      // Estimate gas
      const estimatedGas = await estimateGas(
        walletData.address,
        to,
        value,
        data,
        network
      );

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice?.toString() || '20000000000';

      const totalFee = (BigInt(estimatedGas) * BigInt(gasPrice)).toString();

      return {
        gasLimit: estimatedGas.toString(),
        gasPrice,
        totalFee
      };
    } catch (error) {
      console.error('Failed to estimate transaction fee:', error);
      throw error;
    }
  }
} 