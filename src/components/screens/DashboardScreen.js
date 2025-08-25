import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Send, Download, Settings, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useTransaction } from '../../store/TransactionContext';
const DashboardScreen = ({ onNavigate }) => {
    const { currentNetwork } = useWallet();
    const { portfolioValue } = usePortfolio();
    const { pendingTransactions } = useTransaction();
    const [showBalance, setShowBalance] = React.useState(true);
    const toggleBalanceVisibility = () => {
        setShowBalance(!showBalance);
    };
    const quickActions = [
        {
            id: 'send',
            label: 'Send',
            icon: Send,
            color: 'bg-blue-500',
            onClick: () => onNavigate('send')
        },
        {
            id: 'receive',
            label: 'Receive',
            icon: Download,
            color: 'bg-green-500',
            onClick: () => onNavigate('receive')
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            color: 'bg-gray-500',
            onClick: () => onNavigate('settings')
        }
    ];
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-50", children: [_jsxs("div", { className: "bg-white p-6 rounded-b-3xl shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: toggleBalanceVisibility, className: "p-2 rounded-lg transition-colors hover:bg-gray-100", children: showBalance ? _jsx(EyeOff, { className: "w-5 h-5 text-gray-600" }) : _jsx(Eye, { className: "w-5 h-5 text-gray-600" }) })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-600 mb-2", children: "Total Balance" }), _jsxs("div", { className: "flex items-center justify-center space-x-2 mb-2", children: [_jsx("span", { className: "text-3xl font-bold text-gray-900", children: showBalance ? formatCurrency(portfolioValue?.totalUSD || 0) : '****' }), portfolioValue?.totalChangePercent && (_jsxs("div", { className: `flex items-center space-x-1 ${portfolioValue.totalChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`, children: [_jsx(TrendingUp, { className: `w-4 h-4 ${portfolioValue.totalChangePercent >= 0 ? '' : 'rotate-180'}` }), _jsxs("span", { className: "text-sm font-medium", children: [Math.abs(portfolioValue.totalChangePercent).toFixed(2), "%"] })] }))] }), _jsxs("p", { className: "text-xs text-gray-500", children: [currentNetwork?.name || 'Ethereum', " Network"] })] })] }), _jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Quick Actions" }), _jsx("div", { className: "grid grid-cols-3 gap-4", children: quickActions.map((action) => (_jsxs(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: action.onClick, className: "flex flex-col items-center space-y-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow", children: [_jsx("div", { className: `p-3 rounded-lg ${action.color}`, children: _jsx(action.icon, { className: "w-6 h-6 text-white" }) }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: action.label })] }, action.id))) })] }), _jsxs("div", { className: "flex-1 p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Recent Transactions" }), _jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: () => onNavigate('transaction-history'), className: "text-sm text-blue-600 hover:text-blue-700 font-medium", children: "View All" })] }), _jsx("div", { className: "space-y-3", children: pendingTransactions && pendingTransactions.length > 0 ? (pendingTransactions.slice(0, 3).map((tx) => (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "bg-white p-4 rounded-lg shadow-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: "Transaction" }), _jsx("p", { className: "text-sm text-gray-500", children: tx.hash })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-medium text-gray-900", children: tx.value }), _jsx("p", { className: "text-sm text-gray-500", children: tx.status })] })] }) }, tx.id)))) : (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500", children: "No recent transactions" }) })) })] })] }));
};
export default DashboardScreen;
