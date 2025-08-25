import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { validateBIP39SeedPhrase } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const VerifySeedScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
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
      } catch (error) {
        console.error('Error getting seed phrase:', error);
        toast.error('Failed to load seed phrase');
      }
    };

    getStoredSeedPhrase();
  }, []);

  const handleWordSelect = (word: string) => {
    if (selectedWords.length < seedWords.length) {
      const newSelectedWords = [...selectedWords, word];
      setSelectedWords(newSelectedWords);
      
      if (newSelectedWords.length === seedWords.length) {
        verifySeedPhrase(newSelectedWords);
      } else {
        setCurrentWordIndex(newSelectedWords.length);
      }
    }
  };

  const verifySeedPhrase = async (words: string[]) => {
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
      } else {
        toast.error('Invalid seed phrase. Please try again.');
        resetVerification();
      }
    } catch (error) {
      toast.error('Verification failed');
      resetVerification();
    } finally {
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setSelectedWords([]);
    setCurrentWordIndex(0);
    setIsVerified(false);
  };

  const getShuffledWords = () => {
    if (seedWords.length === 0) return [];
    
    // Create a copy of seed words and shuffle them
    const shuffled = [...seedWords].sort(() => Math.random() - 0.5);
    return shuffled;
  };

  const getCurrentWord = () => {
    return seedWords[currentWordIndex] || '';
  };

  const isWordCorrect = (word: string, index: number) => {
    return seedWords[index] === word;
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('create')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Verify Seed Phrase</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Instructions */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Seed Phrase</h2>
          <p className="text-gray-600">
            Select the words in the correct order to verify your seed phrase
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {selectedWords.length} / {seedWords.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(selectedWords.length / seedWords.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Word */}
        {!isVerified && seedWords.length > 0 && (
          <div className="bg-white rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select word #{currentWordIndex + 1}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {getCurrentWord()}
            </p>
          </div>
        )}

        {/* Selected Words */}
        {selectedWords.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Words</h3>
            <div className="grid grid-cols-3 gap-2">
              {selectedWords.map((word, index) => (
                <div
                  key={index}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    isWordCorrect(word, index)
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <span className="text-xs text-gray-500">{index + 1}.</span> {word}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Word Selection */}
        {!isVerified && seedWords.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select the correct word</h3>
            <div className="grid grid-cols-3 gap-2">
              {getShuffledWords().map((word, index) => (
                <motion.button
                  key={`${word}-${index}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleWordSelect(word)}
                  disabled={selectedWords.length >= seedWords.length}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedWords.length >= seedWords.length
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {word}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Success State */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-900 mb-2">Verification Complete!</h3>
            <p className="text-green-700">
              Your seed phrase has been verified successfully. Redirecting to dashboard...
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        {!isVerified && selectedWords.length > 0 && (
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetVerification}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start Over</span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifySeedScreen; 