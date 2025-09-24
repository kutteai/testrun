// content-script.js - CSP-compliant version with enhanced debugging
console.log('🚀 Paycio Content Script Loading...');
console.log('📍 Script location:', window.location.href);
console.log('⏰ Load time:', new Date().toISOString());
console.log('🔍 Document ready state:', document.readyState);

// Test Chrome extension API access
console.log('🔧 Chrome API test:');
console.log('- chrome object:', typeof chrome);
console.log('- chrome.runtime:', typeof chrome?.runtime);
if (chrome?.runtime) {
  console.log('- Extension ID:', chrome.runtime.id);
}

// Prevent multiple injections
if (window.paycioProviderReady) {
  console.log('Paycio already injected, skipping');
  return;
}

console.log('🔨 Creating Paycio provider...');

try {
  // Create provider object directly in content script context
  const paycioProvider = {
    isPaycio: true,
    isMetaMask: false,
    isConnected: () => true,
    chainId: '0x1',
    networkVersion: '1',
    selectedAddress: null,
    _events: {},
    
    async request({ method, params = [] }) {
      console.log('Paycio request:', method);
      
      return new Promise((resolve, reject) => {
        const requestId = Date.now().toString() + Math.random().toString(36);
        
        const handleResponse = (event) => {
          if (event.source !== window || 
              event.data.type !== 'PAYCIO_RESPONSE' || 
              event.data.requestId !== requestId) {
            return;
          }
          
          window.removeEventListener('message', handleResponse);
          
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || 'Request failed'));
          }
        };
        
        window.addEventListener('message', handleResponse);
        
        window.postMessage({
          type: 'PAYCIO_REQUEST',
          method,
          params,
          requestId
        }, '*');
        
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    },
    
    // Legacy methods
    enable() { return this.request({ method: 'eth_requestAccounts' }); },
    send(method, params = []) { return this.request({ method, params }); },
    sendAsync(payload, callback) {
      this.request(payload)
        .then(result => callback(null, { result, id: payload.id }))
        .catch(error => callback(error));
    },
    
    // Events
    on(event, handler) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(handler);
    },
    removeListener(event, handler) {
      if (this._events[event]) {
        const idx = this._events[event].indexOf(handler);
        if (idx > -1) this._events[event].splice(idx, 1);
      }
    }
  };

  console.log('✅ Paycio provider object created');

  // Set window.paycio FIRST (most important for your test)
  console.log('🔧 Setting window.paycio...');
  try {
    Object.defineProperty(window, 'paycio', {
      value: paycioProvider,
      writable: false,
      configurable: false
    });
    console.log('✅ window.paycio set successfully');
  } catch (error) {
    console.error('❌ Failed to set window.paycio with defineProperty:', error);
    // Fallback
    try {
      window.paycio = paycioProvider;
      console.log('✅ window.paycio set with fallback method');
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError);
    }
  }

  // Verify window.paycio was set
  if (window.paycio) {
    console.log('✅ window.paycio verification successful');
    console.log('- window.paycio.isPaycio:', window.paycio.isPaycio);
  } else {
    console.error('❌ window.paycio verification failed - still undefined');
  }

  // Set window.ethereum if not exists
  console.log('🔧 Setting window.ethereum...');
  if (!window.ethereum) {
    try {
      Object.defineProperty(window, 'ethereum', {
        value: paycioProvider,
        writable: false,
        configurable: false
      });
      console.log('✅ window.ethereum set as primary');
    } catch (error) {
      console.error('❌ Failed to set window.ethereum:', error);
      window.ethereum = paycioProvider;
    }
  } else {
    console.log('ℹ️ window.ethereum already exists, adding to providers array');
    // Add to providers array
    if (!window.ethereum.providers) {
      window.ethereum.providers = [window.ethereum];
      console.log('✅ Created providers array with existing provider');
    }
    window.ethereum.providers.push(paycioProvider);
    console.log('✅ Added Paycio to providers array');
  }

  // Mark as ready
  window.paycioProviderReady = true;
  console.log('✅ Marked as ready');

  // Announce provider
  console.log('📢 Dispatching ethereum#initialized event...');
  window.dispatchEvent(new Event('ethereum#initialized'));

  // EIP-6963
  console.log('📢 Setting up EIP-6963 announcements...');
  const announceProvider = () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'paycio-wallet-uuid',
          name: 'Paycio Wallet',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwMDAiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=',
          rdns: 'com.paycio.wallet'
        },
        provider: paycioProvider
      }
    }));
    console.log('📢 EIP-6963 provider announced');
  };

  announceProvider();
  window.addEventListener('eip6963:requestProvider', announceProvider);

  // Debug verification
  console.log('🔍 Final verification:');
  console.log('- window.paycio:', !!window.paycio);
  console.log('- window.ethereum:', !!window.ethereum);
  console.log('- window.ethereum.isPaycio:', window.ethereum?.isPaycio);
  console.log('- paycioProviderReady:', window.paycioProviderReady);

  // Force check window.paycio is accessible
  if (!window.paycio) {
    console.error('❌ window.paycio is still not accessible!');
    // Force set it
    try {
      window.paycio = paycioProvider;
      console.log('🔧 Force set window.paycio');
    } catch (forceError) {
      console.error('❌ Force set also failed:', forceError);
    }
  }

  console.log('✅ Paycio Provider Ready');

} catch (error) {
  console.error('❌ Error creating Paycio provider:', error);
  console.error('Error stack:', error.stack);
}

// Message handling
console.log('🔧 Setting up message handling...');
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data.type !== 'PAYCIO_REQUEST') return;
  
  const { method, params, requestId } = event.data;
  console.log('Content script handling:', method);
  
  chrome.runtime.sendMessage({
    type: 'WALLET_REQUEST',
    method,
    params
  }, (response) => {
    if (chrome.runtime.lastError) {
      window.postMessage({
        type: 'PAYCIO_RESPONSE',
        requestId,
        success: false,
        error: chrome.runtime.lastError.message
      }, '*');
      return;
    }
    
    window.postMessage({
      type: 'PAYCIO_RESPONSE',
      requestId,
      success: response?.success !== false,
      result: response?.result || response?.data,
      error: response?.error
    }, '*');
  });
});

console.log('✅ Paycio Content Script Ready');