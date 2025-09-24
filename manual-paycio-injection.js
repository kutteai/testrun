// Manual Paycio injection script
// This can be run in the browser console to test if the extension works

console.log('🔧 Manual Paycio Injection Starting...');

// Create the provider
const paycioProvider = {
  isPaycio: true,
  isMetaMask: false,
  isConnected: () => true,
  chainId: '0x1',
  networkVersion: '1',
  selectedAddress: null,
  _events: {},
  
  async request({ method, params = [] }) {
    console.log('Paycio request:', method, params);
    
    // For testing, return mock responses
    switch (method) {
      case 'eth_chainId':
        return '0x1';
      case 'eth_requestAccounts':
        return ['0x1234567890123456789012345678901234567890'];
      case 'eth_accounts':
        return ['0x1234567890123456789012345678901234567890'];
      default:
        return '0x1';
    }
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

// Set window.paycio
try {
  Object.defineProperty(window, 'paycio', {
    value: paycioProvider,
    writable: false,
    configurable: false
  });
  console.log('✅ window.paycio set successfully');
} catch (error) {
  console.error('❌ Failed to set window.paycio:', error);
  window.paycio = paycioProvider;
}

// Set window.ethereum if not exists
if (!window.ethereum) {
  try {
    Object.defineProperty(window, 'ethereum', {
      value: paycioProvider,
      writable: false,
      configurable: false
    });
    console.log('✅ window.ethereum set as primary');
  } catch (error) {
    window.ethereum = paycioProvider;
  }
} else {
  console.log('ℹ️ window.ethereum already exists, adding to providers array');
  if (!window.ethereum.providers) {
    window.ethereum.providers = [window.ethereum];
  }
  window.ethereum.providers.push(paycioProvider);
  console.log('✅ Added Paycio to providers array');
}

// EIP-6963 announcement
const announceProvider = () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'paycio-wallet-manual',
        name: 'Paycio Wallet (Manual)',
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

// Dispatch ethereum initialized event
window.dispatchEvent(new Event('ethereum#initialized'));

// Verification
console.log('🔍 Verification:');
console.log('- window.paycio:', !!window.paycio);
console.log('- window.paycio.isPaycio:', window.paycio?.isPaycio);
console.log('- window.ethereum:', !!window.ethereum);
console.log('- window.ethereum.isPaycio:', window.ethereum?.isPaycio);
console.log('- providers array:', window.ethereum?.providers?.length || 'none');

console.log('✅ Manual Paycio injection completed!');
