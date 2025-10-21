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
        // eslint-disable-next-line no-console
        console.error('Failed to load preferences:', error);
        // Use defaults if loading fails
        setCurrency('USD');
        setLanguage('English');
        setAppearance('Light mode');
        setDefaultWallet(wallet?.name || 'No wallet selected');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [wallet]);

  // Handle currency change
  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      setCurrency(newCurrency);
      await storage.set({ userCurrency: newCurrency });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save currency preference:', error);
    }
  };

  // Handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    try {
      setLanguage(newLanguage);
      await storage.set({ userLanguage: newLanguage });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save language preference:', error);
    }
  };

  // Handle appearance change
  const handleAppearanceChange = async (newAppearance: string) => {
    try {
      setAppearance(newAppearance);
      await storage.set({ userAppearance: newAppearance });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save appearance preference:', error);
    }
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Preferences</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
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
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={item.action}
                className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-[13px]">{item.label}</div>
                    <div className="text-[12px] text-gray-500">{item.value}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
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
  );
};

export default PreferencesScreen;