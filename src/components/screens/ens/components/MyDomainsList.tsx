import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit, Loader, Trash2 } from 'lucide-react';
import type { ENSDomain } from '../../../../types/ens';
import { formatAddress, formatUSD, formatDate } from '../utils/ens-format-utils';

interface MyDomainsListProps {
  myDomains: ENSDomain[];
  handleRemoveDomain: (id: string) => void;
  handleEditDomain: (domain: ENSDomain) => void;
  handleRenewDomain: (domain: ENSDomain) => void;
  removingDomainId: string | null;
  copyAddress: (address: string) => void;
}

export const MyDomainsList: React.FC<MyDomainsListProps> = ({
  myDomains,
  handleRemoveDomain,
  handleEditDomain,
  handleRenewDomain,
  removingDomainId,
  copyAddress,
}) => {
  return (
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
  );
};



