import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Loader } from 'lucide-react';
import { ENSDomain } from '../../../../types/ens';
import { formatAddress, formatUSD, formatDate } from '../utils/ens-format-utils';

interface ENSSearchResultsProps {
  searchResult: ENSDomain | null;
  copyAddress: (address: string) => void;
  handleRegister: (domain: ENSDomain) => void;
  isRegistering: boolean;
}

export const ENSSearchResults: React.FC<ENSSearchResultsProps> = ({
  searchResult,
  copyAddress,
  handleRegister,
  isRegistering,
}) => {
  if (!searchResult) return null;

  return (
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
  );
};

