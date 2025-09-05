import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Send, Download, Settings, Copy, Check, RefreshCw, Eye, EyeOff, Clock, DollarSign, Zap, Coins, Plus } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { tronUtils, TronWallet, TronTransaction, TronToken } from '../../utils/tron-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const TronScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [tronWallets, setTronWallets] = useState<TronWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<TronWallet | null>(null);
  const [transactions, setTransactions] = useState<TronTransaction[]>([]);
  const [tokens, setTokens] = useState<TronToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [networkStatus, setNetworkStatus] = useState<{ blockHeight: number; totalSupply: number; tps: number } | null>(null);

  // Load existing TRON wallets from storage
  useEffect(() => {
    loadTronWallets();
    loadNetworkStatus();
  }, []);

  // Load transactions and tokens when wallet is selected
  useEffect(() => {
    if (selectedWallet) {
      loadWalletData(selectedWallet);
    }
  }, [selectedWallet]);

  const loadTronWallets = async () => {
    try {
      const stored = await storage.get(['tronWallets']);
      if (stored.tronWallets) {
        setTronWallets(stored.tronWallets);
        if (stored.tronWallets.length > 0) {
          setSelectedWallet(stored.tronWallets[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load TRON wallets:', error);
    }
  };

  const saveTronWallets = async (wallets: TronWallet[]) => {
    try {
      await storage.set({ tronWallets: wallets });
    } catch (error) {
      console.error('Failed to save TRON wallets:', error);
    }
  };

  const createTronWallet = async () => {
    if (!newWalletName.trim()) {
      toast.error('Please enter a wallet name');
      return;
    }

    setIsLoading(true);
    try {
      const newWallet = tronUtils.generateWallet(newWalletName, selectedNetwork);
      const updatedWallets = [...tronWallets, newWallet];
      
      setTronWallets(updatedWallets);
      setSelectedWallet(newWallet);
      await saveTronWallets(updatedWallets);
      
      setShowCreateWallet(false);
      setNewWalletName('');
      toast.success('TRON wallet created successfully!');
    } catch (error) {
      console.error('Error creating TRON wallet:', error);
      toast.error('Failed to create TRON wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletData = async (wallet: TronWallet) => {
    try {
      const [balance, accountResources, txs] = await Promise.all([
        tronUtils.getBalance(wallet.address, wallet.network),
        tronUtils.getAccountResources(wallet.address, wallet.network),
        tronUtils.getTransactions(wallet.address, wallet.network)
      ]);

      // Update wallet with fresh data
      const updatedWallet = {
        ...wallet,
        balance,
        energy: accountResources.energy,
        bandwidth: accountResources.bandwidth
      };

      setSelectedWallet(updatedWallet);
      setTransactions(txs);

      // Update wallet in list
      const updatedWallets = tronWallets.map(w => 
        w.id === wallet.id ? updatedWallet : w
      );
      setTronWallets(updatedWallets);
      await saveTronWallets(updatedWallets);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const refreshWallet = async () => {
    if (!selectedWallet) return;
    
    setIsRefreshing(true);
    try {
      await loadWalletData(selectedWallet);
      toast.success('Wallet refreshed!');
    } catch (error) {
      toast.error('Failed to refresh wallet');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const status = await tronUtils.getNetworkStatus(selectedNetwork);
      setNetworkStatus(status);
    } catch (error) {
      console.error('Error loading network status:', error);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatTRX = (amount: number) => {
    return amount.toFixed(4);
  };

  const formatUSD = (trx: number) => {
    // In a real app, you'd fetch current TRX price
    const trxPrice = 0.1; // Example price
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(trx * trxPrice);
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'mainnet': return 'from-red-500 to-orange-500';
      case 'testnet': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getNetworkLabel = (network: string) => {
    switch (network) {
      case 'mainnet': return 'Mainnet';
      case 'testnet': return 'Testnet';
      default: return 'Unknown';
    }
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
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TRON</h1>
              <p className="text-slate-400 text-sm">TRX & TRC20 Tokens</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateWallet(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Network Status */}
        {networkStatus && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${getNetworkColor(selectedNetwork)} rounded-lg flex items-center justify-center`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">TRON {getNetworkLabel(selectedNetwork)}</h3>
                  <p className="text-slate-400 text-sm">Block #{networkStatus.blockHeight.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">TPS</p>
                <p className="font-semibold text-white">{networkStatus.tps.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Selection */}
        {tronWallets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">TRON Wallets</h2>
            <div className="space-y-3">
              {tronWallets.map((wallet) => (
                <motion.div
                  key={wallet.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWallet?.id === wallet.id
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-white/20 hover:border-white/30'
                  }`}
                  onClick={() => setSelectedWallet(wallet)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedWallet?.id === wallet.id ? 'bg-red-500/20' : 'bg-white/10'
                      }`}>
                        <TrendingUp className={`w-5 h-5 ${selectedWallet?.id === wallet.id ? 'text-red-400' : 'text-white'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{wallet.name}</h3>
                        <p className="text-slate-400 text-sm">{formatAddress(wallet.address)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Balance</p>
                      <p className="font-semibold text-white">{formatTRX(wallet.balance)} TRX</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Wallet Details */}
        {selectedWallet && (
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Balance</h3>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">TRX Balance</p>
                      <p className="font-semibold text-white">
                        {showBalance ? formatTRX(selectedWallet.balance) : '••••••••'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">USD Value</p>
                    <p className="font-semibold text-white">
                      {showBalance ? formatUSD(selectedWallet.balance) : '••••••••'}
                    </p>
                  </div>
                </div>

                {/* Resources */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm">Energy</p>
                    <p className="font-semibold text-white">{selectedWallet.energy.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-sm">Bandwidth</p>
                    <p className="font-semibold text-white">{selectedWallet.bandwidth.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Wallet Address</h3>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <p className="text-sm font-mono text-slate-300 break-all">{selectedWallet.address}</p>
                <button
                  onClick={() => copyAddress(selectedWallet.address)}
                  className="ml-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied === selectedWallet.address ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('send')}
                className="p-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span className="font-semibold">Send</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('receive')}
                className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span className="font-semibold">Receive</span>
              </motion.button>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                  <button
                    onClick={refreshWallet}
                    disabled={isRefreshing}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.txID} className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'send' ? 'bg-red-500/20' : 'bg-green-500/20'
                          }`}>
                            {tx.type === 'send' ? <Send className="w-4 h-4 text-red-400" /> : <Download className="w-4 h-4 text-green-400" />}
                          </div>
                          <div>
                            <p className="font-semibold text-white capitalize">{tx.type}</p>
                            <p className="text-slate-400 text-sm">{formatAddress(tx.from)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatTRX(tx.amount)} TRX</p>
                          <p className="text-slate-400 text-sm">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Wallet Modal */}
        {showCreateWallet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-2xl p-6 w-80 max-w-[90vw]"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Create TRON Wallet</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Wallet Name</label>
                  <input
                    type="text"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                    placeholder="Enter wallet name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Network</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value as 'mainnet' | 'testnet')}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="mainnet">Mainnet</option>
                    <option value="testnet">Testnet</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateWallet(false)}
                  className="flex-1 p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTronWallet}
                  disabled={isLoading}
                  className="flex-1 p-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:from-red-600 hover:to-orange-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TronScreen;
