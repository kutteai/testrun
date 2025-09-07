import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  Plus,
  ChevronDown,
  X,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

// Helper functions for token validation
const getNetworkRPC = (network: string): string => {
  const rpcUrls: { [key: string]: string } = {
    ethereum: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    bsc: 'https://bsc-dataseed.binance.org/',
    polygon: 'https://polygon-rpc.com/',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    arbitrum: 'https://arb1.arbitrum.io/rpc'
  };
  return rpcUrls[network] || rpcUrls.ethereum;
};

const getCoinGeckoId = (network: string, contractAddress: string): string | null => {
  // This would need a mapping of contract addresses to CoinGecko IDs
  // For now, return null to indicate no price data available
  return null;
};

const getTokenLogo = (symbol: string): string => {
  // Map common token symbols to emoji logos
  const logoMap: { [key: string]: string } = {
    'USDT': '💵',
    'USDC': '💵',
    'DAI': '💵',
    'WBTC': '₿',
    'WETH': 'Ξ',
    'UNI': '🦄',
    'LINK': '🔗',
    'AAVE': '👻',
    'COMP': '🏦',
    'CRV': '🔄'
  };
  return logoMap[symbol.toUpperCase()] || '🔷';
};

const ManageCryptoScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('All networks');
  const [showAddTokensModal, setShowAddTokensModal] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  
  // Token import state
  const [customTokenData, setCustomTokenData] = useState({
    network: '',
    contractAddress: '',
    symbol: '',
    decimals: '',
    name: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { wallet } = useWallet();

  const networks = [
    { id: 'all', name: 'All networks', logo: '🌐' },
    { id: 'bitcoin', name: 'Bitcoin', logo: '🟠' },
    { id: 'ethereum', name: 'Ethereum', logo: '🔷' },
    { id: 'tether', name: 'Tether', logo: '🟢' },
    { id: 'bnb', name: 'BNB Beacon Chain', logo: '🟡' }
  ];

  const tokens = [
    {
      id: 'btc1',
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: '🟠',
      price: '$112,027.42',
      change: '-2.55%',
      isEnabled: true,
      network: 'bitcoin'
    },
    {
      id: 'eth1',
      symbol: 'ETH',
      name: 'Ethereum',
      logo: '🔷',
      price: '$4,647.80',
      change: '+1.23%',
      isEnabled: true,
      network: 'ethereum'
    },
    {
      id: 'bnb1',
      symbol: 'BNB',
      name: 'BNB Smart Chain',
      logo: '🟡',
      price: '$865.68',
      change: '-1.55%',
      isEnabled: true,
      network: 'bnb'
    },
    {
      id: 'usdt1',
      symbol: 'USDT',
      name: 'Tether (Polygon)',
      logo: '🟢',
      price: '$0.9996',
      change: '+3.55%',
      isEnabled: true,
      network: 'ethereum'
    },
    {
      id: 'btc2',
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: '🟠',
      price: '$112,027.42',
      change: '-2.55%',
      isEnabled: false,
      network: 'bitcoin'
    },
    {
      id: 'eth2',
      symbol: 'ETH',
      name: 'Ethereum',
      logo: '🔷',
      price: '$4,647.80',
      change: '+1.23%',
      isEnabled: false,
      network: 'ethereum'
    },
    {
      id: 'bnb2',
      symbol: 'BNB',
      name: 'BNB Smart Chain',
      logo: '🟡',
      price: '$865.68',
      change: '-1.55%',
      isEnabled: false,
      network: 'bnb'
    }
  ];

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         token.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = selectedNetwork === 'All networks' || token.network === selectedNetwork.toLowerCase();
    return matchesSearch && matchesNetwork;
  });

  const handleToggleToken = async (tokenId: string) => {
    // Implement real token toggle logic
    const tokenIndex = tokens.findIndex(token => token.id === tokenId);
    if (tokenIndex !== -1) {
      tokens[tokenIndex].isEnabled = !tokens[tokenIndex].isEnabled;
      
      // Save updated token state to storage
      await saveManagedTokens(tokens);
      
      toast.success(`${tokens[tokenIndex].isEnabled ? 'Enabled' : 'Disabled'} ${tokens[tokenIndex].symbol}`);
    }
  };

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
    setShowNetworkDropdown(false);
  };

  // Handle custom token data changes
  const handleCustomTokenChange = (field: string, value: string) => {
    setCustomTokenData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate custom token data
  const validateCustomToken = () => {
    if (!customTokenData.network) return 'Please select a network';
    if (!customTokenData.contractAddress) return 'Please enter contract address';
    if (!customTokenData.symbol) return 'Please enter token symbol';
    if (!customTokenData.decimals) return 'Please enter token decimals';
    if (!customTokenData.name) return 'Please enter token name';
    
    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(customTokenData.contractAddress)) {
      return 'Invalid contract address format';
    }
    
    // Validate decimals
    const decimals = parseInt(customTokenData.decimals);
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      return 'Decimals must be between 0 and 18';
    }
    
    return null;
  };

  // Import custom token
  const handleImportToken = async () => {
    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    const validationError = validateCustomToken();
    if (validationError) {
      setErrorMessage(validationError);
      setImportStatus('error');
      toast.error(validationError);
      return;
    }

    setIsImporting(true);
    setImportStatus('importing');
    setErrorMessage('');

    try {
      // Real blockchain validation for token
      const provider = new ethers.JsonRpcProvider(getNetworkRPC(customTokenData.network));
      
      // Validate contract exists and get token info
      const tokenContract = new ethers.Contract(
        customTokenData.contractAddress,
        ['function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        provider
      );
      
      // Get real token data from blockchain
      const [tokenName, tokenSymbol, tokenDecimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);
      
      // Validate token data matches user input
      if (tokenName.toLowerCase() !== customTokenData.name.toLowerCase()) {
        throw new Error('Token name mismatch with blockchain data');
      }
      if (tokenSymbol.toLowerCase() !== customTokenData.symbol.toLowerCase()) {
        throw new Error('Token symbol mismatch with blockchain data');
      }
      if (tokenDecimals !== parseInt(customTokenData.decimals)) {
        throw new Error('Token decimals mismatch with blockchain data');
      }
      
      // Get real token price from CoinGecko
      const coinId = getCoinGeckoId(customTokenData.network, customTokenData.contractAddress);
      let tokenPrice = '';
      let tokenChange = '';
      
      if (coinId) {
        try {
          const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
          const priceData = await response.json();
          if (priceData[coinId]) {
            tokenPrice = `$${priceData[coinId].usd.toFixed(6)}`;
            tokenChange = `${priceData[coinId].usd_24h_change?.toFixed(2) || '0.00'}%`;
          }
        } catch (priceError) {
          console.warn('Failed to fetch token price:', priceError);
        }
      }
      
      // Create custom token object with real data
      const customToken = {
        id: `custom_${Date.now()}`,
        symbol: tokenSymbol.toUpperCase(),
        name: tokenName,
        logo: getTokenLogo(tokenSymbol),
        price: tokenPrice,
        change: tokenChange,
        isEnabled: true,
        network: customTokenData.network,
        contractAddress: customTokenData.contractAddress,
        decimals: tokenDecimals,
        isCustom: true,
        addedAt: Date.now()
      };

      // Save to storage
      const customTokens = await loadCustomTokens();
      customTokens.push(customToken);
      await saveCustomTokens(customTokens);

      // Add to local tokens array
      tokens.push(customToken);

      toast.success(`Token ${customToken.symbol} imported successfully!`);
      setImportStatus('success');
      
      // Reset form and close modal
      setCustomTokenData({
        network: '',
        contractAddress: '',
        symbol: '',
        decimals: '',
        name: ''
      });
      setImportStatus('idle');
      setShowAddTokensModal(false);

    } catch (error) {
      console.error('Token import failed:', error);
      setErrorMessage('Failed to import token. Please try again.');
      setImportStatus('error');
      toast.error('Failed to import token. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Save managed tokens to storage
  const saveManagedTokens = async (tokens: any[]): Promise<void> => {
    try {
      await storage.set({ managedTokens: tokens });
    } catch (error) {
      console.error('Failed to save managed tokens:', error);
    }
  };

  // Load custom tokens from storage
  const loadCustomTokens = async (): Promise<any[]> => {
    try {
      const existingTokens = await storage.get(['customTokens']);
      return existingTokens.customTokens || [];
    } catch (error) {
      console.error('Failed to load custom tokens:', error);
      return [];
    }
  };

  // Save custom tokens to storage
  const saveCustomTokens = async (tokens: any[]): Promise<void> => {
    try {
      await storage.set({ customTokens: tokens });
    } catch (error) {
      console.error('Failed to save custom tokens:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Manage crypto
          </h1>
          <button
            onClick={() => setShowAddTokensModal(true)}
            className="text-white hover:text-white/80 transition-colors"
          >
            + Add tokens
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white px-6 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Token name or contract address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:bg-white transition-all"
            />
          </div>
        </motion.div>

        {/* Network Filter and Add Tokens */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-between mb-6"
        >
          {/* Network Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="text-gray-700">{selectedNetwork}</span>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Network Dropdown Menu */}
            {showNetworkDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
              >
                <div className="p-3">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Network name"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkSelect(network.name)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{network.logo}</span>
                          <span className="text-sm text-gray-700">{network.name}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedNetwork === network.name 
                            ? 'border-[#180CB2] bg-[#180CB2]' 
                            : 'border-gray-300'
                        }`}>
                          {selectedNetwork === network.name && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Token List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          {filteredTokens.map((token, index) => (
            <motion.div
              key={token.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">{token.logo}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{token.symbol} {token.name}</div>
                  <div className="text-sm text-gray-600">{token.price}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`text-sm font-medium ${token.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {token.change}
                  </div>
                </div>
                
                {/* Toggle Switch */}
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
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Add Tokens Modal */}
      {showAddTokensModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-96 mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add tokens</h3>
              <button
                onClick={() => setShowAddTokensModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              {['search', 'custom'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-[#180CB2] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'search' ? 'Search' : 'Custom tokens'}
                </button>
              ))}
            </div>
            
            {activeTab === 'search' ? (
              <>
                {/* Networks Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Networks</label>
                  <div className="relative">
                    <button className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]">
                      <span className="text-gray-700">Popular networks</span>
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                {/* Search Tokens */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search tokens</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tokens"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Custom Token Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                    <select
                      value={customTokenData.network}
                      onChange={(e) => handleCustomTokenChange('network', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    >
                      <option value="">Select a network</option>
                      <option value="ethereum">Ethereum</option>
                      <option value="bsc">BNB Smart Chain</option>
                      <option value="polygon">Polygon</option>
                      <option value="avalanche">Avalanche</option>
                      <option value="arbitrum">Arbitrum</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token name</label>
                    <input
                      type="text"
                      value={customTokenData.name}
                      onChange={(e) => handleCustomTokenChange('name', e.target.value)}
                      placeholder="Enter token name"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token contract address</label>
                    <input
                      type="text"
                      value={customTokenData.contractAddress}
                      onChange={(e) => handleCustomTokenChange('contractAddress', e.target.value)}
                      placeholder="Enter contract address (0x...)"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token symbol</label>
                    <input
                      type="text"
                      value={customTokenData.symbol}
                      onChange={(e) => handleCustomTokenChange('symbol', e.target.value)}
                      placeholder="Enter symbol (e.g., USDT)"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token decimals</label>
                    <input
                      type="number"
                      value={customTokenData.decimals}
                      onChange={(e) => handleCustomTokenChange('decimals', e.target.value)}
                      placeholder="Enter decimals (0-18)"
                      min="0"
                      max="18"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Import Button */}
            <button
              onClick={handleImportToken}
              disabled={isImporting}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mt-6 ${
                isImporting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
              }`}
            >
              {isImporting ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : importStatus === 'success' ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Imported!</span>
                </div>
              ) : (
                'Import Token'
              )}
            </button>

            {/* Error Message */}
            {importStatus === 'error' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Import Failed</p>
                    <p className="text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ManageCryptoScreen;
