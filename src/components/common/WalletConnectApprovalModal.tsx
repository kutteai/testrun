import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Globe, Check, X as XIcon } from 'lucide-react';
import { WalletConnectProposal, WalletConnectRequest } from '../../utils/walletconnect-utils';

interface WalletConnectApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal?: WalletConnectProposal;
  request?: WalletConnectRequest;
  onApprove: () => void;
  onReject: () => void;
  type: 'session' | 'request';
}

export const WalletConnectApprovalModal: React.FC<WalletConnectApprovalModalProps> = ({
  isOpen,
  onClose,
  proposal,
  request,
  onApprove,
  onReject,
  type
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject();
    } finally {
      setIsProcessing(false);
    }
  };

  const getDAppInfo = () => {
    if (type === 'session' && proposal) {
      return {
        name: proposal.params.proposer.metadata.name,
        description: proposal.params.proposer.metadata.description,
        url: proposal.params.proposer.metadata.url,
        icons: proposal.params.proposer.metadata.icons
      };
    }
    return null;
  };

  const getRequestInfo = () => {
    if (type === 'request' && request) {
      return {
        method: request.method,
        params: request.params
      };
    }
    return null;
  };

  const dAppInfo = getDAppInfo();
  const requestInfo = getRequestInfo();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {type === 'session' ? 'Connection Request' : 'Transaction Request'}
                  </h2>
                  <p className="text-sm text-gray-500">Review and approve</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {type === 'session' && dAppInfo && (
                <div className="space-y-4">
                  {/* dApp Info */}
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    {dAppInfo.icons && dAppInfo.icons[0] && (
                      <img
                        src={dAppInfo.icons[0]}
                        alt={dAppInfo.name}
                        className="w-12 h-12 rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{dAppInfo.name}</h3>
                      <p className="text-sm text-gray-600">{dAppInfo.description}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{dAppInfo.url}</span>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Requested Permissions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">View wallet address</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">Request transactions</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">Request signatures</span>
                      </div>
                    </div>
                  </div>

                  {/* Networks */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Supported Networks</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism'].map((network) => (
                        <span
                          key={network}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {network}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {type === 'request' && requestInfo && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        <strong>Method:</strong> {requestInfo.method}
                      </div>
                      {requestInfo.params && (
                        <div className="text-sm text-gray-600 mt-2">
                          <strong>Parameters:</strong>
                          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(requestInfo.params, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {type === 'session' 
                        ? 'This will allow the dApp to view your wallet address and request transactions. You can disconnect anytime.'
                        : 'Review the transaction details carefully before approving.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
