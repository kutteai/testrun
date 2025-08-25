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
import NFTScreen from './components/screens/NFTScreen';
import PortfolioScreen from './components/screens/PortfolioScreen';
import TransactionsScreen from './components/screens/TransactionsScreen';
import TransactionHistoryScreen from './components/screens/TransactionHistoryScreen';

import type { ScreenId } from './types/index';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [isLoading, setIsLoading] = useState(true);

  const { wallet, initializeWallet } = useWallet();
  const { networkState } = useNetwork();
  const { portfolioValue } = usePortfolio();
  const { pendingTransactions } = useTransaction();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeWallet();
        setIsLoading(false);
      } catch {
        toast.error('Failed to initialize app');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [initializeWallet]);

  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} />;
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
      default:
        return <WelcomeScreen onNavigate={handleNavigate} />;
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