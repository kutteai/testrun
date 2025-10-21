import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onNavigate: (screen: string) => void;
  handleContinue: () => void;
  isAddressValid: boolean;
  isValidAmount: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onNavigate,
  handleContinue,
  isAddressValid,
  isValidAmount,
}) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="flex space-x-3"
    >
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-[13px]"
      >
        Cancel
      </button>
      <button
        onClick={handleContinue}
        disabled={!isAddressValid || !isValidAmount}
        className={`flex-1 py-4 px-6 rounded-lg font-medium transition-colors text-[13px] ${
          isAddressValid && isValidAmount
            ? 'bg-[#180CB2] text-white hover:bg-[#140a8f]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </motion.div>
  );
};

export default ActionButtons;

