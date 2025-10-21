import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Search, X, Check, AlertCircle, Loader, Shield, Globe, User, Zap, Clock } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';
import { ucpiService, type UCPIData, type UCPIRegistrationResult } from '../../services/ucpi-service';
import { ensRegistrationService, type ENSPricing } from '../../services/ens-registration-service';

const CreateUCPIScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [ucpiId, setUcpiId] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularIds, setPopularIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [ensPricing, setEnsPricing] = useState<ENSPricing | null>(null);
  const [showENSRegistration, setShowENSRegistration] = useState(false);

  // Load popular IDs and search history on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load popular UCPI IDs (mix of ENS and local)
        const popularUcpiIds = [
          'alice.eth', 'bob.eth', 'charlie.eth', 'diana.pay', 'eve.wallet',
          'frank.pro', 'grace.max', 'henry.plus', 'iris.v2', 'jack.beta'
        ];
        setPopularIds(popularUcpiIds);
        
        // Load search history
        const result = await storage.get(['ucpiSearchHistory']);
        if (result.ucpiSearchHistory) {
          setSearchHistory(result.ucpiSearchHistory);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Load UCPI search history from storage
  const loadSearchHistory = async (): Promise<string[]> => {
    try {
      const result = await storage.get(['ucpiSearchHistory']);
      return result.ucpiSearchHistory || [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load search history:', error);
      return [];
    }
  };

  // Load UCPI IDs from storage
  const loadUCPIIds = async (): Promise<string[]> => {
    try {
      const result = await storage.get(['ucpiIds']);
      return result.ucpiIds || [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load UCPI IDs:', error);
      return [];
    }
  };

  // Save UCPI search history to storage
  const saveSearchHistory = async (history: string[]): Promise<void> => {
    try {
      await storage.set({ ucpiSearchHistory: history });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save search history:', error);
    }
  };

  // Save UCPI data to storage
  const saveUCPIData = async (data: any): Promise<void> => {
    try {
      await storage.set({
        ucpiData: data,
        ucpiTimestamp: Date.now()
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save UCPI data:', error);
    }
  };

  // Real UCPI ID validation rules
  // Network-specific UCPI ID validation
  const validateUcpiId = (id: string): string[] => {
    const errors: string[] = [];
    
    if (!id) {
      errors.push('UCPI ID is required');
      return errors;
    }
    
    if (id.length < 3) {
      errors.push('UCPI ID must be at least 3 characters long');
    }
    
    if (id.length > 50) {
      errors.push('UCPI ID must be less than 50 characters');
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      errors.push('UCPI ID can only contain letters, numbers, dots, underscores, and hyphens');
    }
    
    if (id.startsWith('.') || id.startsWith('-') || id.includes('..') || id.includes('--')) {
      errors.push('UCPI ID cannot start with dots/hyphens or contain consecutive dots/hyphens');
    }

    // Network-specific validation based on domain extension
    if (id.endsWith('.eth')) {
      errors.push('💡 .eth domains can be registered automatically (requires ETH for gas fees) or imported if you already own one.');
    } else if (id.endsWith('.bnb')) {
      errors.push('⚠️ .bnb domains require manual registration at space.id with BNB gas fees. After registration, you can import it.');
    } else if (id.endsWith('.polygon')) {
      errors.push('⚠️ .polygon domains require manual registration at polygon.domains with MATIC gas fees. After registration, you can import it.');
    } else if (id.endsWith('.arb')) {
      errors.push('⚠️ .arb domains require manual registration at arbitrum.domains with ETH gas fees. After registration, you can import it.');
    } else if (!id.includes('.')) {
      errors.push('UCPI ID must include a domain extension (e.g., .local, .pay, .wallet)');
    } else if (!id.endsWith('.local') && !id.endsWith('.pay') && !id.endsWith('.wallet') && 
               !id.endsWith('.eth') && !id.endsWith('.bnb') && !id.endsWith('.polygon') && !id.endsWith('.arb')) {
      errors.push('Supported extensions: .local, .pay, .wallet (instant) or .eth, .bnb, .polygon, .arb (manual registration required)');
    }
    
    return errors;
  };

  // Local UCPI ID availability checking
  const checkUcpiIdAvailability = async (id: string): Promise<boolean> => {
    try {
      // Check if ID is already in use by this wallet
      const existingIds = await loadUCPIIds();
      if (existingIds.includes(id)) {
        return false;
      }
      
      // For demo purposes, consider most IDs as available
      // In a real implementation, you might want to check against a local database
      // or implement a more sophisticated availability system
      
      // Simple availability rules for demo:
      const reservedIds = ['admin', 'root', 'system', 'test', 'demo', 'api', 'www', 'mail', 'ftp'];
      if (reservedIds.includes(id.toLowerCase())) {
        return false;
      }
      
      // Check if ID contains only valid characters and is reasonable length
      if (id.length < 3 || id.length > 20) {
        return false;
      }
      
      // For demo, consider it available if it passes basic checks
      return true;
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check UCPI ID availability:', error);
      // Fallback to basic validation
      return id.length >= 3 && id.length <= 20;
    }
  };

  // Generate smart suggestions based on input
  const generateSuggestions = (baseId: string): string[] => {
    const suggestions: string[] = [];
    const suffixes = ['123', '2024', 'x', 'pro', 'max', 'plus', 'v2', 'beta'];
    const domains = ['eth', 'btc', 'sol', 'pay', 'wallet'];
    
    // Add number variations
    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${baseId}${i}`);
    }
    
    // Add suffix variations
    for (const suffix of suffixes) {
      suggestions.push(`${baseId}${suffix}`);
    }
    
    // Add domain variations
    for (const domain of domains) {
      suggestions.push(`${baseId}.${domain}`);
    }
    
    return suggestions.slice(0, 8); // Limit to 8 suggestions
  };

  const handleSearch = async (query: string) => {
    setUcpiId(query);
    setValidationErrors([]);
    
    if (query.length < 3) {
      setIsAvailable(null);
      setSuggestions([]);
      return;
    }

    // Validate UCPI ID format
    const errors = validateUcpiId(query);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsAvailable(false);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    setIsAvailable(null);
    
    try {
      // Use hybrid UCPI service to check availability
      const availabilityResult = await ucpiService.checkAvailability(query);
      setIsAvailable(availabilityResult.available);
      
      if (!availabilityResult.available) {
        // Generate smart suggestions
        const smartSuggestions = generateSuggestions(query);
        setSuggestions(smartSuggestions);
        
        // Show error message with registry type
        if (availabilityResult.existingAddress) {
          toast.error(`❌ ${query} is already taken locally`, { duration: 3000 });
        } else {
          toast.error(`❌ ${query} is not available`, { duration: 3000 });
        }
      } else {
        setSuggestions([]);
        
        // UCPI ID is available (no toast needed)
      }
      
      // Add to search history
      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(id => id !== query)].slice(0, 5);
        // Save to storage
        saveSearchHistory(newHistory);
        return newHistory;
      });
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Search failed:', error);
      toast.error('Failed to check UCPI ID availability');
      setIsAvailable(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!ucpiId || !isAvailable) {
      toast.error('Please select an available UCPI ID');
      return;
    }

    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    // Check if it's an ENS domain and offer registration
    if (ucpiId.endsWith('.eth')) {
      setShowENSRegistration(true);
      
      try {
        const pricing = await ensRegistrationService.getRegistrationPricing(ucpiId, 1);
        setEnsPricing(pricing);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get ENS pricing:', error);
        toast.error('Failed to get ENS pricing information');
      }
      return;
    }

    setIsCreating(true);
    
    try {
      // Use hybrid UCPI service to register non-ENS domains
      const ucpiData = {
        id: ucpiId,
        walletAddress: wallet.address,
        network: 'ethereum',
        publicKey: wallet.publicKey || '',
        createdAt: new Date().toISOString(),
        status: 'active' as const
      };

      toast.loading('Creating UCPI ID...', { id: 'ucpi-registration' });
      
      const registrationResult = await ucpiService.registerUCPI(ucpiData);
      
      if (registrationResult.success) {
        toast.success(`✅ UCPI ID "${ucpiId}" created successfully!`, { 
          id: 'ucpi-registration',
          duration: 3000
        });
        onNavigate('dashboard');
      } else {
        toast.error(registrationResult.error || 'Failed to create UCPI ID', { 
          id: 'ucpi-registration',
          duration: 5000
        });
      }
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create UCPI ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create UCPI ID: ${errorMessage}`, { 
        id: 'ucpi-registration',
        duration: 5000
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleENSRegistration = async () => {
    if (!wallet?.address || !ensPricing) return;

    setIsCreating(true);
    
    try {
      toast.loading('Registering ENS domain...', { id: 'ens-registration' });
      
      const result = await ensRegistrationService.registerDomain({
        domain: ucpiId,
        walletAddress: wallet.address,
        duration: 1,
        password: '' // Would need to prompt for password
      });

      if (result.success) {
        toast.success(`✅ ENS domain "${ucpiId}" registered successfully!`, { 
          id: 'ens-registration',
          duration: 4000
        });
        onNavigate('dashboard');
      } else {
        toast.error(result.error || 'ENS registration failed', { 
          id: 'ens-registration',
          duration: 5000
        });
      }
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ENS registration failed:', error);
      toast.error(`ENS registration failed: ${error.message}`, { 
        id: 'ens-registration',
        duration: 5000
      });
    } finally {
      setIsCreating(false);
      setShowENSRegistration(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setUcpiId(suggestion);
    setIsAvailable(true);
    setSuggestions([]);
  };

  const handleSkip = async () => {

    // Clear any error state that might cause "something went wrong"
    try {
      // Access clearError function if available
      const walletContext = require('../../store/WalletContext');
      if (walletContext.clearError) {
        walletContext.clearError();
      }
    } catch (clearError) {
      // Ignore if clearError is not available
    }
    
    toast.success('UCPI creation skipped. You can create one later from Settings.');
    
    // Navigate to dashboard immediately
    onNavigate('dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white dashboard-typography"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => onNavigate('verify-phrase')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <button
          onClick={() => onNavigate('create-password')}
          className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <span>Skip</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Create UCPI ID
          </h1>
          <p className="text-gray-600 text-lg">
            Enjoy faster and easy payments right away with UCPI ID
          </p>
        </motion.div>

        {/* UCPI ID Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3 bg-white">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                value={ucpiId}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for IDs"
                className="flex-1 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              {ucpiId && (
                <button
                  onClick={() => {
                    setUcpiId('');
                    setIsAvailable(null);
                    setSuggestions([]);
                  }}
                  className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Status Message */}
          {ucpiId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 flex items-center justify-center space-x-2 ${
                isAvailable === null ? 'text-gray-500' :
                isAvailable ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isSearching ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Checking availability...</span>
                </>
              ) : isAvailable === true ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>UCPI ID available</span>
                </>
              ) : isAvailable === false ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span>UCPI ID not available</span>
                </>
              ) : null}
            </motion.div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-1"
            >
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
            >
              <div className="text-sm font-medium text-gray-700 mb-2">Available alternatives:</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700">{suggestion}</span>
                  <Check className="w-5 h-5 text-green-600" />
                </button>
              ))}
            </motion.div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && !ucpiId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Recent searches</span>
              </div>
              <div className="space-y-2">
                {searchHistory.map((id, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(id)}
                    className="w-full flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <span className="text-blue-700 text-sm">{id}</span>
                    <Search className="w-4 h-4 text-blue-500" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Popular UCPI IDs */}
          {!ucpiId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Popular UCPI IDs</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {popularIds.map((id, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(id)}
                    className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-gray-700 text-sm">{id}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Create Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleCreate}
          disabled={!ucpiId || !isAvailable || isCreating}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 mb-3 ${
            ucpiId && isAvailable && !isCreating
              ? 'bg-[#180CB2] hover:bg-[#140a8f] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isCreating ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Creating UCPI ID...</span>
            </div>
          ) : (
            'Create UCPI ID'
          )}
        </button>
        
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          disabled={isCreating}
          className="w-full py-3 px-6 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
        >
          Skip for now
        </button>
      </motion.div>
    </motion.div>
  );
};

export default CreateUCPIScreen;
