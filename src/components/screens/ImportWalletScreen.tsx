import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { validateBIP39SeedPhrase, validatePrivateKey } from '../../utils/crypto-utils';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const ImportWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [importMethod, setImportMethod] = useState<'seed' | 'privateKey'>('seed');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const { importWallet, importWalletFromPrivateKey, isWalletUnlocked, hasWallet } = useWallet();

  const handleSeedPhraseChange = (value: string) => {
    setSeedPhrase(value);
    const isValid = validateBIP39SeedPhrase(value);
    setIsValid(isValid);
    
    // Debug logging
    console.log('Seed phrase validation:', {
      phrase: value,
      wordCount: value.trim().split(/\s+/).length,
      isValid: isValid,
      trimmed: value.trim()
    });
  };

  const handlePrivateKeyChange = (value: string) => {
    setPrivateKey(value);
    const isValidKey = validatePrivateKey(value);
    setIsValid(isValidKey);
    
    if (value.trim() && !isValidKey) {
      console.log('Invalid private key format. Expected: 64 character hex string (with or without 0x prefix)');
    }
  };

  const handleImport = async () => {
    if (!isValid) {
      toast.error('Please enter a valid seed phrase or private key');
      return;
    }

    // Check if we need a password
    const needsPassword = !isWalletUnlocked && !hasWallet;
    if (needsPassword && !password.trim()) {
      toast.error('Please enter a password to encrypt your imported wallet');
      return;
    }

    try {
      console.log('Importing wallet...');
      
      if (importMethod === 'privateKey') {
        console.log('Importing from private key...');
        // Validate the private key again
        if (!validatePrivateKey(privateKey)) {
          toast.error('Invalid private key format. Please check your MetaMask private key.');
          return;
        }
        
        // Import wallet from private key
        await importWalletFromPrivateKey(privateKey, 'ethereum', password || undefined);
        console.log('Private key import successful');
      } else {
        console.log('Importing from seed phrase...');
        // Validate the seed phrase
        if (!validateBIP39SeedPhrase(seedPhrase)) {
          toast.error('Invalid seed phrase. Please check your 12 or 24 word phrase.');
          return;
        }
        
        // Import wallet from seed phrase
        await importWallet(seedPhrase, 'ethereum', password || undefined);
        console.log('Seed phrase import successful');
      }
      
      toast.success('Wallet imported successfully!');
      onNavigate('dashboard');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Failed to import wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('welcome')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Import Wallet</h1>
              <p className="text-slate-400 text-sm">Import existing wallet</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 flex-1"
      >

        {/* Import Method Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setImportMethod('seed')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                importMethod === 'seed'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-white/20 bg-white/10 text-white hover:border-white/30'
              }`}
            >
              <div className="text-sm font-medium">Seed Phrase</div>
              <div className="text-xs text-slate-400 mt-1">12 or 24 words</div>
            </button>
            <button
              onClick={() => setImportMethod('privateKey')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                importMethod === 'privateKey'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-white/20 bg-white/10 text-white hover:border-white/30'
              }`}
            >
              <div className="text-sm font-medium">Private Key</div>
              <div className="text-xs text-slate-400 mt-1">64 character hex</div>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Seed Phrase
                </label>
                <div className="relative">
                  <textarea
                    value={showSeedPhrase ? seedPhrase : seedPhrase.split(' ').map(() => '••••••••').join(' ')}
                    onChange={(e) => handleSeedPhraseChange(e.target.value)}
                    placeholder="Enter your 12 or 24 word seed phrase"
                    className="w-full h-24 px-3 py-2 pr-10 border border-white/20 bg-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-slate-400"
                  />
                  <button
                    onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                    className="absolute right-3 top-3 p-1 rounded hover:bg-white/10"
                  >
                    {showSeedPhrase ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Separate words with spaces
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Private Key
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => handlePrivateKeyChange(e.target.value)}
                    placeholder="Enter your private key (0x...)"
                    className="w-full px-3 py-2 pr-10 border border-white/20 bg-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10"
                  >
                    {showPrivateKey ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Your private key should be 64 characters long (with or without 0x prefix)
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  💡 For MetaMask: Export your private key from MetaMask settings
                </p>
              </div>
            </div>
          )}

          {/* Password input - only show if wallet is not unlocked and no wallet exists */}
          {!isWalletUnlocked && !hasWallet && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Wallet Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password to encrypt your wallet"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                This password will be used to encrypt and protect your imported wallet
              </p>
            </div>
          )}

          {/* Validation Status */}
          {seedPhrase || privateKey ? (
            <div className={`p-3 rounded-lg ${
              isValid 
                ? 'bg-green-500/20 border border-green-400/20' 
                : 'bg-red-500/20 border border-red-400/20'
            }`}>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isValid ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className={`text-sm ${
                  isValid ? 'text-green-300' : 'text-red-300'
                }`}>
                  {isValid ? 'Valid format' : 'Invalid format'}
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Security Warning */}
        <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-300">Security Notice</h3>
              <div className="mt-2 text-sm text-yellow-200">
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
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
        >
          Import Wallet
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ImportWalletScreen;