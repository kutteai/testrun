import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ArrowUpDown, CheckCircle, RefreshCw } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { storage } from '../../utils/storage-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const SwapScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, currentNetwork, switchNetwork } = useWallet();
  const { portfolioValue } = usePortfolio();
  
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('ETH');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [priceError, setPriceError] = useState(false);

  // Available currencies/networks for swapping
  const availableCurrencies = [
    { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', icon: 'Ξ', color: 'bg-blue-500' },
    { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', icon: '₿', color: 'bg-orange-500' },
    { symbol: 'SOL', name: 'Solana', network: 'solana', icon: '◎', color: 'bg-purple-500' },
    { symbol: 'TRX', name: 'TRON', network: 'tron', icon: 'T', color: 'bg-red-500' },
    { symbol: 'TON', name: 'TON', network: 'ton', icon: 'T', color: 'bg-blue-400' },
    { symbol: 'XRP', name: 'XRP', network: 'xrp', icon: 'X', color: 'bg-blue-300' },
    { symbol: 'LTC', name: 'Litecoin', network: 'litecoin', icon: 'Ł', color: 'bg-gray-400' },
    { symbol: 'USDT', name: 'Tether', network: 'ethereum', icon: '₮', color: 'bg-green-500' },
    { symbol: 'BNB', name: 'BNB', network: 'bsc', icon: 'B', color: 'bg-yellow-500' },
    { symbol: 'MATIC', name: 'Polygon', network: 'polygon', icon: 'M', color: 'bg-purple-600' }
  ];


  // Fetch real crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Try to fetch from CoinGecko API with more currencies
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron,the-open-network,ripple,litecoin,tether,binancecoin,matic-network&vs_currencies=usd`
        );
        
        if (response.ok) {
          const data = await response.json();
          const prices = {
            'ETH': data.ethereum?.usd,
            'BTC': data.bitcoin?.usd,
            'SOL': data.solana?.usd,
            'TRX': data.tron?.usd,
            'TON': data['the-open-network']?.usd,
            'XRP': data.ripple?.usd,
            'LTC': data.litecoin?.usd,
            'USDT': data.tether?.usd,
            'BNB': data.binancecoin?.usd,
            'MATIC': data['matic-network']?.usd
          };
          setCryptoPrices(prices);
          setPriceError(false);
          console.log('✅ SwapScreen: Fetched crypto prices:', prices);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ SwapScreen: Error fetching prices:', error);
        setCryptoPrices({});
        setPriceError(true);
        toast.error('Unable to get prices. Please check your connection.');
      }
    };

    fetchPrices();
  }, []);

  // Retry price fetching
  const retryPriceFetch = async () => {
    try {
      setPriceError(false);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron,the-open-network,ripple,litecoin,tether,binancecoin,matic-network&vs_currencies=usd`
      );
      
      if (response.ok) {
        const data = await response.json();
        const prices = {
          'ETH': data.ethereum?.usd,
          'BTC': data.bitcoin?.usd,
          'SOL': data.solana?.usd,
          'TRX': data.tron?.usd,
          'TON': data['the-open-network']?.usd,
          'XRP': data.ripple?.usd,
          'LTC': data.litecoin?.usd,
          'USDT': data.tether?.usd,
          'BNB': data.binancecoin?.usd,
          'MATIC': data['matic-network']?.usd
        };
        setCryptoPrices(prices);
        setPriceError(false);
        toast.success('✅ Price data updated successfully!');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ SwapScreen: Retry failed:', error);
      setCryptoPrices({});
      setPriceError(true);
      toast.error('Unable to get prices. Please check your connection.');
    }
  };

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in SwapScreen:', event.detail);
      // SwapScreen will automatically update when wallet state changes
      // since it uses wallet from context directly
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, []);

  // Set currency based on current network and refresh data when network changes
  useEffect(() => {
    if (currentNetwork) {
      setFromCurrency(currentNetwork.symbol );
      // Reset amounts when network changes
      setFromAmount('');
      setToAmount('');
    }
  }, [currentNetwork]);

  // Calculate swap amounts based on real prices
  useEffect(() => {
    if (fromAmount && cryptoPrices[fromCurrency] && cryptoPrices[toCurrency] && 
        cryptoPrices[fromCurrency] > 0 && cryptoPrices[toCurrency] > 0) {
      const fromValue = parseFloat(fromAmount) * cryptoPrices[fromCurrency];
      const toAmountCalculated = fromValue / cryptoPrices[toCurrency];
      setToAmount(toAmountCalculated.toFixed(6));
    } else if (fromAmount && (!cryptoPrices[fromCurrency] || !cryptoPrices[toCurrency])) {
      setToAmount(''); // Clear if prices not available
    }
  }, [fromAmount, fromCurrency, toCurrency, cryptoPrices]);

  const getAccountBalance = (currency: string) => {
    if (!portfolioValue?.assets) return '0';
    
    const asset = portfolioValue.assets.find(a => a.symbol === currency);
    return asset ? parseFloat(asset.balance || '0').toFixed(6) : '0';
  };

  const handleSwapCurrencies = () => {
    const tempAmount = fromAmount;
    const tempCurrency = fromCurrency;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
  };

  const handleFromCurrencySelect = async (currency: any) => {
    setFromCurrency(currency.symbol);
    setShowFromDropdown(false);
    
    // Switch network if different from current
    if (currency.network !== currentNetwork?.id) {
      try {
        await switchNetwork(currency.network);
        toast.success(`🌐 Switched to ${currency.name} network`);
      } catch (error) {
        toast.error(`Failed to switch to ${currency.name} network`);
      }
    }
  };

  const handleToCurrencySelect = (currency: any) => {
    setToCurrency(currency.symbol);
    setShowToDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowFromDropdown(false);
        setShowToDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const saveSwapTransaction = async (transaction: any) => {
    try {
      const existingTransactions = await storage.get(['swapTransactions']);
      const allTransactions = [...(existingTransactions.swapTransactions || []), transaction];
      await storage.set({ swapTransactions: allTransactions });
    } catch (error) {
      console.error('Failed to save swap transaction:', error);
    }
  };

  const handleSwap = async () => {
    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0) {
      toast.error('Please enter valid amounts');
      return;
    }

    const fromBalance = parseFloat(getAccountBalance(fromCurrency));
    if (parseFloat(fromAmount) > fromBalance) {
      toast.error(`Insufficient ${fromCurrency} balance`);
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate swap processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create swap transaction
      const transaction = {
        id: `swap_${Date.now()}`,
        type: 'swap',
        fromAmount: fromAmount,
        fromCurrency: fromCurrency,
        toAmount: toAmount,
        toCurrency: toCurrency,
        fromPrice: cryptoPrices[fromCurrency] || 0,
        toPrice: cryptoPrices[toCurrency] || 0,
        timestamp: Date.now(),
        status: 'completed',
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`
      };

      // Save transaction
      await saveSwapTransaction(transaction);

      toast.success(`Successfully swapped ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Swap failed:', error);
      toast.error('Swap failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    onNavigate('dashboard');
  };

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
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">Swap</h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <div className={`w-4 h-4 rounded-full ${
                currentNetwork?.id === 'bitcoin' ? 'bg-orange-500' : 
                currentNetwork?.id === 'ethereum' ? 'bg-blue-500' :
                currentNetwork?.id === 'solana' ? 'bg-purple-500' :
                currentNetwork?.id === 'tron' ? 'bg-red-500' :
                currentNetwork?.id === 'ton' ? 'bg-blue-400' :
                currentNetwork?.id === 'xrp' ? 'bg-blue-300' :
                currentNetwork?.id === 'litecoin' ? 'bg-gray-400' :
                'bg-gray-500'
              }`}></div>
              <span className="text-xs text-white/80">
                {currentNetwork?.name || 'Select Network'}
              </span>
            </div>
          </div>
          <div className="flex items-center">
            {priceError && (
              <button
                onClick={retryPriceFetch}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Retry price fetch"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <div className="w-2"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* From Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <label className="block text-[13px] text-gray-600 mb-2">From</label>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none w-32"
                />
                <div className="text-[13px] text-gray-600">
                  {cryptoPrices[fromCurrency] ? 
                    `$${(parseFloat(fromAmount) * cryptoPrices[fromCurrency]).toFixed(2)}` : 
                    'Unable to get prices'
                  }
                </div>
              </div>
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setShowFromDropdown(!showFromDropdown)}
                  className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
                >
                  <div className={`w-6 h-6 ${availableCurrencies.find(c => c.symbol === fromCurrency)?.color || 'bg-blue-500'} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-sm">{availableCurrencies.find(c => c.symbol === fromCurrency)?.icon || 'Ξ'}</span>
                  </div>
                  <span className="font-medium text-gray-900 text-[13px]">{fromCurrency}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
                
                {showFromDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {availableCurrencies.map((currency) => (
                      <button
                        key={currency.symbol}
                        onClick={() => handleFromCurrencySelect(currency)}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-6 h-6 ${currency.color} rounded-full flex items-center justify-center`}>
                          <span className="text-white text-sm">{currency.icon}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-[13px]">{currency.symbol}</div>
                          <div className="text-[12px] text-gray-600">{currency.name}</div>
                        </div>
                        {fromCurrency === currency.symbol && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Balance */}
          <div className="mt-2 text-green-600 text-[13px]">Balance: {getAccountBalance(fromCurrency)} {fromCurrency}</div>
        </motion.div>

        {/* Swap Action Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <button
            onClick={handleSwapCurrencies}
            className="w-12 h-12 bg-[#180CB2] rounded-full flex items-center justify-center hover:bg-[#140a8f] transition-colors shadow-lg"
          >
            <ArrowUpDown className="w-6 h-6 text-white" />
          </button>
        </motion.div>

        {/* To Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <label className="block text-[13px] text-gray-600 mb-2">To</label>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900 mb-1">{toAmount || '0.00'}</div>
                <div className="text-[13px] text-gray-600">
                  {cryptoPrices[toCurrency] ? 
                    `$${(parseFloat(toAmount) * cryptoPrices[toCurrency]).toFixed(2)}` : 
                    'Unable to get prices'
                  }
                </div>
              </div>
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setShowToDropdown(!showToDropdown)}
                  className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
                >
                  <div className={`w-6 h-6 ${availableCurrencies.find(c => c.symbol === toCurrency)?.color || 'bg-orange-500'} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-sm">{availableCurrencies.find(c => c.symbol === toCurrency)?.icon || '₿'}</span>
                  </div>
                  <span className="font-medium text-gray-900 text-[13px]">{toCurrency}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
                
                {showToDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {availableCurrencies.filter(c => c.symbol !== fromCurrency).map((currency) => (
                      <button
                        key={currency.symbol}
                        onClick={() => handleToCurrencySelect(currency)}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-6 h-6 ${currency.color} rounded-full flex items-center justify-center`}>
                          <span className="text-white text-sm">{currency.icon}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-[13px]">{currency.symbol}</div>
                          <div className="text-[12px] text-gray-600">{currency.name}</div>
                        </div>
                        {toCurrency === currency.symbol && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Swap Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={handleSwap}
            disabled={parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0 || isProcessing || 
                     !cryptoPrices[fromCurrency] || !cryptoPrices[toCurrency]}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors text-[13px] ${
              parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0 && !isProcessing && 
              cryptoPrices[fromCurrency] && cryptoPrices[toCurrency]
                ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : 
             (!cryptoPrices[fromCurrency] || !cryptoPrices[toCurrency]) ? 'Prices unavailable' : 
             'Swap'}
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
              {fromAmount} {fromCurrency}
            </div>
            <div className="text-gray-600 mb-6">
              {fromAmount} {fromCurrency} successfully swapped to {toAmount} {toCurrency}
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
    </motion.div>
  );
};

export default SwapScreen;
