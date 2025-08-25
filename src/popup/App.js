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
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('welcome');
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    // Context hooks
    const { wallet, isWalletUnlocked, isLoading: walletLoading, error: walletError, initializeWallet } = useWallet();
    const { currentNetwork } = useNetwork();
    // Initialize app
    useEffect(() => {
        const initializeApp = async () => {
            try {
                await initializeWallet();
                setIsLoading(false);
            }
            catch {
                toast.error('Failed to initialize app');
                setIsLoading(false);
            }
        };
        initializeApp();
    }, [initializeWallet]);
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
    // Show error screen
    if (walletError) {
        return (_jsx(ErrorScreen, { error: walletError || 'An unknown error occurred', onRetry: () => window.location.reload() }));
    }
    // Render current screen
    const renderScreen = () => {
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
                return _jsx(NFTScreen, { onNavigate: handleNavigate });
            case 'portfolio':
                return _jsx(PortfolioScreen, { onNavigate: handleNavigate });
            case 'transactions':
                return _jsx(TransactionsScreen, { onNavigate: handleNavigate });
            case 'transaction-history':
                return _jsx(TransactionHistoryScreen, { onNavigate: handleNavigate });
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
                        background: '#363636',
                        color: '#fff',
                    },
                } })] }));
};
export default App;
