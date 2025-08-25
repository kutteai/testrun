import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { validateBIP39SeedPhrase } from '../../utils/crypto-utils';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const VerifySeedScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [verificationWords, setVerificationWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [verificationIndices, setVerificationIndices] = useState<number[]>([3, 7, 11, 15, 19, 23]);
  const { importWallet } = useWallet();

  // Get seed phrase from storage or context
  useEffect(() => {
    const getStoredSeedPhrase = async () => {
      try {
        const result = await chrome.storage.local.get(['currentSeedPhrase']);
        if (result.currentSeedPhrase) {
          const words = result.currentSeedPhrase.split(' ');
          setSeedWords(words);
          // Create verification words (every 4th word for security)
          const indices = [3, 7, 11, 15, 19, 23]; // 6 words to verify
          setVerificationIndices(indices);
          const verificationWords = indices.map(index => words[index]).filter(Boolean);
          setVerificationWords(verificationWords);
        } else {
          toast.error('No seed phrase found. Please create a wallet first.');
          onNavigate('create');
        }
      } catch (error) {
        console.error('Error getting seed phrase:', error);
        toast.error('Failed to load seed phrase');
        onNavigate('create');
      }
    };

    getStoredSeedPhrase();
  }, [onNavigate]);

  const handleWordSubmit = () => {
    if (!userInput.trim()) return;

    const currentWord = verificationWords[currentWordIndex];
    const isCorrect = userInput.trim().toLowerCase() === currentWord.toLowerCase();
    
    // Debug logging
    console.log('Verification attempt:', {
      userInput: userInput.trim().toLowerCase(),
      expectedWord: currentWord.toLowerCase(),
      isCorrect,
      currentWordIndex,
      wordPosition: verificationIndices[currentWordIndex] + 1
    });

    if (isCorrect) {
      if (currentWordIndex + 1 >= verificationWords.length) {
        // All words verified
        verifyCompleteSeedPhrase();
      } else {
        // Move to next word
        setCurrentWordIndex(currentWordIndex + 1);
        setUserInput('');
        toast.success('Correct! Next word...');
      }
    } else {
      toast.error('Incorrect word. Please try again.');
      setUserInput('');
    }
  };

  const verifyCompleteSeedPhrase = async () => {
    setIsLoading(true);
    
    try {
      const result = await chrome.storage.local.get(['currentSeedPhrase']);
      if (result.currentSeedPhrase) {
        const isValid = validateBIP39SeedPhrase(result.currentSeedPhrase);
        
        if (isValid) {
          setIsVerified(true);
          toast.success('Seed phrase verified successfully!');
          
          // Store verification status
          await chrome.storage.local.set({ seedPhraseVerified: true });
          
          // Create the actual wallet
          try {
            await importWallet(result.currentSeedPhrase, 'ethereum');
            toast.success('Wallet created and verified successfully!');
            
            // Navigate to dashboard after a short delay
            setTimeout(() => {
              onNavigate('dashboard');
            }, 1500);
          } catch (walletError) {
            console.error('Failed to create wallet:', walletError);
            toast.error('Verification successful but wallet creation failed');
            resetVerification();
          }
        } else {
          toast.error('Invalid seed phrase. Please try again.');
          resetVerification();
        }
      }
    } catch (error) {
      toast.error('Verification failed');
      resetVerification();
    } finally {
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setCurrentWordIndex(0);
    setUserInput('');
    setIsVerified(false);
  };

  const getCurrentWord = () => {
    return verificationWords[currentWordIndex] || '';
  };

  const getProgressPercentage = () => {
    return ((currentWordIndex + 1) / verificationWords.length) * 100;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleWordSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('create')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Verify Seed Phrase</h1>
              <p className="text-slate-400 text-sm">Type the missing words</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Verify Your Seed Phrase</h2>
            <p className="text-slate-400">
              Type the missing words to verify your seed phrase
            </p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6"
      >
        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-slate-400">
              {currentWordIndex + 1} / {verificationWords.length}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
            ></motion.div>
          </div>
        </div>

        {/* Word Input */}
        {!isVerified && verificationWords.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center border border-white/20"
          >
                      <h3 className="text-lg font-semibold mb-4">
            Type word #{verificationIndices[currentWordIndex] + 1}
          </h3>
            
            <div className="mb-6">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter the word..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWordSubmit}
              disabled={!userInput.trim() || isLoading}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                !userInput.trim() || isLoading
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {isLoading ? 'Verifying...' : 'Verify Word'}
            </motion.button>
          </motion.div>
        )}

        {/* Success State */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 border border-green-400 rounded-2xl p-6 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-300 mb-2">Verification Complete!</h3>
            <p className="text-green-200">
              Your seed phrase has been verified successfully. Redirecting to dashboard...
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        {!isVerified && currentWordIndex > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex space-x-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetVerification}
              disabled={isLoading}
              className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start Over</span>
            </motion.button>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Verifying seed phrase...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifySeedScreen; 