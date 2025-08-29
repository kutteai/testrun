import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, Wifi, WifiOff } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';

interface NetworkWithIcon {
  id: string;
  name: string;
  symbol: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  isCustom: boolean;
  isEnabled: boolean;
  icon?: string;
}

interface AddNetworkModalProps {
  onClose: () => void;
  onAdd: (network: Partial<NetworkWithIcon>) => void;
}

const AddNetworkModal: React.FC<AddNetworkModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    chainId: '',
    rpcUrl: '',
    explorerUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.symbol && formData.chainId && formData.rpcUrl) {
      onAdd({
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        symbol: formData.symbol,
        chainId: formData.chainId,
        rpcUrl: formData.rpcUrl,
        explorerUrl: formData.explorerUrl,
        isCustom: true,
        isEnabled: true
      });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-4">Add Custom Network</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Network Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="e.g., My Custom Network"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="e.g., CUSTOM"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Chain ID</label>
              <input
                type="text"
                value={formData.chainId}
                onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="e.g., 1337"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">RPC URL</label>
              <input
                type="url"
                value={formData.rpcUrl}
                onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Explorer URL (Optional)</label>
              <input
                type="url"
                value={formData.explorerUrl}
                onChange={(e) => setFormData({ ...formData, explorerUrl: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Network
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const NetworkSwitcher: React.FC = () => {
  const { networkState, addCustomNetwork, switchNetwork } = useNetwork();
  const { wallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use networks from NetworkContext instead of hardcoded ones
  const allNetworks = networkState.networks;
  const currentNetwork = networkState.currentNetwork;

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get network icon based on network ID
  const getNetworkIcon = (networkId: string): string => {
    const icons: Record<string, string> = {
      ethereum: '🔵',
      polygon: '🟣',
      bsc: '🟡',
      arbitrum: '🔵',
      optimism: '🔴',
      avalanche: '🔴',
      goerli: '🧪',
      sepolia: '🧪'
    };
    return icons[networkId] || '🌐';
  };

  const handleNetworkSwitch = async (network: NetworkWithIcon) => {
    try {
      await switchNetwork(network.id);
      setIsOpen(false);
      toast.success(`Switched to ${network.name}`);
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast.error('Failed to switch network');
    }
  };

  const handleAddCustomNetwork = async (networkData: Partial<NetworkWithIcon>) => {
    try {
      await addCustomNetwork(networkData as any);
      setShowAddNetwork(false);
    } catch (error) {
      console.error('Failed to add custom network:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Network Display Button - Clean and Compact */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1.5 bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-white/10 transition-all duration-200"
      >
        <span className="text-xs">{currentNetwork ? getNetworkIcon(currentNetwork.id) : '🌐'}</span>
        <span className="text-xs font-medium text-white">{currentNetwork?.name || 'Unknown Network'}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Portal rendering for proper z-index */}
      {isOpen && createPortal(
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 999999
          }}
          className="w-72 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gray-900">
              <h3 className="text-sm font-semibold text-white mb-1">Select Network</h3>
              <p className="text-xs text-gray-400">Choose a network to connect to</p>
            </div>

            {/* Network List - Clean and organized */}
            <div className="max-h-64 overflow-y-auto">
              <div className="p-2">
                {allNetworks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkSwitch(network)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 mb-1 ${
                      currentNetwork?.id === network.id
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm">{getNetworkIcon(network.id)}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">{network.name}</div>
                        <div className="text-xs text-gray-400">{network.symbol}</div>
                      </div>
                    </div>
                    {currentNetwork?.id === network.id && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Network Button */}
            <div className="p-3 border-t border-white/10 bg-gray-900">
              <button
                onClick={() => {
                  setShowAddNetwork(true);
                  setIsOpen(false); // Close dropdown when opening modal
                }}
                className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Network</span>
              </button>
            </div>
          </motion.div>,
          document.body
        )}

      {/* Add Network Modal - Portal rendering for proper z-index */}
      {showAddNetwork && createPortal(
        <AddNetworkModal 
          onClose={() => setShowAddNetwork(false)} 
          onAdd={handleAddCustomNetwork} 
        />,
        document.body
      )}
    </div>
  );
};

export default NetworkSwitcher;
