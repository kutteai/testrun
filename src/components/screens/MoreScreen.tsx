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
      label: 'Support',
      screen: 'support',
      action: () => onNavigate('support')
    },
    {
      icon: Users,
      label: 'Community',
      screen: 'community',
      action: () => {
        // Open community in new tab
        window.open('https://paycio.com/community', '_blank');
      }
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
          <h1 className="text-lg font-semibold text-white">More</h1>
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
          {moreItems.map((item, index) => (
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
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MoreScreen;