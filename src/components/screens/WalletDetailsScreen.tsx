import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit, 
  ChevronRight, 
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { navigateWithHistory, goBackWithHistory } from '../../utils/navigation-utils';

const WalletDetailsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getWalletAccounts, getCurrentAccount } = useWallet();
  const { portfolioValue } = usePortfolio();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showSecretPhraseModal, setShowSecretPhraseModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showSecretPhrase, setShowSecretPhrase] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load real wallet data
  useEffect(() => {
    const loadWalletData = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        
        const current = await getCurrentAccount();
        setCurrentAccount(current);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load wallet data:', error);
        toast.error('Failed to load wallet details');
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, [wallet, getWalletAccounts, getCurrentAccount]);

  const handleViewSecretPhrase = () => {
    setShowPasswordModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goBackWithHistory(onNavigate)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Wallet details
          </h1>
          <button 
            onClick={() => onNavigate('manage-wallet')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading wallet details...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Total Balance */}
            <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {isBalanceVisible ? `$${portfolioValue.totalUSD?.toFixed(2) || '0.00'}` : '••••'}
          </div>
          <button
            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            {isBalanceVisible ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
          </button>
        </motion.div>

        {/* Wallet Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <label className="block text-sm text-gray-600 mb-2">Wallet name</label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">{wallet?.name || 'My Wallet'}</span>
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <Edit className="w-4 h-4 text-[#180CB2]" />
            </button>
          </div>
        </motion.div>

        {/* Secret Recovery Phrase */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <button
            onClick={handleViewSecretPhrase}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">Secret recovery phrase</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </motion.div>

        {/* Accounts Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
            <button
              onClick={() => onNavigate('manage-crypto')}
              className="text-[#180CB2] text-sm font-medium hover:underline"
            >
              Manage crypto
            </button>
          </div>
          
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`relative bg-white rounded-xl p-4 border-2 transition-all ${
                  account.isActive 
                    ? 'border-[#180CB2] shadow-md' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{account.name || `Account ${account.id}`}</div>
                      <div className="text-sm text-gray-600">
                        {account.address ? `${account.address.substring(0, 8)}...${account.address.substring(account.address.length - 6)}` : 'No address'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {(() => {
                          // Get the current network from the account or default to ethereum
                          const currentNetwork = account.network || 'ethereum';
                          const asset = portfolioValue?.assets?.find(asset => 
                            asset.network === currentNetwork
                          );
                          return asset?.usdValue ? 
                            `$${asset.usdValue.toFixed(2)}` : 
                            'Loading...';
                        })()}
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-[#180CB2] rounded-full"></div>
                      </div>
                    </div>
                    
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default WalletDetailsScreen;
