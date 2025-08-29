import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Copy, Check, Globe, ExternalLink, User, Calendar, DollarSign } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
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
}

const ENSScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ENSDomain | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [myDomains, setMyDomains] = useState<ENSDomain[]>([
    {
      id: '1',
      name: 'mywallet.eth',
      address: wallet?.address || '',
      expiryDate: '2024-12-31',
      price: 0,
      isOwned: true,
      isAvailable: false
    }
  ]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsSearching(true);
    try {
      // In a real implementation, this would query ENS registry
      // For now, we'll create a placeholder domain
      const domain: ENSDomain = {
        id: Date.now().toString(),
        name: searchQuery.toLowerCase() + '.eth',
        address: '0x0000000000000000000000000000000000000000',
        expiryDate: '2024-12-31',
        price: 0, // Real price would be fetched from ENS
        isOwned: false,
        isAvailable: false // Real availability would be checked
      };
      
      setSearchResult(domain);
    } catch (error) {
      toast.error('Failed to search domain');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async (domain: ENSDomain) => {
    try {
      // In a real implementation, this would register the ENS domain
      toast.success(`Domain ${domain.name} registered successfully!`);
      setMyDomains(prev => [...prev, { ...domain, isOwned: true }]);
      setSearchResult(null);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to register domain');
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
          <div className="w-10"></div>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for .eth domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search Domain'}
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Search Result */}
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{searchResult.name}</h3>
                  <p className="text-slate-400 text-sm">
                    {searchResult.isAvailable ? 'Available for registration' : 'Already registered'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">
                  {formatUSD(searchResult.price)}
                </p>
                <p className="text-slate-400 text-sm">per year</p>
              </div>
            </div>
            
            {searchResult.isAvailable ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRegister(searchResult)}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Register Domain
              </motion.button>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400">This domain is not available</p>
              </div>
            )}
          </motion.div>
        )}

        {/* My Domains */}
        <div>
          <h3 className="text-lg font-semibold mb-4">My Domains</h3>
          <div className="space-y-4">
            {myDomains.map((domain, index) => (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{domain.name}</h3>
                      <p className="text-slate-400 text-sm">{formatAddress(domain.address)}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">Expires: {formatDate(domain.expiryDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyAddress(domain.address)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {copied === domain.address ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => window.open(`https://app.ens.domains/name/${domain.name}`, '_blank')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ENS Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-sm text-blue-400 font-medium">About ENS</span>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            ENS (Ethereum Name Service) allows you to use human-readable names instead of complex addresses.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">Registration Cost</p>
              <p className="text-white font-medium">~$5/year</p>
            </div>
            <div>
              <p className="text-slate-400">Gas Fees</p>
              <p className="text-white font-medium">~$20-50</p>
            </div>
          </div>
        </div>

        {myDomains.length === 0 && !searchResult && (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">No domains found</p>
            <p className="text-slate-500 text-sm">Search for a domain to get started</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ENSScreen;
