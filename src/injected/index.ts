// PayCio Wallet Injected Script
// This script is injected into web pages to provide wallet functionality

interface WalletProvider {
  isPayCioWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (data: any) => void) => void;
  removeListener: (eventName: string, handler: (data: any) => void) => void;
  selectedAddress?: string | null;
  isConnected?: boolean | (() => boolean);
  chainId?: string | null;
}

interface PayCioWalletProvider extends WalletProvider {
  isPayCioWallet: true;
  version: string;
  networkVersion: string;
  send: (payload: any, callback?: (error: any, response: any) => void) => void;
  sendAsync: (payload: any, callback: (error: any, response: any) => void) => void;
  enable: () => Promise<string[]>;
  autoRefreshOnNetworkChange: boolean;
  // EIP-1193 standard properties
  isConnected: () => boolean;
  selectedAddress: string | null;
  chainId: string | null;
  // Additional standard methods
  requestPermissions?: (permissions: any) => Promise<any>;
  getPermissions?: () => Promise<any>;
  watchAsset?: (asset: any) => Promise<boolean>;
  addEthereumChain?: (chain: any) => Promise<void>;
  switchEthereumChain?: (chain: any) => Promise<void>;
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
      selectedAddress: null,
      isConnected: () => this.isConnected,
      chainId: null,

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
        this.removeEventListener(eventName, handler)
      },

      // EIP-1193 standard methods
      requestPermissions: async (permissions: any) => {
        return this.handleRequest({ method: 'wallet_requestPermissions', params: [permissions] });
      },

      getPermissions: async () => {
        return this.handleRequest({ method: 'wallet_getPermissions', params: [] });
      },

      watchAsset: async (asset: any) => {
        return this.handleRequest({ method: 'wallet_watchAsset', params: [asset] });
      },

      addEthereumChain: async (chain: any) => {
        return this.handleRequest({ method: 'wallet_addEthereumChain', params: [chain] });
      },

      switchEthereumChain: async (chain: any) => {
        return this.handleRequest({ method: 'wallet_switchEthereumChain', params: [chain] });
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
      
      console.log('PayCio Wallet: Sending message to content script:', {
        id: messageId,
        message: message
      });
      
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
          console.log('PayCio Wallet: Request timeout for message:', messageId);
          this.pendingRequests.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      console.log('PayCio Wallet: Received message:', event.data);
      
      if (event.source !== window || event.data.source !== 'paycio-wallet-content') {
        console.log('PayCio Wallet: Ignoring message - wrong source or not from content script');
        return;
      }

      const { id, result, error } = event.data;
      
      console.log('PayCio Wallet: Processing response:', { id, result, error });
      
      if (this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);
        
        if (error) {
          console.log('PayCio Wallet: Rejecting request due to error:', error);
          reject(new Error(error));
        } else {
          console.log('PayCio Wallet: Resolving request with result:', result);
          resolve(result);
        }
      } else {
        console.log('PayCio Wallet: No pending request found for id:', id);
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
    } else {
      // If ethereum already exists, try to add our provider to the list
      if ((window.ethereum as any).providers) {
        (window.ethereum as any).providers.push(this.provider);
      }
    }

    // Inject into window.web3
    if (typeof window.web3 !== 'undefined') {
      window.web3.currentProvider = this.provider;
    }

    // Also inject as window.paycioWallet for direct access
    Object.defineProperty(window, 'paycioWallet', {
      value: this.provider,
      writable: false,
      configurable: false
    });

    // Announce provider for EIP-6963 compatibility
    this.announceProvider();

    // Notify that PayCio Wallet is available
    window.dispatchEvent(new CustomEvent('paycio-wallet-ready', {
      detail: { provider: this.provider }
    }));

    // Also dispatch ethereum events for compatibility
    window.dispatchEvent(new CustomEvent('ethereum#initialized', {
      detail: { provider: this.provider }
    }));

    console.log('PayCio Wallet injected successfully', this.provider);
  }

  private announceProvider() {
    // EIP-6963 provider announcement
    const providerInfo = {
      uuid: 'paycio-wallet-' + Date.now(),
      name: 'PayCio Wallet',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      rdns: 'com.paycio.wallet'
    };

    // Announce provider
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: providerInfo,
        provider: this.provider
      }
    }));

    // Listen for provider requests
    window.addEventListener('eip6963:requestProvider', () => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: providerInfo,
          provider: this.provider
        }
      }));
    });
  }
}

// Initialize the injected wallet
new PayCioWalletInjected();

// Add global test function for debugging
(window as any).testPayCioWallet = async () => {
  console.log('=== Testing PayCio Wallet ===');
  
  if (!window.ethereum) {
    console.log('❌ No ethereum provider found');
    return;
  }
  
  if (!(window.ethereum as any).isPayCioWallet) {
    console.log('❌ PayCio Wallet provider not detected');
    return;
  }
  
  console.log('✅ PayCio Wallet provider detected');
  
  try {
    console.log('Testing eth_accounts...');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    console.log('✅ eth_accounts result:', accounts);
  } catch (error) {
    console.log('❌ eth_accounts failed:', error);
  }
  
  try {
    console.log('Testing eth_requestAccounts...');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('✅ eth_requestAccounts result:', accounts);
  } catch (error) {
    console.log('❌ eth_requestAccounts failed:', error);
  }
  
  console.log('=== End Test ===');
};

console.log('PayCio Wallet injected. Run testPayCioWallet() in console to test.');

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PayCioWalletInjected;
} 