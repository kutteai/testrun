import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, X, Check } from 'lucide-react';

interface ToAddressInputSectionProps {
  toAddress: string;
  handleAddressChange: (value: string) => void;
  addressType: string;
  isAddressValid: boolean;
  currentNetwork: any;
}

const ToAddressInputSection: React.FC<ToAddressInputSectionProps> = ({
  toAddress,
  handleAddressChange,
  addressType,
  isAddressValid,
  currentNetwork,
}) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-6"
    >
      <label className="block text-[13px] text-gray-600 mb-2">To</label>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <input
          type="text"
          placeholder={
            addressType === 'address' ? 'Enter wallet address'
              : addressType === 'ens'
                ? (currentNetwork?.id === 'bsc' || currentNetwork?.id === 'binance')
                  ? 'Enter BNB domain (e.g., example.bnb)'
                  : 'Enter ENS domain (e.g., vitalik.eth)'
                : 'Enter UCPI ID'
          }
          value={toAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
          aria-label="Recipient address"
          aria-describedby="address-validation"
          aria-invalid={!isAddressValid && toAddress.length > 0}
        />
        <button
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Scan QR code"
          title="Scan QR code"
        >
          <QrCode className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Address Validation */}
      {toAddress && (
        <div id="address-validation" className={`mt-2 p-3 rounded-lg ${
          isAddressValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {isAddressValid ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-700 text-[13px]">
                  Valid {currentNetwork?.name || 'address'} address
                </span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-[13px]">
                  Invalid {currentNetwork?.name || 'address'} address
                </span>
              </>
            )}
          </div>
          {!isAddressValid && toAddress && (
            <div className="mt-1 text-red-600 text-[12px]">
              {addressType === 'ens' && !['ethereum', 'polygon', 'arbitrum', 'optimism'].includes(currentNetwork?.id || 'ethereum')
                ? 'ENS is only supported on Ethereum networks'
                : `Please enter a valid ${currentNetwork?.name || 'address'} address`
              }
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ToAddressInputSection;

