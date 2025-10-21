import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bitcoin, Send, Download, RefreshCw, Eye, EyeOff, Copy, Check, AlertCircle } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { litecoinUtils, LitecoinTransaction } from '../../utils/litecoin-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const LitecoinScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork } = useWallet();
  const [litecoinAddress, setLitecoinAddress] = useState<string>('');
  const [litecoinBalance, setLitecoinBalance] = useState<string>('0');
  const [transactions, setTransactions] = useState<LitecoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load main wallet's Litecoin address and balance
  useEffect(() => {
    if (wallet?.address && currentNetwork?.id === 'litecoin') {
      loadMainWalletLitecoinData();
    }
  }, [wallet?.address, currentNetwork?.id]);

  // Load main wallet's Litecoin data
  const loadMainWalletLitecoinData = async () => {
    if (!wallet?.address) {
      setError('No wallet available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the main wallet's Litecoin address
      let address = wallet.address;
      
      // If the current address doesn't look like a Litecoin address, derive one
      if (!address.startsWith('L') && !address.startsWith('M') && !address.startsWith('ltc1')) {
        try {
          // Request Litecoin address derivation from background script
          const response = await chrome.runtime.sendMessage({
            type: 'DERIVE_NETWORK_ADDRESS',
            networkId: 'litecoin'
          });
          
          if (response?.success && response?.data?.address) {
            address = response.data.address;
          } else {
            throw new Error('Failed to derive Litecoin address');
          }
        } catch (derivationError) {
          // eslint-disable-next-line no-console
          console.error('Litecoin address derivation failed:', derivationError);
          setError(`Failed to derive Litecoin address: ${derivationError.message}`);
          return;
        }
      }

      setLitecoinAddress(address);
      
      // Load balance and transactions
      await Promise.all([
        loadBalance(address),
        loadTransactions(address, 'mainnet')
      ]);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load Litecoin data:', error);
      setError(`Failed to load Litecoin data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Litecoin balance
  const loadBalance = async (address: string) => {
    try {
      const balance = await litecoinUtils.getBalance(address, 'mainnet');
      setLitecoinBalance(balance.confirmed.toString());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load Litecoin balance:', error);
      setLitecoinBalance('0');
    }
  };

  // Load transactions for the current address
  const loadTransactions = async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    try {
      const txs = await litecoinUtils.getTransactions(address, network);
      setTransactions(txs);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load Litecoin transactions:', error);
      setTransactions([]);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    if (!litecoinAddress) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadBalance(litecoinAddress),
        loadTransactions(litecoinAddress, 'mainnet')
      ]);
      toast.success('Litecoin data refreshed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh Litecoin data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy address');
    }
  };

  // Format LTC amount
  const formatLTC = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(8);
  };

  // Format USD value (mock - would need real price data)
  const formatUSD = (ltc: number): string => {
    const ltcPrice = 65; // Mock price - would need real API
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(ltc * ltcPrice);
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-slate-600 rounded-xl flex items-center justify-center">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Litecoin</h1>
              <p className="text-slate-400 text-sm">LTC Network</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6"
      >
        {error ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Litecoin Error</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={loadMainWalletLitecoinData}
              className="px-8 py-4 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-slate-700 transition-all duration-200 transform hover:scale-105"
            >
              Retry
            </button>
          </motion.div>
        ) : isLoading ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-gray-500 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-12 h-12 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Loading Litecoin</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Deriving your Litecoin address and loading balance...
            </p>
          </motion.div>
        ) : !litecoinAddress ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-gray-500 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bitcoin className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-4">No Litecoin Address</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Your Litecoin address is being derived from your main wallet
            </p>
            <button
              onClick={loadMainWalletLitecoinData}
              className="px-8 py-4 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-slate-700 transition-all duration-200 transform hover:scale-105"
            >
              Load Litecoin Address
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-gray-500 to-slate-600 rounded-2xl p-6 text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Litecoin Balance</h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {showBalance ? `${formatLTC(litecoinBalance)} LTC` : '••••••••'}
                </div>
                <div className="text-white/70">
                  {showBalance ? formatUSD(parseFloat(litecoinBalance)) : '••••••••'}
                </div>
              </div>

              {/* Address */}
              <div className="mt-6 p-4 bg-white/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm mb-1">Address</p>
                    <p className="font-mono text-sm break-all">
                      {litecoinAddress}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(litecoinAddress)}
                    className="ml-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied === litecoinAddress ? 
                      <Check className="w-5 h-5 text-green-400" /> : 
                      <Copy className="w-5 h-5" />
                    }
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              <button
                onClick={() => onNavigate('send')}
                className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Send LTC</span>
              </button>
              <button
                onClick={() => onNavigate('receive')}
                className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Receive LTC</span>
              </button>
            </motion.div>

            {/* Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Transactions</h3>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Bitcoin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Send or receive LTC to see your transaction history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.slice(0, 10).map((tx, index) => (
                      <motion.div
                        key={tx.txid}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            {tx.type === 'send' ? (
                              <Send className="w-5 h-5 text-red-500" />
                            ) : (
                              <Download className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{tx.type}</p>
                            <p className="text-gray-500 text-sm">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.type === 'send' ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {tx.type === 'send' ? '-' : '+'}{formatLTC(tx.amount)} LTC
                          </p>
                          <p className="text-gray-500 text-sm">
                            {formatUSD(tx.amount)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LitecoinScreen;
