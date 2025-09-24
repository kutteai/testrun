// Paycio Ethereum Provider - EIP-1193 Compliant
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.paycioProviderInjected) {
    return;
  }
  window.paycioProviderInjected = true;
  
  console.log('Paycio Ethereum Provider injected');
  
  // EIP-1193 Provider Implementation
  class PaycioEthereumProvider {
    constructor() {
      this.isPaycio = true;
      this.isConnected = false;
      this.chainId = '0x1';
      this.networkVersion = '1';
      this.selectedAddress = null;
      this.accounts = [];
      this.listeners = new Map();
      this.requestId = 0;
      this.pendingRequests = new Map();
      
      this.setupMessageListener();
      this.announceProvider();
    }
    
    setupMessageListener() {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        const { type, requestId, success, data, error } = event.data;
        
        if (type === 'PAYCIO_EXTENSION_RESPONSE') {
          const callback = this.pendingRequests.get(requestId);
          if (callback) {
            this.pendingRequests.delete(requestId);
            if (success) {
              callback(null, data);
            } else {
              callback(new Error(error || 'Request failed'), null);
            }
          }
        } else if (type === 'PAYCIO_ACCOUNTS_CHANGED') {
          this.accounts = data.accounts || [];
          this.selectedAddress = this.accounts[0] || null;
          this.isConnected = this.accounts.length > 0;
          this.emit('accountsChanged', this.accounts);
        } else if (type === 'PAYCIO_CHAIN_CHANGED') {
          this.chainId = data.chainId;
          this.networkVersion = data.networkVersion;
          this.emit('chainChanged', this.chainId);
        } else if (type === 'PAYCIO_CONNECT') {
          this.accounts = data.accounts || [];
          this.selectedAddress = this.accounts[0] || null;
          this.chainId = data.chainId;
          this.isConnected = true;
          this.emit('connect', { chainId: this.chainId });
        } else if (type === 'PAYCIO_DISCONNECT') {
          this.accounts = [];
          this.selectedAddress = null;
          this.isConnected = false;
          this.emit('disconnect');
        }
      });
    }
    
    announceProvider() {
      // EIP-6963: Multi Injected Provider Discovery
      const info = {
        uuid: 'paycio-wallet-uuid',
        name: 'Paycio Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMyIvPgo8cGF0aCBkPSJNOCAxMkgxNlYyMEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE2IDEySDI0VjIwSDE2VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
        rdns: 'com.paycio.wallet'
      };
      
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({ info, provider: this })
      }));
      
      // Legacy support
      if (!window.ethereum) {
        window.ethereum = this;
      }
      
      // Notify that provider is ready
      window.dispatchEvent(new Event('ethereum#initialized'));
    }
    
    // EIP-1193 Methods
    async request({ method, params = [] }) {
      try {
        // Use DApp connection manager for enhanced handling
        if (window.DAppConnectionManager) {
          return await window.DAppConnectionManager.handleDAppRequest(method, params);
        }
        
        // Fallback to original method
        return new Promise((resolve, reject) => {
          const requestId = ++this.requestId;
          this.pendingRequests.set(requestId, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
          
          window.postMessage({
            type: 'PAYCIO_EXTENSION_REQUEST',
            method,
            params,
            requestId
          }, '*');
        });
      } catch (error) {
        // Return proper error format for EIP-1193
        throw {
          code: error.code || -32603,
          message: error.message || 'Internal error'
        };
      }
    }
    
    // Legacy methods for compatibility
    async enable() {
      return this.request({ method: 'eth_requestAccounts' });
    }
    
    async send(method, params) {
      if (typeof method === 'string' && params) {
        return this.request({ method, params });
      } else if (typeof method === 'object') {
        return this.request(method);
      }
      throw new Error('Invalid method or params');
    }
    
    async sendAsync(payload, callback) {
      try {
        const result = await this.request(payload);
        callback(null, { id: payload.id, jsonrpc: '2.0', result });
      } catch (error) {
        callback(error, { id: payload.id, jsonrpc: '2.0', error: { message: error.message, code: -32000 } });
      }
    }
    
    // Event handling
    on(event, listener) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(listener);
    }
    
    removeListener(event, listener) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(listener);
      }
    }
    
    emit(event, ...args) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      }
    }
    
    // Web3 compatibility
    get isMetaMask() {
      return false;
    }
    
    get _metamask() {
      return {
        isUnlocked: () => Promise.resolve(true),
        requestBatch: (requests) => Promise.all(requests.map(req => this.request(req)))
      };
    }
  }
  
  // Create and inject the provider
  const provider = new PaycioEthereumProvider();
  
  // Make it globally available
  window.paycio = provider;
  
  // Override window.ethereum if not already set
  if (!window.ethereum) {
    window.ethereum = provider;
  }
  
  console.log('Paycio provider ready');
})();
