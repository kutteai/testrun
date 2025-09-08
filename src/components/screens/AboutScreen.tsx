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
      value: 'V2.0.0'
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
          <h1 className="text-lg font-semibold text-white">About PayCio Wallet</h1>
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
          {aboutItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                  <div className="text-[12px] text-gray-500">{item.value}</div>
                </div>
              </div>
              {item.action && (
                <button
                  onClick={item.action}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gray-50 rounded-2xl p-6"
        >
          <h3 className="font-semibold text-gray-900 text-[14px] mb-3">About PayCio Wallet</h3>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            PayCio Wallet is a secure, multi-chain cryptocurrency wallet that supports 
            multiple networks including Ethereum, Bitcoin, Solana, and more. Built with 
            security and user experience in mind.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AboutScreen;