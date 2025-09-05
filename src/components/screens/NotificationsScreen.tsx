import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Bell } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

interface Notification {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'wallet' | 'web3' | 'product';
  isRead: boolean;
}

const NotificationsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'wallet' | 'web3'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sample notifications data (replace with real data later)
  const sampleNotifications: Notification[] = [
    {
      id: '1',
      title: 'New Dashboard, Smarter UX',
      description: 'Paycio just got a sleek multichain upgrade. Discover what\'s new today.',
      date: 'Aug 18',
      type: 'product',
      isRead: false
    },
    {
      id: '2',
      title: 'Sei is live on Paycio!',
      description: 'Trade, explore dApps, and more—all from Paycio.',
      date: 'Aug 18',
      type: 'web3',
      isRead: false
    },
    {
      id: '3',
      title: 'The Metal Card is here',
      description: 'Earn 3% cashback, enjoy no FX fees, and spend your crypto anywhere Mastercard is accepted. Presale ends 11 August.',
      date: 'Aug 18',
      type: 'product',
      isRead: false
    },
    {
      id: '4',
      title: 'Transaction Completed',
      description: 'Your ETH transfer of 0.5 ETH has been successfully completed.',
      date: 'Aug 17',
      type: 'wallet',
      isRead: true
    },
    {
      id: '5',
      title: 'New Token Added',
      description: 'USDC has been added to your portfolio.',
      date: 'Aug 16',
      type: 'wallet',
      isRead: true
    }
  ];

  useEffect(() => {
    // Simulate loading notifications
    const loadNotifications = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(sampleNotifications);
      setIsLoading(false);
    };

    loadNotifications();
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    return notification.type === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );
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
            onClick={() => onNavigate('dashboard')}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-semibold">Notifications</h1>
          
          <button
            onClick={() => onNavigate('notification-settings')}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white px-6 py-4">
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'wallet', label: 'Wallet' },
            { id: 'web3', label: 'Web3' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.id === 'all' && unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
              <p className="text-gray-600 text-[13px]">Loading notifications...</p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Nothing to see here</h3>
              <p className="text-gray-500 text-[13px]">
                You have not received any {activeFilter === 'all' ? '' : activeFilter} notification yet
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-[13px]">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-2">
                      {notification.description}
                    </p>
                    <p className="text-gray-400 text-[11px]">
                      {notification.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mark All as Read Button */}
        {filteredNotifications.length > 0 && unreadCount > 0 && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleMarkAllAsRead}
              className="w-full py-3 bg-[#180CB2] text-white rounded-lg font-medium text-[13px] hover:bg-[#140a8f] transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsScreen;
