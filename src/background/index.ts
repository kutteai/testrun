// Simplified background script to prevent crashes
console.log('PayCio Wallet background script starting...');

// Basic error handling wrapper
function safeExecute(fn: () => void, context: string) {
  try {
    fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
  }
}

// Initialize basic functionality
let isInitialized = false;

function initializeBackground() {
  if (isInitialized) return;
  
  safeExecute(() => {
    console.log('Initializing background script...');
    
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed:', details.reason);
    });
    
    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background received message:', message);
      
      try {
        // Basic message handling
        switch (message.type) {
          case 'PING':
            sendResponse({ success: true, message: 'Background script is running' });
            break;
            
          case 'GET_ACCOUNTS':
            // Mock response for now
            sendResponse({ 
              success: true, 
              accounts: [] 
            });
            break;
            
          case 'GET_BALANCE':
            sendResponse({ 
              success: true, 
              balance: '0x0' 
            });
            break;
            
          case 'ETH_REQUEST_ACCOUNTS':
            sendResponse({ 
              success: true, 
              accounts: [] 
            });
            break;
            
          case 'ETH_ACCOUNTS':
            sendResponse({ 
              success: true, 
              accounts: [] 
            });
            break;
            
          case 'ETH_CHAIN_ID':
            sendResponse({ 
              success: true, 
              chainId: '0x1' 
            });
            break;
            
          default:
            sendResponse({ 
              success: false, 
              error: 'Unknown message type' 
            });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      return true; // Keep message channel open for async response
    });
    
    // Handle alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      console.log('Alarm triggered:', alarm.name);
    });
    
    // Handle storage changes
    chrome.storage.local.onChanged.addListener((changes) => {
      console.log('Storage changed:', Object.keys(changes));
    });
    
    isInitialized = true;
    console.log('Background script initialized successfully');
    
  }, 'background initialization');
}

// Start initialization
initializeBackground();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

console.log('PayCio Wallet background script loaded'); 