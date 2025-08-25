import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { validateBIP39SeedPhrase, validatePrivateKey } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
const ImportWalletScreen = ({ onNavigate }) => {
    const [importMethod, setImportMethod] = useState('seed');
    const [seedPhrase, setSeedPhrase] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const handleSeedPhraseChange = (value) => {
        setSeedPhrase(value);
        setIsValid(validateBIP39SeedPhrase(value));
    };
    const handlePrivateKeyChange = (value) => {
        setPrivateKey(value);
        setIsValid(validatePrivateKey(value));
    };
    const handleImport = () => {
        if (!isValid) {
            toast.error('Please enter a valid seed phrase or private key');
            return;
        }
        try {
            // In a real implementation, you would import the wallet here
            toast.success('Wallet imported successfully!');
            onNavigate('dashboard');
        }
        catch {
            toast.error('Failed to import wallet');
        }
    };
    return (_jsx("div", { className: "h-full bg-gray-50 p-6", children: _jsxs("div", { className: "max-w-sm mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Import Wallet" }), _jsx("p", { className: "text-gray-600", children: "Import an existing wallet using seed phrase or private key" })] }), _jsx("div", { className: "mb-6", children: _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("button", { onClick: () => setImportMethod('seed'), className: `p-3 rounded-lg border-2 transition-colors ${importMethod === 'seed'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`, children: [_jsx("div", { className: "text-sm font-medium", children: "Seed Phrase" }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: "12 or 24 words" })] }), _jsxs("button", { onClick: () => setImportMethod('privateKey'), className: `p-3 rounded-lg border-2 transition-colors ${importMethod === 'privateKey'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`, children: [_jsx("div", { className: "text-sm font-medium", children: "Private Key" }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: "64 character hex" })] })] }) }), _jsxs(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3 }, children: [importMethod === 'seed' ? (_jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Seed Phrase" }), _jsx("textarea", { value: seedPhrase, onChange: (e) => handleSeedPhraseChange(e.target.value), placeholder: "Enter your 12 or 24 word seed phrase", className: "w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Separate words with spaces" })] }) })) : (_jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Private Key" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPrivateKey ? 'text' : 'password', value: privateKey, onChange: (e) => handlePrivateKeyChange(e.target.value), placeholder: "Enter your private key (0x...)", className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" }), _jsx("button", { onClick: () => setShowPrivateKey(!showPrivateKey), className: "absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100", children: showPrivateKey ? (_jsx(EyeOff, { className: "w-4 h-4 text-gray-500" })) : (_jsx(Eye, { className: "w-4 h-4 text-gray-500" })) })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Your private key should start with 0x" })] }) })), seedPhrase || privateKey ? (_jsx("div", { className: `p-3 rounded-lg ${isValid
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'}`, children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: `w-2 h-2 rounded-full mr-2 ${isValid ? 'bg-green-500' : 'bg-red-500'}` }), _jsx("span", { className: `text-sm ${isValid ? 'text-green-700' : 'text-red-700'}`, children: isValid ? 'Valid format' : 'Invalid format' })] }) })) : null] }, importMethod), _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mt-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-yellow-400", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-yellow-800", children: "Security Notice" }), _jsx("div", { className: "mt-2 text-sm text-yellow-700", children: _jsx("p", { children: "Never share your seed phrase or private key with anyone. This information gives full access to your wallet." }) })] })] }) }), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleImport, disabled: !isValid, className: `w-full font-semibold py-4 px-6 rounded-xl shadow-lg transition-colors ${isValid
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`, children: "Import Wallet" })] }) }));
};
export default ImportWalletScreen;
