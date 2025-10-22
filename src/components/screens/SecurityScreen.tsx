import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Shield, Clock, Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import { useSecurity } from '../../store/SecurityContext';
import toast from 'react-hot-toast';
import type { ScreenProps } from '../../types/index';
import { storage } from '../../utils/storage-utils';
import { SecurityManager } from '../../core/security-manager';

interface SecurityScreenProps {
  onGoBack: () => void;
}

const SecurityScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { securityState, updateSecuritySettings, lockWallet } = useSecurity();
  const [securityManager] = useState(() => new SecurityManager()); // Instantiate SecurityManager
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(securityState.autoLockTimeout);
  const [requirePassword, setRequirePassword] = useState(securityState.requirePassword);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  useEffect(() => {
    setAutoLockTimeout(securityState.autoLockTimeout);
    setRequirePassword(securityState.requirePassword);
  }, [securityState]);

  const validatePassword = (password: string): boolean => {
    const validation = securityManager.validatePassword(password);
    if (!validation.isValid) {
      setPasswordChangeError(validation.feedback.join(' ')); // Use feedback property
    }
    return validation.isValid;
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    setPasswordChangeError('');
    if (newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New password and confirm password do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Validate current password
      const isValidCurrentPassword = await securityManager.authenticate(currentPassword); // Use instance method
      if (!isValidCurrentPassword) {
        setPasswordChangeError('Invalid current password');
        toast.error('Invalid current password');
        return;
      }

      // Change password using SecurityManager
      await securityManager.changePassword(currentPassword, newPassword); // Use instance method

      toast.success('Password changed successfully!');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to change password:', error);
      setPasswordChangeError(error instanceof Error ? error.message : 'Failed to change password');
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateSecuritySettings({
        autoLockTimeout,
        requirePassword
      });
      toast.success('Security settings updated');
    } catch {
      toast.error('Failed to update settings');
    }
  };

  const handleLockWallet = () => {
    lockWallet();
    toast.success('Wallet locked');
    onNavigate('dashboard');
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Security Settings</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Auto-Lock Settings */}
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Auto-Lock</h2>
              <p className="text-sm text-gray-600">Automatically lock wallet after inactivity</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-lock timeout
              </label>
              <select
                value={autoLockTimeout}
                onChange={(e) => setAutoLockTimeout(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>Never</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Wallet will automatically lock after {formatTime(autoLockTimeout)} of inactivity
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="requirePassword"
                checked={requirePassword}
                onChange={(e) => setRequirePassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="requirePassword" className="text-sm text-gray-700">
                Require password for transactions
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateSettings}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </motion.button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600">Update your wallet password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {passwordChangeError && (
              <p className="text-sm text-red-600 mt-2">{passwordChangeError}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                isChangingPassword
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isChangingPassword ? 'Changing...' : 'Change Password'}</span>
            </motion.button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600">Immediate security actions</p>
            </div>
          </div>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLockWallet}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Wallet Now</span>
            </motion.button>
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Security Tips</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Use a strong, unique password</li>
                <li>• Never share your seed phrase or private keys</li>
                <li>• Enable auto-lock for additional security</li>
                <li>• Keep your wallet software updated</li>
                <li>• Be cautious of phishing attempts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityScreen; 