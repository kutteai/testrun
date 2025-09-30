import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Settings, 
  Eye, 
  EyeOff, 
  Trash2, 
  ExternalLink,
  TrendingUp,
  DollarSign,
  Network
} from 'lucide-react';
import { useTokenManagement } from '../../hooks/useTokenManagement';
import TokenSearchModal from './TokenSearchModal';

interface TokenManagementPanelProps {
  accountId: string;
  currentNetwork: string;
  onNetworkChange?: (network: string) => void;
}

const TokenManagementPanel: React.FC<TokenManagementPanelProps> = ({
  accountId,
  currentNetwork,
  onNetworkChange
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    tokens,
    loading,
    error,
    getTokensForNetwork,
    getEnabledTokensForNetwork,
    setTokenEnabled,
    removeToken,
    getTokenStats
  } = useTokenManagement(accountId);

  const [stats, setStats] = useState({
    totalTokens: 0,
    networksCount: 0,
    enabledTokens: 0,
    networks: {} as Record<string, { total: number; enabled: number }>
  });

  // Get supported networks
  const supportedNetworks = [
    'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche',
    'bitcoin', 'solana', 'tron', 'ton', 'xrp', 'litecoin'
  ];

  // Get tokens for current network
  const networkTokens = getTokensForNetwork(currentNetwork);
  const enabledTokens = getEnabledTokensForNetwork(currentNetwork);
  const filteredTokens = networkTokens.filter(token => 
    searchQuery === '' || 
    token.token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load stats
  React.useEffect(() => {
    const loadStats = async () => {
      const tokenStats = await getTokenStats();
      setStats(tokenStats);
    };
    loadStats();
  }, [getTokenStats, tokens]);

  const handleTokenToggle = async (tokenAddress: string, enabled: boolean) => {
    try {
      await setTokenEnabled(currentNetwork, tokenAddress, enabled);
    } catch (error) {
      console.error('Failed to toggle token:', error);
    }
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    if (window.confirm('Are you sure you want to remove this token?')) {
      try {
        await removeToken(currentNetwork, tokenAddress);
      } catch (error) {
        console.error('Failed to remove token:', error);
      }
    }
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Token Management</h2>
            <p className="text-gray-600 text-sm">
              Manage tokens for {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Token</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Networks</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.networksCount}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Total Tokens</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.totalTokens}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Enabled</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.enabledTokens}</p>
          </div>
        </div>
      </div>

      {/* Network Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Networks:</span>
          {supportedNetworks.map((network) => (
            <button
              key={network}
              onClick={() => onNetworkChange?.(network)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                currentNetwork === network
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {network.charAt(0).toUpperCase() + network.slice(1)}
            </button>
          ))}
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
            placeholder="Search tokens..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

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
                  onClick={() => window.open(`https://etherscan.io/token/${token.token.address}`, '_blank')}
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
        onTokenAdded={() => {
          // Token will be automatically refreshed by the hook
        }}
      />
    </div>
  );
};

export default TokenManagementPanel;
