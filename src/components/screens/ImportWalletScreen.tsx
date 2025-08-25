import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { validateBIP39SeedPhrase, validatePrivateKey } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const ImportWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [importMethod, setImportMethod] = useState<'seed' | 'privateKey'>('seed');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const handleSeedPhraseChange = (value: string) => {
    setSeedPhrase(value);
    setIsValid(validateBIP39SeedPhrase(value));
  };

  const handlePrivateKeyChange = (value: string) => {
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
    } catch {
      toast.error('Failed to import wallet');
    }
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-sm mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Wallet</h2>
          <p className="text-gray-600">
            Import an existing wallet using seed phrase or private key
          </p>
        </div>

        {/* Import Method Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setImportMethod('seed')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                importMethod === 'seed'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">Seed Phrase</div>
              <div className="text-xs text-gray-500 mt-1">12 or 24 words</div>
            </button>
            <button
              onClick={() => setImportMethod('privateKey')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                importMethod === 'privateKey'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">Private Key</div>
              <div className="text-xs text-gray-500 mt-1">64 character hex</div>
            </button>
          </div>
        </div>

        {/* Import Form */}
        <motion.div
          key={importMethod}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {importMethod === 'seed' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seed Phrase
                </label>
                <textarea
                  value={seedPhrase}
                  onChange={(e) => handleSeedPhraseChange(e.target.value)}
                  placeholder="Enter your 12 or 24 word seed phrase"
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate words with spaces
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => handlePrivateKeyChange(e.target.value)}
                    placeholder="Enter your private key (0x...)"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                  >
                    {showPrivateKey ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your private key should start with 0x
                </p>
              </div>
            </div>
          )}

          {/* Validation Status */}
          {seedPhrase || privateKey ? (
            <div className={`p-3 rounded-lg ${
              isValid 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isValid ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm ${
                  isValid ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isValid ? 'Valid format' : 'Invalid format'}
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Security Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Never share your seed phrase or private key with anyone. This information gives full access to your wallet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleImport}
          disabled={!isValid}
          className={`w-full font-semibold py-4 px-6 rounded-xl shadow-lg transition-colors ${
            isValid
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Import Wallet
        </motion.button>
      </div>
    </div>
  );
};

export default ImportWalletScreen; 