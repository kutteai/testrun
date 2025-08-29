import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Shield, Bell, Download, Trash2, Info } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useSecurity } from '../../store/SecurityContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const SettingsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { securityState } = useSecurity();
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState('light');

  const settingsSections = [
    {
      id: 'general',
      title: 'General',
      icon: Settings,
      items: [
        {
          id: 'currency',
          label: 'Currency',
          value: currency,
          type: 'select',
          options: [
            { value: 'USD', label: 'US Dollar (USD)' },
            { value: 'EUR', label: 'Euro (EUR)' },
            { value: 'GBP', label: 'British Pound (GBP)' },
            { value: 'JPY', label: 'Japanese Yen (JPY)' }
          ]
        },
        {
          id: 'language',
          label: 'Language',
          value: language,
          type: 'select',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
            { value: 'de', label: 'Deutsch' }
          ]
        },
        {
          id: 'theme',
          label: 'Theme',
          value: theme,
          type: 'select',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto' }
          ]
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          id: 'notifications',
          label: 'Enable Notifications',
          value: notifications,
          type: 'toggle'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      items: [
        {
          id: 'autoLock',
          label: 'Auto-lock Timeout',
          value: `${securityState.autoLockTimeout} minutes`,
          type: 'link',
          action: () => onNavigate('security')
        }
      ]
    },
    {
      id: 'wallet',
      title: 'Wallet',
      icon: Settings,
      items: [
        {
          id: 'accounts',
          label: 'Manage Accounts',
          type: 'link',
          action: () => onNavigate('accounts')
        },
        {
          id: 'export',
          label: 'Export Wallet',
          type: 'button',
          action: () => handleExportWallet(),
          icon: Download
        },
        {
          id: 'delete',
          label: 'Delete Wallet',
          type: 'button',
          action: () => handleDeleteWallet(),
          icon: Trash2,
          danger: true
        }
      ]
    },
    {
      id: 'about',
      title: 'About',
      icon: Info,
      items: [
        {
          id: 'version',
          label: 'Version',
          value: '2.0.0',
          type: 'text'
        },
        {
          id: 'network',
          label: 'Network',
          value: wallet?.currentNetwork || 'Ethereum',
          type: 'text'
        }
      ]
    }
  ];

  const handleExportWallet = async () => {
    try {
      if (!wallet) {
        toast.error('No wallet to export');
        return;
      }

      // In a real implementation, this would export wallet data securely
      const walletData = {
        name: wallet.name,
        address: wallet.address,
        network: wallet.currentNetwork,
        createdAt: wallet.createdAt
      };

      const dataStr = JSON.stringify(walletData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `wallet-backup-${Date.now()}.json`;
      link.click();
      
      toast.success('Wallet exported successfully');
    } catch {
      toast.error('Failed to export wallet');
    }
  };

  const handleDeleteWallet = async () => {
    if (confirm('Are you sure you want to delete this wallet? This action cannot be undone.')) {
      try {
        // In a real implementation, this would securely delete the wallet
        await chrome.storage.local.remove(['wallets', 'currentWallet']);
        toast.success('Wallet deleted successfully');
        onNavigate('welcome');
      } catch {
        toast.error('Failed to delete wallet');
      }
    }
  };

  const handleSettingChange = (sectionId: string, itemId: string, value: any) => {
    switch (itemId) {
      case 'currency':
        setCurrency(value);
        chrome.storage.local.set({ currency: value });
        break;
      case 'language':
        setLanguage(value);
        chrome.storage.local.set({ language: value });
        break;
      case 'theme':
        setTheme(value);
        chrome.storage.local.set({ theme: value });
        break;
      case 'notifications':
        setNotifications(value);
        chrome.storage.local.set({ notifications: value });
        break;
    }
  };

  const renderSettingItem = (item: any) => {
    switch (item.type) {
      case 'select':
        return (
          <select
            value={item.value}
            onChange={(e) => handleSettingChange('', item.id, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {item.options.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'toggle':
        return (
          <input
            type="checkbox"
            checked={item.value}
            onChange={(e) => handleSettingChange('', item.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      
      case 'button':
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={item.action}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              item.danger
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {item.icon && <item.icon className="w-4 h-4 inline mr-1" />}
            {item.label}
          </motion.button>
        );
      
      case 'link':
        return (
          <button
            onClick={item.action}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {item.value}
          </button>
        );
      
      default:
        return (
          <span className="text-gray-600 text-sm">{item.value}</span>
        );
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
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-slate-400 text-sm">Configure your wallet</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6"
      >
        {settingsSections.map((section) => (
          <motion.div 
            key={section.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20"
          >
            <div className="px-6 py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <section.icon className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
            </div>
            
            <div className="divide-y divide-white/10">
              {section.items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-300">{item.label}</label>
                  </div>
                  <div className="ml-4">
                    {renderSettingItem(item)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SettingsScreen; 