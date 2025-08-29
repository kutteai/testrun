import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import NetworkSwitcher from './NetworkSwitcher';
import type { HeaderProps } from '../../types/index';

const Header: React.FC<HeaderProps> = ({ title, onBack, canGoBack, currentNetwork }) => {
  const { isWalletUnlocked } = useWallet();

  const getTitle = (): string => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      send: 'Send',
      receive: 'Receive',
      settings: 'Settings',
      security: 'Security',
      networks: 'Networks',
      nfts: 'NFTs',
      portfolio: 'Portfolio',
      transactions: 'Transactions',
      create: 'Create Wallet',
      import: 'Import Wallet',
      verify: 'Verify Seed'
    };
    return titles[title] || title;
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex justify-between items-center px-4 py-3 bg-gray-900/80 backdrop-blur-xl border-b border-white/10"
    >
      {/* Left Section - Title and Back Button */}
      <div className="flex items-center space-x-3">
        {canGoBack && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </motion.button>
        )}
        
        <h1 className="text-lg font-semibold text-white">{getTitle()}</h1>
      </div>

      {/* Right Section - Network Switcher and Menu */}
      <div className="flex items-center space-x-2">
        {/* Network Switcher */}
        <NetworkSwitcher />
        
        {/* Wallet Status Indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-1 bg-gray-800/50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${
            isWalletUnlocked ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span className="text-xs text-gray-300 font-medium">
            {isWalletUnlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>

        {/* Menu Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
        >
          <MoreVertical className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Header; 