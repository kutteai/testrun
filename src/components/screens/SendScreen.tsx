import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../store/WalletContext';
import { useTransaction } from '../../store/TransactionContext';
import { estimateGas } from '../../utils/web3-utils';
import { TransactionManager } from '../../core/transaction-manager';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const SendScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork } = useWallet();
  const { addTransaction } = useTransaction();
  const transactionManager = new TransactionManager();
  
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('21000');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState('0');
  const [balance, setBalance] = useState('0');
  const [password, setPassword] = useState('');

  // Load wallet balance
  useEffect(() => {
    if (wallet?.address) {
      loadBalance();
    }
  }, [wallet?.address]);

  // Validate address
  useEffect(() => {
    const isValid = ethers.isAddress(toAddress);
    setIsValidAddress(isValid);
  }, [toAddress]);

  // Estimate gas when address or amount changes
  useEffect(() => {
    if (isValidAddress && amount && parseFloat(amount) > 0) {
      estimateGasFee();
    } else {
      setEstimatedFee('0');
    }
  }, [toAddress, amount, gasPrice, gasLimit, isValidAddress]);

  const loadBalance = async () => {
    try {
      if (wallet?.address && currentNetwork) {
        const balance = await fetch(`https://mainnet.infura.io/v3/${window.CONFIG?.INFURA_PROJECT_ID || ''}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [wallet.address, 'latest'],
            id: 1
          })
        });
        
        const data = await balance.json();
        if (data.result) {
          const balanceInEth = ethers.formatEther(data.result);
          setBalance(balanceInEth);
        }
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const estimateGasFee = async () => {
    try {
      if (!wallet?.address || !isValidAddress || !amount) return;

      const gasEstimate = await estimateGas(
        wallet.address,
        toAddress,
        amount,
        '0x',
        currentNetwork?.id || 'ethereum'
      );

      const gasPriceWei = gasPrice ? ethers.parseUnits(gasPrice, 'gwei') : ethers.parseUnits('20', 'gwei');
      const fee = BigInt(gasEstimate) * gasPriceWei;
      setEstimatedFee(ethers.formatEther(fee));
      setGasLimit(gasEstimate.toString());
    } catch (error) {
      console.error('Error estimating gas:', error);
      setEstimatedFee('0');
    }
  };

  const handleSend = async () => {
    if (!isValidAddress || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid address and amount');
      return;
    }

    if (!password) {
      toast.error('Please enter your wallet password');
      return;
    }

    const totalAmount = parseFloat(amount) + parseFloat(estimatedFee);
    if (totalAmount > parseFloat(balance)) {
      toast.error('Insufficient balance for transaction and gas fees');
      return;
    }

    setIsLoading(true);

    try {
      const result = await transactionManager.sendTransaction({
        to: toAddress,
        value: amount,
        network: currentNetwork?.id || 'ethereum',
        gasPrice: gasPrice || undefined,
        gasLimit: gasLimit || undefined,
        data: '0x',
        password: password
      });
      
      // Add to transaction history
      addTransaction({
        hash: result.hash,
        from: wallet!.address,
        to: toAddress,
        value: amount,
        network: currentNetwork?.id || 'ethereum',
        status: 'pending',
        gasUsed: gasLimit,
        gasPrice: gasPrice || '20',
        nonce: 0 // Will be set by the wallet
      });

      toast.success('Transaction sent successfully!');
      onNavigate('dashboard');
    } catch (error) {
      console.error('Error sending transaction:', error);
      toast.error('Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
          <h1 className="text-lg font-semibold text-gray-900">Send ETH</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Balance */}
        <div className="p-4 bg-white rounded-xl">
          <div className="text-sm text-gray-600 mb-1">Available Balance</div>
          <div className="text-xl font-bold text-gray-900">{parseFloat(balance).toFixed(4)} ETH</div>
        </div>

        {/* Recipient Address */}
        <div className="p-4 bg-white rounded-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              toAddress && !isValidAddress ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {toAddress && !isValidAddress && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              Invalid Ethereum address
            </div>
          )}
          {isValidAddress && (
            <div className="flex items-center mt-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Valid address: {formatAddress(toAddress)}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="p-4 bg-white rounded-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.0001"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Password */}
        <div className="p-4 bg-white rounded-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your wallet password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Gas Settings */}
        <div className="p-4 bg-white rounded-xl">
          <div className="text-sm font-medium text-gray-700 mb-3">Gas Settings</div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Gas Price (Gwei)</label>
              <input
                type="number"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                placeholder="20"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Gas Limit</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                placeholder="21000"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Estimated Fee */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Fee:</span>
              <span className="font-medium">{parseFloat(estimatedFee).toFixed(6)} ETH</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold">
                {((parseFloat(amount) || 0) + parseFloat(estimatedFee)).toFixed(6)} ETH
              </span>
            </div>
          </div>
        </div>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={!isValidAddress || !amount || parseFloat(amount) <= 0 || !password || isLoading}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-colors ${
            !isValidAddress || !amount || parseFloat(amount) <= 0 || !password || isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Clock className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Send className="w-5 h-5 mr-2" />
              Send Transaction
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default SendScreen; 