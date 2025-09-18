// content.js - Fixed PayCio Content Script

console.log('🚀 PayCio Content: Script starting on:', window.location.href);
console.log('🚀 PayCio Content: Document ready state:', document.readyState);

// Cross-browser compatibility
const browserAPI = (() => {
  if (typeof browser !== 'undefined') return browser;
  if (typeof chrome !== 'undefined') return chrome;
  throw new Error('No browser API available');
})();

// Secure content script indicator - Set immediately
console.log('🔍 Content: Setting content script indicator');
Object.defineProperty(window, 'paycioWalletContentScript', {
  value: {
    isRunning: true,
    timestamp: Date.now(),
    version: '2.0.0',
    secure: true,
    url: window.location.href,
    injected: false
  },
  writable: false,
  configurable: false
});

console.log('✅ Content: Content script indicator set:', (window as any).paycioWalletContentScript);

// Enhanced extension context exposure for DApps
console.log('🔍 Content: Setting up extension context exposure');

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  console.log('✅ Content: Chrome runtime available, exposing to page');
  console.log('🔍 Content: Extension ID:', chrome.runtime.id);
  
  (window as any).paycioExtensionId = chrome.runtime.id;
  
  // Ensure chrome object exists on window
  if (!(window as any).chrome) {
    (window as any).chrome = {};
  }
  if (!(window as any).chrome.runtime) {
    (window as any).chrome.runtime = {};
  }
  
  (window as any).chrome.runtime.id = chrome.runtime.id;
  
  // CRITICAL: Direct sendMessage function that actually works
  (window as any).chrome.runtime.sendMessage = function(extensionIdOrMessage: any, messageOrCallback?: any, callbackOrOptions?: any) {
    // Handle both calling patterns:
    // chrome.runtime.sendMessage(message, callback) - old pattern
    // chrome.runtime.sendMessage(extensionId, message, callback) - required from webpage
    
    let message: any;
    let callback: any;
    
    if (typeof extensionIdOrMessage === 'string') {
      // New pattern: sendMessage(extensionId, message, callback)
      message = messageOrCallback;
      callback = callbackOrOptions;
      console.log('🔍 Content: Direct sendMessage called with extension ID:', extensionIdOrMessage);
    } else {
      // Old pattern: sendMessage(message, callback)
      message = extensionIdOrMessage;
      callback = messageOrCallback;
      console.log('🔍 Content: Direct sendMessage called (legacy pattern):', message);
    }
    
    // Send directly to background script using the real chrome.runtime
    try {
      browserAPI.runtime.sendMessage(message, (response: any) => {
        console.log('🔍 Content: Direct response received:', response);
        
        if (browserAPI.runtime.lastError) {
          console.error('❌ Content: Runtime error:', browserAPI.runtime.lastError);
          if (callback) {
            callback({ success: false, error: browserAPI.runtime.lastError.message });
          }
          return;
        }
        
        if (callback) {
          callback(response);
        }
      });
    } catch (error) {
      console.error('❌ Content: Direct sendMessage failed:', error);
      if (callback) {
        callback({ success: false, error: (error as Error).message });
      }
    }
  };
  
  console.log('✅ Content: Extension context exposed to page');
} else {
  console.warn('⚠️ Content: Chrome runtime not available');
}

// Rate limiting
class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests = new Map();

  constructor(maxRequests = 30, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    while (userRequests.length > 0 && userRequests[0] < windowStart) {
      userRequests.shift();
    }
    
    if (userRequests.length >= this.maxRequests) {
      return false;
    }
    
    userRequests.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter(50, 1000);

// Enhanced message validation with better error handling
function validateMessage(message: any): boolean {
  // Basic type check
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message format');
  }
  
  // Type check
  if (!message.type || typeof message.type !== 'string') {
    throw new Error('Missing or invalid message type');
  }
  
  // Namespace check - only process PayCio messages
  if (!message.type.startsWith('PAYCIO_')) {
    throw new Error('Invalid message namespace');
  }
  
  // Lenient ID validation - some messages don't need IDs
  const noIdRequired = [
    'PAYCIO_CONTENT_SCRIPT_READY', 
    'PAYCIO_WALLET_STATUS_CHANGED',
    'PAYCIO_ACCOUNT_CHANGED',
    'PAYCIO_NETWORK_CHANGED'
  ];
  
  if (!message.id && !noIdRequired.includes(message.type)) {
    throw new Error('Missing message ID');
  }
  
  return true;
}

// Secure message handler
async function handleSecureMessage(message: any, timeout = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);

    try {
      browserAPI.runtime.sendMessage(message, (response: any) => {
        clearTimeout(timeoutId);
        
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
          return;
        }
        
        resolve(response);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Enhanced message handlers
const messageHandlers: Record<string, (message: any) => Promise<any>> = {
  'PAYCIO_DAPP_REQUEST': async (message) => {
    try {
      console.log('🔍 Content: Handling DAPP_REQUEST:', message.method);
      
      const response = await handleSecureMessage({
        type: 'DAPP_REQUEST',
        method: message.method,
        params: message.params || []
      });
      
      console.log('🔍 Content: DAPP_REQUEST response:', response);
      
      return {
        type: 'PAYCIO_DAPP_REQUEST_RESPONSE',
        id: message.id,
        success: response?.success !== false,
        result: response?.result || response?.data,
        error: response?.error,
        requiresUnlock: response?.requiresUnlock || false,
        hasWallet: response?.hasWallet
      };
    } catch (error) {
      console.error('❌ Content: DAPP_REQUEST failed:', error);
      return {
        type: 'PAYCIO_DAPP_REQUEST_RESPONSE',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresUnlock: error instanceof Error && error.message.includes('locked')
      };
    }
  },

  'PAYCIO_CHECK_WALLET_STATUS': async (message) => {
    try {
      console.log('🔍 Content: Checking wallet status');
      const response = await handleSecureMessage({ type: 'GET_WALLET_STATUS' });
      
      return {
        type: 'PAYCIO_CHECK_WALLET_STATUS_RESPONSE',
        id: message.id,
        success: response?.success !== false,
        result: response?.data || {
          hasWallet: response?.data?.hasWallet || false,
          isUnlocked: response?.data?.isUnlocked || false,
          walletId: response?.data?.walletId || null,
          lastUnlockTime: response?.data?.lastUnlockTime || null
        }
      };
    } catch (error) {
      console.error('❌ Content: Wallet status check failed:', error);
      return {
        type: 'PAYCIO_CHECK_WALLET_STATUS_RESPONSE',
        id: message.id,
        success: false,
        result: {
          hasWallet: false,
          isUnlocked: false,
          walletId: null
        },
        error: error instanceof Error ? error.message : 'Failed to check wallet status'
      };
    }
  },

  'PAYCIO_UNLOCK_WALLET': async (message) => {
    const { password } = message;
    if (!password) {
      return {
        type: 'PAYCIO_UNLOCK_WALLET_RESPONSE',
        id: message.id,
        success: false,
        error: 'Password is required'
      };
    }

    try {
      console.log('🔍 Content: Attempting wallet unlock');
      const response = await handleSecureMessage({ type: 'UNLOCK_WALLET', password });
      
      console.log('🔍 Content: Unlock response:', response);
      
      return {
        type: 'PAYCIO_UNLOCK_WALLET_RESPONSE',
        id: message.id,
        success: response?.success || false,
        result: response?.data || response?.result,
        error: response?.success ? null : (response?.error || 'Invalid password')
      };
    } catch (error) {
      console.error('❌ Content: Unlock failed:', error);
      return {
        type: 'PAYCIO_UNLOCK_WALLET_RESPONSE',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock wallet'
      };
    }
  },

  'PAYCIO_TEST_MESSAGE': async (message) => {
    return {
      type: 'PAYCIO_TEST_RESPONSE',
      id: message.id,
      success: true,
      timestamp: Date.now()
    };
  }
};

// DApp detection - inject on more sites to override other wallets
function isDAppSite(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  
  // Skip known non-DApp sites (reduced list for better coverage)
  const skipSites = [
    'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'youtube.com', 'gmail.com', 'googleads.g.doubleclick.net',
    'ep2.adtrafficquality.google', 'ads.yahoo.com'
  ];
  
  for (const site of skipSites) {
    if (hostname.includes(site)) {
      console.log('⚠️ Content: Skipping injection on:', hostname);
      return false;
    }
  }
  
  // Inject on more sites to ensure PayCio overrides other wallets
  if (hostname === 'localhost' || 
      window.location.protocol === 'file:' ||
      hostname.includes('127.0.0.1') ||
      hostname.includes('dapp') ||
      hostname.includes('defi') ||
      hostname.includes('web3') ||
      hostname.includes('crypto') ||
      hostname.includes('nft') ||
      hostname.includes('blockchain') ||
      hostname.includes('test') ||
      hostname.includes('wallet') ||
      // Include common development and testing domains
      hostname.includes('.html') ||
      hostname.includes('github.io') ||
      hostname.includes('vercel.app') ||
      hostname.includes('netlify.app') ||
      hostname.includes('surge.sh')) {
    console.log('✅ Content: Injecting on detected Web3 site:', hostname);
    return true;
  }
  
  // Check if page has Web3-related content (immediate check)
  const hasWeb3Content = () => {
    const content = document.documentElement.innerHTML.toLowerCase();
    const web3Keywords = [
      'metamask', 'wallet', 'connect wallet', 'web3', 'ethereum', 'dapp',
      'eth_requestaccounts', 'window.ethereum', 'provider', 'blockchain'
    ];
    return web3Keywords.some(keyword => content.includes(keyword));
  };
  
  // Immediate check for Web3 content
  if (hasWeb3Content()) {
    console.log('✅ Content: Web3 content detected immediately, injecting wallet');
    return true;
  }
  
  // For other sites, wait a bit for page to load before checking content
  setTimeout(() => {
    if (hasWeb3Content()) {
      console.log('✅ Content: Web3 content detected after load, injecting wallet');
      injectWalletScript();
    }
  }, 1000); // Reduced delay for faster injection
  
  // Default to injecting on most sites (aggressive mode)
  console.log('✅ Content: Default injection for potential Web3 site:', hostname);
  return true;
}

// Enhanced injected script injection with DApp detection
function injectWalletScript(): void {
  try {
    console.log('🔍 Content: Injecting wallet script...');
    
    // Check if already injected
    if (document.querySelector('#paycio-injected-script')) {
      console.log('⚠️ Content: Script already injected, skipping');
      return;
    }
    
    if (!browserAPI.runtime?.getURL) {
      console.error('❌ Content: No runtime.getURL available');
      return;
    }
    
    const script = document.createElement('script');
    script.src = browserAPI.runtime.getURL('injected.js');
    script.type = 'text/javascript';
    script.id = 'paycio-injected-script';
    script.setAttribute('data-paycio-injected', 'true');
    script.setAttribute('async', 'false');
    
    // Critical: Inject as early as possible to beat other wallets
    const targetElement = document.head || document.documentElement || document.body;
    
    let scriptLoaded = false;
    
    script.onload = function() {
      if (!scriptLoaded) {
        scriptLoaded = true;
        console.log('✅ Content: PayCio injected script loaded successfully');
        
        // Verify PayCio provider is installed
        setTimeout(() => {
          const isPayCioActive = (window as any).ethereum?.isPayCio;
          console.log('🔍 Content: PayCio provider status:', {
            isPayCio: isPayCioActive,
            hasEthereum: !!(window as any).ethereum,
            requestMethod: typeof (window as any).ethereum?.request
          });
          
          if (!isPayCioActive) {
            console.warn('⚠️ Content: PayCio provider not detected, other wallet may have overridden');
          }
        }, 100);
        
        // Clean up script element after a delay
        setTimeout(() => {
          if (script.parentNode) {
            script.remove();
          }
        }, 500);
        
        // Notify injected script that content script is ready
        setTimeout(() => {
          window.postMessage({
            type: 'PAYCIO_CONTENT_SCRIPT_READY',
            timestamp: Date.now()
          }, '*');
        }, 50);
      }
    };
    
    script.onerror = function(error) {
      if (!scriptLoaded) {
        scriptLoaded = true;
        console.error('❌ Content: Failed to load injected script');
        console.error('❌ Content: Error details:', {
          src: script.src,
          error: error?.toString?.() || 'Unknown error'
        });
        
        if (script.parentNode) {
          script.remove();
        }
      }
    };
    
    // Inject immediately at the top of head/document for highest priority
    if (targetElement) {
      if (targetElement.firstChild) {
        targetElement.insertBefore(script, targetElement.firstChild);
      } else {
        targetElement.appendChild(script);
      }
      console.log('✅ Content: PayCio script injected at high priority');
    } else {
      console.error('❌ Content: No suitable DOM element found for injection');
    }
    
  } catch (error) {
    console.error('❌ Content: Error injecting script:', error);
  }
}

// Enhanced message listener with strict filtering
window.addEventListener('message', async (event: MessageEvent) => {
  // Always process messages on localhost and file:// protocol
  const hostname = window.location.hostname.toLowerCase();
  const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1') || window.location.protocol === 'file:';
  
  if (!isLocalhost && !isDAppSite()) {
    return;
  }

  // Security checks
  if (event.source !== window) return;
  
  const isOriginValid = 
    event.origin === window.location.origin || 
    (window.location.protocol === 'file:' && (event.origin === 'null' || event.origin === 'file://'));
  
  if (!isOriginValid) return;
  
  try {
    const message = event.data;
    
    // Strict filtering - only process PayCio messages with proper structure
    if (!message || 
        typeof message !== 'object' || 
        !message.type || 
        typeof message.type !== 'string' ||
        !message.type.startsWith('PAYCIO_')) {
      return;
    }
    
    // Skip validation for certain message types
    if (message.type === 'PAYCIO_CONTENT_SCRIPT_READY') {
      return;
    }
    
    console.log('🔍 Content: Processing PayCio message:', message.type);
    
    // Validate message structure
    try {
      validateMessage(message);
    } catch (validationError) {
      console.log('❌ Content: Message validation failed:', (validationError as Error).message);
      if (message?.id && typeof message.id === 'string') {
        const errorResponse = {
          type: (message.type || 'PAYCIO_UNKNOWN').replace('PAYCIO_', 'PAYCIO_') + '_RESPONSE',
          id: message.id,
          success: false,
          error: (validationError as Error).message
        };
        window.postMessage(errorResponse, '*');
      }
      return;
    }
    
    // Rate limiting - only for PayCio messages
    const origin = event.origin || 'unknown';
    if (!rateLimiter.isAllowed(origin)) {
      console.warn('⚠️ Content: Rate limit exceeded for PayCio messages from origin:', origin);
      return;
    }
    
    const handler = messageHandlers[message.type];
    if (!handler) {
      console.log('❌ Content: No handler for message type:', message.type);
      if (message.id) {
        const errorResponse = {
          type: message.type.replace('PAYCIO_', 'PAYCIO_') + '_RESPONSE',
          id: message.id,
          success: false,
          error: 'Unknown message type: ' + message.type
        };
        window.postMessage(errorResponse, '*');
      }
      return;
    }
    
    try {
      console.log('⚙️ Content: Calling handler for:', message.type);
      const response = await handler(message);
      console.log('✅ Content: Handler success, sending response');
      window.postMessage(response, '*');
    } catch (handlerError) {
      console.error('❌ Content: Handler error:', handlerError);
      if (message.id) {
        const errorResponse = {
          type: message.type.replace('PAYCIO_', 'PAYCIO_') + '_RESPONSE',
          id: message.id,
          success: false,
          error: handlerError instanceof Error ? handlerError.message : 'Handler failed'
        };
        window.postMessage(errorResponse, '*');
      }
    }
    
  } catch (error) {
    // Silently ignore non-PayCio errors
    console.error('❌ Content: PayCio message processing error:', error);
  }
});

// Background script message listener
browserAPI.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
  if (message.type === 'WALLET_STATUS_CHANGED') {
    window.postMessage({
      type: 'PAYCIO_WALLET_STATUS_CHANGED',
      isUnlocked: message.isUnlocked,
      hasWallet: message.hasWallet,
      timestamp: Date.now()
    }, '*');
  }
  
  // Handle wallet unlock notification
  if (message.type === 'PAYCIO_WALLET_UNLOCKED') {
    console.log('🔓 Content: Wallet unlocked notification received');
    
    // Notify the injected script
    window.postMessage({
      type: 'PAYCIO_WALLET_UNLOCKED',
      timestamp: message.timestamp,
      source: 'paycio-content'
    }, '*');
    
    sendResponse({ received: true });
  }
  
  return true;
});

// Connection test function
async function testConnection(): Promise<void> {
  try {
    console.log('🧪 Content: Testing connections...');
    
    const response = await handleSecureMessage({ type: 'HEALTH_CHECK' });
    if (response?.success) {
      console.log('✅ Content: Background script connection OK');
    } else {
      console.log('❌ Content: Background script connection failed');
    }
    
  } catch (error) {
    console.error('❌ Content: Connection test failed:', error);
  }
}

// Initialize
function initialize(): void {
  console.log('🔍 Content: Initializing on:', window.location.href);
  console.log('🔍 Content: Hostname:', window.location.hostname);
  console.log('🔍 Content: Protocol:', window.location.protocol);
  
  try {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1') || window.location.protocol === 'file:';
    
    // Force injection on localhost and test environments
    if (isLocalhost || isDAppSite()) {
      console.log('✅ Content: Injecting wallet script (localhost or DApp site)');
      injectWalletScript();
      
      // Test connections after a short delay
      setTimeout(testConnection, 1000);
    } else {
      console.log('⚠️ Content: Non-DApp site, skipping injection');
    }
    
    console.log('✅ Content: Initialization complete');
  } catch (error) {
    console.error('❌ Content: Initialization failed:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('✅ PayCio Content: Script loaded and ready');