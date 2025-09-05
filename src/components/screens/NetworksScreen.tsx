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
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onNavigate('options')}
        className="absolute inset-0 bg-black/20"
      />
      
      {/* Networks Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute top-0 right-0 w-1/2 h-full bg-white flex flex-col z-50 shadow-2xl"
      >
        {/* Header */}
        <div className="bg-[#180CB2] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold">
              Networks
            </h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingCustom(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
        {/* Current Network Status */}
        {currentNetwork && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-[13px]">Current Network</h3>
                  <p className="text-gray-500 text-[13px]">{currentNetwork.name} ({currentNetwork.symbol})</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[13px] text-green-600">Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* EVM Networks */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-[13px]">EVM Networks</h2>
          <div className="space-y-3">
            {defaultNetworks.map((network) => (
              <motion.div
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm ${
                  isNetworkActive(network)
                    ? 'border-[#180CB2] bg-[#180CB2]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isNetworkActive(network) ? 'bg-[#180CB2]/20' : 'bg-gray-100'
                    }`}>
                      <Globe className={`w-5 h-5 ${isNetworkActive(network) ? 'text-[#180CB2]' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-[13px]">{network.name}</h3>
                      <p className="text-gray-500 text-[13px]">{network.symbol} • Chain ID: {network.chainId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isNetworkActive(network) && (
                      <Check className="w-5 h-5 text-[#180CB2]" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testNetworkConnection(network);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      disabled={isTestingConnection === network.id}
                    >
                      {isTestingConnection === network.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#180CB2] rounded-full animate-spin"></div>
                      ) : (
                        <Wifi className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleNetworkSwitch(network)}
                      className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-colors ${
                        isNetworkActive(network)
                          ? 'bg-[#180CB2] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-[13px]">Non-EVM Networks</h2>
          <div className="space-y-3">
            {/* Bitcoin */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('bitcoin')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center">
                    <Bitcoin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">Bitcoin</h3>
                    <p className="text-gray-500 text-[13px]">BTC • Layer 1</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>

            {/* Solana */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('solana')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#180CB2] rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">Solana</h3>
                    <p className="text-gray-500 text-[13px]">SOL • High Performance</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>

            {/* TRON */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('tron')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">TRON</h3>
                    <p className="text-gray-500 text-[13px]">TRX • Entertainment</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>

            {/* Litecoin */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('litecoin')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-slate-600 rounded-lg flex items-center justify-center">
                    <Bitcoin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">Litecoin</h3>
                    <p className="text-gray-500 text-[13px]">LTC • Silver to Bitcoin's Gold</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>

            {/* TON */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('ton')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">TON</h3>
                    <p className="text-gray-500 text-[13px]">The Open Network</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>

            {/* XRP */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm border-gray-200 hover:border-gray-300"
              onClick={() => onNavigate('xrp')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[13px]">XRP</h3>
                    <p className="text-gray-500 text-[13px]">Ripple Network</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[13px]">
                  Open
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Custom Networks */}
        {networks.filter(n => n.isCustom).length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-[13px]">Custom Networks</h2>
            <div className="space-y-3">
              {networks.filter(n => n.isCustom).map((network) => (
                <motion.div
                  key={network.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all shadow-sm ${
                    isNetworkActive(network)
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isNetworkActive(network) ? 'bg-green-500/20' : 'bg-gray-100'
                      }`}>
                        <Settings className={`w-5 h-5 ${isNetworkActive(network) ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-[13px]">{network.name}</h3>
                        <p className="text-gray-500 text-[13px]">{network.symbol} • Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isNetworkActive(network) && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testNetworkConnection(network);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        disabled={isTestingConnection === network.id}
                      >
                        {isTestingConnection === network.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                        ) : (
                          <Wifi className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleNetworkSwitch(network)}
                        className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-colors ${
                          isNetworkActive(network)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 border border-gray-200 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-[13px]">Add Custom Network</h3>
              <p className="text-[13px] text-gray-500 mb-6">Add a custom EVM-compatible network to your wallet. Make sure to verify the network details.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
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
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
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
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
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
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
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
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
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
                  className={`flex-1 px-4 py-3 border rounded-lg transition-all duration-200 font-medium text-[13px] ${
                    isAddingNetwork
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: isAddingNetwork ? 1 : 1.02 }}
                  whileTap={{ scale: isAddingNetwork ? 1 : 0.98 }}
                  onClick={handleAddCustomNetwork}
                  disabled={isAddingNetwork}
                  className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-lg flex items-center justify-center text-[13px] ${
                    isAddingNetwork 
                      ? 'bg-[#180CB2] cursor-not-allowed' 
                      : 'bg-[#180CB2] hover:bg-[#180CB2]/90'
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
        </div>
      </motion.div>
    </div>
  );
};

export default NetworksScreen; 