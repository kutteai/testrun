import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const EnableNotificationsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const handleEnableNotifications = () => {
    // Here you would implement the actual notification permission request
    // For now, we'll just navigate to the notification settings
    onNavigate('notification-settings');
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
            onClick={() => onNavigate('notification-settings')}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-semibold">Enable Notifications</h1>
          
          <div className="w-6"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl overflow-y-auto">
        <div className="p-6">
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[#180CB2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#180CB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 7h5l-5-5v5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Never miss important updates
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-[13px] leading-relaxed">
                Never miss important updates in your Paycio Wallet. Get notified about transactions, 
                security alerts, and account activity instantly.
              </p>
              
              <p className="text-gray-600 text-[13px] leading-relaxed">
                Notifications are linked to your profile, so your preferences stay in sync across 
                all your devices.
              </p>
              
              <button className="text-[#180CB2] text-[13px] hover:underline">
                [See how Paycio keeps your data private.]
              </button>
              
              <p className="text-gray-600 text-[13px] leading-relaxed">
                You can disable notifications anytime from the Notification Settings.
              </p>
            </div>

            <div className="pt-8">
              <button
                onClick={handleEnableNotifications}
                className="w-full py-4 bg-[#180CB2] text-white rounded-lg font-semibold text-[13px] hover:bg-[#140a8f] transition-colors"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnableNotificationsScreen;
