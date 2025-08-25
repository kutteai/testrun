import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Send,
  Download
} from 'lucide-react';
import { useTransaction } from '../../store/TransactionContext';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { getTransactionHistory, getTokenTransactions } from '../../utils/web3-utils';
import toast from 'react-hot-toast';
import type { ScreenProps, Transaction } from '../../types/index';

const TransactionHistoryScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { recentTransactions, pendingTransactions } = useTransaction();
  const { wallet } = useWallet();
  const { currentNetwork } = useNetwork();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [blockchainTransactions, setBlockchainTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Combine recent and pending transactions with blockchain transactions
  useEffect(() => {
    const combined = [
      ...pendingTransactions,
      ...recentTransactions,
      ...blockchainTransactions
    ];
    
    // Remove duplicates based on hash
    const unique = combined.filter((tx, index, self) => 
      index === self.findIndex(t => t.hash === tx.hash)
    );
    
    // Sort by timestamp (most recent first)
    const sorted = unique.sort((a, b) => b.timestamp - a.timestamp);
    
    setAllTransactions(sorted);
  }, [recentTransactions, pendingTransactions, blockchainTransactions]);

  // Load initial transactions on mount
  useEffect(() => {
    if (wallet?.address && currentNetwork) {
      loadBlockchainTransactions(1, false);
    }
  }, [wallet?.address, currentNetwork?.id]);

  // Load transactions from blockchain
  const loadBlockchainTransactions = async (pageNum: number = 1, append: boolean = false) => {
    if (!wallet?.address || !currentNetwork) {
      setError('No wallet or network selected');
      return;
    }
    
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);
    
    try {
      // Load both regular and token transactions
      const [regularTxs, tokenTxs] = await Promise.all([
        getTransactionHistory(wallet.address, currentNetwork.id, pageNum, 20),
        getTokenTransactions(wallet.address, currentNetwork.id)
      ]);
      
      // Convert blockchain transactions to our format
      const formattedTransactions = [...regularTxs, ...tokenTxs]
        .map((tx: any): Transaction => {
          const value = tx.value ? tx.value.toString() : '0';
          const isReceive = tx.to?.toLowerCase() === wallet.address.toLowerCase();
          
          return {
            id: tx.hash || tx.transactionHash,
            hash: tx.hash || tx.transactionHash,
            from: tx.from,
            to: tx.to,
            value: value,
            amount: value, // Use value as amount
            network: currentNetwork.id,
            type: isReceive ? 'receive' : 'send', // Determine type based on direction
            status: parseInt(tx.confirmations || '0') > 0 ? 'confirmed' : 'pending',
            timestamp: parseInt(tx.timeStamp || tx.timestamp || Date.now().toString()) * (tx.timeStamp ? 1000 : 1),
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice) / 1e9).toString() : '0',
            blockNumber: tx.blockNumber,
            confirmations: parseInt(tx.confirmations || '0'),
            isTokenTransaction: !!tx.tokenName,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenValue: tx.tokenValue,
            data: tx.input || '0x',
            nonce: parseInt(tx.nonce || '0')
          };
        })
        .filter((tx): tx is Transaction => tx.hash && tx.hash !== '');

      if (append) {
        setBlockchainTransactions(prev => [...prev, ...formattedTransactions]);
      } else {
        setBlockchainTransactions(formattedTransactions);
      }
      
      // Check if there are more transactions
      setHasMore(formattedTransactions.length === 20);
      setPage(pageNum);
      
      if (pageNum === 1) {
        toast.success('Transactions loaded successfully');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load transactions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more transactions
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadBlockchainTransactions(page + 1, true);
    }
  };

  // Refresh transactions
  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    setBlockchainTransactions([]);
    loadBlockchainTransactions(1, false);
  };

  // Toggle transaction details
  const toggleDetails = (transactionId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTransactionType = (tx: Transaction) => {
    if (!wallet?.address) return 'Unknown';
    
    const userAddress = wallet.address.toLowerCase();
    const fromAddress = tx.from.toLowerCase();
    const toAddress = tx.to.toLowerCase();
    
    if (fromAddress === userAddress && toAddress === userAddress) {
      return 'Self';
    } else if (fromAddress === userAddress) {
      return 'Sent';
    } else if (toAddress === userAddress) {
      return 'Received';
    } else {
      return 'Contract';
    }
  };

  const getTransactionIcon = (tx: Transaction) => {
    const type = getTransactionType(tx);
    switch (type) {
      case 'Sent':
        return <Send className="w-4 h-4 text-red-500" />;
      case 'Received':
        return <Download className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatValue = (tx: Transaction) => {
    try {
      if (tx.isTokenTransaction && tx.tokenSymbol && tx.tokenValue) {
        const tokenValue = parseFloat(tx.tokenValue);
        return `${tokenValue.toFixed(4)} ${tx.tokenSymbol}`;
      }
      
      const value = parseFloat(tx.value) / Math.pow(10, 18); // Convert from wei to ETH
      if (isNaN(value)) return '0';
      
      return `${value.toFixed(6)} ${currentNetwork?.symbol || 'ETH'}`;
    } catch (error) {
      return '0';
    }
  };

  const openExplorer = (hash: string) => {
    if (!currentNetwork) return;
    
    const explorerUrl = currentNetwork.explorerUrl || 'https://etherscan.io';
    window.open(`${explorerUrl}/tx/${hash}`, '_blank');
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Transaction History</h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && allTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
            <p className="text-gray-600 mb-4">
              You haven't made any transactions yet.
            </p>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {allTransactions.map((transaction) => (
              <motion.div
                key={`${transaction.hash}-${transaction.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white rounded-xl shadow-sm border"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {getTransactionType(transaction)} - {transaction.isTokenTransaction ? 'Token Transfer' : 'Transaction'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(transaction.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openExplorer(transaction.hash)}
                      className="p-1 rounded hover:bg-gray-100"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => toggleDetails(transaction.id)}
                      className="p-1 rounded hover:bg-gray-100"
                      title="Toggle Details"
                    >
                      {showDetails[transaction.id] ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-gray-900">
                      {formatValue(transaction)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {showDetails[transaction.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">From:</span>
                      <span className="font-mono text-gray-900 text-xs">
                        {formatAddress(transaction.from)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">To:</span>
                      <span className="font-mono text-gray-900 text-xs">
                        {formatAddress(transaction.to)}
                      </span>
                    </div>
                    {transaction.blockNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Block:</span>
                        <span className="text-gray-900">
                          {transaction.blockNumber}
                        </span>
                      </div>
                    )}
                    {transaction.confirmations !== undefined && transaction.confirmations > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Confirmations:</span>
                        <span className="text-gray-900">
                          {transaction.confirmations}
                        </span>
                      </div>
                    )}
                    {transaction.gasUsed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gas Used:</span>
                        <span className="text-gray-900">
                          {parseInt(transaction.gasUsed).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {transaction.gasPrice && parseFloat(transaction.gasPrice) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gas Price:</span>
                        <span className="text-gray-900">
                          {parseFloat(transaction.gasPrice).toFixed(2)} Gwei
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hash:</span>
                      <span className="font-mono text-gray-900 text-xs">
                        {formatAddress(transaction.hash)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryScreen;