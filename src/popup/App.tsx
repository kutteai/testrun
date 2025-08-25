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
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Context hooks
  const {
    wallet,
    isWalletUnlocked,
    isLoading: walletLoading,
    error: walletError,
    initializeWallet
  } = useWallet();

  // Derive hasWallet from wallet object
  const hasWallet = !!wallet;

  const { currentNetwork } = useNetwork();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeWallet();
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization error:', error);
        toast.error(`Failed to initialize app: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [initializeWallet]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: `Unexpected error: ${event.error?.message || event.message}`,
        duration: 5000
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: `Promise error: ${event.reason?.message || 'Unknown promise error'}`,
        duration: 5000
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Handle navigation
  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  // Handle notification dismissal
  const handleDismissNotification = () => {
    setNotification(null);
  };

  // Show loading screen
  if (isLoading || walletLoading) {
    return <LoadingScreen message="Initializing wallet..." />;
  }

  // Show error screen
  if (walletError) {
    console.error('Wallet Error:', walletError);
    return (
      <ErrorScreen 
        error={`Wallet Error: ${walletError}`} 
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