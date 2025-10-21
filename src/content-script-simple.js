// PayCio Content Script - Simple version without modules

// Prevent multiple injections
if (window.paycioContentScriptLoaded) {

} else {
  window.paycioContentScriptLoaded = true;

  // Create provider directly in content script context (CSP-compliant)

  // Prevent multiple injections
  if (window.paycioProviderInjected) {

  } else {
    window.paycioProviderInjected = true;

    // Simple provider object (no classes to avoid module wrapping)
    let paycioProvider = {
      isPaycio: true,
      isMetaMask: false,
      isConnected: function() { return this._connected; },
      chainId: '0x1',
      _networkVersion: '1',
      selectedAddress: null,
      _connected: false,
      _accounts: [],
      _requestId: 0,
      _events: {},
      _maxListeners: 100,
      _pendingRequests: null,

      // Initialize
      _initialize: function() {
        let self = this;
        window.addEventListener('message', function(event) {
          if (event.source !== window || event.data.source !== 'paycio-content') {
            return;
          }
          self._handleMessage(event.data);
        });
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            self._announceProvider();
          });
        } else {
          this._announceProvider();
        }
      },

      _announceProvider: function() {
        let providerInfo = {
          uuid: 'paycio-wallet-' + Math.random().toString(36).substring(2),
          name: 'PayCio Wallet',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzE4MENCMyIvPgo8L3N2Zz4=',
          rdns: 'com.paycio.wallet'
        };
        
        let announceEvent = new CustomEvent('eip6963:announceProvider', {
          detail: Object.freeze({ info: providerInfo, provider: this })
        });
        
        window.dispatchEvent(announceEvent);
        
        let self = this;
        window.addEventListener('eip6963:requestProvider', function() {
          window.dispatchEvent(announceEvent);
        });
        
        window.dispatchEvent(new Event('ethereum#initialized'));

      },

      _handleMessage: function(data) {
        let type = data.type;
        let requestId = data.requestId;
        let success = data.success;
        let result = data.result;
        let error = data.error;
        
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
      },

      _handleResponse: function(requestId, success, result, error) {
        let callback = this._pendingRequests && this._pendingRequests.get(requestId);
        if (callback) {
          this._pendingRequests.delete(requestId);
          if (success) {
            callback.resolve(result);
          } else {
            let err = new Error(error || 'Request failed');
            err.code = 4001;
            callback.reject(err);
          }
        }
      },

      _handleAccountsChanged: function(accounts) {
        this._accounts = accounts || [];
        this.selectedAddress = this._accounts[0] || null;
        this._connected = this._accounts.length > 0;
        this.emit('accountsChanged', this._accounts.slice());
      },

      _handleChainChanged: function(chainId) {
        this.chainId = chainId;
        this._networkVersion = parseInt(chainId, 16).toString();
        this.emit('chainChanged', chainId);
      },

      _handleConnect: function(data) {
        let accounts = data.accounts;
        let chainId = data.chainId;
        this._accounts = accounts || [];
        this.selectedAddress = this._accounts[0] || null;
        this.chainId = chainId || '0x1';
        this._connected = true;
        this.emit('connect', { chainId: this.chainId });
      },

      _handleDisconnect: function() {
        this._accounts = [];
        this.selectedAddress = null;
        this._connected = false;
        this.emit('disconnect', { code: 4900, message: 'User disconnected' });
      },

      // EIP-1193 Standard Methods
      request: function(args) {
        let self = this;
        if (!args || typeof args !== 'object') {
          return Promise.reject(new Error('Invalid request arguments'));
        }
        
        let method = args.method;
        let params = args.params || [];
        
        if (!method || typeof method !== 'string') {
          return Promise.reject(new Error('Method must be a non-empty string'));
        }
        
        if (!this._pendingRequests) {
          this._pendingRequests = new Map();
        }
        
        return new Promise(function(resolve, reject) {
          let requestId = (++self._requestId).toString();
          
          self._pendingRequests.set(requestId, { resolve: resolve, reject: reject });
          
          let timeout = setTimeout(function() {
            self._pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }, 60000);
          
          let originalResolve = resolve;
          let originalReject = reject;
          
          self._pendingRequests.set(requestId, {
            resolve: function(result) {
              clearTimeout(timeout);
              originalResolve(result);
            },
            reject: function(error) {
              clearTimeout(timeout);
              originalReject(error);
            }
          });
          
          window.postMessage({
            source: 'paycio-provider',
            type: 'PAYCIO_REQUEST',
            method: method,
            params: params,
            requestId: requestId,
            origin: window.location.origin
          }, '*');
        });
      },

      // Legacy Methods
      enable: function() {
        return this.request({ method: 'eth_requestAccounts' });
      },

      send: function(method, params) {
        if (typeof method === 'string') {
          return this.request({ method: method, params: params });
        }
        return this.request(method);
      },

      sendAsync: function(payload, callback) {
        let self = this;
        this.request(payload)
          .then(function(result) {
            callback(null, { id: payload.id, result: result });
          })
          .catch(function(error) {
            callback(error, null);
          });
      },

      // Event System
      on: function(event, listener) {
        if (!this._events[event]) {
          this._events[event] = [];
        }
        
        if (this._events[event].length >= this._maxListeners) {
           
          console.warn('MaxListenersExceededWarning for event:', event);
        }
        
        this._events[event].push(listener);
        return this;
      },

      addListener: function(event, listener) {
        return this.on(event, listener);
      },

      once: function(event, listener) {
        let self = this;
        let onceWrapper = function() {
          self.removeListener(event, onceWrapper);
          listener.apply(self, arguments);
        };
        return this.on(event, onceWrapper);
      },

      removeListener: function(event, listener) {
        if (!this._events[event]) return this;
        
        let index = this._events[event].indexOf(listener);
        if (index > -1) {
          this._events[event].splice(index, 1);
        }
        return this;
      },

      removeAllListeners: function(event) {
        if (event) {
          delete this._events[event];
        } else {
          this._events = {};
        }
        return this;
      },

      listeners: function(event) {
        return this._events[event] ? this._events[event].slice() : [];
      },

      listenerCount: function(event) {
        return this._events[event] ? this._events[event].length : 0;
      },

      emit: function(event) {
        if (!this._events[event]) return false;
        
        let listeners = this._events[event].slice();
        let args = Array.prototype.slice.call(arguments, 1);
        for (let i = 0; i < listeners.length; i++) {
          try {
            listeners[i].apply(this, args);
          } catch (error) {
             
            console.error('Error in event listener:', error);
          }
        }
        return listeners.length > 0;
      },

      // Getters
      get networkVersion() {
        return this._networkVersion || '1';
      },

      get accounts() {
        return this._accounts.slice();
      }
    };

    // Initialize the provider
    paycioProvider._initialize();

    // Inject as window.ethereum
    if (!window.ethereum) {
      Object.defineProperty(window, 'ethereum', {
        value: paycioProvider,
        writable: false,
        configurable: false
      });

    } else {
      if (window.ethereum.providers) {
        window.ethereum.providers.push(paycioProvider);
      } else {
        window.ethereum.providers = [window.ethereum, paycioProvider];
      }

    }

    // Also expose as window.paycio
    Object.defineProperty(window, 'paycio', {
      value: paycioProvider,
      writable: false,
      configurable: false
    });

  }

  // Message handler for provider requests
  window.addEventListener('message', function(event) {
    if (event.source !== window || 
        event.data.source !== 'paycio-provider' || 
        event.data.type !== 'PAYCIO_REQUEST') {
      return;
    }
    
    let method = event.data.method;
    let params = event.data.params;
    let requestId = event.data.requestId;
    let origin = event.data.origin;

    chrome.runtime.sendMessage({
      type: 'WALLET_REQUEST',
      method: method,
      params: params,
      origin: origin
    }, function(response) {
      if (chrome.runtime.lastError) {
         
        console.error('Background script error:', chrome.runtime.lastError);
        window.postMessage({
          source: 'paycio-content',
          type: 'PAYCIO_RESPONSE',
          requestId: requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, '*');
        return;
      }
      
      window.postMessage({
        source: 'paycio-content',
        type: 'PAYCIO_RESPONSE',
        requestId: requestId,
        success: response && response.success !== false,
        result: response && response.result,
        error: response && response.error
      }, '*');
    });
  });

  // Listen for background script messages
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

    if (message.type && message.type.startsWith('PAYCIO_')) {
      window.postMessage({
        source: 'paycio-content',
        type: message.type,
        requestId: message.requestId,
        success: message.success,
        result: message.result,
        error: message.error
      }, '*');
    }
    
    return true;
  });

}
