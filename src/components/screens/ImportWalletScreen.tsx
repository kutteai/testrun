import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  ChevronRight,
  Grid3X3,
  Shield,
  Usb,
  Globe,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const ImportWalletScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const [showNameModal, setShowNameModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('');
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);
  
  const { wallet } = useWallet();

  // Load existing accounts from storage
  const loadExistingAccounts = async (): Promise<void> => {
    try {
      const existingAccounts = await storage.get(['accounts']);
      if (existingAccounts.accounts) {
        setExistingAccounts(existingAccounts.accounts);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load existing accounts:', error);
    }
  };

  // Save accounts to storage
  const saveAccounts = async (accounts: any[]): Promise<void> => {
    try {
      await storage.set({ accounts });
      await storage.set({
        currentAccount: accounts[0]?.address || null
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save accounts:', error);
    }
  };

  const createAccountOptions = [
    {
      id: 'ethereum',
      name: 'Ethereum account',
      logo: '🔷',
      action: 'create'
    },
    {
      id: 'solana',
      name: 'Solana account',
      logo: '🟣',
      action: 'create'
    }
  ];

  const importOptions = [
    {
      id: 'seed-phrase',
      name: 'Seed phrase',
      icon: Grid3X3,
      action: 'import-seed-phrase'
    },
    {
      id: 'private-key',
      name: 'Private key',
      icon: Shield,
      action: 'import-private-key'
    },
    {
      id: 'hardware-wallet',
      name: 'Hardware wallet',
      icon: Usb,
      action: 'hardware-wallet'
    }
  ];

  const handleCreateAccount = (accountType: string) => {
    setSelectedAccountType(accountType);
    setShowNameModal(true);
  };

  const handleImportOption = (action: string) => {
    onNavigate(action as any);
  };

  const handleAddAccount = async () => {
    if (!accountName.trim() || !selectedAccountType) return;
    
    setIsCreating(true);
    setCreateStatus('creating');
    setErrorMessage('');

    try {
      // Generate new account based on type
      let newAccount;
      
      if (selectedAccountType === 'ethereum') {
        // Generate Ethereum account
        const walletInstance = ethers.Wallet.createRandom();
        newAccount = {
          id: `eth_${Date.now()}`,
          name: accountName.trim(),
          address: walletInstance.address,
          privateKey: walletInstance.privateKey,
          type: 'ethereum',
          network: 'ethereum',
          createdAt: Date.now(),
          isEnabled: true
        };
      } else if (selectedAccountType === 'solana') {
        // Generate real Solana account using proper utilities
        const { SolanaWalletGenerator } = await import('../../utils/solana-utils');
        const solanaGenerator = new SolanaWalletGenerator('mainnet');
        const solanaWallet = solanaGenerator.generateWallet(accountName.trim(), 'mainnet');
        
        newAccount = {
          id: `sol_${Date.now()}`,
          name: accountName.trim(),
          address: solanaWallet.address,
          privateKey: solanaWallet.privateKey,
          publicKey: solanaWallet.publicKey,
          type: 'solana',
          network: 'solana',
          createdAt: Date.now(),
          isEnabled: true
        };
      } else {
        throw new Error('Unsupported account type');
      }

      // Save account to Chrome storage
      const existingAccounts = await storage.get(['accounts']);
      const accounts = existingAccounts.accounts || [];
      accounts.push(newAccount);
      await storage.set({ accounts });

      // Also save to wallet accounts if wallet exists
      if (wallet) {
        const walletAccounts = wallet.accounts || [];
        walletAccounts.push(newAccount);
        await storage.set({ 
          wallet: { ...wallet, accounts: walletAccounts }
        });
      }

      toast.success(`Account "${accountName.trim()}" created successfully!`);
      setCreateStatus('success');
      
      // Close modal and navigate after success
      setTimeout(() => {
        setShowNameModal(false);
        setCreateStatus('idle');
        onNavigate('dashboard');
      }, 1500);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Account creation failed:', error);
      setErrorMessage('Failed to create account. Please try again.');
      setCreateStatus('error');
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Import wallet
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 pb-20">
        {/* Create a new account */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create a new account</h2>
          <div className="space-y-3">
            {createAccountOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleCreateAccount(option.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-lg">{option.logo}</span>
                  </div>
                  <span className="font-medium text-gray-900">{option.name}</span>
                </div>
                <Plus className="w-5 h-5 text-[#180CB2]" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Import a wallet or account */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import a wallet or account</h2>
          <div className="space-y-3">
            {importOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleImportOption(option.action)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <option.icon className="w-5 h-5 text-[#180CB2]" />
                  </div>
                  <span className="font-medium text-gray-900">{option.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Account Name Modal */}
      {showNameModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-80 mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedAccountType === 'ethereum' ? 'Ethereum' : 'Solana'} account
              </h3>
              <button
                onClick={() => setShowNameModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="text-2xl text-gray-400 hover:text-gray-600">×</span>
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
                placeholder="Enter your account name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                disabled={!accountName.trim() || isCreating}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  accountName.trim() && !isCreating
                    ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : createStatus === 'success' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Created!</span>
                  </div>
                ) : (
                  'Add account'
                )}
              </button>
            </div>
            
            {/* Error Message */}
            {createStatus === 'error' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Account Creation Failed</p>
                    <p className="text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ImportWalletScreen;