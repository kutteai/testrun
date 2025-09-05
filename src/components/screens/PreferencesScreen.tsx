import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight,
  DollarSign,
  Globe,
  Palette,
  Wallet
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { storage } from '../../utils/storage-utils';
import type { ScreenProps } from '../../types/index';
import CurrencyModal from '../modals/CurrencyModal';
import LanguageModal from '../modals/LanguageModal';
import AppearanceModal from '../modals/AppearanceModal';

const PreferencesScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  const [appearance, setAppearance] = useState('Light mode');
  const [defaultWallet, setDefaultWallet] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  // Load preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        
        // Load user preferences from storage
        const preferences = await storage.get([
          'userCurrency',
          'userLanguage', 
          'userAppearance',
          'defaultWallet'
        ]);
        
        setCurrency(preferences.userCurrency || 'USD');
        setLanguage(preferences.userLanguage || 'English');
        setAppearance(preferences.userAppearance || 'Light mode');
        setDefaultWallet(preferences.defaultWallet || wallet?.name || 'No wallet selected');
      } catch (error) {
        console.error('Failed to load preferences:', error);
        // Use defaults if loading fails
        setDefaultWallet(wallet?.name || 'No wallet selected');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [wallet]);

  // Save preferences to storage
  const savePreferences = async (key: string, value: string) => {
    try {
      await storage.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    savePreferences('userCurrency', newCurrency);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    savePreferences('userLanguage', newLanguage);
  };

  const handleAppearanceChange = (newAppearance: string) => {
    setAppearance(newAppearance);
    savePreferences('userAppearance', newAppearance);
  };

  const preferenceItems = [
    {
      icon: DollarSign,
      label: 'Currency',
      value: currency,
      action: () => setShowCurrencyModal(true)
    },
    {
      icon: Globe,
      label: 'Language',
      value: language,
      action: () => setShowLanguageModal(true)
    },
    {
      icon: Palette,
      label: 'Appearance',
      value: appearance,
      action: () => setShowAppearanceModal(true)
    },
    {
      icon: Wallet,
      label: 'Default wallet',
      value: defaultWallet,
      screen: 'default-wallet-select'
    }
  ];

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onNavigate('settings')}
        className="absolute inset-0 bg-black/20"
      />
      
      {/* Preferences Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute top-0 right-0 w-1/2 h-full bg-white flex flex-col z-50 shadow-2xl"
      >
        {/* Header */}
        <div className="bg-[#180CB2] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold">
              Preferences
            </h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[13px] text-gray-500">Loading preferences...</div>
          </div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {preferenceItems.map((item, index) => (
              <motion.button
                key={item.screen || item.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={item.action || (() => onNavigate(item.screen as any))}
                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 text-[13px]">{item.value}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        </div>

        {/* Modals */}
        <CurrencyModal
          isOpen={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
          currentCurrency={currency}
          onCurrencyChange={handleCurrencyChange}
        />

        <LanguageModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
        />

        <AppearanceModal
          isOpen={showAppearanceModal}
          onClose={() => setShowAppearanceModal(false)}
          currentAppearance={appearance}
          onAppearanceChange={handleAppearanceChange}
        />
      </motion.div>
    </div>
  );
};

export default PreferencesScreen;
