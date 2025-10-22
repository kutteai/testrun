import React from 'react';
import { Globe, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { ENSDomain } from '../../../../types/ens';

interface ENSLoadingEmptyStatesProps {
  isLoadingDomains: boolean;
  myDomains: ENSDomain[];
  searchResult: ENSDomain | null;
}

export const ENSLoadingEmptyStates: React.FC<ENSLoadingEmptyStatesProps> = ({
  isLoadingDomains,
  myDomains,
  searchResult,
}) => {
  return (
    <>
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
    </>
  );
};




