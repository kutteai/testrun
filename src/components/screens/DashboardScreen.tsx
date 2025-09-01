import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Download, Users, Coins, Globe, Shield, Zap, Copy, Eye, EyeOff, RefreshCw, Image, Crown } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { getOwnedNFTs, getProfilePicture } from '../../utils/nft-utils';
import { getNetworkRPCUrl } from '../../utils/token-balance-utils';
import { getBitcoinTransactions } from '../../utils/bitcoin-simple';
import { getEVMTransactions } from '../../utils/evm-transaction-utils';
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
  const [nfts, setNfts] = useState<any[]>([]);
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Advanced Features section rendering');
  }, []);

  // Get current network-specific data
  const currentBalance = balances[currentNetwork?.id || 'ethereum'] || '0.00';
  const currentNetworkData = currentNetwork || networkState.currentNetwork;
  
  // Debug wallet address changes
  React.useEffect(() => {
    console.log('🔍 Dashboard: Wallet address changed:', {
      address: wallet?.address,
      currentNetwork: wallet?.currentNetwork,
      networkId: currentNetworkData?.id
    });
  }, [wallet?.address, wallet?.currentNetwork, currentNetworkData?.id]);

  // Load NFTs, profile picture, and transactions
  useEffect(() => {
    if (wallet?.address) {
      loadNFTs();
      loadProfilePicture();
      loadTransactions();
    }
  }, [wallet?.address]);

  // Refresh balance when network changes
  useEffect(() => {
    if (currentNetworkData?.id) {
      console.log('Network changed to:', currentNetworkData.id);
      refreshBalance();
    }
  }, [currentNetworkData?.id]);

  const loadNFTs = async () => {
    if (!wallet?.address) return;
    
    setIsLoadingNFTs(true);
    try {
      const network = wallet.currentNetwork || 'ethereum';
      const rpcUrl = getNetworkRPCUrl(network);
      
      console.log('🔍 Dashboard: Loading NFTs for address:', wallet.address);
      console.log('🔍 Dashboard: Network:', network);
      console.log('🔍 Dashboard: RPC URL:', rpcUrl);
      
      const ownedNFTs = await getOwnedNFTs(wallet.address, rpcUrl, network);
      console.log('✅ Dashboard: Loaded NFTs:', ownedNFTs.length);
      console.log('📊 Dashboard: NFT details:', ownedNFTs.map(nft => ({
        name: nft.metadata.name,
        collection: nft.name,
        tokenId: nft.tokenId
      })));
      
      setNfts(ownedNFTs.slice(0, 3)); // Show only first 3 NFTs
    } catch (error) {
      console.error('❌ Dashboard: Error loading NFTs:', error);
    } finally {
      setIsLoadingNFTs(false);
    }
  };

  const loadProfilePicture = async () => {
    try {
      const currentProfile = await getProfilePicture();
      setProfilePicture(currentProfile);
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const loadTransactions = async () => {
    if (!wallet?.address) return;
    
    setIsLoadingTransactions(true);
    try {
      const network = wallet.currentNetwork || 'ethereum';
      
      if (network === 'bitcoin') {
        // Load Bitcoin transactions
        const btcTransactions = await getBitcoinTransactions(wallet.address, 'mainnet');
        setTransactions(btcTransactions.slice(0, 5)); // Show only first 5 transactions
      } else {
        // Load EVM transactions
        const rpcUrl = getNetworkRPCUrl(network);
        const evmTransactions = await getEVMTransactions(wallet.address, rpcUrl, network);
        setTransactions(evmTransactions.slice(0, 5)); // Show only first 5 transactions
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

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
    console.log('🔍 Dashboard: getNetworkSpecificFeatures called with network:', currentNetworkData?.id);
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
      },
      {
        id: 'nfts',
        title: 'NFTs',
        description: 'View NFT collections',
        icon: Image,
        color: 'bg-purple-600',
        onClick: () => onNavigate?.('nfts')
      },
      {
        id: 'transactions',
        title: 'Transactions',
        description: 'View transaction history',
        icon: RefreshCw,
        color: 'bg-blue-600',
        onClick: () => onNavigate?.('transactions')
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

    // Add network-specific features
    console.log('🔍 Dashboard: Switching on network:', currentNetworkData?.id);
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
        console.log('🔍 Dashboard: Using EVM features for network:', currentNetworkData?.id);
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
  console.log('🔍 Dashboard: Advanced features:', {
    count: advancedFeatures.length,
    features: advancedFeatures.map(f => ({ id: f.id, title: f.title })),
    currentNetwork: currentNetworkData?.id
  });

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

      {/* NFTs Section */}
      {(() => {
        console.log('🔍 Dashboard: NFT section render check:', {
          nftsLength: nfts.length,
          hasProfilePicture: !!profilePicture,
          isLoadingNFTs
        });
        return (nfts.length > 0 || profilePicture);
      })() && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">NFTs</h3>
            <button
              onClick={() => onNavigate?.('nfts')}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              View All
            </button>
          </div>
          
          {/* Profile Picture */}
          {profilePicture && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 relative">
                  <img 
                    src={profilePicture.metadata.image} 
                    alt={profilePicture.metadata.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjODg4Ii8+CjxwYXRoIGQ9Ik0yNCAyNEMzMi4wNTg5IDI0IDM4IDE4LjA1ODkgMzggMTBDMzggMS45NDExIDMyLjA1ODkgLTQgMjQgLTRDMTUuOTQxMSAtNCAxMCAxLjk0MTEgMTAgMTBDMTAgMTguMDU4OSAxNS45NDExIDI0IDI0IDI0WiIgZmlsbD0iI0FBQSIvPgo8cGF0aCBkPSJNMzggMzZDMzggMjcuOTQxMSAzMi4wNTg5IDIyIDI0IDIyQzE1Ljk0MTEgMjIgMTAgMjcuOTQxMSAxMCAzNkgzOFoiIGZpbGw9IiNBQUEiLz4KPC9zdmc+';
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <Crown className="w-3 h-3 text-yellow-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{profilePicture.metadata.name}</h4>
                  <p className="text-xs text-gray-400">{profilePicture.name}</p>
                  <p className="text-xs text-gray-500">Profile Picture</p>
                </div>
              </div>
            </div>
          )}
          
          {/* NFT Grid */}
          {nfts.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {nfts.map((nft, index) => (
                <motion.div
                  key={nft.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition-all"
                  onClick={() => onNavigate?.('nfts')}
                >
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative">
                    <img 
                      src={nft.metadata.image} 
                      alt={nft.metadata.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjODg4Ii8+CjxwYXRoIGQ9Ik01MCA1MEM2Ni4xMzcgNTAgODAgMzYuMTM3IDgwIDIwQzgwIDMuODYzIDY2LjEzNyAtMTAgNTAgLTEwQzMzLjg2MyAtMTAgMjAgMy44NjMgMjAgMjBDMjAgMzYuMTM3IDMzLjg2MyA1MCA1MCA1MFoiIGZpbGw9IiNBQUEiLz4KPHBhdGggZD0iTTgwIDgwQzgwIDY2Ljg2MyA2Ni4xMzcgNjAgNTAgNjBDMzMuODYzIDYwIDIwIDY2Ljg2MyAyMCA4MEg4MFoiIGZpbGw9IiNBQUEiLz4KPC9zdmc+';
                      }}
                    />
                  </div>
                  <div className="p-2">
                    <h4 className="font-semibold text-white text-xs truncate">{nft.metadata.name}</h4>
                    <p className="text-xs text-gray-400 truncate">{nft.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Loading State */}
          {isLoadingNFTs && (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <button
              onClick={() => onNavigate?.('transactions')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.txid || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => onNavigate?.('transactions')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        tx.type === 'receive' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm capitalize">{tx.type}</h4>
                      <p className="text-xs text-gray-400">
                        {tx.txid ? `${tx.txid.slice(0, 8)}...${tx.txid.slice(-8)}` : 
                         tx.hash ? `${tx.hash.slice(0, 8)}...${tx.hash.slice(-8)}` : 'Transaction'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(8)} {currentNetworkData?.symbol || (wallet?.currentNetwork === 'bitcoin' ? 'BTC' : 'ETH')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.confirmations > 0 ? `${tx.confirmations} confirmations` : 'Pending'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Loading State */}
          {isLoadingTransactions && (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </motion.div>
      )}

        {/* Advanced Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
          style={{ position: 'relative', zIndex: 100 }}
        >
          <h3 className="text-lg font-semibold text-white">Advanced Features ({advancedFeatures.length})</h3>
          <div className="grid grid-cols-2 gap-4">
            {advancedFeatures.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-400">
                <p>No advanced features available</p>
                <p className="text-sm">Current network: {currentNetworkData?.id || 'unknown'}</p>
              </div>
            ) : (
            advancedFeatures.map((feature) => (
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
            ))
            )}
          </div>
        </motion.div>
        </div>
    </div>
  );
};

export default DashboardScreen; 