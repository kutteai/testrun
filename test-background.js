// Simple test background script
console.log('🔍 Test background script starting...');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Test extension installed:', details.reason);
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Test background received message:', message);
  sendResponse({ success: true, message: 'Test background script working' });
});

console.log('✅ Test background script loaded successfully');
