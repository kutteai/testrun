import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X } from 'lucide-react';
import { storageUtils } from '../../utils/storage-utils';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const VerifyPhraseScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const [verificationWords, setVerificationWords] = useState<{ [key: number]: string }>({});
  const [verificationResults, setVerificationResults] = useState<{ [key: number]: boolean }>({});
  const [correctPhrase, setCorrectPhrase] = useState<string[]>([]);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const { importWallet } = useWallet();

  // Get the seed phrase from storage using cross-browser storage
  useEffect(() => {
    const getSeedPhrase = async () => {
      const seedPhrase = await storageUtils.getSeedPhrase();
      if (seedPhrase) {
        setCorrectPhrase(seedPhrase.split(' '));
      }
    };
    getSeedPhrase();
  }, []);

  // Words to verify (random positions)
  const wordsToVerify = [3, 6, 9];

  const handleWordChange = (position: number, word: string) => {
    setVerificationWords(prev => ({
      ...prev,
      [position]: word
    }));

    // Check if the word is correct
    const isCorrect = word.toLowerCase() === correctPhrase[position - 1];
    setVerificationResults(prev => ({
      ...prev,
      [position]: isCorrect
    }));
  };

  const allWordsCorrect = wordsToVerify.every(position => 
    verificationResults[position] === true
  );

  const handleVerify = async () => {
    if (allWordsCorrect) {
      try {
        setIsCreatingWallet(true);
        
        // Get the stored password and seed phrase
        const password = await storageUtils.getPassword();
        const seedPhrase = await storageUtils.getSeedPhrase();
        
        if (!password || !seedPhrase) {
          throw new Error('Missing password or seed phrase');
        }

        console.log('🔍 VerifyPhrase: Importing wallet with verified seed phrase...');
        console.log('🔍 VerifyPhrase: Password length:', password.length);
        console.log('🔍 VerifyPhrase: Seed phrase length:', seedPhrase.split(' ').length);

        // Import the wallet with the verified seed phrase (this is the correct flow)
        await importWallet(seedPhrase, 'ethereum', password);
        
        console.log('✅ VerifyPhrase: Wallet imported successfully');
        toast.success('Wallet imported and unlocked successfully!');
        
        // Navigate to UCPI creation after successful wallet import
        onNavigate('create-ucpi');
      } catch (error) {
        console.error('Failed to import wallet:', error);
        toast.error('Failed to import wallet. Please try again.');
      } finally {
        setIsCreatingWallet(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <button
                      onClick={onGoBack || (() => onNavigate('recovery-phrase'))}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Phrase checking
          </h1>
          <p className="text-gray-600 text-lg">
            Enter your words below to make sure you've stored your recovery phrase correctly.
          </p>
        </motion.div>

        {/* Verification Fields */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          {wordsToVerify.map((position) => (
            <div key={position} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Word {position}.
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={verificationWords[position] || ''}
                  onChange={(e) => handleWordChange(position, e.target.value)}
                  placeholder="Enter word"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    verificationResults[position] === true
                      ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                      : verificationResults[position] === false
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#180CB2] focus:border-[#180CB2]'
                  }`}
                />
                {verificationResults[position] !== undefined && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {verificationResults[position] ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Verification Progress</span>
              <span className="text-sm text-gray-500">
                {Object.values(verificationResults).filter(Boolean).length} / {wordsToVerify.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#180CB2] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(Object.values(verificationResults).filter(Boolean).length / wordsToVerify.length) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-800 text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Need help?</p>
                <p className="text-blue-700">
                  Go back to the previous screen to review your recovery phrase again.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Verify Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleVerify}
          disabled={!allWordsCorrect || isCreatingWallet}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            allWordsCorrect && !isCreatingWallet
              ? 'bg-[#180CB2] hover:bg-[#140a8f] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isCreatingWallet ? 'Importing Wallet...' : 'Okay'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default VerifyPhraseScreen;
