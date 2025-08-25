import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '../store/WalletContext';
import { useNetwork } from '../store/NetworkContext';
import type { ScreenId } from '../types/index';

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

// Import common components
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const { wallet, isWalletUnlocked } = useWallet();
  const { currentNetwork } = useNetwork();

  // Simple navigation handler
  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  // Simple screen renderer
  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen 
            onNavigate={handleNavigate}
            hasWallet={!!wallet}
            isWalletUnlocked={isWalletUnlocked || false}
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
            hasWallet={!!wallet}
            isWalletUnlocked={isWalletUnlocked || false}
          />
        );
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <Header 
        title={currentScreen === 'dashboard' ? 'PayCio Wallet' : currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1)}
        wallet={wallet}
        currentNetwork={currentNetwork}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
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
      </div>

      {/* Navigation */}
      {currentScreen !== 'welcome' && currentScreen !== 'create' && currentScreen !== 'import' && currentScreen !== 'verify' && (
        <Navigation 
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
        />
      )}

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