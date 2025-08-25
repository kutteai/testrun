import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Shield, Clock, Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import { useSecurity } from '../../store/SecurityContext';
import toast from 'react-hot-toast';
const SecurityScreen = ({ onNavigate }) => {
    const { securityState, updateSecuritySettings, lockWallet } = useSecurity();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [autoLockTimeout, setAutoLockTimeout] = useState(securityState.autoLockTimeout);
    const [requirePassword, setRequirePassword] = useState(securityState.requirePassword);
    useEffect(() => {
        setAutoLockTimeout(securityState.autoLockTimeout);
        setRequirePassword(securityState.requirePassword);
    }, [securityState]);
    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }
        try {
            // In a real implementation, you would validate the current password
            // and update it securely using crypto-utils
            const { hashPassword } = await import('../../utils/crypto-utils');
            const newHash = await hashPassword(newPassword);
            // Store the new password hash
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ passwordHash: newHash }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    }
                    else {
                        resolve();
                    }
                });
            });
            toast.success('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
        catch {
            toast.error('Failed to update password');
        }
    };
    const handleUpdateSettings = async () => {
        try {
            await updateSecuritySettings({
                autoLockTimeout,
                requirePassword
            });
            toast.success('Security settings updated');
        }
        catch {
            toast.error('Failed to update settings');
        }
    };
    const handleLockWallet = () => {
        lockWallet();
        toast.success('Wallet locked');
        onNavigate('dashboard');
    };
    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${minutes} minutes`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Security Settings" }), _jsx("div", { className: "w-9" })] }) }), _jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(Clock, { className: "w-5 h-5 text-blue-600" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Auto-Lock" }), _jsx("p", { className: "text-sm text-gray-600", children: "Automatically lock wallet after inactivity" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Auto-lock timeout" }), _jsxs("select", { value: autoLockTimeout, onChange: (e) => setAutoLockTimeout(Number(e.target.value)), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: 1, children: "1 minute" }), _jsx("option", { value: 5, children: "5 minutes" }), _jsx("option", { value: 15, children: "15 minutes" }), _jsx("option", { value: 30, children: "30 minutes" }), _jsx("option", { value: 60, children: "1 hour" }), _jsx("option", { value: 0, children: "Never" })] }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Wallet will automatically lock after ", formatTime(autoLockTimeout), " of inactivity"] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("input", { type: "checkbox", id: "requirePassword", checked: requirePassword, onChange: (e) => setRequirePassword(e.target.checked), className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }), _jsx("label", { htmlFor: "requirePassword", className: "text-sm text-gray-700", children: "Require password for transactions" })] }), _jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleUpdateSettings, className: "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2", children: [_jsx(Save, { className: "w-4 h-4" }), _jsx("span", { children: "Save Settings" })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx(Lock, { className: "w-5 h-5 text-green-600" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Change Password" }), _jsx("p", { className: "text-sm text-gray-600", children: "Update your wallet password" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Current Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showCurrentPassword ? 'text' : 'password', value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), placeholder: "Enter current password", className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), _jsx("button", { onClick: () => setShowCurrentPassword(!showCurrentPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100", children: showCurrentPassword ? (_jsx(EyeOff, { className: "w-4 h-4 text-gray-500" })) : (_jsx(Eye, { className: "w-4 h-4 text-gray-500" })) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "New Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showNewPassword ? 'text' : 'password', value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Enter new password", className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), _jsx("button", { onClick: () => setShowNewPassword(!showNewPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100", children: showNewPassword ? (_jsx(EyeOff, { className: "w-4 h-4 text-gray-500" })) : (_jsx(Eye, { className: "w-4 h-4 text-gray-500" })) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Confirm New Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showConfirmPassword ? 'text' : 'password', value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm new password", className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), _jsx("button", { onClick: () => setShowConfirmPassword(!showConfirmPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100", children: showConfirmPassword ? (_jsx(EyeOff, { className: "w-4 h-4 text-gray-500" })) : (_jsx(Eye, { className: "w-4 h-4 text-gray-500" })) })] })] }), _jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleChangePassword, disabled: !currentPassword || !newPassword || !confirmPassword, className: `w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${!currentPassword || !newPassword || !confirmPassword
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'}`, children: [_jsx(Lock, { className: "w-4 h-4" }), _jsx("span", { children: "Change Password" })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center", children: _jsx(Shield, { className: "w-5 h-5 text-red-600" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Quick Actions" }), _jsx("p", { className: "text-sm text-gray-600", children: "Immediate security actions" })] })] }), _jsx("div", { className: "space-y-3", children: _jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleLockWallet, className: "w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2", children: [_jsx(Lock, { className: "w-4 h-4" }), _jsx("span", { children: "Lock Wallet Now" })] }) })] }), _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4", children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx(AlertTriangle, { className: "w-5 h-5 text-yellow-600 mt-0.5" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-yellow-900 mb-2", children: "Security Tips" }), _jsxs("ul", { className: "text-sm text-yellow-800 space-y-1", children: [_jsx("li", { children: "\u2022 Use a strong, unique password" }), _jsx("li", { children: "\u2022 Never share your seed phrase or private keys" }), _jsx("li", { children: "\u2022 Enable auto-lock for additional security" }), _jsx("li", { children: "\u2022 Keep your wallet software updated" }), _jsx("li", { children: "\u2022 Be cautious of phishing attempts" })] })] })] }) })] })] }));
};
export default SecurityScreen;
