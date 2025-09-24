// PayCio Content Script - Direct execution (no IIFE)
console.log('🚀 PayCio Content Script Loading...');

// Prevent multiple injections
if (window.paycioContentScriptLoaded) {
  console.log('PayCio content script already loaded');
} else {
  window.paycioContentScriptLoaded = true;

  // Create provider directly in content script context (CSP-compliant)
  console.log('🚀 PayCio Provider Injecting...');

  // Prevent multiple injections
  if (window.paycioProviderInjected) {
    console.log('PayCio provider already injected');
  } else {
    window.paycioProviderInjected = true;

    // EIP-1193 Compliant Ethereum Provider
    class PaycioEthereumProvider {
      constructor() {
        this.isPaycio = true;
        this.isMetaMask = false; // Important: Don't impersonate MetaMask
        this.isConnected = () => this._connected;
        this.chainId = '0x1';
        this._networkVersion = '1';
        this.selectedAddress = null;
        this._connected = false;
        this._accounts = [];
        this._requestId = 0;
        
        // Event system
        this._events = {};
        this._maxListeners = 100;
        
        // Initialize
        this._initialize();
      }
      
      _initialize() {
        // Set up message listener for responses from content script
        window.addEventListener('message', (event) => {
          if (event.source !== window || event.data.source !== 'paycio-content') {
            return;
          }
          
          this._handleMessage(event.data);
        });
        
        // Announce provider after DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this._announceProvider());
        } else {
          this._announceProvider();
        }
      }
      
      _announceProvider() {
        // EIP-6963: Multi Injected Provider Discovery
        const providerInfo = {
          uuid: 'paycio-wallet-' + Math.random().toString(36).substring(2),
          name: 'PayCio Wallet',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMyIvPgo8L3N2Zz4=',
          rdns: 'com.paycio.wallet'
        };
        
        const announceEvent = new CustomEvent('eip6963:announceProvider', {
          detail: Object.freeze({ info: providerInfo, provider: this })
        });
        
        window.dispatchEvent(announceEvent);
        
        // Listen for provider requests
        window.addEventListener('eip6963:requestProvider', () => {
          window.dispatchEvent(announceEvent);
        });
        
        // Legacy events
        window.dispatchEvent(new Event('ethereum#initialized'));
        
        console.log('✅ PayCio Provider announced');
      }
      
      _handleMessage(data) {
        const { type, requestId, success, result, error } = data;
        
        switch (type) {
          case 'PAYCIO_RESPONSE':
            this._handleResponse(requestId, success, result, error);
            break;
          case 'PAYCIO_ACCOUNTS_CHANGED':
            this._handleAccountsChanged(result);
            break;
          case 'PAYCIO_CHAIN_CHANGED':
            this._handleChainChanged(result);
            break;
          case 'PAYCIO_CONNECT':
            this._handleConnect(result);
            break;
          case 'PAYCIO_DISCONNECT':
            this._handleDisconnect();
            break;
        }
      }
      
      _handleResponse(requestId, success, result, error) {
        const callback = this._pendingRequests && this._pendingRequests.get(requestId);
        if (callback) {
          this._pendingRequests.delete(requestId);
          if (success) {
            callback.resolve(result);
          } else {
            const err = new Error(error || 'Request failed');
            err.code = 4001; // User rejected
            callback.reject(err);
          }
        }
      }
      
      _handleAccountsChanged(accounts) {
        this._accounts = accounts || [];
        this.selectedAddress = this._accounts[0] || null;
        this._connected = this._accounts.length > 0;
        this.emit('accountsChanged', [...this._accounts]);
      }
      
      _handleChainChanged(chainId) {
        this.chainId = chainId;
        this._networkVersion = parseInt(chainId, 16).toString();
        this.emit('chainChanged', chainId);
      }
      
      _handleConnect({ accounts, chainId }) {
        this._accounts = accounts || [];
        this.selectedAddress = this._accounts[0] || null;
        this.chainId = chainId || '0x1';
        this._connected = true;
        this.emit('connect', { chainId: this.chainId });
      }
      
      _handleDisconnect() {
        this._accounts = [];
        this.selectedAddress = null;
        this._connected = false;
        this.emit('disconnect', { code: 4900, message: 'User disconnected' });
      }
      
      // EIP-1193 Standard Methods
      async request(args) {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid request arguments');
        }
        
        const { method, params = [] } = args;
        
        if (!method || typeof method !== 'string') {
          throw new Error('Method must be a non-empty string');
        }
        
        // Initialize pending requests map if not exists
        if (!this._pendingRequests) {
          this._pendingRequests = new Map();
        }
        
        return new Promise((resolve, reject) => {
          const requestId = (++this._requestId).toString();
          
          // Store the request callbacks
          this._pendingRequests.set(requestId, { resolve, reject });
          
          // Set timeout
          const timeout = setTimeout(() => {
            this._pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }, 60000); // 60 second timeout
          
          // Clear timeout when request completes
          const originalResolve = resolve;
          const originalReject = reject;
          
          this._pendingRequests.set(requestId, {
            resolve: (result) => {
              clearTimeout(timeout);
              originalResolve(result);
            },
            reject: (error) => {
              clearTimeout(timeout);
              originalReject(error);
            }
          });
          
          // Send message to content script
          window.postMessage({
            source: 'paycio-provider',
            type: 'PAYCIO_REQUEST',
            method,
            params,
            requestId,
            origin: window.location.origin
          }, '*');
        });
      }
      
      // Legacy Methods (for backward compatibility)
      async enable() {
        return this.request({ method: 'eth_requestAccounts' });
      }
      
      async send(method, params) {
        if (typeof method === 'string') {
          return this.request({ method, params });
        }
        // Handle object format
        return this.request(method);
      }
      
      sendAsync(payload, callback) {
        this.request(payload)
          .then(result => callback(null, { id: payload.id, result }))
          .catch(error => callback(error, null));
      }
      
      // Event System
      on(event, listener) {
        if (!this._events[event]) {
          this._events[event] = [];
        }
        
        if (this._events[event].length >= this._maxListeners) {
          console.warn('MaxListenersExceededWarning for event:', event);
        }
        
        this._events[event].push(listener);
        return this;
      }
      
      addListener(event, listener) {
        return this.on(event, listener);
      }
      
      once(event, listener) {
        const onceWrapper = (...args) => {
          this.removeListener(event, onceWrapper);
          listener(...args);
        };
        return this.on(event, onceWrapper);
      }
      
      removeListener(event, listener) {
        if (!this._events[event]) return this;
        
        const index = this._events[event].indexOf(listener);
        if (index > -1) {
          this._events[event].splice(index, 1);
        }
        return this;
      }
      
      removeAllListeners(event) {
        if (event) {
          delete this._events[event];
        } else {
          this._events = {};
        }
        return this;
      }
      
      listeners(event) {
        return this._events[event] ? [...this._events[event]] : [];
      }
      
      listenerCount(event) {
        return this._events[event] ? this._events[event].length : 0;
      }
      
      emit(event, ...args) {
        if (!this._events[event]) return false;
        
        const listeners = [...this._events[event]];
        for (const listener of listeners) {
          try {
            listener.apply(this, args);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        }
        return listeners.length > 0;
      }
      
      // Additional properties that DApps check for
      get networkVersion() {
        return this._networkVersion || '1';
      }
      
      get accounts() {
        return [...this._accounts];
      }
    }

    // Create the provider instance
    const provider = new PaycioEthereumProvider();

    // Inject as window.ethereum
    if (!window.ethereum) {
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: false
      });
      console.log('✅ PayCio Provider set as window.ethereum');
    } else {
      // If ethereum exists, add to providers array
      if (window.ethereum.providers) {
        window.ethereum.providers.push(provider);
      } else {
        window.ethereum.providers = [window.ethereum, provider];
      }
      console.log('✅ PayCio Provider added to providers array');
    }

    // Also expose as window.paycio
    Object.defineProperty(window, 'paycio', {
      value: provider,
      writable: false,
      configurable: false
    });

    console.log('✅ PayCio Provider ready!');
  }

  // Message handler for provider requests
  window.addEventListener('message', (event) => {
    if (event.source !== window || 
        event.data.source !== 'paycio-provider' || 
        event.data.type !== 'PAYCIO_REQUEST') {
      return;
    }
    
    const { method, params, requestId, origin } = event.data;
    
    console.log('PayCio Content Script: Handling request:', method);
    
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'WALLET_REQUEST',
      method,
      params,
      origin
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Background script error:', chrome.runtime.lastError);
        window.postMessage({
          source: 'paycio-content',
          type: 'PAYCIO_RESPONSE',
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, '*');
        return;
      }
      
      window.postMessage({
        source: 'paycio-content',
        type: 'PAYCIO_RESPONSE',
        requestId,
        success: response?.success !== false,
        result: response?.result,
        error: response?.error
      }, '*');
    });
  });

  // Listen for background script messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('PayCio Content Script: Background message:', message.type);
    
    // Forward events to provider
    if (message.type.startsWith('PAYCIO_')) {
      window.postMessage({
        source: 'paycio-content',
        ...message
      }, '*');
    }
    
    return true;
  });

  console.log('✅ PayCio Content Script Ready!');
}