import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDown, 
  Copy, 
  Eye, 
  EyeOff, 
  Globe, 
  Search, 
  Menu, 
  Settings,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useTransaction } from '../../store/TransactionContext';
import { getTransactionHistory, getTokenTransactions } from '../../utils/web3-utils';
import toast from 'react-hot-toast';
import type { ScreenProps, Transaction } from '../../types/index';
import { storage } from '../../utils/storage-utils';
import { handleError, ErrorCodes, createError } from '../../utils/error-handler';

// Import PNG icons
import sendIcon from '../../assets/send.png';
import receiveIcon from '../../assets/receive.png';
import swapIcon from '../../assets/swap.png';
import sendAndReceiveIcon from '../../assets/sendandreceive.png';

const DashboardScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork, getWalletAccounts, getCurrentAccount, getPassword, switchNetwork, addAccount } = useWallet();
  const { networks } = useNetwork();
  const { portfolioValue, updatePortfolio } = usePortfolio();
  const { recentTransactions, pendingTransactions } = useTransaction();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('crypto');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [fiatBalance, setFiatBalance] = useState('$0.00');
  const [balanceChange, setBalanceChange] = useState('+0.00%');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ucpiId, setUcpiId] = useState('');
  const [recentTxHistory, setRecentTxHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showGlobeNetworkDropdown, setShowGlobeNetworkDropdown] = useState(false);
  const [networkSearchQuery, setNetworkSearchQuery] = useState('');
  const [selectedGlobeNetwork, setSelectedGlobeNetwork] = useState('all');
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showSecretPhraseModal, setShowSecretPhraseModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [secretPhrasePassword, setSecretPhrasePassword] = useState('');
  const [showSecretPhrase, setShowSecretPhrase] = useState(false);
  const [decryptedSeedPhrase, setDecryptedSeedPhrase] = useState('');

  // Load UCPI ID from storage
  const loadUCPIId = async (): Promise<string | null> => {
    try {
      const result = await storage.get(['ucpiId']);
      return result.ucpiId || null;
    } catch (error) {
      console.error('Failed to load UCPI ID:', error);
      return null;
    }
  };

  // Fetch real account data and portfolio
  useEffect(() => {
    const fetchData = async () => {
      if (wallet) {
        try {
          setIsLoading(true);
          
          // Parallel loading of critical data
          const [walletAccounts, currentAccount, ucpiResult] = await Promise.allSettled([
            getWalletAccounts(),
            getCurrentAccount(),
            storage.get(['ucpiId', 'ucpiSkipped'])
          ]);
          
          // Handle accounts data
          if (walletAccounts.status === 'fulfilled') {
            setAccounts(walletAccounts.value);
            
            // Set current account if available
            if (walletAccounts.value.length > 0) {
              const accountToSet = currentAccount.status === 'fulfilled' 
                ? currentAccount.value || walletAccounts.value[0]
                : walletAccounts.value[0];
              setSelectedAccount(accountToSet);
            } else {
              setSelectedAccount(null);
            }
          }
          
          // Handle UCPI ID
          if (ucpiResult.status === 'fulfilled' && ucpiResult.value.ucpiId) {
            setUcpiId(ucpiResult.value.ucpiId);
          } else {
            setUcpiId('');
          }
          
          // Show UI immediately after critical data is loaded
          setIsLoading(false);
          
          // Update portfolio in background (non-blocking)
          updatePortfolio().catch(error => {
            handleError(error, {
              context: { operation: 'updatePortfolio', screen: 'DashboardScreen' },
              showToast: false // Don't show toast for background operations
            });
          });
        } catch (error) {
          handleError(error, {
            context: { operation: 'fetchDashboardData', screen: 'DashboardScreen' },
            showToast: true
          });
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [wallet, updatePortfolio, getWalletAccounts, getCurrentAccount]);

  // Update crypto assets from portfolio data
  useEffect(() => {
    if (portfolioValue) {
      const assets = portfolioValue.assets.map((asset) => ({
        symbol: asset.symbol,
        name: asset.network,
        logo: getNetworkIcon(asset.network),
        price: `$${portfolioValue.rates[asset.network]?.toLocaleString() || '0'}`,
        change: `${asset.changePercent > 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%`,
        quantity: asset.balance,
        value: `$${asset.usdValue.toFixed(2)}`
      }));
      
      setCryptoAssets(assets);
      
      // Update total balance and fiat balance
      setTotalBalance(portfolioValue.totalUSD.toFixed(2));
      setFiatBalance(`$${portfolioValue.totalUSD.toLocaleString()}`);
      setBalanceChange(`${portfolioValue.totalChangePercent > 0 ? '+' : ''}${portfolioValue.totalChangePercent.toFixed(2)}%`);
    }
  }, [portfolioValue]);


  // Load recent transaction history
  useEffect(() => {
    const loadTransactionHistory = async () => {
      if (!wallet?.address || !currentNetwork?.id) return;
      
      setIsLoadingHistory(true);
      try {
        // Load recent transactions from blockchain
        const [regularTxs, tokenTxs] = await Promise.all([
          getTransactionHistory(wallet.address, currentNetwork.id, 1, 5).catch(() => []),
          getTokenTransactions(wallet.address, currentNetwork.id).catch(() => [])
        ]);
        
        // Combine and format transactions
        const allTransactions = [...regularTxs, ...tokenTxs].map((tx: any) => ({
          id: tx.hash || tx.transactionHash,
          hash: tx.hash || tx.transactionHash,
          from: tx.from,
          to: tx.to,
          value: tx.value ? (parseInt(tx.value) / 1e18).toString() : '0',
          amount: tx.value ? (parseInt(tx.value) / 1e18).toString() : '0',
          network: currentNetwork.id,
          status: (tx.confirmations > 0 ? 'confirmed' : 'pending') as 'confirmed' | 'pending' | 'failed',
          timestamp: parseInt(tx.timeStamp || tx.timestamp) * 1000,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice) / 1e9).toString() : '0',
          blockNumber: tx.blockNumber,
          confirmations: tx.confirmations || 0,
          isTokenTransaction: !!tx.tokenName,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenValue: tx.tokenValue,
          type: (tx.from === wallet.address ? 'send' : 'receive') as 'send' | 'receive'
        }));
        
        // Only show real transactions - no demo data
        setRecentTxHistory(allTransactions.slice(0, 5));
      } catch (error) {
        console.error('Error loading transaction history:', error);
        // No demo transactions - show empty list if real data can't be fetched
        setRecentTxHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadTransactionHistory();
  }, [wallet?.address, currentNetwork?.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reload accounts
      console.log('🔄 Refreshing accounts...');
      const walletAccounts = await getWalletAccounts();
      console.log('✅ Refreshed accounts:', walletAccounts);
      setAccounts(walletAccounts);
      
      // Update portfolio
      await updatePortfolio();
      toast.success('Portfolio updated!');
    } catch (error) {
      console.error('Failed to refresh portfolio:', error);
      toast.error('Failed to refresh portfolio');
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }
    
    try {
      const password = await getPassword();
      if (!password) {
        toast.error('Password required to create new account');
        return;
      }
      
      await addAccount(password);
      const updatedAccounts = await getWalletAccounts();
      setAccounts(updatedAccounts);
      
      // Set the newest account as selected
      if (updatedAccounts.length > 0) {
        const newAccount = updatedAccounts[updatedAccounts.length - 1];
        setSelectedAccount(newAccount);
      }
      
      setShowCreateAccountModal(false);
      setNewAccountName('');
      toast.success(`Account "${newAccountName}" created successfully`);
    } catch (error) {
      console.error('Failed to create new account:', error);
      toast.error('Failed to create new account');
    }
  };

  const handleViewSecretPhrase = async () => {
    if (!secretPhrasePassword.trim()) {
      toast.error('Please enter your password');
      return;
    }
    
    try {
      if (!wallet?.encryptedSeedPhrase) {
        toast.error('No wallet found');
        return;
      }
      
      // Import crypto-js for decryption
      const CryptoJS = await import('crypto-js');
      
      // Decrypt the seed phrase
      const decryptedBytes = CryptoJS.AES.decrypt(wallet.encryptedSeedPhrase, secretPhrasePassword);
      const decryptedSeedPhrase = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedSeedPhrase) {
        throw new Error('Invalid password');
      }
      
      // Store the decrypted seed phrase temporarily for display
      setDecryptedSeedPhrase(decryptedSeedPhrase);
      setShowSecretPhrase(true);
      setSecretPhrasePassword('');
    } catch (error) {
      console.error('Invalid password:', error);
      toast.error('Invalid password');
    }
  };

  const handleNetworkSelect = (network: any) => {
    // Switch network logic here
    setShowNetworkDropdown(false);
  };

  const handleGlobeNetworkSelect = async (network: any) => {
    try {
      // Close dropdown immediately
      setShowGlobeNetworkDropdown(false);
      
      if (network.id === 'all') {
        setSelectedGlobeNetwork('all');
        toast.success('All networks selected');
      } else {
        // Switch to the selected network
        await switchNetwork(network.id);
        setSelectedGlobeNetwork(network.id);
        toast.success(`Switched to ${network.name}`);
        
        // Refresh all wallet data for the new network
        setIsRefreshing(true);
        try {
          // Reload accounts for the new network
          const walletAccounts = await getWalletAccounts();
          setAccounts(walletAccounts);
          
          // Update selected account to reflect the new network address
          const currentAccount = await getCurrentAccount();
          if (currentAccount) {
            setSelectedAccount(currentAccount);
          } else if (walletAccounts.length > 0) {
            // Fallback to first account if current account not found
            setSelectedAccount(walletAccounts[0]);
          }
          
          // Update portfolio data
          await updatePortfolio();
          
          // Reload transaction history
          if (wallet?.address) {
            const regularTxs = await getTransactionHistory(wallet.address, network.id);
            const tokenTxs = await getTokenTransactions(wallet.address, network.id);
            const allTransactions = [...regularTxs, ...tokenTxs].map((tx: any) => ({
              id: tx.hash || tx.transactionHash,
              hash: tx.hash || tx.transactionHash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              amount: tx.value || '0',
              network: network.id,
              timestamp: tx.timestamp || Date.now(),
              status: tx.status || 'confirmed',
              confirmations: tx.confirmations || 0,
              isTokenTransaction: !!tx.tokenName,
              tokenName: tx.tokenName,
              tokenSymbol: tx.tokenSymbol,
              tokenValue: tx.tokenValue,
              type: (tx.from === wallet.address ? 'send' : 'receive') as 'send' | 'receive'
            }));
            setRecentTxHistory(allTransactions.slice(0, 5));
          }
        } catch (refreshError) {
          console.error('Error refreshing data after network switch:', refreshError);
        } finally {
          setIsRefreshing(false);
        }
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast.error('Failed to switch network');
    }
  };

  // Get network icon based on network name/symbol
  const getNetworkIcon = (network: any) => {
    const name = network.name?.toLowerCase() || '';
    const symbol = network.symbol?.toLowerCase() || '';
    
    if (name.includes('bitcoin') || symbol === 'btc') {
      return (
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">₿</span>
        </div>
      );
    } else if (name.includes('ethereum') || symbol === 'eth') {
      return (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">Ξ</span>
        </div>
      );
    } else if (name.includes('tether') || symbol === 'usdt') {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">₮</span>
        </div>
      );
    } else if (name.includes('bnb') || symbol === 'bnb') {
      return (
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">B</span>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{symbol.charAt(0).toUpperCase()}</span>
        </div>
      );
    }
  };

  // Filter networks based on search query
  const filteredNetworks = networks.filter(network => 
    network.isEnabled && (
      network.name.toLowerCase().includes(networkSearchQuery.toLowerCase()) ||
      network.symbol.toLowerCase().includes(networkSearchQuery.toLowerCase())
    )
  );

  // Initialize selected network from current network
  useEffect(() => {
    if (currentNetwork) {
      setSelectedGlobeNetwork(currentNetwork.id);
    }
  }, [currentNetwork]);

  // Update selected account when wallet address changes (network switch)
  useEffect(() => {
    const updateSelectedAccount = async () => {
      if (wallet?.address) {
        console.log('🔄 Updating selected account for wallet address:', wallet.address);
        try {
          const currentAccount = await getCurrentAccount();
          console.log('🔍 Current account from getCurrentAccount:', currentAccount);
          
          if (currentAccount) {
            setSelectedAccount(currentAccount);
            console.log('✅ Set selected account to current account');
          } else {
            // If no current account found, try to find account with matching address
            const walletAccounts = await getWalletAccounts();
            console.log('🔍 All wallet accounts:', walletAccounts);
            const matchingAccount = walletAccounts.find(acc => acc.address === wallet.address);
            console.log('🔍 Matching account:', matchingAccount);
            
            if (matchingAccount) {
              setSelectedAccount(matchingAccount);
              console.log('✅ Set selected account to matching account');
            } else {
              console.log('⚠️ No matching account found for wallet address - setting to null');
              setSelectedAccount(null);
            }
          }
        } catch (error) {
          console.error('Failed to update selected account:', error);
          setSelectedAccount(null);
        }
      } else {
        console.log('⚠️ No wallet address available for account update - setting to null');
        setSelectedAccount(null);
      }
    };

    updateSelectedAccount();
  }, [wallet?.address, getCurrentAccount, getWalletAccounts]);

  // Listen for network changes to refresh account
  useEffect(() => {
    const handleNetworkChange = async (event: CustomEvent) => {
      console.log('🔄 Network changed event received:', event.detail);
      // Refresh the selected account when network changes
      try {
        setIsRefreshing(true);
        
        // Reload accounts
        const walletAccounts = await getWalletAccounts();
        console.log('✅ Refreshed accounts after network change:', walletAccounts);
        setAccounts(walletAccounts);
        
        // Update portfolio for new network
        await updatePortfolio();
        
        const currentAccount = await getCurrentAccount();
        if (currentAccount) {
          setSelectedAccount(currentAccount);
          console.log('✅ Updated selected account after network change:', currentAccount);
        } else {
          // If no current account, try to find matching account for the new network
          const matchingAccount = walletAccounts.find(acc => 
            acc.network === event.detail.networkId || 
            acc.network === event.detail.network?.id
          );
          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            console.log('✅ Updated selected account to matching account after network change:', matchingAccount);
          } else if (walletAccounts.length > 0) {
            // Fallback to first account if no network match
            setSelectedAccount(walletAccounts[0]);
            console.log('✅ Updated selected account to first available account:', walletAccounts[0]);
          } else {
            console.log('⚠️ No matching account found after network change');
            setSelectedAccount(null);
          }
        }
        
        // Clear transaction history for new network (will be loaded by existing useEffect)
        setRecentTxHistory([]);
        
      } catch (error) {
        console.error('Error updating account after network change:', error);
        setSelectedAccount(null);
      } finally {
        setIsRefreshing(false);
      }
    };

    const handleWalletChange = async (event: CustomEvent) => {
      // Refresh the selected account when wallet address changes
      try {
        console.log('🔄 Wallet changed event received:', event.detail);
        setIsRefreshing(true);
        
        // Reload accounts
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        
        // Update portfolio
        await updatePortfolio();
        
        const currentAccount = await getCurrentAccount();
        if (currentAccount) {
          setSelectedAccount(currentAccount);
          console.log('✅ Updated selected account after wallet change:', currentAccount);
        } else {
          // If no current account, try to find matching account
          const matchingAccount = walletAccounts.find(acc => acc.address === event.detail.newAddress);
          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            console.log('✅ Updated selected account to matching account after wallet change:', matchingAccount);
          } else if (walletAccounts.length > 0) {
            // Fallback to first account
            setSelectedAccount(walletAccounts[0]);
            console.log('✅ Updated selected account to first available account after wallet change:', walletAccounts[0]);
          } else {
            setSelectedAccount(null);
          }
        }
        
        // Clear transaction history for new address (will be loaded by existing useEffect)
        setRecentTxHistory([]);
        
      } catch (error) {
        console.error('Error updating account after wallet change:', error);
        setSelectedAccount(null);
      } finally {
        setIsRefreshing(false);
      }
    };

    window.addEventListener('networkChanged', handleNetworkChange as EventListener);
    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, [wallet?.address, getCurrentAccount, getWalletAccounts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.globe-dropdown-container')) {
        setShowNetworkDropdown(false);
        setShowGlobeNetworkDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
            <div className="flex space-x-4">
              <div className="flex-1 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col dashboard-typography"
    >
      {/* Top Half - Theme Color Background */}
      <div className="h-1/2 bg-[#180CB2] text-white px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          {/* Account Selector */}
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">👤</span>
            </div>
            <div className="flex flex-col relative">
              <button 
                onClick={() => onNavigate('accounts')}
                className="flex items-center space-x-1 hover:bg-white/10 rounded-lg p-1 transition-colors"
              >
                <span className="font-semibold text-xs sm:text-base">
                  {selectedAccount?.name || `Account ${selectedAccount?.id || '1'}`}
                </span>
              </button>
              
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-white/80">
                  {selectedAccount?.address ? 
                    `${selectedAccount.address.substring(0, 6)}...${selectedAccount.address.substring(selectedAccount.address.length - 4)}` : 
                    'No account address'
                  }
                </span>
                <button 
                  onClick={() => handleCopy(selectedAccount?.address || '')}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-0 sm:space-x-0">
            
            {/* Globe Network Dropdown */}
            <div className="relative globe-dropdown-container" style={{ zIndex: 99999 }}>
              <button 
                onClick={() => setShowGlobeNetworkDropdown(!showGlobeNetworkDropdown)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* Globe Network Dropdown */}
              {showGlobeNetworkDropdown && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }} onClick={() => setShowGlobeNetworkDropdown(false)}></div>
              )}
              
              {showGlobeNetworkDropdown && (
                <div 
                  className="absolute top-12 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[320px]"
                  style={{ zIndex: 99999 }}
                >
                  <div className="px-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-100">
                    Select Network
                  </div>
                  
                  {/* Search Bar with Icon */}
                  <div className="px-4 py-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={networkSearchQuery}
                        onChange={(e) => setNetworkSearchQuery(e.target.value)}
                        placeholder="Network name" 
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {/* All Networks Option */}
                    <div className="mx-4 mb-2">
                      <button
                        onClick={() => handleGlobeNetworkSelect({ id: 'all', name: 'All networks', symbol: 'ALL' })}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">🌐</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">All networks</div>
                        </div>
                        <div className={`w-4 h-4 border-2 rounded-full ${selectedGlobeNetwork === 'all' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
                      </button>
                    </div>
                    
                    {/* Network Options */}
                    {filteredNetworks.map((network) => (
                      <div key={network.id} className="mx-4 mb-2">
                        <button
                          onClick={() => handleGlobeNetworkSelect(network)}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                        >
                          {getNetworkIcon(network)}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{network.name}</div>
                            <div className="text-xs text-gray-500">{network.symbol}</div>
                          </div>
                          <div className={`w-4 h-4 border-2 rounded-full ${selectedGlobeNetwork === network.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
                        </button>
                      </div>
                    ))}
                    
                    {filteredNetworks.length === 0 && networkSearchQuery && (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No networks found matching "{networkSearchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => onNavigate('accounts')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        
        {/* Balance Card - Embedded in theme color */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 rounded-xl p-4 text-white backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Total Balance</h2>
            <div className="relative dropdown-container" style={{ zIndex: 99999 }}>
              <button 
                onClick={() => {/* setShowNetworkDropdown(!showNetworkDropdown) */}}
                className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1 hover:bg-white/20 transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#180CB2] text-xs font-bold">Ξ</span>
              </div>
              <span className="text-sm font-medium">{currentNetwork?.symbol || 'ETH'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Network Dropdown */}
              {showNetworkDropdown && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }} onClick={() => setShowNetworkDropdown(false)}></div>
              )}
              
              {showNetworkDropdown && (
                <div 
                  className="absolute top-12 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px]"
                  style={{ zIndex: 99999 }}
                >
                  <div className="px-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-100">
                    Select Network
                  </div>
                  {networks.filter(network => network.isEnabled).map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleNetworkSelect(network)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{network.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{network.name}</div>
                        <div className="text-xs text-gray-500">{network.symbol}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-xl font-bold">
              {isBalanceVisible ? totalBalance : '••••'}
            </span>
            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              {isBalanceVisible ? <EyeOff className="w-2 h-2" /> : <Eye className="w-2 h-2" />}
            </button>
          </div>
          
          <div className="text-sm text-white/80 mb-3">
            {fiatBalance} ({balanceChange})
          </div>
          
          {/* UCPI ID */}
          <div className="bg-white/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-white/80 font-medium">UCPI ID</span>
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-white truncate max-w-[120px]">{ucpiId}</span>
                <button 
                  onClick={() => handleCopy(ucpiId)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Copy className="w-3 h-3 text-white/80" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Half - White Background with Border Radius */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 -mt-3 relative z-10">

        {/* Quick Actions Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            <button 
              onClick={() => onNavigate('send')}
              className="flex flex-col items-center space-y-2 p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <img src={sendIcon} alt="Send" className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Send</span>
            </button>
            
            <button 
              onClick={() => onNavigate('receive')}
              className="flex flex-col items-center space-y-2 p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <img src={receiveIcon} alt="Receive" className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Receive</span>
            </button>
            
            <button 
              onClick={() => onNavigate('swap')}
              className="flex flex-col items-center space-y-2 p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <img src={swapIcon} alt="Swap" className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Swap</span>
            </button>
            
            <button 
              onClick={() => onNavigate('buy-sell')}
              className="flex flex-col items-center space-y-2 p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center relative">
                <img src={sendAndReceiveIcon} alt="Buy/Sell" className="w-5 h-5 sm:w-6 sm:h-6" />
                
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Buy/Sell</span>
            </button>
          </div>
        </motion.div>

        {/* Assets Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Assets</h2>
            <button 
              onClick={() => onNavigate('accounts')}
              className="text-[#180CB2] text-sm font-medium hover:underline"
            >
              View all
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('crypto')}
              className={`flex-1 py-2 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'crypto'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => setActiveTab('nfts')}
              className={`flex-1 py-2 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'nfts'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              NFTs
            </button>
            <button
              onClick={() => setActiveTab('address-book')}
              className={`flex-1 py-2 px-3 sm:px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'address-book'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Address book
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-3 sm:px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
          
          {/* Assets List */}
          {activeTab === 'crypto' && (
            <div className="space-y-3">
              {cryptoAssets.map((asset, index) => (
                <motion.div
                  key={asset.symbol}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => onNavigate('wallet-details')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{asset.logo}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">{asset.symbol} {asset.name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{asset.price}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{asset.value}</div>
                    <div className={`text-xs sm:text-sm ${asset.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {asset.change}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {activeTab === 'nfts' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🖼️</span>
              </div>
              <p className="text-gray-600">No NFTs found</p>
              <button 
                onClick={() => onNavigate('nfts')}
                className="text-[#180CB2] text-sm font-medium hover:underline mt-2"
              >
                Browse NFTs
              </button>
            </div>
                      )}
          </motion.div>

          {/* Recent Transactions Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <button 
                onClick={() => onNavigate('transaction-history')}
                className="text-[#180CB2] text-sm font-medium hover:underline"
              >
                View all
              </button>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2]"></div>
              </div>
            ) : recentTxHistory.length > 0 ? (
              <div className="space-y-3">
                {recentTxHistory.slice(0, 3).map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => onNavigate('transaction-history')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <span className={`text-lg ${
                          tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.type === 'send' ? '↗️' : '↘️'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {tx.type === 'send' ? 'Sent' : 'Received'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {tx.isTokenTransaction ? `${tx.tokenSymbol || 'Token'}` : `${currentNetwork?.symbol || 'ETH'}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {tx.isTokenTransaction ? tx.tokenValue : `${parseFloat(tx.value).toFixed(6)}`}
                      </div>
                      <div className={`text-sm ${
                        tx.status === 'confirmed' ? 'text-green-600' : 
                        tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">No transactions yet</p>
                <button 
                  onClick={() => onNavigate('send')}
                  className="text-[#180CB2] text-sm font-medium hover:underline mt-2"
                >
                  Send your first transaction
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Create Account Modal */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentNetwork?.name || 'Ethereum'} Account
              </h3>
              <button
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setNewAccountName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account name
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Enter your account name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setNewAccountName('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showAccountDetails && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              <button
                onClick={() => setShowAccountDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <p className="text-gray-900">{selectedAccount.name || `Account ${selectedAccount.id}`}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono text-sm">{selectedAccount.address}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAccount.address);
                      toast.success('Address copied to clipboard');
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                <p className="text-gray-900 capitalize">{selectedAccount.network}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Derivation Path</label>
                <p className="text-gray-900 font-mono text-sm">{selectedAccount.derivationPath || 'Unknown'}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAccountDetails(false);
                    setShowSecretPhraseModal(true);
                  }}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>View Secret Recovery Phrase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secret Recovery Phrase Modal */}
      {showSecretPhraseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">View Secret Recovery Phrase</h3>
              <button
                onClick={() => {
                  setShowSecretPhraseModal(false);
                  setSecretPhrasePassword('');
                  setShowSecretPhrase(false);
                  setDecryptedSeedPhrase('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {!showSecretPhrase ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={secretPhrasePassword}
                    onChange={(e) => setSecretPhrasePassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-orange-800">
                      Do NOT share your Secret Recovery Phrase. Anyone that has the Secret Recovery Phrase can steal all your funds.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleViewSecretPhrase}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Verify
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Your Secret Recovery Phrase</h4>
                  <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
                    {decryptedSeedPhrase?.split(' ').map((word: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 w-6">{index + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-orange-800">
                      Do NOT share your Secret Recovery Phrase. Anyone that has the Secret Recovery Phrase can steal all your funds.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowSecretPhraseModal(false);
                    setShowSecretPhrase(false);
                    setSecretPhrasePassword('');
                    setDecryptedSeedPhrase('');
                  }}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </motion.div>
    );
  };

export default DashboardScreen; 