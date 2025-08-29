import React, { useState, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import { useTransaction } from '../../store/TransactionContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const SendScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { networkState } = useNetwork();
  const { addTransaction } = useTransaction();
  
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [gasPrice, setGasPrice] = useState('20');
  const [gasLimit, setGasLimit] = useState('21000');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState('0');
  const [totalAmount, setTotalAmount] = useState('0');

  // Validate Ethereum address
  const validateAddress = (address: string) => {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  };

  useEffect(() => {
    setIsValidAddress(validateAddress(toAddress));
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
    if (!isValidAddress) {
      toast.error('Please enter a valid address');
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
        to: toAddress,
        value: amount,
        amount: amount,
        network: networkState.currentNetwork?.symbol || 'ETH',
        type: 'send' as const,
        status: 'pending' as const,
        timestamp: Date.now(),
        nonce: 0
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

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(4);
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
          <div className="w-10"></div>
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
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className={`w-full px-4 py-3 bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                toAddress && !isValidAddress ? 'border-red-400' : 'border-white/20'
              }`}
            />
            {toAddress && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidAddress ? (
                  <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
          </div>
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
          disabled={isLoading || !isValidAddress || !amount || !password}
          className={`w-full py-4 rounded-xl font-semibold transition-all ${
            isLoading || !isValidAddress || !amount || !password
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
    </div>
  );
};

export default SendScreen; 