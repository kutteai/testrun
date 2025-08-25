import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Download, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const ReceiveScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork } = useWallet();
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(200);

  // Generate QR code data for wallet address
  const getQRCodeData = (): string => {
    if (!wallet?.address) return '';
    
    // Create a proper QR code data string for cryptocurrency addresses
    // This includes the network prefix for better wallet compatibility
    const networkPrefix = currentNetwork?.symbol?.toLowerCase() || 'eth';
    return `${networkPrefix}:${wallet.address}`;
  };

  useEffect(() => {
    if (wallet?.address) {
      setQrSize(200); // Ensure QR size is 200 for qrcode.react
    }
  }, [wallet?.address, currentNetwork?.symbol]);

  const copyAddress = async () => {
    if (!wallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const downloadQRCode = () => {
    if (!wallet?.address) return;
    
    // Create a canvas element to render the QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 200;
    canvas.height = 200;
    
    // For now, create a simple QR-like pattern
    // In a production app, you'd use a proper QR code library
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, 10, 180, 180);
    ctx.fillStyle = '#000';
    ctx.fillRect(20, 20, 160, 160);
    
    // Add the address text
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PayCio Address', 100, 190);
    
    // Download
    const link = document.createElement('a');
    link.download = 'paycio-address-qr.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const shareAddress = async () => {
    if (!wallet?.address) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PayCio Wallet Address',
          text: `My PayCio wallet address: ${wallet.address}`,
          url: `ethereum:${wallet.address}`
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      copyAddress();
    }
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
          <h1 className="text-lg font-semibold text-gray-900">Receive ETH</h1>
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
              Share this address to receive ETH and other ERC-20 tokens
            </p>
          </div>
          
          {/* QR Code Placeholder */}
          <div className="mx-auto mb-4 w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <QRCodeSVG value={getQRCodeData()} size={qrSize} />
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
          <h3 className="font-semibold text-blue-900 mb-2">How to receive ETH</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Share your address with the sender</li>
            <li>• They can scan the QR code or copy the address</li>
            <li>• Transactions typically confirm in 1-3 minutes</li>
            <li>• You'll see the balance update automatically</li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-yellow-50 rounded-xl">
          <h3 className="font-semibold text-yellow-900 mb-2">Security Tips</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Only share this address with trusted sources</li>
            <li>• Double-check the address before sharing</li>
            <li>• Never share your private key or seed phrase</li>
            <li>• This address is safe to share publicly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReceiveScreen; 