import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Download, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import { copyToClipboardWithFeedback } from '../../utils/clipboard-utils';
import type { ScreenProps } from '../../types/index';

const ReceiveScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, currentNetwork, isWalletUnlocked, isLoading, isInitializing, getCurrentAccount } = useWallet();
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(200);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('ReceiveScreen Debug:', {
      hasWallet: !!wallet,
      walletAddress: wallet?.address,
      isWalletUnlocked,
      isLoading,
      isInitializing,
      currentNetwork: currentNetwork?.id
    });
  }, [wallet, isWalletUnlocked, isLoading, isInitializing, currentNetwork]);

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in ReceiveScreen:', event.detail);
      // ReceiveScreen will automatically update when wallet state changes
      // since it uses wallet from context directly
    };

    const handleAccountSwitched = async (event: CustomEvent) => {
      console.log('🔄 Account switched event received in ReceiveScreen:', event.detail);
      // ReceiveScreen will automatically update when account changes
      // since it uses wallet from context directly
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    window.addEventListener('accountSwitched', handleAccountSwitched as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
      window.removeEventListener('accountSwitched', handleAccountSwitched as EventListener);
    };
  }, []);

  // Listen for network changes to refresh current account
  useEffect(() => {
    const handleNetworkChange = async (event: CustomEvent) => {
      console.log('🔄 Network changed event received in ReceiveScreen:', event.detail);
      // Refresh current account when network changes
      try {
        const currentAccount = await getCurrentAccount();
        if (currentAccount) {
          console.log('✅ Updated current account for ReceiveScreen:', currentAccount);
        }
      } catch (error) {
        console.error('Error refreshing account on network change:', error);
      }
    };

    window.addEventListener('networkChanged', handleNetworkChange as EventListener);
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
    };
  }, [getCurrentAccount]);

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
    
    const success = await copyToClipboardWithFeedback(
      wallet.address,
      'Address copied to clipboard',
      'Failed to copy address'
    );
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQRCode = () => {
    if (!wallet?.address) return;
    
    // Get the QR code SVG element
    const qrElement = document.querySelector('#qr-code-svg');
    if (!qrElement) {
      toast.error('QR code not found');
      return;
    }
    
    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 200;
    canvas.height = 200;
    
    // Create a new image from the SVG
    const svgData = new XMLSerializer().serializeToString(qrElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      // Draw the QR code on canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      
      // Add the address text below
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PayCio Address', 100, 190);
      
      // Download
      const link = document.createElement('a');
      link.download = 'paycio-address-qr.png';
      link.href = canvas.toDataURL();
      link.click();
      
      // Clean up
      URL.revokeObjectURL(svgUrl);
    };
    
    img.onerror = () => {
      toast.error('Failed to generate QR code image');
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
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
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
          <div className="text-gray-600 mb-4 text-[13px]">Loading wallet...</div>
          <div className="text-[13px] text-gray-500">
            Debug: isLoading={isLoading}, isInitializing={isInitializing}
          </div>
        </div>
      </div>
    );
  }

  // Check if wallet exists
  if (!wallet) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4 text-[13px]">No wallet found</div>
          <button
            onClick={() => onNavigate('welcome')}
            className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
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
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4 text-[13px]">
            {!wallet?.address ? 'Wallet not properly initialized' : 'Wallet is locked'}
          </div>
          <div className="text-[13px] text-gray-500 mb-4">
            Debug: isWalletUnlocked={isWalletUnlocked?.toString()}, hasAddress={!!wallet?.address}
          </div>
          <button
            onClick={onGoBack}
            className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-[13px]">Error: {error}</div>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Receive</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentNetwork?.id === 'bitcoin' ? 'bg-orange-500' : 
                  currentNetwork?.id === 'ethereum' ? 'bg-blue-500' :
                  currentNetwork?.id === 'solana' ? 'bg-purple-500' :
                  currentNetwork?.id === 'tron' ? 'bg-red-500' :
                  currentNetwork?.id === 'ton' ? 'bg-blue-400' :
                  currentNetwork?.id === 'xrp' ? 'bg-blue-300' :
                  currentNetwork?.id === 'litecoin' ? 'bg-gray-400' :
                  'bg-gray-500'
                }`}></div>
                <p className="text-gray-600 text-[13px]">
                  {currentNetwork?.name || 'Select Network'}
                </p>
              </div>
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
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Your Address</h2>
            <p className="text-gray-600 text-[13px]">
              Share this QR code or address to receive {currentNetwork?.symbol  }
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
                <span className="text-[13px] font-mono">{formatAddress(wallet?.address || '')}</span>
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
              <span className="text-[13px] font-medium">Share</span>
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
              <span className="text-[13px] font-medium">Download</span>
            </div>
          </motion.button>
        </div>

        {/* Network Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Network</p>
              <p className="text-slate-400 text-[13px]">{currentNetwork?.name || 'Ethereum'}</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium">Symbol</p>
              <p className="text-slate-400 text-[13px]">{currentNetwork?.symbol || 'ETH'}</p>
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
              <h3 className="text-[13px] font-medium text-blue-300 mb-1">Security Note</h3>
              <p className="text-blue-200 text-[13px]">
                Only send {currentNetwork?.symbol || 'ETH'} to this address. Sending other cryptocurrencies may result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    );
  } catch (err) {
    console.error('ReceiveScreen Error:', err);
    setError(err instanceof Error ? err.message : 'Unknown error occurred');
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-[13px]">Error: {err instanceof Error ? err.message : 'Unknown error occurred'}</div>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
};

export default ReceiveScreen; 