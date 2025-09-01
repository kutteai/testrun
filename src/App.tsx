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
import HardwareWalletScreen from './components/screens/HardwareWalletScreen.js';
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
    console.log('App: Wallet state - hasWallet:', hasWallet, 'isWalletUnlocked:', isWalletUnlocked);
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
      toast.success('🎯 Navigating to accounts screen', { duration: 3000 });
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
    console.log('🎬 App.tsx: renderScreen called with currentScreen:', currentScreen);
    console.log('🎬 App.tsx: Stack trace:', new Error().stack);
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
      case 'address-book':
          return <AddressBookScreen onNavigate={handleNavigate} />;
      case 'hardware':
        return <HardwareWalletScreen onNavigate={handleNavigate} />;
      case 'gas':
        return <GasSettingsScreen onNavigate={handleNavigate} />;
      case 'bitcoin':
        return <BitcoinScreen onNavigate={handleNavigate} />;
      case 'solana':
        return <SolanaScreen onNavigate={handleNavigate} />;
      case 'tron':
        return <TronScreen onNavigate={handleNavigate} />;
      case 'litecoin':
        return <LitecoinScreen onNavigate={handleNavigate} />;
      case 'ton':
        return <TonScreen onNavigate={handleNavigate} />;
      case 'xrp':
        return <XrpScreen onNavigate={handleNavigate} />;
      case 'walletconnect':
        return <WalletConnectScreen />;
      case 'nfts':
        return <NFTsScreen onNavigate={handleNavigate} />;
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