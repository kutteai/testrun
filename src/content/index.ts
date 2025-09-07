// PayCio Wallet Content Script - Cross-Browser Compatible
console.log('🔍 PayCio content script starting...');

import { storage } from '../utils/storage-utils';
import { runtime, safeSendMessage } from '../utils/runtime-utils';

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
  script.src = runtime().getURL('injected.js');
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
  
  // Handle crossBrowserSendMessage format (with _id field)
  if (event.data._id && event.data.type) {
    console.log('PayCio: Received crossBrowserSendMessage:', event.data);
    
    switch (event.data.type) {
      case 'WALLET_REQUEST':
        console.log('PayCio: Processing WALLET_REQUEST via crossBrowserSendMessage:', event.data.method);
        
        // Send message to background script to process wallet request
        console.log('PayCio: Sending message to background script:', {
          type: 'WALLET_REQUEST',
          method: event.data.method,
          params: event.data.params
        });
        
        safeSendMessage({
          type: 'WALLET_REQUEST',
          method: event.data.method,
          params: event.data.params
        }).then((response) => {
          console.log('PayCio: Received response from background script:', response);
          console.log('PayCio: Response type:', typeof response);
          console.log('PayCio: Response success:', response?.success);
          console.log('PayCio: Response result:', response?.result);
          
          if (response?.success) {
            console.log('PayCio: Sending success response to injected script');
            window.postMessage({
              _id: event.data._id,
              response: response
            }, '*');
          } else {
            console.log('PayCio: Sending error response to injected script');
            window.postMessage({
              _id: event.data._id,
              error: response?.error || 'Unknown error'
            }, '*');
          }
        }).catch((error) => {
          console.error('Error processing wallet request:', error);
          window.postMessage({
            _id: event.data._id,
            error: error.message || 'Unknown error'
          }, '*');
        });
        return;
    }
  }
  
  switch (event.data.type) {
    case 'PAYCIO_GET_WALLET_ADDRESS':
      console.log('PayCio: Received wallet address request from page with ID:', event.data.id);
      
      // Get wallet address from storage using correct structure
      storage.get(['wallet', 'network']).then((result) => {
        console.log('PayCio: Storage result:', result);
        const wallet = result.wallet;
        const currentNetwork = result.network;
        
        console.log('PayCio: Wallet data:', wallet);
        console.log('PayCio: Current network:', currentNetwork);
        
        // Get current account address
        const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
        console.log('PayCio: Current account:', currentAccount);
        
        const address = currentAccount?.addresses?.[currentNetwork?.id || 'ethereum'];
        console.log('PayCio: Derived address:', address);
        
        console.log('PayCio: Sending wallet address response with ID:', event.data.id);
        
        window.postMessage({
          type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
          id: event.data.id,
          address: address
        }, '*');
      }).catch((error) => {
        console.error('Error getting wallet from storage:', error);
        window.postMessage({
          type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
          id: event.data.id,
          address: null
        }, '*');
      });
      break;

    case 'PAYCIO_CHECK_WALLET_STATUS':
      console.log('PayCio: Received wallet status check from page with ID:', event.data.id);
      
      // Check wallet unlock status
      storage.get(['walletState']).then((result) => {
        console.log('PayCio: Wallet state result:', result);
        const isUnlocked = result.walletState?.isWalletUnlocked || false;
        console.log('PayCio: Wallet unlocked status:', isUnlocked);
        console.log('PayCio: Sending wallet status response with ID:', event.data.id);
        
        window.postMessage({
          type: 'PAYCIO_WALLET_STATUS_RESPONSE',
          id: event.data.id,
          isUnlocked: isUnlocked
        }, '*');
      }).catch((error) => {
        console.error('Error checking wallet status:', error);
        window.postMessage({
          type: 'PAYCIO_WALLET_STATUS_RESPONSE',
          id: event.data.id,
          isUnlocked: false
        }, '*');
      });
      break;

    case 'PAYCIO_SHOW_UNLOCK_POPUP':
      console.log('PayCio: Received show unlock popup request from page');
      
      // Send message to background script to open popup
      safeSendMessage({
        type: 'SHOW_WALLET_UNLOCK_POPUP'
      }).then((response) => {
        const success = response?.success || false;
        console.log('PayCio: Sending unlock popup response:', success);
        
        window.postMessage({
          type: 'PAYCIO_UNLOCK_POPUP_RESPONSE',
          id: event.data.id,
          success: success
        }, '*');
      }).catch((error) => {
        console.error('Error showing unlock popup:', error);
        window.postMessage({
          type: 'PAYCIO_UNLOCK_POPUP_RESPONSE',
          id: event.data.id,
          success: false
        }, '*');
      });
      break;

    case 'PAYCIO_WALLET_REQUEST':
    case 'WALLET_REQUEST':
      console.log('PayCio: Received wallet request from page:', event.data.method);
      
      // Send message to background script to process wallet request
      safeSendMessage({
        type: 'WALLET_REQUEST',
        method: event.data.method,
        params: event.data.params
      }).then((response) => {
        console.log('PayCio: Received response from background script:', response);
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
      }).catch((error) => {
        console.error('Error processing wallet request:', error);
        window.postMessage({
          type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
          id: event.data.id,
          success: false,
          error: error.message || 'Unknown error'
        }, '*');
      });
      break;

    case 'STORAGE_CHECK_REQUEST':
      console.log('PayCio: Received storage check request from page with ID:', event.data.id);
      
      // Check storage and send response
      storage.get(['wallet', 'walletState', 'network']).then((result) => {
        console.log('PayCio: Storage result:', result);
        
        window.postMessage({
          type: 'STORAGE_CHECK_RESPONSE',
          id: event.data.id,
          success: true,
          wallet: result.wallet,
          walletState: result.walletState,
          network: result.network
        }, '*');
      }).catch((error) => {
        console.error('Error checking storage:', error);
        window.postMessage({
          type: 'STORAGE_CHECK_RESPONSE',
          id: event.data.id,
          success: false,
          error: error.message || 'Unknown error'
        }, '*');
      });
      break;
  }
}

// Note: Storage change listeners are not available in cross-browser storage utility
// Wallet status changes will be handled through other mechanisms

// Initialize the content script
console.log('🚀 PayCio: Initializing content script...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ PayCio: DOM loaded, starting content script');
    injectScript();
    addIndicator();
  });
} else {
  console.log('✅ PayCio: DOM already ready, starting content script');
  injectScript();
  addIndicator();
}

// Listen for messages from the page
window.addEventListener('message', handlePageMessages);

// Listen for messages from the extension
runtime().onMessage.addListener((message, sender, sendResponse) => {
  console.log('PayCio: Received message from extension:', message);
  
  switch (message.type) {
    case 'WALLET_STATUS_CHANGED':
      // Handle wallet status changes
      console.log('PayCio: Wallet status changed:', message.isUnlocked);
      break;
      
    case 'WALLET_ADDRESS_CHANGED':
      // Handle wallet address changes
      console.log('PayCio: Wallet address changed:', message.address);
      break;
      
    default:
      console.log('PayCio: Unknown message type:', message.type);
      break;
  }
});

console.log('✅ PayCio: Content script initialization complete');