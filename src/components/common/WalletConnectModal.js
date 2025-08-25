import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { walletConnectManager } from '../../utils/walletconnect-utils';
export const WalletConnectModal = ({ isOpen, onClose, onConnected }) => {
    const [uri, setUri] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (isOpen && !uri) {
            initializeConnection();
        }
    }, [isOpen]);
    const initializeConnection = async () => {
        try {
            setIsConnecting(true);
            setError(null);
            const result = await walletConnectManager.connect();
            setUri(result.uri);
            if (result.session) {
                onConnected(result.session);
                onClose();
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        }
        finally {
            setIsConnecting(false);
        }
    };
    const copyToClipboard = async () => {
        if (uri) {
            try {
                await navigator.clipboard.writeText(uri);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            catch (err) {
                console.error('Failed to copy URI:', err);
            }
        }
    };
    const openWalletConnect = () => {
        if (uri) {
            window.open(`wc:${uri}`, '_blank');
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 max-w-md w-full mx-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Connect Wallet" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { size: 24 }) })] }), _jsx("div", { className: "space-y-6", children: isConnecting ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Initializing connection..." })] })) : error ? (_jsxs("div", { className: "text-center py-8", children: [_jsxs("div", { className: "text-red-500 mb-4", children: [_jsx("p", { className: "font-medium", children: "Connection Failed" }), _jsx("p", { className: "text-sm", children: error })] }), _jsx("button", { onClick: initializeConnection, className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: "Try Again" })] })) : uri ? (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "text-center", children: _jsx("div", { className: "bg-white p-4 rounded-lg border inline-block", children: _jsx(QRCodeSVG, { value: uri, size: 200, level: "M", includeMargin: true }) }) }), _jsxs("div", { className: "text-center space-y-2", children: [_jsx("p", { className: "text-gray-700 font-medium", children: "Scan QR code with your mobile wallet" }), _jsx("p", { className: "text-sm text-gray-500", children: "Or copy the connection link below" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "text", value: uri, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" }), _jsx("button", { onClick: copyToClipboard, className: "p-2 text-gray-500 hover:text-gray-700 transition-colors", title: "Copy to clipboard", children: copied ? _jsx(Check, { size: 16 }) : _jsx(Copy, { size: 16 }) })] }), _jsxs("button", { onClick: openWalletConnect, className: "w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(ExternalLink, { size: 16 }), _jsx("span", { children: "Open in Wallet" })] })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-500 mb-2", children: "Supported Wallets:" }), _jsxs("div", { className: "flex justify-center space-x-4 text-xs text-gray-400", children: [_jsx("span", { children: "MetaMask" }), _jsx("span", { children: "Trust Wallet" }), _jsx("span", { children: "Rainbow" }), _jsx("span", { children: "Argent" })] })] })] })) : null }), _jsx("div", { className: "mt-6 pt-4 border-t border-gray-200", children: _jsx("p", { className: "text-xs text-gray-500 text-center", children: "By connecting, you agree to our Terms of Service and Privacy Policy" }) })] }) }));
};
