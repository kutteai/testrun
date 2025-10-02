import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';

interface WalletUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (password: string) => Promise<boolean>;
  dAppName?: string;
  dAppUrl?: string;
  dAppIcon?: string;
}

const WalletUnlockModal: React.FC<WalletUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  dAppName = 'Unknown dApp',
  dAppUrl = '',
  dAppIcon
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const { isWalletUnlocked } = useWallet();

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setAttempts(0);
    }
  }, [isOpen]);

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsUnlocking(true);
    setError('');

    try {
      const success = await onUnlock(password);
      if (success) {
        onClose();
      } else {
        setAttempts(prev => prev + 1);
        setError(`Invalid password. ${3 - attempts - 1} attempts remaining.`);
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Wallet Locked</h2>
                <p className="text-sm text-gray-500">Unlock to connect to dApp</p>
              </div>
            </div>
          </div>

          {/* dApp Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              {dAppIcon ? (
                <img src={dAppIcon} alt={dAppName} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{dAppName}</p>
                {dAppUrl && (
                  <p className="text-sm text-gray-500">{dAppUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your wallet password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isUnlocking}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Security Notice</p>
                <p>Only enter your password on trusted dApps. This wallet will remain unlocked for 15 minutes.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isUnlocking}
            >
              Cancel
            </button>
            <button
              onClick={handleUnlock}
              disabled={isUnlocking || !password.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isUnlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <span>Unlock Wallet</span>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WalletUnlockModal;
