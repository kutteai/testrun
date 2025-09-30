import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SeedPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedPhrase: string;
  onConfirm: () => void;
  accountName?: string;
}

const SeedPhraseModal: React.FC<SeedPhraseModalProps> = ({
  isOpen,
  onClose,
  seedPhrase,
  onConfirm,
  accountName = 'New Account'
}) => {
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const words = seedPhrase.split(' ');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setHasCopied(true);
      toast.success('Seed phrase copied to clipboard');
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy seed phrase');
    }
  };

  const handleConfirm = () => {
    if (userConfirmed) {
      onConfirm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Backup Your {accountName}
              </h2>
              <p className="text-gray-600 text-sm">
                Save this seed phrase in a secure location
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-800 mb-2">
                  ⚠️ CRITICAL SECURITY WARNING
                </p>
                <ul className="text-red-700 space-y-1">
                  <li>• Never share this seed phrase with anyone</li>
                  <li>• Anyone with this phrase can access your account</li>
                  <li>• Store it offline in a secure location</li>
                  <li>• If you lose this phrase, you lose access to your account</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Seed Phrase Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Seed Phrase
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {showSeedPhrase ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Show</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Seed Phrase Grid */}
            <div className="bg-gray-50 rounded-lg p-4">
              {showSeedPhrase ? (
                <div className="grid grid-cols-3 gap-3">
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200"
                    >
                      <span className="text-xs text-gray-500 font-mono w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {word}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200"
                    >
                      <span className="text-xs text-gray-500 font-mono w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium text-gray-400">
                        ••••••••
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="confirmBackup"
                checked={userConfirmed}
                onChange={(e) => setUserConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="confirmBackup" className="text-sm text-gray-700">
                I understand that I need to save this seed phrase in a secure location. 
                I understand that if I lose this seed phrase, I will lose access to this account forever.
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!userConfirmed}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            I've Saved It
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SeedPhraseModal;
