import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  currentCurrency,
  onCurrencyChange
}) => {
  const currencyOptions = [
    { code: 'USD', name: 'United States Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'Great British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' }
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-80 mx-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Currency</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          {currencyOptions.map((option) => (
            <label
              key={option.code}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <span className="text-gray-900">{option.code}</span>
              <div className="relative">
                <input
                  type="radio"
                  name="currency"
                  value={option.code}
                  checked={currentCurrency === option.code}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  currentCurrency === option.code
                    ? 'border-[#180CB2] bg-[#180CB2]'
                    : 'border-gray-300 bg-white'
                }`}>
                  {currentCurrency === option.code && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-1.5" />
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CurrencyModal;

