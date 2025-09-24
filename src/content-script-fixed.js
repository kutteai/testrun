// content-script.js - Fixed wallet detection
console.log('🚀 Paycio Content Script Loading...');

// Prevent multiple injections
if (window.paycioInjected) {
  console.log('Paycio already injected, skipping');
  return;
}

// Inject the provider script IMMEDIATELY
(function injectProvider() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      'use strict';
      
      console.log('🔗 Paycio Provider Injecting...');
      
      if (window.ethereum && window.ethereum.isPaycio) {
        console.log('Paycio already exists');
        return;
      }

      // Create the provider
      const paycioProvider = {
        // Essential identification properties
        isPaycio: true,
        isMetaMask: false, // Important: don't impersonate MetaMask
        isConnected: () => true,
        
        // Network properties
        chainId: '0x1',
        networkVersion: '1',
        selectedAddress: null,
        
        // EIP-1193 request method
        async request({ method, params = [] }) {
          console.log('Paycio request:', method, params);
          
          return new Promise((resolve, reject) => {
            const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Listen for response
            const responseHandler = (event) => {
              if (event.source !== window || 
                  event.data.type !== 'PAYCIO_RESPONSE' || 
                  event.data.requestId !== requestId) {
                return;
              }
              
              window.removeEventListener('message', responseHandler);
              
              if (event.data.success) {
                resolve(event.data.result);
              } else {
                reject(new Error(event.data.error || 'Request failed'));
              }
            };
            
            window.addEventListener('message', responseHandler);
            
            // Send request to content script
            window.postMessage({
              type: 'PAYCIO_REQUEST',
              method,
              params,
              requestId,
              origin: window.location.origin
            }, '*');
            
            // Timeout
            setTimeout(() => {
              window.removeEventListener('message', responseHandler);
              reject(new Error('Request timeout'));
            }, 30000);
          });
        },
        
        // Legacy methods
        async enable() {
          return this.request({ method: 'eth_requestAccounts' });
        },
        
        async send(method, params = []) {
          if (typeof method === 'string') {
            return this.request({ method, params });
          }
          return this.request(method);
        },
        
        sendAsync(payload, callback) {
          this.request(payload)
            .then(result => callback(null, { result, id: payload.id, jsonrpc: '2.0' }))
            .catch(error => callback(error, null));
        },
        
        // Event methods
        on(event, handler) {
          if (!this._events) this._events = {};
          if (!this._events[event]) this._events[event] = [];
          this._events[event].push(handler);
        },
        
        removeListener(event, handler) {
          if (!this._events || !this._events[event]) return;
          const index = this._events[event].indexOf(handler);
          if (index > -1) this._events[event].splice(index, 1);
        },
        
        emit(event, data) {
          if (!this._events || !this._events[event]) return;
          this._events[event].forEach(handler => handler(data));
        }
      };
      
      // Inject provider
      if (!window.ethereum) {
        // Primary injection
        Object.defineProperty(window, 'ethereum', {
          value: paycioProvider,
          writable: false,
          configurable: false
        });
        console.log('✅ Paycio set as primary ethereum provider');
      } else {
        // Secondary injection - add to providers array
        if (!window.ethereum.providers) {
          window.ethereum.providers = [window.ethereum];
        }
        window.ethereum.providers.push(paycioProvider);
        console.log('✅ Paycio added to providers array');
      }
      
      // Always expose as window.paycio
      window.paycio = paycioProvider;
      
      // Immediate announcement
      window.dispatchEvent(new Event('ethereum#initialized'));
      
      // EIP-6963 announcement
      const announceProvider = () => {
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
          detail: Object.freeze({
            info: {
              uuid: 'paycio-wallet-' + Date.now(),
              name: 'Paycio Wallet',
              icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwMDciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCAxMEwxMy4wOSAxMC45MUwxMiAxNyIvPjwvc3ZnPg==',
              rdns: 'com.paycio.wallet'
            },
            provider: paycioProvider
          })
        }));
      };
      
      announceProvider();
      window.addEventListener('eip6963:requestProvider', announceProvider);
      
      // Mark as injected
      window.paycioInjected = true;
      
      console.log('✅ Paycio Provider Ready');
      console.log('Detection check:', {
        ethereum: !!window.ethereum,
        isPaycio: window.ethereum?.isPaycio,
        paycio: !!window.paycio
      });
    })();
  `;
  
  // Inject immediately
  (document.head || document.documentElement).insertBefore(script, (document.head || document.documentElement).children[0]);
  script.remove();
  console.log('✅ Provider script injected');
})();

// Handle communication with injected provider
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data.type !== 'PAYCIO_REQUEST') {
    return;
  }
  
  console.log('📨 Content script received:', event.data.method);
  
  const { method, params, requestId } = event.data;
  
  // Forward to background script
  chrome.runtime.sendMessage({
    type: 'WALLET_REQUEST',
    method,
    params
  }, (response) => {
    // Send response back to provider
    window.postMessage({
      type: 'PAYCIO_RESPONSE',
      requestId,
      success: response?.success || false,
      result: response?.result || response?.data,
      error: response?.error
    }, '*');
  });
});

// Listen for background script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background message:', message.type);
  
  // Forward events to provider
  if (message.type === 'ACCOUNTS_CHANGED') {
    window.postMessage({
      type: 'PAYCIO_ACCOUNTS_CHANGED',
      accounts: message.accounts
    }, '*');
  } else if (message.type === 'CHAIN_CHANGED') {
    window.postMessage({
      type: 'PAYCIO_CHAIN_CHANGED',
      chainId: message.chainId
    }, '*');
  }
  
  sendResponse({ received: true });
});

console.log('✅ Paycio Content Script Ready');
