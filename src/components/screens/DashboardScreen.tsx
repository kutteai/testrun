import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import sendIcon from '../../assets/send.png';
import receiveIcon from '../../assets/receive.png';
import swapIcon from '../../assets/swap.png';
import buySellIcon from '../../assets/sendandreceive.png';
import { 
  TrendingUp,
  Send,
  Download,
  Settings,
  Eye,
  EyeOff,
  Search,
  Bell,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Globe,
  Shield,
  Key,
  Copy,
  Check,
  X,
  MoreHorizontal,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Menu,
  Grid3X3,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { ucpiService, type UCPIData } from '../../services/ucpi-service';
import { useNetwork } from '../../store/NetworkContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { handleError } from '../../utils/error-handler';
import { navigateWithHistory, goBackWithHistory } from '../../utils/navigation-utils';
import { ScreenProps, Transaction } from '../../types';
import NetworkSwitcherModal from '../common/NetworkSwitcherModal';

const DashboardScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  // Context hooks with error handling
  const wallet = useWallet();
  const network = useNetwork();
  const portfolio = usePortfolio();

  // State management
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [fiatBalance, setFiatBalance] = useState('$0.00');
  const [balanceChange, setBalanceChange] = useState('+0.00%');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ucpiId, setUcpiId] = useState('');
  const [recentTxHistory, setRecentTxHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showGlobeNetworkDropdown, setShowGlobeNetworkDropdown] = useState(false);
  const [selectedGlobeNetwork, setSelectedGlobeNetwork] = useState(network?.currentNetwork);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [showSecretPhrase, setShowSecretPhrase] = useState(false);
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  const [decryptedSeedPhrase, setDecryptedSeedPhrase] = useState('');
  const [activeTab, setActiveTab] = useState('crypto');

  // Refs for dropdowns
  const networkDropdownRef = useRef<HTMLDivElement>(null);
  const globeDropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Notify when wallet becomes available
  useEffect(() => {
    if (wallet && !wallet.isInitializing) {
      // Wallet ready
    }
  }, [wallet?.isInitializing]);

  // Load UCPI ID with error handling
  const loadUcpiId = async (): Promise<string> => {
    try {
      // Try to get from storage
      const { storage } = await import('../../utils/storage-utils');
      const storedData = await storage.get(['ucpiId', 'wallet', 'ucpiData', 'wallets']);
      
      // Check various possible storage locations
      if (storedData.ucpiId) {
        return storedData.ucpiId;
      }
      
      if (storedData.ucpiData?.id) {
        return storedData.ucpiData.id;
      }
      
      if (storedData.wallet?.ucpiId) {
        return storedData.wallet.ucpiId;
      }
      
      // Check if there's a UCPI in the wallet name or other fields
      if (storedData.wallet?.name && storedData.wallet.name.includes('@')) {
        return storedData.wallet.name;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  };

  // Load live data from contexts
  useEffect(() => {
    const loadData = async () => {
      try {
        
        // Load accounts and current account
        const accountsData = await (wallet?.getWalletAccounts?.() || Promise.resolve([]));
        const currentAccount = await (wallet?.getCurrentAccount?.() || Promise.resolve(null));
        const ucpiIdData = await loadUcpiId();
        
        // Debug: Check what WalletManager finds directly
        if (wallet?.wallet?.id) {
          try {
            const { WalletManager } = await import('../../core/wallet-manager');
            const walletManager = new WalletManager();
            const directAccounts = await walletManager.getWalletAccounts(wallet.wallet.id);
          } catch (error) {
          }
        }
        
        
        

        // Update state
        setAccounts(accountsData);
        setSelectedAccount(currentAccount);
        setUcpiId(ucpiIdData);
        
        // Check if account has address for current network
        if (currentAccount) {
          const currentNetworkId = network?.currentNetwork?.id || 'ethereum';
          if (!currentAccount.addresses?.[currentNetworkId]) {
            // Account missing address for current network
          }
        }
        

      } catch (error) {
        setError('Failed to load dashboard data');
      }
    };

    // Load data when wallet is ready
    if (wallet && !wallet.isInitializing) {
      loadData();
    }
  }, [wallet?.isInitializing, wallet?.wallet]); // Also reload when wallet data changes

  // Listen for wallet changes (network switches, address updates, etc.)
  useEffect(() => {
    const handleWalletChanged = async (event: CustomEvent) => {
      
      // Reload dashboard data to reflect the changes
      try {
        
        // Small delay to ensure WalletManager has saved changes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load updated accounts and current account
        const accountsData = await (wallet?.getWalletAccounts?.() || Promise.resolve([]));
        const currentAccount = await (wallet?.getCurrentAccount?.() || Promise.resolve(null));
        
        
        // Force update accounts state to ensure UI reflects changes
        setAccounts(accountsData);
        
        // Update selected account if we have one
        if (currentAccount) {
          setSelectedAccount(currentAccount);
        } else {
        }
      } catch (error) {
      }
    };

    // Add event listener
    window.addEventListener('walletChanged', handleWalletChanged as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('walletChanged', handleWalletChanged as EventListener);
    };
  }, [wallet]);

  // Update UCPI ID when it changes
  useEffect(() => {
    if (ucpiId) {
    }
  }, [ucpiId]);

  // Update balance from portfolio
  useEffect(() => {
    if (portfolio?.portfolioValue) {
      const totalValue = portfolio.portfolioValue.totalUSD;
      setTotalBalance(totalValue.toFixed(2));
      setFiatBalance(`$${totalValue.toFixed(2)}`);
      
      // Calculate 24h change if available
      if (portfolio.portfolioValue.totalChangePercent !== undefined) {
        const change = portfolio.portfolioValue.totalChangePercent;
        setBalanceChange(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
      }
    }
  }, [portfolio?.portfolioValue]);

  // Update crypto assets from portfolio
  useEffect(() => {
    if (portfolio?.portfolioValue?.assets && Array.isArray(portfolio.portfolioValue.assets)) {
      setCryptoAssets(portfolio.portfolioValue.assets);
    }
  }, [portfolio?.portfolioValue?.assets]);

  // Load transaction history
  useEffect(() => {
    const loadTransactionHistory = async () => {
      if (!wallet || wallet.isInitializing) return;
      
      try {
        setIsLoadingHistory(true);
        // For now, use empty array until transaction history is implemented
        setRecentTxHistory([]);
      } catch (error) {
        console.error('Failed to load transaction history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadTransactionHistory();
  }, [wallet?.isInitializing]);

  // Update crypto assets from portfolio data
  useEffect(() => {
    if (!portfolio?.portfolioValue || !isMountedRef.current) return;

    try {
      const portfolioData = portfolio.portfolioValue;
      if (portfolioData.assets && Array.isArray(portfolioData.assets)) {
        setCryptoAssets(portfolioData.assets);
        setTotalBalance(portfolioData.totalUSD?.toFixed(2) || '0.00');
        setFiatBalance(`$${portfolioData.totalUSD?.toFixed(2) || '0.00'}`);
        setBalanceChange(
          portfolioData.totalChangePercent 
            ? `${portfolioData.totalChangePercent >= 0 ? '+' : ''}${portfolioData.totalChangePercent.toFixed(2)}%`
            : '+0.00%'
        );
      }
    } catch (error) {
      console.error('Error updating crypto assets:', error);
      setCryptoAssets([]);
    }
  }, [portfolio?.portfolioValue]);

  // Load transaction history with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const loadTransactionHistory = async () => {
      if (!selectedAccount || !isMountedRef.current) return;

        setIsLoadingHistory(true);
      
      try {
        // Set timeout for transaction loading
        timeoutId = setTimeout(() => {
          if (isMountedRef.current) {
            setIsLoadingHistory(false);
            console.log('⏰ Transaction loading timeout');
          }
        }, 5000);

        // Load real transaction history
        try {
          const { getTransactionHistory } = await import('../../utils/web3-utils');
          const transactions = await getTransactionHistory(
            selectedAccount.address,
            network?.currentNetwork?.id || 'ethereum',
            1, // page
            5  // limit to 5 recent transactions
          );
          
          if (isMountedRef.current) {
            // Convert API response to our transaction format
            const formattedTransactions: Transaction[] = transactions.map((tx: any) => ({
              id: tx.hash,
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value ? `${(parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(4)} ETH` : '0 ETH',
              amount: tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toString() : '0',
              network: network?.currentNetwork?.id || 'ethereum',
              timestamp: parseInt(tx.timeStamp, 10) * 1000,
              status: tx.isError === '0' ? 'confirmed' : 'failed',
              type: tx.from.toLowerCase() === selectedAccount.address.toLowerCase() ? 'send' : 'receive'
            }));
            
            setRecentTxHistory(formattedTransactions);
            setIsLoadingHistory(false);
          }
        } catch (error) {
          console.error('Error loading transaction history:', error);
          if (isMountedRef.current) {
            setRecentTxHistory([]);
            setIsLoadingHistory(false);
          }
        }
        } catch (error) {
        if (isMountedRef.current) {
          console.error('Error loading transaction history:', error);
          setRecentTxHistory([]);
          setIsLoadingHistory(false);
        }
      }
    };

    loadTransactionHistory();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedAccount, network?.currentNetwork]);

  // Refresh data with better error handling
  const handleRefresh = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Trigger a re-fetch by updating dependencies
      if (isMountedRef.current) {
        setIsLoading(true);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      setError('Failed to refresh data');
    } finally {
      if (isMountedRef.current) {
      setIsRefreshing(false);
      }
    }
  };

  // Create new account with error handling
  const handleCreateAccount = async () => {
    if (!newAccountName.trim() || !wallet) return;
    
    try {
      const password = await wallet.getPassword?.();
      if (!password) return;
      
      const newAccount = await wallet.addAccount?.(password);
      if (newAccount) {
      setAccounts(prev => [...prev, newAccount]);
      setSelectedAccount(newAccount);
      setShowCreateAccountModal(false);
      setNewAccountName('');
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      setError('Failed to create account');
    }
  };

  // Network switching with error handling
  const handleNetworkSwitch = async (networkToSwitch: any) => {
    if (!wallet || !networkToSwitch) return;

    try {
      await wallet.switchNetwork?.(networkToSwitch.id);
      setShowNetworkDropdown(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
      setError('Failed to switch network');
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setShowNetworkDropdown(false);
      }
      if (globeDropdownRef.current && !globeDropdownRef.current.contains(event.target as Node)) {
        setShowGlobeNetworkDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Error state
  if (error && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col bg-gray-50"
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="bg-[#180CB2] text-white px-6 py-2 rounded-lg hover:bg-[#140a8f] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col bg-gray-50"
      >
        {/* Header Skeleton */}
        <div className="bg-[#180CB2] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 bg-white/20 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-white/20 rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 bg-white rounded-t-3xl px-6 py-6">
          {/* Balance Section Skeleton */}
          <div className="text-center mb-8">
            <div className="h-12 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-4"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Assets Section Skeleton */}
          <div className="mb-6">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Main component render
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white font-inter"
      style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '13px', lineHeight: '18px', letterSpacing: '0%' }}
    >
      {/* Top Blue Section - Header and Balance */}
      <div className="bg-[#180CB2] px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <div className="text-white font-medium" style={{ fontSize: '13px', lineHeight: '18px' }}>
                {selectedAccount ? `${selectedAccount.name || 'Account 1'}` : 'Account 1'}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>
                  {(() => {
                    // First try to get address from wallet state (this is the most current)
                    if (wallet?.wallet?.address) {
                      return `${wallet.wallet.address.slice(0, 8)}...${wallet.wallet.address.slice(-8)}`;
                    }
                    
                    // Fallback to account addresses
                    if (!selectedAccount?.addresses) return 'No address';
                    
                    const currentNetworkId = wallet?.wallet?.currentNetwork || 'ethereum';
                    const address = selectedAccount.addresses[currentNetworkId];
                    
                    if (!address) return 'No address';
                    
                    return `${address.slice(0, 8)}...${address.slice(-8)}`;
                  })()}
                </span>
                <button 
                  className="p-1 hover:bg-white/10 rounded"
                  onClick={async () => {
                    try {
                      const addressToCopy = wallet?.wallet?.address || 
                        selectedAccount?.addresses?.[wallet?.wallet?.currentNetwork || 'ethereum'] ||
                        'No address available';
                      
                      await navigator.clipboard.writeText(addressToCopy);
                    } catch (error) {
                    }
                  }}
                >
                  <Copy className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setShowNetworkSwitcher(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Globe className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onNavigate('accounts')}
              className="hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onNavigate('options')}
              className=" hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu className="w-4 h-4 text-white" />
            </button>
        </div>
      </div>

        {/* Total Balance Card */}
        <div className="bg-white/10 rounded-2xl p-6 mb-6">
          {/* Top Section - Balance Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="text-white/70 mb-2" style={{ fontSize: '13px', lineHeight: '18px' }}>Total Balance</div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-4xl font-bold text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>
                  {showBalance ? totalBalance : '****'}
                </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
          </div>
              <div className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>
                {fiatBalance} ({balanceChange})
              </div>
            </div>
            
            {/* Network Selector - Right Aligned */}
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                wallet?.wallet?.currentNetwork === 'bitcoin' ? 'bg-orange-500' : 
                wallet?.wallet?.currentNetwork === 'ethereum' ? 'bg-blue-500' :
                wallet?.wallet?.currentNetwork === 'solana' ? 'bg-purple-500' :
                wallet?.wallet?.currentNetwork === 'tron' ? 'bg-red-500' :
                wallet?.wallet?.currentNetwork === 'ton' ? 'bg-blue-400' :
                wallet?.wallet?.currentNetwork === 'xrp' ? 'bg-blue-300' :
                wallet?.wallet?.currentNetwork === 'litecoin' ? 'bg-gray-400' :
                'bg-gray-500'
              }`}>
                <span className="text-white font-bold" style={{ fontSize: '13px', lineHeight: '18px' }}>
                  {(() => {
                    const currentNetwork = wallet?.wallet?.currentNetwork || 'ethereum';
                    const networkSymbols: Record<string, string> = {
                      'bitcoin': 'B',
                      'ethereum': 'E',
                      'solana': 'S',
                      'tron': 'T',
                      'ton': 'T',
                      'xrp': 'X',
                      'litecoin': 'L',
                      'bsc': 'B',
                      'polygon': 'P',
                      'avalanche': 'A',
                      'arbitrum': 'A',
                      'optimism': 'O',
                      'base': 'B',
                      'fantom': 'F'
                    };
                    return networkSymbols[currentNetwork] || 'E';
                  })()}
                </span>
              </div>
              <span className="text-white font-medium" style={{ fontSize: '13px', lineHeight: '18px' }}>
                {(() => {
                  const currentNetwork = wallet?.wallet?.currentNetwork || 'ethereum';
                  const networkSymbols: Record<string, string> = {
                    'bitcoin': 'BTC',
                    'ethereum': 'ETH',
                    'solana': 'SOL',
                    'tron': 'TRX',
                    'ton': 'TON',
                    'xrp': 'XRP',
                    'litecoin': 'LTC',
                    'bsc': 'BNB',
                    'polygon': 'MATIC',
                    'avalanche': 'AVAX',
                    'arbitrum': 'ETH',
                    'optimism': 'ETH',
                    'base': 'ETH',
                    'fantom': 'FTM'
                  };
                  return networkSymbols[currentNetwork] || 'ETH';
                })()}
              </span>
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Bottom Section - UCPI ID or Create Button */}
          {ucpiId ? (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>UCPI ID</span>
                  <span className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>{ucpiId || 'No UCPI ID'}</span>
                </div>
                <button 
                  className="p-1 hover:bg-white/10 rounded"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(ucpiId);
                    } catch (error) {
                    }
                  }}
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <button className="w-full bg-white/10 border border-[#FFC02C] rounded-lg p-3 flex items-center justify-between hover:bg-white/20 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FFC02C] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">!</span>
                </div>
                <span className="text-white font-medium" style={{ fontSize: '13px', lineHeight: '18px' }}>Create UCPI ID</span>
          </div>
              <ChevronDown className="w-4 h-4 text-white rotate-90" />
            </button>
          )}
          </div>
        </div>

      {/* Bottom White Section with Rounded Corners */}
      <div className="flex-1 bg-white  rounded-t-3xl">
        <div className="px-6 py-6">
        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '13px' }}>Quick actions</h3>
          <div className="grid grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('send')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg flex flex-col items-center space-y-2">
                <img src={sendIcon} alt="Send" className="w-6 h-6" />
                <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Send</span>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('receive')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg flex flex-col items-center space-y-2">
                <img src={receiveIcon} alt="Receive" className="w-6 h-6" />
                <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Receive</span>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('swap')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg flex flex-col items-center space-y-2">
                <img src={swapIcon} alt="Swap" className="w-6 h-6" />
                <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Swap</span>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('buy-sell')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg flex flex-col items-center space-y-2">
                <img src={buySellIcon} alt="Buy/Sell" className="w-6 h-6" />
                <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Buy/Sell</span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Assets Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900" style={{ fontSize: '13px', lineHeight: '18px' }}>Assets</h3>
            <button
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings className="w-3 h-3 text-gray-600" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('crypto')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'crypto' 
                  ? 'bg-[#180CB2] text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Crypto
            </button>
            <button 
              onClick={() => setActiveTab('nfts')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'nfts' 
                  ? 'bg-[#180CB2] text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              NFTs
            </button>
            <button 
              onClick={() => setActiveTab('address-book')}
              className={`flex-1 py-2 px-4 whitespace-nowrap rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'address-book' 
                  ? 'bg-[#180CB2] text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Address book
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-[#180CB2] text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              History
            </button>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'crypto' && (
            <div className="space-y-3">
              {cryptoAssets.length > 0 ? (
                cryptoAssets.slice(0, 5).map((asset, index) => (
                  <motion.div
                    key={asset.symbol || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                  <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        asset.symbol === 'BTC' ? 'bg-orange-500' : 
                        asset.symbol === 'ETH' ? 'bg-blue-500' : 
                        'bg-gray-500'
                      }`}>
                        <span className="text-white text-sm font-bold">
                          {asset.symbol?.charAt(0) || '?'}
                        </span>
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{asset.symbol} {asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${asset.priceUSD?.toFixed(2) || '0.00'}
                      </p>
                      <p className={`text-sm ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {asset.change24h >= 0 ? '+' : ''}{asset.change24h?.toFixed(2) || '0.00'}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {asset.balance?.toFixed(4) || '0.0000'} ${asset.balanceUSD?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No crypto assets found</p>
                  <p className="text-sm text-gray-400">Your crypto assets will appear here</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'nfts' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-500 text-2xl">🎨</span>
              </div>
              <p className="text-gray-500">No NFTs found</p>
              <p className="text-sm text-gray-400">Your NFTs will appear here</p>
            </div>
          )}

          {activeTab === 'address-book' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-500 text-2xl">📇</span>
                    </div>
              <p className="text-gray-500">No saved addresses</p>
              <p className="text-sm text-gray-400">Your saved addresses will appear here</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {recentTxHistory.length > 0 ? (
                recentTxHistory.slice(0, 5).map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                  <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                      {tx.type === 'send' ? (
                          <ArrowUpRight className="w-5 h-5 text-red-500" />
                      ) : (
                          <ArrowDownLeft className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                          {tx.type === 'send' ? 'Sent' : 'Received'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{tx.amount} {tx.network}</p>
                      <div className="flex items-center space-x-1">
                        {tx.status === 'confirmed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : tx.status === 'pending' ? (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-500 capitalize">{tx.status}</span>
                  </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transaction history</p>
                  <p className="text-sm text-gray-400">Your transaction history will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Network Switcher Modal */}
      <NetworkSwitcherModal 
        isOpen={showNetworkSwitcher}
        onClose={() => setShowNetworkSwitcher(false)}
      />
    </motion.div>
  );
};

export default DashboardScreen;