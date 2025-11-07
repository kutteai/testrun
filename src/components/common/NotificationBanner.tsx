import React from 'react';

interface NotificationBannerProps {
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ message = 'Static Notification Message', type = 'info' }) => {
  const bgColor = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }[type];

  return (
    <div className={`p-3 text-white text-sm flex items-center justify-between ${bgColor}`}>
      <span>{message}</span>
      <button className="ml-4 text-white/75 hover:text-white">×</button>
    </div>
  );
};

export default NotificationBanner; 