import { ToastManager } from './toast-manager';

class WalletConnectManager {
  private sessions: Map<string, any>;
  private connectedDapps: Set<string>;
  private toast: ToastManager;

  constructor(toast: ToastManager) {
    this.sessions = new Map();
    this.connectedDapps = new Set();
    this.toast = toast;
  }

  async handleWalletConnectUri(uri: string) {
    try {
      this.toast.show('Processing WalletConnect request...', 'info');

      // Assuming window.paycioProvider is available globally or passed in
      const response = await (window as any).paycioProvider.sendToContentScript('WALLETCONNECT_HANDLE_URI', { uri });

      if (response && response.success) {
        this.sessions.set(response.data.sessionId, response.data.session);
        this.toast.show('WalletConnect session established', 'success');
        return response.data;
      }

      throw new Error(response?.error || 'WalletConnect connection failed');
    } catch (error: any) {
      this.toast.show(`WalletConnect error: ${error.message}`, 'error');
      throw error;
    }
  }

  async approveSession(sessionId: string, accounts: string[], chainId: string) {
    const response = await (window as any).paycioProvider.sendToContentScript('WALLETCONNECT_APPROVE_SESSION', {
      sessionId,
      accounts,
      chainId,
    });

    if (response && response.success) {
      this.toast.show('WalletConnect session approved', 'success');
      this.connectedDapps.add(sessionId);
    }

    return response;
  }

  async rejectSession(sessionId: string) {
    const response = await (window as any).paycioProvider.sendToContentScript('WALLETCONNECT_REJECT_SESSION', { sessionId });

    if (response && response.success) {
      this.sessions.delete(sessionId);
      this.toast.show('WalletConnect session rejected', 'info');
    }

    return response;
  }

  async disconnectSession(sessionId: string) {
    const response = await (window as any).paycioProvider.sendToContentScript('WALLETCONNECT_DISCONNECT', { sessionId });

    if (response && response.success) {
      this.sessions.delete(sessionId);
      this.connectedDapps.delete(sessionId);
      this.toast.show('WalletConnect session disconnected', 'info');
    }

    return response;
  }
}

export { WalletConnectManager };
