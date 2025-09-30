import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertCircle, Unlock, X, Globe } from 'lucide-react';
import { useWallet } from '../store/WalletContext';
import toast from 'react-hot-toast';

interface DAppUnlockPopupProps {
  isVisible: boolean;
  onClose: () => void;
  dappOrigin?: string;
  requestType?: 'connect' | 'signing' | 'transaction';
  onUnlockSuccess: () => void;
}

const DAppUnlockPopup: React.FC<DAppUnlockPopupProps> = ({
  isVisible,
  onClose,
  dappOrigin,
  requestType = 'connect',
  onUnlockSuccess
}) => {
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { unlockWallet, isWalletUnlocked } = useWallet();

  // Auto-close if wallet becomes unlocked
  useEffect(() => {
    if (isWalletUnlocked && isVisible) {
      onUnlockSuccess();
      onClose();
    }
  }, [isWalletUnlocked, isVisible, onUnlockSuccess, onClose]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsUnlocking(true);
    
    try {
      const success = await unlockWallet(password);
      
      if (success) {
        toast.success('Wallet unlocked successfully!');
        onUnlockSuccess();
        onClose();
      } else {
        toast.error('Invalid password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unlock wallet');
      setPassword('');
    } finally {
      setIsUnlocking(false);
    }
  };

  const getRequestTypeInfo = () => {
    switch (requestType) {
      case 'connect':
        return {
          title: 'DApp Connection Request',
          description: 'wants to connect to your wallet',
          icon: <Globe className="w-6 h-6 text-blue-500" />
        };
      case 'signing':
        return {
          title: 'Signature Request',
          description: 'wants you to sign a message',
          icon: <Shield className="w-6 h-6 text-orange-500" />
        };
      case 'transaction':
        return {
          title: 'Transaction Request',
          description: 'wants to send a transaction',
          icon: <AlertCircle className="w-6 h-6 text-red-500" />
        };
      default:
        return {
          title: 'Wallet Access Required',
          description: 'needs access to your wallet',
          icon: <Unlock className="w-6 h-6 text-gray-500" />
        };
    }
  };

  const requestInfo = getRequestTypeInfo();
  const displayOrigin = dappOrigin ? new URL(dappOrigin).hostname : 'Unknown DApp';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          style={{ zIndex: 10000 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {requestInfo.icon}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {requestInfo.title}
                  </h2>
                  <p className="text-sm text-gray-500">Unlock required</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isUnlocking}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* DApp Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{displayOrigin}</p>
                    <p className="text-sm text-gray-600">{requestInfo.description}</p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      Security Check
                    </p>
                    <p className="text-xs text-amber-700">
                      Only unlock for trusted websites. Your wallet will remain secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Form */}
              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your wallet password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      disabled={isUnlocking}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isUnlocking}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isUnlocking}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUnlocking || !password.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isUnlocking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Unlocking...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlock Wallet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center">
                Your password is never shared with websites
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage DApp unlock popup
export const useDAppUnlock = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dappOrigin, setDappOrigin] = useState<string>('');
  const [requestType, setRequestType] = useState<'connect' | 'signing' | 'transaction'>('connect');
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

  const showUnlockPopup = (
    origin: string, 
    type: 'connect' | 'signing' | 'transaction' = 'connect',
    successCallback?: () => void
  ) => {
    setDappOrigin(origin);
    setRequestType(type);
    setOnSuccess(() => successCallback);
    setIsVisible(true);
  };

  const hideUnlockPopup = () => {
    setIsVisible(false);
    setDappOrigin('');
    setOnSuccess(null);
  };

  const handleUnlockSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  return {
    isVisible,
    dappOrigin,
    requestType,
    showUnlockPopup,
    hideUnlockPopup,
    handleUnlockSuccess,
    UnlockPopup: (
      <DAppUnlockPopup
        isVisible={isVisible}
        dappOrigin={dappOrigin}
        requestType={requestType}
        onClose={hideUnlockPopup}
        onUnlockSuccess={handleUnlockSuccess}
      />
    )
  };
};

export default DAppUnlockPopup;




