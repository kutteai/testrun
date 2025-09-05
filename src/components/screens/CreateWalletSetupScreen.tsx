import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, Shield } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const CreateWalletSetupScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  // Navigate to password creation
  const handleCreateWallet = () => {
    onNavigate('create-password');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('create')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-6 h-6 rotate-180 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#180CB2] rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create Wallet</h1>
              <p className="text-gray-600 text-sm">Set up your new wallet</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 mb-6">
            <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-[#180CB2]">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-gray-900">Create New Wallet</h2>
            <p className="text-gray-600 mb-6">
              Set up a secure password and generate your recovery phrase
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateWallet}
            className="w-full py-4 font-semibold text-white rounded-xl bg-[#180CB2] hover:bg-[#140a8f] transition-all"
          >
            Create Wallet
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CreateWalletSetupScreen;
