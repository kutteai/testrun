import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { generateBIP39SeedPhrase } from '../../utils/crypto-utils';
import { storageUtils } from '../../utils/storage-utils';
import type { ScreenProps } from '../../types/index';

const CreatePasswordScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isImportFlow, setIsImportFlow] = useState(false);

  // Check if this is an import flow when component mounts
  useEffect(() => {
    const checkImportFlow = async () => {
      const importFlow = await storageUtils.getImportFlow();
      console.log('🔍 CreatePasswordScreen: Import flow flag:', importFlow);
      setIsImportFlow(importFlow);
    };
    checkImportFlow();
  }, []);

  // Password requirements
  const requirements = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    length: password.length >= 8
  };

  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleCreatePassword = async () => {
    if (allRequirementsMet && passwordsMatch && acceptedTerms) {
      if (isImportFlow) {
        // This is for importing a wallet - store password and go to import options
        await storageUtils.setImportFlow(true);
        // Store password temporarily for import flow
        await storageUtils.storePassword(password);
        onNavigate('import');
      } else {
        // This is for creating a new wallet - generate seed phrase and go to recovery phrase
        const seedPhrase = generateBIP39SeedPhrase();
        await storageUtils.storeSeedPhrase(seedPhrase);
        await storageUtils.storePassword(password);
        await storageUtils.setImportFlow(false); // Clear the import flow flag
        onNavigate('recovery-phrase');
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
      <div className="bg-[#180CB2] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onGoBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">English</span>
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
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
            Paycio password
          </h1>
          <p className="text-gray-600 text-lg">
            Use this for wallet recovery on all devices
          </p>
        </motion.div>

        {/* Password Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Create new password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Password Requirements */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-4 text-[10px]">
            <div className={`flex items-center space-x-1 ${requirements.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
              {requirements.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Uppercase</span>
            </div>
            <div className={`flex items-center space-x-1 ${requirements.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
              {requirements.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Lowercase</span>
            </div>
            <div className={`flex items-center space-x-1 ${requirements.number ? 'text-green-600' : 'text-gray-500'}`}>
              {requirements.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Number</span>
            </div>
            <div className={`flex items-center space-x-1 ${requirements.symbol ? 'text-green-600' : 'text-gray-500'}`}>
              {requirements.symbol ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Symbol</span>
            </div>
            <div className={`flex items-center space-x-1 ${requirements.length ? 'text-green-600' : 'text-gray-500'}`}>
              {requirements.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>8+ chars</span>
            </div>
          </div>
        </motion.div>

        {/* Confirm Password */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#180CB2] border-gray-300 rounded focus:ring-[#180CB2] focus:ring-2"
            />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">
                If I forget this password, I'll lose access to my wallet permanently. Paycio can't reset it for me.
              </p>
              <button className="text-[#180CB2] hover:underline">
                Learn more
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create Password Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="px-6 pb-8"
      >
        <button
          onClick={handleCreatePassword}
          disabled={!allRequirementsMet || !passwordsMatch || !acceptedTerms}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            allRequirementsMet && passwordsMatch && acceptedTerms
              ? 'bg-[#180CB2] hover:bg-[#140a8f] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Create password
        </button>
      </motion.div>
    </motion.div>
  );
};

export default CreatePasswordScreen;
