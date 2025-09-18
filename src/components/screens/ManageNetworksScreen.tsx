import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus,
  Search,
  MoreVertical
} from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import type { ScreenProps } from '../../types/index';

const ManageNetworksScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { networks, enabledNetworks, toggleNetwork, addCustomNetwork } = useNetwork();
  const [localEnabledNetworks, setLocalEnabledNetworks] = useState<any[]>([]);
  const [localAdditionalNetworks, setLocalAdditionalNetworks] = useState<any[]>([]);

  // Initialize networks from context
  useEffect(() => {
    if (networks) {
      const enabled = networks.filter(network => network.enabled);
      const additional = networks.filter(network => !network.enabled);
      setLocalEnabledNetworks(enabled);
      setLocalAdditionalNetworks(additional);
    }
  }, [networks]);

  const filteredEnabledNetworks = localEnabledNetworks.filter(network =>
    network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    network.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdditionalNetworks = localAdditionalNetworks.filter(network =>
    network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    network.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNetwork = async (networkId: string) => {
    try {
      await toggleNetwork(networkId, true);
      // Refresh local state
      if (networks) {
        const enabled = networks.filter(network => network.enabled);
        const additional = networks.filter(network => !network.enabled);
        setLocalEnabledNetworks(enabled);
        setLocalAdditionalNetworks(additional);
      }
    } catch (error) {
      console.error('Error adding network:', error);
    }
  };

  const handleNetworkOptions = async (networkId: string) => {
    try {
      await toggleNetwork(networkId, false);
      // Refresh local state
      if (networks) {
        const enabled = networks.filter(network => network.enabled);
        const additional = networks.filter(network => !network.enabled);
        setLocalEnabledNetworks(enabled);
        setLocalAdditionalNetworks(additional);
      }
    } catch (error) {
      console.error('Error toggling network:', error);
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
            onClick={() => onGoBack ? onGoBack() : onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Manage networks
          </h1>
          <button
            onClick={() => onNavigate('add-custom-network')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content - White with rounded top corners */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:bg-white transition-all"
            />
          </div>
        </motion.div>

        {/* Enabled Networks */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Enabled networks</h2>
          <div className="space-y-3">
            {filteredEnabledNetworks.map((network, index) => (
              <motion.div
                key={network.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${network.color} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-lg font-bold">{network.icon}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{network.symbol}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleNetworkOptions(network.id)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Additional Networks */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Additional networks</h2>
          <div className="space-y-3">
            {filteredAdditionalNetworks.map((network, index) => (
              <motion.div
                key={network.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${network.color} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-lg font-bold">{network.icon}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{network.symbol}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleAddNetwork(network.id)}
                  className="text-[#180CB2] font-medium hover:text-[#140a8f] transition-colors"
                >
                  + Add
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ManageNetworksScreen;
