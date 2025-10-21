// content.js - ENABLED VERSION

// Set up content script indicator FIRST
(window as any).paycioWalletContentScript = {
    isRunning: true, // ENABLED
    timestamp: Date.now(),
    version: '1.0.0'
};

// Inject wallet script for DApp connection
function injectWalletScript() {

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {

        script.remove();
    };
    script.onerror = function() {
        // eslint-disable-next-line no-console
        console.error('❌ Failed to inject PayCio wallet script');
        script.remove();
    };
    
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from injected script
window.addEventListener('message', (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;
    if (!event.data || !event.data.type) return;
    if (!event.data.type.startsWith('PAYCIO_')) return;

    handleInjectedMessage(event.data);
});

// Handle messages from injected script
function handleInjectedMessage(message: any) {
    const { type, id } = message;
    
    switch (type) {
        case 'PAYCIO_WALLET_REQUEST':
            forwardWalletRequest(message);
            break;
            
        case 'PAYCIO_CHECK_WALLET_STATUS':
            forwardStatusCheck(message);
            break;
            
        case 'PAYCIO_GET_WALLET_ADDRESS':
            forwardAddressRequest(message);
            break;
            
        case 'PAYCIO_SHOW_WALLET_UNLOCK_POPUP':
            forwardWalletUnlockPopup(message);
            break;
            
        case 'PAYCIO_DEBUG_PASSWORD':
            forwardDebugPassword(message);
            break;
            
        case 'PAYCIO_TEST_MESSAGE':
            // Respond to test message

            try {
                window.postMessage({
      type: 'PAYCIO_TEST_RESPONSE',
      id: message.id,
      success: true,
      timestamp: Date.now()
                }, '*');

            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('PayCio Content: Error sending test response:', error);
            }
            break;
            
        default:

            sendErrorToInjected(type + '_RESPONSE', id, 'Unknown message type');
    }
}

// Forward wallet request to background
function forwardWalletRequest(message: any) {
    const backgroundMessage = {
        type: 'WALLET_REQUEST',
        method: message.method,
        params: message.params || []
    };
    
    chrome.runtime.sendMessage(backgroundMessage, (response) => {
        if (chrome.runtime.lastError) {
            // eslint-disable-next-line no-console
            console.error('❌ Background error:', chrome.runtime.lastError.message);
            sendErrorToInjected('PAYCIO_WALLET_REQUEST_RESPONSE', message.id, chrome.runtime.lastError.message);
        } else {

            window.postMessage({
                type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
                id: message.id,
                success: response.success,
                result: response.result,
                error: response.error
            }, '*');
        }
    });
}

// Forward status check to background
function forwardStatusCheck(message: any) {
    chrome.runtime.sendMessage({ type: 'CHECK_WALLET_STATUS' }, (response) => {
        if (chrome.runtime.lastError) {
            sendErrorToInjected('PAYCIO_WALLET_STATUS_RESPONSE', message.id, chrome.runtime.lastError.message);
        } else {
            window.postMessage({
                type: 'PAYCIO_WALLET_STATUS_RESPONSE',
                id: message.id,
                success: response.success,
                isUnlocked: response.data?.isUnlocked || false,
                hasWallet: response.data?.hasWallet || false,
                address: response.data?.address || null
            }, '*');
        }
    });
}

// Forward address request to background
function forwardAddressRequest(message: any) {
    chrome.runtime.sendMessage({ type: 'GET_WALLET_ADDRESS' }, (response) => {
        if (chrome.runtime.lastError) {
            sendErrorToInjected('PAYCIO_WALLET_ADDRESS_RESPONSE', message.id, chrome.runtime.lastError.message);
        } else {
          window.postMessage({
                type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
                id: message.id,
                success: response.success,
                address: response.address || null
          }, '*');
        }
    });
}

// Forward wallet unlock popup request to background
function forwardWalletUnlockPopup(message: any) {
    chrome.runtime.sendMessage({ 
        type: 'SHOW_WALLET_UNLOCK_POPUP',
        password: message.password 
    }, (response) => {
        if (chrome.runtime.lastError) {
            sendErrorToInjected('PAYCIO_WALLET_UNLOCK_RESPONSE', message.id, chrome.runtime.lastError.message);
      } else {
            window.postMessage({
                type: 'PAYCIO_WALLET_UNLOCK_RESPONSE',
                id: message.id,
                success: response.success,
                error: response.error || null
            }, '*');
        }
    });
}

// Forward debug password request to background
function forwardDebugPassword(message: any) {
    chrome.runtime.sendMessage({ 
        type: 'DEBUG_PASSWORD'
    }, (response) => {
        if (chrome.runtime.lastError) {
            sendErrorToInjected('PAYCIO_DEBUG_PASSWORD_RESPONSE', message.id, chrome.runtime.lastError.message);
        } else {
            window.postMessage({
                type: 'PAYCIO_DEBUG_PASSWORD_RESPONSE',
                id: message.id,
                success: response.success,
                passwordInfo: response.passwordInfo || null,
                error: response.error || null
            }, '*');
        }
    });
}

// Send error response to injected script
function sendErrorToInjected(responseType: string, messageId: any, error: string) {
    window.postMessage({
        type: responseType,
        id: messageId,
          success: false,
        error: error
    }, '*');
}

// Test connection function
function testConnection() {

    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        // eslint-disable-next-line no-console
        console.error('❌ PayCio Content: Extension context invalidated');
      return;
    }
    
    // Test background script connection
    try {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
                // eslint-disable-next-line no-console
                console.error('❌ PayCio Content: Background connection failed:', chrome.runtime.lastError.message);
            } else {

            }
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ PayCio Content: Error sending message:', error);
    }
    
    // Test injected script communication
    const testMessage = {
        type: 'PAYCIO_TEST_MESSAGE',
        id: 'content-test-' + Date.now()
    };
    
    window.postMessage(testMessage, '*');

}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === 'PASSWORD_DEBUG_INFO') {

        // Display the debug information in an alert
        alert(message.debugInfo);
    }
    
    return true; // Keep message channel open for async response
});

// Expose test function globally for debugging
(window as any).paycioTestConnection = testConnection;

// ENABLED: Initialize content script

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectWalletScript();
        // Test connection after a short delay
        setTimeout(testConnection, 1000);
    });
} else {
    // If page is already loaded
    injectWalletScript();
    // Test connection after a short delay
    setTimeout(testConnection, 1000);
}
