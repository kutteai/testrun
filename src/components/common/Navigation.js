import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { Home, Send, Download, Settings } from 'lucide-react';
import { useTransaction } from '../../store/TransactionContext';
const Navigation = ({ currentScreen, onNavigate }) => {
    const { pendingTransactions } = useTransaction();
    const navigationItems = [
        {
            id: 'dashboard',
            label: 'Home',
            icon: Home,
            badge: null
        },
        {
            id: 'send',
            label: 'Send',
            icon: Send,
            badge: null
        },
        {
            id: 'receive',
            label: 'Receive',
            icon: Download,
            badge: null
        },
        {
            id: 'nfts',
            label: 'NFTs',
            icon: Home,
            badge: null
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            badge: pendingTransactions && pendingTransactions.length > 0 ? pendingTransactions.length : null
        }
    ];
    return (_jsx(motion.nav, { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, className: "px-4 py-2 bg-white border-t border-gray-200", children: _jsx("div", { className: "flex justify-around items-center", children: navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (_jsxs(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: () => onNavigate(item.id), className: `flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`, children: [_jsxs("div", { className: "relative", children: [_jsx(Icon, { className: "w-6 h-6" }), item.badge && (_jsx(motion.span, { initial: { scale: 0 }, animate: { scale: 1 }, className: "flex absolute -top-2 -right-2 justify-center items-center w-5 h-5 text-xs text-white bg-red-500 rounded-full", children: item.badge }))] }), _jsx("span", { className: "text-xs font-medium", children: item.label })] }, item.id));
            }) }) }));
};
export default Navigation;
