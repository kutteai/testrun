import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Download, Check } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const ReceiveScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { currentNetwork } = useNetwork();
  const [copied, setCopied] = useState(false);

  // Simple QR code placeholder (you can replace with actual QR library)
  const QRCodePlaceholder: React.FC<{ value: string; size: number }> = ({ value, size }) => (
    <div 
      className="bg-white border-2 border-gray-300 flex items-center justify-center text-xs text-gray-600 p-4"
      style={{ width: size, height: size }}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">📱</div>
        <div>QR Code</div>
        <div className="text-xs mt-1 break-all">{value.slice(0, 20)}...</div>
      </div>
    </div>
  );

  // Generate QR code data for cryptocurrency addresses
  const generateQRCode = (address: string): string => {
    if (!currentNetwork) {
      return address;
    }
    
    // Create a proper QR code data string for cryptocurrency addresses
    const networkPrefix = currentNetwork.symbol?.toLowerCase() || 'eth';
    return `${networkPrefix}:${address}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!wallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!wallet?.address) return;
    
    try {
      // Create a simple text file with the address since we don't have QR generation
      const content = `Wallet Address: ${wallet.address}\nNetwork: ${currentNetwork?.name || 'Unknown'}\nSymbol: ${currentNetwork?.symbol || 'Unknown'}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `wallet-address-${currentNetwork?.name || 'unknown'}.txt`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Address information downloaded');
    } catch (error) {
      console.error('Error downloading address info:', error);
      toast.error('Failed to download address information');
    }
  };

  // Share address
  const shareAddress = async () => {
    if (!wallet?.address) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentNetwork?.name || 'Wallet'} Address`,
          text: `My wallet address: ${wallet.address}`,
          url: `${currentNetwork?.symbol?.toLowerCase() || 'eth'}:${wallet.address}`
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      copyAddress();
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!wallet?.address) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No wallet found</div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Receive {currentNetwork?.symbol || 'Crypto'}
          </h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* QR Code */}
        <div className="p-6 bg-white rounded-xl text-center">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Address</h2>
            <p className="text-sm text-gray-600">
              Share this address to receive {currentNetwork?.symbol || 'crypto'} and other tokens
            </p>
          </div>
          
          {/* QR Code Display - Using placeholder until QR library is properly installed */}
          <div className="mx-auto mb-4 w-48 h-48 bg-white rounded-lg flex items-center justify-center border">
            <QRCodePlaceholder 
              value={wallet.address} 
              size={192}
            />
          </div>

          {/* Address Display */}
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <div className="text-sm text-gray-600 mb-1">Wallet Address</div>
            <div className="font-mono text-sm text-gray-900 break-all">
              {wallet.address}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyAddress}
              className="flex flex-col items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600 mb-1" />
              ) : (
                <Copy className="w-5 h-5 text-blue-600 mb-1" />
              )}
              <span className="text-xs text-gray-700">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadQRCode}
              className="flex flex-col items-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
            >
              <Download className="w-5 h-5 text-green-600 mb-1" />
              <span className="text-xs text-gray-700">Download</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={shareAddress}
              className="flex flex-col items-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <Share2 className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-gray-700">Share</span>
            </motion.button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">
            How to receive {currentNetwork?.symbol || 'crypto'}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Share your address with the sender</li>
            <li>• They can scan the QR code or copy the address</li>
            <li>• Transactions typically confirm in 1-5 minutes</li>
            <li>• You'll see the balance update automatically</li>
          </ul>
        </div>

        {/* Network Info */}
        {currentNetwork && (
          <div className="p-4 bg-white rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Network Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium text-gray-900">{currentNetwork.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chain ID:</span>
                <span className="font-medium text-gray-900">{currentNetwork.chainId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium text-gray-900">{currentNetwork.symbol}</span>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-4 bg-yellow-50 rounded-xl">
          <h3 className="font-semibold text-yellow-900 mb-2">Security Tips</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Only share this address with trusted sources</li>
            <li>• Double-check the network before receiving tokens</li>
            <li>• Never share your private key or seed phrase</li>
            <li>• This address is safe to share publicly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReceiveScreen;