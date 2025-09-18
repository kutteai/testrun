// injected.js - Final Fixed PayCio Wallet Injection Script

(function() {
  'use strict';
  
  console.log('🚀 PayCio Injected: Script starting...');

  // Message handler with better retry logic and less aggressive messaging
  class MessageHandler {
    private pendingRequests = new Map();
    private requestId = 0;
    private isContentScriptReady = false;
    private readyCheckAttempts = 0;
    private maxReadyCheckAttempts = 5;
    
    constructor() {
      // Listen for content script ready signal
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'PAYCIO_CONTENT_SCRIPT_READY') {
          this.isContentScriptReady = true;
          console.log('✅ PayCio Injected: Content script ready');
        }
      });
      
      // More conservative ready check - only try a few times
      this.checkContentScriptReady();
    }
    
    async checkContentScriptReady(): Promise<void> {
      if (this.readyCheckAttempts >= this.maxReadyCheckAttempts) {
        console.log('⚠️ PayCio Injected: Assuming content script is ready after max attempts');
        this.isContentScriptReady = true;
        return;
      }
      
      if (!this.isContentScriptReady) {
        this.readyCheckAttempts++;
        console.log(`🔍 PayCio Injected: Checking content script readiness (attempt ${this.readyCheckAttempts})`);
        
        // Send a single test message to check if content script is responsive
        const testId = `ready_check_${this.readyCheckAttempts}_${Date.now()}`;
        
        let testResolved = false;
        const testHandler = (event: MessageEvent) => {
          if (event.data?.type === 'PAYCIO_TEST_RESPONSE' && event.data?.id === testId && !testResolved) {
            testResolved = true;
            window.removeEventListener('message', testHandler);
            this.isContentScriptReady = true;
            console.log('✅ PayCio Injected: Content script confirmed ready via test message');
          }
        };
        
        window.addEventListener('message', testHandler);
        
        // Send test message
        window.postMessage({
          type: 'PAYCIO_TEST_MESSAGE',
          id: testId
        }, '*');
        
        // Wait for response or timeout
        setTimeout(() => {
          if (!testResolved) {
            testResolved = true;
            window.removeEventListener('message', testHandler);
            
            if (this.readyCheckAttempts < this.maxReadyCheckAttempts) {
              // Try again after a delay
              setTimeout(() => this.checkContentScriptReady(), 1000);
            } else {
              // Give up and assume ready
              this.isContentScriptReady = true;
              console.log('⚠️ PayCio Injected: Content script test timeout, assuming ready');
            }
          }
        }, 2000);
      }
    }
    
    generateId(): string {
      return `paycio_${++this.requestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async waitForContentScript(maxWait = 10000): Promise<void> {
      const startTime = Date.now();
      while (!this.isContentScriptReady && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    async sendMessage(type: string, payload: any, timeout = 30000): Promise<any> {
      // Wait for content script to be ready
      await this.waitForContentScript();
      
      if (!this.isContentScriptReady) {
        throw new Error('Content script not ready after timeout');
      }
      
      return new Promise((resolve, reject) => {
        const id = this.generateId();
        
        console.log(`📤 PayCio Injected: Sending ${type} with ID ${id}`);
        
        const timeoutId = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${type} (${id})`));
        }, timeout);
        
        this.pendingRequests.set(id, { resolve, reject, timeoutId });
        
        window.postMessage({
          type: type,
          id: id,
          ...payload
        }, '*');
      });
    }
    
    handleResponse(event: MessageEvent): void {
      const { data } = event;
      
      if (!data || !data.id) return;
      
      const pending = this.pendingRequests.get(data.id);
      if (!pending) return;
      
      console.log(`📥 PayCio Injected: Response received for ${data.id}`);
      
      clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(data.id);
      
      if (data.success !== false) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(data.error || 'Request failed'));
      }
    }
  }
  
  const messageHandler = new MessageHandler();
  
  // Wallet state management
  class WalletState {
    public isConnected = false;
    public selectedAddress: string | null = null;
    public chainId = '0x1';
    public accounts: string[] = [];
    private eventListeners = new Map();
    
    setConnected(address: string) {
      const wasConnected = this.isConnected;
      this.isConnected = true;
      this.selectedAddress = address;
      this.accounts = [address];
      
      console.log(`✅ PayCio Injected: Wallet connected to ${address}`);
      
      if (!wasConnected) {
        this.emit('connect', { chainId: this.chainId });
      }
      
      this.emit('accountsChanged', this.accounts);
    }
    
    setDisconnected() {
      this.isConnected = false;
      this.selectedAddress = null;
      this.accounts = [];
      
      console.log('🔒 PayCio Injected: Wallet disconnected');
      
      this.emit('accountsChanged', []);
      this.emit('disconnect', {});
    }
    
    setChain(chainId: string) {
      const oldChainId = this.chainId;
      this.chainId = chainId;
      
      if (oldChainId !== chainId) {
        this.emit('chainChanged', chainId);
      }
    }
    
    on(event: string, callback: Function) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
    }
    
    removeListener(event: string, callback: Function) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
    
    emit(event: string, data: any) {
      console.log(`📡 PayCio Injected: Emitting ${event}:`, data);
      const listeners = this.eventListeners.get(event);
      if (listeners && listeners.length > 0) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('PayCio: Event listener error:', error);
          }
        });
      }
    }
  }
  
  const walletState = new WalletState();
  
  // Enhanced UI Manager
  class UIManager {
    static createModal(content: string) {
      const modal = document.createElement('div');
      modal.className = 'paycio-modal';
      modal.innerHTML = `
        <div class="paycio-modal-overlay">
          <div class="paycio-modal-content">
            ${content}
          </div>
        </div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        .paycio-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .paycio-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: paycio-fade-in 0.2s ease-out;
        }
        .paycio-modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
          animation: paycio-slide-up 0.3s ease-out;
        }
        .paycio-button {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }
        .paycio-button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.39);
        }
        .paycio-button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.5);
        }
        .paycio-button-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .paycio-button-secondary {
          background: #f8f9fa;
          color: #495057;
          border: 2px solid #e9ecef;
        }
        .paycio-button-secondary:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }
        @keyframes paycio-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes paycio-slide-up {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(modal);
      
      return modal;
    }
    
    static async showConnectionRequest(): Promise<boolean> {
      return new Promise((resolve) => {
        const modal = UIManager.createModal(`
          <div style="text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM11 15H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2z"/>
                <path d="M8 11h8v2H8z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 600;">Connect to PayCio Wallet</h3>
            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
              <strong>${window.location.hostname}</strong> wants to connect to your wallet.
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="paycio-button paycio-button-secondary" style="flex: 1;" onclick="this.closest('.paycio-modal').remove(); window.paycioResolve(false);">
              Cancel
            </button>
            <button class="paycio-button paycio-button-primary" style="flex: 1;" onclick="this.closest('.paycio-modal').remove(); window.paycioResolve(true);">
              Connect
            </button>
          </div>
        `);
        
        (window as any).paycioResolve = resolve;
        
        modal.onclick = (e: Event) => {
          if (e.target === modal.querySelector('.paycio-modal-overlay')) {
            modal.remove();
            resolve(false);
          }
        };
      });
    }
    
    static async showUnlockRequest(): Promise<boolean> {
      return new Promise((resolve) => {
        const modal = UIManager.createModal(`
          <div style="text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M6 10v-4a6 6 0 1 1 12 0v4h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h8v-4a4 4 0 1 0-8 0v4z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 600;">Unlock PayCio Wallet</h3>
            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
              Enter your password to continue
            </p>
          </div>
          <div style="margin: 20px 0;">
            <input type="password" id="paycio-unlock-password" placeholder="Wallet password" 
                   style="width: 100%; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; outline: none; transition: all 0.2s; box-sizing: border-box;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
            <div id="paycio-unlock-error" style="color: #ef4444; font-size: 14px; margin-top: 8px; display: none;"></div>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="paycio-button paycio-button-secondary" style="flex: 1;" onclick="this.closest('.paycio-modal').remove(); window.paycioResolveUnlock(false);">
              Cancel
            </button>
            <button class="paycio-button paycio-button-primary" style="flex: 1;" id="paycio-unlock-btn" disabled onclick="window.paycioAttemptUnlock()">
              Unlock
            </button>
          </div>
        `);
        
        const passwordInput = modal.querySelector('#paycio-unlock-password') as HTMLInputElement;
        const unlockBtn = modal.querySelector('#paycio-unlock-btn') as HTMLButtonElement;
        const errorDiv = modal.querySelector('#paycio-unlock-error') as HTMLDivElement;

        (window as any).paycioAttemptUnlock = async () => {
          const password = passwordInput.value.trim();
          if (!password) return;

          unlockBtn.disabled = true;
          unlockBtn.textContent = 'Unlocking...';
          errorDiv.style.display = 'none';

          try {
            const response = await messageHandler.sendMessage('PAYCIO_UNLOCK_WALLET', { password });
            
            if (response && response.success) {
              modal.remove();
              resolve(true);
            } else {
              throw new Error(response?.error || 'Invalid password');
            }
          } catch (error) {
            errorDiv.textContent = 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock';
            passwordInput.focus();
          }
        };

        passwordInput?.addEventListener('input', () => {
          const hasPassword = passwordInput.value.trim().length > 0;
          unlockBtn.disabled = !hasPassword;
          unlockBtn.style.opacity = hasPassword ? '1' : '0.5';
          errorDiv.style.display = 'none';
        });

        passwordInput?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !unlockBtn.disabled) {
            (window as any).paycioAttemptUnlock();
          }
        });

        (window as any).paycioResolveUnlock = resolve;
        setTimeout(() => passwordInput?.focus(), 100);
      });
    }

    static async showWalletUnlockNotification(message: string): Promise<void> {
      return new Promise((resolve) => {
        const modal = UIManager.createModal(`
          <div style="text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 600;">Wallet Popup Opened</h3>
            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
              ${message}
            </p>
            <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 12px; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 13px; color: #4b5563;">
                💡 <strong>Tip:</strong> Look for the PayCio wallet popup window. If you don't see it, check if popup blockers are enabled.
              </p>
            </div>
            <button class="paycio-button paycio-button-primary" style="width: 100%;" onclick="this.closest('.paycio-modal').remove(); window.paycioResolveNotification();">
              I understand, waiting for unlock...
            </button>
          </div>
        `);

        (window as any).paycioResolveNotification = () => {
          modal.remove();
          resolve();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          if (document.body.contains(modal)) {
            modal.remove();
            resolve();
          }
        }, 10000);
      });
    }
  }
  
  // Enhanced Ethereum provider
  const provider: any = {
    isPayCio: true,
    isPayCioWallet: true,
    isMetaMask: false,
    
    chainId: walletState.chainId,
    selectedAddress: walletState.selectedAddress,
    
    isConnected(): boolean {
      return walletState.isConnected;
    },
    
    async request(args: any): Promise<any> {
      try {
        console.log('🔍 PayCio Provider: Request:', args.method);
        
        const { method, params = [] } = args;
        
        switch (method) {
          case 'eth_requestAccounts':
            return await this.handleAccountsRequest();
            
          case 'eth_accounts':
            return walletState.accounts;
            
          case 'eth_chainId':
            return walletState.chainId;
            
          case 'net_version':
            return parseInt(walletState.chainId, 16).toString();
            
          default:
            return await this.forwardToWallet(method, params);
        }
      } catch (error) {
        console.error('PayCio Provider: Request failed:', error);
        throw error;
      }
    },
    
    async handleAccountsRequest(): Promise<string[]> {
      console.log('🔍 PayCio Provider: Handling account request');
      
      if (walletState.isConnected) {
        console.log('✅ Already connected, returning existing accounts');
        return walletState.accounts;
      }
      
      try {
        // Step 1: Check wallet status first
        console.log('📡 Checking wallet status...');
        const statusResponse = await messageHandler.sendMessage('PAYCIO_CHECK_WALLET_STATUS', {});
        
        console.log('📥 Wallet status response:', statusResponse);
        
        if (!statusResponse.success) {
          throw new Error('Failed to check wallet status: ' + (statusResponse.error || 'Unknown error'));
        }
        
        const status = statusResponse.result || statusResponse.data || statusResponse;
        
        if (!status.hasWallet) {
          throw new Error('PayCio wallet is not installed or configured. Please set up your wallet first.');
        }
        
        // Step 2: Show connection approval first
        console.log('🔐 Showing connection approval modal');
        const userApproved = await UIManager.showConnectionRequest();
        if (!userApproved) {
          throw new Error('User rejected the connection request');
        }
        
        // Step 3: Request accounts - this will handle wallet unlocking automatically
        console.log('📡 Requesting accounts from wallet');
        const response = await messageHandler.sendMessage('PAYCIO_DAPP_REQUEST', {
          method: 'eth_requestAccounts'
        });
        
        console.log('📥 Account response:', response);
        
        // Handle wallet unlock requirement
        if (!response.success && response.error === 'WALLET_UNLOCK_REQUIRED') {
          console.log('🔒 Wallet popup launched for unlocking');
          
          if (response.popupLaunched) {
            // Show user-friendly message about wallet popup
            await UIManager.showWalletUnlockNotification(response.message);
            
            // Wait for wallet to be unlocked and retry
            console.log('⏳ Waiting for wallet unlock...');
            
            // Poll for wallet unlock status
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max wait
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              
              const retryResponse = await messageHandler.sendMessage('PAYCIO_DAPP_REQUEST', {
                method: 'eth_accounts'
              });
              
              if (retryResponse.success && retryResponse.result?.length > 0) {
                console.log('✅ Wallet unlocked and accounts retrieved');
                walletState.setConnected(retryResponse.result[0]);
                return retryResponse.result;
              }
              
              attempts++;
            }
            
            throw new Error('Wallet unlock timeout. Please try again.');
            
          } else {
            throw new Error(response.message || 'Wallet is locked. Please open the PayCio extension and unlock your wallet.');
          }
        } 
        
        // Handle other unlock requirements (fallback)
        if (!response.success && response.requiresUnlock) {
          console.log('🔒 Wallet locked, showing unlock modal');
          const unlocked = await UIManager.showUnlockRequest();
          if (!unlocked) {
            throw new Error('Wallet unlock was cancelled');
          }
          
          // Retry after unlock
          console.log('🔄 Retrying account request after unlock');
          const retryResponse = await messageHandler.sendMessage('PAYCIO_DAPP_REQUEST', {
            method: 'eth_accounts'
          });
          
          if (retryResponse.success && retryResponse.result?.length > 0) {
            walletState.setConnected(retryResponse.result[0]);
            return retryResponse.result;
          }
          
          throw new Error('Failed to get accounts after unlock');
        } 
        
        // Success case
        if (response.success && response.result?.length > 0) {
          walletState.setConnected(response.result[0]);
          return response.result;
        }
        
        throw new Error('No accounts available');
        
      } catch (error) {
        console.error('PayCio Provider: Account request failed:', error);
        throw error;
      }
    },
    
    async forwardToWallet(method: string, params: any[]): Promise<any> {
      try {
        const response = await messageHandler.sendMessage('PAYCIO_DAPP_REQUEST', {
          method: method,
          params: params
        });
        
        if (response.success) {
          return response.result;
        } else {
          throw new Error(response.error || 'Request failed');
        }
      } catch (error) {
        console.error('PayCio Provider: Forward failed:', error);
        throw error;
      }
    },
    
    on(event: string, callback: Function) {
      walletState.on(event, callback);
    },
    
    removeListener(event: string, callback: Function) {
      walletState.removeListener(event, callback);
    },
    
    enable(): Promise<string[]> {
      return this.request({ method: 'eth_requestAccounts' });
    },
    
    send(method: string, params: any[]): Promise<any> {
      return this.request({ method, params });
    },
    
    sendAsync(request: any, callback: (error: any, result: any) => void): void {
      this.request(request)
        .then(result => callback(null, { result }))
        .catch(error => callback(error, null));
    }
  };
  
  // Message event listener
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    const { data } = event;
    if (!data || !data.type) return;
    
    // Handle responses
    if (data.type.endsWith('_RESPONSE')) {
      messageHandler.handleResponse(event);
      return;
    }
    
    // Handle wallet events
    if (data.type === 'PAYCIO_WALLET_STATUS_CHANGED' && !data.isUnlocked) {
      walletState.setDisconnected();
    }
  });
  
  // AGGRESSIVE PROVIDER OVERRIDE SYSTEM
  console.log('🚀 PayCio: Starting aggressive provider override...');
  
  // CRITICAL: Save reference to existing providers before override
  const existingProviders: any[] = [];
  if ((window as any).ethereum) {
    existingProviders.push({
      provider: (window as any).ethereum,
      isMetaMask: (window as any).ethereum.isMetaMask,
      isCoinbaseWallet: (window as any).ethereum.isCoinbaseWallet,
      isTronLink: (window as any).ethereum.isTronLink,
      constructor: (window as any).ethereum.constructor?.name
    });
    console.log('🔍 PayCio: Existing providers saved:', existingProviders);
    
    // Store reference in our provider
    provider._originalProvider = (window as any).ethereum;
  }

  // STEP 1: Disable other wallets detection
  const disableOtherWallets = () => {
    // Disable MetaMask detection
    try {
      Object.defineProperty(window, 'isMetaMaskInstalled', {
        value: false,
        writable: false,
        configurable: false
      });
    } catch (e) {}
    
    // Disable other wallet flags
    ['isCoinbaseWallet', 'isTrust', 'isImToken', 'isBitKeep', 'isTronLink'].forEach(flag => {
      try {
        Object.defineProperty(window, flag, {
          value: false,
          writable: false,
          configurable: false
        });
      } catch (e) {}
    });
    
    console.log('✅ PayCio: Other wallet detection disabled');
  };

  // STEP 2: Aggressive window.ethereum override
  const overrideEthereum = () => {
    try {
      // Method 1: Delete existing property first
      try {
        delete (window as any).ethereum;
      } catch (e) {}
      
      // Method 2: Direct assignment
      (window as any).ethereum = provider;
      
      // Method 3: Force override with property descriptor
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
        configurable: false,
        enumerable: true
      });
      
      console.log('✅ PayCio: window.ethereum override successful');
      
      // Verify override worked
      if ((window as any).ethereum === provider && (window as any).ethereum.isPayCio) {
        console.log('✅ PayCio: Provider verification passed');
        return true;
  } else {
        console.warn('⚠️ PayCio: Provider verification failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ PayCio: window.ethereum override failed:', error);
      return false;
    }
  };

  // STEP 3: Provider detection override
  const overrideProviderDetection = () => {
    // Override common provider detection methods
    const originalQuerySelector = document.querySelector;
    const originalGetElementById = document.getElementById;
    
    document.querySelector = function(selector: any) {
      // Block MetaMask extension detection
      if (selector && typeof selector === 'string' && selector.includes('metamask')) {
        return null;
      }
      return originalQuerySelector.call(this, selector);
    };
    
    document.getElementById = function(id: string) {
      // Block extension element detection
      if (id && (id.includes('metamask') || id.includes('coinbase'))) {
        return null;
      }
      return originalGetElementById.call(this, id);
    };
    
    console.log('✅ PayCio: Provider detection methods overridden');
  };

  // STEP 4: Continuous override protection
  const protectOverride = () => {
    let overrideCount = 0;
    const maxOverrides = 10;
    
    const protectionInterval = setInterval(() => {
      if (overrideCount >= maxOverrides) {
        clearInterval(protectionInterval);
        console.log('✅ PayCio: Override protection stopped after max attempts');
        return;
      }
      
      // Check if our provider is still active
      if (!(window as any).ethereum?.isPayCio) {
        console.warn('⚠️ PayCio: Provider override detected, re-establishing...');
        overrideEthereum();
        overrideCount++;
      }
    }, 500); // Check every 500ms
    
    // Stop protection after 30 seconds
    setTimeout(() => {
      clearInterval(protectionInterval);
      console.log('✅ PayCio: Override protection timeout reached');
    }, 30000);
    
    console.log('✅ PayCio: Override protection activated');
  };

  // STEP 5: Execute override sequence
  const executeOverrideSequence = () => {
    console.log('🚀 PayCio: Starting aggressive override sequence...');
    
    // Step 1: Disable other wallets
    disableOtherWallets();
    
    // Step 2: Override ethereum provider
    const overrideSuccess = overrideEthereum();
    
    // Step 3: Override detection methods
    overrideProviderDetection();
    
    // Step 4: Protect our override
    if (overrideSuccess) {
      protectOverride();
    }
    
    console.log('✅ PayCio: Override sequence complete');
    
    // Final verification
    setTimeout(() => {
      console.log('🔍 PayCio: Final verification:', {
        'window.ethereum exists': !!(window as any).ethereum,
        'window.ethereum.isPayCio': (window as any).ethereum?.isPayCio,
        'window.ethereum === provider': (window as any).ethereum === provider,
        'request method available': typeof (window as any).ethereum?.request,
        'paycioWallet available': !!(window as any).paycioWallet
      });
    }, 1000);
  };

  // STEP 6: Multiple execution strategies
  const runMultipleStrategies = () => {
    // Strategy 1: Immediate execution
    executeOverrideSequence();
    
    // Strategy 2: DOM ready execution
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', executeOverrideSequence);
    }
    
    // Strategy 3: Window load execution
    window.addEventListener('load', executeOverrideSequence);
    
    // Strategy 4: Delayed execution (for late-loading wallets)
    setTimeout(executeOverrideSequence, 100);
    setTimeout(executeOverrideSequence, 500);
    setTimeout(executeOverrideSequence, 1000);
    
    console.log('✅ PayCio: Multiple override strategies deployed');
  };

  // Execute all strategies
  runMultipleStrategies();
  
  // Always install PayCio-specific reference
  Object.defineProperty(window, 'paycioWallet', {
    value: provider,
    writable: false,
    configurable: false,
    enumerable: true
  });
  
  // Add debug function
  (window as any).testPayCioOverride = () => {
    console.log('🧪 PayCio Override Test Results:');
    console.log('  window.ethereum exists:', !!(window as any).ethereum);
    console.log('  window.ethereum.isPayCio:', (window as any).ethereum?.isPayCio);
    console.log('  window.ethereum === provider:', (window as any).ethereum === provider);
    console.log('  request method type:', typeof (window as any).ethereum?.request);
    console.log('  isMetaMask:', (window as any).ethereum?.isMetaMask);
    console.log('  chainId available:', !!(window as any).ethereum?.chainId);
    
    // Test a request
    if ((window as any).ethereum?.request) {
      (window as any).ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => console.log('  ✅ eth_chainId test successful:', chainId))
        .catch((error: Error) => console.log('  ❌ eth_chainId test failed:', error.message));
    }
  };
  
  // EIP-6963 support
  const providerInfo = {
    uuid: 'paycio-wallet-' + crypto.randomUUID(),
    name: 'PayCio Wallet',
    icon: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#grad)"/>
        <path d="M16 8L24 16L16 24L8 16L16 8Z" fill="white"/>
      </svg>
    `),
    rdns: 'com.paycio.wallet'
  };
  
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: { info: providerInfo, provider }
  }));
  
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: { info: providerInfo, provider }
    }));
  });
  
  // Testing functions
  (window as any).testPayCioProvider = () => {
    console.log('🧪 PayCio Provider Test:');
    console.log('  - window.ethereum:', !!window.ethereum);
    console.log('  - request method:', !!(window.ethereum as any)?.request);
    console.log('  - isPayCio:', (window.ethereum as any)?.isPayCio);
    console.log('  - connected:', walletState.isConnected);
    console.log('  - accounts:', walletState.accounts);
    console.log('  - content script ready:', (messageHandler as any).isContentScriptReady);
    console.log('  - pending requests:', (messageHandler as any).pendingRequests.size);
    
    if ((window.ethereum as any)?.request) {
      console.log('  - Testing eth_chainId...');
      (window.ethereum as any).request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          console.log('✅ eth_chainId successful:', chainId);
        })
        .catch((error: Error) => {
          console.error('❌ eth_chainId failed:', error);
        });
    }
  };
  
  console.log('✅ PayCio: Secure wallet provider ready');
  console.log('🧪 PayCio: Run testPayCioProvider() in console to test');
  
})();