import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { usePortfolio } from '../../../../store/PortfolioContext';
import { getAccountBalance } from '../utils/account-balance-utils';

interface AmountInputSectionProps {
  amount: string;
  setAmount: (amount: string) => void;
  selectedCurrency: string;
  fromAccount: any;
  portfolioValue: any;
  currentNetwork: any;
}

const AmountInputSection: React.FC<AmountInputSectionProps> = ({
  amount,
  setAmount,
  selectedCurrency,
  fromAccount,
  portfolioValue,
  currentNetwork,
}) => {
  const currentBalance = fromAccount ? getAccountBalance(fromAccount, portfolioValue, currentNetwork) : { balance: '0', usdValue: 0 };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-lg">↕</span>
          </div>
          <div>
            <input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none w-24"
              aria-label="Amount to send"
              aria-describedby="amount-description"
              inputMode="decimal"
            />
            <div id="amount-description" className="text-[13px] text-gray-600">
              ${amount ? (parseFloat(amount) * (portfolioValue?.assets?.[0]?.usdValue || 0)).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">Ξ</span>
          </div>
          <span className="font-medium text-gray-900 text-[13px]">{selectedCurrency}</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Balance */}
      <div className="mt-2 text-green-600 text-[13px]">
        Balance: {currentBalance.balance} {selectedCurrency}
      </div>
    </motion.div>
  );
};

export default AmountInputSection;




