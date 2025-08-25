import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '../store/WalletContext';
import { useNetwork } from '../store/NetworkContext';
import type { ScreenId, NotificationType } from '../types/index';
import toast from 'react-hot-toast';

// Import screens
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
import NFTScreen from '../components/screens/NFTScreen';
import PortfolioScreen from '../components/screens/PortfolioScreen';
import TransactionsScreen from '../components/screens/TransactionsScreen';
import TransactionHistoryScreen from '../components/screens/TransactionHistoryScreen';
import LoadingScreen from '../components/screens/LoadingScreen';
import ErrorScreen from '../components/screens/ErrorScreen';

// Import common components
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import NotificationBanner from '../components/common/NotificationBanner';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [isLoading, setIsLoading] = useState(false); // Start with false to skip loading
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [initTimeout, setInitTimeout] = useState(true); // Start with true to skip initialization

  // Context hooks
  const {
    wallet,
    isWalletUnlocked,
    isLoading: walletLoading,
    isInitializing,
    error: walletError,
    initializeWallet
  } = useWallet();

  // Debug function to force stop initialization
  const forceStopInitialization = () => {
    console.log('Debug: Force stopping initialization');
    setIsLoading(false);
    setInitTimeout(true);
    // Force the wallet context to stop initializing by dispatching an action
    // This is a workaround since we can't directly access the dispatch
  };

  const { currentNetwork } = useNetwork();

  // Initialize app
  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('App initialization timeout')), 10000);
        });
        
        await Promise.race([initializeWallet(), timeoutPromise]);
        
        if (isMounted) {
          console.log('App initialization completed successfully');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        if (isMounted) {
          toast.error('Failed to initialize app');
          setIsLoading(false);
          setInitTimeout(true);
        }
      }
    };

    // Add a fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('Fallback timeout reached, showing welcome screen');
        setIsLoading(false);
        setInitTimeout(true);
      }
    }, 15000);

    initializeApp();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, [initializeWallet]); // Removed isLoading from dependencies

  // Aggressive timeout fallback - force welcome screen after 3 seconds
  useEffect(() => {
    const aggressiveTimeout = setTimeout(() => {
      console.log('Aggressive timeout - forcing welcome screen');
      setIsLoading(false);
      setInitTimeout(true);
    }, 3000); // 3 seconds max - very aggressive

    return () => clearTimeout(aggressiveTimeout);
  }, []); // Only run once on mount

  // Handle navigation
  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  // Handle notification dismissal
  const handleDismissNotification = () => {
    setNotification(null);
  };

  // Show loading screen - but only for a very short time
  if (isLoading && !initTimeout) {
    return (
      <LoadingScreen 
        message="Initializing wallet..." 
        onDebugClick={forceStopInitialization}
      />
    );
  }

  // Show error screen
  if (walletError) {
    return (
      <ErrorScreen 
        error={walletError || 'An unknown error occurred'} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Ensure wallet is properly initialized before showing protected screens
  const isProtectedScreen = ['dashboard', 'send', 'receive', 'settings', 'security', 'networks', 'nfts', 'portfolio', 'transactions', 'transaction-history'].includes(currentScreen);
  
  if (isProtectedScreen && (!wallet || !isWalletUnlocked)) {
    // Redirect to welcome if wallet is not properly initialized
    if (currentScreen !== 'welcome') {
      console.log('Redirecting to welcome - Wallet state:', { 
        hasWallet: !!wallet, 
        isUnlocked: isWalletUnlocked, 
        walletAddress: wallet?.address,
        currentScreen 
      });
      setCurrentScreen('welcome');
      return <LoadingScreen message="Redirecting..." />;
    }
  }

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} hasWallet={!!wallet} isWalletUnlocked={isWalletUnlocked} />;
      case 'create':
        return <CreateWalletScreen onNavigate={handleNavigate} />;
      case 'import':
        return <ImportWalletScreen onNavigate={handleNavigate} />;
      case 'verify':
        return <VerifySeedScreen onNavigate={handleNavigate} />;
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigate={handleNavigate}
          />
        );
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
      case 'nfts':
        return <NFTScreen onNavigate={handleNavigate} />;
      case 'portfolio':
        return <PortfolioScreen onNavigate={handleNavigate} />;
      case 'transactions':
        return <TransactionsScreen onNavigate={handleNavigate} />;
      case 'transaction-history':
        return <TransactionHistoryScreen onNavigate={handleNavigate} />;
      case 'loading':
        return <LoadingScreen />;
      case 'error':
        return <ErrorScreen error="Something went wrong" onRetry={() => window.location.reload()} />;
      default:
        return <WelcomeScreen onNavigate={handleNavigate} hasWallet={!!wallet} isWalletUnlocked={isWalletUnlocked} />;
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <Header 
        title={currentScreen === 'dashboard' ? 'PayCio Wallet' : currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1)}
        wallet={wallet}
        currentNetwork={currentNetwork}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
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
      </div>

      {/* Navigation */}
      {isWalletUnlocked && currentScreen !== 'welcome' && currentScreen !== 'create' && currentScreen !== 'import' && currentScreen !== 'verify' && (
        <Navigation 
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
        />
      )}

      {/* Notification banner */}
      <NotificationBanner 
        notification={notification}
        onClose={handleDismissNotification}
      />

      {/* Toast notifications */}
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