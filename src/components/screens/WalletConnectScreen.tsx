import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ExternalLink, Settings } from 'lucide-react';
import WalletConnectModal from '../common/WalletConnectModal';
import { WalletConnectSessions } from '../common/WalletConnectSessions';
import { WalletConnectApprovalModal } from '../common/WalletConnectApprovalModal';
import { walletConnectManager, WalletConnectSession, WalletConnectProposal, WalletConnectRequest } from '../../utils/walletconnect-utils';

export const WalletConnectScreen: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<WalletConnectSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    type: 'session' | 'request';
    proposal?: WalletConnectProposal;
    request?: WalletConnectRequest;
  }>({
    isOpen: false,
    type: 'session'
  });

  useEffect(() => {
    loadSessions();
    
    // Set up WalletConnect event listeners
    const handleSessionProposal = (proposal: WalletConnectProposal) => {
      setApprovalModal({
        isOpen: true,
        type: 'session',
        proposal
      });
    };
    
    const handleSessionRequest = (requestEvent: any) => {
      setApprovalModal({
        isOpen: true,
        type: 'request',
        request: requestEvent.request
      });
    };
    
    walletConnectManager.on('session_proposal', handleSessionProposal);
    walletConnectManager.on('session_request', handleSessionRequest);
    
    return () => {
      walletConnectManager.off('session_proposal', handleSessionProposal);
      walletConnectManager.off('session_request', handleSessionRequest);
    };
  }, []);

  const loadSessions = () => {
    const session = walletConnectManager.getSession();
    if (session) {
      setSessions([session]);
    } else {
      setSessions([]);
    }
    setIsLoading(false);
  };

  const handleConnected = (session: WalletConnectSession) => {
    setSessions([session]);
    setIsModalOpen(false);
  };

  const handleDisconnect = async () => {
    try {
      await walletConnectManager.disconnect();
      loadSessions();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect:', error);
    }
  };

  // Approval handlers
  const handleApproveSession = async () => {
    try {
      if (approvalModal.proposal) {
        await walletConnectManager.approveSession(approvalModal.proposal);
        setApprovalModal({ isOpen: false, type: 'session' });
        loadSessions();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve session:', error);
    }
  };

  const handleRejectSession = async () => {
    try {
      if (approvalModal.proposal) {
        await walletConnectManager.rejectSession(approvalModal.proposal);
        setApprovalModal({ isOpen: false, type: 'session' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject session:', error);
    }
  };

  const handleApproveRequest = async () => {
    try {
      if (approvalModal.request) {
        await walletConnectManager.approveRequest(approvalModal.request);
        setApprovalModal({ isOpen: false, type: 'request' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve request:', error);
    }
  };

  const handleRejectRequest = async () => {
    try {
      if (approvalModal.request) {
        await walletConnectManager.rejectRequest(approvalModal.request);
        setApprovalModal({ isOpen: false, type: 'request' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject request:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WalletConnect</h1>
            <p className="text-gray-500">Connect to dApps and manage sessions</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>New Connection</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Supported Chains</p>
              <p className="text-2xl font-bold text-gray-900">
                {walletConnectManager.getSupportedChains().length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Connection Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {walletConnectManager.isConnected() ? 'Connected' : 'Disconnected'}
              </p>
            </div>
                    <div className="w-8 h-8 bg-[#180CB2]/20 rounded-lg flex items-center justify-center">
          <Settings className="w-4 h-4 text-[#180CB2]" />
        </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <WalletConnectSessions />
      </div>

      {/* Quick Actions */}
      {sessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={handleDisconnect}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              <span>Disconnect All</span>
            </button>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About WalletConnect</h3>
        <p className="text-sm text-blue-800">
          WalletConnect is an open protocol that enables mobile wallets to connect to dApps. 
          It provides a secure way to interact with blockchain applications without exposing your private keys.
        </p>
      </div>

      {/* Modal */}
      <WalletConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onWalletSelect={(walletId, accountId) => {
          // Handle wallet selection
          const session: WalletConnectSession = {
            topic: Date.now().toString(),
            chainId: 1,
            accounts: [accountId],
            connected: true,
            namespaces: {},
            clientMeta: {
              name: 'PayCio Wallet',
              description: 'Multi-chain wallet',
              url: 'https://paycio.com',
              icons: []
            }
          };
          handleConnected(session);
        }}
      />

      {/* Approval Modal */}
      <WalletConnectApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, type: 'session' })}
        proposal={approvalModal.proposal}
        request={approvalModal.request}
        onApprove={approvalModal.type === 'session' ? handleApproveSession : handleApproveRequest}
        onReject={approvalModal.type === 'session' ? handleRejectSession : handleRejectRequest}
        type={approvalModal.type}
      />
    </div>
  );
}; 