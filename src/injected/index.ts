// PayCio Wallet Injected Script
// This script is injected into web pages to provide wallet functionality

interface WalletProvider {
  isPayCioWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (data: any) => void) => void;
  removeListener: (eventName: string, handler: (data: any) => void) => void;
  selectedAddress?: string;
  isConnected?: boolean;
  chainId?: string;
}

interface PayCioWalletProvider extends WalletProvider {
  isPayCioWallet: true;
  version: string;
  networkVersion: string;
  send: (payload: any, callback?: (error: any, response: any) => void) => void;
  sendAsync: (payload: any, callback: (error: any, response: any) => void) => void;
  enable: () => Promise<string[]>;
  autoRefreshOnNetworkChange: boolean;
}

class PayCioWalletInjected {
  private provider: PayCioWalletProvider;
  private isConnected = false;
  private selectedAddress: string | null = null;
  private chainId: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();

  constructor() {
    this.provider = this.createProvider();
    this.injectProvider();
    this.setupMessageListener();
  }

  private createProvider(): PayCioWalletProvider {
    const provider: PayCioWalletProvider = {
      isPayCioWallet: true,
      version: '1.0.0',
      networkVersion: '1',
      autoRefreshOnNetworkChange: false,
      selectedAddress: undefined,
      isConnected: false,
      chainId: undefined,

      request: async (args: { method: string; params?: any[] }) => {
        return this.handleRequest(args);
      },

      send: (payload: any, callback?: (error: any, response: any) => void) => {
        this.handleSend(payload, callback);
      },

      sendAsync: (payload: any, callback: (error: any, response: any) => void) => {
        this.handleSend(payload, callback);
      },

      enable: async () => {
        const result = await this.handleRequest({ method: 'eth_requestAccounts' });
        return result;
      },

      on: (eventName: string, handler: (data: any) => void) => {
        this.addEventListener(eventName, handler);
      },

      removeListener: (eventName: string, handler: (data: any) => void) => {
        this.removeEventListener(eventName, handler);
      }
    };

    return provider;
  }

  private async handleRequest(args: { method: string; params?: any[] }): Promise<any> {
    try {
      const response = await this.sendMessageToExtension({
        type: 'WALLET_REQUEST',
        method: args.method,
        params: args.params || []
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.result;
    } catch (error) {
      console.error('PayCio Wallet request failed:', error);
      throw error;
    }
  }

  private handleSend(payload: any, callback?: (error: any, response: any) => void) {
    this.handleRequest(payload)
      .then((result) => {
        if (callback) {
          callback(null, { id: payload.id, jsonrpc: '2.0', result });
        }
      })
      .catch((error) => {
        if (callback) {
          callback(error, { id: payload.id, jsonrpc: '2.0', error: { message: error.message } });
        }
      });
  }

  private sendMessageToExtension(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now() + Math.random();
      
      // Store the callback
      this.pendingRequests.set(messageId, { resolve, reject });
      
      // Send message to content script
      window.postMessage({
        source: 'paycio-wallet-injected',
        id: messageId,
        ...message
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data.source !== 'paycio-wallet-content') {
        return;
      }

      const { id, result, error } = event.data;
      
      if (this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);
        
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
      }

      // Handle wallet state updates
      if (event.data.type === 'WALLET_STATE_UPDATE') {
        this.updateWalletState(event.data.state);
      }
    });
  }

  private updateWalletState(state: any) {
    if (state.selectedAddress !== this.selectedAddress) {
      this.selectedAddress = state.selectedAddress;
      this.provider.selectedAddress = state.selectedAddress;
      this.emit('accountsChanged', [state.selectedAddress]);
    }

    if (state.chainId !== this.chainId) {
      this.chainId = state.chainId;
      this.provider.chainId = state.chainId;
      this.emit('chainChanged', state.chainId);
    }

    if (state.isConnected !== this.isConnected) {
      this.isConnected = state.isConnected;
      this.provider.isConnected = state.isConnected;
      this.emit('connect', { chainId: state.chainId });
    }
  }

  private addEventListener(eventName: string, handler: (data: any) => void) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
  }

  private removeEventListener(eventName: string, handler: (data: any) => void) {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(eventName: string, data: any) {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private injectProvider() {
    // Inject into window.ethereum
    if (!window.ethereum) {
      Object.defineProperty(window, 'ethereum', {
        value: this.provider,
        writable: false,
        configurable: false
      });
    }

    // Inject into window.web3
    if (typeof window.web3 !== 'undefined') {
      window.web3.currentProvider = this.provider;
    }

    // Notify that PayCio Wallet is available
    window.dispatchEvent(new CustomEvent('paycio-wallet-ready', {
      detail: { provider: this.provider }
    }));

    console.log('PayCio Wallet injected successfully');
  }
}

// Initialize the injected wallet
new PayCioWalletInjected();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayCioWalletInjected;
} 