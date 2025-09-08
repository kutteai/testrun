// Minimal background script
console.log('Background script starting...');

try {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Got message:', message.type);
    sendResponse({ success: true, message: 'Background working' });
    return true;
  });
  
  console.log('Background script ready');
} catch (error) {
  console.error('Background script error:', error);
}