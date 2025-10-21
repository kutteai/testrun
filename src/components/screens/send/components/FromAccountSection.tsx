import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FromAccountSectionProps {
  fromAccount: any;
  currentNetwork: any;
}

const FromAccountSection: React.FC<FromAccountSectionProps> = ({ fromAccount, currentNetwork }) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <label className="block text-[13px] text-gray-600 mb-2">From</label>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">👤</span>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[13px]">
              {fromAccount?.name || fromAccount?.id || 'Account 1'}
            </div>
            <div className="text-[13px] text-gray-600">
              {(() => {
                const addressToDisplay = fromAccount?.address || fromAccount?.addresses?.[currentNetwork?.id || 'ethereum'];
                return addressToDisplay
                  ? `${addressToDisplay.substring(0, 6)}...${addressToDisplay.substring(addressToDisplay.length - 4)}`
                  : 'No address';
              })()}
            </div>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-600" />
      </div>
    </motion.div>
  );
};

export default FromAccountSection;
