import React from 'react';
import { motion } from 'framer-motion';
import type { ScreenProps } from '../../types/index';
import walletIcon from '../../assets/wallet.png';
import downloadIcon from '../../assets/download.png';
import securityIcon from '../../assets/security.png';
import lighteningIcon from '../../assets/lightening.png';
import multichainIcon from '../../assets/multichain.png';
import lockIcon from '../../assets/lock.png';
import { storageUtils } from '../../utils/storage-utils';

const CreateWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const features = [
    {
      icon: <img src={multichainIcon} alt="Multi-Chain" className="w-6 h-6" />,
      title: 'Multi-Chain Support',
      description: 'Ethereum, Bitcoin, Solana, TRON, and more'
    },
    {
      icon: <img src={securityIcon} alt="Security" className="w-6 h-6" />,
      title: 'Advanced Security',
      description: 'Hardware wallet support & encryption'
    },
    {
      icon: <img src={lighteningIcon} alt="Lightning" className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Instant transactions & real-time updates'
    },
    {
      icon: <img src={lockIcon} alt="Lock" className="w-6 h-6" />,
      title: 'Privacy First',
      description: 'Your keys, your crypto, your control'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          {/* Paycio Wallet Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
            Paycio Wallet
          </h1>
          <p className="text-gray-600 text-lg">Your gateway to the decentralized world</p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-gray-700 mb-2 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-gray-900 font-semibold text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="px-8 pb-8 space-y-4"
      >
        {/* Create New Wallet Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('create-password')}
          className="w-full bg-[#180CB2] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <img src={walletIcon} alt="Wallet" className="w-5 h-5" />
          <span>Create new wallet</span>
        </motion.button>

        {/* Import Existing Wallet Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            // Set import flow flag before navigating using cross-browser storage
            await storageUtils.setImportFlow(true);
            onNavigate('create-password');
          }}
          className="w-full bg-white text-gray-900 font-semibold py-4 px-6 rounded-xl border border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <img src={downloadIcon} alt="Download" className="w-5 h-5" />
          <span>Import existing wallet</span>
        </motion.button>
      </motion.div>

      {/* Footer Legal Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-center pb-6 px-8"
      >
        <p className="text-gray-500 text-sm">
          By continuing, you agree to our{' '}
          <button 
            onClick={() => onNavigate('terms')}
            className="text-gray-600 hover:underline"
          >
            Terms of Service
          </button>
          {' '}and{' '}
          <span className="text-gray-600">
            Privacy Policy
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default CreateWalletScreen; 