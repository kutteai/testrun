import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight,
  Shield,
  Lock,
  Key,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import WalletLockModal from '../modals/WalletLockModal';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import { storage } from '../../utils/storage-utils';

const WalletSecurityScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [showWalletLockModal, setShowWalletLockModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [lockTime, setLockTime] = useState('10 minutes');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'changing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);

  // Load saved auto-lock time on component mount
  useEffect(() => {
    const loadAutoLockSettings = async () => {
      try {
        const result = await storage.get(['autoLockTime']);
        if (result.autoLockTime) {
          setLockTime(result.autoLockTime);
          const minutes = getLockTimeMinutes(result.autoLockTime);
          setAutoLockEnabled(minutes > 0);
        }
      } catch (error) {
        console.error('Failed to load auto-lock settings:', error);
      }
    };

    loadAutoLockSettings();
  }, []);

  // Load auto-lock time from storage
  const loadAutoLockTime = async (): Promise<void> => {
    try {
      const result = await storage.get(['autoLockTime']);
      if (result.autoLockTime) {
        setLockTime(result.autoLockTime);
      }
    } catch (error) {
      console.error('Failed to load auto-lock time:', error);
    }
  };

  // Get lock time in minutes
  const getLockTimeMinutes = (timeString: string): number => {
    const timeMap: { [key: string]: number } = {
      '1 minute': 1,
      '5 minutes': 5,
      '10 minutes': 10,
      '30 minutes': 30,
      '1 hour': 60,
      'Never': 0
    };
    return timeMap[timeString] || 10;
  };

  // Handle lock time change
  const handleLockTimeChange = async (newLockTime: string) => {
    try {
      setLockTime(newLockTime);
      await storage.set({ autoLockTime: newLockTime });
      toast.success('Auto-lock time updated');
    } catch (error) {
      console.error('Failed to save auto-lock time:', error);
      toast.error('Failed to update auto-lock time');
    }
  };

  // Handle password change
  const handlePasswordChange = async (oldPassword: string, newPassword: string) => {
    setPasswordChangeStatus('changing');
    setErrorMessage('');
    
    try {
      // Here you would implement the actual password change logic
      // For now, we'll simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPasswordChangeStatus('success');
      toast.success('Password changed successfully');
      
      // Close modal after success
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordChangeStatus('idle');
      }, 1500);
    } catch (error) {
      setPasswordChangeStatus('error');
      setErrorMessage('Failed to change password. Please try again.');
      toast.error('Failed to change password');
    }
  };

  const securityItems = [
    {
      icon: Lock,
      label: 'Change password',
      description: 'Update your wallet password',
      action: () => setShowChangePasswordModal(true),
      status: passwordChangeStatus
    },
    {
      icon: Shield,
      label: 'Auto-lock settings',
      description: 'Configure automatic wallet locking',
      action: () => setShowWalletLockModal(true)
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Wallet Security</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {securityItems.map((item, index) => (
            <motion.button
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={item.action}
              className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                  <div className="text-[12px] text-gray-500">{item.description}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {item.status === 'changing' && (
                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {item.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Current Settings */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gray-50 rounded-2xl p-4"
        >
          <h3 className="font-semibold text-gray-900 text-[14px] mb-3">Current Settings</h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Auto-lock time:</span>
              <span className="text-gray-700">{lockTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Auto-lock enabled:</span>
              <span className="text-gray-700">{autoLockEnabled ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <WalletLockModal
        isOpen={showWalletLockModal}
        onClose={() => setShowWalletLockModal(false)}
        currentLockTime={lockTime}
        onLockTimeChange={handleLockTimeChange}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setPasswordChangeStatus('idle');
          setErrorMessage('');
        }}
        onPasswordChange={handlePasswordChange}
      />
    </motion.div>
  );
};

export default WalletSecurityScreen;