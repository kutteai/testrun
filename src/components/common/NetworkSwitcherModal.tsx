import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Globe, ChevronDown, Plus, X } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NetworkWithIcon {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  isEVM: boolean;
  isEnabled: boolean;
  isCustom: boolean;
}

const NetworkSwitcherModal: React.FC<NetworkSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { networks, addCustomNetwork } = useNetwork();
  const { wallet, switchNetwork } = useWallet();
  
  // Use wallet's current network as the source of truth
  const currentNetwork = wallet?.currentNetwork ? 
    networks.find(n => n.id === wallet.currentNetwork) || networks[0] : 
    networks[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [customNetwork, setCustomNetwork] = useState({
    name: '',
    symbol: '',
    rpcUrl: '',
    chainId: '',
    explorerUrl: ''
  });

  // Network icons mapping
  const networkIcons: Record<string, string> = {
    ethereum: '🔷',
    bsc: '🟡',
    polygon: '🟣',
    avalanche: '🔴',
    arbitrum: '🔵',
    optimism: '🔴',
    base: '🔵',
    fantom: '🔵',
    zksync: '🔷',
    linea: '🔷',
    mantle: '🟣',
    scroll: '🔷',
    'polygon-zkevm': '🟣',
    'arbitrum-nova': '🔵',
    bitcoin: '🟠',
    litecoin: '⚪',
    solana: '🟣',
    tron: '🔴',
    ton: '🔵',
    xrp: '🔵'
  };

  // Categorize networks
  const categorizedNetworks: NetworkWithIcon[] = networks.map(network => ({
    ...network,
    icon: networkIcons[network.id] || '🔷',
    isEVM: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base', 'fantom', 'zksync', 'linea', 'mantle', 'scroll', 'polygon-zkevm', 'arbitrum-nova'].includes(network.id),
    isCustom: network.isCustom || false
  }));

  // Filter networks based on search
  const filteredNetworks = categorizedNetworks.filter(network =>
    network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    network.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group networks
  const evmNetworks = filteredNetworks.filter(n => n.isEVM);
  const nonEvmNetworks = filteredNetworks.filter(n => !n.isEVM);


  const handleNetworkSwitch = async (networkId: string) => {
    if (networkId === currentNetwork?.id) {
      onClose();
      return;
    }

    setIsSwitching(true);
    try {
      // Use WalletContext's switchNetwork which handles address derivation automatically
      await switchNetwork(networkId);
      
      // Success toast is handled by WalletContext
      onClose();
    } catch (error) {
      console.error('Network switch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to switch to ${networkId}: ${errorMessage}`);
    } finally {
      setIsSwitching(false);
    }
  };

  // Auto-discover network information from RPC URL
  const handleAutoDiscover = async () => {
    if (!customNetwork.rpcUrl) {
      toast.error('Please enter an RPC URL first');
      return;
    }

    try {
      toast.loading('🔍 Discovering network information...', { id: 'auto-discover' });
      
      // Try to get chain ID and network info from RPC
      const response = await fetch(customNetwork.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.result) {
        const chainId = parseInt(data.result, 16).toString();
        
        // Known chains with their details
        const knownChains: Record<string, { name: string; symbol: string }> = {
          '1': { name: 'Ethereum Mainnet', symbol: 'ETH' },
          '5': { name: 'Goerli Testnet', symbol: 'ETH' },
          '11155111': { name: 'Sepolia Testnet', symbol: 'ETH' },
          '56': { name: 'BSC Mainnet', symbol: 'BNB' },
          '97': { name: 'BSC Testnet', symbol: 'tBNB' },
          '137': { name: 'Polygon Mainnet', symbol: 'MATIC' },
          '80001': { name: 'Polygon Mumbai', symbol: 'MATIC' },
          '43114': { name: 'Avalanche Mainnet', symbol: 'AVAX' },
          '43113': { name: 'Avalanche Fuji', symbol: 'AVAX' },
          '42161': { name: 'Arbitrum Mainnet', symbol: 'ETH' },
          '421613': { name: 'Arbitrum Goerli', symbol: 'ETH' },
          '10': { name: 'Optimism Mainnet', symbol: 'ETH' },
          '8453': { name: 'Base Mainnet', symbol: 'ETH' },
          '250': { name: 'Fantom Mainnet', symbol: 'FTM' }
        };
        
        const chainInfo = knownChains[chainId];
        const networkName = chainInfo ? chainInfo.name : `Custom Network (${chainId})`;
        const symbol = chainInfo ? chainInfo.symbol : 'TOKEN';

        setCustomNetwork(prev => ({
          ...prev,
          chainId: chainId,
          name: networkName,
          symbol: prev.symbol || symbol
        }));

        toast.success(`✅ Discovered: ${networkName} (Chain ID: ${chainId})`, { id: 'auto-discover' });
      } else if (data.error) {
        throw new Error(`RPC Error: ${data.error.message || 'Unknown error'}`);
      } else {
        throw new Error('Invalid RPC response format');
      }
    } catch (error) {
      console.error('Auto-discovery failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Auto-discovery failed: ${errorMessage}. Please enter manually.`, { id: 'auto-discover' });
    }
  };

  const handleAddCustomNetwork = async () => {
    if (!customNetwork.name || !customNetwork.symbol || !customNetwork.rpcUrl || !customNetwork.chainId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const networkId = customNetwork.name.toLowerCase().replace(/\s+/g, '-');
      
      // Add the custom network
      await addCustomNetwork({
        id: networkId,
        name: customNetwork.name,
        symbol: customNetwork.symbol,
        rpcUrl: customNetwork.rpcUrl,
        chainId: customNetwork.chainId,
        explorerUrl: customNetwork.explorerUrl || '',
        isEnabled: true
      });

      // Auto-generate address for this network if wallet exists
      if (wallet) {
        toast.loading('🔄 Generating address for new network...', { id: 'custom-network-address' });
        
        try {
          // Switch to the new network to generate address
          await switchNetwork(networkId);
          toast.success(`✅ Custom network added and address generated!`, { id: 'custom-network-address' });
        } catch (addressError) {
          console.warn('Failed to generate address for custom network:', addressError);
          toast.success(`✅ Custom network added (address generation failed)`, { id: 'custom-network-address' });
        }
      } else {
        toast.success(`✅ Added custom network: ${customNetwork.name}`);
      }
      
      // Reset form
      setCustomNetwork({
        name: '',
        symbol: '',
        rpcUrl: '',
        chainId: '',
        explorerUrl: ''
      });
      setShowAddNetwork(false);
    } catch (error) {
      console.error('Add custom network error:', error);
      toast.error('Failed to add custom network');
    }
  };

  const NetworkItem: React.FC<{ network: NetworkWithIcon }> = ({ network }) => {
    const isSelected = currentNetwork?.id === network.id;
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
          isSelected 
            ? 'bg-[#180CB2] text-white' 
            : 'bg-white hover:bg-gray-50 border border-gray-200'
        }`}
        onClick={() => handleNetworkSwitch(network.id)}
      >
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{network.icon}</div>
          <div>
            <div className="font-medium text-sm">{network.name}</div>
            <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
              {network.symbol}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!network.isEVM && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              Non-EVM
            </span>
          )}
          {network.isCustom && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
              Custom
            </span>
          )}
          {isSelected && <Check className="w-5 h-5" />}
        </div>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Select Network</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search networks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Add Custom Network Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddNetwork(!showAddNetwork)}
              className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#180CB2] hover:bg-[#180CB2]/5 transition-all mb-4"
            >
              <Plus className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Add Custom Network</span>
            </motion.button>

            {/* Add Custom Network Form */}
            {showAddNetwork && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Add Custom Network</h3>
                  <button
                    onClick={() => setShowAddNetwork(false)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Network Name *</label>
                    <input
                      type="text"
                      value={customNetwork.name}
                      onChange={(e) => setCustomNetwork(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., My Custom Network"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Symbol *</label>
                    <input
                      type="text"
                      value={customNetwork.symbol}
                      onChange={(e) => setCustomNetwork(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="e.g., MCN"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">RPC URL *</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={customNetwork.rpcUrl}
                        onChange={(e) => setCustomNetwork(prev => ({ ...prev, rpcUrl: e.target.value }))}
                        placeholder="https://rpc.example.com"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAutoDiscover}
                        disabled={!customNetwork.rpcUrl}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                      >
                        Auto
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Try: <button type="button" onClick={() => setCustomNetwork(prev => ({ ...prev, rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545' }))} className="text-blue-500 hover:underline">BSC Testnet</button> or <button type="button" onClick={() => setCustomNetwork(prev => ({ ...prev, rpcUrl: 'https://rpc-mumbai.maticvigil.com' }))} className="text-blue-500 hover:underline">Polygon Mumbai</button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Chain ID *</label>
                    <input
                      type="text"
                      value={customNetwork.chainId}
                      onChange={(e) => setCustomNetwork(prev => ({ ...prev, chainId: e.target.value }))}
                      placeholder="e.g., 12345"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Explorer URL</label>
                    <input
                      type="text"
                      value={customNetwork.explorerUrl}
                      onChange={(e) => setCustomNetwork(prev => ({ ...prev, explorerUrl: e.target.value }))}
                      placeholder="https://explorer.example.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-sm"
                    />
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleAddCustomNetwork}
                      className="flex-1 bg-[#180CB2] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#180CB2]/90 transition-colors"
                    >
                      Add Network
                    </button>
                    <button
                      onClick={() => setShowAddNetwork(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* All Networks Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all mb-4 ${
                !currentNetwork 
                  ? 'bg-[#180CB2] text-white' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => handleNetworkSwitch('all')}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🌐</div>
                <div>
                  <div className="font-medium text-sm">All Networks</div>
                  <div className={`text-xs ${!currentNetwork ? 'text-white/80' : 'text-gray-500'}`}>
                    View all networks
                  </div>
                </div>
              </div>
              {!currentNetwork && <Check className="w-5 h-5" />}
            </motion.div>

            {/* EVM Networks */}
            {evmNetworks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">EVM Networks</h3>
                <div className="space-y-2">
                  {evmNetworks.map((network) => (
                    <NetworkItem key={network.id} network={network} />
                  ))}
                </div>
              </div>
            )}

            {/* Non-EVM Networks */}
            {nonEvmNetworks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Non-EVM Networks</h3>
                <div className="space-y-2">
                  {nonEvmNetworks.map((network) => (
                    <NetworkItem key={network.id} network={network} />
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {filteredNetworks.length === 0 && (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No networks found</p>
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {isSwitching && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#180CB2]"></div>
                <span className="text-sm text-gray-600">Switching network...</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NetworkSwitcherModal;
