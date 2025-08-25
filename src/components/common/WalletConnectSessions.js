import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { walletConnectManager } from '../../utils/walletconnect-utils';
import { toast } from 'react-toastify';
export const WalletConnectSessions = () => {
    const [sessions, setSessions] = useState([]);
    const [copied, setCopied] = useState(null);
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
    };
    const disconnectSession = async (_topic) => {
        try {
            // Disconnect the session
            await window.ethereum?.request({
                method: 'wallet_disconnectSession',
                params: []
            });
            toast.success('Session disconnected');
        }
        catch (error) {
            console.error('Failed to disconnect session:', error);
            toast.error('Failed to disconnect session');
        }
    };
    const copyToClipboard = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        }
        catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };
    const getChainIcon = (chainId) => {
        const icons = {
            1: '🔵', // Ethereum
            56: '🟡', // BSC
            137: '🟣', // Polygon
            43114: '🔴', // Avalanche
            42161: '🔵', // Arbitrum
            10: '🔴' // Optimism
        };
        return icons[chainId] || '⚪';
    };
    if (sessions.length === 0) {
        return (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-gray-400 mb-4", children: _jsx(ExternalLink, { size: 48, className: "mx-auto" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No Active Connections" }), _jsx("p", { className: "text-gray-500", children: "Connect to dApps using WalletConnect to see active sessions here." })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("h3", { className: "text-lg font-medium text-gray-900", children: ["Active Connections (", sessions.length, ")"] }) }), sessions.map((session) => (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-blue-600 font-medium", children: session.clientMeta.name.charAt(0).toUpperCase() }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-gray-900", children: session.clientMeta.name }), _jsx("p", { className: "text-sm text-gray-500", children: session.clientMeta.description })] })] }), _jsx("button", { onClick: () => disconnectSession(session.topic), className: "p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors", title: "Disconnect", children: _jsx(Trash2, { size: 16 }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Status:" }), _jsxs("span", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }), _jsx("span", { className: "text-green-600 font-medium", children: "Connected" })] })] }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Network:" }), _jsxs("span", { className: "flex items-center space-x-1", children: [_jsx("span", { children: getChainIcon(session.chainId) }), _jsx("span", { className: "font-medium", children: walletConnectManager.getChainName(session.chainId) })] })] }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Accounts:" }), _jsx("span", { className: "font-medium", children: session.accounts.length })] })] }), session.accounts.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Connected Addresses:" }), session.accounts.map((account, index) => (_jsxs("div", { className: "flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2", children: [_jsx("span", { className: "text-sm font-mono text-gray-600 truncate", children: account }), _jsx("button", { onClick: () => copyToClipboard(account, `account-${index}`), className: "p-1 text-gray-400 hover:text-gray-600 transition-colors", title: "Copy address", children: copied === `account-${index}` ? (_jsx(Check, { size: 14 })) : (_jsx(Copy, { size: 14 })) })] }, index)))] })), _jsx("div", { className: "pt-3 border-t border-gray-100", children: _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsx("span", { children: "Session ID:" }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsxs("span", { className: "font-mono truncate max-w-24", children: [session.topic.substring(0, 8), "..."] }), _jsx("button", { onClick: () => copyToClipboard(session.topic, 'session-id'), className: "p-1 hover:text-gray-700 transition-colors", title: "Copy session ID", children: copied === 'session-id' ? (_jsx(Check, { size: 12 })) : (_jsx(Copy, { size: 12 })) })] })] }) })] }, session.topic)))] }));
};
