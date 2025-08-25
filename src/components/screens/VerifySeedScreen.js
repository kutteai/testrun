import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { validateBIP39SeedPhrase } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
const VerifySeedScreen = ({ onNavigate }) => {
    const [seedWords, setSeedWords] = useState([]);
    const [selectedWords, setSelectedWords] = useState([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Get seed phrase from storage or context
    useEffect(() => {
        const getStoredSeedPhrase = async () => {
            try {
                const result = await chrome.storage.local.get(['currentSeedPhrase']);
                if (result.currentSeedPhrase) {
                    const words = result.currentSeedPhrase.split(' ');
                    setSeedWords(words);
                }
            }
            catch (error) {
                console.error('Error getting seed phrase:', error);
                toast.error('Failed to load seed phrase');
            }
        };
        getStoredSeedPhrase();
    }, []);
    const handleWordSelect = (word) => {
        if (selectedWords.length < seedWords.length) {
            const newSelectedWords = [...selectedWords, word];
            setSelectedWords(newSelectedWords);
            if (newSelectedWords.length === seedWords.length) {
                verifySeedPhrase(newSelectedWords);
            }
            else {
                setCurrentWordIndex(newSelectedWords.length);
            }
        }
    };
    const verifySeedPhrase = async (words) => {
        setIsLoading(true);
        try {
            const seedPhrase = words.join(' ');
            const isValid = validateBIP39SeedPhrase(seedPhrase);
            if (isValid) {
                setIsVerified(true);
                toast.success('Seed phrase verified successfully!');
                // Store verification status
                await chrome.storage.local.set({ seedPhraseVerified: true });
                // Navigate to dashboard after a short delay
                setTimeout(() => {
                    onNavigate('dashboard');
                }, 1500);
            }
            else {
                toast.error('Invalid seed phrase. Please try again.');
                resetVerification();
            }
        }
        catch (error) {
            toast.error('Verification failed');
            resetVerification();
        }
        finally {
            setIsLoading(false);
        }
    };
    const resetVerification = () => {
        setSelectedWords([]);
        setCurrentWordIndex(0);
        setIsVerified(false);
    };
    const getShuffledWords = () => {
        if (seedWords.length === 0)
            return [];
        // Create a copy of seed words and shuffle them
        const shuffled = [...seedWords].sort(() => Math.random() - 0.5);
        return shuffled;
    };
    const getCurrentWord = () => {
        return seedWords[currentWordIndex] || '';
    };
    const isWordCorrect = (word, index) => {
        return seedWords[index] === word;
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('create'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Verify Seed Phrase" }), _jsx("div", { className: "w-9" })] }) }), _jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 mb-2", children: "Verify Your Seed Phrase" }), _jsx("p", { className: "text-gray-600", children: "Select the words in the correct order to verify your seed phrase" })] }), _jsxs("div", { className: "bg-white rounded-xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Progress" }), _jsxs("span", { className: "text-sm text-gray-500", children: [selectedWords.length, " / ", seedWords.length] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all duration-300", style: { width: `${(selectedWords.length / seedWords.length) * 100}%` } }) })] }), !isVerified && seedWords.length > 0 && (_jsxs("div", { className: "bg-white rounded-xl p-6 text-center", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: ["Select word #", currentWordIndex + 1] }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: getCurrentWord() })] })), selectedWords.length > 0 && (_jsxs("div", { className: "bg-white rounded-xl p-4", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 mb-3", children: "Selected Words" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: selectedWords.map((word, index) => (_jsxs("div", { className: `px-3 py-2 text-sm rounded-lg border ${isWordCorrect(word, index)
                                        ? 'bg-green-50 border-green-200 text-green-800'
                                        : 'bg-red-50 border-red-200 text-red-800'}`, children: [_jsxs("span", { className: "text-xs text-gray-500", children: [index + 1, "."] }), " ", word] }, index))) })] })), !isVerified && seedWords.length > 0 && (_jsxs("div", { className: "bg-white rounded-xl p-4", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 mb-3", children: "Select the correct word" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: getShuffledWords().map((word, index) => (_jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => handleWordSelect(word), disabled: selectedWords.length >= seedWords.length, className: `px-3 py-2 text-sm rounded-lg border transition-colors ${selectedWords.length >= seedWords.length
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`, children: word }, `${word}-${index}`))) })] })), isVerified && (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, className: "bg-green-50 border border-green-200 rounded-xl p-6 text-center", children: [_jsx(CheckCircle, { className: "w-16 h-16 text-green-600 mx-auto mb-4" }), _jsx("h3", { className: "text-xl font-bold text-green-900 mb-2", children: "Verification Complete!" }), _jsx("p", { className: "text-green-700", children: "Your seed phrase has been verified successfully. Redirecting to dashboard..." })] })), !isVerified && selectedWords.length > 0 && (_jsx("div", { className: "flex space-x-3", children: _jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: resetVerification, className: "flex-1 bg-gray-600 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), _jsx("span", { children: "Start Over" })] }) }))] })] }));
};
export default VerifySeedScreen;
