import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Download, Shield, Zap, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface WelcomeScreenProps extends ScreenProps {
  hasWallet: boolean;
  isWalletUnlocked: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onNavigate, 
  hasWallet, 
  isWalletUnlocked 
}) => {
  const { unlockWallet } = useWallet();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  // Handle wallet unlock
  const handleUnlockWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsUnlocking(true);
    
    try {
      const success = await unlockWallet(password);
      if (success) {
        setPassword('');
        // Navigation will be handled automatically by App component
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      toast.error('Failed to unlock wallet');
    } finally {
      setIsUnlocking(false);
    }
  };

  // If wallet exists but is locked, show unlock form
  if (hasWallet && !isWalletUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex flex-col items-center justify-center px-8"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Wallet Icon */}
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Lock className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/80 text-lg">Enter your password to unlock your wallet</p>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleUnlockWallet} className="space-y-6">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                disabled={isUnlocking}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isUnlocking || !password.trim()}
              className="w-full bg-white text-primary-700 font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isUnlocking ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-700 border-t-transparent"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Unlock Wallet</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Your wallet is secured with end-to-end encryption
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // If no wallet exists, show welcome screen for new users
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
          <h1 className="text-4xl font-bold text-white mb-2">SOW Wallet</h1>
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