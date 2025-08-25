import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Wallet, Plus, ExternalLink, Settings } from 'lucide-react';
import { WalletConnectModal } from '../common/WalletConnectModal';
import { WalletConnectSessions } from '../common/WalletConnectSessions';
import { walletConnectManager } from '../../utils/walletconnect-utils';
export const WalletConnectScreen = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        loadSessions();
    }, []);
    const loadSessions = () => {
        const session = walletConnectManager.getSession();
        if (session) {
            setSessions([session]);
        }
        else {
            setSessions([]);
        }
        setIsLoading(false);
    };
    const handleConnected = (session) => {
        setSessions([session]);
        setIsModalOpen(false);
    };
    const handleDisconnect = async () => {
        try {
            await walletConnectManager.disconnect();
            loadSessions();
        }
        catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(Wallet, { className: "w-6 h-6 text-blue-600" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "WalletConnect" }), _jsx("p", { className: "text-gray-500", children: "Connect to dApps and manage sessions" })] })] }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Plus, { size: 16 }), _jsx("span", { children: "New Connection" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Active Sessions" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: sessions.length })] }), _jsx("div", { className: "w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx(Wallet, { className: "w-4 h-4 text-green-600" }) })] }) }), _jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Supported Chains" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: walletConnectManager.getSupportedChains().length })] }), _jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(ExternalLink, { className: "w-4 h-4 text-blue-600" }) })] }) }), _jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Connection Status" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: walletConnectManager.isConnected() ? 'Connected' : 'Disconnected' })] }), _jsx("div", { className: "w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center", children: _jsx(Settings, { className: "w-4 h-4 text-purple-600" }) })] }) })] }), _jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: _jsx(WalletConnectSessions, {}) }), sessions.length > 0 && (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Quick Actions" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("button", { onClick: handleDisconnect, className: "flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors", children: [_jsx(Wallet, { className: "w-4 h-4" }), _jsx("span", { children: "Disconnect All" })] }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "flex items-center space-x-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "Add Connection" })] })] })] })), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "text-sm font-medium text-blue-900 mb-2", children: "About WalletConnect" }), _jsx("p", { className: "text-sm text-blue-800", children: "WalletConnect is an open protocol that enables mobile wallets to connect to dApps. It provides a secure way to interact with blockchain applications without exposing your private keys." })] }), _jsx(WalletConnectModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), onConnected: handleConnected })] }));
};
