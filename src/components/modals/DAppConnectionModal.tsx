import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface DAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  dAppInfo: {
    name: string;
    url: string;
    icon?: string;
    description?: string;
  };
  requestedPermissions: {
    accounts: boolean;
    balance: boolean;
    transactions: boolean;
    signing: boolean;
  };
  requestedChains: string[];
}

const DAppConnectionModal: React.FC<DAppConnectionModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  dAppInfo,
  requestedPermissions,
  requestedChains
}) => {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Connect to dApp</h2>
                <p className="text-sm text-gray-500">Review connection request</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* dApp Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {dAppInfo.icon ? (
                <img src={dAppInfo.icon} alt={dAppInfo.name} className="w-12 h-12 rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{dAppInfo.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{dAppInfo.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
                {dAppInfo.description && (
                  <p className="text-sm text-gray-600 mt-1">{dAppInfo.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Requested Permissions */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Requested Permissions</h4>
            <div className="space-y-2">
              {requestedPermissions.accounts && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">View your wallet address</span>
                </div>
              )}
              {requestedPermissions.balance && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">View your account balance</span>
                </div>
              )}
              {requestedPermissions.transactions && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Send transactions on your behalf</span>
                </div>
              )}
              {requestedPermissions.signing && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Sign messages and data</span>
                </div>
              )}
            </div>
          </div>

          {/* Requested Chains */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Supported Networks</h4>
            <div className="grid grid-cols-2 gap-2">
              {requestedChains.map((chain, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-700 capitalize">{chain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Warning */}
          <div className="p-6">
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Security Notice</p>
                <p>Only connect to trusted dApps. This connection will allow the dApp to interact with your wallet. You can revoke access at any time.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 p-6 bg-gray-50">
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium transition-colors"
              disabled={isApproving}
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isApproving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DAppConnectionModal;

