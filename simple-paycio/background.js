// Minimal background script for testing
console.log('🔍 PayCio background script starting...');

// Basic error handling
try {
  console.log('Background script context:', typeof self, typeof window, typeof chrome);
  
  // Test basic Chrome APIs
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Chrome runtime API available');
  } else {
    console.log('❌ Chrome runtime API not available');
  }
  
  // Handle installation
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
  });
  
  // Handle messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    try {
      switch (message.type) {
        case 'PING':
          sendResponse({ success: true, message: 'Background script working' });
          break;
        default:
          sendResponse({ success: true, message: 'Background script working' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  });
  
  console.log('✅ PayCio background script initialized successfully');
  
} catch (error) {
  console.error('❌ Error in background script:', error);
}

console.log('🔍 PayCio background script loaded');