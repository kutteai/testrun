import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  User,
  Edit,
  Shield,
  Key,
  Grid3X3,
  ChevronRight,
  Copy,
  X
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import type { ScreenProps } from '../../types/index';

const AccountDetailsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getCurrentAccount, getWalletAccounts } = useWallet();
  const { portfolioValue } = usePortfolio();
  const [accountName, setAccountName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real account data
  useEffect(() => {
    const loadAccountData = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get current account
        const current = await getCurrentAccount();
        setCurrentAccount(current);
        
        // Get all accounts for dropdown
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        
        // Set account name
        if (current) {
          setAccountName(current.name || `Account ${current.id || '1'}`);
        }
      } catch (error) {
        console.error('Failed to load account data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [wallet, getCurrentAccount, getWalletAccounts]);

  // Listen for wallet changes to refresh account data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in AccountDetailsScreen:', event.detail);
      try {
        const current = await getCurrentAccount();
        setCurrentAccount(current);
        
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        
        if (current) {
          setAccountName(current.name || `Account ${current.id || '1'}`);
        }
      } catch (error) {
        console.error('Failed to refresh account data after wallet change:', error);
      }
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, [getCurrentAccount, getWalletAccounts]);

  const handleCopyAddress = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
    } else {
    }
  };

  const getAccountBalance = () => {
    if (!portfolioValue?.assets || !currentAccount?.address) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Find assets for this account's network
    const accountAssets = portfolioValue.assets.filter(asset => 
      asset.network?.toLowerCase() === currentAccount.network?.toLowerCase()
    );
    
    if (accountAssets.length === 0) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Calculate total balance
    const totalBalance = accountAssets.reduce((sum, asset) => {
      return sum + parseFloat(asset.balance || '0');
    }, 0);
    
    const totalUsdValue = accountAssets.reduce((sum, asset) => {
      return sum + (asset.usdValue || 0);
    }, 0);
    
    return { 
      balance: totalBalance.toFixed(6), 
      usdValue: totalUsdValue 
    };
  };

  const handleUpdateAccountName = () => {
    if (accountName.trim()) {
      setShowChangeNameModal(false);
      setIsEditingName(false);
    }
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
      
      {/* Account Details Panel */}
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
              Account details
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-gray-500">Loading account details...</div>
          </div>
        ) : !currentAccount ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-gray-500">No account selected</div>
          </div>
        ) : (
          <>
            {/* Select Account Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <p className="text-[13px] text-gray-500 mb-2">Select account</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[13px]">{currentAccount.avatar || '👤'}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-[13px]">{currentAccount.name || `Account ${currentAccount.id || '1'}`}</div>
                    <div className="text-[13px] text-gray-600">
                      {currentAccount.address ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}` : 'No address'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </div>
            </motion.div>

            {/* Account Name Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Account name</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 text-[13px]">{accountName}</span>
                  <button
                    onClick={() => setShowChangeNameModal(true)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Account Creation Details Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center space-x-3 mb-3">
                <Key className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 text-[13px]">Account Creation Details</span>
              </div>
              
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account ID:</span>
                  <span className="text-gray-700 font-mono">{currentAccount.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Derivation Path:</span>
                  <span className="text-gray-700 font-mono">{currentAccount.derivationPath || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-700">
                    {currentAccount.createdAt ? new Date(currentAccount.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Index:</span>
                  <span className="text-gray-700">
                    {currentAccount.derivationPath ? 
                      currentAccount.derivationPath.split('/').pop() : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Address:</span>
                  <span className="text-gray-700 font-mono">
                    {currentAccount.address ? 
                      `${currentAccount.address.slice(0, 8)}...${currentAccount.address.slice(-6)}` : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Networks:</span>
                  <span className="text-gray-700">
                    {currentAccount.networks ? currentAccount.networks.join(', ') : 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Address Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Address</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 text-[13px]">
                    {currentAccount.address ? `${currentAccount.address.substring(0, 8)}...${currentAccount.address.substring(currentAccount.address.length - 5)}` : 'No address'}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </motion.div>

            {/* Wallet Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Key className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Wallet</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 text-[13px]">{wallet?.name || 'Unknown Wallet'}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </motion.div>

            {/* Secret Recovery Phrase Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <button
                onClick={() => onNavigate('recovery-phrase')}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-3">
                  <Grid3X3 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Secret recovery phrase</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </motion.div>

            {/* Private Key Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <button
                onClick={() => onNavigate('import-private-key')}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-3">
                  <Grid3X3 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Private key</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </motion.div>
          </>
        )}
        </div>

        {/* Change Account Name Modal */}
        {showChangeNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-60"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-80 mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change account name</h3>
                <button
                  onClick={() => setShowChangeNameModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowChangeNameModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAccountName}
                  disabled={!accountName.trim()}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    accountName.trim()
                      ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AccountDetailsScreen;
