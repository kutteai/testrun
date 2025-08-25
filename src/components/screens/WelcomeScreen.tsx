import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Download, Shield, Zap, Globe, Lock } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const WelcomeScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Multi-Chain Support',
      description: 'Ethereum, Bitcoin, Solana, TRON, and more'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Advanced Security',
      description: 'Hardware wallet support & encryption'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Instant transactions & real-time updates'
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Privacy First',
      description: 'Your keys, your crypto, your control'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex flex-col"
    >
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">PayCio Wallet</h1>
          <p className="text-white/80 text-lg">Your gateway to the decentralized world</p>
        </motion.div>

        {/* Features */}
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
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
            >
              <div className="text-white/90 mb-2 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-white/70 text-xs">
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
        className="p-8 space-y-4"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('create')}
          className="w-full bg-white text-primary-700 font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Wallet className="w-5 h-5" />
          <span>Create New Wallet</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('import')}
          className="w-full bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Import Existing Wallet</span>
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-center pb-6"
      >
        <p className="text-white/60 text-sm">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen; 