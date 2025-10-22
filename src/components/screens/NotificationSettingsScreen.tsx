import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import type { ScreenProps } from '../../types/index';

const NotificationSettingsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getWalletAccounts } = useWallet();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [accountActivity, setAccountActivity] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountNotifications, setAccountNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadAccounts = async () => {
      if (wallet) {
        try {
          const walletAccounts = await getWalletAccounts();
          setAccounts(walletAccounts);
          
          // Initialize account notifications (all enabled by default)
          const initialAccountNotifications: Record<string, boolean> = {};
          walletAccounts.forEach(account => {
            initialAccountNotifications[account.id] = true;
          });
          setAccountNotifications(initialAccountNotifications);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load accounts:', error);
        }
      }
    };

    loadAccounts();
  }, [wallet, getWalletAccounts]);

  const handleAccountNotificationToggle = (accountId: string) => {
    setAccountNotifications(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const formatAddress = (address: string) => {
    if (!address) return 'No address';
    return `${address.substring(0, 6)}...${address.substring(address.length - 5)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('notifications')}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-semibold">Notification Settings</h1>
          
          <div className="w-6"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Enable Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-[13px] mb-2">
                  Enable notifications
                </h3>
                <p className="text-gray-600 text-[13px] leading-relaxed">
                  Stay updated on what's happening in your Paycio Wallet with real-time notifications. 
                  When enabled, your profile helps sync preferences securely across your devices.
                </p>
                <button className="text-[#180CB2] text-[13px] mt-2 hover:underline">
                  [Learn how we protect your privacy with this feature]
                </button>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-[#180CB2]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200"></div>

          {/* Customize Notifications Section */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-[13px] mb-2">
                Customize your notifications
              </h3>
              <p className="text-gray-600 text-[13px]">
                Choose the types of updates you want to receive:
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-900 text-[13px]">Product updates</span>
              <button
                onClick={() => setProductUpdates(!productUpdates)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  productUpdates ? 'bg-[#180CB2]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    productUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200"></div>

          {/* Account Activity Section */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-[13px] mb-2">
                Account activity
              </h3>
              <p className="text-gray-600 text-[13px]">
                Select the accounts you'd like to get notifications for:
              </p>
            </div>

            {accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#180CB2] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-900 text-[13px] font-medium">
                          {account.name || `Account ${account.id}`}
                        </p>
                        <p className="text-gray-500 text-[11px] font-mono">
                          {formatAddress(account.addresses[account.network || 'ethereum'] || Object.values(account.addresses)[0])}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAccountNotificationToggle(account.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accountNotifications[account.id] ? 'bg-[#180CB2]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accountNotifications[account.id] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-[13px]">No accounts found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationSettingsScreen;
