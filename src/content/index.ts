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
// Function to handle messages from injected script
function handlePageMessages(event: MessageEvent) {
  if (event.source !== window) return;
  
  switch (event.data.type) {
    case 'PAYCIO_GET_WALLET_ADDRESS':
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
      break;

    case 'PAYCIO_CHECK_WALLET_STATUS':
      console.log('PayCio: Received wallet status check from page');
      
      // Check wallet unlock status
      chrome.storage.local.get(['walletState'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error checking wallet status:', chrome.runtime.lastError);
          window.postMessage({
            type: 'PAYCIO_WALLET_STATUS_RESPONSE',
            id: event.data.id,
            isUnlocked: false
          }, '*');
          return;
        }
        
        const isUnlocked = result.walletState?.isWalletUnlocked || false;
        console.log('PayCio: Sending wallet status response:', isUnlocked);
        
        window.postMessage({
          type: 'PAYCIO_WALLET_STATUS_RESPONSE',
          id: event.data.id,
          isUnlocked: isUnlocked
        }, '*');
      });
      break;

    case 'PAYCIO_SHOW_UNLOCK_POPUP':
      console.log('PayCio: Received show unlock popup request from page');
      
      // Send message to background script to open popup
      chrome.runtime.sendMessage({
        type: 'SHOW_WALLET_UNLOCK_POPUP'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error showing unlock popup:', chrome.runtime.lastError);
          window.postMessage({
            type: 'PAYCIO_UNLOCK_POPUP_RESPONSE',
            id: event.data.id,
            success: false
          }, '*');
          return;
        }
        
        const success = response?.success || false;
        console.log('PayCio: Sending unlock popup response:', success);
        
        window.postMessage({
          type: 'PAYCIO_UNLOCK_POPUP_RESPONSE',
          id: event.data.id,
          success: success
        }, '*');
      });
      break;

    case 'PAYCIO_WALLET_REQUEST':
      console.log('PayCio: Received wallet request from page:', event.data.method);
      
      // Send message to background script to process wallet request
      chrome.runtime.sendMessage({
        type: 'WALLET_REQUEST',
        method: event.data.method,
        params: event.data.params
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error processing wallet request:', chrome.runtime.lastError);
          window.postMessage({
            type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
            id: event.data.id,
            success: false,
            error: chrome.runtime.lastError.message
          }, '*');
          return;
        }
        
        if (response?.success) {
          window.postMessage({
            type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
            id: event.data.id,
            success: true,
            result: response.result
          }, '*');
        } else {
          window.postMessage({
            type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
            id: event.data.id,
            success: false,
            error: response?.error || 'Unknown error'
          }, '*');
        }
      });
      break;
  }
}

// Listen for wallet unlock status changes and forward to injected script
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.walletState) {
    const newUnlockStatus = changes.walletState.newValue?.isWalletUnlocked || false;
    const oldUnlockStatus = changes.walletState.oldValue?.isWalletUnlocked || false;
    
    console.log('PayCio: Wallet status changed from', oldUnlockStatus, 'to', newUnlockStatus);
    
    // Forward the change to the injected script
    window.postMessage({
      type: 'PAYCIO_WALLET_STATUS_CHANGED',
      oldStatus: oldUnlockStatus,
      newStatus: newUnlockStatus
    }, '*');
  }
});