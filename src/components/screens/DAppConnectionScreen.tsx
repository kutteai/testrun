import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ExternalLink, AlertTriangle, CheckCircle, X, Lock } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import WalletUnlockModal from '../modals/WalletUnlockModal';
import DAppConnectionModal from '../modals/DAppConnectionModal';
import { WalletConnectManager } from '../../utils/walletconnect-utils';

interface DAppConnectionScreenProps {
  onBack: () => void;
}

const DAppConnectionScreen: React.FC<DAppConnectionScreenProps> = ({ onBack }) => {
  const { isWalletUnlocked, unlockWallet } = useWallet();
  const [walletConnectManager] = useState(() => new WalletConnectManager());
  
  // Modal states
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  // Connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [connectedDApps, setConnectedDApps] = useState<any[]>([]);
  
  // Current connection request
  const [currentConnectionRequest, setCurrentConnectionRequest] = useState<any>(null);

  useEffect(() => {
    // Set up WalletConnect event listeners
    walletConnectManager.on('wallet_locked', handleWalletLocked);
    walletConnectManager.on('connection_request', handleConnectionRequest);
    walletConnectManager.on('session_approved', handleSessionApproved);
    walletConnectManager.on('session_rejected', handleSessionRejected);
    walletConnectManager.on('session_disconnected', handleSessionDisconnected);

    return () => {
      // Cleanup event listeners
      walletConnectManager.off('wallet_locked', handleWalletLocked);
      walletConnectManager.off('connection_request', handleConnectionRequest);
      walletConnectManager.off('session_approved', handleSessionApproved);
      walletConnectManager.off('session_rejected', handleSessionRejected);
      walletConnectManager.off('session_disconnected', handleSessionDisconnected);
    };
  }, []);

  const handleWalletLocked = (data: any) => {
    setCurrentConnectionRequest(data);
    setShowUnlockModal(true);
  };

  const handleConnectionRequest = (data: any) => {
    setCurrentConnectionRequest(data);
    setShowConnectionModal(true);
  };

  const handleSessionApproved = (session: any) => {
    setConnectedDApps(prev => [...prev, session]);
    setShowConnectionModal(false);
    setCurrentConnectionRequest(null);
  };

  const handleSessionRejected = (error: any) => {
    setConnectionError(error.message || 'Connection rejected');
    setShowConnectionModal(false);
    setCurrentConnectionRequest(null);
  };

  const handleSessionDisconnected = (session: any) => {
    setConnectedDApps(prev => prev.filter(dapp => dapp.topic !== session.topic));
  };

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      const success = await unlockWallet(password);
      if (success) {
        setShowUnlockModal(false);
        // Emit unlock success to WalletConnect
        walletConnectManager.emit('wallet_unlocked', true);
      }
      return success;
    } catch (error) {
      console.error('Unlock failed:', error);
      return false;
    }
  };

  const handleConnectionApproval = async () => {
    try {
      setIsConnecting(true);
      setConnectionError('');
      
      // Emit connection approval to WalletConnect
      walletConnectManager.emit('connection_confirmed', true);
      
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectionRejection = () => {
    // Emit connection rejection to WalletConnect
    walletConnectManager.emit('connection_confirmed', false);
    setShowConnectionModal(false);
    setCurrentConnectionRequest(null);
  };

  const handleDisconnectDApp = async (dApp: any) => {
    try {
      await walletConnectManager.disconnect(dApp.topic);
      setConnectedDApps(prev => prev.filter(app => app.topic !== dApp.topic));
    } catch (error) {
      console.error('Failed to disconnect dApp:', error);
    }
  };

  const handleStartConnection = async () => {
    try {
      setIsConnecting(true);
      setConnectionError('');
      
      const { uri } = await walletConnectManager.connect();
      
      // In a real implementation, you would show the QR code or URI
      console.log('WalletConnect URI:', uri);
      
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">dApp Connections</h1>
                  <p className="text-sm text-gray-500">Manage your dApp connections</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleStartConnection}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Connect to dApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Connection Error */}
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Connection Error</p>
              <p className="text-sm text-red-600">{connectionError}</p>
            </div>
            <button
              onClick={() => setConnectionError('')}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </motion.div>
        )}

        {/* Wallet Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isWalletUnlocked ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  Wallet {isWalletUnlocked ? 'Unlocked' : 'Locked'}
                </p>
                <p className="text-sm text-gray-500">
                  {isWalletUnlocked 
                    ? 'Ready to connect to dApps' 
                    : 'Wallet must be unlocked to connect to dApps'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connected dApps */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected dApps</h2>
          
          {connectedDApps.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No dApps connected</p>
            <p className="text-sm text-gray-400">Connect to a dApp to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {connectedDApps.map((dApp, index) => (
                <motion.div
                  key={dApp.topic || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{dApp.clientMeta?.name || 'Unknown dApp'}</p>
                        <p className="text-sm text-gray-500">{dApp.clientMeta?.url || 'No URL'}</p>
                        <p className="text-xs text-gray-400">Connected • {dApp.accounts?.length || 0} accounts</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDisconnectDApp(dApp)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Security Notice</p>
              <p>Only connect to trusted dApps. Review permissions carefully before approving connections. You can disconnect from dApps at any time.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <WalletUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onUnlock={handleUnlock}
        dAppName={currentConnectionRequest?.dAppName}
        dAppUrl={currentConnectionRequest?.dAppUrl}
        dAppIcon={currentConnectionRequest?.dAppIcon}
      />

      <DAppConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onApprove={handleConnectionApproval}
        onReject={handleConnectionRejection}
        dAppInfo={currentConnectionRequest?.dAppInfo || {}}
        requestedPermissions={currentConnectionRequest?.requestedPermissions || {}}
        requestedChains={currentConnectionRequest?.requestedChains || []}
      />
    </div>
  );
};

export default DAppConnectionScreen;

