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
  private walletManager: WalletManager;

  constructor() {
    this.walletManager = new WalletManager();
    this.loadTransactions();
  }

  // Load transactions from storage
  private async loadTransactions(): Promise<void> {
    try {
      const result = await storage.get(['transactions']);
      if (result.transactions) {
        this.transactions = result.transactions;
      }
    } catch (error) {
       
      // console.error('Failed to load transactions:', error);
    }
  }

  // Save transactions to storage
  private async saveTransactions(): Promise<void> {
    try {
      await storage.set({ transactions: this.transactions });
    } catch (error) {
       
      // console.error('Failed to save transactions:', error);
    }
  }

  // Get wallet data from storage
  private async getWalletFromStorage(): Promise<{ address: string; currentNetwork: string } | null> {
    try {
      const result = await storage.get(['currentWallet', 'currentNetwork']);
      if (result.currentWallet && result.currentNetwork) {
        return {
          address: result.currentWallet.address,
          currentNetwork: result.currentNetwork
        };
      }
      return null;
    } catch (error) {
       
      // console.error('Failed to get wallet from storage:', error);
      return null;
    }
  }

  // Send transaction
  async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      const { to, value, data = '0x', network, password } = request;

      // Get current account
      const currentWallet = this.walletManager.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('No wallet found');
      }

      const currentAccount = this.walletManager.getCurrentAccount();
      if (!currentAccount) {
        throw new Error('No account found');
      }

      // Get the address for the current network
      const fromAddress = currentAccount.addresses[network] || Object.values(currentAccount.addresses)[0];
      if (!fromAddress) {
        throw new Error('No address found for the specified network');
      }

      // Import web3 utilities
      const { 
        getRealBalance, 
        getGasPrice, 
        getTransactionCount,
        signTransaction,
        sendSignedTransaction
      } = await import('../utils/web3-utils');

      // Validate balance
      const balance = await getRealBalance(fromAddress, network);
      const valueWei = ethers.parseEther(value);
      const balanceWei = BigInt(balance);
      
      if (balanceWei < valueWei) {
        throw new Error('Insufficient balance');
      }

      // Get gas price and estimate gas
      const gasPrice = await getGasPrice(network);
      const gasLimit = await estimateGas(
        fromAddress,
        to,
        value,
        data,
        network
      );

      // Check if balance is sufficient for gas fees
      const gasFee = BigInt(gasLimit) * BigInt(gasPrice);
      if (balanceWei < valueWei + gasFee) {
        throw new Error('Insufficient balance for gas fees');
      }

      // Get nonce
      const nonce = await getTransactionCount(fromAddress, network);

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
        from: fromAddress,
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

      this.transactions.push(pendingTx);
      await this.saveTransactions();

      return {
        success: true,
        hash: txHash,
        transaction: pendingTx
      };
    } catch (error) {
       
      // console.error('Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get transaction by hash
  async getTransaction(hash: string): Promise<Transaction | null> {
    const transaction = this.transactions.find(tx => tx.hash === hash);
    if (!transaction) {
      return null;
    }

    // Update transaction status if it's pending
    if (transaction.status === 'pending') {
      try {
        const { getTransactionReceipt } = await import('../utils/web3-utils');
        const receipt = await getTransactionReceipt(hash, transaction.network);
        
        if (receipt) {
          transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
          transaction.blockNumber = receipt.blockNumber;
          transaction.confirmations = receipt.confirmations;
          await this.saveTransactions();
        }
      } catch (error) {
         
        // console.error('Failed to update transaction status:', error);
      }
    }

    return transaction;
  }

  // Get all transactions
  getAllTransactions(): Transaction[] {
    return [...this.transactions];
  }

  // Get transactions by network
  getTransactionsByNetwork(network: string): Transaction[] {
    return this.transactions.filter(tx => tx.network === network);
  }

  // Get pending transactions
  getPendingTransactions(): Transaction[] {
    return this.transactions.filter(tx => tx.status === 'pending');
  }

  // Update transaction status
  async updateTransactionStatus(hash: string, status: 'confirmed' | 'failed', blockNumber?: number): Promise<void> {
    const transaction = this.transactions.find(tx => tx.hash === hash);
    if (transaction) {
      transaction.status = status;
      if (blockNumber) {
        transaction.blockNumber = blockNumber;
      }
      await this.saveTransactions();
    }
  }

  // Clear all transactions
  async clearTransactions(): Promise<void> {
    this.transactions = [];
    await this.saveTransactions();
  }

  // Get transaction history for an address
  async getTransactionHistory(address: string, network: string): Promise<Transaction[]> {
    return this.transactions.filter(tx => 
      (tx.from.toLowerCase() === address.toLowerCase() || 
       tx.to.toLowerCase() === address.toLowerCase()) &&
      tx.network === network
    );
  }

  // Estimate gas for a transaction
  async estimateTransactionGas(
    to: string, 
    value: string, 
    data: string = '0x', 
    network: string
  ): Promise<string> {
    try { // TODO: Review useless catch block
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

      return estimatedGas;
    } catch (error) {
       
      // console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  // Get gas price for a network
  async getGasPrice(network: string): Promise<string> {
    try { // TODO: Review useless catch block
      const { getGasPrice } = await import('../utils/web3-utils');
      return await getGasPrice(network);
    } catch (error) {
       
      // console.error('Failed to get gas price:', error);
      throw error;
    }
  }

  // Get transaction count (nonce) for an address
  async getTransactionCount(address: string, network: string): Promise<number> {
    try { // TODO: Review useless catch block
      const { getTransactionCount } = await import('../utils/web3-utils');
      const nonceString = await getTransactionCount(address, network);
      return parseInt(nonceString, 16);
    } catch (error) {
       
      // console.error('Failed to get transaction count:', error);
      throw error;
    }
  }

  // Sign a transaction
  async signTransaction(transaction: any, privateKey: string, network: string): Promise<string> {
    try { // TODO: Review useless catch block
      const { signTransaction } = await import('../utils/web3-utils');
      return await signTransaction(transaction, privateKey, network);
    } catch (error) {
       
      // console.error('Failed to sign transaction:', error);
      throw error;
    }
  }

  // Send a signed transaction
  async sendSignedTransaction(signedTx: string, network: string): Promise<string> {
    try { // TODO: Review useless catch block
      const { sendSignedTransaction } = await import('../utils/web3-utils');
      return await sendSignedTransaction(signedTx, network);
    } catch (error) {
       
      // console.error('Failed to send signed transaction:', error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(hash: string, network: string): Promise<any> {
    try { // TODO: Review useless catch block
      const { getTransactionReceipt } = await import('../utils/web3-utils');
      return await getTransactionReceipt(hash, network);
    } catch (error) {
       
      // console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  // Get balance for an address
  async getBalance(address: string, network: string): Promise<string> {
    try { // TODO: Review useless catch block
      const { getRealBalance } = await import('../utils/web3-utils');
      return await getRealBalance(address, network);
    } catch (error) {
       
      // console.error('Failed to get balance:', error);
      throw error;
    }
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
    
    const totalValue = this.transactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.value || '0');
    }, 0).toString();
    
    const totalFees = this.transactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.fee || '0');
    }, 0).toString();

    return {
      total,
      pending,
      confirmed,
      failed,
      totalValue,
      totalFees
    };
  }
} 