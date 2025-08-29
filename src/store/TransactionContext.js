import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
const TransactionContext = createContext(undefined);
export const useTransaction = () => {
    const context = useContext(TransactionContext);
    if (!context) {
        throw new Error('useTransaction must be used within a TransactionProvider');
    }
    return context;
};
export const TransactionProvider = ({ children }) => {
    const [transactionState, setTransactionState] = useState({
        recentTransactions: [],
        pendingTransactions: [],
        isLoading: false,
        error: null
    });
    // Load transactions from storage
    useEffect(() => {
        chrome.storage.local.get(['transactions'], (result) => {
            if (result.transactions) {
                const transactions = result.transactions;
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
        });
    }, []);
    // Save transactions to storage
    const saveTransactions = (transactions) => {
        chrome.storage.local.set({ transactions });
    };
    // Add transaction
    const addTransaction = (transaction) => {
        const newTransaction = {
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
    const updateTransaction = (hash, updates) => {
        setTransactionState(prev => {
            const updateTransactionInList = (transactions) => transactions.map(tx => tx.hash === hash ? { ...tx, ...updates } : tx);
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
    const getTransactionByHash = (hash) => {
        const allTransactions = [
            ...transactionState.recentTransactions,
            ...transactionState.pendingTransactions
        ];
        return allTransactions.find(tx => tx.hash === hash);
    };
    // Clear transactions
    const clearTransactions = () => {
        setTransactionState(prev => ({
            ...prev,
            recentTransactions: [],
            pendingTransactions: []
        }));
        chrome.storage.local.remove(['transactions']);
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
                  // Check transaction status from blockchain
      const updatedTransactions = await Promise.all(allTransactions.map(async (tx) => {
        if (tx.status === 'pending') {
          try {
            // In a real implementation, check transaction status from blockchain
            // For now, keep transactions as pending until real implementation
            return tx;
          } catch (error) {
            console.error('Error checking transaction status:', error);
            return tx;
          }
        }
        return tx;
      }));
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
        }
        catch (error) {
            setTransactionState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to refresh transactions'
            }));
        }
    };
    const value = {
        transactionState: transactionState,
        recentTransactions: transactionState.recentTransactions,
        pendingTransactions: transactionState.pendingTransactions,
        addTransaction,
        updateTransaction,
        getTransactionByHash,
        clearTransactions,
        refreshTransactions
    };
    return (_jsx(TransactionContext.Provider, { value: value, children: children }));
};
