import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, Copy, Check, Coins, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  balance: string;
  decimals: number;
  price: number;
  change24h: number;
  logo?: string;
  isCustom: boolean;
}

const TokensScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  
  // Debug logging
  console.log('TokensScreen rendered, onNavigate:', !!onNavigate);
  console.log('TokensScreen wallet:', wallet);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18
  });

  // Load and fetch tokens
  useEffect(() => {
    console.log('TokensScreen useEffect running');
    const loadAndFetchTokens = async () => {
      try {
        // Load custom tokens from storage
        const result = await chrome.storage.local.get(['customTokens']);
        const savedTokens = result.customTokens || [];
        
        if (wallet && wallet.accounts && wallet.accounts.length > 0) {
          // In a real implementation, you would fetch tokens from the blockchain
          // For now, we'll use saved custom tokens
          setTokens(savedTokens);
        } else {
          setTokens(savedTokens);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
        setTokens([]);
      }
    };

    loadAndFetchTokens();
  }, [wallet]);

  // Save tokens to storage whenever tokens change
  useEffect(() => {
    const saveTokens = async () => {
      try {
        await chrome.storage.local.set({ customTokens: tokens });
      } catch (error) {
        console.error('Error saving tokens:', error);
      }
    };

    if (tokens.length > 0) {
      saveTokens();
    }
  }, [tokens]);

  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToken = async () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // In a real implementation, you would validate the token contract
      const token: Token = {
        id: Date.now().toString(),
        symbol: newToken.symbol.toUpperCase(),
        name: newToken.name,
        address: newToken.address,
        balance: '0',
        decimals: newToken.decimals,
        price: 0,
        change24h: 0,
        isCustom: true
      };

      const updatedTokens = [...tokens, token];
      setTokens(updatedTokens);
      
      // Save to storage immediately
      try {
        await chrome.storage.local.set({ customTokens: updatedTokens });
      } catch (error) {
        console.error('Error saving token:', error);
      }
      
      setIsAddingToken(false);
      setNewToken({ address: '', symbol: '', name: '', decimals: 18 });
      toast.success('Token added successfully');
    } catch (error) {
      toast.error('Failed to add token');
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
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string, decimals: number) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
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
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tokens</h1>
              <p className="text-slate-400 text-sm">Manage your tokens</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingToken(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-4 pb-6 flex-1 overflow-y-auto"
      >
        {filteredTokens.map((token, index) => (
          <motion.div
            key={token.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-white">{token.symbol}</h3>
                    {token.isCustom && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{token.name}</p>
                  <p className="text-slate-500 text-xs">{formatAddress(token.address)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">
                  {formatBalance(token.balance, token.decimals)} {token.symbol}
                </p>
                <p className="text-slate-400 text-sm">
                  {formatUSD(parseFloat(token.balance) * token.price)}
                </p>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  {token.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => copyAddress(token.address)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
              >
                {copied === token.address ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="text-xs">Copy Address</span>
              </button>
              <button
                onClick={() => onNavigate('send')}
                className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
              >
                Send
              </button>
            </div>
          </motion.div>
        ))}

        {filteredTokens.length === 0 && (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No tokens found</p>
            <p className="text-slate-500 text-sm">Add tokens to get started</p>
          </div>
        )}
      </motion.div>

      {/* Add Token Modal */}
      {isAddingToken && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add Custom Token</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={newToken.address}
                  onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Token Symbol
                </label>
                <input
                  type="text"
                  value={newToken.symbol}
                  onChange={(e) => setNewToken(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="e.g., TOKEN"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Token"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Decimals
                </label>
                <input
                  type="number"
                  value={newToken.decimals}
                  onChange={(e) => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                  placeholder="18"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddingToken(false)}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToken}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Token
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TokensScreen;
