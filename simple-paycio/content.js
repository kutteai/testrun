// Minimal content script for testing
console.log('🔍 PayCio content script starting...');

// Set up the window object immediately
window.paycioWalletContentScript = {
  isRunning: true,
  timestamp: Date.now(),
  message: 'PayCio content script is running!'
};

console.log('✅ PayCio content script loaded successfully');

// Create a basic Ethereum provider
function createEthereumProvider() {
  return {
    isPayCioWallet: true,
    isMetaMask: false,
    chainId: '0x1', // Ethereum mainnet
    networkVersion: '1',
    
    // Basic methods
    request: async (request) => {
      console.log('Ethereum provider request:', request);
      
      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [];
        case 'eth_chainId':
          return '0x1';
        case 'eth_getBalance':
          return '0x0';
        default:
          throw new Error(`Method ${request.method} not supported`);
      }
    },
    
    // Event listeners
    on: (eventName, callback) => {
      console.log('Ethereum provider event listener:', eventName);
    },
    
    removeListener: (eventName, callback) => {
      console.log('Ethereum provider remove listener:', eventName);
    }
  };
}

// Inject the Ethereum provider
function injectEthereumProvider() {
  if (!window.ethereum) {
    const provider = createEthereumProvider();
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: false
    });
    console.log('✅ Ethereum provider injected');
  } else {
    console.log('⚠️ Ethereum provider already exists');
  }
}

try {
  // Inject Ethereum provider
  injectEthereumProvider();
  
  // Function to add indicator when DOM is ready
  function addIndicator() {
    if (document.body) {
      const indicator = document.createElement('div');
      indicator.id = 'paycio-content-script-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #007bff;
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
      `;
      indicator.innerHTML = 'PayCio Content Script: ✅ Running';
      document.body.appendChild(indicator);
      
      // Remove indicator after 5 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 5000);
      
      console.log('✅ Indicator added to page');
    } else {
      console.log('⚠️ Document body not ready, retrying...');
      setTimeout(addIndicator, 100);
    }
  }
  
  // Try to add indicator immediately, or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addIndicator);
  } else {
    addIndicator();
  }
  
  console.log('🔍 PayCio content script completed setup');
  
} catch (error) {
  console.error('❌ Error in content script:', error);
}