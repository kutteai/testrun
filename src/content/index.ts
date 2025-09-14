// content.js - WORKING VERSION
console.log('🚀 PayCio Content Script Loading...');

// Set up content script indicator FIRST
(window as any).paycioWalletContentScript = {
    isRunning: true,
    timestamp: Date.now(),
    version: '1.0.0'
};

// Alert that content script is running
alert('📄 CONTENT SCRIPT IS RUNNING!');

// Inject wallet script
function injectWalletScript() {
    try {
        console.log('📥 Injecting wallet script...');
        
        // Check if extension context is still valid
        if (!chrome.runtime || !chrome.runtime.getURL) {
            console.error('❌ PayCio: Extension context invalidated');
            return;
        }
        
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected.js');
        
        script.onload = function() {
            console.log('✅ PayCio: Wallet script injected successfully');
            script.remove();
        };
        
        script.onerror = function() {
            console.error('❌ PayCio: Failed to inject wallet script');
            script.remove();
        };
        
        (document.head || document.documentElement).appendChild(script);
        
    } catch (error) {
        console.error('❌ PayCio: Error injecting script:', error);
    }
}

// Listen for messages from injected script
window.addEventListener('message', (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;
    if (!event.data || !event.data.type) return;
    if (!event.data.type.startsWith('PAYCIO_')) return;
    
    console.log('📨 PayCio Content: Message from injected script:', event.data.type);
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
            console.log('PayCio Content: Responding to test message with ID:', message.id);
            try {
                window.postMessage({
                    type: 'PAYCIO_TEST_RESPONSE',
                    id: message.id,
                    success: true,
                    timestamp: Date.now()
                }, '*');
                console.log('PayCio Content: Test response sent successfully');
            } catch (error) {
                console.error('PayCio Content: Error sending test response:', error);
            }
            break;
            
        default:
            console.log('❓ Unknown injected message:', type);
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
            console.error('❌ Background error:', chrome.runtime.lastError.message);
            sendErrorToInjected('PAYCIO_WALLET_REQUEST_RESPONSE', message.id, chrome.runtime.lastError.message);
        } else {
            console.log('✅ Background response:', response);
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
                isUnlocked: response.result?.isUnlocked || false,
                hasWallet: response.result?.hasWallet || false,
                address: response.result?.address || null
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
    console.log('🔍 PayCio Content: Testing connection...');
    
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        console.error('❌ PayCio Content: Extension context invalidated');
        return;
    }
    
    // Test background script connection
    try {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ PayCio Content: Background connection failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ PayCio Content: Background connection OK:', response);
            }
        });
    } catch (error) {
        console.error('❌ PayCio Content: Error sending message:', error);
    }
    
    // Test injected script communication
    const testMessage = {
        type: 'PAYCIO_TEST_MESSAGE',
        id: 'content-test-' + Date.now()
    };
    
    window.postMessage(testMessage, '*');
    console.log('🔍 PayCio Content: Test message sent to injected script');
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 PayCio Content: Message from background:', message.type);
    
    if (message.type === 'PASSWORD_DEBUG_INFO') {
        console.log('🔍 PayCio Content: Received password debug info');
        // Display the debug information in an alert
        alert(message.debugInfo);
    }
    
    return true; // Keep message channel open for async response
});

// Expose test function globally for debugging
(window as any).paycioTestConnection = testConnection;

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectWalletScript();
        // Test connection after a short delay
        setTimeout(testConnection, 1000);
    });
} else {
    injectWalletScript();
    // Test connection after a short delay
    setTimeout(testConnection, 1000);
}

console.log('✅ PayCio Content Script Ready!');