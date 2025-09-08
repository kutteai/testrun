import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Check, AlertCircle } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { storageUtils } from '../../utils/storage-utils';
import { validateBIP39SeedPhraseWithFeedback } from '../../utils/crypto-utils';
import type { ScreenProps } from '../../types/index';

const ImportSeedPhraseScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { importWallet } = useWallet();
  const [wordCount, setWordCount] = useState(12);
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(24).fill(''));
  const [activeField, setActiveField] = useState(0);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const wordCountOptions = [12, 15, 18, 21, 24];

  const handleWordChange = (index: number, value: string) => {
    const newSeedPhrase = [...seedPhrase];
    newSeedPhrase[index] = value;
    setSeedPhrase(newSeedPhrase);

    // Auto-advance to next field if current field is filled
    if (value.trim() && index < wordCount - 1) {
      setActiveField(index + 1);
    }
  };

  const handleClear = () => {
    setSeedPhrase(Array(24).fill(''));
    setActiveField(0);
    setShowError(false);
  };

  const validateSeedPhrase = () => {
    const words = seedPhrase.slice(0, wordCount).filter(word => word.trim());
    
    if (words.length !== wordCount) {
      setErrorMessage('Please fill in all word fields');
      setShowError(true);
      return false;
    }

    // Join words into seed phrase string
    const seedPhraseString = words.join(' ');
    
    // Use proper BIP39 validation
    const validation = validateBIP39SeedPhraseWithFeedback(seedPhraseString);
    
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid seed phrase');
      setShowError(true);
      return false;
    }

    return true;
  };

  const handleImportWallet = async () => {
    if (validateSeedPhrase()) {
      try {
        const seedPhraseString = seedPhrase.slice(0, wordCount).join(' ');
        console.log('🔍 ImportSeedPhraseScreen: Starting wallet import...');
        console.log('🔍 ImportSeedPhraseScreen: Seed phrase length:', seedPhraseString.split(' ').length);
        
        // Get the stored password from the import flow
        const password = await storageUtils.getPassword();
        console.log('🔍 ImportSeedPhraseScreen: Password found:', !!password);
        
        if (!password) {
          setErrorMessage('Password not found. Please restart the import process.');
          setShowError(true);
          return;
        }
        
        console.log('🔍 ImportSeedPhraseScreen: Calling importWallet...');
        // Import the wallet
        await importWallet(seedPhraseString, 'ethereum', password);
        console.log('🔍 ImportSeedPhraseScreen: Wallet imported successfully!');
        
        // Navigate directly to UCPI creation
        onNavigate('create-ucpi');
      } catch (error) {
        console.error('❌ ImportSeedPhraseScreen: Error importing wallet:', error);
        setErrorMessage(`Failed to import wallet: ${error.message || 'Please check your seed phrase.'}`);
        setShowError(true);
      }
    }
  };

  const isFormValid = seedPhrase.slice(0, wordCount).every(word => word.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="flex-1 text-center text-xl font-bold">
            Seed phrase
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 bg-white rounded-t-3xl">
        {/* Word Count Selector */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">Words of my seed phrase are</span>
              <div className="relative">
                <select
                  value={wordCount}
                  onChange={(e) => {
                    setWordCount(Number(e.target.value));
                    setSeedPhrase(Array(Number(e.target.value)).fill(''));
                    setActiveField(0);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded px-3 py-1 text-[#180CB2] font-medium focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2]"
                >
                  {wordCountOptions.map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="w-3 h-3 border-r-2 border-b-2 border-[#180CB2] transform rotate-45"></div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClear}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
          </div>
        </motion.div>

        {/* Seed Phrase Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: wordCount }, (_, index) => (
              <div key={index} className="relative">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 font-mono min-w-[20px]">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={seedPhrase[index]}
                    onChange={(e) => handleWordChange(index, e.target.value)}
                    onFocus={() => setActiveField(index)}
                    placeholder="....."
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                      activeField === index
                        ? 'border-[#180CB2] focus:ring-[#180CB2] focus:border-[#180CB2]'
                        : seedPhrase[index].trim() && seedPhrase[index].length >= 2
                        ? 'border-green-500'
                        : seedPhrase[index].trim() && seedPhrase[index].length < 2
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  {seedPhrase[index].trim() && seedPhrase[index].length >= 2 && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {seedPhrase[index].trim() && seedPhrase[index].length < 2 && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Error Message */}
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-center space-x-2 text-red-600"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </motion.div>
        )}

        {/* Help Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-800 text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Enter your recovery phrase</p>
              <p className="text-blue-700">
                Type each word in the correct order. Make sure to double-check each word as you type.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirm Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleImportWallet}
          disabled={!isFormValid}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            isFormValid
                              ? 'bg-[#180CB2] hover:bg-[#140a8f] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Confirm
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ImportSeedPhraseScreen;
