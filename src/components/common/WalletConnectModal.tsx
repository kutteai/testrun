import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Plus, Copy, Check, User, Shield } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import { WalletManager as CoreWalletManager } from '../../core/wallet-manager'; // Import CoreWalletManager

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletId: string, accountId: string) => void;
  requestNetwork?: string;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect,
  requestNetwork
}) => {
  const { currentWallet, getWalletAccounts, getCurrentAccount } = useWallet();
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const coreWalletManager = new CoreWalletManager(); // Instantiate CoreWalletManager

  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen]);

  const loadWallets = async () => {
    try {
      const allWallets = await coreWalletManager.getAllWallets();
      const walletsWithAccounts = await Promise.all(allWallets.map(async (w: any) => {
        const accounts = await coreWalletManager.getWalletAccounts(w.id);
        return {
          id: w.id,
          name: w.name,
          address: w.address, // Assuming wallet object also has a main address field
          network: w.currentNetwork, // Assuming wallet object also has a currentNetwork field
          accounts: accounts,
        };
      }));
      setWallets(walletsWithAccounts);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load wallets:', error);
    }
  };

  const handleWalletSelect = (wallet: any) => {
    setSelectedWallet(wallet);
    setSelectedAccount(null);
  };

  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
  };

  const handleConnect = () => {
    if (selectedWallet && selectedAccount && currentWallet) {
      onWalletSelect(selectedWallet.id, selectedAccount.id);
      onClose();
    } else {
      toast.error('Please select a wallet and account');
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

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(4);
  };

  const isNetworkCompatible = (walletNetwork: string) => {
    if (!requestNetwork) return true;
    return walletNetwork === requestNetwork;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg mx-4 border border-white/20 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Network Request Info */}
              {requestNetwork && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-blue-400 font-medium">Network Request</span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">
                    This dApp is requesting to connect to the {requestNetwork} network.
                  </p>
                </div>
              )}

              {/* Wallets List */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Select Wallet</h4>
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <motion.div
                      key={wallet.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleWalletSelect(wallet)}
                      className={`p-4 bg-white/10 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedWallet?.id === wallet.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white/20 hover:border-white/30'
                      } ${!isNetworkCompatible(wallet.network) ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedWallet?.id === wallet.id ? 'bg-blue-500/20' : 'bg-white/10'
                          }`}>
                            <Wallet className={`w-5 h-5 ${selectedWallet?.id === wallet.id ? 'text-blue-400' : 'text-white'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{selectedWallet.name}</h3>
                            <p className="text-slate-400 text-sm">{formatAddress(selectedWallet.address)}</p>
                            <p className="text-slate-500 text-xs">Network: {selectedWallet.network}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedWallet?.id === wallet.id && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                          {!isNetworkCompatible(wallet.network) && (
                            <span className="text-xs text-red-400">Incompatible</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Accounts List */}
              {selectedWallet && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Select Account</h4>
                  <div className="space-y-3">
                    {selectedWallet.accounts.map((account: any, index: number) => (
                      <motion.div
                        key={account.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAccountSelect(account)}
                        className={`p-4 bg-white/10 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAccount?.id === account.id
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-white/20 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedAccount?.id === account.id ? 'bg-green-500/20' : 'bg-white/10'
                            }`}>
                              <User className={`w-5 h-5 ${selectedAccount?.id === account.id ? 'text-green-400' : 'text-white'}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">Account {index + 1}</h3>
                              <p className="text-slate-400 text-sm">{formatAddress(account.addresses[requestNetwork || selectedWallet?.network || 'ethereum'] || Object.values(account.addresses)[0])}</p>
                              <p className="text-slate-500 text-xs">
                                Balance: {formatBalance(account.balance || '0')} {selectedWallet.network}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedAccount?.id === account.id && (
                              <Check className="w-5 h-5 text-green-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const addressToCopy = account.addresses[requestNetwork || selectedWallet?.network || 'ethereum'] || Object.values(account.addresses)[0];
                                if (addressToCopy) {
                                  copyAddress(addressToCopy);
                                }
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              {copied === (account.addresses[requestNetwork || selectedWallet?.network || 'ethereum'] || Object.values(account.addresses)[0]) ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Wallets Message */}
              {wallets.length === 0 && (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-400">No wallets available</p>
                  <p className="text-slate-500 text-sm">Create or import a wallet to connect</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex space-x-3 mt-6 pt-4 border-t border-white/10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnect}
                disabled={!selectedWallet || !selectedAccount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedWallet && selectedAccount
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                Connect
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalletConnectModal; 