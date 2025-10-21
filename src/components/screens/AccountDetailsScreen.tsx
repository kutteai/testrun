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
  X,
  Globe
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useNetwork } from '../../store/NetworkContext';
import type { ScreenProps } from '../../types/index';

const AccountDetailsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getCurrentAccount, getWalletAccounts, refreshWallet } = useWallet();
  const { portfolioValue } = usePortfolio();
  const { currentNetwork } = useNetwork();
  const [accountName, setAccountName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get the correct address for the current network
  const getAccountAddress = (account: any) => {
    if (!account) return null;
    if (account.addresses && currentNetwork) {
      return account.addresses[currentNetwork.id] || account.addresses[currentNetwork.name] || account.addresses.ethereum;
    }
    return account.address;
  };

  // Load real account data
  useEffect(() => {
    const loadAccountData = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const current = await getCurrentAccount();
        const accountsData = await getWalletAccounts();
        
        if (current) {
          setCurrentAccount(current);
          setAccountName(current.name || '');
        }
        setAccounts(accountsData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load account data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [wallet, getCurrentAccount, getWalletAccounts]);

  // Initialize newAccountName when modal opens
  useEffect(() => {
    if (showChangeNameModal && currentAccount) {
      setNewAccountName(currentAccount.name || '');
    }
  }, [showChangeNameModal, currentAccount]);

  const handleCopyAddress = () => {
    const address = getAccountAddress(currentAccount);
    if (address) {
      navigator.clipboard.writeText(address);
      // You could add a toast notification here if needed
    }
  };

  // Handle account name update
  const handleUpdateAccountName = async () => {
    if (!newAccountName.trim() || !currentAccount || !wallet) {
      // eslint-disable-next-line no-console
      console.log('❌ Missing required data:', { newAccountName: newAccountName.trim(), currentAccount: !!currentAccount, wallet: !!wallet });
      return;
    }

    // eslint-disable-next-line no-console
    console.log('🔄 Starting account name update:', {
      walletId: wallet.id,
      accountId: currentAccount.id,
      newName: newAccountName.trim(),
      currentName: currentAccount.name
    });

    try {
      // Import WalletManager to update the account name
      const { WalletManager } = await import('../../core/wallet-manager');
      const walletManager = new WalletManager();

      // Update the account name in the wallet
      await walletManager.updateAccountName(wallet.id, currentAccount.id, newAccountName.trim());

      // Refresh the wallet state in the context
      await refreshWallet();

      // Reload the current account data
      const updatedAccount = await getCurrentAccount();

      if (updatedAccount) {
        setCurrentAccount(updatedAccount);
        setAccountName(updatedAccount.name);

      }

      // Dispatch wallet changed event to update other screens
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('walletChanged', {
          detail: {
            wallet: wallet,
            account: updatedAccount,
            address: wallet.address,
            network: wallet.currentNetwork
          }
        });
        window.dispatchEvent(event);

      }

      // Close the modal
      setShowChangeNameModal(false);
      setIsEditingName(false);
      setNewAccountName('');

      // eslint-disable-next-line no-console
      console.log(`✅ Account name update completed: ${newAccountName.trim()}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to update account name:', error);
      // You could add a toast notification here for error feedback
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


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('accounts')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Account Details</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-gray-500">Loading account details...</div>
          </div>
        ) : !currentAccount ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-gray-500">No account selected</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Header */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#180CB2] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 text-[14px]">
                      {currentAccount.name || 'Account'}
                    </h2>
                    <p className="text-[12px] text-gray-500">
                      {getAccountAddress(currentAccount) ? 
                        `${getAccountAddress(currentAccount)?.substring(0, 8)}...${getAccountAddress(currentAccount)?.substring(getAccountAddress(currentAccount)?.length - 6)}` : 
                        'No address'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangeNameModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
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
                    {(() => {
                      const address = getAccountAddress(currentAccount);
                      return address ? 
                        `${address.slice(0, 8)}...${address.slice(-6)}` : 'N/A';
                    })()}
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
                  <span className="text-gray-700 text-[13px] font-mono">
                    {(() => {
                      const address = getAccountAddress(currentAccount);
                      return address ? 
                        `${address.substring(0, 10)}...${address.substring(address.length - 8)}` : 'No address';
                    })()}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Copy full address"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </motion.div>

            {/* Network Information Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Current Network</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 text-[13px]">
                    {currentNetwork?.name || 'Unknown Network'}
                  </span>
                  <span className="text-gray-500 text-[12px]">
                    ({currentNetwork?.id || 'unknown'})
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Balance Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.14 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Grid3X3 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900 text-[13px]">Balance</span>
                </div>
                <div className="text-right">
                  <div className="text-gray-700 text-[13px] font-semibold">
                    {getAccountBalance().balance}
                  </div>
                  <div className="text-gray-500 text-[12px]">
                    ${getAccountBalance().usdValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.16 }}
              className="space-y-3"
            >
              <button
                onClick={() => onNavigate('send')}
                className="w-full px-4 py-3 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors flex items-center justify-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Send Transaction</span>
              </button>
              
              <button
                onClick={() => onNavigate('receive')}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>Receive Funds</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Change Name Modal */}
        {showChangeNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-80 mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Account Name</h3>
                <button
                  onClick={() => {
                    setShowChangeNameModal(false);
                    setNewAccountName('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#180CB2] focus:border-transparent"
                    placeholder="Enter account name"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowChangeNameModal(false);
                      setNewAccountName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAccountName}
                    className="flex-1 px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AccountDetailsScreen;
