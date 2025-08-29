import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  Zap,
  Clock,
  AlertCircle,
  Users,
  Search,
  Globe,
  X
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { useTransaction } from '../../store/TransactionContext';
import { resolveENS, validateENSName } from '../../utils/ens-utils';
import { addressBook, Contact } from '../../utils/address-book';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const SendScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { networkState } = useNetwork();
  const { addTransaction } = useTransaction();
  
  const [toAddress, setToAddress] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [gasPrice, setGasPrice] = useState('20');
  const [gasLimit, setGasLimit] = useState('21000');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState('0');
  const [totalAmount, setTotalAmount] = useState('0');
  const [isResolving, setIsResolving] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [addressBookContacts, setAddressBookContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedENS, setResolvedENS] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load address book contacts
  useEffect(() => {
    const loadContacts = () => {
      const contacts = addressBook.getAllContacts();
      setAddressBookContacts(contacts);
    };
    loadContacts();
  }, []);

  // Validate and resolve ENS names
  useEffect(() => {
    const validateAndResolve = async () => {
      if (!toAddress.trim()) {
        setIsValidAddress(false);
        setResolvedAddress('');
        setResolvedENS(null);
        return;
      }

      // Check if it's an ENS name
      if (toAddress.includes('.eth') || toAddress.includes('.crypto')) {
        setIsResolving(true);
        try {
          const resolved = await resolveENS(toAddress);
          if (resolved) {
            setResolvedAddress(resolved);
            setResolvedENS(toAddress);
            setIsValidAddress(true);
          } else {
            setIsValidAddress(false);
            setResolvedAddress('');
            setResolvedENS(null);
            toast.error('ENS name not found or invalid');
          }
        } catch (error) {
          setIsValidAddress(false);
          setResolvedAddress('');
          setResolvedENS(null);
          toast.error('Failed to resolve ENS name');
        } finally {
          setIsResolving(false);
        }
      } else {
        // Validate as regular address
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        const isValid = ethAddressRegex.test(toAddress);
        setIsValidAddress(isValid);
        setResolvedAddress(isValid ? toAddress : '');
        setResolvedENS(null);
      }
    };

    const debounceTimer = setTimeout(validateAndResolve, 500);
    return () => clearTimeout(debounceTimer);
  }, [toAddress]);

  useEffect(() => {
    // Calculate estimated fee and total
    const gasPriceNum = parseFloat(gasPrice) || 0;
    const gasLimitNum = parseFloat(gasLimit) || 21000;
    const amountNum = parseFloat(amount) || 0;
    
    const fee = (gasPriceNum * gasLimitNum) / 1e9; // Convert from Gwei to ETH
    const total = amountNum + fee;
    
    setEstimatedFee(fee.toFixed(6));
    setTotalAmount(total.toFixed(6));
  }, [gasPrice, gasLimit, amount]);

  const handleSend = async () => {
    if (!isValidAddress || !resolvedAddress) {
      toast.error('Please enter a valid address or ENS name');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (parseFloat(totalAmount) > parseFloat(wallet?.balance || '0')) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      // In a real implementation, you would send the actual transaction
      // For now, we'll create a placeholder transaction
      const transaction = {
        id: Date.now().toString(),
        hash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Placeholder hash
        from: wallet?.address || '',
        to: resolvedAddress,
        value: amount,
        amount: amount,
        network: networkState.currentNetwork?.symbol || 'ETH',
        type: 'send' as const,
        status: 'pending' as const,
        timestamp: Date.now(),
        nonce: 0,
        ensName: resolvedENS || undefined
      };

      addTransaction(transaction);
      toast.success('Transaction created! (Real implementation needed)');
      onNavigate('dashboard');
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const selectContact = (contact: Contact) => {
    setToAddress(contact.ens || contact.domain || contact.address);
    setShowAddressBook(false);
    setSearchQuery('');
  };

  const filteredContacts = addressBookContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.ens?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(4);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
          <h1 className="text-xl font-bold">Send</h1>
          <button
            onClick={() => setShowAddressBook(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Users className="w-6 h-6" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Available Balance</p>
              <p className="text-2xl font-bold">{formatBalance(wallet?.balance || '0')} {networkState.currentNetwork?.symbol || 'ETH'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6"
      >
        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium mb-2">Recipient Address</label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x... or ENS name (.eth, .crypto, .x, .sol)"
              className={`w-full px-4 py-3 bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                toAddress && !isValidAddress ? 'border-red-400' : 'border-white/20'
              }`}
            />
            {toAddress && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                {isResolving ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : isValidAddress ? (
                  <div className="flex items-center space-x-1">
                    {resolvedENS && <Globe className="w-4 h-4 text-green-400" />}
                    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                  </div>
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
            <button
              onClick={() => setShowAddressBook(true)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              <Users className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          {/* ENS Resolution Display */}
          {resolvedENS && resolvedAddress && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">
                  {resolvedENS} → {formatAddress(resolvedAddress)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              min="0"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-slate-400 text-sm">{networkState.currentNetwork?.symbol || 'ETH'}</span>
            </div>
          </div>
        </div>

        {/* Gas Settings */}
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Gas Settings</h3>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gas Price (Gwei)</label>
              <input
                type="number"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                placeholder="20"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gas Limit</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                placeholder="21000"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-3">Transaction Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Amount</span>
              <span>{amount || '0'} {networkState.currentNetwork?.symbol || 'ETH'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Network Fee</span>
              <span>{estimatedFee} {networkState.currentNetwork?.symbol || 'ETH'}</span>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{totalAmount} {networkState.currentNetwork?.symbol || 'ETH'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-2">Wallet Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your wallet password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={isLoading || !isValidAddress || !amount || !password || isResolving}
          className={`w-full py-4 rounded-xl font-semibold transition-all ${
            isLoading || !isValidAddress || !amount || !password || isResolving
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Sending...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Send Transaction</span>
            </div>
          )}
        </motion.button>
      </motion.div>

      {/* Address Book Modal */}
      {showAddressBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Address Book</h3>
                <button
                  onClick={() => setShowAddressBook(false)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-400">No contacts found</p>
                  <p className="text-slate-500 text-sm">Add contacts to get started</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectContact(contact)}
                    className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{contact.name}</p>
                          {contact.ens && (
                            <p className="text-sm text-blue-400">{contact.ens}</p>
                          )}
                          {!contact.ens && (
                            <p className="text-sm text-slate-400">
                              {formatAddress(contact.address)}
                            </p>
                          )}
                        </div>
                      </div>
                      {contact.isFavorite && (
                        <div className="text-yellow-400">★</div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SendScreen;