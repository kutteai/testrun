import React from 'react';

interface HeaderProps {
  title?: string;
  onGoBack?: () => void;
  showWalletDropdown?: boolean;
  showNetworkDropdown?: boolean;
  hideBackButton?: boolean;
  rightContent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title = 'Static Header' }) => {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      {/* Static content for right side */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm">UI</div>
      </div>
    </header>
  );
};

export default Header; 