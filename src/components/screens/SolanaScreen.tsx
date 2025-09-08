import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Send, Download, Settings, Copy, Check, RefreshCw, Eye, EyeOff, Clock, DollarSign, Zap, Coins } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { solanaUtils, SolanaWallet, SolanaTransaction, SolanaToken } from '../../utils/solana-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const SolanaScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, currentNetwork } = useWallet();
  const [solanaWallets, setSolanaWallets] = useState<SolanaWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<SolanaWallet | null>(null);
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [tokens, setTokens] = useState<SolanaToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet' | 'devnet'>('devnet');
  const [networkStatus, setNetworkStatus] = useState<{ slot: number; tps: number; avgBlockTime: number } | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);

  // Load existing Solana wallets from storage
  useEffect(() => {
    loadSolanaWallets();
    loadNetworkStatus();
    loadSolPrice();
  }, []);

  // Listen for network changes
  useEffect(() => {
    const handleNetworkChange = async (event: CustomEvent) => {
      console.log('🔄 Network changed event received in SolanaScreen:', event.detail);
      if (currentNetwork?.id === 'solana') {
        // Refresh Solana data when switching to Solana network
        await loadSolanaWallets();
        await loadNetworkStatus();
      }
    };

    window.addEventListener('networkChanged', handleNetworkChange as EventListener);
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
    };
  }, [currentNetwork]);

  // Load transactions and tokens when wallet is selected
  useEffect(() => {
    if (selectedWallet) {
      loadWalletData(selectedWallet);
    }
  }, [selectedWallet]);

  // Load Solana wallets from storage
  const loadSolanaWallets = async (): Promise<void> => {
    try {
      const stored = await storage.get(['solanaWallets']);
      if (stored.solanaWallets) {
        setSolanaWallets(stored.solanaWallets);
        if (stored.solanaWallets.length > 0) {
          setSelectedWallet(stored.solanaWallets[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load Solana wallets:', error);
    }
  };

  // Save Solana wallets to storage
  const saveSolanaWallets = async (wallets: any[]): Promise<void> => {
    try {
      await storage.set({ solanaWallets: wallets });
      setSolanaWallets(wallets);
    } catch (error) {
      console.error('Failed to save Solana wallets:', error);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const status = await solanaUtils.getNetworkStatus(selectedNetwork);
      const performance = await solanaUtils.getRecentPerformance(selectedNetwork);
      setNetworkStatus({
        slot: status.slot,
        tps: performance.tps,
        avgBlockTime: performance.avgBlockTime
      });
    } catch (error) {
      console.error('Error loading network status:', error);
    }
  };

  const loadSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      setSolPrice(data.solana?.usd || 0);
    } catch (error) {
      console.error('Error loading SOL price:', error);
      setSolPrice(0);
    }
  };

  const loadWalletData = async (solWallet: SolanaWallet) => {
    try {
      const [balance, tokenAccounts, txs] = await Promise.all([
        solanaUtils.getBalance(solWallet.address, solWallet.network),
        solanaUtils.getTokenAccounts(solWallet.address, solWallet.network),
        solanaUtils.getTransactions(solWallet.address, solWallet.network)
      ]);

      const updatedWallet = { ...solWallet, balance };
      setSelectedWallet(updatedWallet);
      setTokens(tokenAccounts);
      setTransactions(txs);

      // Update wallet in list
      const updatedWallets = solanaWallets.map(w => 
        w.id === updatedWallet.id ? updatedWallet : w
      );
      setSolanaWallets(updatedWallets);
      await saveSolanaWallets(updatedWallets);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const createSolanaWallet = async () => {
    if (!newWalletName.trim()) {
      toast.error('Please enter a wallet name');
      return;
    }

    setIsLoading(true);
    try {
      const newWallet = solanaUtils.generateWallet(newWalletName, selectedNetwork);
      const updatedWallets = [...solanaWallets, newWallet];
      
      setSolanaWallets(updatedWallets);
      setSelectedWallet(newWallet);
      await saveSolanaWallets(updatedWallets);
      
      setShowCreateWallet(false);
      setNewWalletName('');
      toast.success('Solana wallet created successfully!');
    } catch (error) {
      console.error('Error creating Solana wallet:', error);
      toast.error('Failed to create Solana wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const airdropSol = async () => {
    if (!selectedWallet) return;
    
    setIsLoading(true);
    try {
      const result = await solanaUtils.airdropSol(selectedWallet.address, 1, selectedWallet.network);
      if (result.success) {
        toast.success('SOL airdropped successfully!');
        await loadWalletData(selectedWallet);
      } else {
        toast.error(result.error || 'Failed to airdrop SOL');
      }
    } catch (error) {
      console.error('Error airdropping SOL:', error);
      toast.error('Failed to airdrop SOL');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWallet = async () => {
    if (!selectedWallet) return;
    
    setIsRefreshing(true);
    try {
      await loadWalletData(selectedWallet);
      await loadNetworkStatus();
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

  const formatSOL = (lamports: number) => {
    return (lamports).toFixed(4);
  };

  const formatUSD = (sol: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(sol * solPrice);
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'mainnet': return 'from-green-500 to-emerald-500';
      case 'testnet': return 'from-blue-500 to-cyan-500';
              case 'devnet': return 'from-[#180CB2] to-indigo-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getNetworkLabel = (network: string) => {
    switch (network) {
      case 'mainnet': return 'Mainnet';
      case 'testnet': return 'Testnet';
      case 'devnet': return 'Devnet';
      default: return 'Unknown';
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
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-[#180CB2] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Solana</h1>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <p className="text-slate-400 text-sm">
                  {currentNetwork?.id === 'solana' ? 'Active Network' : 'SOL Wallet Management'}
                </p>
              </div>
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
        {/* Network Status */}
        {networkStatus && (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
            <h3 className="text-lg font-semibold mb-3">Network Status</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-slate-400 text-sm">Current Slot</p>
                <p className="text-white font-semibold">{networkStatus.slot.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">TPS</p>
                <p className="text-white font-semibold">{networkStatus.tps.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Block Time</p>
                <p className="text-white font-semibold">{networkStatus.avgBlockTime.toFixed(2)}s</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Solana Wallets</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateWallet(true)}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Wallet
            </motion.button>
          </div>

          {solanaWallets.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-400">No Solana wallets found</p>
              <p className="text-slate-500 text-sm">Create your first Solana wallet to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {solanaWallets.map((solWallet) => (
                <motion.div
                  key={solWallet.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedWallet(solWallet)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWallet?.id === solWallet.id
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/20 hover:border-white/30 bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${getNetworkColor(solWallet.network)} rounded-xl flex items-center justify-center`}>
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{solWallet.name}</h4>
                        <p className="text-slate-400 text-sm">{formatAddress(solWallet.address)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            solWallet.network === 'mainnet' 
                              ? 'bg-green-500/20 text-green-400' 
                              : solWallet.network === 'testnet'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[#180CB2]/20 text-[#180CB2]'
                          }`}>
                            {getNetworkLabel(solWallet.network)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {showBalance ? formatSOL(solWallet.balance) : '••••••••'} SOL
                      </p>
                      <p className="text-slate-400 text-sm">
                        {showBalance ? formatUSD(solWallet.balance) : '••••••••'}
                      </p>
                      {tokens.length > 0 && (
                        <p className="text-indigo-400 text-xs">
                          {tokens.length} tokens
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
                <span className="text-white">{getNetworkLabel(selectedWallet.network)}</span>
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
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
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
              {selectedWallet.network !== 'mainnet' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={airdropSol}
                  disabled={isLoading}
                  className="px-3 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Airdrop'}
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Tokens */}
        {selectedWallet && tokens.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">SPL Tokens</h3>
            <div className="space-y-3">
              {tokens.map((token, index) => (
                <motion.div
                  key={token.mint}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#180CB2] to-pink-500 rounded-xl flex items-center justify-center">
                        <Coins className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{token.symbol}</h4>
                        <p className="text-slate-400 text-sm">{token.name}</p>
                        <p className="text-slate-500 text-xs">{formatAddress(token.mint)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {token.balance.toFixed(4)} {token.symbol}
                      </p>
                      {token.price && (
                        <p className="text-slate-400 text-sm">
                          {formatUSD(token.balance * token.price)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
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
                  key={tx.signature}
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
                        <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-slate-400 text-sm">{formatAddress(tx.signature)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                          {tx.tokenSymbol && (
                            <span className="text-xs text-[#180CB2]">
                              {tx.tokenSymbol}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {tx.type === 'send' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.tokenSymbol || 'SOL'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Fee: {tx.fee.toFixed(6)} SOL
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Solana Info */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
            <span className="text-sm text-indigo-400 font-medium">About Solana</span>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Solana is a high-performance blockchain platform supporting smart contracts and decentralized applications.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Block Time</p>
              <p className="text-white font-medium">~400ms</p>
            </div>
            <div>
              <p className="text-slate-400">TPS</p>
              <p className="text-white font-medium">65,000+</p>
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
            <h3 className="text-lg font-semibold text-white mb-4">Create Solana Wallet</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="My Solana Wallet"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Network
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value as 'mainnet' | 'testnet' | 'devnet')}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                >
                  <option value="devnet">Devnet (Recommended for testing)</option>
                  <option value="testnet">Testnet</option>
                  <option value="mainnet">Mainnet (Real SOL)</option>
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
                onClick={createSolanaWallet}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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

export default SolanaScreen;
