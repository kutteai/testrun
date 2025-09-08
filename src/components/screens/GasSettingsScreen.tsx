import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Zap, Clock, Shield, Save, Loader, RefreshCw } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { 
  GasSettings, 
  TransactionSettings, 
  DEFAULT_GAS_SETTINGS, 
  GAS_PRESETS,
  getCurrentGasPrices,
  saveGasSettings,
  loadGasSettings,
  saveTransactionSettings,
  loadTransactionSettings
} from '../../utils/gas-utils';
import { getNetworkRPCUrl } from '../../utils/token-balance-utils';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';

const GasSettingsScreen: React.FC<ScreenProps> = ({ onNavigate, onGoBack }) => {
  const { wallet } = useWallet();
  const [gasSettings, setGasSettings] = useState<GasSettings>(DEFAULT_GAS_SETTINGS);
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>({
    gasSettings: DEFAULT_GAS_SETTINGS,
    autoApprove: false,
    sessionTimeout: 15
  });
  const [currentGasPrices, setCurrentGasPrices] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCurrentGasPrices();
  }, [wallet?.currentNetwork]);

  const loadSettings = async () => {
    try {
      const [gas, tx] = await Promise.all([
        loadGasSettings(),
        loadTransactionSettings()
      ]);
      setGasSettings(gas);
      setTransactionSettings(tx);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCurrentGasPrices = async () => {
    if (!wallet?.currentNetwork) return;

    setIsLoading(true);
    try {
      const network = wallet.currentNetwork;
      const rpcUrl = getNetworkRPCUrl(network);
      const prices = await getCurrentGasPrices(rpcUrl);
      setCurrentGasPrices(prices);
    } catch (error) {
      console.error('Error loading gas prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGasPriorityChange = (priority: GasSettings['priority']) => {
    setGasSettings(prev => ({ ...prev, priority }));
  };

  const handleCustomGasChange = (field: string, value: string) => {
    setGasSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSessionTimeoutChange = (timeout: number) => {
    setTransactionSettings(prev => ({ ...prev, sessionTimeout: timeout }));
  };

  const handleAutoApproveChange = (autoApprove: boolean) => {
    setTransactionSettings(prev => ({ ...prev, autoApprove }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updatedTransactionSettings = {
        ...transactionSettings,
        gasSettings
      };
      
      await Promise.all([
        saveGasSettings(gasSettings),
        saveTransactionSettings(updatedTransactionSettings)
      ]);
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const formatGwei = (wei: string) => {
    return (parseInt(wei) / 1e9).toFixed(2);
  };

  const formatUSD = (gwei: string) => {
    // Rough estimate: 1 gwei ≈ $0.000000002 (varies by ETH price)
    const gweiValue = parseFloat(gwei);
    const usdValue = gweiValue * 0.000000002;
    return usdValue.toFixed(6);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onGoBack}
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
              <p className="text-slate-400 text-sm">Transaction & Session Management</p>
            </div>
          </div>
          <button
            onClick={loadCurrentGasPrices}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
          </button>
        </div>
      </motion.div>

      <div className="px-6 pb-6 flex-1 space-y-6">
        {/* Current Gas Prices */}
        {currentGasPrices && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-orange-400" />
              Current Network Gas Prices
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400">Max Fee Per Gas</p>
                <p className="text-xl font-bold">{formatGwei(currentGasPrices.maxFeePerGas)} Gwei</p>
                <p className="text-xs text-gray-500">~${formatUSD(currentGasPrices.maxFeePerGas)}</p>
            </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400">Max Priority Fee</p>
                <p className="text-xl font-bold">{formatGwei(currentGasPrices.maxPriorityFeePerGas)} Gwei</p>
                <p className="text-xs text-gray-500">~${formatUSD(currentGasPrices.maxPriorityFeePerGas)}</p>
            </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400">Gas Price</p>
                <p className="text-xl font-bold">{formatGwei(currentGasPrices.gasPrice)} Gwei</p>
                <p className="text-xs text-gray-500">~${formatUSD(currentGasPrices.gasPrice)}</p>
          </div>
        </div>
          </motion.div>
        )}

        {/* Gas Priority Settings */}
              <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Gas Priority</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(GAS_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleGasPriorityChange(key as GasSettings['priority'])}
                className={`p-4 rounded-xl border transition-all ${
                  gasSettings.priority === key
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="text-left">
                  <h4 className="font-semibold capitalize">{key}</h4>
                  <p className="text-sm text-gray-400">{preset.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Max Fee: {formatGwei(preset.maxFeePerGas)} Gwei
                  </p>
                </div>
              </button>
            ))}
        </div>

        {/* Custom Gas Settings */}
          {gasSettings.priority === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Fee Per Gas (Gwei)</label>
                  <input
                    type="number"
                    value={gasSettings.maxFeePerGas ? formatGwei(gasSettings.maxFeePerGas) : ''}
                    onChange={(e) => handleCustomGasChange('maxFeePerGas', (parseFloat(e.target.value) * 1e9).toString())}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="25.0"
                  />
                </div>
              <div>
                  <label className="block text-sm font-medium mb-2">Max Priority Fee (Gwei)</label>
                <input
                  type="number"
                    value={gasSettings.maxPriorityFeePerGas ? formatGwei(gasSettings.maxPriorityFeePerGas) : ''}
                    onChange={(e) => handleCustomGasChange('maxPriorityFeePerGas', (parseFloat(e.target.value) * 1e9).toString())}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="2.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gas Limit</label>
                <input
                  type="number"
                  value={gasSettings.gasLimit || ''}
                  onChange={(e) => handleCustomGasChange('gasLimit', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="21000"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Session Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            Session Management
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
              <select
                value={transactionSettings.sessionTimeout}
                onChange={(e) => handleSessionTimeoutChange(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={0}>Never (manual lock)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Wallet will automatically lock after {transactionSettings.sessionTimeout || 'manual'} of inactivity
              </p>
                </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div>
                <h4 className="font-semibold">Auto-Approve Transactions</h4>
                <p className="text-sm text-gray-400">Automatically approve transactions without confirmation</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={transactionSettings.autoApprove}
                  onChange={(e) => handleAutoApproveChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
      </motion.div>
      </div>
    </div>
  );
};

export default GasSettingsScreen;
