import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Check, ExternalLink, Star, TrendingUp, Copy, AlertTriangle } from 'lucide-react';
import { useTokenManagement } from '../../hooks/useTokenManagement';
import { TokenSearchResult } from '../../services/token-search-api';

// Helper function to get chain ID for network
const getChainId = (network: string): string => {
  const chainIds: Record<string, string> = {
    'ethereum': '1',
    'bsc': '56',
    'polygon': '137',
    'arbitrum': '42161',
    'optimism': '10',
    'avalanche': '43114',
    'base': '8453',
    'fantom': '250',
    'bitcoin': '0',
    'solana': '101',
    'tron': '728',
    'ton': '607',
    'xrp': '144'
  };
  return chainIds[network.toLowerCase()] || 'Unknown';
};

interface TokenSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  network: string;
  onTokenAdded?: (token: TokenSearchResult) => void;
}

const TokenSearchModal: React.FC<TokenSearchModalProps> = ({
  isOpen,
  onClose,
  accountId,
  network,
  onTokenAdded
}) => {
  const [query, setQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenSearchResult | null>(null);
  
  const {
    searchResults,
    searchLoading,
    searchTokens,
    addToken,
    loading,
    error
  } = useTokenManagement(accountId);

  // Search tokens when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchTokens(query, network);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, network, searchTokens]);

  const handleTokenSelect = (token: TokenSearchResult) => {
    setSelectedToken(token);
  };

  const handleAddToken = async () => {
    if (!selectedToken) return;
    
    try {
      await addToken(network, selectedToken);
      onTokenAdded?.(selectedToken);
      // Reset state and close modal
      setQuery('');
      setSelectedToken(null);
      onClose();
    } catch (error) {
      console.error('Failed to add token:', error);
      // Don't close modal on error so user can try again
    }
  };

  const handleClose = () => {
    setQuery('');
    setSelectedToken(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Add Token to {network.charAt(0).toUpperCase() + network.slice(1)}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Search and add tokens to your account
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, symbol, or contract address..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {searchLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Searching tokens...</p>
            </div>
          )}

          {!searchLoading && query.length >= 2 && searchResults.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No tokens found for "{query}"</p>
              <p className="text-gray-500 text-sm mt-1">
                Try searching by symbol, name, or contract address
              </p>
            </div>
          )}

          {!searchLoading && query.length < 2 && (
            <div className="p-8 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Start typing to search for tokens</p>
              <p className="text-gray-500 text-sm mt-1">
                Search by name, symbol, or contract address
              </p>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            <AnimatePresence>
              {searchResults.map((token, index) => (
              <motion.div
                key={`${token.address}_${token.network}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedToken?.address === token.address ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => handleTokenSelect(token)}
              >
                <div className="flex items-center space-x-4">
                  {/* Token Logo */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-gray-500 font-semibold text-sm">
                        {token.symbol.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {token.name}
                      </h3>
                      <span className="text-gray-500 text-sm">
                        {token.symbol}
                      </span>
                      {token.isVerified && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    
                    {/* Contract Address */}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-gray-500 text-xs font-mono">
                        {token.address}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(token.address)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copy address"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>

                    {/* Token Validation Details */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Network:</span>
                        <span className="font-medium text-gray-700 capitalize">{token.network}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Decimals:</span>
                        <span className="font-medium text-gray-700">{token.decimals || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Chain ID:</span>
                        <span className="font-medium text-gray-700">{getChainId(token.network)}</span>
                      </div>
                      {token.chainType && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium text-gray-700 uppercase">{token.chainType}</span>
                        </div>
                      )}
                    </div>

                    {/* Price Information */}
                    {token.price && (
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-green-600 text-sm font-medium">
                          ${token.price.toFixed(6)}
                        </span>
                        {token.marketCap && (
                          <span className="text-gray-500 text-xs">
                            MC: ${(token.marketCap / 1000000).toFixed(1)}M
                          </span>
                        )}
                      </div>
                    )}

                    {/* Security Warning for Unverified Tokens */}
                    {!token.isVerified && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-yellow-800 text-xs font-medium">
                            Unverified Token - Verify contract address before importing
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    {selectedToken?.address === token.address ? (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTokenSelect(token);
                        }}
                        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        {selectedToken && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  {selectedToken.logo ? (
                    <img
                      src={selectedToken.logo}
                      alt={selectedToken.symbol}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <span className="text-gray-500 font-semibold text-xs">
                      {selectedToken.symbol.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedToken.name}</p>
                  <p className="text-gray-500 text-sm">{selectedToken.symbol}</p>
                </div>
              </div>
              <button
                onClick={handleAddToken}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TokenSearchModal;
