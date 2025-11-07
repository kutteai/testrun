import React from 'react';

const NetworkSwitcher: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Ethereum</span>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    </div>
  );
};

export default NetworkSwitcher;