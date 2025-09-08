console.log('Background script loaded');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Message received:', message);
  sendResponse({success: true, message: 'PONG'});
  return true;
});