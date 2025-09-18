import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown
} from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AddCustomNetworkScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const [networkName, setNetworkName] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');
  const [chainlistUrl, setChainlistUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

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
        // Navigate back to the previous screen (manage-networks or networks)
        if (onGoBack) {
          onGoBack();
        } else {
          onNavigate('manage-networks');
        }
      } catch (error) {
        console.error('Error saving custom network:', error);
        toast.error('Failed to save custom network. Please try again.');
      }
    }
  };

  const isValidForm = networkName && rpcUrl && chainId && currencySymbol;

  // Import network from Chainlist URL
  const handleChainlistImport = async () => {
    if (!chainlistUrl) {
      toast.error('Please enter a Chainlist URL');
      return;
    }

    setIsImporting(true);
    try {
      // Extract chain ID from Chainlist URL
      const chainIdMatch = chainlistUrl.match(/chain\/(\d+)/);
      if (!chainIdMatch) {
        throw new Error('Invalid Chainlist URL format');
      }

      const extractedChainId = chainIdMatch[1];
      
      // Fetch network data from Chainlist API
      const response = await fetch(`https://chainid.network/chains.json`);
      if (!response.ok) {
        throw new Error('Failed to fetch chain data');
      }

      const chains = await response.json();
      const chainData = chains.find((chain: any) => chain.chainId.toString() === extractedChainId);
      
      if (!chainData) {
        throw new Error(`Chain ID ${extractedChainId} not found in Chainlist`);
      }

      // Auto-fill form with Chainlist data
      setNetworkName(chainData.name);
      setChainId(chainData.chainId.toString());
      setCurrencySymbol(chainData.nativeCurrency?.symbol || 'ETH');
      
      // Use first available RPC URL
      if (chainData.rpc && chainData.rpc.length > 0) {
        const validRpc = chainData.rpc.find((rpc: string) => 
          !rpc.includes('${') && rpc.startsWith('http')
        );
        if (validRpc) {
          setRpcUrl(validRpc);
        }
      }
      
      // Use first explorer URL if available
      if (chainData.explorers && chainData.explorers.length > 0) {
        setBlockExplorerUrl(chainData.explorers[0].url);
      }

      toast.success(`Network data imported for ${chainData.name}!`);
      
    } catch (error) {
      console.error('Chainlist import error:', error);
      toast.error(`Failed to import from Chainlist: ${error.message}`);
    } finally {
      setIsImporting(false);
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
            onClick={() => onGoBack ? onGoBack() : onNavigate('manage-networks')}
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
          {/* Chainlist Import Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Import from Chainlist
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Paste a Chainlist URL (e.g., https://chainlist.org/chain/130) to auto-fill network details
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={chainlistUrl}
                onChange={(e) => setChainlistUrl(e.target.value)}
                placeholder="https://chainlist.org/chain/130"
                className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleChainlistImport}
                disabled={!chainlistUrl || isImporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-3 text-sm text-gray-500">or add manually</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

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
