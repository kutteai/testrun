import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Info,
  ExternalLink
} from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const AboutScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const aboutItems = [
    {
      icon: Info,
      label: 'Version',
      value: 'V1.0.0'
    },
    {
      icon: ExternalLink,
      label: 'Website',
      value: 'paycio.com',
      action: () => window.open('https://paycio.com', '_blank')
    },
    {
      icon: ExternalLink,
      label: 'Documentation',
      value: 'docs.paycio.com',
      action: () => window.open('https://docs.paycio.com', '_blank')
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
      
      {/* About Panel */}
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
              About Paycio wallet
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
          {/* About Items */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {aboutItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 ${
                  item.action ? 'hover:border-gray-200 hover:bg-gray-50 cursor-pointer' : ''
                } transition-all shadow-sm`}
                onClick={item.action}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 text-[13px]">{item.value}</span>
                  {item.action && <ExternalLink className="w-4 h-4 text-gray-400" />}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* App Description */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 p-4 bg-gray-50 rounded-xl"
          >
            <h3 className="font-medium text-gray-900 text-[13px] mb-2">About Paycio Wallet</h3>
            <p className="text-gray-600 text-[13px] leading-relaxed">
              Paycio Wallet is a secure, multi-chain cryptocurrency wallet that supports 
              multiple networks including Ethereum, Bitcoin, Solana, and more. Built with 
              security and user experience in mind.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AboutScreen;
