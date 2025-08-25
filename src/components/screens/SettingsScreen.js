import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Shield, Bell, Download, Trash2, Info } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useSecurity } from '../../store/SecurityContext';
import toast from 'react-hot-toast';
const SettingsScreen = ({ onNavigate }) => {
    const { wallet } = useWallet();
    const { securityState } = useSecurity();
    const [currency, setCurrency] = useState('USD');
    const [language, setLanguage] = useState('en');
    const [notifications, setNotifications] = useState(true);
    const [theme, setTheme] = useState('light');
    const settingsSections = [
        {
            id: 'general',
            title: 'General',
            icon: Settings,
            items: [
                {
                    id: 'currency',
                    label: 'Currency',
                    value: currency,
                    type: 'select',
                    options: [
                        { value: 'USD', label: 'US Dollar (USD)' },
                        { value: 'EUR', label: 'Euro (EUR)' },
                        { value: 'GBP', label: 'British Pound (GBP)' },
                        { value: 'JPY', label: 'Japanese Yen (JPY)' }
                    ]
                },
                {
                    id: 'language',
                    label: 'Language',
                    value: language,
                    type: 'select',
                    options: [
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Español' },
                        { value: 'fr', label: 'Français' },
                        { value: 'de', label: 'Deutsch' }
                    ]
                },
                {
                    id: 'theme',
                    label: 'Theme',
                    value: theme,
                    type: 'select',
                    options: [
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'auto', label: 'Auto' }
                    ]
                }
            ]
        },
        {
            id: 'notifications',
            title: 'Notifications',
            icon: Bell,
            items: [
                {
                    id: 'notifications',
                    label: 'Enable Notifications',
                    value: notifications,
                    type: 'toggle'
                }
            ]
        },
        {
            id: 'security',
            title: 'Security',
            icon: Shield,
            items: [
                {
                    id: 'autoLock',
                    label: 'Auto-lock Timeout',
                    value: `${securityState.autoLockTimeout} minutes`,
                    type: 'link',
                    action: () => onNavigate('security')
                }
            ]
        },
        {
            id: 'wallet',
            title: 'Wallet',
            icon: Settings,
            items: [
                {
                    id: 'export',
                    label: 'Export Wallet',
                    type: 'button',
                    action: () => handleExportWallet(),
                    icon: Download
                },
                {
                    id: 'delete',
                    label: 'Delete Wallet',
                    type: 'button',
                    action: () => handleDeleteWallet(),
                    icon: Trash2,
                    danger: true
                }
            ]
        },
        {
            id: 'about',
            title: 'About',
            icon: Info,
            items: [
                {
                    id: 'version',
                    label: 'Version',
                    value: '2.0.0',
                    type: 'text'
                },
                {
                    id: 'network',
                    label: 'Network',
                    value: wallet?.network || 'Ethereum',
                    type: 'text'
                }
            ]
        }
    ];
    const handleExportWallet = async () => {
        try {
            if (!wallet) {
                toast.error('No wallet to export');
                return;
            }
            // In a real implementation, this would export wallet data securely
            const walletData = {
                name: wallet.name,
                address: wallet.address,
                network: wallet.network,
                createdAt: wallet.createdAt
            };
            const dataStr = JSON.stringify(walletData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `wallet-backup-${Date.now()}.json`;
            link.click();
            toast.success('Wallet exported successfully');
        }
        catch {
            toast.error('Failed to export wallet');
        }
    };
    const handleDeleteWallet = async () => {
        if (confirm('Are you sure you want to delete this wallet? This action cannot be undone.')) {
            try {
                // In a real implementation, this would securely delete the wallet
                await chrome.storage.local.remove(['wallets', 'currentWallet']);
                toast.success('Wallet deleted successfully');
                onNavigate('welcome');
            }
            catch {
                toast.error('Failed to delete wallet');
            }
        }
    };
    const handleSettingChange = (sectionId, itemId, value) => {
        switch (itemId) {
            case 'currency':
                setCurrency(value);
                chrome.storage.local.set({ currency: value });
                break;
            case 'language':
                setLanguage(value);
                chrome.storage.local.set({ language: value });
                break;
            case 'theme':
                setTheme(value);
                chrome.storage.local.set({ theme: value });
                break;
            case 'notifications':
                setNotifications(value);
                chrome.storage.local.set({ notifications: value });
                break;
        }
    };
    const renderSettingItem = (item) => {
        switch (item.type) {
            case 'select':
                return (_jsx("select", { value: item.value, onChange: (e) => handleSettingChange('', item.id, e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: item.options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }));
            case 'toggle':
                return (_jsx("input", { type: "checkbox", checked: item.value, onChange: (e) => handleSettingChange('', item.id, e.target.checked), className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }));
            case 'button':
                return (_jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: item.action, className: `px-3 py-1 rounded-lg text-sm font-medium transition-colors ${item.danger
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`, children: [item.icon && _jsx(item.icon, { className: "w-4 h-4 inline mr-1" }), item.label] }));
            case 'link':
                return (_jsx("button", { onClick: item.action, className: "text-blue-600 hover:text-blue-700 text-sm font-medium", children: item.value }));
            default:
                return (_jsx("span", { className: "text-gray-600 text-sm", children: item.value }));
        }
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Settings" }), _jsx("div", { className: "w-9" })] }) }), _jsx("div", { className: "p-4 space-y-6", children: settingsSections.map((section) => (_jsxs("div", { className: "bg-white rounded-xl overflow-hidden", children: [_jsx("div", { className: "px-4 py-3 bg-gray-50 border-b border-gray-200", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(section.icon, { className: "w-5 h-5 text-gray-600" }), _jsx("h2", { className: "text-lg font-semibold text-gray-900", children: section.title })] }) }), _jsx("div", { className: "divide-y divide-gray-200", children: section.items.map((item) => (_jsxs("div", { className: "px-4 py-3 flex items-center justify-between", children: [_jsx("div", { className: "flex-1", children: _jsx("label", { className: "text-sm font-medium text-gray-700", children: item.label }) }), _jsx("div", { className: "ml-4", children: renderSettingItem(item) })] }, item.id))) })] }, section.id))) })] }));
};
export default SettingsScreen;
