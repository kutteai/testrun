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

const SendScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getWalletAccounts, getCurrentAccount, currentNetwork } = useWallet();
  const { portfolioValue } = usePortfolio();
  const { networks } = useNetwork();
  
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
        // Load accounts
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);
        const current = await getCurrentAccount();
        setFromAccount(current || walletAccounts[0] || null);
        
        // Load contacts from storage
        const storedContacts = await storage.get('contacts');
        setContacts(storedContacts?.contacts || []);
      } catch (error) {
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
        setAccounts(walletAccounts);
        
        const current = await getCurrentAccount();
        setFromAccount(current || walletAccounts[0] || null);
      } catch (error) {
        handleError(error, {
          context: { operation: 'refreshAccountsAfterWalletChange', screen: 'SendScreen' },
          showToast: false // Don't show toast for background refresh
        });
      }
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
    };
  }, [getWalletAccounts, getCurrentAccount]);

  // Set currency based on current network
  useEffect(() => {
    if (currentNetwork) {
      setSelectedCurrency(currentNetwork.symbol || 'ETH');
    }
  }, [currentNetwork]);

  const addressTypes = [
    { id: 'address', label: 'Address', icon: Check },
    { id: 'ucpi', label: 'UCPI ID', icon: null },
    { id: 'ens', label: 'ENS', icon: null }
  ];

  const getAccountBalance = (account: any) => {
    if (!portfolioValue?.assets || !account?.address) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Find assets for this account's address
    const accountAssets = portfolioValue.assets.filter(asset => 
      asset.network?.toLowerCase() === account.network?.toLowerCase()
    );
    
    if (accountAssets.length === 0) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Calculate total balance
    const totalBalance = accountAssets.reduce((sum, asset) => {
      return sum + parseFloat(asset.balance || '0');
    }, 0);
    
    const totalUsdValue = accountAssets.reduce((sum, asset) => {
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
    // Enhanced validation for different address types
    if (addressType === 'address') {
      // Ethereum address validation (42 characters, starts with 0x)
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      // Bitcoin address validation (starts with 1, 3, or bc1)
      const btcAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
      // Solana address validation (base58, 32-44 characters)
      const solAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      
      setIsAddressValid(
        ethAddressRegex.test(value) || 
        btcAddressRegex.test(value) || 
        solAddressRegex.test(value) ||
        (value.length > 20 && /^[a-zA-Z0-9]+$/.test(value)) // Generic validation
      );
    } else if (addressType === 'ens') {
      // ENS validation (should contain .eth and be valid domain)
      const ensRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.eth$/;
      setIsAddressValid(ensRegex.test(value.toLowerCase()));
    } else if (addressType === 'ucpi') {
      // UCPI ID validation (alphanumeric, 6-20 characters)
      const ucpiRegex = /^[a-zA-Z0-9]{6,20}$/;
      setIsAddressValid(ucpiRegex.test(value));
    }
  };

  const handleContinue = () => {
    if (isAddressValid && amount && parseFloat(amount) > 0 && fromAccount) {
      // Save transaction data to session storage for ReviewSendScreen
      const transactionData = {
        amount: amount,
        currency: selectedCurrency,
        toAddress: toAddress,
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
              onClick={() => onNavigate('dashboard')}
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
          <h1 className="flex-1 text-center text-xl font-bold">
            Send
          </h1>
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
                  {fromAccount?.name || `Account ${fromAccount?.id || '1'}`}
                </div>
                <div className="text-[13px] text-gray-600">
                  {fromAccount?.address ? 
                    `${fromAccount.address.substring(0, 6)}...${fromAccount.address.substring(fromAccount.address.length - 4)}` : 
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
                addressType === 'ens' ? 'Enter ENS domain (e.g., vitalik.eth)' :
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
                    <span className="text-green-700 text-[13px]">Valid address</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-red-700 text-[13px]">Invalid address</span>
                  </>
                )}
              </div>
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

        {/* Account/Contact List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-3 mb-8"
        >
          {activeTab === 'accounts' ? (
            // Show accounts
            accounts.map((account, index) => {
              const accountBalance = getAccountBalance(account);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setToAddress(account.address)}
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
                        {account?.address ? 
                          `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : 
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
            })
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
                  onClick={() => onNavigate('dashboard')}
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