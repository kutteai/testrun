import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from '../store/WalletContext';
import { useNetwork } from '../store/NetworkContext';
import { usePortfolio } from '../store/PortfolioContext';
import { useTransaction } from '../store/TransactionContext';
import { useSecurity } from '../store/SecurityContext';
import { useNFT } from '../store/NFTContext';

// Screens
import WelcomeScreen from '../components/screens/WelcomeScreen';
import CreateWalletScreen from '../components/screens/CreateWalletScreen';
import ImportWalletScreen from '../components/screens/ImportWalletScreen';
import VerifySeedScreen from '../components/screens/VerifySeedScreen';
import DashboardScreen from '../components/screens/DashboardScreen';
import SendScreen from '../components/screens/SendScreen';
import ReceiveScreen from '../components/screens/ReceiveScreen';
import SettingsScreen from '../components/screens/SettingsScreen';
import SecurityScreen from '../components/screens/SecurityScreen';
import NetworksScreen from '../components/screens/NetworksScreen';
import AccountsScreen from '../components/screens/AccountsScreen';
import TokensScreen from '../components/screens/TokensScreen';
import ENSScreen from '../components/screens/ENSScreen';
import HardwareWalletScreen from '../components/screens/HardwareWalletScreen';
import GasSettingsScreen from '../components/screens/GasSettingsScreen';

import NFTsScreen from '../components/screens/NFTsScreen';
import PortfolioScreen from '../components/screens/PortfolioScreen';
import TransactionsScreen from '../components/screens/TransactionsScreen';
import NotificationsScreen from '../components/screens/NotificationsScreen';
import NotificationSettingsScreen from '../components/screens/NotificationSettingsScreen';
import EnableNotificationsScreen from '../components/screens/EnableNotificationsScreen';
import AboutScreen from '../components/screens/AboutScreen';
import TransactionHistoryScreen from '../components/screens/TransactionHistoryScreen';
import BitcoinScreen from '../components/screens/BitcoinScreen';
import SolanaScreen from '../components/screens/SolanaScreen';
import TronScreen from '../components/screens/TronScreen';
import LitecoinScreen from '../components/screens/LitecoinScreen';
import TonScreen from '../components/screens/TonScreen';
import XrpScreen from '../components/screens/XrpScreen';
import { WalletConnectScreen } from '../components/screens/WalletConnectScreen';
import LoadingScreen from '../components/screens/LoadingScreen';
import ErrorScreen from '../components/screens/ErrorScreen';
import TermsScreen from '../components/screens/TermsScreen';
import CreateUCPIScreen from '../components/screens/CreateUCPIScreen';
import CreatePasswordScreen from '../components/screens/CreatePasswordScreen';
import RecoveryPhraseScreen from '../components/screens/RecoveryPhraseScreen';
import VerifyPhraseScreen from '../components/screens/VerifyPhraseScreen';
import CreateWalletSetupScreen from '../components/screens/CreateWalletSetupScreen';
import ImportSeedPhraseScreen from '../components/screens/ImportSeedPhraseScreen';
import ImportPrivateKeyScreen from '../components/screens/ImportPrivateKeyScreen';
import AddAccountScreen from '../components/screens/AddAccountScreen';
import WalletDetailsScreen from '../components/screens/WalletDetailsScreen';
import ManageCryptoScreen from '../components/screens/ManageCryptoScreen';
import ManageWalletScreen from '../components/screens/ManageWalletScreen';
import ReviewSendScreen from '../components/screens/ReviewSendScreen';
import SwapScreen from '../components/screens/SwapScreen';
import BuySellScreen from '../components/screens/BuySellScreen';
import OptionsMenuScreen from '../components/screens/OptionsMenuScreen';
import PreferencesScreen from '../components/screens/PreferencesScreen';
import WalletSecurityScreen from '../components/screens/WalletSecurityScreen';
import MoreScreen from '../components/screens/MoreScreen';
import AccountDetailsScreen from '../components/screens/AccountDetailsScreen';
import ManageNetworksScreen from '../components/screens/ManageNetworksScreen';
import AddCustomNetworkScreen from '../components/screens/AddCustomNetworkScreen';
import SupportScreen from '../components/screens/SupportScreen';
import AddressBookScreen from '../components/screens/AddressBookScreen';
import BackupsScreen from '../components/screens/BackupsScreen';

// Components
import Navigation from '../components/common/Navigation';
import ErrorBoundary from '../components/ErrorBoundary';

import type { ScreenId } from '../types/index';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('welcome');
  const [error, setError] = useState<string | null>(null);

  const { wallet, hasWallet, isWalletUnlocked, isInitializing } = useWallet();
  const { currentNetwork } = useNetwork();
  const { portfolioValue } = usePortfolio();
  const { pendingTransactions } = useTransaction();
  const { securityState } = useSecurity();
  const { nfts } = useNFT();

  // Check for pending dApp unlock requests
  useEffect(() => {
    const checkForDAppRequest = async () => {
      try {
        const result = await chrome.storage.local.get(['pendingDAppRequest']);
        if (result.pendingDAppRequest) {
          console.log('🔍 Popup: Found pending dApp request:', result.pendingDAppRequest);
          
          // If wallet exists but is locked, force unlock screen
          if (hasWallet && !isWalletUnlocked) {
            console.log('🔒 Popup: Forcing unlock screen for dApp request');
            setCurrentScreen('welcome');
            
            // Show a toast to inform user
            setTimeout(() => {
              toast('🔗 dApp connection requires wallet unlock', {
                duration: 4000,
                icon: '🔓'
              });
            }, 500);
          }
        }
      } catch (error) {
        console.log('Could not check for pending dApp request:', error);
      }
    };
    
    if (!isInitializing) {
      checkForDAppRequest();
    }
  }, [hasWallet, isWalletUnlocked, isInitializing]);

  useEffect(() => {
    if (isInitializing) {
      setCurrentScreen('welcome');
      return;
    }

    // Error handling - redirect to dashboard if on error screen
    if (currentScreen === 'error') {
      setCurrentScreen('dashboard');
      return;
    }

    if (!hasWallet) {
      setCurrentScreen('welcome');
    } else if (!isWalletUnlocked) {
      setCurrentScreen('security');
    } else {
      setCurrentScreen('dashboard');
    }
  }, [wallet, hasWallet, isWalletUnlocked, isInitializing, error]);

  const handleNavigate = (screen: ScreenId) => {
    setPreviousScreen(currentScreen);
    
    // Prevent navigation to error screen
    if (screen === 'error') {
      toast.error('Navigation blocked');
      return;
    }
    
    setCurrentScreen(screen);
  };

  const handleGoBack = () => {
    // If we have a previous screen and it's not the current screen, go back to it
    if (previousScreen && previousScreen !== currentScreen) {
      setCurrentScreen(previousScreen);
    } else {
      // Default fallback to dashboard
      setCurrentScreen('dashboard');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} hasWallet={hasWallet} isWalletUnlocked={isWalletUnlocked} />;
      case 'terms':
        return <TermsScreen onNavigate={handleNavigate} />;
      case 'create':
        return <CreateWalletScreen onNavigate={handleNavigate} />;
      case 'create-wallet-setup':
        return <CreateWalletSetupScreen onNavigate={handleNavigate} />;
      case 'create-ucpi':
        return <CreateUCPIScreen onNavigate={handleNavigate} />;
      case 'create-password':
        return <CreatePasswordScreen onNavigate={handleNavigate} />;
      case 'recovery-phrase':
        return <RecoveryPhraseScreen onNavigate={handleNavigate} />;
      case 'verify-phrase':
        return <VerifyPhraseScreen onNavigate={handleNavigate} />;
      case 'import':
        return <ImportWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'import-seed-phrase':
        return <ImportSeedPhraseScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'import-private-key':
        return <ImportPrivateKeyScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'hardware-wallet':
        return <HardwareWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'add-account':
        return <AddAccountScreen onNavigate={handleNavigate} />;
      case 'wallet-details':
        return <WalletDetailsScreen onNavigate={handleNavigate} />;
      case 'manage-crypto':
        return <ManageCryptoScreen onNavigate={handleNavigate} />;
      case 'manage-wallet':
        return <ManageWalletScreen onNavigate={handleNavigate} />;
      case 'send':
        return <SendScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'review-send':
        return <ReviewSendScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'swap':
        return <SwapScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'buy-sell':
        return <BuySellScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'options':
        return <OptionsMenuScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={handleNavigate} />;
      case 'notification-settings':
        return <NotificationSettingsScreen onNavigate={handleNavigate} />;
      case 'enable-notifications':
        return <EnableNotificationsScreen onNavigate={handleNavigate} />;
      case 'preferences':
        return <PreferencesScreen onNavigate={handleNavigate} />;
      case 'wallet-security':
        return <WalletSecurityScreen onNavigate={handleNavigate} />;
      case 'more':
        return <MoreScreen onNavigate={handleNavigate} />;
      case 'about':
        return <AboutScreen onNavigate={handleNavigate} />;
      case 'account-details':
        return <AccountDetailsScreen onNavigate={handleNavigate} />;
      case 'verify':
        return <VerifySeedScreen onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardScreen onNavigate={handleNavigate} />;
      case 'receive':
        return <ReceiveScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'security':
        return <SecurityScreen onNavigate={handleNavigate} />;
      case 'networks':
        return <NetworksScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'accounts':
        console.log('Rendering AccountsScreen');
        try {
          return <AccountsScreen onNavigate={handleNavigate} />;
        } catch (error) {
          console.error('Error rendering AccountsScreen:', error);
          return <div>Error loading Accounts screen</div>;
        }
      case 'tokens':
        console.log('Rendering TokensScreen');
        try {
          return <TokensScreen onNavigate={handleNavigate} />;
        } catch (error) {
          console.error('Error rendering TokensScreen:', error);
          return <div>Error loading Tokens screen</div>;
        }
      case 'ens':
        return <ENSScreen onNavigate={handleNavigate} />;
      case 'hardware':
        return <HardwareWalletScreen onNavigate={handleNavigate} />;
      case 'gas':
        return <GasSettingsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'bitcoin':
        return <BitcoinScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'solana':
        return <SolanaScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'tron':
        return <TronScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'litecoin':
        return <LitecoinScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'ton':
        return <TonScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'xrp':
        return <XrpScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'manage-networks':
        return <ManageNetworksScreen onNavigate={handleNavigate} />;
      case 'add-custom-network':
        return <AddCustomNetworkScreen onNavigate={handleNavigate} />;
      case 'import-google':
        return <div className="p-6 text-center">Import Google - Coming Soon</div>;
      case 'address-book':
        return <AddressBookScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'backups':
        return <BackupsScreen onNavigate={handleNavigate} />;
      case 'expand-view':
        return <div className="p-6 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Expand to Full Screen</h3>
            <p className="text-gray-600 mb-4">Open PayCio Wallet in a full-screen window for a better experience.</p>
            <button
              onClick={async () => {
                try {
                  // Import the expand utility
                  const { openExpandedView, isWindowOpeningSupported } = await import('../utils/expand-utils');
                  
                  if (isWindowOpeningSupported()) {
                    await openExpandedView({
                      width: 1200,
                      height: 800,
                      left: 100,
                      top: 100,
                      focused: true,
                      type: 'normal'
                    });
                    // Close the popup after opening expanded view
                    window.close();
                  } else {
                    alert('Full screen mode not supported in this browser');
                  }
                } catch (error) {
                  console.error('Failed to open expanded view:', error);
                  alert('Failed to open full screen mode');
                }
              }}
              className="w-full bg-[#180CB2] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1409a0] transition-colors"
            >
              Open Full Screen
            </button>
          </div>
        </div>;
      case 'support':
        return <SupportScreen onNavigate={handleNavigate} />;
      case 'lock-paycio':
        return <div className="p-6 text-center">Locking wallet...</div>;

      case 'nfts':
        return <NFTsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'portfolio':
        return <PortfolioScreen onNavigate={handleNavigate} />;
      case 'transactions':
        return <TransactionsScreen onNavigate={handleNavigate} />;
      case 'transaction-history':
        return <TransactionHistoryScreen onNavigate={handleNavigate} />;
      case 'walletconnect':
        return <WalletConnectScreen />;
      case 'loading':
        return <LoadingScreen message="Loading wallet..." />;
      case 'error':
        return (
          <ErrorScreen 
            error={error || 'An error occurred'} 
            onRetry={() => {
              setError(null);
              // Go back to the previous screen if it was accounts, otherwise dashboard
              if (previousScreen === 'accounts') {
                setCurrentScreen('accounts');
              } else {
                setCurrentScreen('dashboard');
              }
            }}
            onGoToAccounts={error?.includes('accounts') || error?.includes('Accounts') ? () => {
              setError(null);
              setCurrentScreen('accounts');
            } : undefined}
          />
        );
      default:
        return <DashboardScreen onNavigate={handleNavigate} />;
    }
  };

  const shouldShowNavigation = () => {
    const screensWithNavigation = [
      'dashboard',
      'send',
      'receive',
      'accounts',
      'settings',
      'tokens',
      'nfts',
      'portfolio',
      'transactions'
    ];
    return screensWithNavigation.includes(currentScreen);
  };

  return (
    <ErrorBoundary>
              <div className="w-96 h-96 bg-white text-gray-900 overflow-hidden">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#180CB2',
              color: '#ffffff',
              border: '1px solid #4F46E5',
            },
          }}
        />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {shouldShowNavigation() && (
          <Navigation
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App; 