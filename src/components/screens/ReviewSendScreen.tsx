import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit,
  CheckCircle,
  Loader,
  AlertCircle,
  X
} from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface TransactionDetails {
  amount: string;
  currency: string;
  fiatValue: string;
  fromAccount: string;
  fromAddress: string;
  toAddress: string;
  network: string;
  networkFee: string;
  speed: string;
  gasPrice?: string;
  gasLimit?: string;
  nonce?: number;
}

const ReviewSendScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, currentNetwork } = useWallet();
  const { currentNetwork: network } = useNetwork();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({
    amount: '',
    currency: '',
    fiatValue: '',
    fromAccount: '',
    fromAddress: '',
    toAddress: '',
    network: '',
    networkFee: '',
    speed: ''
  });
  const [gasEstimate, setGasEstimate] = useState<string>('0');
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get transaction details from URL params or session storage
  useEffect(() => {
    const getTransactionData = async () => {
      try {
        // Get transaction data from session storage (set by SendScreen)
        const txData = sessionStorage.getItem('pendingTransaction');
        if (!txData) {
          // eslint-disable-next-line no-console
          console.warn('No transaction data found in session storage');
          // Set default values if no data found
          setTransactionDetails({
            amount: '',
            currency: 'ETH',
            fiatValue: '',
            fromAccount: wallet?.name || '',
            fromAddress: wallet?.address || '',
            toAddress: '',
            network: currentNetwork?.name || '',
            networkFee: '',
            speed: 'Standard'
          });
          return;
        }

        const parsedData = JSON.parse(txData);

        // Get current account and network info
        const accountAddress = wallet?.address || wallet?.accounts?.[0]?.addresses?.ethereum || '';
        const networkInfo = network || currentNetwork;
        
        if (!accountAddress || !networkInfo) {
          // eslint-disable-next-line no-console
          console.warn('Wallet or network not available, using defaults');
          setTransactionDetails({
            amount: parsedData.amount || '0',
            currency: parsedData.currency || 'ETH',
            fiatValue: '',
            fromAccount: parsedData.fromAccount || '',
            fromAddress: parsedData.fromAddress || '',
            toAddress: parsedData.toAddress || '',
            network: parsedData.network || '',
            networkFee: '0.001',
            speed: 'Standard'
          });
          return;
        }

        // Estimate gas and get current gas price
        let gasEst = 21000;         // Default gas limit
        let currentGasPrice = '0.5'; // Fallback gas price in gwei (more realistic)
        
        try {
          gasEst = await estimateGas(parsedData.toAddress, parsedData.amount, networkInfo);
        } catch (gasError) {
          // eslint-disable-next-line no-console
          console.warn('Gas estimation failed, using default:', gasError);
        }
        
        try {
          currentGasPrice = await getCurrentGasPrice(networkInfo);

        } catch (gasPriceError) {
          // eslint-disable-next-line no-console
          console.warn('Failed to fetch real gas price, using fallback:', gasPriceError);
          // Try to get gas price from gas-utils as backup
          try {
            const { getCurrentGasPrices } = await import('../../utils/gas-utils');
            const prices = await getCurrentGasPrices(networkInfo.rpcUrl);
            if (prices.gasPrice && prices.gasPrice !== '0') {
              currentGasPrice = ethers.formatUnits(prices.gasPrice, 'gwei');

            }
          } catch (backupError) {
            // eslint-disable-next-line no-console
            console.warn('Backup gas price fetch also failed:', backupError);
          }
        }
        
        // Get real fiat conversion and transaction speed
        let fiatValue = '';
        let transactionSpeed = 'Standard';
        
        try {
          fiatValue = await getFiatConversion(parsedData.amount, networkInfo.symbol || 'ethereum');
          transactionSpeed = calculateTransactionSpeed(currentGasPrice, networkInfo);
        } catch (conversionError) {
          // eslint-disable-next-line no-console
          console.warn('Fiat conversion failed, using defaults:', conversionError);
        }
        
        setTransactionDetails({
          amount: parsedData.amount,
          currency: networkInfo.symbol || 'ETH',
          fiatValue: fiatValue,
          fromAccount: parsedData.fromAccount || wallet?.name || 'Account 1',
          fromAddress: parsedData.fromAddress || accountAddress,
          toAddress: parsedData.toAddress,
          network: networkInfo.name || 'Ethereum Mainnet',
          networkFee: calculateNetworkFee(gasEst, currentGasPrice, networkInfo),
          speed: transactionSpeed,
          gasPrice: currentGasPrice,
          gasLimit: gasEst.toString(),
          nonce: await getNonce(accountAddress, networkInfo)
        });
        
        setGasEstimate(gasEst.toString());
        setGasPrice(currentGasPrice);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error getting transaction data:', error);
        toast.error(`Failed to load transaction details: ${error.message}`);
      }
    };

    getTransactionData();
  }, [wallet, currentNetwork, network]);

  // Estimate gas for the transaction
  const estimateGas = async (toAddress: string, amount: string, networkInfo: any): Promise<number> => {
    const provider = new ethers.JsonRpcProvider(networkInfo.rpcUrl);
    const tx = {
      to: toAddress,
      value: ethers.parseEther(amount),
      from: wallet?.address || wallet?.accounts?.[0]?.addresses?.ethereum || ''
    };
    
    const gasEstimate = await provider.estimateGas(tx);
    return Number(gasEstimate);
  };

  // Get current gas price
  const getCurrentGasPrice = async (networkInfo: any): Promise<string> => {
    const provider = new ethers.JsonRpcProvider(networkInfo.rpcUrl);
    const feeData = await provider.getFeeData();
    
    // Use maxFeePerGas for EIP-1559 networks, fallback to gasPrice
    if (feeData.maxFeePerGas) {
      return ethers.formatUnits(feeData.maxFeePerGas, 'gwei');
    } else if (feeData.gasPrice) {
      return ethers.formatUnits(feeData.gasPrice, 'gwei');
    }
    
    // If no fee data available, try to get from network
    const gasPrice = await provider.send('eth_gasPrice', []);
    return ethers.formatUnits(gasPrice, 'gwei');
  };

  // Get nonce for the account
  const getNonce = async (address: string, networkInfo: any): Promise<number> => {
    const provider = new ethers.JsonRpcProvider(networkInfo.rpcUrl);
    return await provider.getTransactionCount(address, 'pending');
  };

  // Calculate network fee
  const calculateNetworkFee = (gasLimit: number, gasPrice: string, networkInfo: any): string => {
    const gasPriceWei = ethers.parseUnits(gasPrice, 'gwei');
    const feeWei = gasLimit * Number(gasPriceWei);
    const feeEth = ethers.formatEther(feeWei);
    
    return `${feeEth} ${networkInfo.symbol}`;
  };

  // Calculate transaction speed based on gas price
  const calculateTransactionSpeed = (gasPrice: string, networkInfo: any): string => {
    const gasPriceNum = parseFloat(gasPrice);
    
    // Network-specific speed calculations based on gas price
    const speedRanges: { [key: string]: { slow: number; medium: number; fast: number } } = {
      'ethereum': { slow: 15, medium: 25, fast: 50 },
      'bsc': { slow: 3, medium: 5, fast: 10 },
      'polygon': { slow: 20, medium: 30, fast: 60 },
      'arbitrum': { slow: 0.05, medium: 0.1, fast: 0.2 },
      'optimism': { slow: 0.0005, medium: 0.001, fast: 0.002 },
      'avalanche': { slow: 20, medium: 30, fast: 60 }
    };
    
    const ranges = speedRanges[networkInfo.id] || speedRanges['ethereum'];
    
    if (gasPriceNum <= ranges.slow) return '~30 sec (Slow)';
    if (gasPriceNum <= ranges.medium) return '~12 sec (Medium)';
    return '~3 sec (Fast)';
  };

  // Get real-time fiat conversion rate
  const getFiatConversion = async (amount: string, currency: string): Promise<string> => {
    // Use CoinGecko API for real-time rates
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${currency.toLowerCase()}&vs_currencies=usd`);
    const data = await response.json();
    
    if (data[currency.toLowerCase()]?.usd) {
      const usdRate = data[currency.toLowerCase()].usd;
      const usdValue = parseFloat(amount) * usdRate;
      return `$${usdValue.toFixed(2)}`;
    }
    
    throw new Error(`No conversion rate found for ${currency}`);
  };

  // Handle transaction confirmation
  const handleConfirm = async () => {
    if (!wallet || !currentNetwork) {
      toast.error('Wallet not available');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get password from session storage or prompt user
      const password = sessionStorage.getItem('walletPassword') || prompt('Enter your wallet password:');
      if (!password) {
        toast.error('Password required for transaction');
        setIsProcessing(false);
        return;
      }

      // Create and send transaction
      const txHash = await sendTransaction(password);
      
      if (txHash) {
        // Clear session storage
        sessionStorage.removeItem('pendingTransaction');
        
        // Show success modal
        setShowSuccessModal(true);
        toast.success('Transaction sent successfully!');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Transaction failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setShowErrorModal(true);
      toast.error('Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send the actual transaction
  const sendTransaction = async (password: string): Promise<string> => {
    try {
      const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      
      // Decrypt private key
      const decryptedPrivateKey = await wallet.decryptPrivateKey(password);
      if (!decryptedPrivateKey) {
        throw new Error('Failed to decrypt private key');
      }

      // Create wallet instance
      const walletInstance = new ethers.Wallet(decryptedPrivateKey, provider);
      
      // Prepare transaction
      const tx = {
        to: transactionDetails.toAddress,
        value: ethers.parseEther(transactionDetails.amount),
        gasLimit: BigInt(transactionDetails.gasLimit || '21000'),
        gasPrice: ethers.parseUnits(transactionDetails.gasPrice || '0', 'gwei'),
        nonce: transactionDetails.nonce || 0
      };

      // Send transaction
      const transaction = await walletInstance.sendTransaction(tx);
      
      // Wait for transaction to be mined
      const receipt = await transaction.wait();
      
      return receipt.hash;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Transaction sending failed:', error);
      throw error;
    }
  };

  const handleDone = () => {
    onGoBack();
  };

  const handleEditGas = () => {
    setShowGasModal(true);
  };

  const handleGasChange = (type: 'gasPrice' | 'gasLimit', value: string) => {
    if (type === 'gasPrice') {
      setGasPrice(value);
      // Update transaction details with new gas price
      setTransactionDetails(prev => ({
        ...prev,
        networkFee: calculateNetworkFee(parseInt(gasEstimate, 10), value, currentNetwork || network)
      }));
    } else if (type === 'gasLimit') {
      setGasEstimate(value);
      // Update transaction details with new gas limit
      setTransactionDetails(prev => ({
        ...prev,
        networkFee: calculateNetworkFee(parseInt(value, 10), gasPrice, currentNetwork || network)
      }));
    }
  };

  const handleGasPreset = (preset: 'slow' | 'medium' | 'fast') => {
    let newGasPrice = '0'; // Default placeholder (gets overridden by real gas price)
    
    switch (preset) {
      case 'slow':
        newGasPrice = (parseFloat(gasPrice) * 0.8).toFixed(0);
        break;
      case 'medium':
        newGasPrice = gasPrice; // Keep current
        break;
      case 'fast':
        newGasPrice = (parseFloat(gasPrice) * 1.2).toFixed(0);
        break;
    }
    
    setGasPrice(newGasPrice);
    setTransactionDetails(prev => ({
      ...prev,
      networkFee: calculateNetworkFee(parseInt(gasEstimate, 10), newGasPrice, currentNetwork || network)
    }));
    
    toast.success(`Gas price set to ${preset} speed`);
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
            onClick={() => onNavigate('send')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            Review
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        {/* Transaction Amount */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">Ξ</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {transactionDetails.amount} {transactionDetails.currency}
          </div>
        </motion.div>

        {/* Transaction Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          {/* From/To Section */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">From</div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">👤</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{transactionDetails.fromAccount}</div>
                    <div className="text-sm text-gray-600">{transactionDetails.fromAddress}</div>
                  </div>
                </div>
              </div>
              
              <div className="mx-4">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">→</span>
                </div>
              </div>
              
              <div className="flex-1 text-right">
                <div className="text-sm text-gray-600 mb-2">To</div>
                <div className="text-sm text-gray-900">{transactionDetails.toAddress}</div>
              </div>
            </div>
          </div>

          {/* Network Section */}
          <div className="bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-2">Network</div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ξ</span>
              </div>
              <span className="font-medium text-gray-900">{transactionDetails.network}</span>
            </div>
          </div>

          {/* Network Fee and Speed */}
          <div className="bg-white rounded-xl p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network fee:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{transactionDetails.networkFee}</span>
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Ξ</span>
                  </div>
                  <button 
                    onClick={handleEditGas}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Edit className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Speed:</span>
                <span className="font-medium text-gray-900">{transactionDetails.speed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gas Price:</span>
                <span className="font-medium text-gray-900">{gasPrice} Gwei</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gas Limit:</span>
                <span className="font-medium text-gray-900">{gasEstimate}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex space-x-3"
        >
          <button
            onClick={() => onNavigate('send')}
            disabled={isProcessing}
            className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 py-4 px-6 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </motion.div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-80 mx-4 text-center"
          >
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            
            {/* Success Message */}
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {transactionDetails.amount} {transactionDetails.currency}
            </div>
            <div className="text-gray-600 mb-6">
              {transactionDetails.fiatValue} Sent successfully
            </div>
            
            {/* Done Button */}
            <button
              onClick={handleDone}
              className="w-full py-3 px-4 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-80 mx-4 text-center"
          >
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            
            {/* Error Message */}
            <div className="text-xl font-bold text-gray-900 mb-2">
              Transaction Failed
            </div>
            <div className="text-gray-600 mb-6">
              {errorMessage}
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-3 px-4 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Gas Editing Modal */}
      {showGasModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-96 mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Gas Settings</h3>
              <button
                onClick={() => setShowGasModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Gas Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Speed Presets</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleGasPreset('slow')}
                  className="py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Slow
                </button>
                <button
                  onClick={() => handleGasPreset('medium')}
                  className="py-2 px-3 bg-[#180CB2] text-white rounded-lg text-sm font-medium hover:bg-[#140a8f] transition-colors"
                >
                  Medium
                </button>
                <button
                  onClick={() => handleGasPreset('fast')}
                  className="py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Fast
                </button>
              </div>
            </div>
            
            {/* Gas Price */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Price (Gwei)
              </label>
              <input
                type="number"
                value={gasPrice}
                onChange={(e) => handleGasChange('gasPrice', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
                placeholder="Enter gas price in Gwei"
                min="1"
                step="1"
              />
            </div>
            
            {/* Gas Limit */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Limit
              </label>
              <input
                type="number"
                value={gasEstimate}
                onChange={(e) => handleGasChange('gasLimit', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
                placeholder="Enter gas limit"
                min="21000"
                step="1000"
              />
            </div>
            
            {/* Estimated Fee */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estimated Fee:</span>
                <span className="font-medium text-gray-900">
                  {transactionDetails.networkFee}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGasModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowGasModal(false)}
                className="flex-1 py-3 px-4 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ReviewSendScreen;
