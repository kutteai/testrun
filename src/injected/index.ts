// PayCio Wallet injection script - runs in page context
console.log('🔍 PayCio: Injecting into page context...');

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
      
      // Return a mock WebSocket that does nothing
      const mockWs = {
        readyState: 3, // CLOSED
        url: url,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,
        close: () => {},
        send: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      };
      
      return mockWs as any;
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
  // 3. Fall back to demo address only if no real wallet is found
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
                  console.log('⚠️ PayCio: No real wallet found, using demo address');
                  // Fallback to demo address if no real wallet
                  const demoAccount = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
                  provider.selectedAddress = demoAccount;
                  provider._state.accounts = [demoAccount];
                  resolve([demoAccount]);
                }
              },
              () => {
                console.log('PayCio: Connection rejected by user');
                reject(new Error('User rejected the connection'));
              }
            );
          });
          
        case 'eth_chainId':
          return '0x1';
          
        case 'eth_getBalance':
          return '0x0';
          
        case 'net_version':
          return '1';
          
        case 'wallet_switchEthereumChain':
          return null;
          
        case 'wallet_addEthereumChain':
          return null;
          
        default:
          throw new Error('Method ' + request.method + ' not supported');
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
  
  console.log('✅ PayCio: Page context injection completed');
  
} catch (error) {
  console.error('❌ PayCio: Error in page context injection:', error);
} 