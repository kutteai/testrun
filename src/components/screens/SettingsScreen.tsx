import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search,
  Settings,
  Shield,
  MoreHorizontal,
  Info,
  ChevronRight
} from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const SettingsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    {
      icon: Settings,
      label: 'Preferences',
      screen: 'preferences',
      description: 'Currency, language, appearance'
    },
    {
      icon: Shield,
      label: 'Wallet security',
      screen: 'wallet-security',
      description: 'Backups, password, lock'
    },
    {
      icon: MoreHorizontal,
      label: 'More',
      screen: 'more',
      description: 'Terms, privacy, support'
    },
    {
      icon: Info,
      label: 'About Paycio wallet',
      screen: 'about',
      description: 'V1.0.0',
      showVersion: true
    }
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onNavigate('options')}
        className="absolute inset-0 bg-black/20"
      />
      
      {/* Settings Panel */}
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
              onClick={() => onNavigate('options')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold">
              Settings
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search with name or network"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:bg-white transition-all"
            />
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          {filteredMenuItems.map((item, index) => (
            <motion.button
              key={item.screen}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => onNavigate(item.screen)}
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
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsScreen; 