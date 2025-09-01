import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Copy, Check, User, Shield } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AccountsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  console.log('🔄 AccountsScreen: Component initializing...');
  
  const walletContext = useWallet();
  console.log('🔍 AccountsScreen: Wallet context loaded - hasWallet:', !!walletContext.wallet);
  
  const { wallet, switchAccount, addAccount, removeAccount, getCurrentAccount, getWalletAccounts, isWalletUnlocked, globalPassword, clearError } = walletContext;
  


  // Clear any global errors when AccountsScreen loads
  useEffect(() => {
    clearError();
    console.log('🧹 AccountsScreen: Cleared global error state');
  }, [clearError]);



  



  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [password, setPassword] = useState(''); 
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);



  

  useEffect(() => {
    console.log('🔄 AccountsScreen: useEffect triggered with wallet:', wallet ? {
      id: wallet.id,
      address: wallet.address,
      hasAccounts: !!wallet.accounts
    } : 'null');
    
    if (wallet) {
      console.log('🔄 Loading accounts for wallet...');
      loadAccounts();
    } else {
      console.log('⚠️ AccountsScreen: No wallet available, skipping account load');
      setAccounts([]);
      setCurrentAccount(null);
    }
  }, [wallet]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 AccountsScreen: Loading accounts...');
      toast.loading('Loading accounts...', { id: 'loading-accounts' });
      
      console.log('🔍 AccountsScreen: About to call getWalletAccounts...');
      let walletAccounts;
      try {
        walletAccounts = await getWalletAccounts();
        console.log('✅ AccountsScreen: Got wallet accounts:', walletAccounts?.length || 0);
        console.log('🔍 AccountsScreen: Raw wallet accounts data:', walletAccounts);
        
        // Debug logging (console only)
        console.log('🔍 Wallet Accounts Count:', walletAccounts?.length || 0);
        if (walletAccounts && walletAccounts.length > 0) {
          console.log('🔍 First Account Data:', walletAccounts[0]);
        }
      } catch (walletAccountsError) {
        console.error('❌ AccountsScreen: getWalletAccounts failed:', walletAccountsError);
        toast.error(`❌ getWalletAccounts failed: ${walletAccountsError.message}`, { duration: 60000 });
        throw new Error(`getWalletAccounts failed: ${walletAccountsError.message}`);
      }
      
      console.log('🔍 AccountsScreen: About to call getCurrentAccount...');
      let current;
      try {
        current = await getCurrentAccount();
        console.log('✅ AccountsScreen: Got current account:', current ? current.address : 'null');
        console.log('🔍 AccountsScreen: Raw current account data:', current);
        
        // Debug logging (console only)
        console.log('🔍 Current Account:', current ? current.address || 'No Address' : 'null');
        if (current) {
          console.log('🔍 Current Account Data:', current);
        }
      } catch (currentAccountError) {
        console.error('❌ AccountsScreen: getCurrentAccount failed:', currentAccountError);
        toast.error(`❌ getCurrentAccount failed: ${currentAccountError.message}`, { duration: 60000 });
        throw new Error(`getCurrentAccount failed: ${currentAccountError.message}`);
      }
      
      // Ensure current account is in the accounts list
      let allAccounts = walletAccounts || [];
      if (current && !allAccounts.find(acc => acc.id === current.id)) {
        console.log('🔄 AccountsScreen: Adding current account to accounts list');
        allAccounts = [current, ...allAccounts];
      }
      
      console.log('✅ AccountsScreen: Final accounts list:', allAccounts.length);
      console.log('📊 AccountsScreen: Account details:', allAccounts.map(acc => ({
        id: acc.id,
        address: acc.address,
        isCurrent: acc.id === current?.id,
        fullAccount: acc // Log the full account object to see what's missing
      })));
      
      // Additional debugging for the address issue
      console.log('🔍 AccountsScreen: Detailed account analysis:');
      allAccounts.forEach((acc, idx) => {
        console.log(`Account ${idx}:`, {
          hasId: !!acc.id,
          hasAddress: !!acc.address,
          addressValue: acc.address,
          addressType: typeof acc.address,
          keys: Object.keys(acc || {}),
          fullObject: acc
        });
      });
      
      // Debug logging (console only)
      console.log('🔍 Final Accounts Count:', allAccounts.length);
      if (allAccounts.length > 0) {
        allAccounts.forEach((acc, idx) => {
          console.log(`🔍 Account ${idx}:`, {
            id: acc?.id || 'No ID',
            address: acc?.address || 'No Address',
            keys: Object.keys(acc || {})
          });
        });
      }
      
      setAccounts(allAccounts);
      setCurrentAccount(current);
      
      console.log('✅ AccountsScreen: State updated successfully');
      toast.success(`Loaded ${allAccounts.length} accounts successfully`, { id: 'loading-accounts', duration: 3000 });
    } catch (error) {
      console.error('❌ AccountsScreen: Failed to load accounts:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load accounts: ${errorMessage}`);
      
      // Show detailed error toast
      toast.error(`❌ Accounts Error: ${errorMessage}`, { 
        id: 'loading-accounts',
        duration: 3000 
      });
      
      // Debug info logged to console instead of toast
      console.log('Debug: Wallet=', !!wallet, 'Unlocked=', isWalletUnlocked, 'Functions=', !!getWalletAccounts && !!getCurrentAccount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    try {
      await switchAccount(accountId);
      await loadAccounts(); // Reload to get updated current account
    } catch (error) {
      toast.error('Failed to switch account');
    }
  };

  const handleAddAccount = async () => {
    // Debug logging
    console.log('🔍 handleAddAccount: Starting...', {
      isWalletUnlocked,
      hasGlobalPassword: !!globalPassword,
      globalPasswordLength: globalPassword?.length || 0,
      globalPasswordValue: globalPassword ? 'HIDDEN' : 'NULL',
      passwordLength: password.length,
      walletId: wallet?.id
    });
    
    // Use global password if wallet is unlocked and available, otherwise use password input
    const passwordToUse = (isWalletUnlocked && globalPassword) ? globalPassword : password.trim();
    
    if (!isWalletUnlocked && !password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    
    if (isWalletUnlocked && !globalPassword) {
      console.error('❌ Global password missing despite wallet being unlocked');
      console.error('❌ Debug state:', {
        isWalletUnlocked,
        globalPassword,
        globalPasswordType: typeof globalPassword,
        globalPasswordLength: globalPassword?.length
      });
      console.log('🔧 Falling back to password input since globalPassword is missing');
      // Fall back to using the password input instead of showing error
      if (!password.trim()) {
        toast.error('Please enter your password to add a new account');
      return;
      }
      // Use the entered password instead of globalPassword
    }

    console.log('🔍 About to call addAccount with password length:', passwordToUse?.length || 0);

    try {
      await addAccount(passwordToUse);
      setPassword('');
      setIsAddingAccount(false);
      await loadAccounts(); // Reload accounts
      toast.success('New account added successfully');
    } catch (error) {
      console.error('❌ Add account error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add account';
      toast.error(`Add Account Failed: ${errorMessage}`, { duration: 5000 });
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (accounts.length <= 1) {
      toast.error('Cannot remove the last account');
      return;
    }

    if (confirm('Are you sure you want to remove this account? This action cannot be undone.')) {
      try {
        await removeAccount(accountId);
        await loadAccounts(); // Reload accounts
      } catch (error) {
        toast.error('Failed to remove account');
      }
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(4);
  };

  // Safety check - if wallet context functions are not available, show error but don't prevent loading
  if (!getWalletAccounts || !getCurrentAccount) {
    console.error('❌ AccountsScreen: Wallet context functions not available');
    const errorMsg = 'Wallet context functions not available. This is a critical error.';
    setError(errorMsg);
    toast.error(`❌ Critical Error: ${errorMsg}`, { duration: 3000 });
  }


  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
       {/* Header */}
       <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Accounts</h1>
              <p className="text-slate-400 text-sm">Manage your wallet accounts</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingAccount(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Error Display */} 
         {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/50 border border-red-500/50 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-300 mb-2">Error Loading Accounts</h4>
                <p className="text-red-200 text-sm mb-3">{error}</p>
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-xs text-red-300 font-mono break-all">
                    Debug Info:
                  </p>
                  <p className="text-xs text-red-400 font-mono break-all">
                    Wallet: {wallet ? 'Available' : 'Not Available'}
                  </p>
                  <p className="text-xs text-red-400 font-mono break-all">
                    Wallet Unlocked: {isWalletUnlocked ? 'Yes' : 'No'}
                  </p>
                  <p className="text-xs text-red-400 font-mono break-all">
                    getWalletAccounts: {getWalletAccounts ? 'Available' : 'Not Available'}
                  </p>
                  <p className="text-xs text-red-400 font-mono break-all">
                    getCurrentAccount: {getCurrentAccount ? 'Available' : 'Not Available'}
                  </p>
                  <p className="text-xs text-red-400 font-mono break-all">
                    Current Network: {wallet?.currentNetwork || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    loadAccounts();
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {/* Loading State */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-900/50 border border-blue-500/50 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h4 className="font-semibold text-blue-300">Loading Accounts...</h4>
                <p className="text-blue-200 text-sm">Please wait while we fetch your accounts</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Current Account */}
        {/* {currentAccount && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Current Account</h3>
                  <p className="text-slate-400 text-sm">{formatAddress(currentAccount.address)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-400">Active</span>
              </div>
            </div>
          </div>
        )} */}

        {/* Debug Info (always visible) */}
        <div className="bg-gray-900/50 border border-gray-500/50 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-gray-300 mb-2">Debug Information</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>Wallet Available: <span className={wallet ? 'text-green-400' : 'text-red-400'}>{wallet ? 'Yes' : 'No'}</span></div>
            <div>Wallet Unlocked: <span className={isWalletUnlocked ? 'text-green-400' : 'text-red-400'}>{isWalletUnlocked ? 'Yes' : 'No'}</span></div>
            <div>Accounts Count: <span className="text-blue-400">{accounts.length}</span></div>
            <div>Current Account: <span className={currentAccount ? 'text-green-400' : 'text-red-400'}>{currentAccount ? 'Set' : 'Not Set'}</span></div>
            <div>Network: <span className="text-purple-400">{wallet?.currentNetwork || 'Unknown'}</span></div>
            <div>Functions Available: <span className={getWalletAccounts && getCurrentAccount ? 'text-green-400' : 'text-red-400'}>{getWalletAccounts && getCurrentAccount ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        {/* Accounts List - Simplified Safe Version */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">All Accounts ({accounts.length})</h2>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No Accounts Found</h3>
              <p className="text-sm text-gray-500">Your accounts will appear here once detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account, index) => {
                // Safe account data extraction
                const accountId = account?.id || `account-${index}`;
                const accountAddress = account?.address || 'No address';
                const accountBalance = account?.balance || '0';
                const isCurrent = currentAccount?.id === accountId;
                
                return (
                  <div
                    key={accountId}
                    className={`p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 transition-all ${
                      isCurrent
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCurrent ? 'bg-green-500/20' : 'bg-white/10'
                        }`}>
                          <User className={`w-5 h-5 ${isCurrent ? 'text-green-400' : 'text-white'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Account {index + 1}</h3>
                          <p className="text-slate-400 text-sm">{formatAddress(accountAddress)}</p>
                          <p className="text-slate-500 text-xs">Balance: {formatBalance(accountBalance)} {wallet?.currentNetwork || 'ETH'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCurrent && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-400">Active</span>
                          </div>
                        )}
                        <button
                          onClick={() => copyAddress(accountAddress)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {copied === accountAddress ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        {!isCurrent && (
                          <>
                            <button
                              onClick={() => handleSwitchAccount(accountId)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Switch
                            </button>
                            {accounts.length > 1 && (
                              <button
                                onClick={() => handleRemoveAccount(accountId)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Account Modal */}
        {isAddingAccount && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Add New Account</h3>
              </div>
              
              <p className="text-slate-400 text-sm mb-4">
                {(isWalletUnlocked && globalPassword)
                  ? 'A new account will be derived from your seed phrase using the next available derivation path.' 
                  : 'Enter your wallet password to derive a new account from your seed phrase.'}
              </p>
              
              <div className="space-y-4">
                {(!isWalletUnlocked || !globalPassword) ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Wallet Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your wallet password"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddAccount();
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-blue-300">Wallet is unlocked - no password required</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsAddingAccount(false);
                    setPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddAccount}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Account
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

  export default AccountsScreen;
