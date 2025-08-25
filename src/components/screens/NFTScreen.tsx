import React from 'react';
import type { ScreenProps } from '../../types/index';

interface NFTScreenProps extends ScreenProps {}

const NFTScreen: React.FC<NFTScreenProps> = () => {
  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">NFTs</h2>
        <p className="text-gray-600">NFTs screen coming soon...</p>
      </div>
    </div>
  );
};

export default NFTScreen; 