import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Send, 
  Download, 
  Settings, 
  Eye,
  EyeOff
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { usePortfolio } from '../../store/PortfolioContext';
import { useTransaction } from '../../store/TransactionContext';
import type { ScreenProps, ScreenId } from '../../types/index';

interface DashboardScreenProps extends ScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
  onNavigate
}) => {
  const { currentNetwork } = useWallet();
  const { portfolioValue } = usePortfolio();
  const { pendingTransactions } = useTransaction();

  const [showBalance, setShowBalance] = React.useState(true);

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance);
  };

  const quickActions = [
    {
      id: 'send',
      label: 'Send',
      icon: Send,
      color: 'bg-blue-500',
      onClick: () => onNavigate('send')
    },
    {
      id: 'receive',
      label: 'Receive',
      icon: Download,
      color: 'bg-green-500',
      onClick: () => onNavigate('receive')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'bg-gray-500',
      onClick: () => onNavigate('settings')
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Balance Section */}
      <div className="bg-white p-6 rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleBalanceVisibility}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
          >
            {showBalance ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
          </motion.button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Total Balance</p>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {showBalance ? formatCurrency(portfolioValue?.totalUSD || 0) : '****'}
            </span>
            {portfolioValue?.totalChangePercent && (
              <div className={`flex items-center space-x-1 ${
                portfolioValue.totalChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <TrendingUp className={`w-4 h-4 ${
                  portfolioValue.totalChangePercent >= 0 ? '' : 'rotate-180'
                }`} />
                <span className="text-sm font-medium">
                  {Math.abs(portfolioValue.totalChangePercent).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {currentNetwork?.name || 'Ethereum'} Network
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className="flex flex-col items-center space-y-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-lg ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
        </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
      <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('transaction-history')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
          </motion.button>
          </div>
          
          <div className="space-y-3">
          {pendingTransactions && pendingTransactions.length > 0 ? (
            pendingTransactions.slice(0, 3).map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="font-medium text-gray-900">Transaction</p>
                    <p className="text-sm text-gray-500">{tx.hash}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{tx.value}</p>
                    <p className="text-sm text-gray-500">{tx.status}</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent transactions</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen; 