import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Download, Users, Coins, Globe, Shield, Zap, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import Header from '../common/Header';
import toast from 'react-hot-toast';
import type { ScreenId } from '../../types/index';

interface DashboardScreenProps {
  onNavigate?: (screen: ScreenId) => void;
}


interface FeatureItem {
  id?: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  onClick?: () => void;
  action?: () => void;
}


const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  console.log('DashboardScreen rendered, onNavigate:', !!onNavigate); // Debug log
  const { wallet, balances, address, isWalletUnlocked, updateAllBalances } = useWallet();
  const { networkState, currentNetwork } = useNetwork();
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Advanced Features section rendering');
  }, []);

  // Get current network-specific data
  const currentBalance = balances[currentNetwork?.id || 'ethereum'] || '0.00';
  const currentNetworkData = currentNetwork || networkState.currentNetwork;

  // Refresh balance when network changes
  useEffect(() => {
    if (currentNetworkData?.id) {
      console.log('Network changed to:', currentNetworkData.id);
      refreshBalance();
    }
  }, [currentNetworkData?.id]);

  const refreshBalance = async () => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      try {
        await updateAllBalances();
        toast.success('Balance updated!');
      } catch (error) {
        console.error('Failed to refresh balance:', error);
        toast.error('Failed to update balance');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  // Get network-specific features based on current network
  const getNetworkSpecificFeatures = () => {
    const baseFeatures = [
      {
        id: 'tokens',
        title: 'Tokens',
        description: 'Manage tokens',
        icon: Coins,
        color: 'bg-yellow-600',
        onClick: () => {
          console.log('=== TOKENS BUTTON CLICKED ===');
          console.log('Tokens button clicked, onNavigate:', !!onNavigate);
          console.log('Calling onNavigate with screen: tokens');
          onNavigate?.('tokens');
          console.log('onNavigate call completed');
          console.log('=== TOKENS BUTTON CLICK END ===');
        }
      }
    ];

    // Add network-specific features
    switch (currentNetworkData?.id) {
      case 'bitcoin':
        return [
          ...baseFeatures,
          {
            id: 'bitcoin',
            title: 'Bitcoin',
            description: 'Manage BTC transactions',
            icon: Coins,
            color: 'bg-orange-600',
            onClick: () => onNavigate?.('bitcoin')
          }
        ];
      case 'solana':
        return [
          ...baseFeatures,
          {
            id: 'solana',
            title: 'Solana',
            description: 'Manage SOL & SPL tokens',
            icon: Coins,
            color: 'bg-purple-600',
            onClick: () => onNavigate?.('solana')
          }
        ];
      case 'tron':
        return [
          ...baseFeatures,
          {
            id: 'tron',
            title: 'TRON',
            description: 'Manage TRX & TRC20 tokens',
            icon: Coins,
            color: 'bg-red-600',
            onClick: () => onNavigate?.('tron')
          }
        ];
      case 'litecoin':
        return [
          ...baseFeatures,
          {
            id: 'litecoin',
            title: 'Litecoin',
            description: 'Manage LTC transactions',
            icon: Coins,
            color: 'bg-gray-600',
            onClick: () => onNavigate?.('litecoin')
          }
        ];
      case 'ton':
        return [
          ...baseFeatures,
          {
            id: 'ton',
            title: 'TON',
            description: 'Manage TON & Jettons',
            icon: Coins,
            color: 'bg-blue-600',
            onClick: () => onNavigate?.('ton')
          }
        ];
      case 'xrp':
        return [
          ...baseFeatures,
          {
            id: 'xrp',
            title: 'XRP',
            description: 'Manage XRP & IOUs',
            icon: Coins,
            color: 'bg-black',
            onClick: () => onNavigate?.('xrp')
          }
        ];
      default:
        // EVM chains
        return [
          ...baseFeatures,
          {
            id: 'ens',
            title: 'ENS Domains',
            description: 'Search and register ENS',
            icon: Globe,
            color: 'bg-indigo-600',
            onClick: () => onNavigate?.('ens')
          },
          {
            id: 'address-book',
            title: 'Address Book',
            description: 'Manage your contacts with ENS names',
            icon: Users,
            color: 'bg-green-600',
            onClick: () => onNavigate?.('address-book')
          },
          {
            id: 'hardware',
            title: 'Hardware Wallet',
            description: 'Connect hardware devices',
            icon: Shield,
            color: 'bg-red-600',
            onClick: () => onNavigate?.('hardware')
          },
          {
            id: 'gas',
            title: 'Gas Settings',
            description: 'Customize gas fees',
            icon: Zap,
            color: 'bg-orange-600',
            onClick: () => onNavigate?.('gas')
          }
        ];
    }
  };

  const quickActions = [
    {
      id: 'send',
      title: 'Send',
      icon: Send,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => onNavigate?.('send')
    },
    {
      id: 'receive',
      title: 'Receive',
      icon: Download,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => onNavigate?.('receive')
    },
    {
      id: 'accounts',
      title: 'Accounts',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => onNavigate?.('accounts')
    }
  ];

  const advancedFeatures = getNetworkSpecificFeatures();

  // Format address based on network
  const formatAddress = (addr: string) => {
    if (!addr) return 'No address';
    
    // Different address formats for different networks
    switch (currentNetworkData?.id) {
      case 'tron':
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`; // TRON addresses are longer
      case 'bitcoin':
      case 'litecoin':
        return `${addr.slice(0, 6)}...${addr.slice(-6)}`; // Bitcoin-style addresses
      case 'solana':
        return `${addr.slice(0, 6)}...${addr.slice(-6)}`; // Solana addresses
      case 'ton':
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`; // TON addresses
      case 'xrp':
        return `${addr.slice(0, 6)}...${addr.slice(-6)}`; // XRP addresses
      default:
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`; // EVM addresses
    }
  };

  // Get network status indicator
  const getNetworkStatus = () => {
    const networkId = currentNetworkData?.id;
    switch (networkId) {
      case 'ethereum':
        return { color: 'bg-blue-500', text: 'Ethereum' };
      case 'bsc':
        return { color: 'bg-yellow-500', text: 'BSC' };
      case 'polygon':
        return { color: 'bg-purple-500', text: 'Polygon' };
      case 'avalanche':
        return { color: 'bg-red-500', text: 'Avalanche' };
      case 'arbitrum':
        return { color: 'bg-blue-600', text: 'Arbitrum' };
      case 'optimism':
        return { color: 'bg-red-600', text: 'Optimism' };
      case 'bitcoin':
        return { color: 'bg-orange-500', text: 'Bitcoin' };
      case 'solana':
        return { color: 'bg-purple-600', text: 'Solana' };
      case 'tron':
        return { color: 'bg-red-500', text: 'TRON' };
      case 'litecoin':
        return { color: 'bg-gray-500', text: 'Litecoin' };
      case 'ton':
        return { color: 'bg-blue-500', text: 'TON' };
      case 'xrp':
        return { color: 'bg-black', text: 'XRP' };
      default:
        return { color: 'bg-green-500', text: 'Connected' };
    }
  };

  const networkStatus = getNetworkStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header with Network Switcher */}
      <Header 
        title="dashboard" 
        canGoBack={false}
        currentNetwork={currentNetworkData}
      />
      
      {/* Dashboard Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Total Balance</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{currentNetworkData?.symbol || 'ETH'}</span>
              <div className={`w-2 h-2 ${networkStatus.color} rounded-full`}></div>
              <span className="text-xs text-gray-400">{networkStatus.text}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-white">
                {showBalance ? currentBalance : '••••••'}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={refreshBalance}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">$0.00 USD</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${networkStatus.color} rounded-full`}></div>
              <span className="text-sm text-gray-300 font-mono">
                {address ? formatAddress(address) : 'No address'}
              </span>
            </div>
            <button
              onClick={copyAddress}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
      >
          <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`${action.color} p-4 rounded-xl transition-all duration-200 transform hover:scale-105`}
              >
                <action.icon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{action.title}</span>
              </button>
            ))}
        </div>
      </motion.div>

        {/* Advanced Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
          style={{ position: 'relative', zIndex: 100 }}
        >
          <h3 className="text-lg font-semibold text-white">Advanced Features</h3>
          <div className="grid grid-cols-2 gap-4">
            {advancedFeatures.map((feature) => (
              <button
                key={feature.id}
                data-testid={`feature-${feature.id}`}
                onClick={feature.onClick}
                onMouseDown={() => console.log('Button mousedown:', feature.id)}
                onMouseUp={() => console.log('Button mouseup:', feature.id)}
                className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-left transition-all duration-200 hover:bg-gray-800/50 hover:border-white/20 relative z-10"
              >
                <div className={`${feature.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                <p className="text-xs text-gray-400">{feature.description}</p>
              </button>
            ))}
          </div>
        </motion.div>
        </div>
    </div>
  );
};

export default DashboardScreen; 