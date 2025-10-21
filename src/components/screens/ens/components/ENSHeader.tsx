import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Search, Globe, Loader, Plus, RefreshCw,
} from 'lucide-react';

interface ENSHeaderProps {
  onNavigate: (screen: string) => void;
  setShowAddDomainModal: (show: boolean) => void;
  setSearchResult: (result: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  isSearching: boolean;
}

export const ENSHeader: React.FC<ENSHeaderProps> = ({
  onNavigate,
  setShowAddDomainModal,
  setSearchResult,
  searchQuery,
  setSearchQuery,
  handleSearch,
  isSearching,
}) => {
  return (
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
  );
};



