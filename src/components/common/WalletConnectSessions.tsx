import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { walletConnectManager, WalletConnectSession } from '../../utils/walletconnect-utils';
import { toast } from 'react-toastify';

export const WalletConnectSessions: React.FC = () => {
  const [sessions, setSessions] = useState<WalletConnectSession[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const session = walletConnectManager.getSession();
    if (session) {
      setSessions([session]);
    } else {
      setSessions([]);
    }
  };

  const disconnectSession = async (_topic: string) => {
    try {
      // Disconnect the session
      await window.ethereum?.request({
        method: 'wallet_disconnectSession',
        params: []
      });
      toast.success('Session disconnected');
    } catch (error) {
      console.error('Failed to disconnect session:', error);
      toast.error('Failed to disconnect session');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getChainIcon = (chainId: number) => {
    const icons: Record<number, string> = {
      1: '🔵', // Ethereum
      56: '🟡', // BSC
      137: '🟣', // Polygon
      43114: '🔴', // Avalanche
      42161: '🔵', // Arbitrum
      10: '🔴'  // Optimism
    };
    return icons[chainId] || '⚪';
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <ExternalLink size={48} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Active Connections
        </h3>
        <p className="text-gray-500">
          Connect to dApps using WalletConnect to see active sessions here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Active Connections ({sessions.length})
        </h3>
      </div>

      {sessions.map((session) => (
        <div
          key={session.topic}
          className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
        >
          {/* Session Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {session.clientMeta.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {session.clientMeta.name}
                </h4>
                <p className="text-sm text-gray-500">
                  {session.clientMeta.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => disconnectSession(session.topic)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Disconnect"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Connection Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 font-medium">Connected</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Network:</span>
              <span className="flex items-center space-x-1">
                <span>{getChainIcon(session.chainId)}</span>
                <span className="font-medium">
                  {walletConnectManager.getChainName(session.chainId)}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Accounts:</span>
              <span className="font-medium">{session.accounts.length}</span>
            </div>
          </div>

          {/* Account Addresses */}
          {session.accounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Connected Addresses:</p>
              {session.accounts.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-mono text-gray-600 truncate">
                    {account}
                  </span>
                  <button
                    onClick={() => copyToClipboard(account, `account-${index}`)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy address"
                  >
                    {copied === `account-${index}` ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Session Info */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Session ID:</span>
              <div className="flex items-center space-x-1">
                <span className="font-mono truncate max-w-24">
                  {session.topic.substring(0, 8)}...
                </span>
                <button
                  onClick={() => copyToClipboard(session.topic, 'session-id')}
                  className="p-1 hover:text-gray-700 transition-colors"
                  title="Copy session ID"
                >
                  {copied === 'session-id' ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 