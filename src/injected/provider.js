// Paycio Ethereum Provider - EIP-1193 Compliant
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.paycioProviderInjected) {
    return;
  }
  window.paycioProviderInjected = true;

  // EIP-1193 Provider Implementation
  class PaycioEthereumProvider {
    constructor() {
      this.isPaycio = true;
      this.isPayCio = true; // Add both spellings for compatibility
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
      
      // Announce provider immediately
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({ info, provider: this })
      }));
      
      // Also listen for provider requests and re-announce
      window.addEventListener('eip6963:requestProvider', () => {
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
          detail: Object.freeze({ info, provider: this })
        }));
      });
      
      // Legacy support - set as primary ethereum provider if none exists
      if (!window.ethereum) {
        window.ethereum = this;
      } else if (window.ethereum.providers) {
        // If multiple providers exist, add to the list
        window.ethereum.providers.push(this);
      } else {
        // Convert single provider to array and add this one
        window.ethereum.providers = [window.ethereum, this];
      }
      
      // Notify that provider is ready
      window.dispatchEvent(new Event('ethereum#initialized'));
      
      // Additional discovery events
      window.dispatchEvent(new CustomEvent('paycio-wallet-ready', {
        detail: { provider: this, info }
      }));
    }
    
    // Direct request method to avoid recursion
    async requestDirect({ method, params = [] }) {
      try {

        // Handle connection requests specially
        if (method === 'eth_requestAccounts') {

          // Check if wallet is unlocked
          const isUnlocked = await this.checkWalletUnlockStatus();
          if (!isUnlocked) {

            const unlockSuccess = await this.showUnlockModal();
            if (!unlockSuccess) {
              throw new Error('User cancelled wallet unlock');
            }
          }
          
          // Get accounts from PayCio wallet
          const accounts = await this.getPayCioAccounts();
          if (accounts && accounts.length > 0) {
            this.accounts = accounts;
            this.selectedAddress = accounts[0];
            this.isConnected = true;

            return accounts;
          } else {
            throw new Error('No accounts available in PayCio wallet');
          }
        }
        
        // Handle network switching requests
        if (method === 'wallet_switchEthereumChain') {

          return await this.handleNetworkSwitch(params);
        }
        
        // Handle network addition requests
        if (method === 'wallet_addEthereumChain') {

          return await this.handleNetworkAddition(params);
        }
        
        // Use DApp connection manager for enhanced handling
        if (window.DAppConnectionManager) {
          return await window.DAppConnectionManager.handleDAppRequest(method, params);
        }
        
        // Fallback to original method - use direct postMessage to avoid recursion
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
         
        console.error('PayCio: Direct request failed:', error);
        // Return proper error format for EIP-1193
        throw {
          code: error.code || -32603,
          message: error.message || 'Internal error'
        };
      }
    }
    
    // EIP-1193 Methods
    async request({ method, params = [] }) {
      try {

        // Handle connection requests specially
        if (method === 'eth_requestAccounts') {

          // Check if wallet is unlocked
          const isUnlocked = await this.checkWalletUnlockStatus();
          if (!isUnlocked) {

            const unlockSuccess = await this.showUnlockModal();
            if (!unlockSuccess) {
              throw new Error('User cancelled wallet unlock');
            }
          }
          
          // Get accounts from PayCio wallet
          const accounts = await this.getPayCioAccounts();
          if (accounts && accounts.length > 0) {
            this.accounts = accounts;
            this.selectedAddress = accounts[0];
            this.isConnected = true;

            return accounts;
          } else {
            throw new Error('No accounts available in PayCio wallet');
          }
        }
        
        // Handle network switching requests
        if (method === 'wallet_switchEthereumChain') {

          return await this.handleNetworkSwitch(params);
        }
        
        // Handle network addition requests
        if (method === 'wallet_addEthereumChain') {

          return await this.handleNetworkAddition(params);
        }
        
        // Use DApp connection manager for enhanced handling
        if (window.DAppConnectionManager) {
          return await window.DAppConnectionManager.handleDAppRequest(method, params);
        }
        
        // Fallback to original method - use direct postMessage to avoid recursion
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
         
        console.error('PayCio: Request failed:', error);
        // Return proper error format for EIP-1193
        throw {
          code: error.code || -32603,
          message: error.message || 'Internal error'
        };
      }
    }
    
    // Show unlock modal
    async showUnlockModal() {
      return new Promise(async (resolve) => {
        // Create a secure unlock request
        const unlockRequest = {
          type: 'WALLET_UNLOCK_REQUEST',
          origin: window.location.origin,
          timestamp: Date.now(),
          nonce: crypto.randomUUID()
        };
        
        // Define extensionId (replace with actual extension ID in production)
        const extensionId = chrome.runtime.id; 
        const popupUrl = `chrome-extension://${extensionId}/popup.html?unlock=true`;
        
        // Open extension popup for secure password entry
        const popupWindow = window.open(popupUrl, 'PaycioUnlock', 'width=400,height=600');
        
        // Listen for unlock completion
        const checkUnlock = setInterval(async () => {
          if (!popupWindow || popupWindow.closed) {
            clearInterval(checkUnlock);
            resolve(false); // User closed the popup
            return;
          }
          const isUnlocked = await this.checkWalletUnlockStatus();
          if (isUnlocked) {
            clearInterval(checkUnlock);
            resolve(true);
          }
        }, 1000);
        
        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(checkUnlock);
          resolve(false);
        }, 60000);
      });
    }
    
    // Check wallet unlock status
    async checkWalletUnlockStatus() {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_CHECK_WALLET_STATUS',
            id: messageId
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_WALLET_STATUS_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 5000);
        });

        const isUnlocked = response?.success && response?.data?.isUnlocked;

        return isUnlocked;
      } catch (error) {
        console.error('PayCio: Error checking wallet status:', error);
        return false;
      }
    }
    
    // Get PayCio accounts
    async getPayCioAccounts() {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_GET_WALLET_ADDRESS',
            id: messageId
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_WALLET_ADDRESS_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 5000);
        });
        
        if (response?.success && response?.address) {
          return [response.address];
        }
        return [];
      } catch (error) {
         
        console.error('PayCio: Error getting accounts:', error);
        return [];
      }
    }
    
    // Handle network switching
    async handleNetworkSwitch(params) {
      try {
        const chainId = params[0]?.chainId;

        // Check if it's TON network
        if (chainId === '0x28' || chainId === '40') { // TON mainnet

          return await this.switchToTONNetwork();
        }
        
        // Check if it's Ethereum network
        if (chainId === '0x1' || chainId === '1') { // Ethereum mainnet

          return await this.switchToEthereumNetwork();
        }
        
        // For other networks, try to switch via extension
        return await this.switchNetworkViaExtension(chainId);
        
      } catch (error) {
         
        console.error('PayCio: Network switch failed:', error);
        throw {
          code: 4902, // User rejected the request
          message: 'User rejected the request'
        };
      }
    }
    
    // Handle network addition
    async handleNetworkAddition(params) {
      try {
        const networkInfo = params[0];

        // Send network addition request to extension
        return await this.addNetworkViaExtension(networkInfo);
        
      } catch (error) {
         
        console.error('PayCio: Network addition failed:', error);
        throw {
          code: 4902, // User rejected the request
          message: 'User rejected the request'
        };
      }
    }
    
    // Switch to TON network
    async switchToTONNetwork() {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_SWITCH_TO_TON',
            id: messageId
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_TON_SWITCH_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 10000);
        });
        
        if (response?.success) {
          // Update provider state
          this.chainId = '0x28';
          this.networkVersion = '40';

          return null; // wallet_switchEthereumChain returns null on success
        } else {
          throw new Error(response?.error || 'Failed to switch to TON network');
        }
      } catch (error) {
         
        console.error('PayCio: TON network switch failed:', error);
        throw error;
      }
    }
    
    // Switch to Ethereum network
    async switchToEthereumNetwork() {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_SWITCH_TO_ETHEREUM',
            id: messageId
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_ETHEREUM_SWITCH_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 10000);
        });
        
        if (response?.success) {
          // Update provider state
          this.chainId = '0x1';
          this.networkVersion = '1';

          return null; // wallet_switchEthereumChain returns null on success
        } else {
          throw new Error(response?.error || 'Failed to switch to Ethereum network');
        }
      } catch (error) {
         
        console.error('PayCio: Ethereum network switch failed:', error);
        throw error;
      }
    }
    
    // Switch network via extension
    async switchNetworkViaExtension(chainId) {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_SWITCH_NETWORK',
            id: messageId,
            chainId: chainId
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_NETWORK_SWITCH_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 10000);
        });
        
        if (response?.success) {
          // Update provider state
          this.chainId = chainId;
          this.networkVersion = parseInt(chainId, 16).toString();

          return null; // wallet_switchEthereumChain returns null on success
        } else {
          throw new Error(response?.error || 'Failed to switch network');
        }
      } catch (error) {
         
        console.error('PayCio: Network switch failed:', error);
        throw error;
      }
    }
    
    // Add network via extension
    async addNetworkViaExtension(networkInfo) {
      try {
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          window.postMessage({
            type: 'PAYCIO_ADD_NETWORK',
            id: messageId,
            networkInfo: networkInfo
          }, '*');
          
          const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_NETWORK_ADD_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Timeout' });
          }, 10000);
        });
        
        if (response?.success) {

          return null; // wallet_addEthereumChain returns null on success
        } else {
          throw new Error(response?.error || 'Failed to add network');
        }
      } catch (error) {
         
        console.error('PayCio: Network addition failed:', error);
        throw error;
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
    
    // Add isConnected method
    isConnected() {
      return this.accounts.length > 0;
    }
  }
  
  // Create and inject the provider
  const provider = new PaycioEthereumProvider();
  
  // Make it globally available
  window.paycio = provider;
  
  // Make PayCio the primary ethereum provider - ALWAYS override
  const existingProvider = window.ethereum;
    window.ethereum = provider;
  
  // Add the existing provider to our providers array
  if (!provider.providers) {
    provider.providers = [];
  }
  if (existingProvider) {
    provider.providers.push(existingProvider);
  }
  
  // Also add to the global providers array
  if (window.ethereum.providers) {
    if (existingProvider) {
      window.ethereum.providers.push(existingProvider);
    }
  } else {
    window.ethereum.providers = existingProvider ? [existingProvider] : [];
  }
  
  // Force PayCio properties
  window.ethereum.isPayCio = true;
  window.ethereum.isPaycio = true;
  // Note: isMetaMask is a getter-only property, so we can't set it directly
  
  // Store original request method before overriding
  const originalRequest = window.ethereum.request;
  
  // Override the request method to ensure PayCio handles all requests
  window.ethereum.request = async (args) => {

    // For connection requests, always use PayCio
    if (args.method === 'eth_requestAccounts' || args.method === 'wallet_requestPermissions') {

      return await provider.requestDirect(args);
    }
    
    // For other requests, try PayCio first, fallback to original
    try {
      return await provider.requestDirect(args);
    } catch (error) {

      if (originalRequest && existingProvider) {
        return await originalRequest.call(existingProvider, args);
      }
      throw error;
    }
  };
  
  // Track if we've already announced to prevent duplicates
  let hasAnnounced = false;
  
  // Force EIP-6963 announcement immediately
  const announceEIP6963 = () => {
    if (hasAnnounced) {

      return;
    }
    
    hasAnnounced = true;
    
    const info = {
      uuid: 'paycio-wallet-uuid',
      name: 'Paycio Wallet',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMyIvPgo8cGF0aCBkPSJNOCAxMkgxNlYyMEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE2IDEySDI0VjIwSDE2VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      rdns: 'com.paycio.wallet'
    };


    const event = new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider })
    });
    
    window.dispatchEvent(event);

  };
  
  // Announce immediately
  announceEIP6963();
  
  // Also listen for provider requests - but only announce once
  window.addEventListener('eip6963:requestProvider', () => {
    if (!hasAnnounced) {
      announceEIP6963();
    }
  });

})();
