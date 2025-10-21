import { useState, useEffect } from 'react';
import { useWallet } from '../../../store/WalletContext';
import { useNetwork } from '../../../store/NetworkContext';
import { storage } from '../../../utils/storage-utils';
import { handleError } from '../../../utils/error-handler';

export const useSendScreenData = () => {
  const { wallet, getWalletAccounts, getCurrentAccount } = useWallet();
  const { currentNetwork } = useNetwork();

  const [fromAccount, setFromAccount] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');

  // Load accounts and contacts on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }

      try {

        // Load accounts
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);

        // Get current account with proper fallback
        let current = await getCurrentAccount();

        // If no current account, use the first available account
        if (!current && walletAccounts.length > 0) {
          current = walletAccounts[0];
        }

        setFromAccount(current);

        // Load contacts from storage
        const storedContacts = await storage.get(['addressBook']);
        const contactsData = storedContacts?.addressBook || [];
        setContacts(contactsData);

        // If still no account, try to get from wallet directly
        if (!current && wallet.accounts && wallet.accounts.length > 0) {
          const directAccount = wallet.accounts.find((acc: any) => acc.isActive) || wallet.accounts[0];
          setFromAccount(directAccount);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ SendScreen: Error loading data:', error);
        handleError(error, {
          context: { operation: 'loadSendScreenData', screen: 'SendScreen' },
          showToast: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [wallet, getWalletAccounts, getCurrentAccount]);

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      try {
        const walletAccounts = await getWalletAccounts();
        setAccounts(walletAccounts);

        let current = await getCurrentAccount();

        // Fallback to first account if no current account
        if (!current && walletAccounts.length > 0) {
          current = walletAccounts[0];
        }

        setFromAccount(current);

        // Also refresh contacts
        const storedContacts = await storage.get(['addressBook']);
        const contactsData = storedContacts?.addressBook || [];
        setContacts(contactsData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ SendScreen: Error refreshing after wallet change:', error);
        handleError(error, {
          context: { operation: 'refreshAccountsAfterWalletChange', screen: 'SendScreen' },
          showToast: false, // Don't show toast for background refresh
        });
      }
    };

    const handleAccountSwitched = async (event: CustomEvent) => {
      try {
        // Update the from account immediately
        const current = await getCurrentAccount();
        if (current) {
          setFromAccount(current);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ SendScreen: Error updating after account switch:', error);
      }
    };

    window.addEventListener('walletChanged', handleWalletChange as EventListener);
    window.addEventListener('accountSwitched', handleAccountSwitched as EventListener);
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange as EventListener);
      window.removeEventListener('accountSwitched', handleAccountSwitched as EventListener);
    };
  }, [getWalletAccounts, getCurrentAccount]);

  // Set currency based on current network and refresh data when network changes
  useEffect(() => {
    if (currentNetwork) {
      setSelectedCurrency(currentNetwork.symbol || 'ETH');
      // Refresh accounts when network changes
      const refreshData = async () => {
        try {
          const walletAccounts = await getWalletAccounts();
          setAccounts(walletAccounts);

          let current = await getCurrentAccount();

          // Fallback to first account if no current account
          if (!current && walletAccounts.length > 0) {
            current = walletAccounts[0];
          }

          setFromAccount(current);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('❌ SendScreen: Error refreshing accounts on network change:', error);
        }
      };
      refreshData();
    }
  }, [currentNetwork, getWalletAccounts, getCurrentAccount]);

  return {
    fromAccount,
    setFromAccount,
    accounts,
    setAccounts,
    contacts,
    setContacts,
    isLoading,
    setIsLoading,
    selectedCurrency,
    setSelectedCurrency,
  };
};

