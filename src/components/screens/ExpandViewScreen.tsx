import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Eye, 
  EyeOff, 
  Globe, 
  Search, 
  Menu, 
  Send, 
  Grid3X3, 
  ArrowLeftRight, 
  DollarSign,
  Settings,
  RefreshCw,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useTransaction } from '../../store/TransactionContext';
import web3Utils from '../../utils/web3-utils'; // Changed to default import
import toast from 'react-hot-toast';
import type { ScreenProps, Transaction } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const ExpandViewScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork } = useWallet();
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
  const [ucpiId, setUcpiId] = useState('');
  const [recentTxHistory, setRecentTxHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch real account data and portfolio
  useEffect(() => {
    const fetchData = async () => {
      if (wallet) {
        try {
          // Get UCPI ID from storage
          const result = await storage.get(['ucpiId', 'ucpiSkipped']);
          if (result.ucpiSkipped) {
            setUcpiId(result.ucpiId || '');
          } else {
            setUcpiId(result.ucpiId || '');
          }
          
          // Update portfolio with real data
          await updatePortfolio();
          
          setIsLoading(false);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching data:', error);
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [wallet, updatePortfolio]);

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

  // Get network icon
  const getNetworkIcon = (network: string): string => {
    const networkIcons: Record<string, string> = {
      ethereum: '🔷',
      bsc: '🟡',
      polygon: '🟣',
      avalanche: '🔴',
      arbitrum: '🔵',
      optimism: '🟠',
      bitcoin: '🟠',
      solana: '🟢',
      tron: '🔴',
      litecoin: '⚪',
      ton: '🔵',
      xrp: '🟡'
    };
    return networkIcons[network] || '🔷';
  };

  // Load recent transaction history
  useEffect(() => {
    const loadTransactionHistory = async () => {
      if (!wallet?.address || !currentNetwork?.id) return;
      
      setIsLoadingHistory(true);
      try {
        // Load recent transactions from blockchain
        const [regularTxs, tokenTxs] = await Promise.all([
          web3Utils.getTransactionHistory(wallet.address, currentNetwork.id, 1, 5).catch(() => []),
          web3Utils.getTokenTransactions(wallet.address, currentNetwork.id).catch(() => [])
        ]);
        
        // Combine and format transactions
        const allTransactions = [...regularTxs, ...tokenTxs].map((tx: any) => ({
          id: tx.hash || tx.transactionHash,
          hash: tx.hash || tx.transactionHash,
          from: tx.from,
          to: tx.to,
          value: tx.value ? (parseInt(tx.value, 10) / 1e18).toString() : '0',
          amount: tx.value ? (parseInt(tx.value, 10) / 1e18).toString() : '0',
          network: currentNetwork.id,
          status: (tx.confirmations > 0 ? 'confirmed' : 'pending') as 'confirmed' | 'pending' | 'failed',
          timestamp: parseInt(tx.timeStamp || tx.timestamp, 10) * 1000,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice, 10) / 1e9).toString() : '0',
          blockNumber: tx.blockNumber,
          confirmations: tx.confirmations || 0,
          isTokenTransaction: !!tx.tokenName,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenValue: tx.tokenValue,
          type: (tx.from === wallet.address ? 'send' : 'receive') as 'send' | 'receive'
        }));
        
        setRecentTxHistory(allTransactions.slice(0, 5));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading transaction history:', error);
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

  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
  };

  // Load UCPI ID from storage
  const loadUCPIId = async (): Promise<string | null> => {
    try {
      const result = await storage.get(['ucpiId']);
      return result.ucpiId || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load UCPI ID:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col bg-gray-50 dashboard-typography"
      >
        <div className="bg-[#180CB2] text-white px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading wallet data...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50 dashboard-typography"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => onNavigate('options')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Account Selector */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">👤</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{selectedAccount?.name || 'Account 1'}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => updatePortfolio()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Refresh portfolio"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Globe className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Address */}
        <div className="mt-3 flex items-center space-x-2">
          <span className="text-sm text-white/80">
            {selectedAccount?.address ? 
              `${selectedAccount.address.substring(0, 6)}...${selectedAccount.address.substring(selectedAccount.address.length - 4)}` : 
              'No account selected'
            }
          </span>
          <button 
            onClick={() => handleCopy(selectedAccount?.address || '')}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content - White with rounded top corners (bottomsheet-like) */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {/* Total Balance Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-[#180CB2] rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Total Balance</h2>
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#180CB2] text-xs font-bold">Ξ</span>
              </div>
              <span className="text-sm font-medium">{currentNetwork?.symbol || 'ETH'}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-4xl font-bold">
              {isBalanceVisible ? totalBalance : '••••'}
            </span>
            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              {isBalanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="text-sm text-white/80 mb-4">
            {fiatBalance} ({balanceChange})
          </div>
          
          {/* UCPI ID */}
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 font-medium">UCPI ID</span>
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{ucpiId}</span>
                <button 
                  onClick={() => handleCopy(ucpiId)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-4 gap-4">
            <button 
              onClick={() => onNavigate('send')}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Send</span>
            </button>
            
            <button 
              onClick={() => onNavigate('receive')}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Receive</span>
            </button>
            
            <button 
              onClick={() => onNavigate('swap')}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Swap</span>
            </button>
            
            <button 
              onClick={() => onNavigate('buy-sell')}
              className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Buy/Sell</span>
            </button>
          </div>
        </motion.div>

        {/* Assets Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
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
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'crypto'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => setActiveTab('nfts')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'nfts'
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              NFTs
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
                    <div>
                      <div className="font-medium text-gray-900">{asset.symbol} {asset.name}</div>
                      <div className="text-sm text-gray-600">{asset.price}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{asset.value}</div>
                    <div className={`text-sm ${asset.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
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
                <Grid3X3 className="w-8 h-8 text-gray-400" />
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
    </motion.div>
  );
};

export default ExpandViewScreen;

