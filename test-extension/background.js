// Ultra-simple background script
console.log('=== BACKGROUND SCRIPT STARTING ===');

// Register message listener immediately
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('=== MESSAGE RECEIVED ===');
    console.log('Message:', message);
    console.log('Sender:', sender);
    
    // Always respond
    const response = { 
        success: true, 
        message: 'Background script is working!',
        timestamp: Date.now()
    };
    
    console.log('Sending response:', response);
    sendResponse(response);
    
    // Return false for synchronous response
    return false;
});

console.log('=== MESSAGE LISTENER REGISTERED ===');
console.log('=== BACKGROUND SCRIPT READY ===');
