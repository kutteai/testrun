import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from './store/WalletContext';
import { useNetwork } from './store/NetworkContext';
import { useTransaction } from './store/TransactionContext';
import { usePortfolio } from './store/PortfolioContext';

// Import screens
import WelcomeScreen from './components/screens/WelcomeScreen';
import AddressBookScreen from './components/screens/AddressBookScreen';
import CreateWalletScreen from './components/screens/CreateWalletScreen';
import ImportWalletScreen from './components/screens/ImportWalletScreen';
import VerifySeedScreen from './components/screens/VerifySeedScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import SendScreen from './components/screens/SendScreen';
import ReceiveScreen from './components/screens/ReceiveScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import SecurityScreen from './components/screens/SecurityScreen';
import NetworksScreen from './components/screens/NetworksScreen';
import AccountsScreen from './components/screens/AccountsScreen';
import TokensScreen from './components/screens/TokensScreen';
import ENSScreen from './components/screens/ENSScreen';
import HardwareWalletScreen from './components/screens/HardwareWalletScreen';
import GasSettingsScreen from './components/screens/GasSettingsScreen.js';
import NFTsScreen from './components/screens/NFTsScreen';
import BitcoinScreen from './components/screens/BitcoinScreen';
import SolanaScreen from './components/screens/SolanaScreen';
import TronScreen from './components/screens/TronScreen';
import LitecoinScreen from './components/screens/LitecoinScreen';
import TonScreen from './components/screens/TonScreen';
import XrpScreen from './components/screens/XrpScreen';
import { WalletConnectScreen } from './components/screens/WalletConnectScreen';
import PortfolioScreen from './components/screens/PortfolioScreen';
import TransactionsScreen from './components/screens/TransactionsScreen';
import TransactionHistoryScreen from './components/screens/TransactionHistoryScreen';
import SplashScreen from './components/screens/SplashScreen';
import TermsScreen from './components/screens/TermsScreen';
import CreateUCPIScreen from './components/screens/CreateUCPIScreen';
import CreatePasswordScreen from './components/screens/CreatePasswordScreen';
import RecoveryPhraseScreen from './components/screens/RecoveryPhraseScreen';
import VerifyPhraseScreen from './components/screens/VerifyPhraseScreen';
import CreateWalletSetupScreen from './components/screens/CreateWalletSetupScreen';
import ImportSeedPhraseScreen from './components/screens/ImportSeedPhraseScreen';
import ImportPrivateKeyScreen from './components/screens/ImportPrivateKeyScreen';
import AddAccountScreen from './components/screens/AddAccountScreen';
import WalletDetailsScreen from './components/screens/WalletDetailsScreen';
import ManageCryptoScreen from './components/screens/ManageCryptoScreen';
import ManageWalletScreen from './components/screens/ManageWalletScreen';
import ReviewSendScreen from './components/screens/ReviewSendScreen';
import SwapScreen from './components/screens/SwapScreen';
import BuySellScreen from './components/screens/BuySellScreen';
import OptionsMenuScreen from './components/screens/OptionsMenuScreen';
import PreferencesScreen from './components/screens/PreferencesScreen';
import WalletSecurityScreen from './components/screens/WalletSecurityScreen';
import MoreScreen from './components/screens/MoreScreen';
import AccountDetailsScreen from './components/screens/AccountDetailsScreen';
import ManageNetworksScreen from './components/screens/ManageNetworksScreen';
import AddCustomNetworkScreen from './components/screens/AddCustomNetworkScreen';
import NotificationsScreen from './components/screens/NotificationsScreen';
import SupportScreen from './components/screens/SupportScreen';
import ExpandViewScreen from './components/screens/ExpandViewScreen';
import PasswordModal from './components/modals/PasswordModal';

import type { ScreenId } from './types/index';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [navigationHistory, setNavigationHistory] = useState<ScreenId[]>(['welcome']);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalProps, setPasswordModalProps] = useState<any>(null);

  const { 
    wallet, 
    isWalletUnlocked, 
    hasWallet, 
    isInitializing,
    initializeWallet 
  } = useWallet();
  
  const { currentNetwork } = useNetwork();
  const { pendingTransactions } = useTransaction();
  const { portfolioValue } = usePortfolio();

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Initialize app and determine initial screen - DISABLED
  useEffect(() => {
    console.log('App: Skipping initialization...');
    console.log('App: Wallet state - hasWallet:', hasWallet, 'isWalletUnlocked:', isWalletUnlocked);
    setIsAppInitialized(true);
    setCurrentScreen('welcome');
  }, []);

  // Handle password modal events
  useEffect(() => {
    const handlePasswordModal = (event: CustomEvent) => {
      const { title, message, networkName, onConfirm, onCancel } = event.detail;
      
      setPasswordModalProps({
        title,
        message,
        networkName,
        onConfirm: async (password: string) => {
          try {
            await onConfirm(password);
            setShowPasswordModal(false);
          } catch (error) {
            // Error will be handled by the modal
            throw error;
          }
        },
        onCancel: () => {
          onCancel();
          setShowPasswordModal(false);
        }
      });
      
      setShowPasswordModal(true);
    };

    window.addEventListener('showPasswordModal', handlePasswordModal as EventListener);
    
    return () => {
      window.removeEventListener('showPasswordModal', handlePasswordModal as EventListener);
    };
  }, []);

  // Determine initial screen based on wallet state
  const determineInitialScreen = () => {
    if (!hasWallet) {
      // No wallet exists, show welcome screen
      setCurrentScreen('welcome');
    } else if (hasWallet && !isWalletUnlocked) {
      // Wallet exists but is locked, show welcome screen for unlock
      setCurrentScreen('welcome');
    } else if (hasWallet && isWalletUnlocked) {
      // Wallet exists and is unlocked, show dashboard
      setCurrentScreen('dashboard');
    } else {
      // Default fallback
      setCurrentScreen('welcome');
    }
  };

  // Update screen when wallet state changes
  useEffect(() => {
    console.log('🔄 App.tsx: Wallet state effect triggered');
    console.log('🔄 App.tsx: isAppInitialized:', isAppInitialized, 'isInitializing:', isInitializing);
    console.log('🔄 App.tsx: hasWallet:', hasWallet, 'isWalletUnlocked:', isWalletUnlocked);
    console.log('🔄 App.tsx: currentScreen:', currentScreen);
    
    if (isAppInitialized && !isInitializing) {
      if (hasWallet && isWalletUnlocked) {
        // Only auto-navigate to dashboard if we're on welcome screen
        if (currentScreen === 'welcome') {
          console.log('🔄 App.tsx: Auto-navigating to dashboard');
          setCurrentScreen('dashboard');
        }
      } else if (hasWallet && !isWalletUnlocked) {
        // Wallet locked, go back to welcome for unlock
        if (currentScreen !== 'welcome' && currentScreen !== 'accounts') {
          console.log('🔄 App.tsx: Wallet locked, going back to welcome (but allowing accounts)');
          setCurrentScreen('welcome');
          toast('Please unlock your wallet to continue');
        }
      }
    }
  }, [hasWallet, isWalletUnlocked, isAppInitialized, isInitializing, currentScreen]);

  // Handle network changes to preserve navigation
  useEffect(() => {
    const handleNetworkChange = (event: CustomEvent) => {
      console.log('🌐 Network changed, preserving navigation:', event.detail);
      
      // Import navigation utilities and handle network switch
      import('./utils/network-navigation-fix').then(({ networkNavigationUtils }) => {
        const result = networkNavigationUtils.handleNetworkSwitch(
          currentScreen,
          navigationHistory,
          event.detail.oldNetwork || 'ethereum',
          event.detail.networkId,
          {
            preserveHistory: true,
            allowNetworkSpecificScreens: false,
            fallbackScreen: 'dashboard'
          }
        );
        
        // Update navigation state if needed
        if (result.screen !== currentScreen) {
          setCurrentScreen(result.screen as ScreenId);
          setNavigationHistory(result.history);
        }
      }).catch(error => {
        console.error('Network navigation handling failed:', error);
      });
    };

    // Listen for network change events
    window.addEventListener('networkChanged', handleNetworkChange as EventListener);
    
    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener);
    };
  }, [currentScreen, navigationHistory]);

  // Go back to previous screen with network-aware navigation
  const handleGoBack = () => {
    // Import navigation utilities
    import('./utils/network-navigation-fix').then(({ networkNavigationUtils }) => {
      const canGoBack = networkNavigationUtils.canGoBack(currentScreen, navigationHistory);
      
      if (canGoBack) {
        const backTarget = networkNavigationUtils.getBackTarget(currentScreen, navigationHistory);
        const newHistory = [...navigationHistory];
        newHistory.pop(); // Remove current screen
        setNavigationHistory(newHistory);
        setCurrentScreen(backTarget as ScreenId);
      } else {
        // Fallback to dashboard if can't go back
        setCurrentScreen('dashboard');
        setNavigationHistory(['dashboard']);
      }
    }).catch(error => {
      console.error('Navigation utils import failed:', error);
      // Fallback to original logic
      if (navigationHistory.length > 1) {
        const newHistory = [...navigationHistory];
        newHistory.pop();
        const previousScreen = newHistory[newHistory.length - 1];
        setNavigationHistory(newHistory);
        setCurrentScreen(previousScreen);
      } else {
        setCurrentScreen('dashboard');
      }
    });
  };

  // Handle navigation
  const handleNavigate = (screen: ScreenId) => {
    console.log('🔀 App.tsx: handleNavigate called with screen:', screen);
    console.log('🔀 App.tsx: Current screen before navigation:', currentScreen);
    console.log('🔀 App.tsx: isWalletUnlocked:', isWalletUnlocked);
    console.log('🔀 App.tsx: Stack trace:', new Error().stack);
    
    // Prevent navigation to protected screens if wallet is locked
    const protectedScreens: ScreenId[] = [
     'dashboard', 'send', 'receive', 'settings', 
  'security', 'networks', 'nfts', 'portfolio', 'transactions',
  'address-book', 'ens', 'tokens' 
    ];
    
    console.log('🔍 App.tsx: Navigation check - screen:', screen, 'isWalletUnlocked:', isWalletUnlocked, 'isProtected:', protectedScreens.includes(screen));
    
    if (protectedScreens.includes(screen) && !isWalletUnlocked) {
      console.log('🚫 App.tsx: Blocked navigation to protected screen:', screen);
      toast.error('Please unlock your wallet first');
      setCurrentScreen('welcome');
      return;
    }
    
    console.log('✅ App.tsx: Allowing navigation to:', screen);
    
    // Special handling for accounts screen
    if (screen === 'accounts') {
      console.log('🎯 App.tsx: Navigating to accounts screen');
    }
    
    // Update navigation history
    setNavigationHistory(prev => [...prev, screen]);
    setCurrentScreen(screen);
  };

  // Show loading screen during initialization - DISABLED
  if (false) { // Temporarily disable loading
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen 
            onNavigate={handleNavigate}
            hasWallet={hasWallet}
            isWalletUnlocked={isWalletUnlocked}
          />
        );
      case 'terms':
        return <TermsScreen onNavigate={handleNavigate} />;
      case 'create':
        return <CreateWalletScreen onNavigate={handleNavigate} />;
      case 'create-wallet-setup':
        return <CreateWalletSetupScreen onNavigate={handleNavigate} />;
      case 'create-ucpi':
        return <CreateUCPIScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'create-password':
        return <CreatePasswordScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'recovery-phrase':
        return <RecoveryPhraseScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'verify-phrase':
        return <VerifyPhraseScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'import':
        return <ImportWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'import-seed-phrase':
        return <ImportSeedPhraseScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'import-private-key':
        return <ImportPrivateKeyScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'hardware-wallet':
        return <HardwareWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'add-account':
        return <AddAccountScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'wallet-details':
        return <WalletDetailsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'manage-crypto':
        return <ManageCryptoScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'manage-wallet':
        return <ManageWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
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
      case 'preferences':
        return <PreferencesScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'wallet-security':
        return <WalletSecurityScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'more':
        return <MoreScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'account-details':
        return <AccountDetailsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'manage-networks':
        return <ManageNetworksScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'add-custom-network':
        return <AddCustomNetworkScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'verify':
        return <VerifyPhraseScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'dashboard':
        return <DashboardScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'receive':
        return <ReceiveScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'security':
        return <SecurityScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'networks':
        return <NetworksScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'accounts':
        return <AccountsScreen onNavigate={handleNavigate} />;
      case 'tokens':
        return <TokensScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'ens':
        return <ENSScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'address-book':
          return <AddressBookScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'hardware':
        return <HardwareWalletScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
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
      case 'walletconnect':
        return <WalletConnectScreen />;
      case 'nfts':
        return <NFTsScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'portfolio':
        return <PortfolioScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'transactions':
        return <TransactionsScreen onNavigate={handleNavigate} />;
      case 'transaction-history':
        return <TransactionHistoryScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={handleNavigate} />;
      case 'support':
        return <SupportScreen onNavigate={handleNavigate} />;
      case 'expand-view':
        return <ExpandViewScreen onNavigate={handleNavigate} onGoBack={handleGoBack} />;
      default:
        return (
          <WelcomeScreen 
            onNavigate={handleNavigate}
            hasWallet={hasWallet}
            isWalletUnlocked={isWalletUnlocked}
          />
        );
    }
  };

  // Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="h-full bg-white screen-bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full screen-bg-white"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#180CB2',
            color: '#fff',
          },
        }}
      />
      
      {/* Password Modal */}
      {passwordModalProps && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onConfirm={passwordModalProps.onConfirm}
          title={passwordModalProps.title}
          message={passwordModalProps.message}
          networkName={passwordModalProps.networkName}
        />
      )}
    </div>
  );
};

export default App;