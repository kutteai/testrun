import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Check, Globe, Settings } from 'lucide-react';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
const NetworksScreen = ({ onNavigate }) => {
    const { networks, currentNetwork, switchNetwork, addCustomNetwork } = useNetwork();
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customNetwork, setCustomNetwork] = useState({
        name: '',
        symbol: '',
        rpcUrl: '',
        chainId: '',
        explorerUrl: ''
    });
    const defaultNetworks = [
        {
            id: 'ethereum',
            name: 'Ethereum',
            symbol: 'ETH',
            rpcUrl: 'https://mainnet.infura.io/v3/',
            chainId: '1',
            explorerUrl: 'https://etherscan.io',
            isCustom: false,
            isEnabled: true
        },
        {
            id: 'bsc',
            name: 'Binance Smart Chain',
            symbol: 'BNB',
            rpcUrl: 'https://bsc-dataseed1.binance.org',
            chainId: '56',
            explorerUrl: 'https://bscscan.com',
            isCustom: false,
            isEnabled: true
        },
        {
            id: 'polygon',
            name: 'Polygon',
            symbol: 'MATIC',
            rpcUrl: 'https://polygon-rpc.com',
            chainId: '137',
            explorerUrl: 'https://polygonscan.com',
            isCustom: false,
            isEnabled: true
        },
        {
            id: 'avalanche',
            name: 'Avalanche',
            symbol: 'AVAX',
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: '43114',
            explorerUrl: 'https://snowtrace.io',
            isCustom: false,
            isEnabled: true
        }
    ];
    const handleNetworkSwitch = async (network) => {
        try {
            await switchNetwork(network.id);
            toast.success(`Switched to ${network.name}`);
        }
        catch (error) {
            toast.error(error.message);
            toast.error('Failed to switch network');
        }
    };
    const handleAddCustomNetwork = async () => {
        if (!customNetwork.name || !customNetwork.rpcUrl || !customNetwork.chainId) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            const newNetwork = {
                id: customNetwork.name.toLowerCase().replace(/\s+/g, '-'),
                name: customNetwork.name,
                symbol: customNetwork.symbol,
                rpcUrl: customNetwork.rpcUrl,
                chainId: customNetwork.chainId,
                explorerUrl: customNetwork.explorerUrl,
                isCustom: true,
                isEnabled: true
            };
            await addCustomNetwork(newNetwork);
            toast.success('Custom network added successfully');
            setIsAddingCustom(false);
            setCustomNetwork({
                name: '',
                symbol: '',
                rpcUrl: '',
                chainId: '',
                explorerUrl: ''
            });
        }
        catch {
            toast.error('Failed to add network');
        }
    };
    const isNetworkActive = (network) => {
        return currentNetwork?.id === network.id;
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Networks" }), _jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: () => setIsAddingCustom(true), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(Plus, { className: "w-5 h-5 text-gray-600" }) })] }) }), _jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-3", children: "Default Networks" }), _jsx("div", { className: "space-y-2", children: defaultNetworks.map((network) => (_jsx(motion.div, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => handleNetworkSwitch(network), className: `p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${isNetworkActive(network)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(Globe, { className: "w-5 h-5 text-blue-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: network.name }), _jsx("p", { className: "text-sm text-gray-600", children: network.symbol })] })] }), _jsx("div", { className: "flex items-center space-x-2", children: isNetworkActive(network) && (_jsx(Check, { className: "w-5 h-5 text-blue-600" })) })] }) }, network.id))) })] }), networks.filter(n => n.isCustom).length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-3", children: "Custom Networks" }), _jsx("div", { className: "space-y-2", children: networks.filter(n => n.isCustom).map((network) => (_jsx(motion.div, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => handleNetworkSwitch(network), className: `p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${isNetworkActive(network)
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx(Settings, { className: "w-5 h-5 text-green-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: network.name }), _jsx("p", { className: "text-sm text-gray-600", children: network.symbol })] })] }), _jsx("div", { className: "flex items-center space-x-2", children: isNetworkActive(network) && (_jsx(Check, { className: "w-5 h-5 text-green-600" })) })] }) }, network.id))) })] })), isAddingCustom && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: "bg-white rounded-xl p-6 w-full max-w-md mx-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Add Custom Network" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Network Name" }), _jsx("input", { type: "text", value: customNetwork.name, onChange: (e) => setCustomNetwork(prev => ({ ...prev, name: e.target.value })), placeholder: "e.g., My Custom Network", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Symbol" }), _jsx("input", { type: "text", value: customNetwork.symbol, onChange: (e) => setCustomNetwork(prev => ({ ...prev, symbol: e.target.value })), placeholder: "e.g., CUSTOM", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "RPC URL" }), _jsx("input", { type: "url", value: customNetwork.rpcUrl, onChange: (e) => setCustomNetwork(prev => ({ ...prev, rpcUrl: e.target.value })), placeholder: "https://rpc.example.com", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Chain ID" }), _jsx("input", { type: "text", value: customNetwork.chainId, onChange: (e) => setCustomNetwork(prev => ({ ...prev, chainId: e.target.value })), placeholder: "e.g., 1", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Explorer URL (Optional)" }), _jsx("input", { type: "url", value: customNetwork.explorerUrl, onChange: (e) => setCustomNetwork(prev => ({ ...prev, explorerUrl: e.target.value })), placeholder: "https://explorer.example.com", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { className: "flex space-x-3 mt-6", children: [_jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => setIsAddingCustom(false), className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50", children: "Cancel" }), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleAddCustomNetwork, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Add Network" })] })] }) }))] })] }));
};
export default NetworksScreen;
