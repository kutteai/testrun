import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Copy, Check, Globe, ExternalLink, User, Calendar, DollarSign, Loader, AlertCircle, RefreshCw, Plus, Edit, Trash2, X } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { getConfig } from '../../utils/config-injector';
import { 
  resolveENS, 
  lookupENS, 
  getENSRecords, 
  validateENSName, 
  getDomainPrice, 
  getDomainExpiry,
  registerENSDomain,
  renewENSDomain,
  setupENSResolver,
  setENSTextRecord
} from '../../utils/ens-utils';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';

interface ENSDomain {
  id: string;
  name: string;
  address: string;
  expiryDate: string;
  price: number;
  isOwned: boolean;
  isAvailable: boolean;
  resolver?: string;
  avatar?: string;
  records?: any;
  notes?: string;
  txHash?: string;
}

const ENSScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, getPassword } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ENSDomain | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [myDomains, setMyDomains] = useState<ENSDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState<ENSDomain | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [removingDomainId, setRemovingDomainId] = useState<string | null>(null);

  // Load user's ENS domains
  useEffect(() => {
    if (wallet?.address) {
      loadUserDomains();
    }
  }, [wallet?.address]);

  const loadUserDomains = async () => {
    if (!wallet?.address) return;

    setIsLoadingDomains(true);
    try {
      // Load saved ENS domains from storage
      const result = await storage.get(['savedENSDomains']);
      const savedDomains = result.savedENSDomains || [];
      
      // Try to reverse resolve the user's address to ENS name
      const ensName = await lookupENS(wallet.address);
      
      let domains: ENSDomain[] = [...savedDomains];
      
      if (ensName) {
        const records = await getENSRecords(ensName);
        const expiryDate = await getDomainExpiry(ensName);
        
        const userDomain: ENSDomain = {
          id: Date.now().toString(),
          name: ensName,
          address: wallet.address,
          expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          price: 0,
          isOwned: true,
          isAvailable: false,
          resolver: records.resolverAddress,
          avatar: records.avatar,
          records
        };
        
        // Add user's domain if not already in the list
        if (!domains.find(d => d.name === ensName)) {
          domains = [userDomain, ...domains];
        }
      }
      
      setMyDomains(domains);
    } catch (error) {
      console.error('Error loading user domains:', error);
      setMyDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const saveDomainToStorage = async (domain: ENSDomain) => {
    try {
      const result = await storage.get(['savedENSDomains']);
      const savedDomains = result.savedENSDomains || [];
      
      // Check if domain already exists
      const existingIndex = savedDomains.findIndex((d: ENSDomain) => d.name === domain.name);
      
      if (existingIndex >= 0) {
        // Update existing domain
        savedDomains[existingIndex] = domain;
      } else {
        // Add new domain
        savedDomains.push(domain);
      }
      
      await storage.set({ savedENSDomains: savedDomains });
      console.log('✅ ENS domain saved to storage:', domain.name);
    } catch (error) {
      console.error('❌ Error saving ENS domain:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    // Add .eth suffix if not present
    const domainName = searchQuery.toLowerCase().endsWith('.eth') 
      ? searchQuery.toLowerCase() 
      : searchQuery.toLowerCase() + '.eth';

    const validation = validateENSName(domainName);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid ENS name format');
      return;
    }

    setIsSearching(true);
    try {
      // Try to resolve the ENS name to address
      const address = await resolveENS(domainName);
      const records = address ? await getENSRecords(domainName) : null;
      const expiryDate = address ? await getDomainExpiry(domainName) : null;

      const domain: ENSDomain = {
        id: Date.now().toString(),
        name: domainName,
        address: address || '0x0000000000000000000000000000000000000000',
        expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: await getDomainPrice(domainName),
        isOwned: !!address,
        isAvailable: !address,
        resolver: records?.resolverAddress,
        avatar: records?.avatar,
        records
      };
      
      setSearchResult(domain);
    } catch (error) {
      console.error('ENS search error:', error);
      toast.error('Failed to search ENS domain');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async (domain: ENSDomain) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    setIsRegistering(true);
    try {
      // Get user's password to decrypt private key
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for registration');
        return;
      }

      // Decrypt private key
      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      // Create signer from private key
      const config = getConfig();
      const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/' + (config.INFURA_PROJECT_ID || ''));
      const signer = new ethers.Wallet(privateKey, provider);

      // Real ENS domain registration
      const result = await registerENSDomain(domain.name, wallet.address, 31536000, signer);
      
      if (result.success) {
        // Registration successful
        const registeredDomain = {
          ...domain,
          id: Date.now().toString(),
          isOwned: true,
          isAvailable: false,
          address: wallet.address,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          txHash: result.txHash
        };
        
        // Save to storage
        await saveDomainToStorage(registeredDomain);
        
        // Update local state
        setMyDomains(prev => [...prev, registeredDomain]);
        setSearchResult(null);
        setSearchQuery('');
        
        toast.success(`Domain ${domain.name} registered successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);
        
        // Show transaction details
        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Registration failed: ${result.error}`);
      }
    } catch (error) {
      console.error('ENS registration error:', error);
      toast.error(`Failed to register ENS domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  // Real ENS domain renewal
  const handleRenewDomain = async (domain: ENSDomain) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      // Get user's password to decrypt private key
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for renewal');
        return;
      }

      // Decrypt private key
      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      // Create signer from private key
      const config = getConfig();
      const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/' + (config.INFURA_PROJECT_ID || ''));
      const signer = new ethers.Wallet(privateKey, provider);

      // Real ENS domain renewal
      const result = await renewENSDomain(domain.name, 31536000, signer);
      
      if (result.success) {
        // Update domain expiry date
        const updatedDomain = {
          ...domain,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          txHash: result.txHash
        };
        
        // Save to storage
        await saveDomainToStorage(updatedDomain);
        
        // Update local state
        setMyDomains(prev => prev.map(d => d.id === domain.id ? updatedDomain : d));
        
        toast.success(`Domain ${domain.name} renewed successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);
        
        // Show transaction details
        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Renewal failed: ${result.error}`);
      }
    } catch (error) {
      console.error('ENS domain renewal error:', error);
      toast.error(`Failed to renew ENS domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Real ENS text record setting
  const handleSetTextRecord = async (domain: ENSDomain, key: string, value: string) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      // Get user's password to decrypt private key
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for setting records');
        return;
      }

      // Decrypt private key
      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      // Create signer from private key
      const config = getConfig();
      const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/' + (config.INFURA_PROJECT_ID || ''));
      const signer = new ethers.Wallet(privateKey, provider);

      // Real ENS text record setting
      const result = await setENSTextRecord(domain.name, key, value, signer);
      
      if (result.success) {
        toast.success(`Text record '${key}' set successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);
        
        // Refresh domain records
        const updatedRecords = await getENSRecords(domain.name);
        const updatedDomain = { ...domain, records: updatedRecords };
        
        // Save to storage
        await saveDomainToStorage(updatedDomain);
        
        // Update local state
        setMyDomains(prev => prev.map(d => d.id === domain.id ? updatedDomain : d));
        
        // Show transaction details
        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Failed to set text record: ${result.error}`);
      }
    } catch (error) {
      console.error('ENS text record setting error:', error);
      toast.error(`Failed to set text record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add custom domain to user's list
  const handleAddCustomDomain = async (domainName: string) => {
    if (!domainName.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    // Add .eth suffix if not present
    const fullDomainName = domainName.toLowerCase().endsWith('.eth') 
      ? domainName.toLowerCase() 
      : domainName.toLowerCase() + '.eth';

    // Validate domain name
    const validation = validateENSName(fullDomainName);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid ENS name format');
      return;
    }

    setIsAddingDomain(true);
    try {
      // Check if domain already exists in user's list
      const existingDomain = myDomains.find(d => d.name === fullDomainName);
      if (existingDomain) {
        toast.error('Domain already in your list');
        return;
      }

      // Check domain availability and get info
      const address = await resolveENS(fullDomainName);
      const records = address ? await getENSRecords(fullDomainName) : null;
      const expiryDate = address ? await getDomainExpiry(fullDomainName) : null;
      const price = await getDomainPrice(fullDomainName);

      const newDomain: ENSDomain = {
        id: Date.now().toString(),
        name: fullDomainName,
        address: address || '0x0000000000000000000000000000000000000000',
        expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: price,
        isOwned: !!address,
        isAvailable: !address,
        resolver: records?.resolverAddress,
        avatar: records?.avatar,
        records: records
      };

      // Add to storage
      await saveDomainToStorage(newDomain);
      
      // Update local state
      setMyDomains(prev => [newDomain, ...prev]);
      
      // Clear form
      setNewDomainName('');
      setShowAddDomainModal(false);
      
      toast.success(`Domain ${fullDomainName} added to your list!`);
      
    } catch (error) {
      console.error('Failed to add custom domain:', error);
      toast.error('Failed to add domain. Please try again.');
    } finally {
      setIsAddingDomain(false);
    }
  };

  // Remove domain from user's list
  const handleRemoveDomain = async (domainId: string) => {
    try {
      setRemovingDomainId(domainId);
      
      // Remove from storage
      const result = await storage.get(['savedENSDomains']);
      const savedDomains = result.savedENSDomains || [];
      const updatedDomains = savedDomains.filter((d: ENSDomain) => d.id !== domainId);
      
      await storage.set({ savedENSDomains: updatedDomains });
      
      // Update local state
      setMyDomains(prev => prev.filter(d => d.id !== domainId));
      
      toast.success('Domain removed from your list');
      
    } catch (error) {
      console.error('Failed to remove domain:', error);
      toast.error('Failed to remove domain');
    } finally {
      setRemovingDomainId(null);
    }
  };

  // Edit domain information
  const handleEditDomain = (domain: ENSDomain) => {
    setEditingDomain(domain);
    setShowEditModal(true);
  };

  // Save domain edits
  const handleSaveDomainEdit = async (updatedDomain: ENSDomain) => {
    try {
      // Update in storage
      await saveDomainToStorage(updatedDomain);
      
      // Update local state
      setMyDomains(prev => prev.map(d => d.id === updatedDomain.id ? updatedDomain : d));
      
      setShowEditModal(false);
      setEditingDomain(null);
      
      toast.success('Domain updated successfully!');
      
    } catch (error) {
      console.error('Failed to update domain:', error);
      toast.error('Failed to update domain');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#180CB2] to-slate-900 text-white flex flex-col">
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ENS</h1>
              <p className="text-slate-400 text-sm">Ethereum Name Service</p>
            </div>
          </div>
          <button
            onClick={() => setSearchResult(null)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowAddDomainModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Domain</span>
          </button>
        </div>

        {/* Search Section */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for .eth domains (e.g., vitalik)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors"
            >
              {isSearching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search Results */}
      {searchResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-6"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{searchResult.name}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                searchResult.isAvailable 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {searchResult.isAvailable ? 'Available' : 'Registered'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Address:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{formatAddress(searchResult.address)}</span>
                  <button
                    onClick={() => copyAddress(searchResult.address)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="font-semibold">{formatUSD(searchResult.price)}</span>
              </div>

              {!searchResult.isAvailable && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Expires:</span>
                  <span className="font-semibold">{formatDate(searchResult.expiryDate)}</span>
                </div>
              )}

              {searchResult.resolver && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Resolver:</span>
                  <span className="font-mono text-sm">{formatAddress(searchResult.resolver)}</span>
                </div>
              )}
            </div>

            {searchResult.isAvailable ? (
              <button
                onClick={() => handleRegister(searchResult)}
                disabled={isRegistering}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                {isRegistering ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Registering...</span>
                  </div>
                ) : (
                  `Register for ${formatUSD(searchResult.price)}`
                )}
              </button>
            ) : (
              <div className="text-center text-gray-400 py-2">
                This domain is already registered
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* My Domains */}
      {myDomains.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-6"
        >
          <h3 className="text-lg font-semibold mb-4">My Domains</h3>
          <div className="space-y-3">
            {myDomains.map((domain) => (
              <div key={domain.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{domain.name}</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      domain.isOwned ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-xs ${
                      domain.isOwned ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {domain.isOwned ? 'Owned' : 'Watching'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-400 mb-3">
                  <div className="flex items-center justify-between">
                    <span>Address:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">{formatAddress(domain.address)}</span>
                      <button
                        onClick={() => copyAddress(domain.address)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expires:</span>
                    <span>{formatDate(domain.expiryDate)}</span>
                  </div>
                  {domain.price > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Price:</span>
                      <span className="font-semibold">{formatUSD(domain.price)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    {domain.isOwned && (
                      <button
                        onClick={() => handleRenewDomain(domain)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-xs rounded-lg transition-colors"
                      >
                        Renew
                      </button>
                    )}
                    <button
                      onClick={() => handleEditDomain(domain)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveDomain(domain.id)}
                    disabled={removingDomainId === domain.id}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs rounded-lg transition-colors flex items-center space-x-1"
                  >
                    {removingDomainId === domain.id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoadingDomains && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoadingDomains && myDomains.length === 0 && !searchResult && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No ENS Domains</h3>
            <p className="text-sm text-gray-500">Search for a domain above to get started</p>
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {showAddDomainModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-800 rounded-2xl p-6 w-96 mx-4 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Domain to Watch</h3>
              <button
                onClick={() => setShowAddDomainModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="Enter domain name (e.g., vitalik)"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomDomain(newDomainName)}
                />
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => setShowAddDomainModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCustomDomain(newDomainName)}
                  disabled={!newDomainName.trim() || isAddingDomain}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isAddingDomain ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Adding...</span>
                    </div>
                  ) : (
                    'Add Domain'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Domain Modal */}
      {showEditModal && editingDomain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-800 rounded-2xl p-6 w-96 mx-4 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Edit Domain</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={editingDomain.name}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={editingDomain.notes || ''}
                  onChange={(e) => setEditingDomain({...editingDomain, notes: e.target.value})}
                  placeholder="Add notes about this domain..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveDomainEdit(editingDomain)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ENSScreen;