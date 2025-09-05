import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '../store/WalletContext';
import { useNetwork } from '../store/NetworkContext';
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
import PortfolioScreen from '../components/screens/PortfolioScreen';
import TransactionHistoryScreen from '../components/screens/TransactionHistoryScreen';
import AccountsScreen from '../components/screens/AccountsScreen.js';
import TokensScreen from '../components/screens/TokensScreen.js';
import NFTsScreen from '../components/screens/NFTsScreen.js';
import TransactionsScreen from '../components/screens/TransactionsScreen.js';
import ENSScreen from '../components/screens/ENSScreen.js';
import AddressBookScreen from '../components/screens/AddressBookScreen.js';
import HardwareWalletScreen from '../components/screens/HardwareWalletScreen.js';
import GasSettingsScreen from '../components/screens/GasSettingsScreen.js';
import LoadingScreen from '../components/screens/LoadingScreen';
import ErrorScreen from '../components/screens/ErrorScreen';
// Import common components
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import NotificationBanner from '../components/common/NotificationBanner';
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('welcome');
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    // Context hooks
    const { wallet, isWalletUnlocked, isLoading: walletLoading, error: walletError, initializeWallet, clearError } = useWallet();
    const { currentNetwork } = useNetwork();
    // Initialize app
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Force clear any persistent errors before initialization
                console.log('🧹 App.js: Clearing any persistent errors before initialization...');
                if (clearError) {
                    clearError();
                }
                
                await initializeWallet();
                setIsLoading(false);
            }
            catch (initError) {
                console.error('❌ App.js: Failed to initialize app:', initError);
                toast.error('Failed to initialize app');
                setIsLoading(false);
            }
        };
        initializeApp();
    }, [initializeWallet, clearError]);
    // Handle navigation
    const handleNavigate = (screen) => {
        setCurrentScreen(screen);
    };
    // Handle notification dismissal
    const handleDismissNotification = () => {
        setNotification(null);
    };
    // Show loading screen
    if (isLoading || walletLoading) {
        return _jsx(LoadingScreen, { message: "Initializing wallet..." });
    }
    // Show error screen with detailed debugging
    if (walletError) {
        console.error('🚨 App.js: Wallet error detected:', walletError);
        console.error('🚨 App.js: Error type:', typeof walletError);
        console.error('🚨 App.js: Error value:', JSON.stringify(walletError));
        console.error('🚨 App.js: Current screen when error occurred:', currentScreen);
        
        return (_jsx(ErrorScreen, { 
            error: `${walletError} (Screen: ${currentScreen})`, 
            onRetry: () => {
                console.log('🔄 App.js: User clicked retry, clearing error and going to dashboard...');
                try {
                    clearError();
                    console.log('✅ App.js: Error cleared successfully');
                    handleNavigate('dashboard');
                } catch (clearErr) {
                    console.error('❌ App.js: Failed to clear error:', clearErr);
                    window.location.reload();
                }
            }
        }));
    }
    // Debug: Log current state
    console.log('🔍 App.js: Current app state:', {
        currentScreen,
        isLoading,
        walletLoading,
        hasWallet: !!wallet,
        walletError,
        isWalletUnlocked
    });

    // Render current screen
    const renderScreen = () => {
        console.log('🎬 App.js: Rendering screen:', currentScreen);
        switch (currentScreen) {
            case 'welcome':
                return _jsx(WelcomeScreen, { onNavigate: handleNavigate });
            case 'create':
                return _jsx(CreateWalletScreen, { onNavigate: handleNavigate });
            case 'import':
                return _jsx(ImportWalletScreen, { onNavigate: handleNavigate });
            case 'verify':
                return _jsx(VerifySeedScreen, { onNavigate: handleNavigate });
            case 'dashboard':
                return (_jsx(DashboardScreen, { onNavigate: handleNavigate }));
            case 'send':
                return _jsx(SendScreen, { onNavigate: handleNavigate });
            case 'receive':
                return _jsx(ReceiveScreen, { onNavigate: handleNavigate });
            case 'settings':
                return _jsx(SettingsScreen, { onNavigate: handleNavigate });
            case 'security':
                return _jsx(SecurityScreen, { onNavigate: handleNavigate });
            case 'networks':
                return _jsx(NetworksScreen, { onNavigate: handleNavigate });
                              case 'nfts':
                      return _jsx(NFTsScreen, { onNavigate: handleNavigate });
                  case 'transactions':
                      return _jsx(TransactionsScreen, { onNavigate: handleNavigate });
            case 'portfolio':
                return _jsx(PortfolioScreen, { onNavigate: handleNavigate });
            case 'transaction-history':
                return _jsx(TransactionHistoryScreen, { onNavigate: handleNavigate });
            case 'accounts':
                return _jsx(AccountsScreen, { onNavigate: handleNavigate });
            case 'tokens':
                return _jsx(TokensScreen, { onNavigate: handleNavigate });
            case 'ens':
                return _jsx(ENSScreen, { onNavigate: handleNavigate });
            case 'address-book':
                return _jsx(AddressBookScreen, { onNavigate: handleNavigate });
            case 'hardware-wallet':
                return _jsx(HardwareWalletScreen, { onNavigate: handleNavigate });
            case 'gas-settings':
                return _jsx(GasSettingsScreen, { onNavigate: handleNavigate });
            case 'loading':
                return _jsx(LoadingScreen, {});
            case 'error':
                return _jsx(ErrorScreen, { error: "Something went wrong", onRetry: () => window.location.reload() });
            default:
                return _jsx(WelcomeScreen, { onNavigate: handleNavigate });
        }
    };
    return (_jsxs("div", { className: "h-full bg-gray-50 flex flex-col", children: [_jsx(Header, { title: currentScreen === 'dashboard' ? 'SOW Wallet' : currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1), wallet: wallet, currentNetwork: currentNetwork }), _jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.3 }, className: "h-full", children: renderScreen() }, currentScreen) }) }), isWalletUnlocked && currentScreen !== 'welcome' && currentScreen !== 'create' && currentScreen !== 'import' && currentScreen !== 'verify' && (_jsx(Navigation, { currentScreen: currentScreen, onNavigate: handleNavigate })), _jsx(NotificationBanner, { notification: notification, onClose: handleDismissNotification }), _jsx(Toaster, { position: "top-center", toastOptions: {
                    duration: 4000,
                    style: {
                        background: '#180CB2',
                        color: '#fff',
                    },
                } })] }));
};
export default App;
