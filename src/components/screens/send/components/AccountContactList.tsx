import React from 'react';
import { motion } from 'framer-motion';
import { usePortfolio } from '../../../../store/PortfolioContext';
import { getAccountBalance } from '../utils/account-balance-utils';
import type { WalletAccount } from '../../../../types/index';

interface AccountContactListProps {
  activeTab: string;
  accounts: WalletAccount[];
  contacts: any[]; // Define a proper type for contacts if possible
  portfolioValue: any;
  currentNetwork: any;
  setToAddress: (address: string) => void;
  onGoBack: () => void;
}

const AccountContactList: React.FC<AccountContactListProps> = ({
  activeTab,
  accounts,
  contacts,
  portfolioValue,
  currentNetwork,
  setToAddress,
  onGoBack,
}) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="space-y-3 mb-8"
    >
      {activeTab === 'accounts' ? (
        // Show accounts
        accounts.length > 0 ? accounts.map((account, index) => {
          const accountBalance = getAccountBalance(account, portfolioValue, currentNetwork);
          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setToAddress(account.addresses?.[currentNetwork?.id || 'ethereum'])}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-[13px]">
                    {account?.name || `Account ${account?.id || '1'}`}
                  </div>
                  <div className="text-[13px] text-gray-600">
                    {(() => {
                      const addressToDisplay = account?.addresses?.[currentNetwork?.id || 'ethereum'];
                      return addressToDisplay
                        ? `${addressToDisplay.substring(0, 6)}...${addressToDisplay.substring(addressToDisplay.length - 4)}`
                        : 'No address';
                    })()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium text-gray-900 text-[13px]">
                  ${accountBalance.usdValue.toFixed(2)}
                </div>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-[#180CB2] rounded-full"></div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-[13px]">No accounts found</div>
            <div className="text-gray-400 text-[12px] mt-1">Create an account to get started</div>
          </div>
        )
      ) : (
        // Show contacts
        contacts.length > 0 ? (
          contacts.map((contact, index) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setToAddress(contact.address)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-[13px]">
                    {contact.name}
                  </div>
                  <div className="text-[13px] text-gray-600">
                    {contact.address
                      ? `${contact.address.substring(0, 6)}...${contact.address.substring(contact.address.length - 4)}`
                      : 'No address'
                    }
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium text-gray-900 text-[13px]">
                  {contact.network || 'Unknown'}
                </div>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-[13px] mb-4">No contacts found</div>
            <button
              onClick={onGoBack}
              className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors text-[13px]"
            >
              Go to Dashboard
            </button>
          </div>
        )
      )}
    </motion.div>
  );
};

export default AccountContactList;
