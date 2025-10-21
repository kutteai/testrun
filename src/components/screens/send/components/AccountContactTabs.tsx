import React from 'react';
import { motion } from 'framer-motion';

interface AccountContactTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AccountContactTabs: React.FC<AccountContactTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-6"
    >
      <div className="flex space-x-6 border-b border-gray-200">
        {['accounts', 'contacts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[13px] font-medium transition-colors ${
              activeTab === tab
                ? 'text-[#180CB2] border-b-2 border-[#180CB2]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'accounts' ? 'Your accounts' : 'Contacts'}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default AccountContactTabs;

