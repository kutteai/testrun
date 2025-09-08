import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, ChevronDown, X, Check, RefreshCw, Eye } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useSend } from '../../store/SendContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { detectTokensWithBalances, getAllPopularTokens, getNetworkRPCUrl, type TokenBalance } from '../../utils/token-balance-utils';
import { storage } from '../../utils/storage-utils';
import { handleError, ErrorCodes } from '../../utils/error-handler';

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
  isRemovable?: boolean;
  isDiscovery?: boolean;
  totalSupply?: string;
  isEnabled?: boolean;
  network?: string;
}

const TokensScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, currentNetwork } = useWallet();
  const { setSelectedToken } = useSend();
  
  // Component state
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTokensModal, setShowAddTokensModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [selectedNetwork, setSelectedNetwork] = useState('Popular networks');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCustomNetworkDropdown, setShowCustomNetworkDropdown] = useState(false);
  const [showDisabledTokens, setShowDisabledTokens] = useState(false);
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState('all');
  const [showNetworkFilterDropdown, setShowNetworkFilterDropdown] = useState(false);
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18,
    network: 'ethereum'
  });

  // Available networks
  const availableNetworks = [
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
    { id: 'bsc', name: 'BSC', symbol: 'BNB' },
    { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH' },
    { id: 'optimism', name: 'Optimism', symbol: 'ETH' },
    { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX' },
    { id: 'base', name: 'Base', symbol: 'ETH' },
    { id: 'fantom', name: 'Fantom', symbol: 'FTM' }
  ];

  // Get default tokens (real tokens like USDT, USDC, etc.)
  const getDefaultTokens = async (): Promise<Token[]> => {
    return [
      {
        id: 'usdt-ethereum',
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
                balance: '0',
        decimals: 6,
        price: 0, // Will be updated by real balance detection
                change24h: 0,
                isCustom: false,
        isEnabled: true,
        network: 'ethereum'
      },
      {
        id: 'usdc-ethereum',
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xA0b86a33E6441b8c4C8C0e4b8b8c4C8C0e4b8b8c4', // USDC on Ethereum
        balance: '0',
        decimals: 6,
        price: 0, // Will be updated by real balance detection
        change24h: 0,
        isCustom: false,
        isEnabled: true,
        network: 'ethereum'
      },
      {
        id: 'dai-ethereum',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI on Ethereum
        balance: '0',
        decimals: 18,
        price: 0, // Will be updated by real balance detection
        change24h: 0,
        isCustom: false,
        isEnabled: true,
        network: 'ethereum'
      },
      {
        id: 'weth-ethereum',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
        balance: '0',
        decimals: 18,
        price: 0, // Will be updated by real balance detection
        change24h: 0,
        isCustom: false,
        isEnabled: true,
        network: 'ethereum'
      },
      {
        id: 'usdt-polygon',
        symbol: 'USDT',
        name: 'Tether USD (Polygon)',
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
        balance: '0',
        decimals: 6,
        price: 0, // Will be updated by real balance detection
        change24h: 0,
        isCustom: false,
        isEnabled: true,
        network: 'polygon'
      },
      {
        id: 'usdc-polygon',
        symbol: 'USDC',
        name: 'USD Coin (Polygon)',
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
                balance: '0',
        decimals: 6,
        price: 0, // Will be updated by real balance detection
                change24h: 0,
                isCustom: false,
        isEnabled: true,
        network: 'polygon'
      }
    ];
  };

  // Load tokens on component mount
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const defaultTokens = await getDefaultTokens();
        
        // Load custom tokens
        const customResult = await storage.get(['customTokens']);
        const savedCustomTokens = customResult.customTokens || [];
        
        // Load auto-discovered tokens
        const autoResult = await storage.get(['autoDiscoveredTokens']);
        const savedAutoTokens = autoResult.autoDiscoveredTokens || [];
        
        // Load removed default tokens
        const removedResult = await storage.get(['removedDefaultTokens']);
        const removedDefaultTokens = removedResult.removedDefaultTokens || [];
        
        // Load enabled/disabled state for each token
        const enabledTokens = await storage.get(['enabledTokens']);
        const enabledTokenIds = enabledTokens.enabledTokens || [];
        
        // Filter out removed default tokens
        const filteredDefaultTokens = defaultTokens.filter(token => !removedDefaultTokens.includes(token.id));
        
        const allTokens = [...filteredDefaultTokens, ...savedCustomTokens, ...savedAutoTokens].map(token => ({
          ...token,
          isEnabled: enabledTokenIds.includes(token.id)
        }));
        
        setTokens(allTokens);
        
        // Load real balances and auto-discover new tokens if wallet address is available
        if (wallet?.address && currentNetwork?.id) {
          await loadRealTokenBalances(allTokens);
        }
    } catch (error) {
        console.error('Failed to load tokens:', error);
      }
    };

    loadTokens();
  }, [wallet?.address, currentNetwork?.id]);

  // Load real token balances and auto-discover new tokens
  const loadRealTokenBalances = async (existingTokens: Token[]) => {
    if (!wallet?.address || !currentNetwork?.id) return;
    
    try {
      console.log('🔄 Loading real token balances for address:', wallet.address, 'on network:', currentNetwork.id);
      
      // Get network RPC URL
      const rpcUrl = getNetworkRPCUrl(currentNetwork.id);
      if (!rpcUrl) {
        console.warn('No RPC URL found for network:', currentNetwork.id);
        return;
      }
      
      // Auto-discover tokens with balances > 0
      const discoveredTokens = await detectTokensWithBalances(wallet.address, rpcUrl);
      console.log('🔍 Auto-discovered tokens:', discoveredTokens);
      
      // Update existing tokens with real balances
      const updatedTokens = await Promise.all(existingTokens.map(async (token) => {
        try {
          // Find matching discovered token
          const discoveredToken = discoveredTokens.find(t => 
            t.address.toLowerCase() === token.address.toLowerCase() || 
            t.symbol === token.symbol
          );
          
          if (discoveredToken) {
            return {
              ...token,
              balance: discoveredToken.balance,
              price: discoveredToken.price || token.price,
              name: discoveredToken.name || token.name,
              decimals: discoveredToken.decimals || token.decimals
            };
          }
          
          return token;
    } catch (error) {
          console.warn(`Failed to load balance for token ${token.symbol}:`, error);
          return token;
        }
      }));
      
      // Add newly discovered tokens that aren't already in the list
      const existingAddresses = new Set(existingTokens.map(t => t.address.toLowerCase()));
      const newTokens: Token[] = discoveredTokens
        .filter(discovered => !existingAddresses.has(discovered.address.toLowerCase()))
        .map(discovered => ({
          id: `discovered-${discovered.address}`,
          symbol: discovered.symbol,
          name: discovered.name,
          address: discovered.address,
          balance: discovered.balance,
          decimals: discovered.decimals,
          price: discovered.price || 0,
          change24h: 0,
                isCustom: false,
                isAutoDetected: true,
          isEnabled: true,
          network: currentNetwork.id
        }));
      
      // Combine existing and new tokens
      const allTokens = [...updatedTokens, ...newTokens];
      
      // Save auto-discovered tokens to storage
      if (newTokens.length > 0) {
        const result = await storage.get(['autoDiscoveredTokens']);
        const savedAutoTokens = result.autoDiscoveredTokens || [];
        const updatedAutoTokens = [...savedAutoTokens, ...newTokens];
        await storage.set({ autoDiscoveredTokens: updatedAutoTokens });
        console.log('💾 Saved auto-discovered tokens to storage');
      }
      
              setTokens(allTokens);
      console.log('✅ Updated tokens with real balances and auto-discovery:', allTokens);
      } catch (error) {
      console.error('Failed to load real token balances:', error);
    }
  };

  // Handle removing any token (default, auto-discovered, or custom)
  const handleRemoveToken = async (tokenId: string) => {
    try {
      const tokenToRemove = tokens.find(token => token.id === tokenId);
      if (!tokenToRemove) return;
      
      // Remove from current tokens list
      setTokens(prev => prev.filter(token => token.id !== tokenId));
      
      // Remove from appropriate storage based on token type
      if (tokenToRemove.isAutoDetected) {
        // Remove from auto-discovered tokens
        const result = await storage.get(['autoDiscoveredTokens']);
        const savedAutoTokens = result.autoDiscoveredTokens || [];
        const updatedAutoTokens = savedAutoTokens.filter((token: Token) => token.id !== tokenId);
        await storage.set({ autoDiscoveredTokens: updatedAutoTokens });
      } else if (tokenToRemove.isCustom) {
        // Remove from custom tokens
        const result = await storage.get(['customTokens']);
        const savedCustomTokens = result.customTokens || [];
        const updatedCustomTokens = savedCustomTokens.filter((token: Token) => token.id !== tokenId);
        await storage.set({ customTokens: updatedCustomTokens });
      } else {
        // Remove from default tokens (add to removed list)
        const result = await storage.get(['removedDefaultTokens']);
        const removedTokens = result.removedDefaultTokens || [];
        if (!removedTokens.includes(tokenId)) {
          removedTokens.push(tokenId);
          await storage.set({ removedDefaultTokens: removedTokens });
        }
      }
      
      toast.success('Token removed successfully');
    } catch (error) {
      console.error('Failed to remove token:', error);
      toast.error('Failed to remove token');
    }
  };

  // Handle toggling token enabled/disabled state
  const handleToggleToken = async (tokenId: string) => {
    try {
      // Update token state in current list
      setTokens(prev => prev.map(token => 
        token.id === tokenId 
          ? { ...token, isEnabled: !token.isEnabled }
          : token
      ));
      
      // Get current enabled tokens
      const result = await storage.get(['enabledTokens']);
      const enabledTokenIds = result.enabledTokens || [];
      
      // Toggle the token in the enabled list
      let updatedEnabledTokens;
      if (enabledTokenIds.includes(tokenId)) {
        // Remove from enabled list
        updatedEnabledTokens = enabledTokenIds.filter(id => id !== tokenId);
      } else {
        // Add to enabled list
        updatedEnabledTokens = [...enabledTokenIds, tokenId];
      }
      
      // Save updated enabled tokens to storage
      await storage.set({ enabledTokens: updatedEnabledTokens });
      
      const token = tokens.find(t => t.id === tokenId);
      const action = updatedEnabledTokens.includes(tokenId) ? 'enabled' : 'disabled';
      toast.success(`${token?.symbol || 'Token'} ${action} successfully`);
      
    } catch (error) {
      console.error('Failed to toggle token:', error);
      toast.error('Failed to toggle token');
    }
  };

  // Refresh token balances and auto-discover new tokens
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRealTokenBalances(tokens);
      toast.success('Token balances refreshed and new tokens discovered');
    } catch (error) {
      console.error('Failed to refresh token balances:', error);
      toast.error('Failed to refresh balances');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Listen for wallet changes to reload balances
  useEffect(() => {
    const handleWalletChanged = () => {
      if (wallet?.address && currentNetwork?.id) {
        loadRealTokenBalances(tokens);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('walletChanged', handleWalletChanged);
      window.addEventListener('accountSwitched', handleWalletChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('walletChanged', handleWalletChanged);
        window.removeEventListener('accountSwitched', handleWalletChanged);
      }
    };
  }, [wallet?.address, currentNetwork?.id, tokens]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.network-filter-dropdown')) {
        setShowNetworkFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Fetch token info from blockchain explorer
  const fetchTokenInfoFromExplorer = async (address: string, network: string) => {
    try {
      let apiUrl = '';
      let apiKey = '';
      
      // Determine the correct API endpoint based on network
      switch (network.toLowerCase()) {
        case 'bsc':
        case 'binance':
          apiUrl = 'https://api.bscscan.com/api';
          apiKey = 'YourBSCScanAPIKey'; // You can get this from BSCScan
          break;
        case 'ethereum':
          apiUrl = 'https://api.etherscan.io/api';
          apiKey = 'YourEtherscanAPIKey'; // You can get this from Etherscan
          break;
        case 'polygon':
          apiUrl = 'https://api.polygonscan.com/api';
          apiKey = 'YourPolygonScanAPIKey'; // You can get this from PolygonScan
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
      
      // Fetch token info from explorer API
      const response = await fetch(
        `${apiUrl}?module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === '1' && data.result && data.result.length > 0) {
        const tokenInfo = data.result[0];
        return {
          name: tokenInfo.tokenName || '',
          symbol: tokenInfo.symbol || '',
          decimals: parseInt(tokenInfo.divisor) || 18,
          address: tokenInfo.contractAddress || address
        };
      } else {
        throw new Error(data.message || 'Token not found on explorer');
      }
    } catch (error) {
      console.error('Failed to fetch token info from explorer:', error);
      throw error;
    }
  };

  // Add custom token
  const handleAddCustomToken = async () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const customToken: Token = {
        id: `custom-${Date.now()}`,
        symbol: newToken.symbol,
        name: newToken.name,
        address: newToken.address,
        balance: '0',
        decimals: newToken.decimals,
        price: 0,
        change24h: 0,
        isCustom: true,
        isEnabled: true,
        network: newToken.network
      };

      const result = await storage.get(['customTokens']);
      const savedCustomTokens = result.customTokens || [];
      const updatedCustomTokens = [...savedCustomTokens, customToken];
      
      await storage.set({ customTokens: updatedCustomTokens });
      
      setTokens(prev => [...prev, customToken]);
      setNewToken({ address: '', symbol: '', name: '', decimals: 18, network: 'ethereum' });
      setShowAddTokensModal(false);
      
      toast.success(`${customToken.symbol} added successfully and saved to storage`);
    } catch (error) {
      console.error('Failed to add custom token:', error);
      toast.error('Failed to add token');
    }
  };

  // Import token from blockchain explorer
  const handleImportFromExplorer = async () => {
    if (!newToken.address) {
      toast.error('Please enter token contract address');
      return;
    }

    try {
      toast.loading('Fetching token information from blockchain explorer...');
      
      const tokenInfo = await fetchTokenInfoFromExplorer(newToken.address, newToken.network);
      
      // Update the form with fetched information
      setNewToken(prev => ({
        ...prev,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals
      }));
      
      toast.dismiss();
      toast.success('Token information fetched successfully!');
    } catch (error) {
      toast.dismiss();
      console.error('Failed to import token from explorer:', error);
      toast.error(`Failed to import token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter tokens based on search query, network, and enabled state
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         token.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by network
    const matchesNetwork = selectedNetworkFilter === 'all' || 
                          token.network === selectedNetworkFilter ||
                          (selectedNetworkFilter === 'ethereum' && ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'].includes(token.network));
    
    // If showing disabled tokens, show all tokens that match search and network
    // Otherwise, only show enabled tokens that match search and network
    if (showDisabledTokens) {
      return matchesSearch && matchesNetwork;
    } else {
      return matchesSearch && matchesNetwork && token.isEnabled;
    }
  });

  // Get token icon color
  const getTokenIconColor = (symbol: string) => {
    const colors: Record<string, string> = {
      'BTC': 'bg-orange-500',
      'ETH': 'bg-blue-500',
      'BNB': 'bg-yellow-500',
      'USDT': 'bg-green-500',
      'USDC': 'bg-blue-400',
      'DAI': 'bg-yellow-400',
      'MATIC': 'bg-purple-500',
      'AVAX': 'bg-red-500',
      'SOL': 'bg-purple-600',
      'DOT': 'bg-pink-500',
      'LINK': 'bg-blue-600',
      'UNI': 'bg-pink-400',
      'AAVE': 'bg-purple-400',
      'SUSHI': 'bg-pink-300',
      'COMP': 'bg-green-400',
      'MKR': 'bg-gray-500',
      'YFI': 'bg-blue-700',
      'SNX': 'bg-cyan-500',
      'CRV': 'bg-orange-400',
      'BAL': 'bg-indigo-500'
    };
    return colors[symbol] || 'bg-gray-500';
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(4)}`;
    }
  };

  // Format change percentage
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Manage crypto</h1>
          <div className="w-10"></div>
            </div>
            </div>

      {/* Search Bar */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Token name or contract address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="relative network-filter-dropdown">
            <button 
              onClick={() => setShowNetworkFilterDropdown(!showNetworkFilterDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="text-gray-700 font-medium">
                {selectedNetworkFilter === 'all' ? 'All networks' : 
                 selectedNetworkFilter === 'ethereum' ? 'EVM Networks' :
                 selectedNetworkFilter.charAt(0).toUpperCase() + selectedNetworkFilter.slice(1)}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showNetworkFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-48">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('all');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    All networks
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('ethereum');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'ethereum' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    EVM Networks (ETH, Polygon, BSC, etc.)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('bitcoin');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'bitcoin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Bitcoin
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('solana');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'solana' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    Solana
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('xrp');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'xrp' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    XRP
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNetworkFilter('ton');
                      setShowNetworkFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedNetworkFilter === 'ton' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    TON
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
          <button
              onClick={() => setShowDisabledTokens(!showDisabledTokens)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showDisabledTokens 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">
                {showDisabledTokens ? 'Hide Disabled' : 'Show All'}
              </span>
          </button>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium text-gray-700">Refresh</span>
            </button>
            
            <button
              onClick={() => setShowAddTokensModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add tokens</span>
            </button>
          </div>
        </div>
          </div>

      {/* Token List */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="space-y-2">
          {filteredTokens.map((token) => (
      <motion.div 
              key={token.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                token.isEnabled 
                  ? 'bg-white border-gray-200 hover:bg-gray-50' 
                  : 'bg-gray-50 border-gray-300 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${getTokenIconColor(token.symbol)} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {token.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{token.symbol}</span>
                    <span className="text-gray-600">{token.name}</span>
                    {token.isAutoDetected && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Auto-discovered
                      </span>
                    )}
                    {token.isCustom && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{formatPrice(token.price)}</span>
                    <span className={`text-sm font-medium ${
                      token.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {formatChange(token.change24h)}
                      </span>
                    {token.network && (
                      <span className="text-xs text-gray-500 capitalize">{token.network}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleToggleToken(token.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    token.isEnabled ? 'bg-[#180CB2]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      token.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                
                <button
                  onClick={() => handleRemoveToken(token.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                  title={`Remove ${token.isAutoDetected ? 'auto-discovered' : token.isCustom ? 'custom' : 'default'} token`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
          </motion.div>
        ))}
              </div>
            </div>

      {/* Add Tokens Modal */}
      {showAddTokensModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add tokens</h2>
              <button
                onClick={() => setShowAddTokensModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
          </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                  <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-[#180CB2] border-b-2 border-[#180CB2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Search
                  </button>
                <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                  activeTab === 'custom'
                    ? 'text-[#180CB2] border-b-2 border-[#180CB2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Custom tokens
                </button>
              </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'search' ? (
            <div className="space-y-4">
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Networks
                    </label>
                    <div className="relative">
              <button
                        onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                        <span className="text-gray-700">{selectedNetwork}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
                      
                      {showNetworkDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          {availableNetworks.map((network) => (
                            <button
                              key={network.id}
                              onClick={() => {
                                setSelectedNetwork(network.name);
                                setShowNetworkDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                network.id === 'ethereum' ? 'bg-blue-500' :
                                network.id === 'polygon' ? 'bg-purple-500' :
                                network.id === 'bsc' ? 'bg-yellow-500' :
                                network.id === 'arbitrum' ? 'bg-blue-600' :
                                network.id === 'optimism' ? 'bg-red-500' :
                                network.id === 'avalanche' ? 'bg-red-600' :
                                network.id === 'base' ? 'bg-blue-400' :
                                network.id === 'fantom' ? 'bg-blue-300' :
                                'bg-gray-500'
                              }`}>
                                <span className="text-white text-xs font-bold">{network.symbol.charAt(0)}</span>
                              </div>
                              <span className="text-gray-700">{network.name}</span>
                            </button>
                          ))}
          </div>
        )}
                    </div>
                  </div>
                  
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search tokens
                </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                        placeholder="Search tokens"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <button className="w-full py-3 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors">
                    Import
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Networks
                    </label>
                    <div className="relative">
                  <button
                        onClick={() => setShowCustomNetworkDropdown(!showCustomNetworkDropdown)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                        <span className="text-gray-700">
                          {availableNetworks.find(n => n.id === newToken.network)?.name || 'Select a network'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                      
                      {showCustomNetworkDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          {availableNetworks.map((network) => (
                            <button
                              key={network.id}
                              onClick={() => {
                                setNewToken({ ...newToken, network: network.id });
                                setShowCustomNetworkDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                network.id === 'ethereum' ? 'bg-blue-500' :
                                network.id === 'polygon' ? 'bg-purple-500' :
                                network.id === 'bsc' ? 'bg-yellow-500' :
                                network.id === 'arbitrum' ? 'bg-blue-600' :
                                network.id === 'optimism' ? 'bg-red-500' :
                                network.id === 'avalanche' ? 'bg-red-600' :
                                network.id === 'base' ? 'bg-blue-400' :
                                network.id === 'fantom' ? 'bg-blue-300' :
                                'bg-gray-500'
                              }`}>
                                <span className="text-white text-xs font-bold">{network.symbol.charAt(0)}</span>
                </div>
                              <span className="text-gray-700">{network.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token contract address
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                        placeholder="Enter address"
                        value={newToken.address}
                        onChange={(e) => setNewToken({ ...newToken, address: e.target.value })}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                  />
                  <button
                    onClick={handleImportFromExplorer}
                    disabled={!newToken.address}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    title="Import token info from blockchain explorer"
                  >
                    Import
                  </button>
                </div>
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token symbol
                </label>
                <input
                  type="text"
                      placeholder="Enter symbol"
                      value={newToken.symbol}
                      onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                />
              </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token decimal
                </label>
                <input
                  type="number"
                      placeholder="Enter decimals"
                  value={newToken.decimals}
                      onChange={(e) => setNewToken({ ...newToken, decimals: parseInt(e.target.value) || 18 })}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                />
            </div>

                  <button
                    onClick={handleAddCustomToken}
                    className="w-full py-3 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors"
                  >
                    Import
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TokensScreen;