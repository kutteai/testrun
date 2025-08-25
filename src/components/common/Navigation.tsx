import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Send, 
  Download, 
  Settings
} from 'lucide-react';
import { useTransaction } from '../../store/TransactionContext';
import type { ScreenId } from '../../types/index';

interface NavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const { pendingTransactions } = useTransaction();

  const navigationItems = [
    {
      id: 'dashboard' as ScreenId,
      label: 'Home',
      icon: Home,
      badge: null
    },
    {
      id: 'send' as ScreenId,
      label: 'Send',
      icon: Send,
      badge: null
    },
    {
      id: 'receive' as ScreenId,
      label: 'Receive',
      icon: Download,
      badge: null
    },
    {
      id: 'nfts' as ScreenId,
      label: 'NFTs',
      icon: Home,
      badge: null
    },
    {
      id: 'settings' as ScreenId,
      label: 'Settings',
      icon: Settings,
      badge: pendingTransactions && pendingTransactions.length > 0 ? pendingTransactions.length : null
    }
  ];

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="px-4 py-2 bg-white border-t border-gray-200"
    >
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex absolute -top-2 -right-2 justify-center items-center w-5 h-5 text-xs text-white bg-red-500 rounded-full"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default Navigation; 