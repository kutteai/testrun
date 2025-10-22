import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '../../../store/WalletContext';
import { storage } from '../../../utils/storage-utils';
import { lookupENS, getENSRecords, getDomainExpiry } from '../../../utils/ens-utils';
import { ENSDomain } from '../../../types/ens';

interface UseENSDataResult {
  myDomains: ENSDomain[];
  isLoadingDomains: boolean;
  editingDomain: ENSDomain | null;
  showEditModal: boolean;
  removingDomainId: string | null;
  loadUserDomains: () => Promise<void>;
  saveDomainToStorage: (domain: ENSDomain) => Promise<void>;
  handleRemoveDomain: (domainId: string) => Promise<void>;
  handleEditDomain: (domain: ENSDomain) => void;
  handleSaveDomainEdit: (updatedDomain: ENSDomain) => Promise<void>;
  setShowEditModal: (show: boolean) => void;
  setEditingDomain: (domain: ENSDomain | null) => void;
  setRemovingDomainId: (id: string | null) => void;
}

export const useENSData = (): UseENSDataResult => {
  const { wallet } = useWallet();
  const [myDomains, setMyDomains] = useState<ENSDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
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
          records,
        };

        // Add user's domain if not already in the list
        if (!domains.find((d) => d.name === ensName)) {
          domains = [userDomain, ...domains];
        }
      }

      setMyDomains(domains);
    } catch (error) {
      // eslint-disable-next-line no-console
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error saving ENS domain:', error);
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
      setMyDomains((prev) => prev.filter((d) => d.id !== domainId));

      toast.success('Domain removed from your list');
    } catch (error) {
      // eslint-disable-next-line no-console
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
      setMyDomains((prev) => prev.map((d) => (d.id === updatedDomain.id ? updatedDomain : d)));

      setShowEditModal(false);
      setEditingDomain(null);

      toast.success('Domain updated successfully!');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update domain:', error);
      toast.error('Failed to update domain');
    }
  };

  return {
    myDomains,
    isLoadingDomains,
    editingDomain,
    showEditModal,
    removingDomainId,
    loadUserDomains,
    saveDomainToStorage,
    handleRemoveDomain,
    handleEditDomain,
    handleSaveDomainEdit,
    setShowEditModal,
    setEditingDomain,
    setRemovingDomainId,
  };
};




