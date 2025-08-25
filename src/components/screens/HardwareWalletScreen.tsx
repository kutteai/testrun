import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Usb, 
  CheckCircle, 
  XCircle, 
  Loader
} from 'lucide-react';
import { hardwareWalletManager } from '../../utils/hardware-wallet';
import { useWallet } from '../../store/WalletContext';
import type { ScreenProps } from '../../types/index';

interface HardwareWalletScreenProps extends ScreenProps {
  onNavigate: (screen: string) => void;
}

const HardwareWalletScreen: React.FC<HardwareWalletScreenProps> = ({ onNavigate }) => {
  const [selectedWallet, setSelectedWallet] = useState<'ledger' | 'trezor' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  
  const { addHardwareWallet } = useWallet();

  const hardwareWallets = [
    {
      id: 'ledger' as const,
      name: 'Ledger',
      description: 'Secure hardware wallet with USB connection',
      icon: Usb,
      features: ['USB Connection', 'Multi-chain Support', 'High Security'],
      supported: true
    },
    {
      id: 'trezor' as const,
      name: 'Trezor',
      description: 'Open-source hardware wallet',
      icon: Shield,
      features: ['USB Connection', 'Open Source', 'Easy to Use'],
      supported: true
    }
  ];

  const connectHardwareWallet = async (type: 'ledger' | 'trezor') => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      await hardwareWalletManager.connectHardwareWallet(type);
      setConnectionStatus('connected');
      setSelectedWallet(type);
      
      // Get available accounts
      const addresses = await hardwareWalletManager.getHardwareWalletAddresses('m/44\'/60\'/0\'/0/0');
      setAccounts(addresses);
      
      if (addresses.length > 0) {
        setSelectedAccount(addresses[0]);
      }
    } catch (error) {
      setConnectionStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to connect hardware wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const importAccount = async () => {
    if (!selectedAccount || !selectedWallet) return;

    try {
      await addHardwareWallet(selectedWallet, selectedAccount, 'm/44\'/60\'/0\'/0/0');
      onNavigate('dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import account');
    }
  };

  const disconnectWallet = async () => {
    if (selectedWallet) {
      await hardwareWalletManager.disconnectHardwareWallet();
      setSelectedWallet(null);
      setConnectionStatus('idle');
      setAccounts([]);
      setSelectedAccount(null);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to hardware wallet...';
      case 'connected':
        return 'Hardware wallet connected successfully';
      case 'error':
        return 'Connection failed';
      default:
        return 'Select a hardware wallet to connect';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onNavigate('dashboard')}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            >
              <Shield className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Hardware Wallet</h1>
              <p className="text-sm text-gray-500">Connect your hardware wallet securely</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {!selectedWallet ? (
          /* Hardware Wallet Selection */
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Your Hardware Wallet
              </h2>
              <p className="text-gray-600">
                Select your hardware wallet to connect securely
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hardwareWallets.map((wallet) => (
                <motion.div
                  key={wallet.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWallet === wallet.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => connectHardwareWallet(wallet.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <wallet.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {wallet.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {wallet.description}
                      </p>
                      <div className="space-y-1">
                        {wallet.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Connection Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Connection Instructions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure your hardware wallet is connected via USB</li>
                <li>• Unlock your hardware wallet and open the appropriate app</li>
                <li>• Make sure your device is not connected to any other application</li>
                <li>• Follow the prompts on your hardware wallet screen</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Account Selection */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Select Account to Import
                </h2>
                <p className="text-sm text-gray-600">
                  Choose which account to import from your {selectedWallet}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={disconnectWallet}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Disconnect
              </motion.button>
            </div>

            {/* Account List */}
            <div className="space-y-2">
              {accounts.map((address, index) => (
                <motion.div
                  key={address}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAccount === address
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAccount(address)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          Account {index + 1}
                        </span>
                        {selectedAccount === address && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {index === 0 ? 'Default' : `Derivation ${index}`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Import Button */}
            {selectedAccount && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={importAccount}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import Selected Account
              </motion.button>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isConnecting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-700">Connecting to hardware wallet...</p>
              <p className="text-sm text-gray-500">Please check your device</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HardwareWalletScreen; 