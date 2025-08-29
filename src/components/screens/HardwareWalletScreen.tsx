import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Usb, Bluetooth, Check, X, ExternalLink, Shield, Key, RefreshCw, Copy } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { hardwareWalletUtils, HardwareDevice, HardwareWalletType, ConnectionStatus } from '../../utils/hardware-wallet-sdk';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const HardwareWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedType, setSelectedType] = useState<HardwareWalletType | null>(null);
  const [hardwareWallets, setHardwareWallets] = useState<HardwareDevice[]>([]);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleConnect = async (type: HardwareWalletType) => {
    setSelectedType(type);
    setShowConnectionModal(true);
    setIsConnecting(true);

    try {
      let result;
      if (type === HardwareWalletType.LEDGER) {
        result = await hardwareWalletUtils.connectLedger();
      } else {
        result = await hardwareWalletUtils.connectTrezor();
      }

      if (result.success && result.data) {
        setHardwareWallets(prev => [...prev, result.data]);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} wallet connected successfully!`);
      } else {
        toast.error(result.error || `Failed to connect ${type} wallet`);
      }
    } catch (error) {
      toast.error(`Failed to connect ${type} wallet`);
    } finally {
      setIsConnecting(false);
      setShowConnectionModal(false);
    }
  };

  const handleDisconnect = async (walletId: string) => {
    try {
      const result = await hardwareWalletUtils.disconnectDevice(walletId);
      if (result.success) {
        setHardwareWallets(prev => prev.filter(w => w.id !== walletId));
        toast.success('Hardware wallet disconnected');
      } else {
        toast.error(result.error || 'Failed to disconnect wallet');
      }
    } catch (error) {
      toast.error('Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const hardwareWalletTypes = [
    {
      type: HardwareWalletType.LEDGER,
      name: 'Ledger',
      description: 'Connect your Ledger hardware wallet',
      icon: Lock,
      color: 'from-blue-500 to-cyan-500',
      features: ['USB Connection', 'Bluetooth Support', 'Multi-Currency']
    },
    {
      type: HardwareWalletType.TREZOR,
      name: 'Trezor',
      description: 'Connect your Trezor hardware wallet',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      features: ['USB Connection', 'Touch Screen', 'Advanced Security']
    }
  ];

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
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hardware Wallet</h1>
              <p className="text-slate-400 text-sm">Connect Ledger & Trezor</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Hardware Wallet Types */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Connect Hardware Wallet</h3>
          <div className="grid grid-cols-1 gap-4">
            {hardwareWalletTypes.map((hwType) => (
              <motion.div
                key={hwType.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleConnect(hwType.type)}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${hwType.color} rounded-xl flex items-center justify-center`}>
                      <hwType.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{hwType.name}</h3>
                      <p className="text-slate-400 text-sm">{hwType.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {hwType.features.map((feature, index) => (
                          <span key={index} className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Usb className="w-4 h-4 text-slate-400" />
                    <Bluetooth className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Connected Wallets */}
        {hardwareWallets.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Connected Wallets</h3>
            <div className="space-y-4">
              {hardwareWallets.map((hwWallet, index) => (
                <motion.div
                  key={hwWallet.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${
                        hwWallet.type === 'ledger' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'
                      } rounded-xl flex items-center justify-center`}>
                        {hwWallet.isConnected ? (
                          <Check className="w-6 h-6 text-white" />
                        ) : (
                          <X className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{hwWallet.name}</h3>
                        <p className="text-slate-400 text-sm">{formatAddress(hwWallet.address)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${hwWallet.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-xs text-slate-400">
                            {hwWallet.isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                          {hwWallet.isLocked && (
                            <>
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <span className="text-xs text-yellow-400">Locked</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`https://${hwWallet.type}.com`, '_blank')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDisconnect(hwWallet.id)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-green-400 font-medium">Security Benefits</span>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Hardware wallets provide the highest level of security by keeping your private keys offline.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Private Keys</p>
              <p className="text-white font-medium">Never leave device</p>
            </div>
            <div>
              <p className="text-slate-400">Transaction Signing</p>
              <p className="text-white font-medium">Physical confirmation</p>
            </div>
          </div>
        </div>

        {hardwareWallets.length === 0 && (
          <div className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No hardware wallets connected</p>
            <p className="text-slate-500 text-sm">Connect a hardware wallet to get started</p>
          </div>
        )}
      </motion.div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20"
          >
            <div className="text-center">
              <div className={`w-16 h-16 bg-gradient-to-r ${
                selectedType === 'ledger' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'
              } rounded-xl flex items-center justify-center mx-auto mb-4`}>
                {isConnecting ? (
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                Connecting {selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)} Wallet
              </h3>
              
              {isConnecting ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">Please follow these steps:</p>
                  <div className="text-left space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-slate-300">Connect your device via USB</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-slate-300">Unlock your device</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-slate-300">Open the Ethereum app</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-slate-300">Confirm connection on device</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Make sure your {selectedType} device is connected and unlocked.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HardwareWalletScreen; 