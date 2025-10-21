import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, ExternalLink, Copy, Check, X } from 'lucide-react';

interface ApprovalRequest {
  type: string;
  origin: string;
  message: string;
  permissions?: string[];
  txParams?: any;
  data?: any;
  estimatedGas?: string;
  estimatedFee?: string;
}

interface ApprovalPopupProps {
  origin: string;
  message: string;
  permissions?: string[];
  txParams?: any;
  data?: any;
  estimatedGas?: string;
  estimatedFee?: string;
  networkName?: string;
}

const ApprovalPopup: React.FC<ApprovalPopupProps> = ({ onApprove, onReject, networkName }) => {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Parse request from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const requestParam = urlParams.get('request');
    
    if (requestParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(requestParam));
        setRequest(parsed);
        setIsVisible(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse request:', error);
      }
    }

    // Listen for messages from background script
    const messageListener = (event: MessageEvent) => {
      if (event.data.type === 'APPROVAL_REQUEST') {
        setRequest(event.data.request);
        setIsVisible(true);
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  const handleApprove = async () => {
    if (!request) return;
    
    setLoading(true);
    
    try {
      // Send approval response to background script
      chrome.runtime.sendMessage({
        type: 'APPROVAL_RESPONSE',
        approved: true,
        windowId: (await chrome.windows.getCurrent()).id
      });
      
      onApprove();
      window.close();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send approval:', error);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    
    try {
      // Send rejection response to background script
      chrome.runtime.sendMessage({
        type: 'APPROVAL_RESPONSE',
        approved: false,
        windowId: (await chrome.windows.getCurrent()).id
      });
      
      onReject();
      window.close();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send rejection:', error);
      window.close();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (wei: string) => {
    try {
      const eth = parseFloat(wei) / 1e18;
      return eth.toFixed(6);
    } catch {
      return '0.000000';
    }
  };

  const getDomainFromOrigin = (origin: string) => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  };

  if (!request || !isVisible) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  const renderRequestDetails = (networkName?: string) => {
    switch (request.type) {
      case 'connect':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connect Wallet
              </h2>
              <p className="text-gray-600">
                {getDomainFromOrigin(request.origin)} wants to connect to your wallet
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">This will allow the site to:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• View your account address</li>
                <li>• View your account balance</li>
                <li>• Request approval for transactions</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Your wallet will remain secure. Paycio will never share your private keys or seed phrase.
              </p>
            </div>
          </div>
        );

      case 'sign_typed_data':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign Typed Data
              </h2>
              <p className="text-gray-600">
                {getDomainFromOrigin(request.origin)} wants you to sign structured data
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Data to sign:</h3>
              <div className="bg-white rounded border p-3 text-sm max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(request.data?.typedData, null, 2)}
                </pre>
              </div>
              {request.data?.address && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Signing with:</span>
                    <span className="text-sm font-mono">
                      {formatAddress(request.data.address)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">
                This is structured data signing (EIP-712). Make sure you understand 
                what you're signing and trust this application.
              </p>
            </div>
          </div>
        );

      case 'switch_chain':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <ExternalLink className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Switch Network
              </h2>
              <p className="text-gray-600">
                {getDomainFromOrigin(request.origin)} wants to switch to a different network
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Network:</span>
                <span className="text-sm font-medium">
                  Chain ID: {request.data?.chainId}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Switching networks will change your active blockchain. 
                Make sure this network is correct for your intended transaction.
              </p>
            </div>
          </div>
        );

      case 'add_chain':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <ExternalLink className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Add Network
              </h2>
              <p className="text-gray-600">
                {getDomainFromOrigin(request.origin)} wants to add a new network
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="text-sm font-medium">{request.data?.chainName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chain ID:</span>
                <span className="text-sm font-medium">{request.data?.chainId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">RPC URL:</span>
                <span className="text-sm font-medium truncate max-w-48">
                  {request.data?.rpcUrls?.[0]}
                </span>
              </div>
              {request.data?.blockExplorerUrls?.[0] && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Explorer:</span>
                  <span className="text-sm font-medium truncate max-w-48">
                    {request.data.blockExplorerUrls[0]}
                  </span>
                </div>
              )}
              {request.data?.nativeCurrency && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Currency:</span>
                  <span className="text-sm font-medium">
                    {request.data.nativeCurrency.symbol}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">
                Only add networks you trust. Malicious networks can steal your funds 
                or compromise your transactions.
              </p>
            </div>
          </div>
        );

      case 'connect_bitcoin':
      case 'connect_solana':
      case 'connect_tron':
      case 'connect_ton': {
        const networkName = request.type.replace('connect_', '').toUpperCase();
        }
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connect {networkName} Wallet
              </h2>
              <p className="text-gray-600">
                {getDomainFromOrigin(request.origin)} wants to connect to your {networkName} wallet
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">This will allow the site to:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• View your {networkName} address</li>
                <li>• Request {networkName} transaction signatures</li>
                <li>• Request message signatures</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-700">
                {networkName} integration is experimental. Only connect to trusted applications.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Permission Request
              </h2>
              <p className="text-gray-600">{request.message}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Request Details:</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Paycio Wallet</h1>
              <p className="text-xs text-gray-500">{getDomainFromOrigin(request.origin)}</p>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderRequestDetails(networkName)}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              'Approve'
            )}
          </button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-yellow-50 border-t border-yellow-200 p-3 flex-shrink-0">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-700">
            <p className="font-medium mb-1">Security Notice</p>
            <p>
              Only approve requests from websites you trust. Paycio will never ask for your 
              seed phrase or private keys. Always verify the website URL before approving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPopup;