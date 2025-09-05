import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Bell,
  User,
  Settings,
  Globe,
  Headphones,
  Maximize,
  Lock,
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';
import { tabs, action, runtime } from '../../utils/runtime-utils';

const OptionsMenuScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { lockWallet } = useWallet();
  
  const menuItems = [
    { icon: Bell, label: 'Notifications', screen: 'notifications' as const },
    { icon: User, label: 'Account details', screen: 'account-details' as const },
    { icon: Settings, label: 'Settings', screen: 'settings' as const },
    { icon: Globe, label: 'Networks', screen: 'networks' as const },
    { icon: Headphones, label: 'Support', screen: 'support' as const },
    { icon: Maximize, label: 'Expand view', screen: 'expand-view' as const },
    { icon: Lock, label: 'Lock Paycio', screen: 'lock-paycio' as const },
  ];

  const handleMenuItemClick = async (screen: string) => {
    if (screen === 'lock-paycio') {
      try {
        // Lock the wallet
        await lockWallet();
        
        // Clear session storage
        sessionStorage.removeItem('walletPassword');
        sessionStorage.removeItem('walletUnlocked');
        
        // Clear Chrome session storage
        // Use cross-browser storage utility
        await storage.clear();
        
        toast.success('Wallet locked successfully');
        onNavigate('welcome'); // Navigate to welcome/unlock screen
      } catch (error) {
        console.error('Failed to lock wallet:', error);
        toast.error('Failed to lock wallet');
        // Don't navigate on error - let user retry
      }
    } else if (screen === 'expand-view') {
      // Implement cross-browser integration for expand view
      try {
        // Open wallet in new tab for better user experience
        tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
          if (activeTabs && activeTabs[0]) {
            tabs.sendMessage(activeTabs[0].id, {
              type: 'OPEN_WALLET_IN_TAB',
              url: runtime.getURL("popup.html")
            });
          }
        });
        // Close the popup after opening in new tab
        action.setPopup({ popup: "" });
      } catch (error) {
        console.error('Failed to expand view:', error);
        // Don't navigate on error - let user retry
      }
    } else if (screen === 'networks') {
      onNavigate('manage-networks' as any); // Navigate to manage networks screen
    } else {
      onNavigate(screen as any); // Navigate to the specified screen
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onNavigate('dashboard')}
        className="absolute inset-0 bg-black/20"
      />
      
      {/* Menu Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute top-0 right-0 w-1/2 h-full bg-white flex flex-col z-50 dashboard-typography shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1 text-center text-xl font-bold text-gray-900">Options</div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-6 space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => handleMenuItemClick(item.screen)}
              className="flex items-center w-full p-4 rounded-lg hover:bg-gray-100 transition-colors space-x-4"
            >
              <item.icon className="w-5 h-5 text-gray-600" />
              <span className="text-lg font-medium text-gray-800">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OptionsMenuScreen;
