import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Copy, Check, User, Shield } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AccountsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, switchAccount, addAccount, removeAccount, getCurrentAccount, getWalletAccounts } = useWallet();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [wallet]);

  const loadAccounts = async () => {
    try {
      const walletAccounts = await getWalletAccounts();
      const current = await getCurrentAccount();
      setAccounts(walletAccounts);
      setCurrentAccount(current);
    } catch (error) {
      console.error('Failed to load accounts:', error);
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
    if (!isWalletUnlocked && !password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    try {
      await addAccount(password);
      setPassword('');
      setIsAddingAccount(false);
      await loadAccounts(); // Reload accounts
    } catch (error) {
      toast.error('Failed to add account');
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
        {/* Current Account */}
        {currentAccount && (
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
        )}

        {/* Accounts List */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">All Accounts ({accounts.length})</h2>
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 bg-white/10 backdrop-blur-xl rounded-xl border-2 transition-all ${
                  currentAccount?.id === account.id
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-white/20 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      currentAccount?.id === account.id ? 'bg-green-500/20' : 'bg-white/10'
                    }`}>
                      <User className={`w-5 h-5 ${currentAccount?.id === account.id ? 'text-green-400' : 'text-white'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Account {index + 1}</h3>
                      <p className="text-slate-400 text-sm">{formatAddress(account.address)}</p>
                      <p className="text-slate-500 text-xs">Balance: {formatBalance(account.balance || '0')} {wallet?.currentNetwork || 'ETH'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentAccount?.id === account.id && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-400">Active</span>
                      </div>
                    )}
                    <button
                      onClick={() => copyAddress(account.address)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      {copied === account.address ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {currentAccount?.id !== account.id && (
                      <>
                        <button
                          onClick={() => handleSwitchAccount(account.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Switch
                        </button>
                        {accounts.length > 1 && (
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
              {isWalletUnlocked ? 'Enter your wallet password to add a new account.' : 'Enter your wallet password to derive a new account from your seed phrase.'}
              </p>
              
              <div className="space-y-4">
                {!isWalletUnlocked && ( <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Wallet Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your wallet password"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>)}
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
