import { ModalManager } from './modal-manager';
import { ToastManager } from './toast-manager';

class ConnectionManager {
  private connections: Map<string, any>;
  private permissions: Map<string, string[]>;
  private lastActivity: number;
  private modalManager: ModalManager;
  private toast: ToastManager;

  constructor(modalManager: ModalManager, toast: ToastManager) {
    this.connections = new Map();
    this.permissions = new Map();
    this.lastActivity = Date.now();
    this.modalManager = modalManager;
    this.toast = toast;
  }

  async requestConnection(origin: string, methods: string[] = ['eth_accounts']) {
    const existing = this.connections.get(origin);
    if (existing && existing.approved) {
      return existing;
    }

    return new Promise((resolve, reject) => {
      const modal = this.modalManager.createModal({
        content: `
          <div style="padding: 24px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMiIvPgo8L3N2Zz4=" 
                   style="width: 64px; height: 64px; border-radius: 16px;">
            </div>
            <h3 style="text-align: center; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
              Connect to Paycio Wallet
            </h3>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <div style="font-weight: 600; margin-bottom: 8px;">${origin}</div>
              <div style="color: #64748b; font-size: 14px;">wants to connect to your wallet</div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="font-weight: 500; margin-bottom: 8px;">This will allow the app to:</div>
              <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                <li>View your wallet address</li>
                <li>Request approval for transactions</li>
                <li>View your account balance</li>
              </ul>
            </div>
            <div style="display: flex; gap: 12px;">
              <button id="reject-btn" style="
                flex: 1;
                padding: 12px 20px;
                border: 1px solid #e2e8f0;
                background: white;
                color: #475569;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
              ">Reject</button>
              <button id="connect-btn" style="
                flex: 1;
                padding: 12px 20px;
                border: none;
                background: #180CB2;
                color: white;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
              ">Connect</button>
            </div>
          </div>
        `,
      });

      const connectBtn = modal.querySelector('#connect-btn');
      const rejectBtn = modal.querySelector('#reject-btn');

      connectBtn.onclick = async () => {
        try {
          const connection = {
            origin,
            approved: true,
            methods,
            connectedAt: Date.now(),
            permissions: ['eth_accounts'],
          };

          this.connections.set(origin, connection);
          this.permissions.set(origin, methods);

          this.modalManager.closeModal(modal);
          this.toast.show(`Connected to ${origin}`, 'success');
          resolve(connection);
        } catch (error) {
          reject(error);
        }
      };

      rejectBtn.onclick = () => {
        this.modalManager.closeModal(modal);
        this.toast.show('Connection request rejected', 'info');
        reject(new Error('User rejected the request'));
      };
    });
  }

  isConnected(origin: string) {
    const connection = this.connections.get(origin);
    return connection && connection.approved;
  }

  disconnect(origin: string) {
    this.connections.delete(origin);
    this.permissions.delete(origin);
    this.toast.show(`Disconnected from ${origin}`, 'info');
  }

  hasPermission(origin: string, method: string) {
    const permissions = this.permissions.get(origin);
    return permissions && permissions.includes(method);
  }

  getConnections(): Map<string, any> {
    return this.connections;
  }

  destroy() {
    this.connections.clear();
    this.permissions.clear();
  }
}

export { ConnectionManager };
