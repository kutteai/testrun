import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import type { ScreenProps } from '../../types/index';
import TokenManagementPanel from '../common/TokenManagementPanel';

const TokensScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, currentNetwork } = useWallet();

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Manage crypto</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Token Management Panel */}
      <div className="flex-1 p-4">
        {wallet?.accounts?.[0]?.id && (
          <TokenManagementPanel
            accountId={wallet.accounts[0].id}
            currentNetwork={currentNetwork?.id || 'ethereum'}
          />
        )}
      </div>
    </div>
  );
};

export default TokensScreen;