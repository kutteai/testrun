import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight,
  FileText,
  Shield,
  Headphones,
  Users
} from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const MoreScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const moreItems = [
    {
      icon: FileText,
      label: 'Terms of service',
      screen: 'terms',
      action: () => {
        // Open terms in new tab or show modal
        window.open('https://paycio.com/terms', '_blank');
      }
    },
    {
      icon: Shield,
      label: 'Privacy policy',
      screen: 'privacy',
      action: () => {
        // Open privacy policy in new tab or show modal
        window.open('https://paycio.com/privacy', '_blank');
      }
    },
    {
      icon: Headphones,
      label: 'Support center',
      screen: 'support',
      action: () => {
        // Open support in new tab or show modal
        window.open('https://paycio.com/support', '_blank');
      }
    },
    {
      icon: Users,
      label: 'Community',
      screen: 'community',
      action: () => {
        // Open community in new tab or show modal
        window.open('https://paycio.com/community', '_blank');
      }
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
      
      {/* More Panel */}
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
              More
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
        {/* More Items */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {moreItems.map((item, index) => (
            <motion.button
              key={item.screen}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={item.action}
              className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
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

export default MoreScreen;

