// Complete DApp integration with locked wallet handling
(function() {
  'use strict';
  
  console.log('Paycio wallet content script loaded');

  // Prevent multiple injections
  if (window.paycioInjected) {
    return;
  }
  window.paycioInjected = true;

  // DApp connection manager with locked wallet handling
  class PaycioDAppManager {
    static pendingRequests = new Map();
    
    static async handleRequest(method, params = []) {
      try {
        console.log(`Paycio DApp request: ${method}`);

        // Send to background script
        const response = await this.sendToBackground('DAPP_REQUEST', {
          method,
          params,
          origin: window.location.origin,
          timestamp: Date.now()
        });

        // Handle unlock requirement
        if (!response.success && response.error === 'WALLET_UNLOCK_REQUIRED') {
          return await this.handleUnlockRequired(response.data, method, params);
        }

        // Handle no wallet
        if (!response.success && response.error === 'NO_WALLET') {
          throw this.createEIP1193Error(4100, 'No Ethereum provider found. Please install Paycio wallet.');
        }

        // Handle other errors
        if (!response.success) {
          throw this.createEIP1193Error(
            response.data?.code || -32603,
            response.data?.message || response.error
          );
        }

        return response.data;

      } catch (error) {
        console.error('Paycio DApp request failed:', error);
        throw error;
      }
    }

    static async handleUnlockRequired(data, method, params) {
      console.log('Wallet unlock required for:', method);

      // Show user-friendly unlock prompt
      const shouldUnlock = await this.showUnlockPrompt(data);
      
      if (!shouldUnlock) {
        throw this.createEIP1193Error(4001, 'User rejected the request.');
      }

      // Trigger unlock popup in extension
      this.triggerExtensionUnlock(data);

      // Wait for unlock and retry
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        const checkUnlock = async () => {
          attempts++;
          
          try {
            // Retry the original request
            const retryResponse = await this.sendToBackground('DAPP_REQUEST', {
              method,
              params,
              origin: window.location.origin,
              retryAfterUnlock: true
            });

            if (retryResponse.success) {
              resolve(retryResponse.data);
            } else if (retryResponse.error === 'WALLET_UNLOCK_REQUIRED' && attempts < maxAttempts) {
              // Still locked, try again
              setTimeout(checkUnlock, 1000);
            } else {
              reject(this.createEIP1193Error(
                retryResponse.data?.code || 4100,
                retryResponse.data?.message || 'Unlock failed or timed out'
              ));
            }
          } catch (error) {
            reject(error);
          }
        };

        // Start checking after 2 seconds
        setTimeout(checkUnlock, 2000);
      });
    }

    static async showUnlockPrompt(data) {
      return new Promise((resolve) => {
        // Create unlock prompt modal
        const modal = this.createUnlockModal(data, resolve);
        document.body.appendChild(modal);
      });
    }

    static createUnlockModal(data, callback) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const hostname = window.location.hostname;
      const requestTypeText = data.requestType === 'signing' ? 'sign a message' : 
                             data.requestType === 'transaction' ? 'send a transaction' : 'connect';

      modal.innerHTML = `
        <div style="
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          text-align: center;
        ">
          <div style="
            width: 64px;
            height: 64px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            border-radius: 50%;
            margin: 0 auto 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          
          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
            Wallet Connection Required
          </h2>
          
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
            <strong>${hostname}</strong> wants to ${requestTypeText}
          </p>
          
          <p style="margin: 0 0 24px 0; color: #888; font-size: 12px;">
            Your wallet is currently locked for security.
          </p>
          
          <div style="display: flex; gap: 12px;">
            <button id="paycio-cancel" style="
              flex: 1;
              padding: 12px;
              background: #f5f5f5;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              color: #666;
            ">Cancel</button>
            <button id="paycio-unlock" style="
              flex: 1;
              padding: 12px;
              background: linear-gradient(45deg, #667eea, #764ba2);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
            ">Unlock Wallet</button>
          </div>
        </div>
      `;

      // Add event listeners
      const cancelBtn = modal.querySelector('#paycio-cancel');
      const unlockBtn = modal.querySelector('#paycio-unlock');

      cancelBtn?.addEventListener('click', () => {
        document.body.removeChild(modal);
        callback(false);
      });

      unlockBtn?.addEventListener('click', () => {
        document.body.removeChild(modal);
        callback(true);
      });

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          callback(false);
        }
      });

      return modal;
    }

    static triggerExtensionUnlock(data) {
      try {
        // Try to dispatch event to extension popup
        window.dispatchEvent(new CustomEvent('dapp_unlock_required', {
          detail: {
            origin: data.origin,
            requestType: data.requestType || 'connect'
          }
        }));

        // Try to open extension popup
        const extensionId = this.getExtensionId();
        if (extensionId) {
          const popupUrl = `chrome-extension://${extensionId}/popup.html?unlock=true&origin=${encodeURIComponent(data.origin)}`;
          
          // Try to open in a small popup window
          try {
            window.open(popupUrl, 'paycio_unlock', 'width=400,height=600,scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no');
          } catch (popupError) {
            console.warn('Failed to open popup window:', popupError);
          }
        }
      } catch (error) {
        console.warn('Failed to trigger extension unlock:', error);
      }
    }

    static getExtensionId() {
      try {
        // Try to get extension ID from various sources
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          return chrome.runtime.id;
        }
        if (typeof browser !== 'undefined' && browser.runtime?.id) {
          return browser.runtime.id;
        }
        return null;
      } catch (error) {
        return null;
      }
    }

    static async sendToBackground(type, data) {
      return new Promise((resolve, reject) => {
        const message = { type, ...data };
        
        const sendWithRuntime = (runtime) => {
          runtime.sendMessage(message, (response) => {
            if (runtime.lastError) {
              reject(new Error(runtime.lastError.message));
            } else if (!response) {
              reject(new Error('No response from extension'));
            } else {
              resolve(response);
            }
          });
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          sendWithRuntime(chrome);
        } else if (typeof browser !== 'undefined' && browser.runtime) {
          browser.runtime.sendMessage(message).then(resolve).catch(reject);
        } else {
          reject(new Error('Extension runtime not available'));
        }
      });
    }

    static createEIP1193Error(code, message) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
  }

  // Create Ethereum provider
  const paycioProvider = {
    isPaycio: true,
    isMetaMask: false, // For compatibility
    chainId: '0x1',
    networkVersion: '1',
    selectedAddress: null,
    
    // EIP-1193 request method
    async request({ method, params = [] }) {
      return PaycioDAppManager.handleRequest(method, params);
    },

    // Legacy methods for compatibility
    async enable() {
      return this.request({ method: 'eth_requestAccounts' });
    },

    async send(method, params) {
      if (typeof method === 'string') {
        return this.request({ method, params });
      } else {
        // Handle legacy sendAsync format
        return this.request(method);
      }
    },

    // Event emitter methods (basic implementation)
    on(eventName, listener) {
      window.addEventListener(`paycio_${eventName}`, listener);
    },

    removeListener(eventName, listener) {
      window.removeEventListener(`paycio_${eventName}`, listener);
    },

    // Auto-detect method for dApps
    autoRefreshOnNetworkChange: false
  };

  // Inject the provider
  Object.defineProperty(window, 'ethereum', {
    value: paycioProvider,
    writable: false,
    configurable: false
  });

  // Announce provider
  window.dispatchEvent(new Event('ethereum#initialized'));
  
  // Dispatch provider event for dApps that listen for it
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'paycio-wallet',
          name: 'Paycio',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiM2NjdlZWEiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDFMMyA1djZjMCA1LjU1IDMuODQgMTAuNzQgOSAxMiA1LjE2LTEuMjYgOS02LjQ1IDktMTJWNWwtOS00eiIvPjwvc3ZnPg==',
          rdns: 'com.paycio.wallet'
        },
        provider: paycioProvider
      }
    }));
  }, 100);

  console.log('Paycio wallet provider injected successfully');
})();

