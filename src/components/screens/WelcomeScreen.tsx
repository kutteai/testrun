import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import logo from '../../assets/logo.png'; 

interface WelcomeScreenProps extends ScreenProps {
  hasWallet: boolean;
  isWalletUnlocked: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onNavigate, 
  hasWallet, 
  isWalletUnlocked 
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { unlockWallet } = useWallet();

  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

  // SECURE password validation
  const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    
    // Additional security checks
    if (password.includes(' ')) {
      return { isValid: false, error: 'Password cannot contain spaces' };
    }
    
    return { isValid: true };
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURE validation
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Secure WelcomeScreen: Attempting wallet unlock...');
      
      // Call the secure unlock method
      const success = await unlockWallet(password);
      
      if (success) {
        console.log('Secure WelcomeScreen: Wallet unlocked successfully');
        // Clear password from memory immediately
        setPassword('');
        // Navigation is handled by App.tsx when isWalletUnlocked changes
      } else {
        console.log('Secure WelcomeScreen: Wallet unlock failed');
        toast.error('Invalid password. Please try again.');
        // Clear password on failure for security
        setPassword('');
      }
    } catch (error) {
      console.error('Secure WelcomeScreen: Unlock error:', error);
      toast.error('Failed to unlock wallet. Please try again.');
      // Clear password on error for security
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  // If wallet exists but is locked, show SECURE unlock form
  if (hasWallet && !isWalletUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col bg-white"
      >
        {/* Top Section - Blue Header */}
        <div className="h-1/4 bg-[#180CB2] flex items-center justify-center relative">
          {/* Yellow Circle on Border */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#D7FF1D] rounded-full flex items-center justify-center z-10">
            <div className="flex flex-col space-y-1">
              <div className="w-6 h-1 bg-[#180CB2] rounded-full"></div>
              <div className="w-4 h-1 bg-[#180CB2] rounded-full"></div>
              <div className="w-3 h-1 bg-[#180CB2] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Bottom Section - White Content Area */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center px-8 pt-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-sm"
          >
            {/* Welcome Back Title */}
            <div className="text-center mb-8">
              <h1 className="text-[30px] font-extrabold text-gray-900 mb-2 leading-[35px] tracking-[0%] text-center" style={{ fontFamily: 'Inter' }}>Welcome back</h1>
            </div>

            {/* SECURE Password Form */}
            <form onSubmit={handleUnlock} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password here"
                    className="w-full px-4 py-4 pr-12 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={isLoading}
                    autoComplete="current-password"
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Secure Unlock Button */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full bg-[#180CB2] text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>Unlock Wallet</span>
                )}
              </motion.button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm text-center">
                🔒 Your wallet is secured with military-grade encryption
              </p>
            </div>

            {/* Recovery Options */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-gray-500 text-sm">Forgot your password?</p>
              <p className="text-gray-500 text-sm">You can reset without affecting funds.</p>
              <button
                type="button"
                className="text-[#180CB2] font-semibold text-sm hover:underline"
                onClick={() => {
                  toast.error('Reset functionality will be available in a future update');
                }}
              >
                Reset wallet
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // If no wallet exists, show welcome screen for new users (onboarding)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full bg-white flex flex-col"
    >
      {/* Header with Logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Paycio Logo */}
          <div className="mb-12 flex items-center justify-center">
            <img 
              src={logo} 
              alt="Paycio Logo" 
              className="w-[116px] h-[33px]"
              style={{ 
                width: '116.23592376708984px',
                height: '32.717247009277344px'
              }}
            />
          </div>
          
          {/* Welcome Title */}
          <h1 className="text-gray-900 mb-6" style={{ 
            fontFamily: 'Inter',
            fontWeight: 800,
            fontStyle: 'normal',
            fontSize: '30px',
            lineHeight: '35px',
            letterSpacing: '0%',
            textAlign: 'center'
          }}>
            Welcome to Paycio
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 max-w-md mx-auto" style={{ 
            fontFamily: 'Inter',
            fontWeight: 400,
            fontStyle: 'normal',
            fontSize: '16px',
            lineHeight: '18px',
            letterSpacing: '0%',
            textAlign: 'center'
          }}>
            Trusted by millions, Paycio is a secure wallet making the world of web3 accessible to all
          </p>
        </motion.div>
      </div>

      {/* Bottom Section - Language and Get Started */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="px-8 pb-12 mt-auto space-y-8 flex flex-col items-center"
      >
        {/* Language Selection */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            style={{
              width: '288px',
              height: '46px',
              border: '1px solid #DBDBDB',
              borderRadius: '4px'
            }}
          >
            <span className="text-gray-700 px-4">{selectedLanguage}</span>
            <ChevronDown className="w-5 h-5 text-gray-400 mr-4" />
          </button>
          
          {/* Language Dropdown */}
          {showLanguageDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
            >
              {languages.map((language) => (
                <button
                  key={language}
                  onClick={() => {
                    setSelectedLanguage(language);
                    setShowLanguageDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  {language}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Get Started Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('terms')}
          className="bg-[#180CB2] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          style={{
            width: '288px',
            height: '46px',
            borderRadius: '28px'
          }}
        >
          <span style={{
            width: '111px',
            height: '19px',
            textAlign: 'center',
            lineHeight: '19px'
          }}>
            Get started
          </span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;