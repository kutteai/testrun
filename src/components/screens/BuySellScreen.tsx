import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown,
  DollarSign,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const BuySellScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('buy');
  const [spendAmount, setSpendAmount] = useState('0');
  const [buyAmount, setBuyAmount] = useState('0');
  const [selectedFiatCurrency, setSelectedFiatCurrency] = useState('USD');
  const [selectedCryptoCurrency, setSelectedCryptoCurrency] = useState('ETH');
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { wallet } = useWallet();

  const fiatCurrencies = [
    { symbol: 'USD', name: 'US Dollar', icon: '💵', color: 'bg-yellow-500' },
    { symbol: 'EUR', name: 'Euro', icon: '💶', color: 'bg-blue-500' },
    { symbol: 'GBP', name: 'British Pound', icon: '💷', color: 'bg-green-500' }
  ];

  const cryptoCurrencies = [
    { symbol: 'ETH', name: 'Ethereum', icon: '🔷', color: 'bg-blue-500' },
    { symbol: 'BTC', name: 'Bitcoin', icon: '🟠', color: 'bg-orange-500' },
    { symbol: 'USDT', name: 'Tether', icon: '🟢', color: 'bg-green-500' },
    { symbol: 'BNB', name: 'BNB', icon: '🟡', color: 'bg-yellow-500' }
  ];

  const selectedFiat = fiatCurrencies.find(c => c.symbol === selectedFiatCurrency) || fiatCurrencies[0];
  const selectedCrypto = cryptoCurrencies.find(c => c.symbol === selectedCryptoCurrency) || cryptoCurrencies[0];

  // Save buy/sell transactions
  const saveTransactions = async (transactions: any[]): Promise<void> => {
    try {
      const existingTransactions = await storage.get(['buySellTransactions']);
      const allTransactions = [...(existingTransactions.buySellTransactions || []), ...transactions];
      await storage.set({ buySellTransactions: allTransactions });
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  };

  // Fetch real crypto prices from CoinGecko API
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoadingPrices(true);
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether,binancecoin&vs_currencies=usd`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Map CoinGecko IDs to our symbols
        const prices = {
          'ETH': data.ethereum?.usd,
          'BTC': data.bitcoin?.usd,
          'USDT': data.tether?.usd,
          'BNB': data.binancecoin?.usd
        };
        
        setCryptoPrices(prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
        toast.error('Failed to fetch crypto prices. Please check your connection.');
        // Don't set fallback prices - let the user know there's an issue
        setCryptoPrices({});
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchPrices().catch(error => {
      console.error('Failed to fetch crypto prices:', error);
      // This catch block ensures the error doesn't propagate to the console
    });
  }, []);

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in BuySellScreen:', event.detail);
      // BuySellScreen doesn't need to refresh data on wallet change
      // as it only shows price data and transaction forms
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, []);

  const handleAmountChange = (amount: string, type: 'spend' | 'buy') => {
    if (type === 'spend') {
      setSpendAmount(amount);
      // Calculate buy amount based on real prices
      const spendValue = parseFloat(amount) || 0;
      const cryptoPrice = cryptoPrices[selectedCrypto.symbol];
      if (cryptoPrice && cryptoPrice > 0) {
        setBuyAmount((spendValue / cryptoPrice).toFixed(6));
      } else {
        setBuyAmount(''); // Clear if price not available
      }
    } else {
      setBuyAmount(amount);
      // Calculate spend amount based on real prices
      const buyValue = parseFloat(amount) || 0;
      const cryptoPrice = cryptoPrices[selectedCrypto.symbol];
      if (cryptoPrice && cryptoPrice > 0) {
        setSpendAmount((buyValue * cryptoPrice).toFixed(2));
      } else {
        setSpendAmount(''); // Clear if price not available
      }
    }
  };

  const handleAction = async () => {
    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isValidAmount) {
      toast.error('Please enter valid amounts');
      return;
    }

    setIsProcessing(true);
    setTransactionStatus('processing');
    setErrorMessage('');

    try {
      // Simulate transaction processing (since we don't have real exchange integration)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (activeTab === 'buy') {
        // Create a simulated buy transaction
        const transaction = {
          id: `buy_${Date.now()}`,
          type: 'buy',
          cryptoAmount: buyAmount,
          cryptoSymbol: selectedCrypto.symbol,
          fiatAmount: spendAmount,
          fiatSymbol: selectedFiat.symbol,
          price: cryptoPrices[selectedCrypto.symbol] || 0,
          timestamp: Date.now(),
          status: 'completed',
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          exchangeOrderId: `order_${Date.now()}`
        };

        // Save to storage
        await saveTransactions([transaction]);

        toast.success(`Successfully bought ${buyAmount} ${selectedCrypto.symbol}`);
        setTransactionStatus('success');
        
        // Reset form after successful transaction
        setTimeout(() => {
        setSpendAmount('0');
        setBuyAmount('0');
        setTransactionStatus('idle');
        }, 2000);

      } else {
        // Create a simulated sell transaction
        const transaction = {
          id: `sell_${Date.now()}`,
          type: 'sell',
          cryptoAmount: spendAmount,
          cryptoSymbol: selectedCrypto.symbol,
          fiatAmount: buyAmount,
          fiatSymbol: selectedFiat.symbol,
          price: cryptoPrices[selectedCrypto.symbol] || 0,
          timestamp: Date.now(),
          status: 'completed',
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          exchangeOrderId: `order_${Date.now()}`
        };

        // Save to storage
        await saveTransactions([transaction]);

        toast.success(`Successfully sold ${spendAmount} ${selectedCrypto.symbol}`);
        setTransactionStatus('success');
        
        // Reset form after successful transaction
        setTimeout(() => {
        setSpendAmount('0');
        setBuyAmount('0');
        setTransactionStatus('idle');
        }, 2000);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      setErrorMessage('Transaction failed. Please try again.');
      setTransactionStatus('error');
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidAmount = parseFloat(spendAmount) > 0 && parseFloat(buyAmount) > 0 && 
                       cryptoPrices[selectedCrypto.symbol] && cryptoPrices[selectedCrypto.symbol] > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-50 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold">
            {activeTab === 'buy' ? 'Buy' : 'Sell'}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 overflow-y-auto">
        {/* Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg"
        >
          {['buy', 'sell'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-[13px] font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-[#180CB2] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'buy' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </motion.div>

        {/* I want to spend/sell Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <label className="block text-[13px] text-gray-600 mb-2">
            I want to {activeTab === 'buy' ? 'spend' : 'sell'}
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={spendAmount}
              onChange={(e) => handleAmountChange(e.target.value, 'spend')}
              placeholder="0"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-lg font-bold text-gray-900 max-w-[200px]"
            />
            <button className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors">
              <div className={`w-6 h-6 ${selectedFiat.color} rounded-full flex items-center justify-center`}>
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-gray-900 text-[13px]">{selectedFiat.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </motion.div>

        {/* I will buy/take back Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <label className="block text-[13px] text-gray-600 mb-2">
            I will {activeTab === 'buy' ? 'buy' : 'take back'}
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={buyAmount}
              onChange={(e) => handleAmountChange(e.target.value, 'buy')}
              placeholder="0"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-lg font-bold text-gray-900 max-w-[200px]"
            />
            <button className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors">
              <div className={`w-6 h-6 ${selectedCrypto.color} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm">{selectedCrypto.icon}</span>
              </div>
              <span className="font-medium text-gray-900 text-[13px]">{selectedCrypto.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={handleAction}
            disabled={!isValidAmount || isProcessing}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors text-[13px] ${
              isValidAmount && !isProcessing
                ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : transactionStatus === 'success' ? (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Success!</span>
              </div>
            ) : (
              `${activeTab === 'buy' ? 'Buy' : 'Sell'}`
            )}
          </button>
        </motion.div>

        {/* Transaction Status */}
        {transactionStatus === 'error' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-[13px] text-red-800">
                <p className="font-medium">Transaction Failed</p>
                <p className="text-red-700">{errorMessage}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Price Display */}
        {!isLoadingPrices && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-700">Current Price</span>
              <span className="text-lg font-bold text-gray-900">
                {cryptoPrices[selectedCrypto.symbol] ? 
                  `$${cryptoPrices[selectedCrypto.symbol].toLocaleString()}` : 
                  'Price unavailable'
                }
              </span>
            </div>
            <div className="mt-2 text-[13px] text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-800 text-xs font-bold">i</span>
            </div>
            <div className="text-[13px] text-blue-800">
              <p className="font-medium mb-1">Transaction Info</p>
              <p className="text-blue-700">
                {activeTab === 'buy' 
                  ? `You will receive approximately ${buyAmount} ${selectedCrypto.symbol} for ${spendAmount} ${selectedFiat.symbol}`
                  : `You will receive approximately ${buyAmount} ${selectedFiat.symbol} for ${spendAmount} ${selectedCrypto.symbol}`
                }
              </p>
              {cryptoPrices[selectedCrypto.symbol] ? (
                <p className="text-blue-600 mt-2 text-[13px]">
                  Rate: 1 {selectedCrypto.symbol} = ${cryptoPrices[selectedCrypto.symbol].toLocaleString()} {selectedFiat.symbol}
                </p>
              ) : (
                <p className="text-red-600 mt-2 text-[13px]">
                  Price data unavailable - cannot calculate rates
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BuySellScreen;
