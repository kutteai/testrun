import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { ArrowLeft, Wifi, WifiOff, MoreVertical } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
const Header = ({ title, onBack, canGoBack, currentNetwork }) => {
    const { isWalletUnlocked } = useWallet();
    const { isConnected } = useNetwork();
    const getTitle = () => {
        const titles = {
            dashboard: 'Dashboard',
            send: 'Send',
            receive: 'Receive',
            settings: 'Settings',
            security: 'Security',
            networks: 'Networks',
            nfts: 'NFTs',
            portfolio: 'Portfolio',
            transactions: 'Transactions',
            create: 'Create Wallet',
            import: 'Import Wallet',
            verify: 'Verify Seed'
        };
        return titles[title] || title;
    };
    const getNetworkColor = (network) => {
        const colors = {
            ethereum: 'bg-blue-500',
            bsc: 'bg-yellow-500',
            polygon: 'bg-[#180CB2]',
            avalanche: 'bg-red-500',
            bitcoin: 'bg-orange-500',
            solana: 'bg-[#180CB2]',
            tron: 'bg-red-500'
        };
        return colors[network] || 'bg-gray-500';
    };
    return (_jsxs(motion.div, { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 }, className: "flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [canGoBack && (_jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: onBack, className: "p-2 rounded-lg transition-colors hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) })), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-gray-900", children: getTitle() }), currentNetwork && (_jsxs("div", { className: "flex items-center mt-1 space-x-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${getNetworkColor(currentNetwork.id)}` }), _jsx("span", { className: "text-xs text-gray-500 capitalize", children: currentNetwork.name })] }))] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "flex items-center space-x-1", children: isConnected ? (_jsx(Wifi, { className: "w-4 h-4 text-success-500" })) : (_jsx(WifiOff, { className: "w-4 h-4 text-gray-400" })) }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${isWalletUnlocked ? 'bg-success-500' : 'bg-gray-400'}` }), _jsx("span", { className: "text-xs text-gray-500", children: isWalletUnlocked ? 'Unlocked' : 'Locked' })] }), _jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, className: "p-2 rounded-lg transition-colors hover:bg-gray-100", children: _jsx(MoreVertical, { className: "w-5 h-5 text-gray-600" }) })] })] }));
};
export default Header;
