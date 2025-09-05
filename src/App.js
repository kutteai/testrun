import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
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
import NFTsScreen from './components/screens/NFTsScreen.js';
import PortfolioScreen from './components/screens/PortfolioScreen';
import TransactionsScreen from './components/screens/TransactionsScreen';
import TransactionHistoryScreen from './components/screens/TransactionHistoryScreen';
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('welcome');
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
            }
            catch {
                toast.error('Failed to initialize app');
                setIsLoading(false);
            }
        };
        initializeApp();
    }, [initializeWallet]);
    const handleNavigate = (screen) => {
        setCurrentScreen(screen);
    };
    if (isLoading) {
        return (_jsx("div", { className: "h-full bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading..." })] }) }));
    }
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
                return _jsx(NFTsScreen, { onNavigate: handleNavigate });
            case 'portfolio':
                return _jsx(PortfolioScreen, { onNavigate: handleNavigate });
            case 'transactions':
                return _jsx(TransactionsScreen, { onNavigate: handleNavigate });
            case 'transaction-history':
                return _jsx(TransactionHistoryScreen, { onNavigate: handleNavigate });
            default:
                return _jsx(WelcomeScreen, { onNavigate: handleNavigate });
        }
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.3 }, className: "h-full", children: renderScreen() }, currentScreen) }), _jsx(Toaster, { position: "top-center", toastOptions: {
                    duration: 4000,
                    style: {
                        background: '#180CB2',
                        color: '#fff',
                    },
                } })] }));
};
export default App;
