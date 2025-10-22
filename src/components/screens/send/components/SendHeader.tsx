import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNetwork } from '../../../../store/NetworkContext';
import { getNetworkName } from '../utils/send-utils';
import type { ScreenProps } from '../../../../types/index';

interface SendHeaderProps extends ScreenProps {
  currentNetwork: any;
}

const SendHeader: React.FC<SendHeaderProps> = ({ onNavigate, onGoBack, currentNetwork }) => {
  return (
    <div className="bg-[#180CB2] text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold">Send</h1>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <div className={`w-4 h-4 rounded-full ${
              currentNetwork?.id === 'bitcoin' ? 'bg-orange-500'
                : currentNetwork?.id === 'ethereum' ? 'bg-blue-500'
                  : currentNetwork?.id === 'solana' ? 'bg-purple-500'
                    : currentNetwork?.id === 'tron' ? 'bg-red-500'
                      : currentNetwork?.id === 'ton' ? 'bg-blue-400'
                        : currentNetwork?.id === 'xrp' ? 'bg-blue-300'
                          : currentNetwork?.id === 'litecoin' ? 'bg-gray-400'
                            : 'bg-gray-500'
            }`}></div>
            <span className="text-xs text-white/80">
              {currentNetwork?.name || getNetworkName(currentNetwork?.chainId || '0x1')}
            </span>
          </div>
        </div>
        <div className="w-10"></div>
      </div>
    </div>
  );
};

export default SendHeader;




