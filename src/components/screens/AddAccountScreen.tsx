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
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AddAccountScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { addAccount, wallet, getPassword } = useWallet();
  const [showNameModal, setShowNameModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const createAccountOptions = [
    {
      id: 'ethereum',
      name: 'Ethereum Account',
      logo: '🔷',
      description: 'Create new Ethereum account from seed phrase',
      supported: true
    },
    {
      id: 'bsc',
      name: 'BNB Smart Chain Account',
      logo: '🟡',
      description: 'Create new BSC account from seed phrase',
      supported: true
    },
    {
      id: 'polygon',
      name: 'Polygon Account',
      logo: '🟣',
      description: 'Create new Polygon account from seed phrase',
      supported: true
    },
    {
      id: 'solana',
      name: 'Solana Account',
      logo: '🟠',
      description: 'Create new Solana account from seed phrase',
      supported: false // Not yet implemented
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin Account',
      logo: '🟠',
      description: 'Create new Bitcoin account from seed phrase',
      supported: false // Not yet implemented
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
    },
    {
      id: 'google',
      name: 'Google',
      icon: Globe,
      action: 'google'
    }
  ];

  const handleCreateAccount = (accountType: string) => {
    if (!wallet) {
      toast.error('No wallet available. Please create or import a wallet first.');
      return;
    }

    if (!wallet.encryptedSeedPhrase) {
      toast.error('No seed phrase available. Cannot create new accounts.');
      return;
    }

    setSelectedAccountType(accountType);
    setShowNameModal(true);
  };

  const handleImportOption = (action: string) => {
    onNavigate(action as any);
  };

  const handleAddAccount = async () => {
    if (!accountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }

    if (!selectedAccountType) {
      toast.error('No account type selected');
      return;
    }

    if (!wallet) {
      toast.error('No wallet available');
      return;
    }

    setIsCreating(true);
    setCreationStatus('creating');

    try {
      // Get password from user
      const password = await getPassword();
      if (!password) {
        throw new Error('Password required to create account');
      }

      // Create the new account
      await addAccount(password);
      
      setCreationStatus('success');
      toast.success(`New ${selectedAccountType} account created successfully!`);
      
      // Wait a moment to show success, then navigate
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating account:', error);
      setCreationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create account');
      toast.error(`Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('accounts')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Add account
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6">
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
                disabled={!option.supported}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  option.supported
                    ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                    : 'bg-gray-100 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-lg">{option.logo}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{option.name}</span>
                      {!option.supported && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </div>
                {option.supported ? (
                  <Plus className="w-5 h-5 text-[#180CB2]" />
                ) : (
                  <span className="text-gray-400 text-sm">🔒</span>
                )}
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
                {selectedAccountType ? `${selectedAccountType.charAt(0).toUpperCase() + selectedAccountType.slice(1)} Account` : 'New Account'}
              </h3>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setCreationStatus('idle');
                  setErrorMessage('');
                  setAccountName('');
                  setSelectedAccountType('');
                }}
                disabled={isCreating}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
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
                disabled={isCreating}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>

            {/* Creation Status Display */}
            {creationStatus !== 'idle' && (
              <div className="mb-6">
                {creationStatus === 'creating' && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-blue-800">Creating new account...</span>
                  </div>
                )}
                
                {creationStatus === 'success' && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">Account created successfully!</span>
                  </div>
                )}
                
                {creationStatus === 'error' && (
                  <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{errorMessage}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNameModal(false)}
                disabled={isCreating}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                disabled={!accountName.trim() || isCreating}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  accountName.trim() && !isCreating
                    ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AddAccountScreen;
