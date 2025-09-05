import React, { useState } from 'react';
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
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const AccountDetailsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [accountName, setAccountName] = useState('Account 1');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);

  const currentAccount = {
    id: '1',
    name: 'Account 1',
    address: 'af45g3.....3453tr',
    fullAddress: '0x6ED56789012345678901234567890127db',
    avatar: '👤',
    walletName: 'Wallet 1',
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(currentAccount.fullAddress);
    toast.success('Address copied to clipboard!');
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
                <span className="text-white text-[13px]">{currentAccount.avatar}</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 text-[13px]">{currentAccount.name}</div>
                <div className="text-[13px] text-gray-600">{currentAccount.address}</div>
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
              <span className="font-medium text-gray-900">Address</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">{currentAccount.fullAddress.substring(0, 8)}...{currentAccount.fullAddress.substring(currentAccount.fullAddress.length - 5)}</span>
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
              <span className="font-medium text-gray-900">Wallet</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">{currentAccount.walletName}</span>
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
              <span className="font-medium text-gray-900">Secret recovery phrase</span>
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
              <span className="font-medium text-gray-900">Private key</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </motion.div>
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
