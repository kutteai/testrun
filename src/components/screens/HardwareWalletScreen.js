import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Usb, CheckCircle, XCircle, Loader } from 'lucide-react';
import { hardwareWalletManager } from '../../utils/hardware-wallet';
import { useWallet } from '../../store/WalletContext';
const HardwareWalletScreen = ({ onNavigate }) => {
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const { addHardwareWallet } = useWallet();
    const hardwareWallets = [
        {
            id: 'ledger',
            name: 'Ledger',
            description: 'Secure hardware wallet with USB connection',
            icon: Usb,
            features: ['USB Connection', 'Multi-chain Support', 'High Security'],
            supported: true
        },
        {
            id: 'trezor',
            name: 'Trezor',
            description: 'Open-source hardware wallet',
            icon: Shield,
            features: ['USB Connection', 'Open Source', 'Easy to Use'],
            supported: true
        }
    ];
    const connectHardwareWallet = async (type) => {
        setIsConnecting(true);
        setConnectionStatus('connecting');
        setError(null);
        try {
            await hardwareWalletManager.connectHardwareWallet(type);
            setConnectionStatus('connected');
            setSelectedWallet(type);
            // Get available accounts
            const addresses = await hardwareWalletManager.getHardwareWalletAddresses('m/44\'/60\'/0\'/0/0');
            setAccounts(addresses);
            if (addresses.length > 0) {
                setSelectedAccount(addresses[0]);
            }
        }
        catch (error) {
            setConnectionStatus('error');
            setError(error instanceof Error ? error.message : 'Failed to connect hardware wallet');
        }
        finally {
            setIsConnecting(false);
        }
    };
    const importAccount = async () => {
        if (!selectedAccount || !selectedWallet)
            return;
        try {
            await addHardwareWallet(selectedWallet, selectedAccount, 'm/44\'/60\'/0\'/0/0');
            onNavigate('dashboard');
        }
        catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to import account');
        }
    };
    const disconnectWallet = async () => {
        if (selectedWallet) {
            await hardwareWalletManager.disconnectHardwareWallet();
            setSelectedWallet(null);
            setConnectionStatus('idle');
            setAccounts([]);
            setSelectedAccount(null);
        }
    };
    const getStatusIcon = () => {
        switch (connectionStatus) {
            case 'connecting':
                return _jsx(Loader, { className: "w-6 h-6 text-blue-500 animate-spin" });
            case 'connected':
                return _jsx(CheckCircle, { className: "w-6 h-6 text-green-500" });
            case 'error':
                return _jsx(XCircle, { className: "w-6 h-6 text-red-500" });
            default:
                return null;
        }
    };
    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connecting':
                return 'Connecting to hardware wallet...';
            case 'connected':
                return 'Hardware wallet connected successfully';
            case 'error':
                return 'Connection failed';
            default:
                return 'Select a hardware wallet to connect';
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-50", children: [_jsx("div", { className: "bg-white border-b border-gray-200 px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg transition-colors hover:bg-gray-100", children: _jsx(Shield, { className: "w-5 h-5 text-gray-600" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Hardware Wallet" }), _jsx("p", { className: "text-sm text-gray-500", children: "Connect your hardware wallet securely" })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [getStatusIcon(), _jsx("span", { className: "text-sm text-gray-600", children: getStatusText() })] })] }) }), _jsxs("div", { className: "flex-1 p-4 space-y-6", children: [!selectedWallet ? (
                    /* Hardware Wallet Selection */
                    _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-2", children: "Choose Your Hardware Wallet" }), _jsx("p", { className: "text-gray-600", children: "Select your hardware wallet to connect securely" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: hardwareWallets.map((wallet) => (_jsx(motion.div, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: `p-6 bg-white rounded-xl border-2 cursor-pointer transition-all ${selectedWallet === wallet.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'}`, onClick: () => connectHardwareWallet(wallet.id), children: _jsxs("div", { className: "flex items-start space-x-4", children: [_jsx("div", { className: "p-3 bg-blue-100 rounded-lg", children: _jsx(wallet.icon, { className: "w-6 h-6 text-blue-600" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-1", children: wallet.name }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: wallet.description }), _jsx("div", { className: "space-y-1", children: wallet.features.map((feature, index) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), _jsx("span", { className: "text-sm text-gray-700", children: feature })] }, index))) })] })] }) }, wallet.id))) }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-blue-900 mb-2", children: "Connection Instructions" }), _jsxs("ul", { className: "text-sm text-blue-800 space-y-1", children: [_jsx("li", { children: "\u2022 Ensure your hardware wallet is connected via USB" }), _jsx("li", { children: "\u2022 Unlock your hardware wallet and open the appropriate app" }), _jsx("li", { children: "\u2022 Make sure your device is not connected to any other application" }), _jsx("li", { children: "\u2022 Follow the prompts on your hardware wallet screen" })] })] })] })) : (
                    /* Account Selection */
                    _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Select Account to Import" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Choose which account to import from your ", selectedWallet] })] }), _jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: disconnectWallet, className: "px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors", children: "Disconnect" })] }), _jsx("div", { className: "space-y-2", children: accounts.map((address, index) => (_jsx(motion.div, { whileHover: { scale: 1.01 }, className: `p-4 bg-white rounded-lg border-2 cursor-pointer transition-all ${selectedAccount === address
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'}`, onClick: () => setSelectedAccount(address), children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-900", children: ["Account ", index + 1] }), selectedAccount === address && (_jsx(CheckCircle, { className: "w-4 h-4 text-blue-500" }))] }), _jsxs("p", { className: "text-xs text-gray-500 font-mono mt-1", children: [address.slice(0, 6), "...", address.slice(-4)] })] }), _jsx("div", { className: "text-xs text-gray-400", children: index === 0 ? 'Default' : `Derivation ${index}` })] }) }, address))) }), selectedAccount && (_jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: importAccount, className: "w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors", children: "Import Selected Account" })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(XCircle, { className: "w-5 h-5 text-red-500" }), _jsx("span", { className: "text-sm text-red-800", children: error })] }) }))] })), isConnecting && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 flex flex-col items-center space-y-4", children: [_jsx(Loader, { className: "w-8 h-8 text-blue-500 animate-spin" }), _jsx("p", { className: "text-gray-700", children: "Connecting to hardware wallet..." }), _jsx("p", { className: "text-sm text-gray-500", children: "Please check your device" })] }) }))] })] }));
};
export default HardwareWalletScreen;
