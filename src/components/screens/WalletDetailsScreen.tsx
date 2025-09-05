import React, { useState } from 'react';
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
import type { ScreenProps } from '../../types/index';

const WalletDetailsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showSecretPhraseModal, setShowSecretPhraseModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showSecretPhrase, setShowSecretPhrase] = useState(false);

  const accounts = [
    {
      id: '1',
      name: 'Account 1',
      address: 'af45g3.....3453tr',
      avatar: '👤',
      balance: '$0.00',
      isHighlighted: true
    },
    {
      id: '2',
      name: 'Account 2',
      address: '56eyr3.....fh5867',
      avatar: '👤',
      balance: '$0.00',
      isHighlighted: false
    }
  ];

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
            onClick={() => onNavigate('accounts')}
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
        {/* Total Balance */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {isBalanceVisible ? '$0.00' : '••••'}
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
            <span className="font-medium text-gray-900">Wallet 1</span>
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
                  account.isHighlighted 
                    ? 'border-[#180CB2] shadow-md' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{account.avatar}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-600">{account.address}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{account.balance}</div>
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
      </div>
    </motion.div>
  );
};

export default WalletDetailsScreen;
