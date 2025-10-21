import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, X } from 'lucide-react';

interface AddDomainModalProps {
  showAddDomainModal: boolean;
  setShowAddDomainModal: (show: boolean) => void;
  newDomainName: string;
  setNewDomainName: (name: string) => void;
  handleAddCustomDomain: (domainName: string) => void;
  isAddingDomain: boolean;
}

export const AddDomainModal: React.FC<AddDomainModalProps> = ({
  showAddDomainModal,
  setShowAddDomainModal,
  newDomainName,
  setNewDomainName,
  handleAddCustomDomain,
  isAddingDomain,
}) => {
  if (!showAddDomainModal) return null;

  return (
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
  );
};



