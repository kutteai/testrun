import { storage } from '../utils/storage-utils';
import { crossBrowserSendMessage } from '../utils/runtime-utils';

// PayCio Wallet injection script - runs in page context
console.log('🔍 PayCio: Injecting into page context...');

// Global state for dApp connection handling
let isWalletUnlocked = false;
let pendingConnectionRequests: Array<{
  id: string;
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

// Check wallet unlock status using postMessage
async function checkWalletUnlockStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const messageId = Date.now().toString();
    
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'PAYCIO_WALLET_STATUS_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        const isUnlocked = event.data.isUnlocked || false;
        isWalletUnlocked = isUnlocked;
        resolve(isUnlocked);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Send request to content script
    window.postMessage({
      type: 'PAYCIO_CHECK_WALLET_STATUS',
      id: messageId
    }, '*');
    
    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve(false);
    }, 5000);
  });
}

// Show wallet unlock popup using postMessage
async function showWalletUnlockPopup(): Promise<boolean> {
  return new Promise((resolve) => {
    const messageId = Date.now().toString();
    
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'PAYCIO_UNLOCK_POPUP_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.success || false);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Send request to content script
    window.postMessage({
      type: 'PAYCIO_SHOW_UNLOCK_POPUP',
      id: messageId
    }, '*');
    
    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve(false);
    }, 10000);
  });
}

// Process wallet request using postMessage
async function processWalletRequest(method: string, params: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const messageId = Date.now().toString();
    
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'PAYCIO_WALLET_REQUEST_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error || 'Unknown error'));
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Send request to content script
    window.postMessage({
      type: 'PAYCIO_WALLET_REQUEST',
      id: messageId,
      method: method,
      params: params
    }, '*');
    
    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

// Handle pending connection requests
async function handlePendingConnections() {
  if (pendingConnectionRequests.length === 0) return;
  
  const isUnlocked = await checkWalletUnlockStatus();
  if (!isUnlocked) {
    console.log('PayCio: Wallet still locked, cannot process pending connections');
    return;
  }
  
  console.log('PayCio: Processing pending connections:', pendingConnectionRequests.length);
  
  // Process all pending requests
  for (const request of pendingConnectionRequests) {
    try {
      const result = await processWalletRequest(request.method, request.params);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
  }
  
  // Clear pending requests
  pendingConnectionRequests = [];
}

// Process wallet request
// async function processWalletRequest(method: string, params: any[]): Promise<any> {
//   return new Promise((resolve, reject) => {
//     chrome.runtime.sendMessage({
//       type: 'WALLET_REQUEST',
//       method,
//       params
//     }, (response) => {
//       if (chrome.runtime.lastError) {
//         reject(new Error(chrome.runtime.lastError.message));
//         return;
//       }
      
//       if (response?.success) {
//         resolve(response.result);
//       } else {
//         reject(new Error(response?.error || 'Unknown error'));
//       }
//     });
//   });
// }

// Intercept ethereum provider requests
function interceptEthereumProvider() {
  // Check if ethereum provider already exists
  if ((window as any).ethereum) {
    console.log('PayCio: Ethereum provider already exists, intercepting...');
    interceptExistingProvider((window as any).ethereum);
  } else {
    console.log('PayCio: No ethereum provider found, setting up interception...');
    setupProviderInterception();
  }
}

// Intercept existing ethereum provider
function interceptExistingProvider(provider: any) {
  const originalRequest = provider.request;
  
  provider.request = async function(args: any) {
    console.log('PayCio: Intercepted ethereum request:', args);
    
    // Check if this is a connection request
    const isConnectionRequest = args.method === 'eth_requestAccounts' || 
                               args.method === 'eth_accounts' ||
                               args.method === 'wallet_requestPermissions';
    
    if (isConnectionRequest) {
      // Check wallet unlock status
      const isUnlocked = await checkWalletUnlockStatus();
      
      if (!isUnlocked) {
        console.log('PayCio: Wallet is locked, showing unlock popup...');
        
        // Show unlock popup
        const unlockSuccess = await showWalletUnlockPopup();
        
        if (!unlockSuccess) {
          throw new Error('User cancelled wallet unlock');
        }
        
        // Wait for wallet to be unlocked
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          const isNowUnlocked = await checkWalletUnlockStatus();
          if (isNowUnlocked) {
            console.log('PayCio: Wallet unlocked, proceeding with connection...');
            break;
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Wallet unlock timeout');
        }
      }
    }
    
    // Process the request
    try {
      const result = await processWalletRequest(args.method, args.params || []);
      return result;
    } catch (error) {
      console.error('PayCio: Error processing wallet request:', error);
      throw error;
    }
  };
  
  // Also intercept send method for older dApps
  if (provider.send) {
    const originalSend = provider.send;
    
    provider.send = async function(payload: any, callback: any) {
      console.log('PayCio: Intercepted ethereum send:', payload);
      
      // Check if this is a connection request
      const isConnectionRequest = payload.method === 'eth_requestAccounts' || 
                                 payload.method === 'eth_accounts' ||
                                 payload.method === 'wallet_requestPermissions';
      
      if (isConnectionRequest) {
        // Check wallet unlock status
        const isUnlocked = await checkWalletUnlockStatus();
        
        if (!isUnlocked) {
          console.log('PayCio: Wallet is locked, showing unlock popup...');
          
          // Show unlock popup
          const unlockSuccess = await showWalletUnlockPopup();
          
          if (!unlockSuccess) {
            const error = { code: 4001, message: 'User rejected request' };
            callback(error, null);
            return;
          }
          
          // Wait for wallet to be unlocked
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds timeout
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const isNowUnlocked = await checkWalletUnlockStatus();
            if (isNowUnlocked) {
              console.log('PayCio: Wallet unlocked, proceeding with connection...');
              break;
            }
            
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            const error = { code: 4001, message: 'Wallet unlock timeout' };
            callback(error, null);
            return;
          }
        }
      }
      
      // Process the request
      try {
        const result = await processWalletRequest(payload.method, payload.params || []);
        callback(null, { result });
      } catch (error) {
        console.error('PayCio: Error processing wallet request:', error);
        callback(error, null);
      }
    };
  }
}

// Setup provider interception for when ethereum provider is added later
function setupProviderInterception() {
  // Watch for ethereum provider being added
  const originalDefineProperty = Object.defineProperty;
  
  Object.defineProperty = function(obj: any, prop: string, descriptor: any) {
    if (obj === window && prop === 'ethereum') {
      console.log('PayCio: Ethereum provider being defined, intercepting...');
      
      // Intercept the provider after it's set
      setTimeout(() => {
        if ((window as any).ethereum) {
          interceptExistingProvider((window as any).ethereum);
        }
      }, 100);
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  // Also watch for direct assignment
  const originalSet = Object.getOwnPropertyDescriptor(window, 'ethereum')?.set;
  if (originalSet) {
    Object.defineProperty(window, 'ethereum', {
      set: function(value: any) {
        console.log('PayCio: Ethereum provider being set, intercepting...');
        originalSet.call(this, value);
        
        // Intercept the provider after it's set
        setTimeout(() => {
          if ((window as any).ethereum) {
            interceptExistingProvider((window as any).ethereum);
          }
        }, 100);
      },
      get: Object.getOwnPropertyDescriptor(window, 'ethereum')?.get,
      configurable: true
    });
  }
}

// Note: Storage change listeners are not available in cross-browser storage utility
// Wallet status changes will be handled through other mechanisms

try {
  // IMMEDIATE error suppression - run this first
  (() => {
    // Suppress console errors for CSP violations immediately
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');
      
      // Suppress CSP violation messages
      if (message.includes('Content Security Policy') || 
          message.includes('CSP') ||
          message.includes('bsc-dataseed2.ninicoin.io') ||
          message.includes('ninicoin.io') ||
          message.includes('cca-lite.coinbase.com') ||
          message.includes('coinbase.com') ||
          message.includes('Refused to connect') ||
          message.includes('violates the following Content Security Policy') ||
          message.includes('Failed to fetch') ||
          message.includes('Analytics SDK') ||
          message.includes('WalletError') ||
          message.includes('Couldn\'t establish socket connection') ||
          message.includes('relay.walletconnect.org') ||
          message.includes('Failed to connect to wallet') ||
          message.includes('socket connection to the relay server')) {
        // Don't log these errors
        return;
      }
      
      // Log other errors normally
      originalConsoleError.apply(console, args);
    };

    // Suppress console warnings for WebSocket failures and Redux issues
    const originalConsoleWarn = console.warn;
    console.warn = function(...args: any[]) {
      const message = args.join(' ');
      
      if (message.includes('WebSocket connection') || 
          message.includes('nbstream.binance.com') ||
          message.includes('relay.walletconnect.org') ||
          message.includes('wallet-connector') ||
          message.includes('Couldn\'t establish socket connection') ||
          message.includes('Symbol.observable') ||
          message.includes('Redux DevTools') ||
          message.includes('Redux') ||
          message.includes('polyfilling Symbol.observable')) {
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };
  })();

  // Suppress WebSocket connection errors (common with WalletConnect attempts)
  const originalWebSocket = (window as any).WebSocket;
  (window as any).WebSocket = function(url: string, protocols?: string | string[]) {
    // Completely block WalletConnect relay connections
    if (url.includes('relay.walletconnect.org') ||
        url.includes('relay.walletconnect.com') ||
        url.includes('wallet-connector') ||
        url.includes('nbstream.binance.com')) {
      
      console.log('PayCio: Blocking WalletConnect WebSocket connection to:', url);
      
      // Return a proper WebSocket that handles WalletConnect gracefully
      try {
        const ws = new originalWebSocket(url, protocols);
        
        // Add proper error handling for WalletConnect connections
        ws.addEventListener('error', (event) => {
          console.log('WalletConnect WebSocket error (handled):', event);
        });
        
        ws.addEventListener('close', (event) => {
          console.log('WalletConnect WebSocket closed:', event.code, event.reason);
        });
        
        return ws;
      } catch (error) {
        console.log('Failed to create WalletConnect WebSocket:', error);
        // Throw error instead of creating fallback
        throw new Error(`WebSocket connection blocked for: ${url}`);
      }
    }
    
    const ws = new originalWebSocket(url, protocols);

    // Suppress errors for other connections
    if (url.includes('binance.com')) {
      
      // Override error event
      ws.addEventListener('error', (event: any) => {
        // Suppress these errors completely
        event.preventDefault();
        event.stopPropagation();
        return false;
      });
      
      // Override close event
      ws.addEventListener('close', (event: any) => {
        // Suppress close events too
        event.preventDefault();
        event.stopPropagation();
        return false;
      });
      
      // Override open event to prevent connection attempts
      ws.addEventListener('open', (event: any) => {
        // Suppress open events for these URLs
        event.preventDefault();
        event.stopPropagation();
        return false;
      });
    } else {
      ws.addEventListener('error', (event: any) => {
        console.warn('WebSocket connection error:', url, event);
      });
    }

    return ws;
  };
  (window as any).WebSocket.prototype = originalWebSocket.prototype;

  // Suppress CSP violations and network errors
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Suppress errors for blocked endpoints
    if (url.includes('bsc-dataseed2.ninicoin.io') || 
        url.includes('bsc-dataseed') || 
        url.includes('binance.com') ||
        url.includes('ninicoin.io') ||
        url.includes('cca-lite.coinbase.com') ||
        url.includes('coinbase.com')) {
      console.log('Suppressing fetch request to blocked endpoint:', url);
      // Return a rejected promise that won't show in console
      return Promise.reject(new Error('Request blocked by CSP'));
    }
    
    return originalFetch.call(this, input, init);
  };

  // Also intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    const urlStr = url.toString();
    
    if (urlStr.includes('bsc-dataseed2.ninicoin.io') || 
        urlStr.includes('bsc-dataseed') || 
        urlStr.includes('binance.com') ||
        urlStr.includes('ninicoin.io') ||
        urlStr.includes('cca-lite.coinbase.com') ||
        urlStr.includes('coinbase.com')) {
      console.log('Suppressing XMLHttpRequest to blocked endpoint:', urlStr);
      // Override the send method to do nothing
      this.send = function() {
        // Do nothing - effectively cancel the request
      };
    }
    
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  // Set up the window object
  (window as any).paycioWalletContentScript = {
    isRunning: true,
    timestamp: Date.now(),
    message: 'PayCio content script is running!'
  };
  console.log('✅ PayCio: window.paycioWalletContentScript set up');
  
  // IMPORTANT: This wallet will try to use your real PayCio Wallet address
  // It will:
  // 1. Get the actual address from your wallet's Chrome storage
  // 2. Use that address for dApp connections
      // 3. No fallback - require real wallet
  console.log('🔍 PayCio: Looking for real wallet address in Chrome storage...');
  
  // Create MetaMask-style confirmation popup
  function createConfirmationPopup(message: string, onApprove: () => void, onReject: () => void) {
    // Remove existing popup if any
    const existingPopup = document.getElementById('paycio-confirmation-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.id = 'paycio-confirmation-popup';
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    `;
    
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      background: #6366f1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: white;
      font-weight: bold;
    `;
    icon.textContent = 'P';
    
    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    `;
    title.textContent = 'PayCio Wallet';
    
    header.appendChild(icon);
    header.appendChild(title);
    
    const content = document.createElement('div');
    content.style.cssText = `
      margin-bottom: 24px;
    `;
    
    const messageText = document.createElement('p');
    messageText.style.cssText = `
      margin: 0 0 12px 0;
      color: #374151;
      line-height: 1.5;
    `;
    messageText.textContent = message;
    
    const siteInfo = document.createElement('div');
    siteInfo.style.cssText = `
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    `;
    
    const siteName = document.createElement('div');
    siteName.style.cssText = `
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    `;
    siteName.textContent = window.location.hostname;
    
    const siteUrl = document.createElement('div');
    siteUrl.style.cssText = `
      font-size: 14px;
      color: #6b7280;
    `;
    siteUrl.textContent = window.location.origin;
    
    siteInfo.appendChild(siteName);
    siteInfo.appendChild(siteUrl);
    
    content.appendChild(messageText);
    content.appendChild(siteInfo);
    
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 12px;
    `;
    
    const rejectBtn = document.createElement('button');
    rejectBtn.style.cssText = `
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      background: white;
      color: #374151;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    rejectBtn.textContent = 'Reject';
    rejectBtn.onmouseover = () => {
      rejectBtn.style.background = '#f9fafb';
    };
    rejectBtn.onmouseout = () => {
      rejectBtn.style.background = 'white';
    };
    rejectBtn.onclick = () => {
      popup.remove();
      onReject();
    };
    
    const approveBtn = document.createElement('button');
    approveBtn.style.cssText = `
      flex: 1;
      padding: 12px 16px;
      border: none;
      background: #6366f1;
      color: white;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    approveBtn.textContent = 'Connect';
    approveBtn.onmouseover = () => {
      approveBtn.style.background = '#5855eb';
    };
    approveBtn.onmouseout = () => {
      approveBtn.style.background = '#6366f1';
    };
    approveBtn.onclick = () => {
      popup.remove();
      onApprove();
    };
    
    buttons.appendChild(rejectBtn);
    buttons.appendChild(approveBtn);
    
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(buttons);
    popup.appendChild(modal);
    
    document.body.appendChild(popup);
    
    // Close on background click
    popup.onclick = (e) => {
      if (e.target === popup) {
        popup.remove();
        onReject();
      }
    };
    
    // Focus on approve button
    setTimeout(() => approveBtn.focus(), 100);
  }
  
  // Create Ethereum provider with better compatibility
  const provider = {
    isPayCioWallet: true,
    isMetaMask: false,
    isCoinbaseWallet: false,
    isTrust: false,
    isImToken: false,
    isTokenPocket: false,
    isBitKeep: false,
    isRainbow: false,
    isWalletConnect: false,
    chainId: '0x1',
    networkVersion: '1',
    selectedAddress: null, // Will be set when user connects
    isConnected: () => provider.selectedAddress !== null,
    
    // Add properties that dApps expect
    _state: {
      accounts: [], // Will be populated when user connects
      chainId: '0x1',
      isUnlocked: true,
      networkVersion: '1'
    },
    
    // Function to get real wallet address from Chrome storage
    async getRealWalletAddress(): Promise<string | null> {
      try {
        return new Promise((resolve) => {
          // Send message to content script to get wallet address
          window.postMessage({
            type: 'PAYCIO_GET_WALLET_ADDRESS',
            id: Date.now()
          }, '*');
          
          // Listen for response
          const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_WALLET_ADDRESS_RESPONSE') {
              window.removeEventListener('message', handleMessage);
              if (event.data.address) {
                console.log('✅ PayCio: Found real wallet address:', event.data.address);
                resolve(event.data.address);
              } else {
                console.log('⚠️ PayCio: No wallet found in storage');
                resolve(null);
              }
            }
          };
          
          window.addEventListener('message', handleMessage);
          
          // Timeout after 3 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            console.log('⚠️ PayCio: Timeout getting wallet address');
            resolve(null);
          }, 3000);
        });
      } catch (error) {
        console.error('Error getting wallet address:', error);
        return null;
      }
    },
    
    // Add methods that dApps expect
    _rpcRequest: async (payload: any, callback: any) => {
      try {
        const result = await provider.request(payload);
        callback(null, { result });
      } catch (error) {
        callback(error);
      }
    },
    
    request: async (request: any) => {
      console.log('PayCio: Ethereum provider request:', request);
      
      switch (request.method) {
        case 'eth_accounts':
          return provider._state.accounts;
          
        case 'eth_requestAccounts':
          console.log('PayCio: Connection request received');
          
          return new Promise(async (resolve, reject) => {
            createConfirmationPopup(
              'This site would like to connect to your PayCio Wallet',
              async () => {
                console.log('PayCio: Connection approved by user');
                
                // Get the real wallet address
                const realAddress = await provider.getRealWalletAddress();
                
                if (realAddress) {
                  provider.selectedAddress = realAddress;
                  provider._state.accounts = [realAddress];
                  console.log('✅ PayCio: Connected with real address:', realAddress);
                  resolve([realAddress]);
                } else {
                  console.log('⚠️ PayCio: No real wallet found');
                  reject(new Error('No wallet available. Please create or import a wallet first.'));
                }
              },
              () => {
                console.log('PayCio: Connection rejected by user');
                reject(new Error('User rejected the connection'));
              }
            );
          });
          
        case 'eth_chainId': {
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: 'eth_chainId', params: [] }).then((response) => {
              if (response?.success) return resolve(response.result);
              reject(new Error(response?.error || 'eth_chainId failed'));
            }).catch(reject);
          });
        }
          
        case 'eth_getBalance': {
          const address = (request.params && request.params[0]) || provider.selectedAddress;
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: 'eth_getBalance', params: [address, 'latest'] }).then((response) => {
              if (response?.success) return resolve(response.result);
              reject(new Error(response?.error || 'eth_getBalance failed'));
            }).catch(reject);
          });
        }
          
        case 'net_version': {
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: 'net_version', params: [] }).then((response) => {
              if (response?.success) return resolve(response.result);
              reject(new Error(response?.error || 'net_version failed'));
            }).catch(reject);
          });
        }
          
        case 'wallet_switchEthereumChain': {
          // Forward to background; background will update storage/network state
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: 'wallet_switchEthereumChain', params: request.params || [] }).then((response) => {
              if (response?.success) return resolve(response.result ?? null);
              reject(new Error(response?.error || 'wallet_switchEthereumChain failed'));
            }).catch(reject);
          });
        }
          
        case 'wallet_addEthereumChain': {
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: 'wallet_addEthereumChain', params: request.params || [] }).then((response) => {
              if (response?.success) return resolve(response.result ?? null);
              reject(new Error(response?.error || 'wallet_addEthereumChain failed'));
            }).catch(reject);
          });
        }

        case 'eth_sendTransaction': {
          console.log('PayCio: Transaction request received:', request.params);
          
          return new Promise((resolve, reject) => {
            const txParams = request.params[0];
            
            createConfirmationPopup(
              `Send Transaction\n\nTo: ${txParams.to}\nValue: ${txParams.value || '0x0'} ETH\nGas: ${txParams.gas || 'auto'}`,
              () => {
                console.log('PayCio: Transaction approved by user');
                crossBrowserSendMessage({ 
                  type: 'WALLET_REQUEST', 
                  method: 'eth_sendTransaction', 
                  params: request.params 
                }).then((response) => {
                  if (response?.success) return resolve(response.result);
                  reject(new Error(response?.error || 'Transaction failed'));
                }).catch(reject);
              },
              () => {
                console.log('PayCio: Transaction rejected by user');
                reject(new Error('User rejected the transaction'));
              }
            );
          });
        }

        case 'eth_signTransaction': {
          console.log('PayCio: Sign transaction request received:', request.params);
          
          return new Promise((resolve, reject) => {
            const txParams = request.params[0];
            
            createConfirmationPopup(
              `Sign Transaction\n\nTo: ${txParams.to}\nValue: ${txParams.value || '0x0'} ETH\nNote: This will not send the transaction`,
              () => {
                console.log('PayCio: Sign transaction approved by user');
                crossBrowserSendMessage({ 
                  type: 'WALLET_REQUEST', 
                  method: 'eth_signTransaction', 
                  params: request.params 
                }).then((response) => {
                  if (response?.success) return resolve(response.result);
                  reject(new Error(response?.error || 'Transaction signing failed'));
                }).catch(reject);
              },
              () => {
                console.log('PayCio: Sign transaction rejected by user');
                reject(new Error('User rejected the transaction signing'));
              }
            );
          });
        }

        case 'personal_sign': {
          console.log('PayCio: Personal sign request received:', request.params);
          
          return new Promise((resolve, reject) => {
            const message = request.params[0];
            const address = request.params[1];
            
            createConfirmationPopup(
              `Sign Message\n\nMessage: ${message}\nSigning with: ${address}`,
              () => {
                console.log('PayCio: Personal sign approved by user');
                crossBrowserSendMessage({ 
                  type: 'WALLET_REQUEST', 
                  method: 'personal_sign', 
                  params: request.params 
                }).then((response) => {
                  if (response?.success) return resolve(response.result);
                  reject(new Error(response?.error || 'Message signing failed'));
                }).catch(reject);
              },
              () => {
                console.log('PayCio: Personal sign rejected by user');
                reject(new Error('User rejected the message signing'));
              }
            );
          });
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4': {
          console.log('PayCio: Typed data sign request received:', request.params);
          
          return new Promise((resolve, reject) => {
            const address = request.params[0];
            const typedData = request.params[1];
            let domain = '';
            let message = '';
            
            try {
              const parsedData = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;
              domain = parsedData.domain?.name || 'Unknown dApp';
              message = JSON.stringify(parsedData.message || {}, null, 2);
            } catch (e) {
              message = 'Unable to parse typed data';
            }
            
            createConfirmationPopup(
              `Sign Typed Data\n\nDomain: ${domain}\nSigning with: ${address}\n\nData:\n${message}`,
              () => {
                console.log('PayCio: Typed data sign approved by user');
                crossBrowserSendMessage({ 
                  type: 'WALLET_REQUEST', 
                  method: request.method, 
                  params: request.params 
                }).then((response) => {
                  if (response?.success) return resolve(response.result);
                  reject(new Error(response?.error || 'Typed data signing failed'));
                }).catch(reject);
              },
              () => {
                console.log('PayCio: Typed data sign rejected by user');
                reject(new Error('User rejected the typed data signing'));
              }
            );
          });
        }

        case 'eth_sign': {
          console.log('PayCio: eth_sign request received:', request.params);
          
          return new Promise((resolve, reject) => {
            const address = request.params[0];
            const data = request.params[1];
            
            createConfirmationPopup(
              `Sign Data\n\nData: ${data}\nSigning with: ${address}\n\nWarning: This is a raw signature request`,
              () => {
                console.log('PayCio: eth_sign approved by user');
                crossBrowserSendMessage({ 
                  type: 'WALLET_REQUEST', 
                  method: 'eth_sign', 
                  params: request.params 
                }).then((response) => {
                  if (response?.success) return resolve(response.result);
                  reject(new Error(response?.error || 'Data signing failed'));
                }).catch(reject);
              },
              () => {
                console.log('PayCio: eth_sign rejected by user');
                reject(new Error('User rejected the data signing'));
              }
            );
          });
        }
          
        default:
          // Forward unknown/tx methods to background
          return new Promise((resolve, reject) => {
            crossBrowserSendMessage({ type: 'WALLET_REQUEST', method: request.method, params: request.params || [] }).then((response) => {
              if (response?.success) return resolve(response.result);
              reject(new Error(response?.error || ('Method ' + request.method + ' failed')));
            }).catch(reject);
          });
      }
    },
    
    on: (eventName: string, callback: any) => {
      console.log('PayCio: Event listener added:', eventName);
      // Add to event emitter
      if (!provider._events[eventName]) {
        provider._events[eventName] = [];
      }
      provider._events[eventName].push(callback);
    },
    
    removeListener: (eventName: string, callback: any) => {
      console.log('PayCio: Event listener removed:', eventName);
      if (provider._events[eventName]) {
        const index = provider._events[eventName].indexOf(callback);
        if (index > -1) {
          provider._events[eventName].splice(index, 1);
        }
      }
    },
    
    // Add event emitter functionality
    _events: {} as any,
    addListener: (eventName: string, callback: any) => {
      if (!provider._events[eventName]) {
        provider._events[eventName] = [];
      }
      provider._events[eventName].push(callback);
    },
    
    emit: (eventName: string, data: any) => {
      if (provider._events[eventName]) {
        provider._events[eventName].forEach((callback: any) => callback(data));
      }
    },

    // Additional compatibility methods that dApps expect
    enable: async () => {
      console.log('PayCio: enable() called');
      return await provider.request({ method: 'eth_requestAccounts' });
    },

    send: async (method: string, params?: any[]) => {
      console.log('PayCio: send() called with method:', method);
      return await provider.request({ method, params });
    },

    sendAsync: (request: any, callback: any) => {
      console.log('PayCio: sendAsync() called');
      provider.request(request).then(result => {
        callback(null, { result });
      }).catch(error => {
        callback(error);
      });
    },

    // Web3 compatibility
    isWeb3: false,
    autoRefreshOnNetworkChange: true,
    
    // Methods that some dApps call
    requestAccounts: async () => {
      return await provider.request({ method: 'eth_requestAccounts' });
    },
    
    getAccounts: async () => {
      return await provider.request({ method: 'eth_accounts' });
    },
    
    getNetwork: async () => {
      return { chainId: 1, name: 'Ethereum' };
    },
    
    getProvider: () => provider,
    
    // Event emitter compatibility
    addEventListener: (eventName: string, callback: any) => {
      provider.on(eventName, callback);
    },
    
    removeEventListener: (eventName: string, callback: any) => {
      provider.removeListener(eventName, callback);
    }
  };
  
  // Inject Ethereum provider
  if (!(window as any).ethereum) {
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: false
    });
    console.log('✅ PayCio: Ethereum provider injected');
  } else {
    // If ethereum already exists, add our provider to the list
    if ((window as any).ethereum.providers) {
      (window as any).ethereum.providers.push(provider);
    } else {
      (window as any).ethereum.providers = [provider];
    }
    console.log('✅ PayCio: Added to existing providers');
  }

  // Also inject as window.paycioWallet for direct access
  Object.defineProperty(window, 'paycioWallet', {
    value: provider,
    writable: false,
    configurable: false
  });

  // Create a connector for modern dApp libraries
  const paycioConnector = {
    id: 'paycio',
    name: 'PayCio Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    ready: true,
    connect: async () => {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        return {
          account: accounts[0],
          chain: { id: 1, unsupported: false },
          provider: provider
        };
      } catch (error) {
        throw error;
      }
    },
    disconnect: async () => {
      provider._state.accounts = [];
      provider.selectedAddress = null;
    },
    getAccount: () => provider._state.accounts[0] || null,
    getChainId: () => 1,
    getProvider: () => provider,
    isAuthorized: () => provider._state.accounts.length > 0,
    switchChain: async (chainId: number) => {
      // For now, only support mainnet
      if (chainId !== 1) {
        throw new Error('Chain not supported');
      }
      return provider;
    }
  };

  // Inject connector for wagmi and other libraries
  if (!(window as any).paycioConnector) {
    Object.defineProperty(window, 'paycioConnector', {
      value: paycioConnector,
      writable: false,
      configurable: false
    });
  }

  // Add to common connector lists
  if ((window as any).connectors) {
    (window as any).connectors.push(paycioConnector);
  }

  // EIP-6963 support for wallet detection
  const providerInfo = {
    uuid: 'paycio-wallet-' + Date.now(),
    name: 'PayCio Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    rdns: 'com.paycio.wallet'
  };

  // Announce provider for EIP-6963
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: providerInfo,
      provider: provider
    }
  }));

  // Listen for provider requests
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: providerInfo,
        provider: provider
      }
    }));
  });

  // Dispatch ethereum events for compatibility
  window.dispatchEvent(new CustomEvent('ethereum#initialized', {
    detail: { provider: provider }
  }));

  // Announce that PayCio Wallet is available
  window.dispatchEvent(new CustomEvent('paycio-wallet-ready', {
    detail: { provider: provider }
  }));

  // Announce connector availability
  window.dispatchEvent(new CustomEvent('paycio-connector-ready', {
    detail: { connector: paycioConnector }
  }));
  
  // PayCio Wallet injection completed
  
} catch (error) {
  console.error('❌ PayCio: Error in page context injection:', error);
} 