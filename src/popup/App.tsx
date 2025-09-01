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

  useEffect(() => {
    console.log('🔄 Popup App: useEffect triggered');
    console.log('🔄 Popup App: isInitializing:', isInitializing);
    console.log('🔄 Popup App: error:', error);
    console.log('🔄 Popup App: currentScreen:', currentScreen);
    console.log('🔄 Popup App: hasWallet:', hasWallet);
    console.log('🔄 Popup App: isWalletUnlocked:', isWalletUnlocked);
    
    if (isInitializing) {
      setCurrentScreen('welcome');
      return;
    }

    // Temporarily disabled redirect for debugging
    if (error && currentScreen !== 'accounts' && currentScreen !== 'tokens' && currentScreen !== 'nfts') {
      console.log('🚨 Redirect DISABLED - would normally redirect to error screen due to error:', error);
      // setCurrentScreen('error');
      // return;
    }
    
    // Force reset if stuck on error screen
    if (currentScreen === 'error') {
      console.log('🔄 Force resetting from error screen to dashboard');
      toast.success('🔄 Reset from error screen to dashboard', { duration: 3000 });
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
    console.log('handleNavigate called with screen:', screen);
    console.log('Previous screen was:', currentScreen);
    setPreviousScreen(currentScreen);
    
    // Prevent navigation to error screen
    if (screen === 'error') {
      console.log('🚫 Navigation to error screen blocked, staying on current screen');
      toast.error('Navigation to error screen blocked', { duration: 3000 });
      return;
    }
    
    setCurrentScreen(screen);
    console.log('currentScreen should now be:', screen);
  };

  const renderScreen = () => {
    console.log('renderScreen called with currentScreen:', currentScreen);
    console.log('currentScreen type:', typeof currentScreen);
    console.log('currentScreen value:', JSON.stringify(currentScreen));
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNavigate={handleNavigate} hasWallet={hasWallet} isWalletUnlocked={isWalletUnlocked} />;
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

      case 'nfts':
        return <NFTsScreen onNavigate={handleNavigate} />;
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
      'settings'
    ];
    return screensWithNavigation.includes(currentScreen);
  };

  return (
    // Temporarily disabled ErrorBoundary for debugging
    // <ErrorBoundary>
      <div className="w-96 h-96 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
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
    // </ErrorBoundary>
  );
};

export default App; 