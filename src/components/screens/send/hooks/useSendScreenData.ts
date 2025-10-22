import { useState, useEffect } from 'react';
import { useWallet } from '../../../../store/WalletContext';
import { storage } from '../../../../utils/storage-utils';
import { handleError } from '../../../../utils/error-handler';

export const useSendScreenData = () => {
  const { currentWallet, getWalletAccounts, getCurrentAccount } = useWallet();

  const [fromAccount, setFromAccount] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');

  // Load accounts and contacts on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentWallet) {
        setIsLoading(false);
        return;
      }

      try {
        // Load accounts
        const walletAccounts = await getWalletAccounts(currentWallet.id); // Correct: getWalletAccounts expects walletId
        setAccounts(walletAccounts);

        // Get current account with proper fallback
        let current = await getCurrentAccount(); // Correct: getCurrentAccount expects no arguments

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
        if (!current && currentWallet.accounts && currentWallet.accounts.length > 0) {
          const directAccount = currentWallet.accounts.find((acc: any) => acc.isActive) || currentWallet.accounts[0];
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
  }, [currentWallet?.id, getWalletAccounts, getCurrentAccount]); // Dependency array updated

  // Listen for wallet changes to refresh data
  useEffect(() => {
    const handleWalletChange = async (event: CustomEvent) => {
      if (!currentWallet?.id) return; // Ensure wallet is available
      try {
        const walletAccounts = await getWalletAccounts(currentWallet.id); // Correct: getWalletAccounts expects walletId
        setAccounts(walletAccounts);

        let current = await getCurrentAccount(); // Correct: getCurrentAccount expects no arguments

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
      if (!currentWallet?.id) return; // Ensure wallet is available
      try {
        // Update the from account immediately
        const current = await getCurrentAccount(); // Correct: getCurrentAccount expects no arguments
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
  }, [currentWallet?.id, getWalletAccounts, getCurrentAccount]); // Dependency array updated

  // Set currency based on current network and refresh data when network changes
  useEffect(() => {
    if (currentWallet?.currentNetwork) {
      setSelectedCurrency(currentWallet.currentNetwork.symbol || 'ETH');
      // Refresh accounts when network changes
      const refreshData = async () => {
        if (!currentWallet?.id) return; // Ensure wallet is available
        try {
          const walletAccounts = await getWalletAccounts(currentWallet.id); // Correct: getWalletAccounts expects walletId
          setAccounts(walletAccounts);

          let current = await getCurrentAccount(); // Correct: getCurrentAccount expects no arguments

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
  }, [currentWallet?.currentNetwork?.id, getWalletAccounts, getCurrentAccount]); // Dependency array updated to use .id

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




