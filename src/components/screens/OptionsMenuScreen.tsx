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
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop - invisible but captures clicks to close */}
      <div
        onClick={() => onNavigate('dashboard')}
        className="absolute inset-0 pointer-events-auto"
      />
      
      {/* Dropdown Menu - positioned to hover over dashboard */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute top-16 right-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 pointer-events-auto"
      >
        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1, delay: index * 0.02 }}
              onClick={() => handleMenuItemClick(item.screen)}
              className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors space-x-3 group"
            >
              <item.icon className="w-5 h-5 text-gray-600 group-hover:text-[#180CB2] transition-colors" />
              <span className="text-[13px] font-medium text-gray-800 group-hover:text-[#180CB2] transition-colors">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OptionsMenuScreen;
