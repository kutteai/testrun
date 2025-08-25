import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, ArrowRight } from 'lucide-react';
import { generateBIP39SeedPhrase } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
const CreateWalletScreen = ({ onNavigate }) => {
    const [seedPhrase, setSeedPhrase] = useState('');
    const [showSeedPhrase, setShowSeedPhrase] = useState(false);
    const [copied, setCopied] = useState(false);
    const [step, setStep] = useState('generate');
    // Generate seed phrase
    const handleGenerateWallet = () => {
        const newSeedPhrase = generateBIP39SeedPhrase();
        setSeedPhrase(newSeedPhrase);
        setStep('confirm');
    };
    // Copy seed phrase
    const copySeedPhrase = async () => {
        try {
            await navigator.clipboard.writeText(seedPhrase);
            setCopied(true);
            toast.success('Seed phrase copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            toast.error('Failed to create wallet');
        }
    };
    // Confirm and proceed
    const handleConfirm = () => {
        onNavigate('verify');
    };
    return (_jsx("div", { className: "p-6 h-full bg-gray-50", children: _jsxs("div", { className: "mx-auto max-w-sm", children: [step === 'generate' && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "text-center", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "flex justify-center items-center mx-auto mb-4 w-16 h-16 rounded-full bg-primary-100", children: _jsx(ArrowRight, { className: "w-8 h-8 text-primary-600" }) }), _jsx("h2", { className: "mb-2 text-2xl font-bold text-gray-900", children: "Create New Wallet" }), _jsx("p", { className: "text-gray-600", children: "Generate a new wallet with a secure seed phrase" })] }), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleGenerateWallet, className: "px-6 py-4 w-full font-semibold text-white rounded-xl shadow-lg transition-colors bg-primary-600 hover:bg-primary-700", children: "Generate Seed Phrase" })] })), step === 'confirm' && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "mb-2 text-xl font-bold text-gray-900", children: "Backup Your Seed Phrase" }), _jsx("p", { className: "text-sm text-gray-600", children: "Write down these 12 words in a secure location. You'll need them to recover your wallet." })] }), _jsxs("div", { className: "p-4 mb-6 bg-white rounded-xl border border-gray-200", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Seed Phrase" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => setShowSeedPhrase(!showSeedPhrase), className: "p-1 rounded hover:bg-gray-100", children: showSeedPhrase ? (_jsx(EyeOff, { className: "w-4 h-4 text-gray-500" })) : (_jsx(Eye, { className: "w-4 h-4 text-gray-500" })) }), _jsx("button", { onClick: copySeedPhrase, className: "p-1 rounded hover:bg-gray-100", children: copied ? (_jsx(Check, { className: "w-4 h-4 text-green-500" })) : (_jsx(Copy, { className: "w-4 h-4 text-gray-500" })) })] })] }), showSeedPhrase ? (_jsx("div", { className: "grid grid-cols-3 gap-2", children: seedPhrase.split(' ').map((word, index) => (_jsxs("div", { className: "px-3 py-2 font-mono text-sm bg-gray-50 rounded-lg", children: [_jsxs("span", { className: "mr-1 text-xs text-gray-500", children: [index + 1, "."] }), word] }, index))) })) : (_jsx("div", { className: "grid grid-cols-3 gap-2", children: Array.from({ length: 12 }, (_, index) => (_jsxs("div", { className: "px-3 py-2 font-mono text-sm bg-gray-50 rounded-lg", children: [_jsxs("span", { className: "mr-1 text-xs text-gray-500", children: [index + 1, "."] }), "\u2022\u2022\u2022\u2022\u2022\u2022"] }, index))) }))] }), _jsx("div", { className: "p-4 mb-6 bg-yellow-50 rounded-lg border border-yellow-200", children: _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "w-5 h-5 text-yellow-400", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-yellow-800", children: "Security Warning" }), _jsx("div", { className: "mt-2 text-sm text-yellow-700", children: _jsxs("ul", { className: "space-y-1 list-disc list-inside", children: [_jsx("li", { children: "Never share your seed phrase with anyone" }), _jsx("li", { children: "Store it in a secure, offline location" }), _jsx("li", { children: "Don't take screenshots or store it digitally" })] }) })] })] }) }), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: handleConfirm, className: "px-6 py-4 w-full font-semibold text-white rounded-xl shadow-lg transition-colors bg-primary-600 hover:bg-primary-700", children: "I've Written It Down" })] }))] }) }));
};
export default CreateWalletScreen;
