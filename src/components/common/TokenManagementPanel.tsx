import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Trash2, 
  ExternalLink,
  DollarSign,
  Star,
  TrendingUp,
  X,
  Check
} from 'lucide-react';
import { useTokenManagement } from '../../hooks/useTokenManagement';
import TokenSearchModal from './TokenSearchModal';

// Helper function to get explorer URL for different networks
const getExplorerUrl = (network: string, address: string): string => {
  const explorers: Record<string, string> = {
    'ethereum': `https://etherscan.io/token/${address}`,
    'bsc': `https://bscscan.com/token/${address}`,
    'polygon': `https://polygonscan.com/token/${address}`,
    'arbitrum': `https://arbiscan.io/token/${address}`,
    'optimism': `https://optimistic.etherscan.io/token/${address}`,
    'avalanche': `https://snowtrace.io/token/${address}`,
    'base': `https://basescan.org/token/${address}`,
    'fantom': `https://ftmscan.com/token/${address}`,
    'bitcoin': `https://blockstream.info/address/${address}`,
    'solana': `https://solscan.io/token/${address}`,
    'tron': `https://tronscan.org/#/token/${address}`,
    'ton': `https://tonscan.org/address/${address}`,
    'xrp': `https://xrpscan.com/account/${address}`,
    'litecoin': `https://blockchair.com/litecoin/address/${address}`
  };
  return explorers[network.toLowerCase()] || `https://etherscan.io/token/${address}`;
};

interface TokenManagementPanelProps {
  accountId: string;
  currentNetwork: string;
}

const TokenManagementPanel: React.FC<TokenManagementPanelProps> = ({
  accountId,
  currentNetwork
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCustomTokenModal, setShowCustomTokenModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popularTokens, setPopularTokens] = useState<any[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  
  // Custom token form state
  const [customToken, setCustomToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18
  });
  const [addingCustomToken, setAddingCustomToken] = useState(false);

  const {
    tokens,
    loading,
    error,
    getTokensForNetwork,
    getEnabledTokensForNetwork,
    setTokenEnabled,
    removeToken,
    addToken,
    refreshTokens
  } = useTokenManagement(accountId);

  // Get tokens for current network only
  const networkTokens = getTokensForNetwork(currentNetwork);
  const enabledTokens = getEnabledTokensForNetwork(currentNetwork);
  
  // Simple search filter
  const filteredTokens = networkTokens.filter(token => 
    searchQuery === '' || 
    token.token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load popular tokens for the current network (only when network changes)
  useEffect(() => {
    const loadPopularTokens = async () => {
      setLoadingPopular(true);
      try {
        const { getPopularTokens } = await import('../../utils/token-search-utils');
        const popular = await getPopularTokens(currentNetwork);
        setPopularTokens(popular.slice(0, 10)); // Show top 10 popular tokens
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load popular tokens:', error);
        setPopularTokens([]);
      } finally {
        setLoadingPopular(false);
      }
    };

    loadPopularTokens();
  }, [currentNetwork]); // Only depend on currentNetwork

  // Refresh tokens when account changes
  useEffect(() => {
    if (accountId) {

      refreshTokens();
    }
  }, [accountId, refreshTokens]);

  const handleTokenToggle = async (tokenAddress: string, enabled: boolean) => {
    try {
      await setTokenEnabled(currentNetwork, tokenAddress, enabled);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle token:', error);
    }
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    if (window.confirm('Are you sure you want to remove this token?')) {
      try {
        await removeToken(currentNetwork, tokenAddress);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove token:', error);
      }
    }
  };

  const handleAddPopularToken = async (token: any) => {
    try {
      await addToken(currentNetwork, {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        network: currentNetwork,
        logo: token.logo,
        decimals: token.decimals,
        price: token.price,
        marketCap: token.marketCap,
        isVerified: token.isVerified || false,
        chainType: token.chainType || 'evm'
      });
      
      // Refresh tokens to update the UI
      await refreshTokens();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add popular token:', error);
    }
  };

  const handleAddCustomToken = async () => {
    if (!customToken.address || !customToken.symbol || !customToken.name) {
      alert('Please fill in all required fields');
      return;
    }

    setAddingCustomToken(true);
    try {
      await addToken(currentNetwork, {
        symbol: customToken.symbol,
        name: customToken.name,
        address: customToken.address,
        network: currentNetwork,
        decimals: customToken.decimals,
        isVerified: false, // Custom tokens are not verified
        chainType: 'evm'
      });
      
      // Refresh tokens to update the UI
      await refreshTokens();
      
      // Reset form and close modal
      setCustomToken({ address: '', symbol: '', name: '', decimals: 18 });
      setShowCustomTokenModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add custom token:', error);
      alert('Failed to add custom token. Please check the contract address.');
    } finally {
      setAddingCustomToken(false);
    }
  };

  const handleCustomTokenInputChange = (field: string, value: string | number) => {
    setCustomToken(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter popular tokens to exclude already added tokens
  const getFilteredPopularTokens = () => {
    const userTokenAddresses = networkTokens.map(token => 
      token.token.address.toLowerCase()
    );
    
    return popularTokens.filter(token => 
      !userTokenAddresses.includes(token.address.toLowerCase())
    );
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1000000000) return `$${(marketCap / 1000000000).toFixed(1)}B`;
    if (marketCap >= 1000000) return `$${(marketCap / 1000000).toFixed(1)}M`;
    return `$${(marketCap / 1000).toFixed(1)}K`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tokens</h2>
            <p className="text-gray-600 text-sm">
              {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)} • {networkTokens.length} tokens
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <button
              onClick={() => setShowCustomTokenModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Custom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your tokens..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Popular Tokens Section */}
      {searchQuery === '' && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Popular Tokens</h3>
          </div>
          
          {loadingPopular ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading popular tokens...</span>
            </div>
          ) : getFilteredPopularTokens().length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">All popular tokens added!</p>
              <p className="text-gray-500 text-sm mt-1">
                You've added all the popular tokens for this network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {getFilteredPopularTokens().map((token, index) => (
                <motion.div
                  key={`${token.address}_${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => handleAddPopularToken(token)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <span className="text-gray-500 font-semibold text-xs">
                          {token.symbol.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {token.symbol}
                        </span>
                        {token.isVerified && (
                          <Star className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-gray-500 text-xs truncate">
                        {token.name}
                      </p>
                      {token.price && (
                        <p className="text-green-600 text-xs font-medium">
                          ${token.price.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Token List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading tokens...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && filteredTokens.length === 0 && (
          <div className="p-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No tokens found</p>
            <p className="text-gray-500 text-sm mt-1">
              Add tokens to get started
            </p>
          </div>
        )}

        {!loading && !error && filteredTokens.map((token) => (
          <motion.div
            key={`${token.token.address}_${token.network}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              {/* Token Logo */}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                {token.token.logo ? (
                  <img
                    src={token.token.logo}
                    alt={token.token.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-gray-500 font-semibold text-sm">
                    {token.token.symbol.charAt(0)}
                  </span>
                )}
              </div>

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {token.token.name}
                  </h3>
                  <span className="text-gray-500 text-sm">
                    {token.token.symbol}
                  </span>
                  {token.token.isVerified && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm truncate">
                  {token.token.address}
                </p>
                {token.token.price && (
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-green-600 text-sm font-medium">
                      {formatPrice(token.token.price)}
                    </span>
                    {token.token.marketCap && (
                      <span className="text-gray-500 text-xs">
                        MC: {formatMarketCap(token.token.marketCap)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTokenToggle(token.token.address, !token.isEnabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    token.isEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={token.isEnabled ? 'Disable token' : 'Enable token'}
                >
                  {token.isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleRemoveToken(token.token.address)}
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Remove token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const explorerUrl = getExplorerUrl(currentNetwork, token.token.address);
                    window.open(explorerUrl, '_blank');
                  }}
                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Token Search Modal */}
      <TokenSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        accountId={accountId}
        network={currentNetwork}
        onTokenAdded={async (token) => {
          // Refresh tokens to update the UI
          await refreshTokens();
        }}
      />

      {/* Custom Token Modal */}
      {showCustomTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Custom Token</h3>
                <button
                  onClick={() => setShowCustomTokenModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Address *
                  </label>
                  <input
                    type="text"
                    value={customToken.address}
                    onChange={(e) => handleCustomTokenInputChange('address', e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    value={customToken.symbol}
                    onChange={(e) => handleCustomTokenInputChange('symbol', e.target.value)}
                    placeholder="e.g., USDC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    value={customToken.name}
                    onChange={(e) => handleCustomTokenInputChange('name', e.target.value)}
                    placeholder="e.g., USD Coin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={customToken.decimals}
                    onChange={(e) => handleCustomTokenInputChange('decimals', parseInt(e.target.value, 10) || 18)}
                    placeholder="18"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCustomTokenModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomToken}
                  disabled={addingCustomToken}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {addingCustomToken ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Token</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TokenManagementPanel;
