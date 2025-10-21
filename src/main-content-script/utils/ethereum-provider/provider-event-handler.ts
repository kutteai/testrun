import { PaycioEthereumProvider } from '../ethereum-provider';
import { ToastManager } from '../../toast-manager';

export class ProviderEventHandler {
  private provider: PaycioEthereumProvider;
  private toast: ToastManager;

  constructor(provider: PaycioEthereumProvider, toast: ToastManager) {
    this.provider = provider;
    this.toast = toast;
  }

  handleProviderEvent(eventData: any) {
    const { type, data } = eventData;

    switch (type) {
      case 'PAYCIO_ACCOUNTS_CHANGED': {
        const oldAccounts = [...this.provider._accounts];
        this.provider._accounts = data.accounts || [];
        this.provider.selectedAddress = data.accounts?.[0] || null;

        if (JSON.stringify(oldAccounts) !== JSON.stringify(this.provider._accounts)) {
          this.provider.emit('accountsChanged', [...this.provider._accounts]);
        }
        break;
      }

      case 'PAYCIO_CHAIN_CHANGED': {
        const oldChainId = this.provider.chainId;
        this.provider.chainId = data.chainId;
        this.provider.networkVersion = data.networkVersion;

        if (oldChainId !== this.provider.chainId) {
          this.provider.emit('chainChanged', this.provider.chainId);
          this.provider.emit('networkChanged', this.provider.networkVersion);
        }
        break;
      }

      case 'PAYCIO_CONNECT': {
        const wasConnected = this.provider._isConnected;
        this.provider._isConnected = true;
        this.provider._accounts = data.accounts || [];
        this.provider.selectedAddress = data.accounts?.[0] || null;

        if (!wasConnected) {
          this.provider.emit('connect', { chainId: this.provider.chainId });
        }
        break;
      }

      case 'PAYCIO_DISCONNECT':
        if (this.provider._isConnected) {
          this.provider._isConnected = false;
          this.provider._accounts = [];
          this.provider.selectedAddress = null;
          this.provider.emit('disconnect', { code: 4900, message: 'User disconnected' });
        }
        break;

      case 'PAYCIO_MESSAGE':
        this.provider.emit('message', data);
        break;

      case 'PAYCIO_NOTIFICATION':
        if (data.type && data.message) {
          this.toast.show(data.message, data.type);
        }
        break;
    }
  }
}
