import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Download, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const ReceiveScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork, isWalletUnlocked, isLoading, isInitializing } = useWallet();
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Check if wallet is loading or initializing
  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-slate-400 mb-4">Loading wallet...</div>
          <div className="text-xs text-slate-500 mb-4">
            Debug: isLoading={isLoading?.toString()}, isInitializing={isInitializing?.toString()}
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if wallet exists
  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 mb-4">No wallet found</div>
          <button
            onClick={() => onNavigate('welcome')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            Create Wallet
          </button>
        </div>
      </div>
    );
  }

  // Check if wallet is locked or has no address
  if (!isWalletUnlocked || !wallet?.address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            {!wallet?.address ? 'Wallet not properly initialized' : 'Wallet is locked'}
          </div>
          <div className="text-xs text-slate-500 mb-4">
            Debug: isWalletUnlocked={isWalletUnlocked?.toString()}, hasAddress={!!wallet?.address}
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Receive</h1>
              <p className="text-slate-400 text-sm">Get crypto</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6"
      >
        {/* QR Code */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold mb-2">Your Address</h2>
            <p className="text-slate-400 text-sm">
              Share this QR code or address to receive {currentNetwork?.symbol || 'ETH'}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={getQRCodeData()}
                size={qrSize}
                level="M"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Address */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm font-mono">{formatAddress(wallet?.address || '')}</span>
              </div>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={shareAddress}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
          >
            <div className="flex items-center justify-center space-x-2">
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadQRCode}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
          >
            <div className="flex items-center justify-center space-x-2">
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">Download</span>
            </div>
          </motion.button>
        </div>

        {/* Network Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Network</p>
              <p className="text-slate-400 text-sm">{currentNetwork?.name || 'Ethereum'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Symbol</p>
              <p className="text-slate-400 text-sm">{currentNetwork?.symbol || 'ETH'}</p>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-300 mb-1">Security Note</h3>
              <p className="text-blue-200 text-sm">
                Only send {currentNetwork?.symbol || 'ETH'} to this address. Sending other cryptocurrencies may result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiveScreen; 