import React from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  User,
  Settings,
  Globe,
  Headphones,
  Maximize,
  Lock,
  X,
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';
import { tabs, action, runtime } from '../../utils/runtime-utils';
import { openExpandedView, isWindowOpeningSupported } from '../../utils/expand-utils';

const OptionsMenuScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { lockWallet } = useWallet();
  
  const menuItems = [
    { icon: Bell, label: 'Notifications', screen: 'notifications' as const },
    { icon: User, label: 'Account details', screen: 'account-details' as const },
    { icon: Settings, label: 'Settings', screen: 'settings' as const },
    { icon: Globe, label: 'Networks', screen: 'networks' as const },
    { icon: Headphones, label: 'Support', screen: 'support' as const },
    { icon: Maximize, label: 'Expand to Full Screen', screen: 'expand-view' as const },
    { icon: Lock, label: 'Lock Paycio', screen: 'lock-paycio' as const },
  ];

  const handleMenuItemClick = async (screen: string) => {
    if (screen === 'lock-paycio') {
      try {
        // Lock the wallet (this will only clear session data, NOT wallet data)
        await lockWallet();
        
        toast.success('Wallet locked successfully');
        onNavigate('welcome'); // Navigate to welcome/unlock screen
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to lock wallet:', error);
        toast.error('Failed to lock wallet');
        // Don't navigate on error - let user retry
      }
    } else if (screen === 'expand-view') {
      // Open expanded view in new window
      try {
        if (isWindowOpeningSupported()) {
          await openExpandedView({
            width: 1200,
            height: 800,
            left: 100,
            top: 100,
            focused: true,
            type: 'normal'
          });
          toast.success('Opened wallet in full screen');
          onGoBack(); // Close the options menu
        } else {
          toast.error('Full screen mode not supported in this browser');
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to open expanded view:', error);
        toast.error('Failed to open full screen mode');
      }
    } else if (screen === 'networks') {
      onNavigate('networks' as any); // Navigate to networks screen
    } else {
      // Navigate to the specified screen
      onNavigate(screen as any);
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop - semi-transparent overlay that captures clicks to close */}
      <div
        onClick={onGoBack}
        className="absolute inset-0 pointer-events-auto bg-black/30"
      />
      
      {/* Options Menu - positioned to overlay on dashboard */}
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Options</h2>
          <button
            onClick={onGoBack}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1, delay: index * 0.05 }}
              onClick={() => handleMenuItemClick(item.screen)}
              className="flex items-center w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors space-x-4 group"
            >
              <item.icon className="w-5 h-5 text-gray-600 group-hover:text-[#180CB2] transition-colors" />
              <span className="text-sm font-medium text-gray-800 group-hover:text-[#180CB2] transition-colors">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OptionsMenuScreen;
