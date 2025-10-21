import { EventEmitter } from '../event-emitter';
import { ToastManager } from '../toast-manager';
import { ConnectionManager } from '../connection-manager';
import { PaycioEthereumProvider } from '../ethereum-provider'; // Import the provider itself for type hinting
import { getNetworkName } from '../../../../components/screens/send/utils/send-utils';

export class ProviderInitializer {
  private provider: PaycioEthereumProvider;
  private toast: ToastManager;
  private connectionManager: ConnectionManager;

  constructor(provider: PaycioEthereumProvider, toast: ToastManager, connectionManager: ConnectionManager) {
    this.provider = provider;
    this.toast = toast;
    this.connectionManager = connectionManager;
  }

  async initialize() {
    if (this.provider._initialized) return;

    try {
      const response = await this.provider.sendToContentScript('GET_PROVIDER_STATE');
      if (response && response.success) {
        this.provider.updateProviderState(response.data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize provider state:', error);
    }

    this.setupEventListeners();
    this.setupAdvancedFeatures();
    this.provider._initialized = true;

    this.provider.emit('_initialized');
    this.toast.show('Paycio Wallet provider ready', 'success', 2000);
  }

  setupEventListeners() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data.type?.startsWith('PAYCIO_')) {
        return;
      }
      this.provider.handleProviderEvent(event.data);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.provider.emit('page_visible');
      }
    });
  }

  setupAdvancedFeatures() {
    this.provider.on('chainChanged', (chainId) => {
      this.provider.networkVersion = parseInt(chainId, 16).toString();
      this.toast.show(`Network changed to ${getNetworkName(chainId)}`, 'info');
    });

    this.provider.on('connect', () => {
      this.toast.show('Wallet connected', 'success');
    });

    this.provider.on('disconnect', () => {
      this.toast.show('Wallet disconnected', 'warning');
    });

    this.provider.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.toast.show('All accounts disconnected', 'warning');
      } else if (accounts[0] !== this.provider.selectedAddress) {
        this.toast.show(`Switched to account ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, 'info');
      }
    });
  }
}
