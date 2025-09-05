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

  // Save auto-lock time to storage
  const saveAutoLockTime = async (newLockTime: string): Promise<void> => {
    try {
      await storage.set({ autoLockTime: newLockTime });
      setLockTime(newLockTime);
    } catch (error) {
      console.error('Failed to save auto-lock time:', error);
    }
  };

  // Handle auto-lock time changes
  const handleLockTimeChange = async (newLockTime: string) => {
    setLockTime(newLockTime);
    
    try {
      // Save to Chrome storage
      await storage.set({ autoLockTime: newLockTime });
      
      // Update security settings
      const minutes = getLockTimeMinutes(newLockTime);
      if (minutes > 0) {
        setAutoLockEnabled(true);
        toast.success(`Auto-lock set to ${newLockTime}`);
      } else {
        setAutoLockEnabled(false);
        toast.success('Auto-lock disabled - manual lock only');
      }
    } catch (error) {
      console.error('Failed to save lock time:', error);
      toast.error('Failed to save auto-lock settings');
    }
  };

  // Convert lock time string to minutes
  const getLockTimeMinutes = (lockTimeStr: string): number => {
    if (lockTimeStr.includes('Never')) return 0;
    if (lockTimeStr.includes('hour')) return 60;
    const match = lockTimeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 15;
  };

  // Real password change handler
  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!wallet) {
      toast.error('No wallet available');
      return;
    }

    setPasswordChangeStatus('changing');

    try {
      // Import WalletManager for password change
      const { WalletManager } = await import('../../core/wallet-manager');
      const walletManager = new WalletManager();
      
      // Change password using WalletManager
      await walletManager.changePassword(wallet.id, currentPassword, newPassword);
      
      setPasswordChangeStatus('success');
      toast.success('Password changed successfully!');
      
      // Close modal after success
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordChangeStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Password change failed:', error);
      setPasswordChangeStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to change password');
      toast.error(`Password change failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const securityItems = [
    {
      icon: Shield,
      label: 'Backups',
      screen: 'backups',
      description: 'Manage wallet backups'
    },
    {
      icon: Key,
      label: 'Change password',
      action: () => setShowChangePasswordModal(true),
      description: 'Update your wallet password'
    },
    {
      icon: Lock,
      label: 'Wallet lock',
      action: () => setShowWalletLockModal(true),
      description: 'Lock wallet settings'
    }
  ];

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onNavigate('settings')}
        className="absolute inset-0 bg-black/20"
      />
      
      {/* Wallet Security Panel */}
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
              onClick={() => onNavigate('settings')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold">
              Wallet security
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
        {/* Security Items */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {securityItems.map((item, index) => (
            <motion.button
              key={item.screen}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={item.action || (() => onNavigate(item.screen))}
              className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                  <div className="text-[13px] text-gray-500">{item.description}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Password change status indicator */}
                {item.label === 'Change password' && passwordChangeStatus !== 'idle' && (
                  <div className="flex items-center space-x-2">
                    {passwordChangeStatus === 'changing' && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Changing...</span>
                      </div>
                    )}
                    {passwordChangeStatus === 'success' && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Success!</span>
                      </div>
                    )}
                    {passwordChangeStatus === 'error' && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </motion.button>
          ))}
        </motion.div>
        </div>

        {/* Modals */}
        <WalletLockModal
          isOpen={showWalletLockModal}
          onClose={() => {
            setShowWalletLockModal(false);
            setPasswordChangeStatus('idle');
            setErrorMessage('');
          }}
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
    </div>
  );
};

export default WalletSecurityScreen;
