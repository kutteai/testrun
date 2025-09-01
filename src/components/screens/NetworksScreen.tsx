import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Check, Globe, Settings, Wifi, WifiOff, Bitcoin, Zap, TrendingUp } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import { useWallet } from '../../store/WalletContext';
import { getConfig } from '../../utils/config';
import toast from 'react-hot-toast';
import type { ScreenProps, Network } from '../../types/index';

const NetworksScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { networks, currentNetwork, switchNetwork, addCustomNetwork } = useNetwork();
  const { switchNetwork: switchWalletNetwork } = useWallet();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
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
      id: 'arbitrum',
      name: 'Arbitrum',
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
      id: 'base',
      name: 'Base',
      symbol: 'ETH',
      rpcUrl: 'https://mainnet.base.org',
      chainId: '8453',
      explorerUrl: 'https://basescan.org',
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
    },
    {
      id: 'zksync',
      name: 'zkSync Era',
      symbol: 'ETH',
      rpcUrl: 'https://mainnet.era.zksync.io',
      chainId: '324',
      explorerUrl: 'https://explorer.zksync.io',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'linea',
      name: 'Linea',
      symbol: 'ETH',
      rpcUrl: 'https://rpc.linea.build',
      chainId: '59144',
      explorerUrl: 'https://lineascan.build',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'mantle',
      name: 'Mantle',
      symbol: 'MNT',
      rpcUrl: 'https://rpc.mantle.xyz',
      chainId: '5000',
      explorerUrl: 'https://explorer.mantle.xyz',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'scroll',
      name: 'Scroll',
      symbol: 'ETH',
      rpcUrl: 'https://rpc.scroll.io',
      chainId: '534352',
      explorerUrl: 'https://scrollscan.com',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'polygon-zkevm',
      name: 'Polygon zkEVM',
      symbol: 'ETH',
      rpcUrl: 'https://zkevm-rpc.com',
      chainId: '1101',
      explorerUrl: 'https://zkevm.polygonscan.com',
      isCustom: false,
      isEnabled: true
    },
    {
      id: 'arbitrum-nova',
      name: 'Arbitrum Nova',
      symbol: 'ETH',
      rpcUrl: 'https://nova.arbitrum.io/rpc',
      chainId: '42170',
      explorerUrl: 'https://nova.arbiscan.io',
      isCustom: false,
      isEnabled: true
    }
  ];

  const handleNetworkSwitch = async (network: Network) => {
    try {
      // Switch network in both contexts
      await switchNetwork(network.id);
      await switchWalletNetwork(network.id);
      toast.success(`Switched to ${network.name}`);
    } catch (error) {
      toast.error('Failed to switch network');
    }
  };

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
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result !== undefined) {
        toast.success(`${network.name} connection successful`);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      toast.error(`${network.name} connection failed`);
    } finally {
      setIsTestingConnection(null);
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
        symbol: customNetwork.symbol,
        rpcUrl: customNetwork.rpcUrl,
        chainId: customNetwork.chainId,
        explorerUrl: customNetwork.explorerUrl,
        isCustom: true,
        isEnabled: true
      };

      // Add the custom network
      await addCustomNetwork(newNetwork);
      
      // Automatically switch to the new network and generate address
      toast.loading(`Switching to ${newNetwork.name}...`);
      
      try {
        // Switch network in NetworkContext
        await switchNetwork(newNetwork.id);
        
        // Switch network in WalletContext to generate the correct address
        await switchWalletNetwork(newNetwork.id);
        
        toast.dismiss();
        toast.success(`✅ ${newNetwork.name} added and activated! Address ready.`);
      } catch (switchError) {
        toast.dismiss();
        toast.success(`✅ ${newNetwork.name} added successfully`);
        toast.error('Failed to auto-switch to new network. You can switch manually.');
        console.error('Auto-switch failed:', switchError);
      }
      
      // Close modal and reset form
      setIsAddingCustom(false);
      setCustomNetwork({
        name: '',
        symbol: '',
        rpcUrl: '',
        chainId: '',
        explorerUrl: ''
      });
    } catch (error) {
      console.error('Failed to add network:', error);
      toast.error('Failed to add network');
    } finally {
      setIsAddingNetwork(false);
    }
  };

  const isNetworkActive = (network: Network) => {
    return currentNetwork?.id === network.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Networks</h1>
              <p className="text-slate-400 text-sm">Select blockchain network</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingCustom(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Current Network Status */}
        {currentNetwork && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Current Network</h3>
                  <p className="text-slate-400 text-sm">{currentNetwork.name} ({currentNetwork.symbol})</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-400">Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* EVM Networks */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">EVM Networks</h2>
          <div className="space-y-3">
            {defaultNetworks.map((network) => (
              <motion.div
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all ${
                  isNetworkActive(network)
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isNetworkActive(network) ? 'bg-blue-500/20' : 'bg-white/10'
                    }`}>
                      <Globe className={`w-5 h-5 ${isNetworkActive(network) ? 'text-blue-400' : 'text-white'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{network.name}</h3>
                      <p className="text-slate-400 text-sm">{network.symbol} • Chain ID: {network.chainId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isNetworkActive(network) && (
                      <Check className="w-5 h-5 text-blue-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testNetworkConnection(network);
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      disabled={isTestingConnection === network.id}
                    >
                      {isTestingConnection === network.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Wifi className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleNetworkSwitch(network)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        isNetworkActive(network)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isNetworkActive(network) ? 'Active' : 'Switch'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Non-EVM Networks */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Non-EVM Networks</h2>
          <div className="space-y-3">
            {/* Bitcoin */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('bitcoin')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center">
                    <Bitcoin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Bitcoin</h3>
                    <p className="text-slate-400 text-sm">BTC • Layer 1</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>

            {/* Solana */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('solana')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Solana</h3>
                    <p className="text-slate-400 text-sm">SOL • High Performance</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>

            {/* TRON */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('tron')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">TRON</h3>
                    <p className="text-slate-400 text-sm">TRX • Entertainment</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>

            {/* Litecoin */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('litecoin')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-slate-600 rounded-lg flex items-center justify-center">
                    <Bitcoin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Litecoin</h3>
                    <p className="text-slate-400 text-sm">LTC • Silver to Bitcoin's Gold</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>

            {/* TON */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('ton')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">TON</h3>
                    <p className="text-slate-400 text-sm">The Open Network</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>

            {/* XRP */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all border-white/20 hover:border-white/30"
              onClick={() => onNavigate('xrp')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">XRP</h3>
                    <p className="text-slate-400 text-sm">Ripple Network</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Open
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Custom Networks */}
        {networks.filter(n => n.isCustom).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Custom Networks</h2>
            <div className="space-y-3">
              {networks.filter(n => n.isCustom).map((network) => (
                <motion.div
                  key={network.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 cursor-pointer transition-all ${
                    isNetworkActive(network)
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-white/20 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isNetworkActive(network) ? 'bg-green-500/20' : 'bg-white/10'
                      }`}>
                        <Settings className={`w-5 h-5 ${isNetworkActive(network) ? 'text-green-400' : 'text-white'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{network.name}</h3>
                        <p className="text-slate-400 text-sm">{network.symbol} • Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isNetworkActive(network) && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testNetworkConnection(network);
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        disabled={isTestingConnection === network.id}
                      >
                        {isTestingConnection === network.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Wifi className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleNetworkSwitch(network)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isNetworkActive(network)
                            ? 'bg-green-500 text-white'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {isNetworkActive(network) ? 'Active' : 'Switch'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Network Modal */}
        {isAddingCustom && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg mx-4 border border-slate-600 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Add Custom Network</h3>
              <p className="text-sm text-slate-400 mb-6">Add a custom EVM-compatible network to your wallet. Make sure to verify the network details.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Network Name
                  </label>
                  <input
                    type="text"
                    value={customNetwork.name}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Polygon Mumbai"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={customNetwork.symbol}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="e.g., MATIC"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    RPC URL
                  </label>
                  <input
                    type="url"
                    value={customNetwork.rpcUrl}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, rpcUrl: e.target.value }))}
                    placeholder="https://rpc-mumbai.maticvigil.com"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Chain ID
                  </label>
                  <input
                    type="text"
                    value={customNetwork.chainId}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, chainId: e.target.value }))}
                    placeholder="80001 or 0x13881"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Explorer URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={customNetwork.explorerUrl}
                    onChange={(e) => setCustomNetwork(prev => ({ ...prev, explorerUrl: e.target.value }))}
                    placeholder="https://mumbai.polygonscan.com"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <motion.button
                  whileHover={{ scale: isAddingNetwork ? 1 : 1.02 }}
                  whileTap={{ scale: isAddingNetwork ? 1 : 0.98 }}
                  onClick={() => setIsAddingCustom(false)}
                  disabled={isAddingNetwork}
                  className={`flex-1 px-4 py-3 border rounded-lg transition-all duration-200 font-medium ${
                    isAddingNetwork
                      ? 'border-slate-600 text-slate-500 cursor-not-allowed'
                      : 'border-slate-500 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: isAddingNetwork ? 1 : 1.02 }}
                  whileTap={{ scale: isAddingNetwork ? 1 : 0.98 }}
                  onClick={handleAddCustomNetwork}
                  disabled={isAddingNetwork}
                  className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-lg flex items-center justify-center ${
                    isAddingNetwork 
                      ? 'bg-blue-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isAddingNetwork ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add Network'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NetworksScreen; 