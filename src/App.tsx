import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useWallet } from './store/WalletContext';
import { useNetwork } from './store/NetworkContext';
import { useTransaction } from './store/TransactionContext';
import { usePortfolio } from './store/PortfolioContext';
import toast from 'react-hot-toast';

// Import screens
import WelcomeScreen from './components/screens/WelcomeScreen';
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
import GasSettingsScreen from './components/screens/GasSettingsScreen';
import NFTScreen from './components/screens/NFTScreen';
import PortfolioScreen from './components/screens/PortfolioScreen';
import TransactionsScreen from './components/screens/TransactionsScreen';
import TransactionHistoryScreen from './components/screens/TransactionHistoryScreen';

import type { ScreenId } from './types/index';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [isAppInitialized, setIsAppInitialized] = useState(false);

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

  // Initialize app and determine initial screen - DISABLED
  useEffect(() => {
    console.log('App: Skipping initialization...');
    setIsAppInitialized(true);
    setCurrentScreen('welcome');
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
    if (isAppInitialized && !isInitializing) {
      if (hasWallet && isWalletUnlocked) {
        // Only auto-navigate to dashboard if we're on welcome screen
        if (currentScreen === 'welcome') {
          setCurrentScreen('dashboard');
        }
      } else if (hasWallet && !isWalletUnlocked) {
        // Wallet locked, go back to welcome for unlock
        if (currentScreen !== 'welcome') {
          setCurrentScreen('welcome');
          toast('Please unlock your wallet to continue');
        }
      }
    }
  }, [hasWallet, isWalletUnlocked, isAppInitialized, isInitializing, currentScreen]);

  // Handle navigation
  const handleNavigate = (screen: ScreenId) => {
    // Prevent navigation to protected screens if wallet is locked
    const protectedScreens: ScreenId[] = [
      'dashboard', 'send', 'receive', 'settings', 
      'security', 'networks', 'nfts', 'portfolio', 'transactions'
    ];
    
    if (protectedScreens.includes(screen) && !isWalletUnlocked) {
      toast.error('Please unlock your wallet first');
      setCurrentScreen('welcome');
      return;
    }
    
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
      case 'create':
        return <CreateWalletScreen onNavigate={handleNavigate} />;
      case 'import':
        return <ImportWalletScreen onNavigate={handleNavigate} />;
      case 'verify':
        return <VerifySeedScreen onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardScreen onNavigate={handleNavigate} />;
      case 'send':
        return <SendScreen onNavigate={handleNavigate} />;
      case 'receive':
        return <ReceiveScreen onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate} />;
      case 'security':
        return <SecurityScreen onNavigate={handleNavigate} />;
      case 'networks':
        return <NetworksScreen onNavigate={handleNavigate} />;
      case 'accounts':
        return <AccountsScreen onNavigate={handleNavigate} />;
      case 'tokens':
        return <TokensScreen onNavigate={handleNavigate} />;
      case 'ens':
        return <ENSScreen onNavigate={handleNavigate} />;
      case 'hardware':
        return <HardwareWalletScreen onNavigate={handleNavigate} />;
      case 'gas':
        return <GasSettingsScreen onNavigate={handleNavigate} />;
      case 'nfts':
        return <NFTScreen onNavigate={handleNavigate} />;
      case 'portfolio':
        return <PortfolioScreen onNavigate={handleNavigate} />;
      case 'transactions':
        return <TransactionsScreen onNavigate={handleNavigate} />;
      case 'transaction-history':
        return <TransactionHistoryScreen onNavigate={handleNavigate} />;
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

  return (
    <div className="h-full bg-gray-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

export default App;