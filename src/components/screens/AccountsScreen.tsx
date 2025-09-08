import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { ChevronLeft, Search, Plus, MoreVertical, Eye, EyeOff, Pin, User, Key } from 'lucide-react';
import { navigateWithHistory, goBackWithHistory, shouldShowBackButton, getDefaultBackTarget } from '../../utils/navigation-utils';

interface ScreenProps {
  onNavigate: (screen: string) => void;
}

const AccountsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getWalletAccounts, getCurrentAccount, addAccount, getPassword, switchAccount } = useWallet();
  const { currentNetwork } = useNetwork();
  const { portfolioValue } = usePortfolio();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showSecretPhraseModal, setShowSecretPhraseModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [secretPhrasePassword, setSecretPhrasePassword] = useState('');
  const [showSecretPhrase, setShowSecretPhrase] = useState(false);
  const [decryptedSeedPhrase, setDecryptedSeedPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuAccount, setContextMenuAccount] = useState<any>(null);

  // Load accounts on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('🔄 Loading accounts for wallet:', wallet.id);
        const walletAccounts = await getWalletAccounts();
        console.log('✅ Loaded accounts:', walletAccounts);
        setAccounts(walletAccounts);
        
        // Set current account
        const currentAccount = await getCurrentAccount();
        setSelectedAccount(currentAccount);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [wallet, getWalletAccounts, getCurrentAccount]);

  // Listen for wallet changes to update selected account
  useEffect(() => {
    const handleWalletChanged = async () => {
      if (wallet) {
        try {
          const currentAccount = await getCurrentAccount();
          setSelectedAccount(currentAccount);
          console.log('🔄 Updated selected account from wallet change:', currentAccount?.id);
        } catch (error) {
          console.error('Failed to update selected account:', error);
        }
      }
    };

    // Listen for custom wallet change events
    if (typeof window !== 'undefined') {
      window.addEventListener('walletChanged', handleWalletChanged);
      window.addEventListener('accountSwitched', handleWalletChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('walletChanged', handleWalletChanged);
        window.removeEventListener('accountSwitched', handleWalletChanged);
      }
    };
  }, [wallet, getCurrentAccount]);

  // Listen for wallet changes to refresh accounts
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in AccountsScreen:', event.detail);
      try {
        const walletAccounts = await getWalletAccounts();
        console.log('✅ Refreshed accounts after wallet change:', walletAccounts);
        setAccounts(walletAccounts);
        
        const currentAccount = await getCurrentAccount();
        setSelectedAccount(currentAccount);
      } catch (error) {
        console.error('Failed to refresh accounts after wallet change:', error);
      }
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, [getWalletAccounts, getCurrentAccount]);

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.name?.toLowerCase().includes(query) ||
      account.address?.toLowerCase().includes(query) ||
      account.network?.toLowerCase().includes(query)
    );
  });


  const handlePinToTop = async (account: any) => {
    try {
      const updatedAccounts = [...accounts];
      const accountIndex = updatedAccounts.findIndex(acc => acc.id === account.id);
      if (accountIndex > 0) {
        const [pinnedAccount] = updatedAccounts.splice(accountIndex, 1);
        updatedAccounts.unshift(pinnedAccount);
        setAccounts(updatedAccounts);
      } else {
      }
    } catch (error) {
      console.error('Failed to pin account:', error);
    }
  };

  const handleHideAccount = async (account: any) => {
    try {
      const updatedAccounts = accounts.filter(acc => acc.id !== account.id);
      setAccounts(updatedAccounts);
      
      if (selectedAccount?.id === account.id) {
        if (updatedAccounts.length > 0) {
          setSelectedAccount(updatedAccounts[0]);
        } else {
          setSelectedAccount(null);
        }
      }
      
    } catch (error) {
      console.error('Failed to hide account:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      return;
    }
    
    try {
      // Check if wallet exists
      if (!wallet) {
        return;
      }
      
      const password = await getPassword();
      if (!password) {
        return;
      }
      
      console.log('🔄 Creating new account with name:', newAccountName);
      await addAccount(password, newAccountName.trim());
      
      // Wait a moment for the account to be properly created and saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh accounts list
      console.log('🔄 Refreshing accounts list...');
      const updatedAccounts = await getWalletAccounts();
      console.log('✅ Updated accounts:', updatedAccounts);
      setAccounts(updatedAccounts);
      
      if (updatedAccounts.length > 0) {
        const newAccount = updatedAccounts[updatedAccounts.length - 1];
        if (newAccount && newAccount.address) {
          setSelectedAccount(newAccount);
          console.log('✅ New account selected:', newAccount);
        }
      }
      
      setShowCreateAccountModal(false);
      setNewAccountName('');
    } catch (error) {
      console.error('Failed to create new account:', error);
    }
  };

  const handleViewSecretPhrase = async () => {
    if (!secretPhrasePassword.trim()) {
      return;
    }
    
    try {
      // Check if wallet exists
      if (!wallet) {
        return;
      }
      
      if (!wallet.encryptedSeedPhrase) {
        return;
      }
      
      // Use the correct decryption method from crypto-utils
      const { decryptData } = await import('../../utils/crypto-utils');
      const decryptedSeedPhrase = await decryptData(wallet.encryptedSeedPhrase, secretPhrasePassword);
      
      if (!decryptedSeedPhrase) {
        throw new Error('Invalid password');
      }
      
      setDecryptedSeedPhrase(decryptedSeedPhrase);
      setShowSecretPhrase(true);
      setSecretPhrasePassword('');
    } catch (error) {
      console.error('Invalid password:', error);
      // Show error to user with better UX
      setSecretPhrasePassword('');
      alert('Invalid password. Please try again.');
    }
  };

  const getAccountAvatar = (account: any) => {
    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
    const colorIndex = (account?.id || 0) % colors.length;
    return colors[colorIndex];
  };

  const getAccountBalance = (account: any) => {
    if (!portfolioValue?.assets || !account?.address) {
      return '$0.00';
    }
    
    // Find assets for this account's address
    const accountAssets = portfolioValue.assets.filter(asset => 
      asset.network?.toLowerCase() === account.network?.toLowerCase()
    );
    
    if (accountAssets.length === 0) {
      return '$0.00';
    }
    
    // Calculate total balance using usdValue
    const totalBalance = accountAssets.reduce((sum, asset) => {
      return sum + (asset.usdValue || 0);
    }, 0);
    
    return `$${totalBalance.toFixed(2)}`;
  };

  // Get the address for the current network
  const getAccountAddress = (account: any) => {
    if (!account) return null;
    
    // If account has addresses object (new format), get address for current network
    if (account.addresses && currentNetwork) {
      return account.addresses[currentNetwork.id] || account.addresses[currentNetwork.name] || account.addresses.ethereum;
    }
    
    // Fallback to single address (old format)
    return account.address;
  };

  // Get the network name for display
  const getAccountNetwork = (account: any) => {
    if (!account) return 'Unknown';
    
    // If account has networks array, use the first one or current network
    if (account.networks && account.networks.length > 0) {
      return account.networks[0];
    }
    
    // Fallback to account.network or current network
    return account.network || (currentNetwork ? currentNetwork.name : 'Unknown');
  };

  // Handle account selection and switching
  const handleAccountSelect = async (account: any) => {
    try {
      console.log('🔄 Switching to account:', account.id);
      
      // Switch to the selected account using the wallet context
      await switchAccount(account.id);
      
      // Update local state
      setSelectedAccount(account);
      
      console.log('✅ Account switched successfully:', account.id);
    } catch (error) {
      console.error('❌ Failed to switch account:', error);
      // You could add a toast notification here for error feedback
    }
  };

  // Handle context menu for account options
  const handleContextMenu = (account: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setContextMenuAccount(account);
    setShowContextMenu(true);
  };

  // Handle view secret phrase from context menu
  const handleViewSecretPhraseFromMenu = () => {
    setShowContextMenu(false);
    setShowSecretPhraseModal(true);
  };

  // Handle account details from context menu
  const handleAccountDetailsFromMenu = () => {
    setShowContextMenu(false);
    setShowAccountDetails(true);
  };

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  // If no wallet, show error message
  if (!wallet) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wallet Found</h3>
          <p className="text-gray-600 mb-4">Please create or import a wallet first to manage accounts.</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goBackWithHistory(onNavigate)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Accounts</h1>
          <div className="w-10"></div>
        </div>
      </div>

        {/* Search Bar */}
      <div className="px-4 py-4">
          <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search accounts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
      </div>

      {/* Wallet Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {wallet?.name || `Wallet ${wallet?.id || '1'}`}
          </h2>
                <button
                  onClick={() => onNavigate('account-details')}
                  className="text-[#180CB2] text-sm font-medium hover:underline"
                >
                  Details
                </button>
              </div>

        {/* Accounts List */}
              <div className="space-y-3">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account, index) => (
              <div
                    key={account.id}
                className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
                  selectedAccount?.id === account.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                onClick={() => handleAccountSelect(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${getAccountAvatar(account)} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-lg">👤</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 text-[13px]">
                          {account?.name || `Account ${account?.id || 'Unknown'}`}
                        </h3>
                        {selectedAccount?.id === account.id && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-medium rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 font-mono">
                        {(() => {
                          const address = getAccountAddress(account);
                          return address ? 
                            `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
                            'No address';
                        })()}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {getAccountNetwork(account)} • {account?.derivationPath || 'Unknown path'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-[13px]">{getAccountBalance(account)}</p>
                      <div className="flex space-x-1 mt-1">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">T</span>
                        </div>
                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">B</span>
                        </div>
                        <div className="w-4 h-4 bg-[#180CB2] rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">E</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => handleContextMenu(account, e)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No accounts found</p>
              <button
                onClick={() => setShowCreateAccountModal(true)}
                className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
              >
                Create your first account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigateWithHistory('add-account', onNavigate)}
          className="w-full py-4 bg-[#180CB2] text-white rounded-xl font-semibold hover:bg-[#140a8f] transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add account or wallet</span>
        </button>
      </div>

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
                <p className="text-gray-900">{selectedAccount?.name || `Account ${selectedAccount?.id || 'Unknown'}`}</p>
                      </div>
                      
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address ({currentNetwork?.name || 'Current Network'})</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono text-sm">{getAccountAddress(selectedAccount) || 'No address'}</p>
                  {getAccountAddress(selectedAccount) && (
                    <button
                      onClick={() => {
                        const address = getAccountAddress(selectedAccount);
                        if (address) {
                          navigator.clipboard.writeText(address);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                          </div>
                        </div>
                        
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                <p className="text-gray-900 capitalize">{getAccountNetwork(selectedAccount)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Derivation Path</label>
                <p className="text-gray-900 font-mono text-sm">{selectedAccount.derivationPath || 'Unknown'}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-2">
                          <button
                  onClick={() => {
                    setShowAccountDetails(false);
                    onNavigate('account-details');
                  }}
                  className="w-full px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors flex items-center justify-center space-x-2 mb-2"
                >
                  <User className="w-4 h-4" />
                  <span>View Account Details</span>
                          </button>
                          
                          <button
                  onClick={() => {
                    setShowAccountDetails(false);
                    setShowSecretPhraseModal(true);
                  }}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Key className="w-4 h-4" />
                  <span>View Secret Recovery Phrase</span>
                          </button>
                          
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handlePinToTop(selectedAccount);
                      setShowAccountDetails(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                  >
                                  <Pin className="w-4 h-4" />
                                  <span>Pin to top</span>
                                </button>
                  
                  <button
                    onClick={() => {
                      handleHideAccount(selectedAccount);
                      setShowAccountDetails(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                                  <EyeOff className="w-4 h-4" />
                                  <span>Hide account</span>
                                </button>
                              </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                className="flex-1 px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
              >
                Add account
              </button>
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

      {/* Context Menu */}
      {showContextMenu && contextMenuAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Options</h3>
              <button
                onClick={() => setShowContextMenu(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleAccountDetailsFromMenu}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Account Details</span>
              </button>
              
              <button
                onClick={handleViewSecretPhraseFromMenu}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Key className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">View Secret Phrase</span>
              </button>
              
              <button
                onClick={() => handlePinToTop(contextMenuAccount)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pin className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Pin to Top</span>
              </button>
              
              <button
                onClick={() => {
                  setShowContextMenu(false);
                  handleHideAccount(contextMenuAccount);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
              >
                <EyeOff className="w-5 h-5" />
                <span>Hide Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default AccountsScreen;