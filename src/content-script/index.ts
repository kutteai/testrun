// main-content-script.ts - Bridge between web pages and wallet extension
console.log('Paycio wallet content script loaded');

// Interface for communication with background script
interface ExtensionMessage {
  type: string;
  method: string;
  params?: any;
  requestId: string;
}

interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
}

class PaycioContentScript {
  private pendingRequests = new Map<string, (response: any) => void>();
  private connectedDApps = new Set<string>();
  private communicationPort: chrome.runtime.Port | null = null;
  private retryAttempts = 3;
  private currentState = {
    isConnected: false,
    accounts: [] as string[],
    selectedAddress: null as string | null,
    chainId: '0x1',
    networkVersion: '1'
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Inject the provider script into the page
    this.injectProviderScript();

    // Set up message listeners
    this.setupMessageListeners();

    // Set up enhanced keepalive with multiple fallbacks
    this.setupEnhancedKeepAlive();

    // Get initial wallet state
    await this.updateWalletState();

    // Notify page that Paycio is available
    this.announceProvider();
  }

  private injectProviderScript() {
    try {
      // Get the extension ID
      const extensionId = this.getExtensionId();
      if (!extensionId) {
        console.error('Extension ID not found');
        return;
      }

      // Create script element to load external provider file
      const script = document.createElement('script');
      script.src = `chrome-extension://${extensionId}/injected/provider.js`;
      script.onload = () => {
        console.log('Paycio provider script loaded successfully');
        script.remove();
      };
      script.onerror = (error) => {
        console.error('Failed to load provider script:', error);
        script.remove();
      };
      
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error('Failed to inject provider script:', error);
    }
  }

  private getExtensionId(): string | null {
    try {
      // Try to get extension ID from runtime
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        return chrome.runtime.id;
      }
      if (typeof browser !== 'undefined' && browser.runtime && (browser.runtime as any).id) {
        return (browser.runtime as any).id;
      }
      
      // Fallback: try to extract from current script URL
      const scripts = document.querySelectorAll('script[src*="content-script.js"]');
      if (scripts.length > 0) {
        const src = (scripts[0] as HTMLScriptElement).src;
        const match = src.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting extension ID:', error);
      return null;
    }
  }


  private setupMessageListeners() {
    // Listen for messages from the injected page script
    window.addEventListener('message', this.handlePageMessage.bind(this));

    // Listen for messages from the extension background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(this.handleExtensionMessage.bind(this));
    } else if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.onMessage.addListener(this.handleExtensionMessage.bind(this));
    }
  }

  private async handlePageMessage(event: MessageEvent) {
    if (event.source !== window || !event.data.type?.startsWith('PAYCIO_')) {
      return;
    }

    const { type, method, params, requestId, id } = event.data;
    console.log('🔍 Content script received message:', type, event.data);

    try {
      let response;
      
      if (type === 'PAYCIO_EXTENSION_REQUEST') {
        response = await this.forwardToExtension(method, params);
        this.sendResponseToPage(requestId, response);
      } else if (type.startsWith('PAYCIO_') && (requestId || id)) {
        response = await this.forwardToBackgroundScript(type, event.data);
        this.sendResponseToPage(requestId || id, response, type);
      }
    } catch (error) {
      console.error('Error handling page message:', error);
      
      // Try recovery for connection errors
      if (error.message.includes('Could not establish connection') ||
          error.message.includes('Extension context invalidated') ||
          error.message.includes('Receiving end does not exist')) {
        
        try {
          const response = await this.recoverFromConnectionError(event.data, error.message);
          this.sendResponseToPage(requestId || id, response, type);
        } catch (recoveryError) {
          this.sendResponseToPage(requestId || id, {
            success: false,
            error: `Connection failed: ${recoveryError.message}. Please refresh the page and try again.`
          }, type);
        }
      } else {
        this.sendResponseToPage(requestId || id, {
          success: false,
          error: error.message || 'Request failed'
        }, type);
      }
    }
  }

  // Enhanced error recovery mechanism
  private async recoverFromConnectionError(originalMessage: any, originalError: string): Promise<any> {
    console.log('🔧 Attempting connection recovery...');
    
    // Wait for potential service worker restart
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to re-establish communication port
    if (!this.communicationPort) {
      this.createCommunicationPort();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Retry the original message
    try {
      return await this.forwardToBackgroundScript(originalMessage.type, originalMessage);
    } catch (error) {
      console.error('🔧 Connection recovery failed:', error);
      throw new Error(`Connection recovery failed: ${error.message}`);
    }
  }

  private handleExtensionMessage(message: any, sender: any, sendResponse: (response?: any) => void) {
    if (message.type?.startsWith('PAYCIO_')) {
      switch (message.type) {
        case 'PAYCIO_ACCOUNTS_CHANGED':
          this.currentState.accounts = message.accounts || [];
          this.currentState.selectedAddress = message.accounts?.[0] || null;
          this.notifyPageOfAccountsChange(message.accounts);
          break;

        case 'PAYCIO_CHAIN_CHANGED':
          this.currentState.chainId = message.chainId;
          this.currentState.networkVersion = message.networkVersion;
          this.notifyPageOfChainChange(message.chainId);
          break;

        case 'PAYCIO_CONNECTION_CHANGED':
          this.currentState.isConnected = message.isConnected;
          if (message.isConnected) {
            this.notifyPageOfConnection();
          } else {
            this.notifyPageOfDisconnection();
          }
          break;
      }
    }

    return true; // Keep the message channel open
  }

  private async forwardToExtension(method: string, params?: any): Promise<ExtensionResponse> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Extension request timeout'));
      }, 30000);

      this.pendingRequests.set(requestId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      const message: ExtensionMessage = {
        type: 'PAYCIO_DAPP_REQUEST',
        method,
        params,
        requestId
      };

      // Send to background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            this.pendingRequests.delete(requestId);
            clearTimeout(timeout);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          const callback = this.pendingRequests.get(requestId);
          if (callback) {
            this.pendingRequests.delete(requestId);
            clearTimeout(timeout);
            callback(response);
          }
        });
      } else if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.sendMessage(message, (response) => {
          if (browser.runtime.lastError) {
            this.pendingRequests.delete(requestId);
            clearTimeout(timeout);
            reject(new Error(browser.runtime.lastError.message));
            return;
          }
          
          const callback = this.pendingRequests.get(requestId);
          if (callback) {
            this.pendingRequests.delete(requestId);
            clearTimeout(timeout);
            callback(response);
          }
        });
      } else {
        reject(new Error('No runtime API available'));
      }
    });
  }

  private async forwardToBackgroundScript(messageType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background script request timeout'));
      }, 30000);

      // Method 1: Try port communication first
      if (this.communicationPort) {
        try {
          const requestId = this.generateRequestId();
          this.pendingRequests.set(requestId, (response) => {
            clearTimeout(timeout);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Request failed'));
            }
          });
          
          this.communicationPort.postMessage({
            type: messageType,
            requestId,
            ...data
          });
          return;
        } catch (error) {
          console.warn('Port communication failed, falling back to sendMessage:', error);
        }
      }

      // Method 2: Fallback to sendMessage with retry logic
      const sendMessageWithRetry = (retryCount = 0) => {
        const message = {
          type: messageType,
          ...data
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
              const error = chrome.runtime.lastError.message;
              console.log(`❌ sendMessage error (attempt ${retryCount + 1}):`, error);
              
              // Retry on specific errors
              if ((error.includes('Extension context invalidated') || 
                   error.includes('Receiving end does not exist') ||
                   error.includes('Could not establish connection')) && 
                   retryCount < this.retryAttempts) {
                
                console.log(`🔄 Retrying message (attempt ${retryCount + 2}/${this.retryAttempts + 1})...`);
                setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000 * (retryCount + 1));
              } else {
                reject(new Error(error));
              }
            } else if (response) {
              resolve(response);
            } else {
              if (retryCount < this.retryAttempts) {
                console.log(`🔄 No response, retrying (attempt ${retryCount + 2}/${this.retryAttempts + 1})...`);
                setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000 * (retryCount + 1));
              } else {
                reject(new Error('No response from background script after retries'));
              }
            }
          });
        } else {
          clearTimeout(timeout);
          reject(new Error('Chrome runtime not available'));
        }
      };

      sendMessageWithRetry();
    });
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private sendResponseToPage(requestId: string, response: any, originalType?: string) {
    const responseType = originalType ? `${originalType}_RESPONSE` : 'PAYCIO_EXTENSION_RESPONSE';
    window.postMessage({
      type: responseType,
      requestId,
      id: requestId, // Also include id for compatibility
      success: response.success,
      data: response.data,
      error: response.error
    }, '*');
  }

  private setupEnhancedKeepAlive() {
    // Method 1: Port-based keepalive
    this.createCommunicationPort();
    
    // Method 2: Periodic message keepalive
    setInterval(() => {
      this.sendKeepAliveMessage();
    }, 15000);
    
    // Method 3: Service worker ping
    setInterval(() => {
      this.pingServiceWorker();
    }, 25000);
  }

  private createCommunicationPort() {
    try {
      this.communicationPort = chrome.runtime.connect({ name: 'wallet-communication' });
      
      this.communicationPort.onMessage.addListener((message) => {
        const callback = this.pendingRequests.get(message.requestId);
        if (callback) {
          this.pendingRequests.delete(message.requestId);
          callback(message);
        }
      });
      
      this.communicationPort.onDisconnect.addListener(() => {
        console.log('🔄 Communication port disconnected, reconnecting...');
        if (chrome.runtime.lastError) {
          console.log('Port disconnect error:', chrome.runtime.lastError.message);
        }
        
        // Retry after delay
        setTimeout(() => {
          this.createCommunicationPort();
        }, 2000);
      });
      
      console.log('✅ Communication port established');
    } catch (error) {
      console.warn('Failed to create communication port:', error);
      // Will fall back to sendMessage
    }
  }

  private sendKeepAliveMessage() {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'KEEPALIVE_PING' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Keep-alive failed:', chrome.runtime.lastError.message);
            // Try to reconnect communication port
            if (!this.communicationPort) {
              this.createCommunicationPort();
            }
          } else {
            console.log('✅ Keep-alive successful');
          }
        });
      }
    } catch (error) {
      console.warn('Keep-alive error:', error);
    }
  }

  private pingServiceWorker() {
    try {
      // Try to wake up the service worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PING' });
      }
    } catch (error) {
      console.warn('Service worker ping failed:', error);
    }
  }

  private notifyPageOfAccountsChange(accounts: string[]) {
    window.postMessage({
      type: 'PAYCIO_ACCOUNTS_CHANGED',
      data: { accounts }
    }, '*');
  }

  private notifyPageOfChainChange(chainId: string) {
    window.postMessage({
      type: 'PAYCIO_CHAIN_CHANGED',
      data: { 
        chainId,
        networkVersion: parseInt(chainId, 16).toString()
      }
    }, '*');
  }

  private notifyPageOfConnection() {
    window.postMessage({
      type: 'PAYCIO_CONNECT',
      data: { 
        accounts: this.currentState.accounts,
        chainId: this.currentState.chainId
      }
    }, '*');
  }

  private notifyPageOfDisconnection() {
    window.postMessage({
      type: 'PAYCIO_DISCONNECT',
      data: {}
    }, '*');
  }

  private async updateWalletState() {
    try {
      const response = await this.forwardToExtension('GET_PROVIDER_STATE');
      if (response.success) {
        this.currentState = {
          isConnected: response.data.isConnected,
          accounts: response.data.accounts || [],
          selectedAddress: response.data.selectedAddress,
          chainId: response.data.chainId,
          networkVersion: response.data.networkVersion
        };
      }
    } catch (error) {
      console.log('Failed to update wallet state:', error);
    }
  }

  private announceProvider() {
    // Wait a bit for the provider script to load
    setTimeout(() => {
    // Dispatch events to let DApps know Paycio is available
    window.dispatchEvent(new Event('ethereum#initialized'));
    
    // Custom event for Paycio
    window.dispatchEvent(new CustomEvent('paycio#initialized', {
      detail: {
        isPaycio: true,
          version: '2.0.0',
        supportedNetworks: [
          'ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism',
          'bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'
        ]
      }
    }));

    console.log('Paycio wallet announced to page');
    }, 100);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Enhanced DApp connection manager for locked wallet scenarios
class DAppConnectionManager {
  private static pendingRequests = new Map<string, any>();

  static async handleDAppRequest(method: string, params: any[] = []): Promise<any> {
    try {
      console.log(`DApp request: ${method}`);

      // Send request to background script
      const response = await this.sendToBackground('DAPP_REQUEST', {
        method,
        params,
        origin: window.location.origin,
        timestamp: Date.now()
      });

      // Handle wallet unlock requirements
      if (!response.success && response.error === 'WALLET_UNLOCK_REQUIRED') {
        return await this.handleUnlockRequirement(response.data, method, params);
      }

      // Handle no wallet scenario
      if (!response.success && response.error === 'NO_WALLET') {
        return this.handleNoWallet(response.data);
      }

      // Handle other errors
      if (!response.success) {
        throw new Error(response.data?.message || response.error);
      }

      return response.data;

    } catch (error) {
      console.error('DApp request failed:', error);
      throw error;
    }
  }

  private static async handleUnlockRequirement(data: any, method: string, params: any[]): Promise<any> {
    console.log('Wallet unlock required for DApp request');

    // Store the pending request
    const requestId = data.requestId || Date.now().toString();
    this.pendingRequests.set(requestId, { method, params, timestamp: Date.now() });

    // Show unlock prompt to user
    const shouldUnlock = await this.showUnlockPrompt(data.message, data.origin);
    
    if (shouldUnlock) {
      // Open extension popup for unlock
      try {
        const extensionId = (chrome.runtime as any)?.id || (browser.runtime as any)?.id;
        if (extensionId) {
          const popupUrl = `chrome-extension://${extensionId}/popup.html?unlock=true&origin=${encodeURIComponent(data.origin)}`;
          window.open(popupUrl, '_blank', 'width=400,height=600');
        }
      } catch (error) {
        console.warn('Failed to open extension popup:', error);
      }

      // Wait for unlock and retry
      return new Promise((resolve, reject) => {
        const checkUnlock = async () => {
          try {
            // Check if wallet is now unlocked
            const retryResponse = await this.sendToBackground('DAPP_REQUEST', {
              method,
              params,
              origin: window.location.origin,
              retryAfterUnlock: true
            });

            if (retryResponse.success) {
              resolve(retryResponse.data);
            } else if (retryResponse.error === 'WALLET_UNLOCK_REQUIRED') {
              // Still locked, check again in 1 second
              setTimeout(checkUnlock, 1000);
            } else {
              reject(new Error(retryResponse.data?.message || retryResponse.error));
            }
          } catch (error) {
            reject(error);
          }
        };

        // Start checking after 2 seconds
        setTimeout(checkUnlock, 2000);
        
        // Timeout after 60 seconds
        setTimeout(() => {
          reject(new Error('Unlock timeout - please try again'));
        }, 60000);
      });
    } else {
      // User declined to unlock
      throw new Error('User rejected the request');
    }
  }

  private static async showUnlockPrompt(message: string, origin: string): Promise<boolean> {
    // Create a simple confirmation dialog
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;

      modal.innerHTML = `
        <div style="
          background: white;
          padding: 24px;
          border-radius: 12px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        ">
          <h3 style="margin: 0 0 16px 0; color: #333;">Wallet Connection Required</h3>
          <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
            ${message}<br><br>
            <strong>${origin}</strong> wants to connect to your wallet.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="unlock-cancel" style="
              padding: 10px 20px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 6px;
              cursor: pointer;
            ">Cancel</button>
            <button id="unlock-confirm" style="
              padding: 10px 20px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">Unlock Wallet</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle button clicks
      modal.querySelector('#unlock-confirm')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });

      modal.querySelector('#unlock-cancel')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });

      // Handle background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(false);
        }
      });
    });
  }

  private static handleNoWallet(data: any): never {
    throw new Error('No Ethereum wallet found. Please install Paycio wallet extension.');
  }

  private static async sendToBackground(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const message = { type, ...data };
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else if (typeof browser !== 'undefined' && browser.runtime) {
        (browser.runtime.sendMessage as any)(message).then(resolve).catch(reject);
      } else {
        reject(new Error('Browser runtime not available'));
      }
    });
  }
}

// Initialize the content script
new PaycioContentScript();

// Expose DApp connection manager to window for provider access
(window as any).DAppConnectionManager = DAppConnectionManager;