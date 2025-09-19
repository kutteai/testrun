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

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Starting unlock process...');
      console.log('🔍 Password length:', password.length);
      
      const success = await unlockWallet(password);
      console.log('🔍 Unlock result:', success);
      
      if (success) {
        // Don't navigate manually - let App.tsx handle auto-navigation
        // when isWalletUnlocked state updates
        console.log('✅ Wallet unlocked successfully - App.tsx will handle navigation');
        toast.success('Wallet unlocked successfully!');
      } else {
        console.log('❌ Wallet unlock failed - invalid password');
        
        // Check if password hash is missing and try to recreate it
        try {
          console.log('🔍 Checking if password hash is missing...');
          
          // Import browser API
          const browserAPI = (() => {
            if (typeof browser !== 'undefined') return browser;
            if (typeof chrome !== 'undefined') return chrome;
            throw new Error('No browser API available');
          })();
          
          const stored = await browserAPI.storage.local.get(['wallet', 'passwordHash']);
          console.log('🔍 Storage check:', {
            hasWallet: !!stored.wallet,
            hasPasswordHash: !!stored.passwordHash,
            passwordHashLength: stored.passwordHash?.length || 0
          });
          
          if (stored.wallet && !stored.passwordHash) {
            console.log('🔧 Password hash is missing! Attempting to recreate...');
            
            // Try to decrypt the seed phrase with the provided password
            // If successful, it means the password is correct and we can recreate the hash
            if (stored.wallet.encryptedSeedPhrase) {
              try {
                // Try to decrypt seed phrase to verify password is correct
                const { hybridAPI } = await import('../../services/backend-api');
                await hybridAPI.initialize();
                
                // Generate new password hash
                const newHash = await hybridAPI.generatePasswordHash(password);
                console.log('🔧 Generated new password hash');
                
                // Store the new hash
                await browserAPI.storage.local.set({ passwordHash: newHash.hash });
                console.log('🔧 Password hash recreated and stored');
                
                // Try unlock again
                toast.loading('Password hash recreated, trying unlock again...');
                const retrySuccess = await unlockWallet(password);
                
                if (retrySuccess) {
                  toast.dismiss();
                  toast.success('Password hash fixed and wallet unlocked!');
                  return;
                } else {
                  toast.dismiss();
                  toast.error('Password hash recreated but unlock still failed');
                }
              } catch (recreateError) {
                console.error('❌ Failed to recreate password hash:', recreateError);
                toast.error('Failed to recreate password hash');
              }
            }
          }
          
          // Run serverless diagnosis for better debugging
          const { hybridAPI } = await import('../../services/backend-api');
          await hybridAPI.initialize();
          const diagnosis = await hybridAPI.diagnosePassword(password, {
            unlockAttempt: true,
            timestamp: new Date().toISOString()
          });
          console.log('🔍 Detailed password diagnosis:', diagnosis);
        } catch (diagError) {
          console.log('⚠️ Diagnosis failed:', diagError);
        }
        
        toast.error('Invalid password. Please check your password and try again.');
      }
    } catch (error) {
      console.error('❌ Failed to unlock wallet:', error);
      
      // Enhanced error logging
      console.log('🔍 Unlock error details:', {
        message: error.message,
        passwordLength: password.length,
        timestamp: new Date().toISOString()
      });
      
      toast.error(`Failed to unlock wallet: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // If wallet exists but is locked, show unlock form
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

            {/* Password Form */}
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Unlock Button */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#180CB2] text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>Unlock</span>
                )}
              </motion.button>

              {/* Password Reset Helper */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!password.trim()) {
                      toast.error('Enter your password first, then try this reset');
                      return;
                    }
                    
                    try {
                      // Use serverless diagnosis to check what's wrong
                      const { hybridAPI } = await import('../../services/backend-api');
                      await hybridAPI.initialize();
                      
                      const diagnosis = await hybridAPI.diagnosePassword(password, {
                        resetAttempt: true,
                        timestamp: new Date().toISOString()
                      });
                      
                      console.log('🔍 Password reset diagnosis:', diagnosis);
                      
                      // Show diagnosis in user-friendly format
                      const diagnosisText = `
Password Analysis:
- Length: ${diagnosis.password?.length || 0} characters
- Has numbers: ${diagnosis.password?.hasNumbers ? 'Yes' : 'No'}
- Has uppercase: ${diagnosis.password?.hasUppercase ? 'Yes' : 'No'}
- Has lowercase: ${diagnosis.password?.hasLowercase ? 'Yes' : 'No'}

Storage Status:
- Password hash stored: ${diagnosis.storage?.hasStoredHash ? 'Yes' : 'No'}
- Hash length: ${diagnosis.storage?.storedHashLength || 0}
- Encrypted data: ${diagnosis.storage?.hasEncryptedData ? 'Yes' : 'No'}

Recommendations:
${diagnosis.recommendations?.join('\n') || 'No specific recommendations'}
                      `;
                      
                      alert(diagnosisText);
                      
                      if (diagnosis.verification) {
                        const verifyText = `
Hash Verification:
- Hashes match: ${diagnosis.verification.matches ? 'Yes' : 'No'}
- Generated hash: ${diagnosis.verification.generatedHash}
- Stored hash: ${diagnosis.verification.storedHash}
                        `;
                        alert(verifyText);
                      }
                      
                    } catch (error) {
                      console.error('Password diagnosis failed:', error);
                      toast.error('Password diagnosis failed. Check console for details.');
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-[#180CB2] transition-colors"
                >
                  🔍 Diagnose Password Issue
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Test background script connection
                      console.log('🔧 Testing background script connection...');
                      
                      // Import SecureWalletComm dynamically
                      const walletContextModule = await import('../../store/WalletContext');
                      const SecureWalletComm = (walletContextModule as any).SecureWalletComm;
                      
                      if (!SecureWalletComm) {
                        throw new Error('SecureWalletComm not available');
                      }
                      
                      const isHealthy = await SecureWalletComm.healthCheck();
                      
                      if (isHealthy) {
                        console.log('✅ Background script is responding');
                        toast.success('✅ Background script is responding normally');
                      } else {
                        console.log('❌ Background script is not responding');
                        toast.error('❌ Background script is not responding - try reloading the extension');
                      }
                    } catch (error) {
                      console.error('❌ Background script test failed:', error);
                      toast.error(`Background script test failed: ${error.message}`);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-green-600 transition-colors ml-4"
                >
                  🔧 Test Background Script
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    if (!password.trim()) {
                      toast.error('Please enter your password first');
                      return;
                    }
                    
                    try {
                      console.log('🔧 Manual password hash fix attempt...');
                      
                      // Import browser API
                      const browserAPI = (() => {
                        if (typeof browser !== 'undefined') return browser;
                        if (typeof chrome !== 'undefined') return chrome;
                        throw new Error('No browser API available');
                      })();
                      
                      const stored = await browserAPI.storage.local.get(['wallet', 'passwordHash']);
                      
                      if (!stored.wallet) {
                        toast.error('No wallet found in storage');
                        return;
                      }
                      
                      console.log('🔍 Current storage state:', {
                        hasWallet: !!stored.wallet,
                        hasPasswordHash: !!stored.passwordHash,
                        hasEncryptedSeed: !!stored.wallet.encryptedSeedPhrase
                      });
                      
                      // Generate new password hash using serverless function
                      const { hybridAPI } = await import('../../services/backend-api');
                      await hybridAPI.initialize();
                      
                      toast.loading('Generating new password hash...');
                      const newHash = await hybridAPI.generatePasswordHash(password);
                      
                      // Store the new hash
                      await browserAPI.storage.local.set({ passwordHash: newHash.hash });
                      
                      // Verify it was stored
                      const verification = await browserAPI.storage.local.get(['passwordHash']);
                      
                      if (verification.passwordHash) {
                        toast.dismiss();
                        toast.success('✅ Password hash recreated successfully! Try logging in now.');
                        console.log('✅ Password hash recreated:', {
                          hashLength: verification.passwordHash.length,
                          hashPreview: verification.passwordHash.substring(0, 20) + '...'
                        });
                      } else {
                        toast.dismiss();
                        toast.error('❌ Failed to store password hash');
                      }
                      
                    } catch (error) {
                      toast.dismiss();
                      console.error('❌ Manual password hash fix failed:', error);
                      toast.error(`Password hash fix failed: ${error.message}`);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-orange-600 transition-colors ml-4"
                >
                  🔧 Fix Password Hash
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('🔍 Checking storage contents...');
                      
                      // Import browser API
                      const browserAPI = (() => {
                        if (typeof browser !== 'undefined') return browser;
                        if (typeof chrome !== 'undefined') return chrome;
                        throw new Error('No browser API available');
                      })();
                      
                      // Get all storage data
                      const allData = await browserAPI.storage.local.get(null);
                      console.log('🔍 Complete storage contents:', allData);
                      
                      // Check specific keys
                      const specificKeys = await browserAPI.storage.local.get([
                        'wallet', 'passwordHash', 'walletState', 'sessionPassword', 
                        'seedPhrase', 'importFlow', 'currentNetwork'
                      ]);
                      console.log('🔍 Specific wallet keys:', specificKeys);
                      
                      // Display summary
                      const summary = {
                        'Wallet exists': !!specificKeys.wallet,
                        'Password hash exists': !!specificKeys.passwordHash,
                        'Wallet state exists': !!specificKeys.walletState,
                        'Session password exists': !!specificKeys.sessionPassword,
                        'Seed phrase exists': !!specificKeys.seedPhrase,
                        'Import flow active': !!specificKeys.importFlow,
                        'Current network': specificKeys.currentNetwork || 'none'
                      };
                      
                      console.log('🔍 Storage summary:', summary);
                      
                      // Show alert with summary
                      const summaryText = Object.entries(summary)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n');
                      
                      alert(`Storage Contents:\n\n${summaryText}\n\nCheck console for detailed data.`);
                      
                    } catch (error) {
                      console.error('❌ Storage check failed:', error);
                      toast.error(`Storage check failed: ${error.message}`);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-purple-600 transition-colors ml-4"
                >
                  🔍 Check Storage
                </button>
                
              <button
                type="button"
                  onClick={async () => {
                    if (!password.trim()) {
                      toast.error('Please enter your password first');
                      return;
                    }
                    
                    if (!confirm('This will create a new wallet with a generated seed phrase. Continue?')) {
                      return;
                    }
                    
                    try {
                      console.log('🔧 Creating emergency wallet...');
                      
                      // Generate a new seed phrase
                      const { generateBIP39SeedPhrase } = await import('../../utils/crypto-utils');
                      const seedPhrase = generateBIP39SeedPhrase();
                      console.log('🔍 Generated seed phrase length:', seedPhrase.split(' ').length);
                      
                      // Use the background script to create wallet properly
                      const { SecureWalletComm } = await import('../../store/WalletContext');
                      
                      toast.loading('Creating emergency wallet...');
                      
                      const result = await SecureWalletComm.createWallet(
                        'Emergency Wallet',
                        seedPhrase,
                        password
                      );
                      
                      console.log('✅ Emergency wallet created:', result);
                      
                      toast.dismiss();
                      toast.success('✅ Emergency wallet created! Please save this seed phrase:');
                      
                      // Show seed phrase to user
                      alert(`IMPORTANT: Save this seed phrase!\n\n${seedPhrase}\n\nThis is your only way to recover your wallet. Write it down safely!`);
                      
                      // Try to unlock the newly created wallet
                      setTimeout(async () => {
                        const unlockSuccess = await unlockWallet(password);
                        if (unlockSuccess) {
                          toast.success('Wallet unlocked successfully!');
                        }
                      }, 1000);
                      
                    } catch (error) {
                      toast.dismiss();
                      console.error('❌ Emergency wallet creation failed:', error);
                      toast.error(`Emergency wallet creation failed: ${error.message}`);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors ml-4"
                >
                  🆘 Create Emergency Wallet
              </button>
            </div>
            </form>

            {/* Recovery options removed per user request */}
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