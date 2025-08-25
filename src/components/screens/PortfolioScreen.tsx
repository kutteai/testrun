import React from 'react';
import type { ScreenProps } from '../../types/index';

interface PortfolioScreenProps extends ScreenProps {}

const PortfolioScreen: React.FC<PortfolioScreenProps> = () => {
  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Portfolio</h2>
        <p className="text-gray-600">Portfolio screen coming soon...</p>
      </div>
    </div>
  );
};

export default PortfolioScreen; 