import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Send, 
  Download, 
  Settings, 
  Shield, 
  TrendingUp, 
  Activity,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useTransaction } from '../../store/TransactionContext';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const DashboardScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { portfolioValue } = usePortfolio();
  const { recentTransactions, pendingTransactions } = useTransaction();
  const { networkState } = useNetwork();
  
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (wallet?.address) {
      try {
        await navigator.clipboard.writeText(wallet.address);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy address');
      }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(4);
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col h-full">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PayCio Wallet</h1>
              <p className="text-slate-400 text-sm">Secure Multi-Chain</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={refreshData}
              className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-300 text-sm font-medium">Total Balance</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">{networkState.currentNetwork?.symbol || 'ETH'}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-3xl font-bold mb-1">
              {showBalance ? formatBalance(wallet?.balance || '0') : '••••••'}
            </div>
            <div className="text-slate-400 text-sm">
              {showBalance ? formatUSD(portfolioValue?.totalUSD || 0) : '••••••'}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-mono">{formatAddress(wallet?.address || '')}</span>
            </div>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 mb-6"
      >
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('send')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-center hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <Send className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Send</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('receive')}
            className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-center hover:from-green-600 hover:to-green-700 transition-all"
          >
            <Download className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Receive</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('security')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-center hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            <Shield className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Security</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Portfolio Performance */}
      {portfolioValue && portfolioValue.totalUSD > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 mb-6"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Portfolio</h3>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">24h Change</p>
                <p className={`text-lg font-semibold ${portfolioValue.totalChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioValue.totalChange24h >= 0 ? '+' : ''}{portfolioValue.totalChange24h.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-lg font-semibold">{formatUSD(portfolioValue.totalUSD)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pb-6 flex-1 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <button
                            onClick={() => onNavigate('transaction-history')}
            className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.slice(0, 3).map((tx, index) => (
            <motion.div
              key={tx.hash}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    (tx as any).type === 'send' ? 'bg-red-500/20' : 'bg-green-500/20'
                  }`}>
                    {(tx as any).type === 'send' ? (
                      <Send className="w-5 h-5 text-red-400" />
                    ) : (
                      <Download className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{(tx as any).type || 'transaction'}</p>
                    <p className="text-slate-400 text-sm">{formatAddress(tx.hash)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{(tx as any).amount || tx.value} {(tx as any).network || 'ETH'}</p>
                  <p className="text-slate-400 text-sm">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="text-center py-8 flex-1 flex flex-col justify-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-400">No transactions yet</p>
              <p className="text-slate-500 text-sm">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardScreen; 