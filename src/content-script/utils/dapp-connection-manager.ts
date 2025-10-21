class DAppConnectionManager {
  private static pendingRequests = new Map<string, any>();

  static async handleDAppRequest(method: string, params: any[] = []): Promise<any> {
    try {

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
      // eslint-disable-next-line no-console
      console.error('DApp request failed:', error);
      throw error;
    }
  }

  private static async handleUnlockRequirement(data: any, method: string, params: any[]): Promise<any> {

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
        // eslint-disable-next-line no-console
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

  // SECURITY FIX: Removed duplicate handler methods

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

export { DAppConnectionManager };
