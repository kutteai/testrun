import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Check, Globe, Settings } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps, Network } from '../../types/index';

const NetworksScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { networks, currentNetwork, switchNetwork, addCustomNetwork } = useNetwork();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
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
      rpcUrl: 'https://mainnet.infura.io/v3/',
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
      id: 'avalanche',
      name: 'Avalanche',
      symbol: 'AVAX',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: '43114',
      explorerUrl: 'https://snowtrace.io',
      isCustom: false,
      isEnabled: true
    }
  ];

  const handleNetworkSwitch = async (network: Network) => {
    try {
      await switchNetwork(network.id);
      toast.success(`Switched to ${network.name}`);
    } catch {
      toast.error('Failed to switch network');
    }
  };

  const handleAddCustomNetwork = async () => {
    if (!customNetwork.name || !customNetwork.rpcUrl || !customNetwork.chainId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newNetwork: Network = {
        id: customNetwork.name.toLowerCase().replace(/\s+/g, '-'),
        name: customNetwork.name,
        symbol: customNetwork.symbol,
        rpcUrl: customNetwork.rpcUrl,
        chainId: customNetwork.chainId,
        explorerUrl: customNetwork.explorerUrl,
        isCustom: true,
        isEnabled: true
      };

      await addCustomNetwork(newNetwork);
      toast.success('Custom network added successfully');
      setIsAddingCustom(false);
      setCustomNetwork({
        name: '',
        symbol: '',
        rpcUrl: '',
        chainId: '',
        explorerUrl: ''
      });
    } catch {
      toast.error('Failed to add network');
    }
  };

  const isNetworkActive = (network: Network) => {
    return currentNetwork?.id === network.id;
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Networks</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingCustom(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Default Networks */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Default Networks</h2>
          <div className="space-y-2">
            {defaultNetworks.map((network) => (
              <motion.div
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNetworkSwitch(network)}
                className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                  isNetworkActive(network)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{network.name}</h3>
                      <p className="text-sm text-gray-600">{network.symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isNetworkActive(network) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Custom Networks */}
        {networks.filter(n => n.isCustom).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Custom Networks</h2>
            <div className="space-y-2">
              {networks.filter(n => n.isCustom).map((network) => (
                <motion.div
                  key={network.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNetworkSwitch(network)}
                  className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                    isNetworkActive(network)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{network.name}</h3>
                        <p className="text-sm text-gray-600">{network.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isNetworkActive(network) && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Network Modal */}
        {isAddingCustom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Network</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Network Name
                  </label>
                  <input
                    type="text"
                    value={customNetwork.name}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., My Custom Network"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={customNetwork.symbol}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="e.g., CUSTOM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RPC URL
                  </label>
                  <input
                    type="url"
                    value={customNetwork.rpcUrl}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, rpcUrl: e.target.value }))}
                    placeholder="https://rpc.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chain ID
                  </label>
                  <input
                    type="text"
                    value={customNetwork.chainId}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, chainId: e.target.value }))}
                    placeholder="e.g., 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explorer URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={customNetwork.explorerUrl}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, explorerUrl: e.target.value }))}
                    placeholder="https://explorer.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAddingCustom(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddCustomNetwork}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Network
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworksScreen; 