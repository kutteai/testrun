import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bitcoin, Send, Download, Settings, Copy, Check, RefreshCw, Eye, EyeOff, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { bitcoinUtils, BitcoinWallet, AddressType, BitcoinTransaction } from '../../utils/bitcoin-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const BitcoinScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [bitcoinWallets, setBitcoinWallets] = useState<BitcoinWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<BitcoinWallet | null>(null);
  const [transactions, setTransactions] = useState<BitcoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [selectedAddressType, setSelectedAddressType] = useState<AddressType>(AddressType.NATIVE_SEGWIT);
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('testnet');

  // Load existing Bitcoin wallets from storage
  useEffect(() => {
    loadBitcoinWallets();
  }, []);

  // Load transactions when wallet is selected
  useEffect(() => {
    if (selectedWallet) {
      loadTransactions(selectedWallet.address, selectedWallet.network);
    }
  }, [selectedWallet]);

  // Load Bitcoin wallets from storage
  const loadBitcoinWallets = async (): Promise<void> => {
    try {
      const stored = await storage.get(['bitcoinWallets']);
      if (stored.bitcoinWallets) {
        setBitcoinWallets(stored.bitcoinWallets);
        if (stored.bitcoinWallets.length > 0) {
          setSelectedWallet(stored.bitcoinWallets[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load Bitcoin wallets:', error);
    }
  };

  // Save Bitcoin wallets to storage
  const saveBitcoinWallets = async (wallets: any[]): Promise<void> => {
    try {
      await storage.set({ bitcoinWallets: wallets });
      setBitcoinWallets(wallets);
    } catch (error) {
      console.error('Failed to save Bitcoin wallets:', error);
    }
  };

  const createBitcoinWallet = async () => {
    if (!newWalletName.trim()) {
      toast.error('Please enter a wallet name');
      return;
    }

    setIsLoading(true);
    try {
      const newWallet = bitcoinUtils.generateWallet(newWalletName, selectedNetwork, selectedAddressType);
      const updatedWallets = [...bitcoinWallets, newWallet];
      
      setBitcoinWallets(updatedWallets);
      setSelectedWallet(newWallet);
      await saveBitcoinWallets(updatedWallets);
      
      setShowCreateWallet(false);
      setNewWalletName('');
      toast.success('Bitcoin wallet created successfully!');
    } catch (error) {
      console.error('Error creating Bitcoin wallet:', error);
      toast.error('Failed to create Bitcoin wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (address: string, network: 'mainnet' | 'testnet') => {
    try {
      const txs = await bitcoinUtils.getTransactions(address, network);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const refreshWallet = async () => {
    if (!selectedWallet) return;
    
    setIsRefreshing(true);
    try {
      const balance = await bitcoinUtils.getBalance(selectedWallet.address, selectedWallet.network);
      const updatedWallet = { ...selectedWallet, balance: balance.confirmed, unconfirmedBalance: balance.unconfirmed };
      
      setSelectedWallet(updatedWallet);
      const updatedWallets = bitcoinWallets.map(w => 
        w.id === updatedWallet.id ? updatedWallet : w
      );
      setBitcoinWallets(updatedWallets);
      await saveBitcoinWallets(updatedWallets);
      
      await loadTransactions(selectedWallet.address, selectedWallet.network);
      toast.success('Wallet refreshed successfully');
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      toast.error('Failed to refresh wallet');
    } finally {
      setIsRefreshing(false);
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

  const formatSatoshi = (satoshi: number) => {
    return (satoshi / 100000000).toFixed(8);
  };

  const formatUSD = (btc: number) => {
    // In a real app, you'd fetch current BTC price
    const btcPrice = 45000; // Example price
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(btc * btcPrice);
  };

  const getAddressTypeLabel = (type: AddressType) => {
    switch (type) {
      case AddressType.LEGACY: return 'Legacy';
      case AddressType.SEGWIT: return 'SegWit';
      case AddressType.NATIVE_SEGWIT: return 'Native SegWit';
      default: return 'Unknown';
    }
  };

  const getAddressTypeColor = (type: AddressType) => {
    switch (type) {
      case AddressType.LEGACY: return 'from-gray-500 to-gray-600';
      case AddressType.SEGWIT: return 'from-blue-500 to-blue-600';
      case AddressType.NATIVE_SEGWIT: return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#180CB2] to-slate-900 text-white flex flex-col">
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
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Bitcoin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bitcoin</h1>
              <p className="text-slate-400 text-sm">BTC Wallet Management</p>
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
              onClick={refreshWallet}
              className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Wallet Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bitcoin Wallets</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateWallet(true)}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Create Wallet
            </motion.button>
          </div>

          {bitcoinWallets.length === 0 ? (
            <div className="text-center py-8">
              <Bitcoin className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-400">No Bitcoin wallets found</p>
              <p className="text-slate-500 text-sm">Create your first Bitcoin wallet to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bitcoinWallets.map((btcWallet) => (
                <motion.div
                  key={btcWallet.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedWallet(btcWallet)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWallet?.id === btcWallet.id
                      ? 'border-yellow-500 bg-yellow-500/20'
                      : 'border-white/20 hover:border-white/30 bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${getAddressTypeColor(btcWallet.addressType)} rounded-xl flex items-center justify-center`}>
                        <Bitcoin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{btcWallet.name}</h4>
                        <p className="text-slate-400 text-sm">{formatAddress(btcWallet.address)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            btcWallet.network === 'mainnet' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {btcWallet.network}
                          </span>
                          <span className="text-xs text-slate-500">
                            {getAddressTypeLabel(btcWallet.addressType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {showBalance ? formatSatoshi(btcWallet.balance) : '••••••••'} BTC
                      </p>
                      <p className="text-slate-400 text-sm">
                        {showBalance ? formatUSD(btcWallet.balance / 100000000) : '••••••••'}
                      </p>
                      {btcWallet.unconfirmedBalance > 0 && (
                        <p className="text-yellow-400 text-xs">
                          +{formatSatoshi(btcWallet.unconfirmedBalance)} pending
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Wallet Details */}
        {selectedWallet && (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
            <h3 className="text-lg font-semibold mb-4">Wallet Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Address:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{formatAddress(selectedWallet.address)}</span>
                  <button
                    onClick={() => copyAddress(selectedWallet.address)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {copied === selectedWallet.address ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Network:</span>
                <span className="text-white">{selectedWallet.network}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Address Type:</span>
                <span className="text-white">{getAddressTypeLabel(selectedWallet.addressType)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-white">{new Date(selectedWallet.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('send')}
                className="flex-1 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('receive')}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Receive</span>
              </motion.button>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {selectedWallet && transactions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx, index) => (
                <motion.div
                  key={tx.txid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'send' ? 'bg-red-500/20' : 'bg-green-500/20'
                      }`}>
                        {tx.type === 'send' ? (
                          <Send className="w-5 h-5 text-red-400" />
                        ) : (
                          <Download className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-slate-400 text-sm">{formatAddress(tx.txid)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                          {tx.confirmations > 0 && (
                            <span className="text-xs text-green-400">
                              {tx.confirmations} confirmations
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {tx.type === 'send' ? '-' : '+'}{formatSatoshi(tx.amount)} BTC
                      </p>
                      <p className="text-slate-400 text-sm">
                        {formatUSD(tx.amount / 100000000)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Bitcoin Info */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-sm text-yellow-400 font-medium">About Bitcoin</span>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Bitcoin is the world's first decentralized cryptocurrency, enabling peer-to-peer transactions without intermediaries.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Network</p>
              <p className="text-white font-medium">Bitcoin</p>
            </div>
            <div>
              <p className="text-slate-400">Block Time</p>
              <p className="text-white font-medium">~10 minutes</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Create Wallet Modal */}
      {showCreateWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Create Bitcoin Wallet</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="My Bitcoin Wallet"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Network
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value as 'mainnet' | 'testnet')}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white"
                >
                  <option value="testnet">Testnet (Recommended for testing)</option>
                  <option value="mainnet">Mainnet (Real Bitcoin)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Address Type
                </label>
                <select
                  value={selectedAddressType}
                  onChange={(e) => setSelectedAddressType(e.target.value as AddressType)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white"
                >
                  <option value={AddressType.NATIVE_SEGWIT}>Native SegWit (Recommended)</option>
                  <option value={AddressType.SEGWIT}>SegWit</option>
                  <option value={AddressType.LEGACY}>Legacy</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateWallet(false)}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createBitcoinWallet}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Wallet'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BitcoinScreen;
