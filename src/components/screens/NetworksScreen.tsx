import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Check, Globe, Settings, Wifi, WifiOff, Bitcoin, Zap, TrendingUp, X } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import { useWallet } from '../../store/WalletContext';
import { getConfig } from '../../utils/config';
import toast from 'react-hot-toast';
import type { ScreenProps, Network } from '../../types/index';

const NetworksScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { networks, currentNetwork, switchNetwork, addCustomNetwork } = useNetwork();
  const { switchNetwork: switchWalletNetwork } = useWallet();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [isImportingFromChainlist, setIsImportingFromChainlist] = useState(false);
  const [chainlistUrl, setChainlistUrl] = useState('');
  const [customNetwork, setCustomNetwork] = useState({
    name: '',
    symbol: '',
    rpcUrl: '',
    chainId: '',
    explorerUrl: ''
  });

  const defaultNetworks: Network[] = [
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
              rpcUrl: `https://mainnet.infura.io/v3/${getConfig().INFURA_PROJECT_ID}`,
      chainId: '1',
      explorerUrl: 'https://etherscan.io',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'bsc',
      name: 'Binance Smart Chain',
      symbol: 'BNB',
      rpcUrl: 'https://bsc-dataseed1.binance.org',
      chainId: '56',
      explorerUrl: 'https://bscscan.com',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'polygon',
      name: 'Polygon',
      symbol: 'MATIC',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: '137',
      explorerUrl: 'https://polygonscan.com',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum One',
      symbol: 'ETH',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: '42161',
      explorerUrl: 'https://arbiscan.io',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'optimism',
      name: 'Optimism',
      symbol: 'ETH',
      rpcUrl: 'https://mainnet.optimism.io',
      chainId: '10',
      explorerUrl: 'https://optimistic.etherscan.io',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      symbol: 'AVAX',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: '43114',
      explorerUrl: 'https://snowtrace.io',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'fantom',
      name: 'Fantom',
      symbol: 'FTM',
      rpcUrl: 'https://rpc.ftm.tools',
      chainId: '250',
      explorerUrl: 'https://ftmscan.com',
      isCustom: false,
      isEnabled: true
    }
  ];

  const allNetworks = [...defaultNetworks, ...networks];

  const testNetworkConnection = async (network: Network) => {
    setIsTestingConnection(network.id);
    try {
      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1,
        }),
      });

      if (response.ok) {
        toast.success(`${network.name} connection successful`);
      } else {
        toast.error(`${network.name} connection failed`);
      }
    } catch (error) {
      toast.error(`${network.name} connection failed`);
    } finally {
      setIsTestingConnection(null);
    }
  };

  const handleNetworkSwitch = async (network: Network) => {
    try {
      await switchNetwork(network.id);
      await switchWalletNetwork(network.id);
      toast.success(`Switched to ${network.name}`);
    } catch (error) {
      toast.error(`Failed to switch to ${network.name}`);
    }
  };

  const handleAddCustomNetwork = async () => {
    if (!customNetwork.name || !customNetwork.rpcUrl || !customNetwork.chainId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAddingNetwork(true);
    try {
      const newNetwork: Network = {
        id: customNetwork.name.toLowerCase().replace(/\s+/g, '-'),
        name: customNetwork.name,
        symbol: customNetwork.symbol || 'TOKEN',
        rpcUrl: customNetwork.rpcUrl,
        chainId: customNetwork.chainId,
        explorerUrl: customNetwork.explorerUrl || '',
        isCustom: true,
        isEnabled: true
      };

      await addCustomNetwork(newNetwork);
      toast.success(`${customNetwork.name} added successfully`);
      
      // Reset form
      setCustomNetwork({
        name: '',
        symbol: '',
        rpcUrl: '',
        chainId: '',
        explorerUrl: ''
      });
      setIsAddingCustom(false);
    } catch (error) {
      toast.error('Failed to add custom network');
    } finally {
      setIsAddingNetwork(false);
    }
  };

  const handleImportFromChainlist = async () => {
    if (!chainlistUrl.trim()) {
      toast.error('Please enter a chainlist.org URL');
      return;
    }

    setIsImportingFromChainlist(true);
    try {
      // Extract chain ID from URL (e.g., https://chainlist.org/chain/130)
      const chainIdMatch = chainlistUrl.match(/\/chain\/(\d+)/);
      if (!chainIdMatch) {
        throw new Error('Invalid chainlist.org URL format. Expected: https://chainlist.org/chain/CHAIN_ID');
      }

      const chainId = chainIdMatch[1];
      console.log('Importing chain with ID:', chainId);
      
      // Try multiple chainlist API endpoints
      let chainData = null;
      const apiEndpoints = [
        `https://chainlist.org/api/v1/chains/${chainId}`,
        `https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains/eip155-${chainId}.json`,
        `https://chainid.network/chains.json`
      ];
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            if (endpoint.includes('chains.json')) {
              // Handle the chains.json format
              const chains = await response.json();
              chainData = chains.find((chain: any) => chain.chainId === parseInt(chainId));
            } else {
              // Handle direct chain endpoint
              chainData = await response.json();
            }
            
            if (chainData) {
              console.log('Found chain data:', chainData);
              break;
            }
          }
        } catch (endpointError) {
          console.warn('Endpoint failed:', endpoint, endpointError);
          continue;
        }
      }
      
      if (!chainData) {
        throw new Error('Chain not found on chainlist.org or chainid.network');
      }

      // Create network object from chainlist data
      const newNetwork: Network = {
        id: chainData.shortName || chainData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: chainData.name,
        symbol: chainData.nativeCurrency?.symbol || 'TOKEN',
        rpcUrl: Array.isArray(chainData.rpc) ? chainData.rpc[0] : (chainData.rpc || ''),
        chainId: chainData.chainId.toString(),
        explorerUrl: Array.isArray(chainData.explorers) ? chainData.explorers[0]?.url : (chainData.explorers || ''),
        isCustom: true,
        isEnabled: true
      };

      // Validate required fields
      if (!newNetwork.rpcUrl) {
        throw new Error('No RPC URL available for this chain');
      }
      
      if (!newNetwork.chainId) {
        throw new Error('No chain ID found for this chain');
      }

      // Test the RPC URL before adding
      console.log('Testing RPC URL:', newNetwork.rpcUrl);
      try {
        const testResponse = await fetch(newNetwork.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          if (testData.result) {
            console.log('RPC test successful, chain ID:', testData.result);
          }
        }
      } catch (rpcError) {
        console.warn('RPC test failed, but continuing:', rpcError);
      }

      await addCustomNetwork(newNetwork);
      toast.success(`${newNetwork.name} imported successfully from chainlist.org`);
      
      // Reset form
      setChainlistUrl('');
      setIsAddingCustom(false);
    } catch (error) {
      console.error('Chainlist import failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import from chainlist.org');
    } finally {
      setIsImportingFromChainlist(false);
    }
  };

  const isNetworkActive = (network: Network) => {
    return currentNetwork?.id === network.id;
  };

  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
      >
        {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onGoBack ? onGoBack() : onNavigate('dashboard')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
            <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          <h1 className="text-lg font-semibold text-white">Networks</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingCustom(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
            <Plus className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {/* Current Network Status */}
        {currentNetwork && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-[14px]">Current Network</h3>
                  <p className="text-[12px] text-gray-500">{currentNetwork.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[12px] text-green-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* Default Networks */}
          <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-gray-900">Default Networks</h3>
            {defaultNetworks.map((network) => (
              <motion.div
                key={network.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                  isNetworkActive(network)
                    ? 'border-[#180CB2] bg-[#180CB2]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                    <h4 className="font-semibold text-gray-900 text-[14px]">{network.name}</h4>
                    <p className="text-[12px] text-gray-500">Chain ID: {network.chainId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                  {isTestingConnection === network.id ? (
                    <div className="w-5 h-5 border-2 border-[#180CB2] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <button
                      onClick={() => testNetworkConnection(network)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title="Test connection"
                    >
                      <Wifi className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  {isNetworkActive(network) ? (
                    <div className="w-6 h-6 bg-[#180CB2] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNetworkSwitch(network)}
                      className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-[#180CB2] transition-colors"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Custom Networks */}
        {networks.length > 0 && (
            <div className="space-y-3">
            <h3 className="text-[14px] font-semibold text-gray-900">Custom Networks</h3>
            {networks.map((network) => (
                <motion.div
                  key={network.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                    isNetworkActive(network)
                    ? 'border-[#180CB2] bg-[#180CB2]/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                      <h4 className="font-semibold text-gray-900 text-[14px]">{network.name}</h4>
                      <p className="text-[12px] text-gray-500">Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                    {isTestingConnection === network.id ? (
                      <div className="w-5 h-5 border-2 border-[#180CB2] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <button
                        onClick={() => testNetworkConnection(network)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Test connection"
                      >
                        <Wifi className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {isNetworkActive(network) ? (
                      <div className="w-6 h-6 bg-[#180CB2] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNetworkSwitch(network)}
                        className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-[#180CB2] transition-colors"
                      />
                    )}
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        )}

        {/* Add Custom Network Modal */}
        {isAddingCustom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-96 mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add Custom Network</h3>
                <button
                  onClick={() => setIsAddingCustom(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChainlistUrl('')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    !chainlistUrl ? 'bg-white text-[#180CB2] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setCustomNetwork({ name: '', symbol: '', rpcUrl: '', chainId: '', explorerUrl: '' })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    chainlistUrl ? 'bg-white text-[#180CB2] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Import from Chainlist
                </button>
              </div>
              
              <div className="space-y-4">
                {!chainlistUrl ? (
                  // Manual Entry Tab
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Network Name *
                      </label>
                      <input
                        type="text"
                        value={customNetwork.name}
                        onChange={(e) => setCustomNetwork({ ...customNetwork, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="e.g., My Custom Network"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={customNetwork.symbol}
                        onChange={(e) => setCustomNetwork({ ...customNetwork, symbol: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="e.g., TOKEN"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        RPC URL *
                      </label>
                      <input
                        type="text"
                        value={customNetwork.rpcUrl}
                        onChange={(e) => setCustomNetwork({ ...customNetwork, rpcUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="https://rpc.example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chain ID *
                      </label>
                      <input
                        type="text"
                        value={customNetwork.chainId}
                        onChange={(e) => setCustomNetwork({ ...customNetwork, chainId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="e.g., 12345"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explorer URL
                      </label>
                      <input
                        type="text"
                        value={customNetwork.explorerUrl}
                        onChange={(e) => setCustomNetwork({ ...customNetwork, explorerUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="https://explorer.example.com"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setIsAddingCustom(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddCustomNetwork}
                        disabled={isAddingNetwork}
                        className="flex-1 px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors disabled:opacity-50"
                      >
                        {isAddingNetwork ? 'Adding...' : 'Add Network'}
                      </button>
                    </div>
                  </>
                ) : (
                  // Chainlist Import Tab
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chainlist.org URL *
                      </label>
                      <input
                        type="text"
                        value={chainlistUrl}
                        onChange={(e) => setChainlistUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                        placeholder="https://chainlist.org/chain/130"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter a chainlist.org URL (e.g., https://chainlist.org/chain/130)
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setIsAddingCustom(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImportFromChainlist}
                        disabled={isImportingFromChainlist}
                        className="flex-1 px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors disabled:opacity-50"
                      >
                        {isImportingFromChainlist ? 'Importing...' : 'Import Network'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        </div>
      </motion.div>
  );
};

export default NetworksScreen; 