import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Copy, Check, Globe, ExternalLink, User, Calendar, DollarSign, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { resolveENS, lookupENS, getENSRecords, validateENSName, getDomainPrice, getDomainExpiry } from '../../utils/ens-utils';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

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
}

const ENSScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ENSDomain | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [myDomains, setMyDomains] = useState<ENSDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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
      // Try to reverse resolve the user's address to ENS name
      const ensName = await lookupENS(wallet.address);
      
      if (ensName) {
        const records = await getENSRecords(ensName);
        const expiryDate = await getDomainExpiry(ensName);
        
        const domain: ENSDomain = {
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
        
        setMyDomains([domain]);
      } else {
        setMyDomains([]);
      }
    } catch (error) {
      console.error('Error loading user domains:', error);
      setMyDomains([]);
    } finally {
      setIsLoadingDomains(false);
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
      // In a real implementation, this would interact with ENS contracts
      // For now, we'll simulate the registration process
      
      toast.success(`Registration simulation for ${domain.name} completed!`);
      
      const registeredDomain = {
        ...domain,
        isOwned: true,
        isAvailable: false,
        address: wallet.address
      };
      
      setMyDomains(prev => [...prev, registeredDomain]);
      setSearchResult(null);
      setSearchQuery('');
      
      toast.success(`Domain ${domain.name} registered successfully!`);
    } catch (error) {
      console.error('ENS registration error:', error);
      toast.error('Failed to register ENS domain');
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{domain.name}</h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">Owned</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Address:</span>
                    <span className="font-mono">{formatAddress(domain.address)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expires:</span>
                    <span>{formatDate(domain.expiryDate)}</span>
                  </div>
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
    </div>
  );
};

export default ENSScreen;