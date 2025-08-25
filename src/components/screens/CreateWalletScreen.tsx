import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, ArrowRight, Wallet, Shield } from 'lucide-react';
import { generateBIP39SeedPhrase } from '../../utils/crypto-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const CreateWalletScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'generate' | 'confirm'>('generate');

  // Generate seed phrase
  const handleGenerateWallet = () => {
    const newSeedPhrase = generateBIP39SeedPhrase();
    setSeedPhrase(newSeedPhrase);
    setStep('confirm');
    
    // Store seed phrase for verification
    chrome.storage.local.set({ currentSeedPhrase: newSeedPhrase });
  };

  // Copy seed phrase
  const copySeedPhrase = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      toast.success('Seed phrase copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy seed phrase');
    }
  };

  // Confirm and proceed
  const handleConfirm = () => {
    onNavigate('verify');
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
            onClick={() => onNavigate('welcome')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Create Wallet</h1>
              <p className="text-slate-400 text-sm">Generate new wallet</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6"
      >
        {step === 'generate' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 mb-6">
              <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <Shield className="w-10 h-10" />
              </div>
              <h2 className="mb-3 text-2xl font-bold">Create New Wallet</h2>
              <p className="text-slate-400 mb-6">
                Generate a new wallet with a secure seed phrase
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateWallet}
              className="w-full py-4 font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Generate Seed Phrase
            </motion.button>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h2 className="mb-3 text-xl font-bold">Backup Your Seed Phrase</h2>
              <p className="text-slate-400 text-sm mb-4">
                Write down these 12 words in a secure location. You'll need them to recover your wallet.
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium">Seed Phrase</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {showSeedPhrase ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={copySeedPhrase}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {seedPhrase.split(' ').map((word, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-3 py-2 text-sm rounded-lg border border-white/20 bg-white/5"
                    >
                      <span className="text-xs text-slate-400">{index + 1}.</span> {word}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              className="w-full py-4 font-semibold text-white rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Continue to Verification
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CreateWalletScreen; 