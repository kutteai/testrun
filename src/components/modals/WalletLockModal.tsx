import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Info, Lock, Clock, Shield, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';

interface WalletLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLockTime: string;
  onLockTimeChange: (time: string) => void;
}

interface LockTimeOption {
  value: string;
  minutes: number;
  label: string;
  description: string;
}

const WalletLockModal: React.FC<WalletLockModalProps> = ({
  isOpen,
  onClose,
  currentLockTime,
  onLockTimeChange
}) => {
  const { lockWallet, wallet } = useWallet();
  const [isLocking, setIsLocking] = useState(false);
  const [lockStatus, setLockStatus] = useState<'idle' | 'locking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);

  // Real lock time options with actual minute values
  const lockTimeOptions: LockTimeOption[] = [
    { value: '5 minutes', minutes: 5, label: '5 minutes', description: 'Lock after 5 minutes of inactivity' },
    { value: '10 minutes', minutes: 10, label: '10 minutes', description: 'Lock after 10 minutes of inactivity' },
    { value: '15 minutes', minutes: 15, label: '15 minutes', description: 'Lock after 15 minutes of inactivity' },
    { value: '30 minutes', minutes: 30, label: '30 minutes', description: 'Lock after 30 minutes of inactivity' },
    { value: '1 hour', minutes: 60, label: '1 hour', description: 'Lock after 1 hour of inactivity' },
    { value: 'Never (manual lock only)', minutes: 0, label: 'Manual lock only', description: 'Wallet stays unlocked until manually locked' }
  ];

  // Calculate session time remaining
  useEffect(() => {
    if (!isOpen || !wallet) return;

    const calculateTimeRemaining = () => {
      const unlockTime = localStorage.getItem('unlockTime');
      if (unlockTime) {
        const elapsed = Date.now() - parseInt(unlockTime);
        const currentOption = lockTimeOptions.find(opt => opt.value === currentLockTime);
        const timeoutMs = (currentOption?.minutes || 15) * 60 * 1000;
        const remaining = Math.max(0, timeoutMs - elapsed);
        setSessionTimeRemaining(remaining);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [isOpen, wallet, currentLockTime]);

  // Real wallet locking function
  const handleLockWallet = async () => {
    if (!wallet) {
      toast.error('No wallet available to lock');
      return;
    }

    setIsLocking(true);
    setLockStatus('locking');

    try {
      // Lock the wallet using WalletContext
      await lockWallet();
      
      setLockStatus('success');
      toast.success('Wallet locked successfully!');
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setLockStatus('idle');
      }, 1500);
      
    } catch (error) {
      console.error('Failed to lock wallet:', error);
      setLockStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to lock wallet');
      toast.error(`Failed to lock wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLocking(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Session expired';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    }
    return `${seconds}s remaining`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-80 mx-4 max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Wallet lock</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Session Status Banner */}
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-3 h-3 text-white" />
            </div>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Session Status</div>
              <div className="text-blue-700">
                {sessionTimeRemaining > 0 ? (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>{formatTimeRemaining(sessionTimeRemaining)}</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-orange-600">
                    <Lock className="w-3 h-3" />
                    <span>Session expired - wallet will lock soon</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Session Status Banner */}
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-3 h-3 text-white" />
            </div>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Session Status</div>
              <div className="text-blue-700">
                {sessionTimeRemaining > 0 ? (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>{formatTimeRemaining(sessionTimeRemaining)}</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-orange-600">
                    <Lock className="w-3 h-3" />
                    <span>Session expired - wallet will lock soon</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Information Banner */}
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-3 h-3 text-white" />
            </div>
            <div className="text-sm text-orange-800">
              If idle too long, the wallet locks automatically. Re-enter password to unlock.
            </div>
          </div>
        </div>

        {/* Lock Time Options */}
        <div className="space-y-3">
          {lockTimeOptions.map((option) => (
            <label
              key={option}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <span className="text-gray-900">{option}</span>
              <div className="relative">
                <input
                  type="radio"
                  name="lockTime"
                  value={option}
                  checked={currentLockTime === option}
                  onChange={(e) => onLockTimeChange(e.target.value)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  currentLockTime === option
                    ? 'border-[#180CB2] bg-[#180CB2]'
                    : 'border-gray-300 bg-white'
                }`}>
                  {currentLockTime === option && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-1.5" />
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Lock Wallet Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleLockWallet}
            disabled={isLocking || !wallet}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              wallet && !isLocking
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLocking ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Locking Wallet...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Lock Wallet Now</span>
              </>
            )}
          </button>
          
          {/* Status Display */}
          {lockStatus !== 'idle' && (
            <div className="mt-4 p-3 rounded-lg border">
              {lockStatus === 'locking' && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Locking wallet...</span>
                </div>
              )}
              
              {lockStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Wallet locked successfully!</span>
                </div>
              )}
              
              {lockStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WalletLockModal;
