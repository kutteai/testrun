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
import { useNetwork } from '../../store/NetworkContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { handleError } from '../../utils/error-handler';
import { navigateWithHistory, goBackWithHistory } from '../../utils/navigation-utils';
import { ScreenProps, Transaction } from '../../types';

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
  const [decryptedSeedPhrase, setDecryptedSeedPhrase] = useState('');

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

  // Load UCPI ID with error handling
  const loadUcpiId = async (): Promise<string> => {
    try {
      // Mock UCPI ID for now
      return '';
    } catch (error) {
      console.error('Failed to load UCPI ID:', error);
      return '';
    }
  };

  // Simple data loading effect
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading dashboard data...');
        
        // Load basic data without loading state
        const accountsData = await (wallet?.getWalletAccounts?.() || Promise.resolve([]));
        const currentAccount = await (wallet?.getCurrentAccount?.() || Promise.resolve(null));
        const ucpiIdData = await loadUcpiId();

        // Update state
        setAccounts(accountsData);
        setSelectedAccount(currentAccount);
        setUcpiId(ucpiIdData);
        
        console.log('✅ Dashboard data loaded');
          
        } catch (error) {
        console.error('Dashboard loading error:', error);
        setError('Failed to load dashboard data');
      }
    };

    // Load data when wallet is ready
    if (wallet && !wallet.isInitializing) {
      loadData();
    }
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

          // Simulate loading transaction history
          await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isMountedRef.current) {
          // Mock transaction data - replace with real data
          const mockTransactions: Transaction[] = [
            {
              id: '1',
              hash: '0x1234...5678',
              from: selectedAccount.address,
              to: '0xabcd...efgh',
              value: '0.5 ETH',
              amount: '0.5',
              network: 'ethereum',
              timestamp: Date.now() - 3600000,
              status: 'confirmed',
              type: 'send'
            }
          ];
          
          setRecentTxHistory(mockTransactions);
          setIsLoadingHistory(false);
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
                  {selectedAccount?.address ? `${selectedAccount.address.slice(0, 8)}...${selectedAccount.address.slice(-8)}` : 'af45g3.....3453tr'}
                </span>
                <button className="p-1 hover:bg-white/10 rounded">
                  <Copy className="w-3 h-3 text-white" />
          </button>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Globe className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={() => onNavigate('accounts')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu className="w-3 h-3 text-white" />
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
                  {showBalance ? '12.54' : '****'}
                </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
          </div>
              <div className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>
                $0.00 (+0.00%)
              </div>
            </div>
            
            {/* ETH Selector - Right Aligned */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold" style={{ fontSize: '13px', lineHeight: '18px' }}>E</span>
              </div>
              <span className="text-white font-medium" style={{ fontSize: '13px', lineHeight: '18px' }}>ETH</span>
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
                  <span className="text-white" style={{ fontSize: '13px', lineHeight: '18px' }}>itsmewilliam...@eth</span>
                </div>
                <button className="p-1 hover:bg-white/10 rounded">
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
      <div className="flex-1 bg-white px-6 py-6 rounded-t-3xl">
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
              <div className="p-3 shadow-md rounded-lg">
                <img src={sendIcon} alt="Send" className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Send</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('receive')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg">
                <img src={receiveIcon} alt="Receive" className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Receive</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('swap')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg">
                <img src={swapIcon} alt="Swap" className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Swap</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('buy-sell')}
              className="flex flex-col items-center space-y-2 p-1 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <div className="p-3 shadow-md rounded-lg">
                <img src={buySellIcon} alt="Buy/Sell" className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700" style={{ fontSize: '13px', lineHeight: '18px' }}>Buy/Sell</span>
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
            <button className="flex-1 py-2 px-4 bg-[#180CB2] text-white rounded-md text-sm font-medium">
              Crypto
            </button>
            <button className="flex-1 py-2 px-4 text-gray-600 rounded-md text-sm font-medium">
              NFTs
            </button>
            <button className="flex-1 py-2 px-4 text-gray-600 rounded-md text-sm font-medium">
              Address book
            </button>
            <button className="flex-1 py-2 px-4 text-gray-600 rounded-md text-sm font-medium">
              History
            </button>
          </div>
          
            <div className="space-y-3">
            {/* BTC */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
                  <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">B</span>
                    </div>
                    <div>
                  <p className="font-medium text-gray-900">BTC Bitcoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                <p className="font-medium text-gray-900">$112,027.42</p>
                <p className="text-sm text-red-500">-2.55%</p>
                <p className="text-sm text-gray-500">0 $0.00</p>
                    </div>
            </motion.div>

            {/* ETH */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">E</span>
                    </div>
                <div>
                  <p className="font-medium text-gray-900">ETH Ethereum</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">$3,245.67</p>
                <p className="text-sm text-green-500">+1.23%</p>
                <p className="text-sm text-gray-500">0 $0.00</p>
            </div>
            </motion.div>
            </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <button
              onClick={() => onNavigate('transaction-history')}
              className="text-sm text-[#180CB2] hover:text-[#140a8f] font-medium"
            >
              View All
            </button>
          </div>
          
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
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
          ) : recentTxHistory.length > 0 ? (
            <div className="space-y-3">
              {recentTxHistory.slice(0, 3).map((tx) => (
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
                    <p className="font-medium text-gray-900">{tx.value}</p>
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
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent transactions</p>
              <p className="text-sm text-gray-400">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardScreen;