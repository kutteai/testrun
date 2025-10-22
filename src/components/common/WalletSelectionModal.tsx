import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Wallet, User, Globe } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { WalletAccount } from '../../types/index';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletId: string, accountId: string, address: string) => void;
  requestNetwork?: string;
}

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect,
  requestNetwork
}) => {
  const { wallet, getWalletAccounts, getCurrentAccount } = useWallet();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      if (wallet) {
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        
        // Set the current account as default selection
        const currentAccount = await getCurrentAccount();
        if (currentAccount) {
          setSelectedAccount(currentAccount);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load accounts:', error);
      toast.error('Failed to load accounts');
    }
  };

  const handleAccountSelect = (account: WalletAccount) => {
    setSelectedAccount(account);
  };

  const handleConnect = () => {
    if (selectedAccount && wallet) {
      // Get the address for the current network or first available address
      const address = selectedAccount.addresses[wallet.currentNetwork] || 
                     Object.values(selectedAccount.addresses)[0];
      
      if (address) {
        onWalletSelect(wallet.id, selectedAccount.id, address);
        onClose();
      } else {
        toast.error('No address available for this account');
      }
    } else {
      toast.error('Please select an account');
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getAccountAddress = (account: WalletAccount) => {
    if (!account) return null;
    
    // If account has addresses object, get address for current network
    if (account.addresses && wallet?.currentNetwork) {
      return account.addresses[wallet.currentNetwork] || 
             account.addresses[wallet.currentNetwork] || 
             Object.values(account.addresses)[0];
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#180CB2]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Account</h3>
                <p className="text-sm text-gray-500">Choose which account to connect</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Wallet Info */}
          {wallet && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#180CB2]/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#180CB2]" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{wallet.name}</h4>
                  <p className="text-sm text-gray-500">
                    {wallet.currentNetwork ? wallet.currentNetwork.charAt(0).toUpperCase() + wallet.currentNetwork.slice(1) : 'Ethereum'} Network
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-700">Available Accounts</h4>
            {accounts.map((account) => {
              const address = getAccountAddress(account);
              const isSelected = selectedAccount?.id === account.id;
              
              return (
                <motion.div
                  key={account.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#180CB2] bg-[#180CB2]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-[#180CB2]/20' : 'bg-gray-100'
                      }`}>
                        <User className={`w-4 h-4 ${isSelected ? 'text-[#180CB2]' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{account.name}</h5>
                        {address && (
                          <p className="text-sm text-gray-500 font-mono">{formatAddress(address)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {address && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(address);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          {copied === address ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      )}
                      {isSelected && (
                        <div className="w-6 h-6 bg-[#180CB2] rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={!selectedAccount}
              className="flex-1 px-4 py-3 bg-[#180CB2] text-white rounded-xl hover:bg-[#140a8f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WalletSelectionModal;


