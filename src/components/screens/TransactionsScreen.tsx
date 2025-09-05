import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { getBitcoinTransactions } from '../../utils/bitcoin-simple';
import { getEVMTransactions } from '../../utils/evm-transaction-utils';
import { getNetworkRPCUrl } from '../../utils/token-balance-utils';
import toast from 'react-hot-toast';

interface Transaction {
  txid?: string;
  hash?: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  type: 'receive' | 'send';
  address: string;
  fee?: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

const TransactionsScreen: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { currentNetwork } = useNetwork();
  const currentNetworkData = currentNetwork;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'receive' | 'send'>('all');

  useEffect(() => {
    if (wallet?.address) {
      loadTransactions();
    }
  }, [wallet?.address, wallet?.currentNetwork]);

  const loadTransactions = async () => {
    if (!wallet?.address) return;
    
    setIsLoading(true);
    try {
      const network = wallet.currentNetwork || 'ethereum';
      
      if (network === 'bitcoin') {
        // Load Bitcoin transactions
        const btcTransactions = await getBitcoinTransactions(wallet.address, 'mainnet');
        setTransactions(btcTransactions);
      } else {
        // Load EVM transactions
        const rpcUrl = getNetworkRPCUrl(network);
        const evmTransactions = await getEVMTransactions(wallet.address, rpcUrl, network);
        setTransactions(evmTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const formatAmount = (amount: number, symbol?: string) => {
    const networkSymbol = wallet?.currentNetwork === 'bitcoin' ? 'BTC' : 
                         wallet?.currentNetwork === 'ethereum' ? 'ETH' : 
                         currentNetworkData?.symbol || 'ETH';
    return `${amount.toFixed(8)} ${symbol || networkSymbol}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (confirmations: number, status?: string) => {
    if (status === 'failed') {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    if (confirmations > 0) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusText = (confirmations: number, status?: string) => {
    if (status === 'failed') return 'Failed';
    if (confirmations > 0) return `${confirmations} confirmations`;
    return 'Pending';
  };

  const openExplorer = (txid: string) => {
    const network = wallet?.currentNetwork || 'ethereum';
    let explorerUrl = '';
    
    if (network === 'bitcoin') {
      explorerUrl = `https://blockstream.info/tx/${txid}`;
    } else if (network === 'ethereum') {
      explorerUrl = `https://etherscan.io/tx/${txid}`;
    } else if (network === 'bsc') {
      explorerUrl = `https://bscscan.com/tx/${txid}`;
    } else if (network === 'polygon') {
      explorerUrl = `https://polygonscan.com/tx/${txid}`;
    } else if (network === 'arbitrum') {
      explorerUrl = `https://arbiscan.io/tx/${txid}`;
    } else if (network === 'optimism') {
      explorerUrl = `https://optimistic.etherscan.io/tx/${txid}`;
    } else if (network === 'base') {
      explorerUrl = `https://basescan.org/tx/${txid}`;
    } else if (network === 'fantom') {
      explorerUrl = `https://ftmscan.com/tx/${txid}`;
    } else if (network === 'zksync') {
      explorerUrl = `https://explorer.zksync.io/tx/${txid}`;
    } else if (network === 'linea') {
      explorerUrl = `https://lineascan.build/tx/${txid}`;
    } else if (network === 'mantle') {
      explorerUrl = `https://explorer.mantle.xyz/tx/${txid}`;
    } else if (network === 'scroll') {
      explorerUrl = `https://scrollscan.com/tx/${txid}`;
    } else if (network === 'polygon-zkevm') {
      explorerUrl = `https://zkevm.polygonscan.com/tx/${txid}`;
    } else if (network === 'arbitrum-nova') {
      explorerUrl = `https://nova.arbiscan.io/tx/${txid}`;
    } else {
      // Default to Etherscan
      explorerUrl = `https://etherscan.io/tx/${txid}`;
    }
    
    window.open(explorerUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#180CB2] to-gray-900 text-white">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold">Transaction History</h1>
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Network Info */}
      <div className="p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold capitalize">
                {wallet?.currentNetwork || 'ethereum'} Network
              </h2>
              <p className="text-sm text-gray-400">
                {wallet?.address ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}` : 'No address'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-lg font-semibold">{transactions.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-4">
          {(['all', 'receive', 'send'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-[#180CB2] text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#180CB2] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No Transactions</h3>
              <p className="text-sm text-gray-500">
                {filter === 'all' 
                  ? 'No transactions found for this address'
                  : `No ${filter} transactions found`
                }
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx, index) => (
              <motion.div
                key={tx.txid || tx.hash || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {getStatusIcon(tx.confirmations, tx.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white capitalize">{tx.type}</h4>
                      <p className="text-xs text-gray-400">
                        {tx.txid ? `${tx.txid.slice(0, 12)}...${tx.txid.slice(-12)}` : 
                         tx.hash ? `${tx.hash.slice(0, 12)}...${tx.hash.slice(-12)}` : 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(tx.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'receive' ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getStatusText(tx.confirmations, tx.status)}
                    </p>
                    {tx.fee && (
                      <p className="text-xs text-gray-500">Fee: {formatAmount(tx.fee)}</p>
                    )}
                  </div>
                </div>
                
                {/* Transaction Details */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center space-x-4">
                      {tx.blockHeight && (
                        <span>Block: {tx.blockHeight}</span>
                      )}
                      <span>Time: {formatDate(tx.timestamp)}</span>
                    </div>
                    {(tx.txid || tx.hash) && (
                      <button
                        onClick={() => openExplorer(tx.txid || tx.hash!)}
                        className="flex items-center space-x-1 text-[#180CB2] hover:text-[#140a8f] transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsScreen; 