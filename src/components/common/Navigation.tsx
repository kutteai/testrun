import React from 'react';

interface NavigationProps {
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
}

const Navigation: React.FC<NavigationProps> = () => {
  return (
    <nav className="flex justify-around items-center bg-white border-t border-gray-200 p-3 shadow-lg">
      <div className="flex flex-col items-center text-gray-500">
        <span className="text-xs">Home</span>
      </div>
      <div className="flex flex-col items-center text-gray-500">
        <span className="text-xs">Settings</span>
      </div>
      <div className="flex flex-col items-center text-gray-500">
        <span className="text-xs">About</span>
      </div>
    </nav>
  );
};

export default Navigation; 