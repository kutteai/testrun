import { useState } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useWallet } from '../../../../store/WalletContext';
import { getConfig } from '../../../../utils/config-injector';
import {
  resolveENS,
  getENSRecords,
  validateENSName,
  getDomainPrice,
  getDomainExpiry,
  registerENSDomain,
  renewENSDomain,
  setENSTextRecord,
} from '../../../../utils/ens-utils';
import type { ENSDomain } from '../../../../types/ens';
import { useENSData } from './useENSData';
import { useENSSearch } from './useENSSearch';

export const useENSRegistration = () => {
  const { wallet, getPassword } = useWallet();
  const { saveDomainToStorage, myDomains } = useENSData();
  const { setSearchResult, setSearchQuery } = useENSSearch();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const handleRegister = async (domain: ENSDomain) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    setIsRegistering(true);
    try {
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for registration');
        return;
      }

      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      const config = getConfig();
      const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID || ''}`);
      const signer = new ethers.Wallet(privateKey, provider);

      const result = await registerENSDomain(domain.name, wallet.address, 31536000, signer);

      if (result.success) {
        const registeredDomain = {
          ...domain,
          id: Date.now().toString(),
          isOwned: true,
          isAvailable: false,
          address: wallet.address,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          price: await getDomainPrice(domain.name),
          txHash: result.txHash,
        };

        await saveDomainToStorage(registeredDomain);

        setSearchResult(null);
        setSearchQuery('');

        toast.success(`Domain ${domain.name} registered successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);

        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Registration failed: ${result.error}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ENS registration error:', error);
      toast.error(`Failed to register ENS domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRenewDomain = async (domain: ENSDomain) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for renewal');
        return;
      }

      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      const config = getConfig();
      const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID || ''}`);
      const signer = new ethers.Wallet(privateKey, provider);

      const result = await renewENSDomain(domain.name, 31536000, signer);

      if (result.success) {
        const updatedDomain = {
          ...domain,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          txHash: result.txHash,
        };

        await saveDomainToStorage(updatedDomain);

        toast.success(`Domain ${domain.name} renewed successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);

        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Renewal failed: ${result.error}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ENS domain renewal error:', error);
      toast.error(`Failed to renew ENS domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSetTextRecord = async (domain: ENSDomain, key: string, value: string) => {
    if (!wallet?.address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      const password = await getPassword();
      if (!password) {
        toast.error('Password required for setting records');
        return;
      }

      const privateKey = await wallet.decryptPrivateKey(password);
      if (!privateKey) {
        toast.error('Failed to decrypt private key');
        return;
      }

      const config = getConfig();
      const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID || ''}`);
      const signer = new ethers.Wallet(privateKey, provider);

      const result = await setENSTextRecord(domain.name, key, value, signer);

      if (result.success) {
        toast.success(`Text record '${key}' set successfully! Transaction: ${result.txHash?.slice(0, 10)}...`);

        const updatedRecords = await getENSRecords(domain.name);
        const updatedDomain = { ...domain, records: updatedRecords };

        await saveDomainToStorage(updatedDomain);

        if (result.txHash) {
          toast.success(`View transaction: https://etherscan.io/tx/${result.txHash}`, { duration: 8000 });
        }
      } else {
        toast.error(`Failed to set text record: ${result.error}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ENS text record setting error:', error);
      toast.error(`Failed to set text record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddCustomDomain = async (domainName: string) => {
    if (!domainName.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    const fullDomainName = domainName.toLowerCase().endsWith('.eth')
      ? domainName.toLowerCase()
      : `${domainName.toLowerCase()}.eth`;

    const validation = validateENSName(fullDomainName);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid ENS name format');
      return;
    }

    setIsAddingDomain(true);
    try {
      const existingDomain = myDomains.find((d) => d.name === fullDomainName);
      if (existingDomain) {
        toast.error('Domain already in your list');
        return;
      }

      const address = await resolveENS(fullDomainName);
      const records = address ? await getENSRecords(fullDomainName) : null;
      const expiryDate = address ? await getDomainExpiry(fullDomainName) : null;
      const price = await getDomainPrice(fullDomainName);

      const newDomain: ENSDomain = {
        id: Date.now().toString(),
        name: fullDomainName,
        address: address || '0x0000000000000000000000000000000000000000',
        expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price,
        isOwned: !!address,
        isAvailable: !address,
        resolver: records?.resolverAddress,
        avatar: records?.avatar,
        records,
      };

      await saveDomainToStorage(newDomain);

      setSearchQuery('');
      setSearchResult(null);

      toast.success(`Domain ${fullDomainName} added to your list!`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add custom domain:', error);
      toast.error('Failed to add domain. Please try again.');
    } finally {
      setIsAddingDomain(false);
    }
  };

  return {
    isRegistering,
    isAddingDomain,
    handleRegister,
    handleRenewDomain,
    handleSetTextRecord,
    handleAddCustomDomain,
  };
};




