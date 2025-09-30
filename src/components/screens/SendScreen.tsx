import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown, 
  QrCode,
  X,
  Check
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useNetwork } from '../../store/NetworkContext';
import { storage } from '../../utils/storage-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { handleError, ErrorCodes } from '../../utils/error-handler';
import { resolveENS } from '../../utils/ens-utils';

const SendScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet, getWalletAccounts, getCurrentAccount, currentNetwork, switchNetwork } = useWallet();
  const { portfolioValue } = usePortfolio();
  const { networks, currentNetwork: networkContextCurrent } = useNetwork();
  
  const [fromAccount, setFromAccount] = useState<any>(null);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [addressType, setAddressType] = useState('address');
  const [activeTab, setActiveTab] = useState('accounts');
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load accounts and contacts on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('🔄 SendScreen: Loading data for wallet:', wallet);
        
        // Load accounts
        const walletAccounts = await getWalletAccounts();
        console.log('📊 SendScreen: Loaded accounts:', walletAccounts);
        setAccounts(walletAccounts);
        
        // Get current account with proper fallback
        let current = await getCurrentAccount();
        console.log('👤 SendScreen: Current account:', current);
        
        // If no current account, use the first available account
        if (!current && walletAccounts.length > 0) {
          current = walletAccounts[0];
          console.log('🔄 SendScreen: Using first account as fallback:', current);
        }
        
        setFromAccount(current);
        
        // Load contacts from storage
        const storedContacts = await storage.get(['addressBook']);
        const contactsData = storedContacts?.addressBook || [];
        console.log('📇 SendScreen: Loaded contacts:', contactsData);
        setContacts(contactsData);
        
        // If still no account, try to get from wallet directly
        if (!current && wallet.accounts && wallet.accounts.length > 0) {
          const directAccount = wallet.accounts.find((acc: any) => acc.isActive) || wallet.accounts[0];
          console.log('🔄 SendScreen: Using direct wallet account:', directAccount);
          setFromAccount(directAccount);
        }
        
      } catch (error) {
        console.error('❌ SendScreen: Error loading data:', error);
        handleError(error, {
          context: { operation: 'loadSendScreenData', screen: 'SendScreen' },
          showToast: true
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [wallet, getWalletAccounts, getCurrentAccount]);

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      console.log('🔄 Wallet changed event received in SendScreen:', event.detail);
      try {
        const walletAccounts = await getWalletAccounts();
        console.log('📊 SendScreen: Refreshed accounts after wallet change:', walletAccounts);
        setAccounts(walletAccounts);
        
        let current = await getCurrentAccount();
        console.log('👤 SendScreen: Refreshed current account:', current);
        
        // Fallback to first account if no current account
        if (!current && walletAccounts.length > 0) {
          current = walletAccounts[0];
          console.log('🔄 SendScreen: Using first account as fallback after wallet change:', current);
        }
        
        setFromAccount(current);
        
        // Also refresh contacts
        const storedContacts = await storage.get(['addressBook']);
        const contactsData = storedContacts?.addressBook || [];
        setContacts(contactsData);
        
      } catch (error) {
        console.error('❌ SendScreen: Error refreshing after wallet change:', error);
        handleError(error, {
          context: { operation: 'refreshAccountsAfterWalletChange', screen: 'SendScreen' },
          showToast: false // Don't show toast for background refresh
        });
      }
    };

    const handleAccountSwitched = async (event: CustomEvent) => {
      console.log('🔄 Account switched event received in SendScreen:', event.detail);
      try {
        // Update the from account immediately
        const current = await getCurrentAccount();
        if (current) {
          setFromAccount(current);
          console.log('✅ SendScreen: Updated from account after switch:', current);
        }
      } catch (error) {
        console.error('❌ SendScreen: Error updating after account switch:', error);
      }
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    window.addEventListener('accountSwitched', handleAccountSwitched as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
      window.removeEventListener('accountSwitched', handleAccountSwitched as EventListener);
    };
  }, [getWalletAccounts, getCurrentAccount]);

  // Set currency based on current network and refresh data when network changes
  useEffect(() => {
    if (currentNetwork) {
      setSelectedCurrency(currentNetwork.symbol || 'ETH');
      // Refresh accounts when network changes
      const refreshData = async () => {
        try {
          console.log('🔄 SendScreen: Refreshing data for network change to:', currentNetwork.id);
          const walletAccounts = await getWalletAccounts();
          console.log('📊 SendScreen: Refreshed accounts for network:', walletAccounts);
          setAccounts(walletAccounts);
          
          let current = await getCurrentAccount();
          console.log('👤 SendScreen: Refreshed current account for network:', current);
          
          // Fallback to first account if no current account
          if (!current && walletAccounts.length > 0) {
            current = walletAccounts[0];
            console.log('🔄 SendScreen: Using first account as fallback for network:', current);
          }
          
          setFromAccount(current);
        } catch (error) {
          console.error('❌ SendScreen: Error refreshing accounts on network change:', error);
        }
      };
      refreshData();
    }
  }, [currentNetwork, getWalletAccounts, getCurrentAccount]);

  // Re-validate address when network changes
  useEffect(() => {
    if (toAddress) {
      handleAddressChange(toAddress);
    }
  }, [currentNetwork, addressType]);

  const addressTypes = [
    { id: 'address', label: 'Address', icon: Check },
    { id: 'ucpi', label: 'UCPI ID', icon: null },
    { id: 'ens', label: 'ENS', icon: null }
  ];

  const getAccountBalance = (account: any) => {
    if (!portfolioValue?.assets) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Get the correct address for the current network
    const accountAddress = account?.address || account?.addresses?.[currentNetwork?.id || 'ethereum'];
    
    if (!accountAddress) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Find assets for this account's address and current network
    const accountAssets = portfolioValue.assets.filter((asset: any) => 
      asset.address === accountAddress && 
      asset.network?.toLowerCase() === (currentNetwork?.id || 'ethereum').toLowerCase()
    );
    
    if (accountAssets.length === 0) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Calculate total balance
    const totalBalance = accountAssets.reduce((sum: number, asset: any) => {
      return sum + parseFloat(asset.balance || '0');
    }, 0);
    
    const totalUsdValue = accountAssets.reduce((sum: number, asset: any) => {
      return sum + (asset.usdValue || 0);
    }, 0);
    
    return { 
      balance: totalBalance.toFixed(6), 
      usdValue: totalUsdValue 
    };
  };

  const handleAddressTypeChange = (type: string) => {
    setAddressType(type);
    setToAddress(''); // Clear address when changing type
    setIsAddressValid(false); // Reset validation
  };

  const handleAddressChange = (value: string) => {
    setToAddress(value);
    
    // Network-specific validation based on current network
    if (addressType === 'address') {
      const networkId = currentNetwork?.id || 'ethereum';
      let isValid = false;
      
      console.log('🔍 Address validation debug:');
      console.log('  - Address:', value);
      console.log('  - Address type:', addressType);
      console.log('  - Current network:', networkId);
      console.log('  - Address length:', value.length);
      
      switch (networkId) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'avalanche':
        case 'arbitrum':
        case 'optimism':
          // EVM networks - Ethereum address format
          const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
          isValid = ethAddressRegex.test(value);
          console.log('  - EVM network detected');
          console.log('  - Regex test result:', isValid);
          console.log('  - Regex pattern:', ethAddressRegex);
          break;
          
        case 'bitcoin':
          // Bitcoin address validation (P2PKH, P2SH, Bech32)
          const btcAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
          isValid = btcAddressRegex.test(value);
          break;
          
        case 'solana':
          // Solana address validation (Base58, 32-44 characters)
          const solAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
          isValid = solAddressRegex.test(value);
          break;
          
        case 'tron':
          // TRON address validation (Base58, starts with 'T')
          const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
          isValid = tronAddressRegex.test(value);
          break;
          
        case 'xrp':
          // XRP address validation (Base58, starts with 'r')
          const xrpAddressRegex = /^r[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
          isValid = xrpAddressRegex.test(value);
          break;
          
        case 'ton':
          // TON address validation (Base64, starts with 'EQ' or 'UQ')
          const tonAddressRegex = /^(EQ|UQ)[A-Za-z0-9_-]{44,48}$/;
          isValid = tonAddressRegex.test(value);
          break;
          
        case 'litecoin':
          // Litecoin address validation (similar to Bitcoin)
          const ltcAddressRegex = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/;
          isValid = ltcAddressRegex.test(value);
          break;
          
        default:
          // Fallback to Ethereum validation for unknown networks
          const fallbackRegex = /^0x[a-fA-F0-9]{40}$/;
          isValid = fallbackRegex.test(value);
          break;
      }
      
      console.log('  - Final validation result:', isValid);
      setIsAddressValid(isValid);
      
    } else if (addressType === 'ens') {
      // ENS validation (supports multiple networks)
      const networkId = currentNetwork?.id || 'ethereum';
      let isValid = false;
      
      if (['ethereum', 'polygon', 'arbitrum', 'optimism'].includes(networkId)) {
        // Ethereum-based networks support .eth domains
        const ensRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.eth$/;
        isValid = ensRegex.test(value.toLowerCase());
      } else if (networkId === 'bsc' || networkId === 'binance') {
        // BSC network supports .bnb domains (Space ID)
        const bnbRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.bnb$/;
        isValid = bnbRegex.test(value.toLowerCase());
      } else if (networkId === 'polygon') {
        // Polygon supports .polygon domains
        const polygonRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.polygon$/;
        isValid = polygonRegex.test(value.toLowerCase());
      } else if (networkId === 'avalanche') {
        // Avalanche supports .avax domains
        const avaxRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.avax$/;
        isValid = avaxRegex.test(value.toLowerCase());
      }
      
      setIsAddressValid(isValid);
      
    } else if (addressType === 'ucpi') {
      // UCPI ID validation (alphanumeric, 6-20 characters)
      const ucpiRegex = /^[a-zA-Z0-9]{6,20}$/;
      setIsAddressValid(ucpiRegex.test(value));
    }
  };

  // Test function for debugging address validation
  const testAddressValidation = (testAddress: string) => {
    console.log('🧪 Testing address validation for:', testAddress);
    console.log('  - Current network:', currentNetwork?.id);
    console.log('  - Address type:', addressType);
    
    const networkId = currentNetwork?.id || 'ethereum';
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    const isValid = ethAddressRegex.test(testAddress);
    
    console.log('  - Regex test result:', isValid);
    console.log('  - Address length:', testAddress.length);
    console.log('  - Starts with 0x:', testAddress.startsWith('0x'));
    console.log('  - Hex part length:', testAddress.substring(2).length);
    
    // Check for hidden characters
    console.log('  - Character codes:', testAddress.split('').map(c => c.charCodeAt(0)));
    console.log('  - Has whitespace:', testAddress !== testAddress.trim());
    console.log('  - Trimmed address:', `"${testAddress.trim()}"`);
    
    return isValid;
  };

  // Test the specific failing address
  const testFailingAddress = () => {
    const failingAddress = '0x100A87f0755545bB9B7ab096B2E2a3A3e083e4A4';
    console.log('🔍 Testing the specific failing address...');
    return testAddressValidation(failingAddress);
  };

  const handleContinue = async () => {
    if (isAddressValid && amount && parseFloat(amount) > 0 && fromAccount) {
      let resolvedAddress = toAddress;
      
      // Resolve ENS/domain names to addresses
      if (addressType === 'ens') {
        try {
          console.log('🔍 Resolving domain:', toAddress);
          const networkId = currentNetwork?.id || 'ethereum';
          const resolved = await resolveENS(toAddress, networkId);
          
          if (resolved) {
            resolvedAddress = resolved;
            console.log('✅ Domain resolved to:', resolved);
          } else {
            toast.error(`Could not resolve domain: ${toAddress}`);
            return;
          }
        } catch (error) {
          console.error('❌ Domain resolution failed:', error);
          toast.error(`Failed to resolve domain: ${toAddress}`);
          return;
        }
      }
      
      // Save transaction data to session storage for ReviewSendScreen
      const transactionData = {
        amount: amount,
        currency: selectedCurrency,
        toAddress: resolvedAddress,
        originalAddress: toAddress, // Keep original for display
        fromAccount: fromAccount.name || `Account ${fromAccount.id}`,
        fromAddress: fromAccount.address,
        network: currentNetwork?.name || 'Ethereum',
        addressType: addressType
      };
      
      sessionStorage.setItem('pendingTransaction', JSON.stringify(transactionData));
      onNavigate('review-send');
    }
  };

  const currentBalance = fromAccount ? getAccountBalance(fromAccount) : { balance: '0', usdValue: 0 };
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(currentBalance.balance);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-[#180CB2] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onGoBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold">Send</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#180CB2] mx-auto mb-4"></div>
            <div className="text-gray-600 text-[13px]">Loading accounts...</div>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">Send</h1>
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
          <div className="w-10"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6">
        {/* From Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <label className="block text-[13px] text-gray-600 mb-2">From</label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">👤</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 text-[13px]">
                  {fromAccount?.name || fromAccount?.id || 'Account 1'}
                </div>
                <div className="text-[13px] text-gray-600">
                  {fromAccount?.address || fromAccount?.addresses?.[currentNetwork?.id || 'ethereum'] ? 
                    `${(fromAccount.address || fromAccount.addresses?.[currentNetwork?.id || 'ethereum']).substring(0, 6)}...${(fromAccount.address || fromAccount.addresses?.[currentNetwork?.id || 'ethereum']).substring((fromAccount.address || fromAccount.addresses?.[currentNetwork?.id || 'ethereum']).length - 4)}` : 
                    'No address'
                  }
                </div>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </div>
        </motion.div>

        {/* Amount Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">↕</span>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none w-24"
                  aria-label="Amount to send"
                  aria-describedby="amount-description"
                  inputMode="decimal"
                />
                <div id="amount-description" className="text-[13px] text-gray-600">
                  ${amount ? (parseFloat(amount) * (portfolioValue?.assets?.[0]?.usdValue || 0)).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ξ</span>
              </div>
              <span className="font-medium text-gray-900 text-[13px]">{selectedCurrency}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          
          {/* Balance */}
          <div className="mt-2 text-green-600 text-[13px]">
            Balance: {currentBalance.balance} {selectedCurrency}
          </div>
        </motion.div>

        {/* To Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <label className="block text-[13px] text-gray-600 mb-2">To</label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder={
                addressType === 'address' ? 'Enter wallet address' :
                addressType === 'ens' ? 
                  (currentNetwork?.id === 'bsc' || currentNetwork?.id === 'binance') ? 
                    'Enter BNB domain (e.g., example.bnb)' :
                    'Enter ENS domain (e.g., vitalik.eth)' :
                'Enter UCPI ID'
              }
              value={toAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
              aria-label="Recipient address"
              aria-describedby="address-validation"
              aria-invalid={!isAddressValid && toAddress.length > 0}
            />
            <button 
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Scan QR code"
              title="Scan QR code"
            >
              <QrCode className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Address Validation */}
          {toAddress && (
            <div id="address-validation" className={`mt-2 p-3 rounded-lg ${
              isAddressValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {isAddressValid ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 text-[13px]">
                      Valid {currentNetwork?.name || 'address'} address
                    </span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-red-700 text-[13px]">
                      Invalid {currentNetwork?.name || 'address'} address
                    </span>
                  </>
                )}
              </div>
              {!isAddressValid && toAddress && (
                <div className="mt-1 text-red-600 text-[12px]">
                  {addressType === 'ens' && !['ethereum', 'polygon', 'arbitrum', 'optimism'].includes(currentNetwork?.id || 'ethereum') 
                    ? 'ENS is only supported on Ethereum networks'
                    : `Please enter a valid ${currentNetwork?.name || 'address'} address`
                  }
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Address Type Selection */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex space-x-2">
            {addressTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleAddressTypeChange(type.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                  addressType === type.id
                    ? 'bg-[#180CB2] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.icon && addressType === type.id && <type.icon className="w-4 h-4" />}
                <span className="text-[13px] font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <div className="flex space-x-6 border-b border-gray-200">
            {['accounts', 'contacts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-[13px] font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[#180CB2] border-b-2 border-[#180CB2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'accounts' ? 'Your accounts' : 'Contacts'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
            <div><strong>Debug Info:</strong></div>
            <div>Wallet: {wallet ? '✅' : '❌'}</div>
            <div>From Account: {fromAccount ? '✅' : '❌'}</div>
            <div>Accounts Count: {accounts.length}</div>
            <div>Contacts Count: {contacts.length}</div>
            <div>Current Network: {currentNetwork?.id || 'None'}</div>
            <div>From Account Address: {fromAccount?.address || fromAccount?.addresses?.[currentNetwork?.id || 'ethereum'] || 'None'}</div>
            <div>Address Type: {addressType}</div>
            <div>Is Address Valid: {isAddressValid ? '✅' : '❌'}</div>
            <div>To Address: {toAddress || 'None'}</div>
            <button 
              onClick={testFailingAddress}
              className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Test Failing Address
            </button>
          </div>
        )}

        {/* Account/Contact List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-3 mb-8"
        >
          {activeTab === 'accounts' ? (
            // Show accounts
            accounts.length > 0 ? accounts.map((account, index) => {
              const accountBalance = getAccountBalance(account);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setToAddress(account.address || account.addresses?.[currentNetwork?.id || 'ethereum'])}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-[13px]">
                        {account?.name || `Account ${account?.id || '1'}`}
                      </div>
                      <div className="text-[13px] text-gray-600">
                        {account?.address || account?.addresses?.[currentNetwork?.id || 'ethereum'] ? 
                          `${(account.address || account.addresses?.[currentNetwork?.id || 'ethereum']).substring(0, 6)}...${(account.address || account.addresses?.[currentNetwork?.id || 'ethereum']).substring((account.address || account.addresses?.[currentNetwork?.id || 'ethereum']).length - 4)}` : 
                          'No address'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900 text-[13px]">
                      ${accountBalance.usdValue.toFixed(2)}
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-[#180CB2] rounded-full"></div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <div className="text-gray-500 text-[13px]">No accounts found</div>
                <div className="text-gray-400 text-[12px] mt-1">Create an account to get started</div>
              </div>
            )
          ) : (
            // Show contacts
            contacts.length > 0 ? (
              contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setToAddress(contact.address)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-[13px]">
                        {contact.name}
                      </div>
                      <div className="text-[13px] text-gray-600">
                        {contact.address ? 
                          `${contact.address.substring(0, 6)}...${contact.address.substring(contact.address.length - 4)}` : 
                          'No address'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900 text-[13px]">
                      {contact.network || 'Unknown'}
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 text-[13px] mb-4">No contacts found</div>
                <button
                  onClick={onGoBack}
                  className="px-4 py-2 bg-[#180CB2] text-white rounded-lg hover:bg-[#140a8f] transition-colors text-[13px]"
                >
                  Go to Dashboard
                </button>
              </div>
            )
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex space-x-3"
        >
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-[13px]"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!isAddressValid || !isValidAmount}
            className={`flex-1 py-4 px-6 rounded-lg font-medium transition-colors text-[13px] ${
              isAddressValid && isValidAmount
                ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SendScreen;