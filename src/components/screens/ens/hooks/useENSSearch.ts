import { useState } from 'react';
import toast from 'react-hot-toast';
import { resolveENS, getENSRecords, validateENSName, getDomainPrice, getDomainExpiry } from '../../../utils/ens-utils';
import { ENSDomain } from '../../../types/ens';

interface UseENSSearchResult {
  searchQuery: string;
  searchResult: ENSDomain | null;
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  setSearchResult: (result: ENSDomain | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  handleSearch: () => Promise<void>;
}

export const useENSSearch = (): UseENSSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ENSDomain | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    // Add .eth suffix if not present
    const domainName = searchQuery.toLowerCase().endsWith('.eth')
      ? searchQuery.toLowerCase()
      : `${searchQuery.toLowerCase()}.eth`;

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
        records,
      };

      setSearchResult(domain);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ENS search error:', error);
      toast.error('Failed to search ENS domain');
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchQuery,
    searchResult,
    isSearching,
    setSearchQuery,
    setSearchResult,
    setIsSearching,
    handleSearch,
  };
};




