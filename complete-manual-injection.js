// Complete manual Paycio injection script
// This properly handles the providers array and all detection methods

console.log('🔧 Complete Manual Paycio Injection Starting...');

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
      case 'eth_getBalance':
        return '0x1bc16d674ec80000'; // 2 ETH in wei
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

console.log('✅ Paycio provider created');

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

// Handle window.ethereum and providers array
console.log('🔧 Handling window.ethereum...');
if (!window.ethereum) {
  // No existing ethereum provider
  try {
    Object.defineProperty(window, 'ethereum', {
      value: paycioProvider,
      writable: false,
      configurable: false
    });
    console.log('✅ window.ethereum set as primary (no existing provider)');
  } catch (error) {
    window.ethereum = paycioProvider;
  }
} else {
  // Existing ethereum provider (like MetaMask)
  console.log('ℹ️ Existing ethereum provider found');
  console.log('- Existing provider isMetaMask:', window.ethereum.isMetaMask);
  console.log('- Existing provider isPaycio:', window.ethereum.isPaycio);
  
  if (!window.ethereum.providers) {
    // Create providers array with existing provider
    window.ethereum.providers = [window.ethereum];
    console.log('✅ Created providers array with existing provider');
  }
  
  // Add Paycio to providers array
  window.ethereum.providers.push(paycioProvider);
  console.log('✅ Added Paycio to providers array');
  console.log('- Providers array length:', window.ethereum.providers.length);
  
  // Verify Paycio is in providers array
  const paycioInProviders = window.ethereum.providers.find(p => p.isPaycio);
  if (paycioInProviders) {
    console.log('✅ Paycio found in providers array');
  } else {
    console.log('❌ Paycio NOT found in providers array');
  }
}

// EIP-6963 announcement
console.log('📢 Setting up EIP-6963...');
const announceProvider = () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'paycio-wallet-manual-' + Date.now(),
        name: 'Paycio Wallet (Manual)',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwMDAiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=',
        rdns: 'com.paycio.wallet'
      },
      provider: paycioProvider
    }
  }));
  console.log('📢 EIP-6963 provider announced');
};

// Announce immediately
announceProvider();

// Listen for EIP-6963 requests
window.addEventListener('eip6963:requestProvider', announceProvider);

// Dispatch ethereum initialized event
console.log('📢 Dispatching ethereum#initialized event...');
window.dispatchEvent(new Event('ethereum#initialized'));

// Final verification
console.log('🔍 Final Verification:');
console.log('- window.paycio:', !!window.paycio);
console.log('- window.paycio.isPaycio:', window.paycio?.isPaycio);
console.log('- window.ethereum:', !!window.ethereum);
console.log('- window.ethereum.isPaycio:', window.ethereum?.isPaycio);
console.log('- window.ethereum.providers:', window.ethereum?.providers?.length || 'none');
console.log('- Paycio in providers:', !!window.ethereum?.providers?.find(p => p.isPaycio));

// Test provider detection
console.log('🧪 Testing provider detection...');
const hasPaycio = window.paycio || 
                (window.ethereum && window.ethereum.isPaycio) ||
                (window.ethereum && window.ethereum.providers && 
                 window.ethereum.providers.find(p => p.isPaycio));

if (hasPaycio) {
  console.log('🎉 SUCCESS: Paycio wallet is properly detected!');
} else {
  console.log('💥 FAILURE: Paycio wallet is not detected');
}

console.log('✅ Complete manual Paycio injection finished!');
