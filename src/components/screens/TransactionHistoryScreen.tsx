import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { useTransaction } from '../../store/TransactionContext';
import { useWallet } from '../../store/WalletContext';
import web3Utils from '../../utils/web3-utils'; // Changed to default import
import toast from 'react-hot-toast';
import type { ScreenProps, Transaction } from '../../types/index';

const TransactionHistoryScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { recentTransactions, pendingTransactions, refreshTransactions } = useTransaction();
  const { wallet, currentNetwork } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [blockchainTransactions, setBlockchainTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Debug logging
  useEffect(() => {

  }, [wallet, currentNetwork, recentTransactions, pendingTransactions]);

  // Combine recent and pending transactions
  useEffect(() => {
    const combined = [...pendingTransactions, ...recentTransactions, ...blockchainTransactions];
    setAllTransactions(combined);
  }, [recentTransactions, pendingTransactions, blockchainTransactions]);

  // Load transactions when component mounts - DISABLED FOR NOW
  useEffect(() => {

    // if (wallet?.address && currentNetwork) {
    //   loadBlockchainTransactions(1, false);
    // }
  }, [wallet?.address, currentNetwork?.id]);

  // Load transactions from blockchain
  const loadBlockchainTransactions = async (pageNum: number = 1, append: boolean = false) => {
    if (!wallet?.address || !currentNetwork?.id) {
      const errorMsg = `No wallet or network selected. Wallet: ${!!wallet}, Address: ${!!wallet?.address}, Network: ${!!currentNetwork}, NetworkId: ${currentNetwork?.id}`;
      // eslint-disable-next-line no-console
      console.error('Transaction loading error:', errorMsg);
      setError(errorMsg);
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
        web3Utils.getTransactionHistory(wallet.address, currentNetwork.id, pageNum, 20).catch(() => []),
        web3Utils.getTokenTransactions(wallet.address, currentNetwork.id).catch(() => [])
      ]);
      
      // Convert blockchain transactions to our format
      const formattedTransactions = [...regularTxs, ...tokenTxs].map((tx: any) => ({
        id: tx.hash || tx.transactionHash,
        hash: tx.hash || tx.transactionHash,
        from: tx.from,
        to: tx.to,
        value: tx.value ? (parseInt(tx.value, 10) / 1e18).toString() : '0',
        network: currentNetwork.id,
        status: tx.confirmations > 0 ? 'confirmed' : 'pending',
        timestamp: parseInt(tx.timeStamp || tx.timestamp, 10) * 1000,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice, 10) / 1e9).toString() : '0',
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations || 0,
        isTokenTransaction: !!tx.tokenName,
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        tokenValue: tx.tokenValue
      }));

      if (append) {
        setBlockchainTransactions(prev => [...prev, ...formattedTransactions]);
      } else {
        setBlockchainTransactions(formattedTransactions);
      }
      
      // Check if there are more transactions
      setHasMore(formattedTransactions.length === 20);
      setPage(pageNum);
      
      if (pageNum === 1 && formattedTransactions.length > 0) {
        toast.success('Transactions refreshed');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading transactions:', error);
      // Set empty transactions instead of error
      if (append) {
        setBlockchainTransactions(prev => [...prev]);
      } else {
        setBlockchainTransactions([]);
      }
      setError('Unable to load transactions at this time');
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
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatValue = (value: string, isToken: boolean = false, tokenSymbol?: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0';
    
    if (isToken && tokenSymbol) {
      return `${numValue.toFixed(4)} ${tokenSymbol}`;
    }
    
    return `${numValue.toFixed(4)} ETH`;
  };

  const openExplorer = (hash: string) => {
    const explorerUrl = currentNetwork?.explorerUrl || 'https://etherscan.io';
    window.open(`${explorerUrl}/tx/${hash}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#180CB2] rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Transaction History</h1>
              <p className="text-slate-400 text-sm">View all transactions</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-6 bg-red-500/20 border border-red-400/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="text-red-300 hover:text-red-200 text-sm font-medium"
            >
              Retry
            </button>
          </div>
          <div className="mt-2 text-xs text-red-300">
            Debug: Wallet={!!wallet}, Address={!!wallet?.address}, Network={!!currentNetwork}, NetworkId={currentNetwork?.id}
          </div>
        </motion.div>
      )}

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1"
      >
        {isLoading && allTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading transactions...</p>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="py-12 text-center flex-1 flex flex-col justify-center">
            <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-white/10 rounded-full">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Transactions</h3>
            <p className="text-slate-400 mb-4">
              You haven't made any transactions yet.
            </p>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load Transactions'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {allTransactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <div className="font-medium text-white">
                        {transaction.isTokenTransaction ? 'Token Transfer' : 'Transaction'}
                      </div>
                      <div className="text-sm text-slate-400">
                        {formatTime(transaction.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openExplorer(transaction.hash)}
                      className="p-1 rounded hover:bg-white/10"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => toggleDetails(transaction.id)}
                      className="p-1 rounded hover:bg-white/10"
                      title="Toggle Details"
                    >
                      {showDetails[transaction.id] ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount:</span>
                    <span className="font-medium text-white">
                      {formatValue(transaction.value, transaction.isTokenTransaction, transaction.tokenSymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
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
                    className="mt-3 pt-3 border-t border-white/20 space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">From:</span>
                      <span className="font-mono text-white">
                        {formatAddress(transaction.from)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">To:</span>
                      <span className="font-mono text-white">
                        {formatAddress(transaction.to)}
                      </span>
                    </div>
                    {transaction.blockNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Block:</span>
                        <span className="text-white">
                          {parseInt(transaction.blockNumber, 10).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {transaction.confirmations > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Confirmations:</span>
                        <span className="text-white">
                          {transaction.confirmations}
                        </span>
                      </div>
                    )}
                    {transaction.gasUsed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Gas Used:</span>
                        <span className="text-white">
                          {parseInt(transaction.gasUsed, 10).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {transaction.gasPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Gas Price:</span>
                        <span className="text-white">
                          {parseFloat(transaction.gasPrice).toFixed(2)} Gwei
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Hash:</span>
                      <span className="font-mono text-white text-xs">
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
                  className="px-6 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
      </motion.div>
    </div>
  );
};

export default TransactionHistoryScreen; 