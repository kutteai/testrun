import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage-utils';
import { getTransactionReceipt } from '../utils/web3/etherscan-utils';

interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  network: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
  nonce: number;
  data?: string;
  error?: string; // Add error property to Transaction interface
}

interface TransactionState {
  recentTransactions: Transaction[];
  pendingTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

interface TransactionContextType {
  transactionState: TransactionState;
  recentTransactions: Transaction[];
  pendingTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  getTransactionByHash: (hash: string) => Transaction | undefined;
  clearTransactions: () => void;
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransaction = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    recentTransactions: [],
    pendingTransactions: [],
    isLoading: false,
    error: null
  });

  // Load transactions from storage
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const result = await storage.get(['transactions']);
        if (result.transactions) {
          const transactions: Transaction[] = result.transactions;
          const pending = transactions.filter(tx => tx.status === 'pending');
          const recent = transactions
            .filter(tx => tx.status !== 'pending')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50); // Keep last 50 transactions

          setTransactionState(prev => ({
            ...prev,
            recentTransactions: recent,
            pendingTransactions: pending
          }));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load transactions:', error);
      }
    };
    loadTransactions();
  }, []);

  // Save transactions to storage
  const saveTransactions = async (transactions: Transaction[]) => {
    try {
      await storage.set({ transactions });
      setTransactionState(prev => ({
        ...prev,
        recentTransactions: transactions
          .filter(tx => tx.status !== 'pending')
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50),
        pendingTransactions: transactions.filter(tx => tx.status === 'pending')
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save transactions:', error);
    }
  };

  // Add transaction
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `${transaction.hash}-${transaction.nonce}`,
      timestamp: Date.now()
    };

    setTransactionState(prev => {
      const allTransactions = [...prev.recentTransactions, ...prev.pendingTransactions, newTransaction];
      const pending = allTransactions.filter(tx => tx.status === 'pending');
      const recent = allTransactions
        .filter(tx => tx.status !== 'pending')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

      saveTransactions(allTransactions);

      return {
        ...prev,
        recentTransactions: recent,
        pendingTransactions: pending
      };
    });
  };

  // Update transaction
  const updateTransaction = (hash: string, updates: Partial<Transaction>) => {
    setTransactionState(prev => {
      const updateTransactionInList = (transactions: Transaction[]) =>
        transactions.map(tx => 
          tx.hash === hash ? { ...tx, ...updates } : tx
        );

      const updatedRecent = updateTransactionInList(prev.recentTransactions);
      const updatedPending = updateTransactionInList(prev.pendingTransactions);

      const allTransactions = [...updatedRecent, ...updatedPending];
      saveTransactions(allTransactions);

      return {
        ...prev,
        recentTransactions: updatedRecent,
        pendingTransactions: updatedPending.filter(tx => tx.status === 'pending')
      };
    });
  };

  // Get transaction by hash
  const getTransactionByHash = (hash: string) => {
    const allTransactions = [
      ...transactionState.recentTransactions,
      ...transactionState.pendingTransactions
    ];
    return allTransactions.find(tx => tx.hash === hash);
  };

  // Clear transactions
  const clearTransactions = async () => {
    try {
      await storage.remove(['transactions']);
      setTransactionState(prev => ({
        ...prev,
        recentTransactions: [],
        pendingTransactions: []
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear transactions:', error);
    }
  };

  // Refresh transactions
  const refreshTransactions = async () => {
    setTransactionState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // In a real implementation, you would fetch transaction status from blockchain
      const allTransactions = [
        ...transactionState.recentTransactions,
        ...transactionState.pendingTransactions
      ];

      // Helper function to check transaction status
      const checkTransactionStatus = async (tx: Transaction): Promise<Transaction> => {
        if (tx.status === 'pending') {
          try {
            const receipt = await getTransactionReceipt(tx.hash, tx.network);
            if (receipt) {
              // Transaction found on blockchain
              if (receipt.status === '1') {
                return { ...tx, status: 'confirmed', gasUsed: receipt.gasUsed };
              } else if (receipt.status === '0') {
                return { ...tx, status: 'failed', gasUsed: receipt.gasUsed };
              }
            } else {
              // If no receipt, still pending (or not yet propagated)
              return tx;
            }
          } catch (error) {
            console.error(`Error checking transaction status for ${tx.hash}:`, error);
            return { ...tx, status: 'failed', error: 'Failed to check status' }; // Mark as failed if API error
          }
        }
        return tx;
      };

      // Check transaction status from blockchain
      const updatedTransactions = await Promise.all(allTransactions.map(checkTransactionStatus));

      const pending = updatedTransactions.filter(tx => tx.status === 'pending');
      const recent = updatedTransactions
        .filter(tx => tx.status !== 'pending')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

      setTransactionState(prev => ({
        ...prev,
        recentTransactions: recent,
        pendingTransactions: pending,
        isLoading: false
      }));

      saveTransactions(updatedTransactions);
    } catch (error) {
      setTransactionState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh transactions'
      }));
    }
  };

  const value: TransactionContextType = {
    transactionState: transactionState,
    recentTransactions: transactionState.recentTransactions,
    pendingTransactions: transactionState.pendingTransactions,
    addTransaction,
    updateTransaction,
    getTransactionByHash,
    clearTransactions,
    refreshTransactions
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}; 