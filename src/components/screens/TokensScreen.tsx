import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, Copy, Check, Coins, TrendingUp, TrendingDown, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useSend } from '../../store/SendContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { detectTokensWithBalances, getAllPopularTokens, getNetworkRPCUrl, getTokenPrice, type TokenBalance } from '../../utils/token-balance-utils';

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
  isAutoDetected?: boolean;
}

const TokensScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { setSelectedToken } = useSend();
  
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default popular tokens
  const defaultTokens: Token[] = [
    {
      id: 'usdt',
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      balance: '0',
      decimals: 6,
      price: 1.00,
      change24h: 0.01,
      isCustom: false
    },
    {
      id: 'usdc',
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
      balance: '0',
      decimals: 6,
      price: 1.00,
      change24h: -0.02,
      isCustom: false
    },
    {
      id: 'dai',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      balance: '0',
      decimals: 18,
      price: 1.00,
      change24h: 0.05,
      isCustom: false
    },
    {
      id: 'weth',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      balance: '0',
      decimals: 18,
      price: 2000.00,
      change24h: 2.5,
      isCustom: false
    },
    {
      id: 'link',
      symbol: 'LINK',
      name: 'Chainlink',
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      balance: '0',
      decimals: 18,
      price: 15.50,
      change24h: -1.2,
      isCustom: false
    },
    {
      id: 'busd',
      symbol: 'BUSD',
      name: 'Binance USD',
      address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
      balance: '0',
      decimals: 18,
      price: 1.00,
      change24h: 0.01,
      isCustom: false
    }
  ];

  // Load and fetch tokens
  useEffect(() => {
    console.log('TokensScreen useEffect running');
    const loadAndFetchTokens = async () => {
      try {
        // Load custom tokens from storage
        const result = await chrome.storage.local.get(['customTokens']);
        const savedCustomTokens = result.customTokens || [];
        console.log('📦 Loaded custom tokens from storage:', savedCustomTokens.length);
        
        // Combine default tokens with custom tokens
        const allTokens = [...defaultTokens, ...savedCustomTokens];
        
        if (wallet && wallet.accounts && wallet.accounts.length > 0) {
          // Auto-detect tokens in the current account
          const currentAccount = (wallet.accounts.find((acc: any) => acc.address === wallet.address) || wallet.accounts[0]) as any;
          if (currentAccount && currentAccount.address) {
            const accountAddress = currentAccount.address;
            console.log('🔍 Auto-detecting tokens for account:', accountAddress);
            
            try {
              // Get RPC URL for current network
              const network = wallet.currentNetwork || 'ethereum';
              const rpcUrl = getNetworkRPCUrl(network);
              
              // Auto-detect tokens with balances > 0 only
              const tokensWithBalances = await detectTokensWithBalances(accountAddress, rpcUrl);
              
              // Convert to Token format - only tokens with real balances > 0
              const autoDetectedTokens = tokensWithBalances.map((token: TokenBalance) => ({
                id: token.address,
                symbol: token.symbol,
                name: token.name,
                address: token.address,
                balance: token.balance, // Only tokens with balance > 0
                decimals: token.decimals,
                price: token.price || 0,
                change24h: 0, // Would need 24h price data
                isCustom: false,
                isAutoDetected: true
              }));
              
              console.log('✅ Auto-detected tokens with balances > 0:', autoDetectedTokens.length);
              console.log('📊 Token balances:', autoDetectedTokens.map(t => `${t.symbol}: ${t.balance}`));
              
              // Combine auto-detected tokens with saved custom tokens
              const finalTokens = [...autoDetectedTokens, ...savedCustomTokens];
              setTokens(finalTokens);
              console.log('📋 Final token list:', finalTokens.length, 'tokens');
            } catch (error) {
              console.error('Error detecting tokens:', error);
              setTokens(allTokens);
            }
          } else {
            setTokens(allTokens);
          }
        } else {
          setTokens(allTokens);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
        setTokens(defaultTokens);
      }
    };

    loadAndFetchTokens();
  }, [wallet]);

  // Save custom tokens to storage whenever tokens change
  useEffect(() => {
    const saveCustomTokens = async () => {
      try {
        // Only save custom tokens, not all tokens
        const customTokens = tokens.filter(token => token.isCustom);
        console.log('💾 Saving custom tokens to storage:', customTokens.length);
        await chrome.storage.local.set({ customTokens: customTokens });
      } catch (error) {
        console.error('Error saving custom tokens:', error);
      }
    };

    // Only save if we have custom tokens
    const customTokens = tokens.filter(token => token.isCustom);
    if (customTokens.length > 0) {
      saveCustomTokens();
    }
  }, [tokens]);

  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefreshTokens = async () => {
    setIsRefreshing(true);
    try {
              if (wallet && wallet.accounts && wallet.accounts.length > 0) {
          const currentAccount = (wallet.accounts.find((acc: any) => acc.address === wallet.address) || wallet.accounts[0]) as any;
          
          if (currentAccount && currentAccount.address) {
          // Real token balance detection
          const network = wallet.currentNetwork || 'ethereum';
          const rpcUrl = getNetworkRPCUrl(network);
          
          const tokensWithBalances = await detectTokensWithBalances(currentAccount.address, rpcUrl);
          
          // Convert to Token format - only tokens with real balances > 0
          const autoDetectedTokens = tokensWithBalances.map((token: TokenBalance) => ({
            id: token.address,
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: token.balance, // Only tokens with balance > 0
            decimals: token.decimals,
            price: token.price || 0,
            change24h: 0,
            isCustom: false,
            isAutoDetected: true
          }));
          
          const result = await chrome.storage.local.get(['customTokens']);
          const savedCustomTokens = result.customTokens || [];
          
          setTokens([...autoDetectedTokens, ...savedCustomTokens]);
          toast.success(`Found ${autoDetectedTokens.length} tokens with balances > 0`);
        }
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      toast.error('Failed to refresh tokens');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddToken = async () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Validate token address format
      if (!validateTokenAddress(newToken.address)) {
        toast.error('Invalid contract address format');
        return;
      }

      // Check if token already exists
      const existingToken = tokens.find(token => 
        token.address.toLowerCase() === newToken.address.toLowerCase()
      );
      if (existingToken) {
        toast.error('Token already exists in your list');
        return;
      }

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

      console.log('➕ Adding custom token:', token);
      const updatedTokens = [...tokens, token];
      setTokens(updatedTokens);
      
      // Save custom tokens to storage immediately
      const customTokens = updatedTokens.filter(t => t.isCustom);
      await chrome.storage.local.set({ customTokens: customTokens });
      console.log('💾 Saved custom tokens to storage:', customTokens.length);
      
      setIsAddingToken(false);
      setNewToken({ address: '', symbol: '', name: '', decimals: 18 });
      toast.success(`${token.symbol} added successfully`);
    } catch (error) {
      console.error('Error adding token:', error);
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

  const handleRemoveToken = async (tokenId: string, tokenSymbol: string) => {
    try {
      // Show confirmation dialog
      const confirmed = window.confirm(`Are you sure you want to remove ${tokenSymbol} from your token list?`);
      if (!confirmed) return;

      console.log('🗑️ Removing token:', tokenSymbol, 'ID:', tokenId);
      
      // Remove token from state
      const updatedTokens = tokens.filter(token => token.id !== tokenId);
      setTokens(updatedTokens);

      // Update storage - only save custom tokens
      const customTokensOnly = updatedTokens.filter(token => token.isCustom);
      await chrome.storage.local.set({ customTokens: customTokensOnly });
      console.log('💾 Updated custom tokens in storage:', customTokensOnly.length);

      toast.success(`${tokenSymbol} removed from token list`);
    } catch (error) {
      console.error('Error removing token:', error);
      toast.error('Failed to remove token');
    }
  };

  const validateTokenAddress = (address: string): boolean => {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  };

  const fetchTokenDetails = async (address: string) => {
    if (!validateTokenAddress(address)) {
      toast.error('Invalid contract address');
      return null;
    }

    try {
      // Check if token already exists
      const existingToken = tokens.find(token => 
        token.address.toLowerCase() === address.toLowerCase()
      );
      if (existingToken) {
        toast.error('Token already added');
        return null;
      }

      // Query the actual contract for token details
      const { ethers } = await import('ethers');
      const networkRPCUrl = getNetworkRPCUrl(wallet?.currentNetwork || 'ethereum');
      const provider = new ethers.JsonRpcProvider(networkRPCUrl);
      
      // ERC-20 ABI for basic token info
      const tokenABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ];
      
      const contract = new ethers.Contract(address, tokenABI, provider);
      
      // Get token details from contract
      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);
      
      // Auto-fill the form with contract details
      setNewToken({
        address,
        symbol: symbol,
        name: name,
        decimals: Number(decimals)
      });
      
      toast.success(`Token details loaded: ${name} (${symbol})`);
      return { name, symbol, decimals: Number(decimals) };
    } catch (error) {
      console.error('Error fetching token details:', error);
      toast.error('Failed to fetch token details from contract. Please enter manually.');
      return null;
    }
  };

  const handleValidateToken = async () => {
    if (!newToken.address) {
      toast.error('Please enter a contract address');
      return;
    }

    const isValid = await fetchTokenDetails(newToken.address);
    if (isValid) {
      // Auto-focus on symbol field if validation passes
      const symbolInput = document.querySelector('input[placeholder="Symbol (e.g., USDT)"]') as HTMLInputElement;
      if (symbolInput) symbolInput.focus();
    }
  };

  const handleClearAllCustomTokens = async () => {
    const customTokens = tokens.filter(token => token.isCustom);
    if (customTokens.length === 0) {
      toast.error('No custom tokens to remove');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove all ${customTokens.length} custom tokens? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // Keep only default tokens
      const defaultTokensOnly = tokens.filter(token => !token.isCustom);
      setTokens(defaultTokensOnly);

      // Clear custom tokens from storage
      await chrome.storage.local.set({ customTokens: [] });

      toast.success(`Removed ${customTokens.length} custom tokens`);
    } catch (error) {
      console.error('Error clearing custom tokens:', error);
      toast.error('Failed to clear custom tokens');
    }
  };

  const handleSendToken = (token: Token) => {
    // Set the selected token in the send context
    setSelectedToken(token);
    
    // Navigate to send screen
    onNavigate('send');
    
    toast.success(`Selected ${token.symbol} for sending`);
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
          <div className="flex items-center space-x-2">
            {/* Clear all custom tokens button */}
            {tokens.filter(token => token.isCustom).length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearAllCustomTokens}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                title="Clear all custom tokens"
              >
                <Trash2 className="w-5 h-5" />
              </motion.button>
            )}
            
            {/* Add token button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingToken(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Add custom token"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tokens by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-4 text-sm text-slate-400">
            Found {filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
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
                    {token.isAutoDetected && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        Auto
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
              <div className="flex items-center space-x-2">
                {/* Remove button - only show for custom tokens */}
                {token.isCustom && (
                  <button
                    onClick={() => handleRemoveToken(token.id, token.symbol)}
                    className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
                <button
                  onClick={() => handleSendToken(token)}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredTokens.length === 0 && (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">
              {searchQuery ? `No tokens found matching "${searchQuery}"` : 'No tokens found'}
            </p>
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Try a different search term or add a custom token' : 'Add tokens to get started'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Clear Search
              </button>
            )}
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
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newToken.address}
                    onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="0x..."
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                  <button
                    onClick={handleValidateToken}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Validate
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the token's contract address to validate it
                </p>
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
