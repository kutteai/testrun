// PayCio Wallet Content Script - Simple Version
console.log('🔍 PayCio content script starting...');

// Set up the window object
(window as any).paycioWalletContentScript = {
  isRunning: true,
  timestamp: Date.now(),
  message: 'PayCio content script is running!'
};
console.log('✅ PayCio: window.paycioWalletContentScript set up');

// Function to inject the web accessible resource script
function injectScript() {
  console.log('Injecting PayCio Wallet script using web accessible resource...');
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => {
    console.log('✅ PayCio Wallet injected script loaded successfully');
    script.remove();
  };
  script.onerror = (error) => {
    console.error('❌ Error loading injected script:', error);
  };
  
  (document.head || document.documentElement).appendChild(script);
}

// Function to add visual indicator
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
    
    console.log('✅ PayCio: Indicator added to page');
  } else {
    console.log('⚠️ PayCio: Document body not ready, retrying...');
    setTimeout(addIndicator, 100);
  }
}

// Function to handle messages from injected script
function handlePageMessages(event: MessageEvent) {
  if (event.source !== window) return;
  
  if (event.data.type === 'PAYCIO_GET_WALLET_ADDRESS') {
    console.log('PayCio: Received wallet address request from page');
    
    // Get wallet address from Chrome storage
    chrome.storage.local.get(['wallet'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting wallet from storage:', chrome.runtime.lastError);
        window.postMessage({
          type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
          id: event.data.id,
          address: null
        }, '*');
        return;
      }
      
      const address = result.wallet && result.wallet.address ? result.wallet.address : null;
      console.log('PayCio: Sending wallet address response:', address);
      
      window.postMessage({
        type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
        id: event.data.id,
        address: address
      }, '*');
    });
  }
}

// Inject the script using web accessible resource
try {
  // Inject the script using web accessible resource
  injectScript();
  
  // Add visual indicator
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addIndicator);
  } else {
    addIndicator();
  }

  // Listen for messages from the page
  window.addEventListener('message', handlePageMessages);
  
  console.log('✅ PayCio: Content script completed setup');
  
} catch (error) {
  console.error('❌ PayCio: Error in content script:', error);
} 