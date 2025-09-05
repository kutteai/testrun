import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit,
  X,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const ManageWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [walletName, setWalletName] = useState('Wallet 1');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { wallet } = useWallet();

  // Load wallet from storage
  const loadWalletFromStorage = async (): Promise<any> => {
    try {
      const existingWallet = await storage.get(['wallet']);
      return existingWallet.wallet || null;
    } catch (error) {
      console.error('Failed to load wallet from storage:', error);
      return null;
    }
  };

  // Save wallet to storage
  const saveWalletToStorage = async (wallet: any): Promise<void> => {
    try {
      await storage.set({ wallet });
    } catch (error) {
      console.error('Failed to save wallet to storage:', error);
    }
  };

  // Save wallet names to storage
  const saveWalletNamesToStorage = async (names: Record<string, string>): Promise<void> => {
    try {
      await storage.set({
        walletNames: names
      });
    } catch (error) {
      console.error('Failed to save wallet names to storage:', error);
    }
  };

  const handleUpdateWalletName = async () => {
    if (!walletName.trim()) return;
    
    setIsUpdating(true);
    setUpdateStatus('updating');
    setErrorMessage('');

    try {
      // Update wallet name in Chrome storage
      const existingWallet = await storage.get(['wallet']);
      if (existingWallet.wallet) {
        const updatedWallet = {
          ...existingWallet.wallet,
          name: walletName.trim()
        };
        
        // Save updated wallet to storage
        await saveWalletToStorage(updatedWallet);
        
        // Also save to wallet names storage for persistence
        await saveWalletNamesToStorage({
          ...(await storage.get(['walletNames'])).walletNames,
          [updatedWallet.id]: walletName.trim()
        });
        
        toast.success('Wallet name updated successfully!');
        setUpdateStatus('success');
        
        // Close modal after success
        setTimeout(() => {
          setShowChangeNameModal(false);
          setUpdateStatus('idle');
        }, 1500);
        
      } else {
        throw new Error('No wallet found');
      }
    } catch (error) {
      console.error('Failed to update wallet name:', error);
      setErrorMessage('Failed to update wallet name. Please try again.');
      setUpdateStatus('error');
      toast.error('Failed to update wallet name. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('wallet-details')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Manage wallet
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white px-6 py-6">
        {/* Wallet Name Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <label className="block text-sm text-gray-600 mb-2">Wallet name</label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">{walletName}</span>
            <button 
              onClick={() => setShowChangeNameModal(true)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Edit className="w-4 h-4 text-[#180CB2]" />
            </button>
          </div>
        </motion.div>

        {/* Other wallet management options can be added here */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Placeholder for future wallet management features */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-center">More wallet management features coming soon...</p>
          </div>
        </motion.div>
      </div>

      {/* Change Wallet Name Modal */}
      {showChangeNameModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-80 mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change wallet name</h3>
              <button
                onClick={() => setShowChangeNameModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet name
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowChangeNameModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWalletName}
                disabled={!walletName.trim() || isUpdating}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  walletName.trim() && !isUpdating
                    ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : updateStatus === 'success' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Updated!</span>
                  </div>
                ) : (
                  'Update'
                )}
              </button>
            </div>
            
            {/* Error Message */}
            {updateStatus === 'error' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Update Failed</p>
                    <p className="text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ManageWalletScreen;
