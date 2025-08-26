// PayCio Wallet injection script - runs in page context
console.log('🔍 PayCio: Injecting into page context...');

try {
  // Set up the window object
  window.paycioWalletContentScript = {
    isRunning: true,
    timestamp: Date.now(),
    message: 'PayCio content script is running!'
  };
  console.log('✅ PayCio: window.paycioWalletContentScript set up');
  
  // Create Ethereum provider
  const provider = {
    isPayCioWallet: true,
    isMetaMask: false,
    chainId: '0x1',
    networkVersion: '1',
    
    request: async (request) => {
      console.log('PayCio: Ethereum provider request:', request);
      
      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [];
        case 'eth_chainId':
          return '0x1';
        case 'eth_getBalance':
          return '0x0';
        case 'net_version':
          return '1';
        default:
          console.log('PayCio: Unsupported method:', request.method);
          throw new Error('Method ' + request.method + ' not supported');
      }
    },
    
    on: (eventName, callback) => {
      console.log('PayCio: Event listener added:', eventName);
    },
    
    removeListener: (eventName, callback) => {
      console.log('PayCio: Event listener removed:', eventName);
    }
  };
  
  // Inject Ethereum provider
  if (!window.ethereum) {
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: false
    });
    console.log('✅ PayCio: Ethereum provider injected');
  } else {
    console.log('⚠️ PayCio: Ethereum provider already exists');
  }
  
  console.log('✅ PayCio: Page context injection completed');
  
} catch (error) {
  console.error('❌ PayCio: Error in page context injection:', error);
}
