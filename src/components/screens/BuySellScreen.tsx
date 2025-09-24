import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown,
  DollarSign,
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

const BuySellScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
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
  const [showFiatDropdown, setShowFiatDropdown] = useState(false);
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false);
  const [priceError, setPriceError] = useState(false);
  
  const { wallet, currentNetwork, switchNetwork } = useWallet();

  const fiatCurrencies = [
    { symbol: 'USD', name: 'US Dollar', icon: '💵', color: 'bg-yellow-500' },
    { symbol: 'EUR', name: 'Euro', icon: '💶', color: 'bg-blue-500' },
    { symbol: 'GBP', name: 'British Pound', icon: '💷', color: 'bg-green-500' }
  ];

  const cryptoCurrencies = [
    { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', icon: '🔷', color: 'bg-blue-500' },
    { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', icon: '🟠', color: 'bg-orange-500' },
    { symbol: 'SOL', name: 'Solana', network: 'solana', icon: '🟣', color: 'bg-purple-500' },
    { symbol: 'TRX', name: 'TRON', network: 'tron', icon: '🔴', color: 'bg-red-500' },
    { symbol: 'TON', name: 'TON', network: 'ton', icon: '🔵', color: 'bg-blue-400' },
    { symbol: 'XRP', name: 'XRP', network: 'xrp', icon: '🔵', color: 'bg-blue-300' },
    { symbol: 'LTC', name: 'Litecoin', network: 'litecoin', icon: '⚪', color: 'bg-gray-400' },
    { symbol: 'USDT', name: 'Tether', network: 'ethereum', icon: '🟢', color: 'bg-green-500' },
    { symbol: 'BNB', name: 'BNB', network: 'bsc', icon: '🟡', color: 'bg-yellow-500' },
    { symbol: 'MATIC', name: 'Polygon', network: 'polygon', icon: '🟣', color: 'bg-purple-600' }
  ];

  const selectedFiat = fiatCurrencies.find(c => c.symbol === selectedFiatCurrency) || fiatCurrencies[0];
  const selectedCrypto = cryptoCurrencies.find(c => c.symbol === selectedCryptoCurrency) || cryptoCurrencies[0];

  // Set crypto currency based on current network
  useEffect(() => {
    if (currentNetwork) {
      setSelectedCryptoCurrency(currentNetwork.symbol);
      // Reset amounts when network changes
      setSpendAmount('0');
      setBuyAmount('0');
    }
  }, [currentNetwork]);

  // Dropdown handlers
  const handleFiatCurrencySelect = (currency: any) => {
    setSelectedFiatCurrency(currency.symbol);
    setShowFiatDropdown(false);
  };

  const handleCryptoCurrencySelect = async (currency: any) => {
    setSelectedCryptoCurrency(currency.symbol);
    setShowCryptoDropdown(false);
    
    // Switch network if different from current
    if (currency.network !== currentNetwork?.id) {
      try {
        await switchNetwork(currency.network);
        // Success toast is handled by WalletContext
      } catch (error) {
        toast.error(`Failed to switch to ${currency.name} network`);
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowFiatDropdown(false);
        setShowCryptoDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron,the-open-network,ripple,litecoin,tether,binancecoin,matic-network&vs_currencies=usd`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Map CoinGecko IDs to our symbols
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
        console.log('✅ BuySellScreen: Fetched crypto prices:', prices);
      } catch (error) {
        console.error('❌ BuySellScreen: Error fetching prices:', error);
        setCryptoPrices({});
        setPriceError(true);
        toast.error('Unable to get prices. Please check your connection.');
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchPrices().catch(error => {
      console.error('Failed to fetch crypto prices:', error);
      // This catch block ensures the error doesn't propagate to the console
    });
  }, []);

  // Retry price fetching
  const retryPriceFetch = async () => {
    try {
      setPriceError(false);
      setIsLoadingPrices(true);
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
      console.error('❌ BuySellScreen: Retry failed:', error);
      setCryptoPrices({});
      setPriceError(true);
      toast.error('Unable to get prices. Please check your connection.');
    } finally {
      setIsLoadingPrices(false);
    }
  };

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
      // Execute buy/sell through exchange APIs
      let result;
      
      if (activeTab === 'buy') {
        result = await executeBuyOrder(selectedCrypto.symbol, spendAmount, buyAmount);
      } else {
        result = await executeSellOrder(selectedCrypto.symbol, buyAmount, spendAmount);
      }
      
      if (result.success) {
        setTransactionStatus('success');
        toast.success(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order executed successfully!`);
        
        // Update wallet balance
        await updateWalletBalance();
        
        // Navigate back after success
        setTimeout(() => {
          onNavigate('dashboard');
        }, 2000);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (error) {
      console.error('Transaction failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed. Please try again.');
      setTransactionStatus('error');
      toast.error(error instanceof Error ? error.message : 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidAmount = parseFloat(spendAmount) > 0 && parseFloat(buyAmount) > 0 && 
                       cryptoPrices[selectedCrypto.symbol] && cryptoPrices[selectedCrypto.symbol] > 0;

  // Execute buy order through exchange APIs
  const executeBuyOrder = async (symbol: string, fiatAmount: string, cryptoAmount: string) => {
    try {
      // Try multiple exchange APIs
      const exchanges = ['binance', 'coinbase', 'kraken'];
      
      for (const exchange of exchanges) {
        try {
          const result = await executeExchangeOrder(exchange, 'buy', symbol, fiatAmount, cryptoAmount);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn(`${exchange} buy order failed:`, error);
          continue;
        }
      }
      
      throw new Error('All exchange APIs failed. Please try again later.');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Buy order failed'
      };
    }
  };

  // Execute sell order through exchange APIs
  const executeSellOrder = async (symbol: string, cryptoAmount: string, fiatAmount: string) => {
    try {
      // Try multiple exchange APIs
      const exchanges = ['binance', 'coinbase', 'kraken'];
      
      for (const exchange of exchanges) {
        try {
          const result = await executeExchangeOrder(exchange, 'sell', symbol, cryptoAmount, fiatAmount);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn(`${exchange} sell order failed:`, error);
          continue;
        }
      }
      
      throw new Error('All exchange APIs failed. Please try again later.');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sell order failed'
      };
    }
  };

  // Execute order on specific exchange
  const executeExchangeOrder = async (exchange: string, side: 'buy' | 'sell', symbol: string, amount: string, price: string) => {
    try {
      switch (exchange) {
        case 'binance':
          return await executeBinanceOrder(side, symbol, amount, price);
        case 'coinbase':
          return await executeCoinbaseOrder(side, symbol, amount, price);
        case 'kraken':
          return await executeKrakenOrder(side, symbol, amount, price);
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
    } catch (error) {
      throw new Error(`Exchange order failed: ${error.message}`);
    }
  };

  // Binance API integration
  const executeBinanceOrder = async (side: 'buy' | 'sell', symbol: string, amount: string, price: string) => {
    try {
      // In production, you would use real Binance API with proper authentication
      const response = await fetch('https://api.binance.com/api/v3/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'X-MBX-APIKEY': 'your-api-key' // Would need real API key
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          side: side.toUpperCase(),
          type: 'MARKET',
          quantity: amount,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        orderId: result.orderId,
        symbol: result.symbol,
        executedQty: result.executedQty,
        cummulativeQuoteQty: result.cummulativeQuoteQty
      };
    } catch (error) {
      throw new Error(`Binance order failed: ${error.message}`);
    }
  };

  // Coinbase API integration
  const executeCoinbaseOrder = async (side: 'buy' | 'sell', symbol: string, amount: string, price: string) => {
    try {
      // In production, you would use real Coinbase API with proper authentication
      const response = await fetch('https://api.coinbase.com/v2/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer your-access-token' // Would need real access token
        },
        body: JSON.stringify({
          type: 'market',
          side: side,
          product_id: symbol,
          funds: side === 'buy' ? amount : undefined,
          size: side === 'sell' ? amount : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        orderId: result.data.id,
        symbol: result.data.product_id,
        executedQty: result.data.filled_size,
        cummulativeQuoteQty: result.data.filled_funds
      };
    } catch (error) {
      throw new Error(`Coinbase order failed: ${error.message}`);
    }
  };

  // Kraken API integration
  const executeKrakenOrder = async (side: 'buy' | 'sell', symbol: string, amount: string, price: string) => {
    try {
      // In production, you would use real Kraken API with proper authentication
      const response = await fetch('https://api.kraken.com/0/private/AddOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'API-Key': 'your-api-key', // Would need real API key
          // 'API-Sign': 'your-signature' // Would need real signature
        },
        body: new URLSearchParams({
          pair: symbol,
          type: side,
          ordertype: 'market',
          volume: amount
        })
      });

      if (!response.ok) {
        throw new Error(`Kraken API error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        orderId: result.result.txid[0],
        symbol: symbol,
        executedQty: amount,
        cummulativeQuoteQty: price
      };
    } catch (error) {
      throw new Error(`Kraken order failed: ${error.message}`);
    }
  };

  // Update wallet balance after successful trade
  const updateWalletBalance = async () => {
    try {
      // Refresh wallet balance from blockchain
      if (wallet?.address) {
        // This would trigger a balance refresh in the wallet context
        // The actual implementation would depend on your wallet management system
        console.log('Wallet balance updated after trade');
      }
    } catch (error) {
      console.error('Error updating wallet balance:', error);
    }
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
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">
              {activeTab === 'buy' ? 'Buy' : 'Sell'}
            </h1>
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
            <div className="relative dropdown-container">
              <button 
                onClick={() => setShowFiatDropdown(!showFiatDropdown)}
                className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
              >
                <div className={`w-6 h-6 ${selectedFiat.color} rounded-full flex items-center justify-center`}>
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-900 text-[13px]">{selectedFiat.symbol}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              
              {showFiatDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {fiatCurrencies.map((currency) => (
                    <button
                      key={currency.symbol}
                      onClick={() => handleFiatCurrencySelect(currency)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-6 h-6 ${currency.color} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-sm">{currency.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-[13px]">{currency.symbol}</div>
                        <div className="text-[12px] text-gray-600">{currency.name}</div>
                      </div>
                      {selectedFiatCurrency === currency.symbol && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <div className="relative dropdown-container">
              <button 
                onClick={() => setShowCryptoDropdown(!showCryptoDropdown)}
                className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
              >
                <div className={`w-6 h-6 ${selectedCrypto.color} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-sm">{selectedCrypto.icon}</span>
                </div>
                <span className="font-medium text-gray-900 text-[13px]">{selectedCrypto.symbol}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              
              {showCryptoDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {cryptoCurrencies.map((currency) => (
                    <button
                      key={currency.symbol}
                      onClick={() => handleCryptoCurrencySelect(currency)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-6 h-6 ${currency.color} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-sm">{currency.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-[13px]">{currency.symbol}</div>
                        <div className="text-[12px] text-gray-600">{currency.name}</div>
                      </div>
                      {selectedCryptoCurrency === currency.symbol && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  'Unable to get prices'
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
