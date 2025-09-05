import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Eye, EyeOff } from 'lucide-react';
import { storageUtils } from '../../utils/storage-utils';
import type { ScreenProps } from '../../types/index';

const RecoveryPhraseScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const [showPhrase, setShowPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);

  // Get the seed phrase from storage using cross-browser storage
  useEffect(() => {
    const getSeedPhrase = async () => {
      const seedPhrase = await storageUtils.getSeedPhrase();
      if (seedPhrase) {
        setRecoveryPhrase(seedPhrase.split(' '));
      }
    };
    getSeedPhrase();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNext = () => {
    onNavigate('verify-phrase');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={onGoBack || (() => onNavigate('create-password'))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
        </div>
        
        {/* Centered Title and Instructions */}
        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-black mb-2">
            Recovery phrase
          </h1>
          <p className="text-sm text-black">
            Write down these words in the correct order and store them in a secure place.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6">
        {/* Recovery Phrase Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative">
            {/* Recovery Phrase Grid */}
            <div className={`grid grid-cols-3 gap-3 mb-4 transition-all duration-300 relative ${!showPhrase ? 'blur-sm' : ''}`}>
              {recoveryPhrase.map((word, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-2"
                >
                  <span className="text-xs text-gray-500 font-mono min-w-[20px]">
                    {index + 1}.
                  </span>
                  <span className={`text-sm font-medium ${showPhrase ? 'text-black' : 'text-gray-400'}`}>
                    {showPhrase ? word : '••••••'}
                  </span>
                </div>
              ))}
              
              {/* Blurry Overlay when hidden - only over the phrase grid */}
              {!showPhrase && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium text-sm">Recovery phrase hidden</p>
                    <p className="text-gray-500 text-xs">Click the eye icon to reveal</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Divider */}
            <div className="border-t border-gray-200 mb-4"></div>
            
            {/* Footer with Copy and Eye Icons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4 text-black" />
                <span className="text-sm text-black font-medium">
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
              
              <button
                onClick={() => setShowPhrase(!showPhrase)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPhrase ? (
                  <EyeOff className="w-5 h-5 text-black" />
                ) : (
                  <Eye className="w-5 h-5 text-black" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Next Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleNext}
          className="w-full py-4 px-6 bg-[#180CB2] text-white font-semibold rounded-lg hover:bg-[#140a8f] transition-colors"
        >
          Next
        </button>
      </motion.div>
    </motion.div>
  );
};

export default RecoveryPhraseScreen;
