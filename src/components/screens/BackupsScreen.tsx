import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Upload, Shield, AlertTriangle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { storage } from '../../utils/storage-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface BackupData {
  id: string;
  name: string;
  type: 'seed' | 'private-key' | 'keystore';
  createdAt: number;
  size: number;
}

const BackupsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet, decryptSeedPhrase } = useWallet();
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const result = await storage.get(['backups']);
      setBackups(result.backups || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load backups:', error);
    }
  };

  const saveBackups = async (updatedBackups: BackupData[]) => {
    try {
      await storage.set({ backups: updatedBackups });
      setBackups(updatedBackups);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save backups:', error);
      toast.error('Failed to save backup list');
    }
  };

  const handleExportSeedPhrase = async () => {
    if (!wallet?.encryptedSeedPhrase) {
      toast.error('No seed phrase found');
      return;
    }

    setIsLoading(true);
    try {
      const decryptedSeed = await decryptSeedPhrase(password);
      if (!decryptedSeed) {
        toast.error('Invalid password');
        return;
      }

      setSeedPhrase(decryptedSeed);
      setShowSeedPhrase(true);
      
      // Add to backups list
      const newBackup: BackupData = {
        id: Date.now().toString(),
        name: 'Seed Phrase Export',
        type: 'seed',
        createdAt: Date.now(),
        size: decryptedSeed.length
      };
      
      const updatedBackups = [...backups, newBackup];
      saveBackups(updatedBackups);
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to decrypt seed phrase:', error);
      toast.error('Failed to decrypt seed phrase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPrivateKey = async () => {
    if (!wallet?.accounts || wallet.accounts.length === 0) {
      toast.error('No accounts found');
      return;
    }

    setIsLoading(true);
    try {
      const currentAccount = wallet.accounts.find(acc => acc.address === wallet.address);
      if (!currentAccount) {
        toast.error('Current account not found');
        return;
      }

      const decryptedPrivateKey = await wallet.decryptPrivateKey(password);
      if (!decryptedPrivateKey) {
        toast.error('Invalid password');
        return;
      }

      // Create downloadable file
      const blob = new Blob([decryptedPrivateKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `private-key-${currentAccount.address.substring(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add to backups list
      const newBackup: BackupData = {
        id: Date.now().toString(),
        name: 'Private Key Export',
        type: 'private-key',
        createdAt: Date.now(),
        size: decryptedPrivateKey.length
      };
      
      const updatedBackups = [...backups, newBackup];
      saveBackups(updatedBackups);
      
      toast.success('Private key exported successfully');
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to export private key:', error);
      toast.error('Failed to export private key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportKeystore = async () => {
    if (!wallet?.accounts || wallet.accounts.length === 0) {
      toast.error('No accounts found');
      return;
    }

    setIsLoading(true);
    try {
      const currentAccount = wallet.accounts.find(acc => acc.address === wallet.address);
      if (!currentAccount) {
        toast.error('Current account not found');
        return;
      }

      // Create keystore file (simplified version)
      const keystoreData = {
        version: 3,
        id: currentAccount.id,
        address: currentAccount.address,
        crypto: {
          ciphertext: currentAccount.privateKey,
          cipherparams: { iv: 'random-iv' },
          cipher: 'aes-128-ctr',
          kdf: 'scrypt',
          kdfparams: {
            dklen: 32,
            salt: 'random-salt',
            n: 262144,
            r: 8,
            p: 1
          },
          mac: 'random-mac'
        }
      };

      const blob = new Blob([JSON.stringify(keystoreData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keystore-${currentAccount.address.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add to backups list
      const newBackup: BackupData = {
        id: Date.now().toString(),
        name: 'Keystore Export',
        type: 'keystore',
        createdAt: Date.now(),
        size: JSON.stringify(keystoreData).length
      };
      
      const updatedBackups = [...backups, newBackup];
      saveBackups(updatedBackups);
      
      toast.success('Keystore exported successfully');
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to export keystore:', error);
      toast.error('Failed to export keystore');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySeedPhrase = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      toast.success('Seed phrase copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy seed phrase');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Backups</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {/* Security Warning */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 text-[13px]">Security Warning</h3>
              <p className="text-red-700 text-[13px] mt-1">
                Never share your seed phrase or private keys with anyone. Store them securely offline.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Export Options */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleExportSeedPhrase}
              disabled={isLoading}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow text-left disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#180CB2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-[13px]">Export Seed Phrase</h3>
                  <p className="text-gray-600 text-[13px] mt-1">Recover your wallet with 12 or 24 words</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            <button
              onClick={handleExportPrivateKey}
              disabled={isLoading}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow text-left disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#180CB2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-[13px]">Export Private Key</h3>
                  <p className="text-gray-600 text-[13px] mt-1">Export your private key as a text file</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            <button
              onClick={handleExportKeystore}
              disabled={isLoading}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow text-left disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#180CB2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-[13px]">Export Keystore</h3>
                  <p className="text-gray-600 text-[13px] mt-1">Export encrypted keystore file</p>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Backup History */}
        {backups.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Backup History</h2>
            
            <div className="space-y-3">
              {backups.map((backup, index) => (
                <motion.div
                  key={backup.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-[13px]">{backup.name}</h3>
                        <p className="text-gray-600 text-[13px]">
                          {formatDate(backup.createdAt)} • {formatSize(backup.size)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {backup.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Password Modal */}
      {!showSeedPhrase && (isLoading || password === '') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Password</h2>
            <p className="text-gray-600 text-[13px] mb-4">
              Enter your wallet password to export your backup data.
            </p>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px] mb-4"
              placeholder="Enter wallet password"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setPassword('');
                  setIsLoading(false);
                }}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (password.trim()) {
                    handleExportSeedPhrase();
                  }
                }}
                disabled={!password.trim() || isLoading}
                className="flex-1 py-2 px-4 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors text-[13px] disabled:opacity-50"
              >
                {isLoading ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Seed Phrase Modal */}
      {showSeedPhrase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Seed Phrase</h2>
              <button
                onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                {showSeedPhrase ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-600 text-[13px] mb-3">
                Write down these words in the exact order shown. Store them in a safe place.
              </p>
              <div className="grid grid-cols-3 gap-2 text-[13px] font-mono">
                {seedPhrase.split(' ').map((word, index) => (
                  <div key={index} className="bg-white p-2 rounded border text-center">
                    {word}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSeedPhrase(false);
                  setSeedPhrase('');
                  setPassword('');
                }}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-[13px]"
              >
                Close
              </button>
              <button
                onClick={handleCopySeedPhrase}
                className="flex-1 py-2 px-4 bg-[#180CB2] text-white rounded-lg font-medium hover:bg-[#140a8f] transition-colors text-[13px]"
              >
                <Copy className="w-4 h-4 inline mr-2" />
                Copy
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default BackupsScreen;

