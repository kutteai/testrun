import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown
} from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AddCustomNetworkScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [networkName, setNetworkName] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');

  const { addCustomNetwork } = useNetwork();

  const handleSave = async () => {
    if (networkName && rpcUrl && chainId && currencySymbol) {
      try {
        const newNetwork = {
          id: `custom-${Date.now()}`,
          name: networkName,
          rpcUrl,
          chainId: chainId,
          symbol: currencySymbol,
          explorerUrl: blockExplorerUrl,
          isEnabled: true
        };
        
        await addCustomNetwork(newNetwork);
        toast.success('Custom network added successfully!');
        onNavigate('manage-networks');
      } catch (error) {
        console.error('Error saving custom network:', error);
        toast.error('Failed to save custom network. Please try again.');
      }
    }
  };

  const isValidForm = networkName && rpcUrl && chainId && currencySymbol;

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
            onClick={() => onNavigate('manage-networks')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Add a custom network
          </h1>
        </div>
      </div>

      {/* Main Content - White with rounded top corners */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Network Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network name
            </label>
            <input
              type="text"
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              placeholder="Enter network name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
            />
          </div>

          {/* Default RPC URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default RPC URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="Add URL"
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Chain ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chain ID
            </label>
            <input
              type="text"
              value={chainId}
              onChange={(e) => setChainId(e.target.value)}
              placeholder="Enter chain ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
            />
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency symbol
            </label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="Enter symbol"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
            />
          </div>

          {/* Block Explorer URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Block explorer URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={blockExplorerUrl}
                onChange={(e) => setBlockExplorerUrl(e.target.value)}
                placeholder="Add URL"
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <button
            onClick={handleSave}
            disabled={!isValidForm}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
              isValidForm
                ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AddCustomNetworkScreen;
