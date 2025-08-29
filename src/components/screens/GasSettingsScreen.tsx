import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Gauge, Clock, DollarSign, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useNetwork } from '../../store/NetworkContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

interface GasOption {
  id: string;
  name: string;
  description: string;
  gasPrice: string;
  estimatedFee: string;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'custom';
}

const GasSettingsScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { wallet } = useWallet();
  const { currentNetwork } = useNetwork();
  const [gasOptions, setGasOptions] = useState<GasOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('medium');
  const [customGasPrice, setCustomGasPrice] = useState('');
  const [customGasLimit, setCustomGasLimit] = useState('21000');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadGasOptions();
  }, [currentNetwork]);

  const loadGasOptions = async () => {
    setIsLoading(true);
    try {
      // Simulate gas price fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const baseGasPrice = 20; // Gwei
      const options: GasOption[] = [
        {
          id: 'low',
          name: 'Slow',
          description: 'Lowest fee, may take longer',
          gasPrice: `${baseGasPrice - 5} Gwei`,
          estimatedFee: '$2.50',
          estimatedTime: '5-10 min',
          priority: 'low'
        },
        {
          id: 'medium',
          name: 'Standard',
          description: 'Balanced fee and speed',
          gasPrice: `${baseGasPrice} Gwei`,
          estimatedFee: '$5.00',
          estimatedTime: '2-5 min',
          priority: 'medium'
        },
        {
          id: 'high',
          name: 'Fast',
          description: 'Higher fee, faster confirmation',
          gasPrice: `${baseGasPrice + 10} Gwei`,
          estimatedFee: '$7.50',
          estimatedTime: '30 sec - 2 min',
          priority: 'high'
        },
        {
          id: 'custom',
          name: 'Custom',
          description: 'Set your own gas price',
          gasPrice: 'Custom',
          estimatedFee: 'Calculated',
          estimatedTime: 'Variable',
          priority: 'custom'
        }
      ];
      
      setGasOptions(options);
    } catch (error) {
      toast.error('Failed to load gas options');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    if (optionId === 'custom') {
      setCustomGasPrice('25');
    }
  };

  const calculateCustomFee = () => {
    if (!customGasPrice || !customGasLimit) return '$0.00';
    const gasPrice = parseFloat(customGasPrice);
    const gasLimit = parseFloat(customGasLimit);
    const fee = (gasPrice * gasLimit * 0.000000001 * 2000); // Approximate ETH price
    return `$${fee.toFixed(2)}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'from-green-500 to-emerald-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'high': return 'from-red-500 to-pink-500';
      case 'custom': return 'from-purple-500 to-indigo-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return <TrendingDown className="w-4 h-4" />;
      case 'medium': return <Gauge className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'custom': return <Settings className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const saveGasSettings = () => {
    const selectedGasOption = gasOptions.find(option => option.id === selectedOption);
    if (selectedGasOption) {
      // In a real implementation, this would save to storage
      toast.success('Gas settings saved successfully');
      onNavigate('dashboard');
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
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gas Settings</h1>
              <p className="text-slate-400 text-sm">Customize transaction fees</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-6 pb-6 flex-1 overflow-y-auto"
      >
        {/* Current Network Info */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Current Network</h3>
              <p className="text-slate-400 text-sm">{currentNetwork?.name || 'Ethereum'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Base Fee</p>
              <p className="text-white font-medium">~20 Gwei</p>
            </div>
          </div>
        </div>

        {/* Gas Options */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Gas Options</h3>
          <div className="space-y-3">
            {gasOptions.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionSelect(option.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-white/20 hover:border-white/30 bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${getPriorityColor(option.priority)} rounded-lg flex items-center justify-center`}>
                      {getPriorityIcon(option.priority)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{option.name}</h4>
                      <p className="text-slate-400 text-sm">{option.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">{option.estimatedFee}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">{option.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{option.gasPrice}</p>
                    {selectedOption === option.id && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full mx-auto mt-2"></div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Custom Gas Settings */}
        {selectedOption === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <h4 className="font-semibold text-white mb-4">Custom Gas Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Gas Price (Gwei)
                </label>
                <input
                  type="number"
                  value={customGasPrice}
                  onChange={(e) => setCustomGasPrice(e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Gas Limit
                </label>
                <input
                  type="number"
                  value={customGasLimit}
                  onChange={(e) => setCustomGasLimit(e.target.value)}
                  placeholder="21000"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Estimated Fee:</span>
                  <span className="text-white font-medium">{calculateCustomFee()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Gas Tips */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-sm text-blue-400 font-medium">Gas Tips</span>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">• <strong>Low:</strong> Use during low network congestion</p>
            <p className="text-slate-300">• <strong>Standard:</strong> Good for most transactions</p>
            <p className="text-slate-300">• <strong>Fast:</strong> Use for urgent transactions</p>
            <p className="text-slate-300">• <strong>Custom:</strong> Set your own values</p>
          </div>
        </div>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={saveGasSettings}
          className="w-full py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium"
        >
          Save Gas Settings
        </motion.button>
      </motion.div>
    </div>
  );
};

export default GasSettingsScreen;
