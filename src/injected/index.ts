import { storage } from '../utils/storage-utils';
import { crossBrowserSendMessage } from '../utils/runtime-utils';

// PayCio Wallet injection script - ENABLED
console.log('🚀 PayCio: Injection script ENABLED');
console.log('💉 PayCio Wallet injected and ready for DApp connections!');

// Toast notification function
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    max-width: 400px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  toast.textContent = message;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Animate in
        setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// Extension context validation
function validateExtensionContext(): boolean {
  try {
    // Check if we can access the extension runtime
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return true;
    }
    return false;
  } catch (error) {
    showToast('🔧 Extension context invalidated', 'error');
    return false;
  }
}

// Show recovery options when extension context is invalidated
function showRecoveryOptions() {
  showToast('🔧 Extension context invalidated - Please refresh the page', 'error');
  
  // Create a recovery button
  const recoveryDiv = document.createElement('div');
  recoveryDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #ff4444;
    border-radius: 12px;
    padding: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 400px;
  `;
  
  recoveryDiv.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #ff4444;">Extension Context Invalidated</h3>
    <p style="margin: 0 0 20px 0; color: #666;">The wallet extension context has been invalidated. This usually happens when the extension is reloaded or updated.</p>
    <button id="refresh-page-btn" style="
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 12px;
    ">Refresh Page</button>
    <button id="close-recovery-btn" style="
      background: #6c757d;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    ">Close</button>
  `;
  
  document.body.appendChild(recoveryDiv);
  
  // Add event listeners
  document.getElementById('refresh-page-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
  
  document.getElementById('close-recovery-btn')?.addEventListener('click', () => {
    document.body.removeChild(recoveryDiv);
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(recoveryDiv)) {
      document.body.removeChild(recoveryDiv);
    }
  }, 10000);
}

// Global state for dApp connection handling
let isWalletUnlocked = false;
let pendingConnectionRequests: Array<{
  id: string;
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

// Check wallet unlock status using the same method as other wallet requests
async function checkWalletUnlockStatus(): Promise<boolean> {
  try {
    console.log('PayCio: Checking wallet unlock status via background script...');
    
    // Use the same crossBrowserSendMessage method that works for other requests
    const response = await crossBrowserSendMessage({
      type: 'WALLET_REQUEST',
      method: 'check_wallet_status',
      params: []
    });
    
    console.log('PayCio: Wallet status response:', response);
    const isUnlocked = response?.success && response?.result?.isUnlocked;
        isWalletUnlocked = isUnlocked;
    console.log('PayCio: Wallet unlock status:', isUnlocked);
    
    return isUnlocked;
          } catch (error) {
    console.error('PayCio: Error checking wallet status:', error);
    isWalletUnlocked = false;
    return false;
  }
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

// Create wallet selection modal
function createWalletSelectionModal(): Promise<string | null> {
  return new Promise((resolve) => {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'paycio-wallet-selection-modal';
    modalContainer.style.cssText = `
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

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Select Account';
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    `;
    closeButton.onclick = () => {
      document.body.removeChild(modalContainer);
      resolve(null);
    };

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create accounts list
    const accountsList = document.createElement('div');
    accountsList.style.cssText = `
      margin-bottom: 24px;
    `;

    // Get wallet accounts from background script
    chrome.runtime.sendMessage({ type: 'GET_WALLET_ACCOUNTS' }, (response) => {
      if (response && response.success && response.accounts) {
        const accounts = response.accounts;
        
        if (accounts.length === 0) {
          const noAccounts = document.createElement('p');
          noAccounts.textContent = 'No accounts available';
          noAccounts.style.cssText = `
            text-align: center;
            color: #6b7280;
            padding: 20px;
          `;
          accountsList.appendChild(noAccounts);
            } else {
          accounts.forEach((account: any) => {
            const accountItem = document.createElement('div');
            accountItem.style.cssText = `
              padding: 16px;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              margin-bottom: 12px;
              cursor: pointer;
              transition: all 0.2s;
            `;

            const accountName = document.createElement('div');
            accountName.textContent = account.name || 'Account';
            accountName.style.cssText = `
              font-weight: 500;
              color: #111827;
              margin-bottom: 4px;
            `;

            const accountAddress = document.createElement('div');
            const address = account.addresses?.ethereum || account.address || 'No address';
            accountAddress.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
            accountAddress.style.cssText = `
              font-family: monospace;
              font-size: 14px;
              color: #6b7280;
            `;

            accountItem.appendChild(accountName);
            accountItem.appendChild(accountAddress);

            accountItem.onclick = () => {
              document.body.removeChild(modalContainer);
              resolve(address);
            };

            accountItem.onmouseover = () => {
              accountItem.style.borderColor = '#d1d5db';
              accountItem.style.backgroundColor = '#f9fafb';
            };

            accountItem.onmouseout = () => {
              accountItem.style.borderColor = '#e5e7eb';
              accountItem.style.backgroundColor = 'white';
            };

            accountsList.appendChild(accountItem);
          });
        }
      } else {
        const error = document.createElement('p');
        error.textContent = 'Failed to load accounts';
        error.style.cssText = `
          text-align: center;
          color: #ef4444;
          padding: 20px;
        `;
        accountsList.appendChild(error);
      }
    });

    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      width: 100%;
      padding: 12px;
      background: #f3f4f6;
      color: #374151;
      border: none;
      border-radius: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    cancelButton.onclick = () => {
      document.body.removeChild(modalContainer);
      resolve(null);
    };

    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = '#e5e7eb';
    };

    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = '#f3f4f6';
    };

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(accountsList);
    modalContent.appendChild(cancelButton);
    modalContainer.appendChild(modalContent);

    // Add to page
    document.body.appendChild(modalContainer);

    // Close on background click
    modalContainer.onclick = (e) => {
      if (e.target === modalContainer) {
        document.body.removeChild(modalContainer);
        resolve(null);
      }
    };
  });
}

// Create a simple unlock modal on the current page
function createUnlockModal(): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove any existing unlock modal
    const existingModal = document.getElementById('paycio-unlock-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Set a timeout to prevent modal from staying open indefinitely
    const timeoutId = setTimeout(() => {
      const modal = document.getElementById('paycio-unlock-modal');
      if (modal) {
        modal.remove();
        resolve(false);
      }
    }, 300000); // 5 minutes timeout

    // Create modal overlay
      const modal = document.createElement('div');
    modal.id = 'paycio-unlock-modal';
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
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(4px);
    `;

    // Create modal content (using WelcomeScreen design)
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
          background: white;
          border-radius: 16px;
          max-width: 400px;
          width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create blue header section (same as WelcomeScreen)
    const headerSection = document.createElement('div');
    headerSection.style.cssText = `
      height: 120px;
      background: #180CB2;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    
    // Yellow circle logo (same as WelcomeScreen)
    const logoCircle = document.createElement('div');
    logoCircle.style.cssText = `
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 48px;
      height: 48px;
      background: #D7FF1D;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    `;
    
    // Logo pattern (same as WelcomeScreen)
    const logoPattern = document.createElement('div');
    logoPattern.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    
    const line1 = document.createElement('div');
    line1.style.cssText = `
      width: 24px;
      height: 4px;
      background: #180CB2;
      border-radius: 2px;
    `;
    
    const line2 = document.createElement('div');
    line2.style.cssText = `
      width: 16px;
      height: 4px;
      background: #180CB2;
      border-radius: 2px;
    `;
    
    const line3 = document.createElement('div');
    line3.style.cssText = `
      width: 12px;
      height: 4px;
      background: #180CB2;
      border-radius: 2px;
    `;
    
    logoPattern.appendChild(line1);
    logoPattern.appendChild(line2);
    logoPattern.appendChild(line3);
    logoCircle.appendChild(logoPattern);
    headerSection.appendChild(logoCircle);

    // Create content section
    const contentSection = document.createElement('div');
    contentSection.style.cssText = `
      padding: 48px 32px 32px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    // Welcome back title (same as WelcomeScreen)
    const title = document.createElement('h1');
    title.style.cssText = `
      font-size: 30px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 8px 0;
      text-align: center;
      line-height: 35px;
      font-family: 'Inter', sans-serif;
    `;
    title.textContent = 'Welcome back';
    
    // Subtitle explaining the process
    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 32px 0;
      text-align: center;
      line-height: 24px;
    `;
    subtitle.textContent = 'Enter your password to unlock your wallet';

    // Create form (same styling as WelcomeScreen)
    const form = document.createElement('form');
    form.style.cssText = `
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    `;
    
    // Password label
    const passwordLabel = document.createElement('label');
    passwordLabel.style.cssText = `
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      text-align: left;
    `;
    passwordLabel.textContent = 'Password';
    
    // Password input container
    const passwordContainer = document.createElement('div');
    passwordContainer.style.cssText = `
      position: relative;
      width: 100%;
    `;
    
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Enter your password here';
    passwordInput.style.cssText = `
      width: 100%;
      padding: 16px 48px 16px 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      color: #111827;
      background: white;
      box-sizing: border-box;
      transition: all 0.2s;
    `;
    
    // Show/hide password toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
          border: none;
      cursor: pointer;
      padding: 4px;
      color: #6b7280;
    `;
    
    // Eye icon (simplified SVG)
    const eyeIcon = document.createElement('div');
    eyeIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
    toggleBtn.appendChild(eyeIcon);
    
    let showPassword = false;
    toggleBtn.addEventListener('click', () => {
      showPassword = !showPassword;
      passwordInput.type = showPassword ? 'text' : 'password';
      eyeIcon.innerHTML = showPassword ? `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      ` : `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    });
    
    // Focus styles
    passwordInput.addEventListener('focus', () => {
      passwordInput.style.outline = 'none';
      passwordInput.style.borderColor = '#3b82f6';
      passwordInput.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
    });
    
    passwordInput.addEventListener('blur', () => {
      passwordInput.style.borderColor = '#d1d5db';
      passwordInput.style.boxShadow = 'none';
    });
    
    passwordContainer.appendChild(passwordInput);
    passwordContainer.appendChild(toggleBtn);
    
    // Unlock button (same styling as WelcomeScreen)
    const unlockBtn = document.createElement('button');
    unlockBtn.type = 'submit';
    unlockBtn.textContent = 'Unlock Wallet';
    unlockBtn.style.cssText = `
      width: 100%;
      padding: 16px;
      background: #180CB2;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
          font-weight: 600;
          cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    
    unlockBtn.onmouseover = () => {
      unlockBtn.style.background = '#1409a0';
    };
    unlockBtn.onmouseout = () => {
      unlockBtn.style.background = '#180CB2';
    };
    
    form.appendChild(passwordLabel);
    form.appendChild(passwordContainer);
    form.appendChild(unlockBtn);

    // Create cancel button (same styling as WelcomeScreen)
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      width: 100%;
      padding: 16px;
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = '#f9fafb';
      cancelBtn.style.borderColor = '#9ca3af';
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = 'transparent';
      cancelBtn.style.borderColor = '#d1d5db';
    };

    // Handle form submission - use background script unlock (now uses same logic as WelcomeScreen)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput.value;
      
      if (!password.trim()) {
        alert('Please enter your password');
        return;
      }
      
      unlockBtn.textContent = 'Unlocking...';
      unlockBtn.disabled = true;
      
      try {
        // Show debugging info
        const debugInfo = `Password: ${password.length} chars, starts with space: ${password.startsWith(' ')}, ends with space: ${password.endsWith(' ')}`;
        alert(`🔍 Debug Info:\n${debugInfo}`);
        
        // Test connection to content script first (which bridges to background)
        alert('🔍 Testing connection to content script...');
        const testResponse = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          const testMessage = {
            type: 'PAYCIO_TEST_MESSAGE',
            id: messageId
          };
          
          const messageHandler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_TEST_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', messageHandler);
              resolve({ success: true, timestamp: event.data.timestamp });
            }
          };
          
          window.addEventListener('message', messageHandler);
          window.postMessage(testMessage, '*');
          
          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve({ success: false, error: 'Timeout' });
          }, 5000);
        });
        
        if ((testResponse as any)?.success) {
          alert('✅ Content script connection OK');
        } else {
          alert('❌ Content script connection failed');
        }
        
         // Debug: Show password comparison
        alert(`🔍 PASSWORD DEBUG:
        
Entered Password: "${password}"
Password Length: ${password.length}
Password Type: ${typeof password}

Sending unlock request through content script...`);

        // Also get and show wallet password for comparison
        try {
          const walletResponse = await new Promise((resolve) => {
            const messageId = Date.now().toString();
            const walletMessage = {
              type: 'PAYCIO_CHECK_WALLET_STATUS',
              id: messageId
            };
            
            const messageHandler = (event: MessageEvent) => {
              if (event.source !== window) return;
              if (event.data.type === 'PAYCIO_WALLET_STATUS_RESPONSE' && event.data.id === messageId) {
                window.removeEventListener('message', messageHandler);
                resolve(event.data);
              }
            };
            
            window.addEventListener('message', messageHandler);
            window.postMessage(walletMessage, '*');
            
            setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              resolve({ success: false, error: 'Timeout' });
            }, 5000);
          });

          // Get wallet password from background
          const passwordResponse = await new Promise((resolve) => {
            const messageId = Date.now().toString();
            const passwordMessage = {
              type: 'DEBUG_PASSWORD',
              id: messageId
            };
            
            const messageHandler = (event: MessageEvent) => {
              if (event.source !== window) return;
              if (event.data.type === 'PAYCIO_DEBUG_PASSWORD_RESPONSE' && event.data.id === messageId) {
                window.removeEventListener('message', messageHandler);
                resolve(event.data);
              }
            };
            
            window.addEventListener('message', messageHandler);
            window.postMessage(passwordMessage, '*');
            
            setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              resolve({ success: false, error: 'Timeout' });
            }, 5000);
          });

          if ((passwordResponse as any)?.success) {
            const passwordInfo = (passwordResponse as any).passwordInfo;
            alert(`🔑 WALLET PASSWORD DEBUG:

Stored Password: "${passwordInfo.walletPassword || 'N/A'}"
Stored Password Length: ${passwordInfo.walletPasswordLength || 'N/A'}
Stored Password Preview: "${passwordInfo.walletPasswordPreview || 'N/A'}"

Password Hash Preview: "${passwordInfo.passwordHashPreview || 'N/A'}"
Has Encrypted Seed Phrase: ${passwordInfo.hasEncryptedSeedPhrase}
Encrypted Seed Phrase Preview: "${passwordInfo.encryptedSeedPhrasePreview || 'N/A'}"`);
          }
          } catch (error) {
          alert(`❌ Error getting wallet password: ${error.message}`);
        }
        
        const response = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          const unlockMessage = {
            type: 'PAYCIO_SHOW_WALLET_UNLOCK_POPUP',
            id: messageId,
            password: password
          };
          
          const messageHandler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_WALLET_UNLOCK_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', messageHandler);
              resolve(event.data);
            }
          };
          
          window.addEventListener('message', messageHandler);
          window.postMessage(unlockMessage, '*');
          
          // Timeout after 10 seconds
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve({ success: false, error: 'Timeout' });
          }, 10000);
        });
        
        if ((response as any)?.success) {
          alert('✅ Wallet unlocked successfully!');
            clearTimeout(timeoutId);
              modal.remove();
              resolve(true);
            } else {
          // Show detailed error in alert
          const errorDetails = (response as any)?.error ? `\n\nError details: ${(response as any).error}` : '';
          alert(`❌ Unlock failed: ${(response as any)?.error || 'Unknown error'}${errorDetails}

🔍 Password comparison details should be shown in the alerts above.`);
          
          unlockBtn.textContent = 'Unlock Wallet';
          unlockBtn.disabled = false;
            }
          } catch (error) {
        alert(`❌ Unlock error: ${error.message || 'Unknown error'}`);
        unlockBtn.textContent = 'Unlock Wallet';
            unlockBtn.disabled = false;
      }
    });
    
    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      clearTimeout(timeoutId);
      modal.remove();
      resolve(false);
    });
    
    // Handle overlay click - but be more careful about accidental dismissals
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        // Only dismiss if user explicitly clicks the overlay, not if they're interacting with the modal
        const rect = modalContent.getBoundingClientRect();
        const isOutsideModal = e.clientX < rect.left || e.clientX > rect.right || 
                              e.clientY < rect.top || e.clientY > rect.bottom;
        if (isOutsideModal) {
          clearTimeout(timeoutId);
        modal.remove();
        resolve(false);
        }
      }
    });

    // Assemble modal (new structure)
    modalContent.appendChild(headerSection);
    modalContent.appendChild(contentSection);
    
    contentSection.appendChild(title);
    contentSection.appendChild(subtitle);
    contentSection.appendChild(form);
    contentSection.appendChild(cancelBtn);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    console.log('PayCio: Unlock modal created and added to DOM');
    
    // Focus password input
        setTimeout(() => {
      passwordInput.focus();
      console.log('PayCio: Password input focused');
    }, 100);
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

// Enhanced request handler with automatic wallet unlock
async function handleWalletRequest(method: string, params: any[]): Promise<any> {
  // Methods that should work even when wallet is locked
  const bypassLockMethods = ['eth_chainId', 'net_version', 'eth_accounts'];
  
  // Validate extension context first
  if (!validateExtensionContext()) {
    showRecoveryOptions();
    throw new Error('Extension context invalidated - please refresh the page and try again');
  }
  
  showToast(`🔧 Handling wallet request: ${method}`, 'info');
  
  // First, try the request directly
  try {
    const result = await processWalletRequest(method, params);
    return result;
  } catch (error: any) {
    // Handle extension context invalidation
    if (error.message.includes('Extension context invalidated')) {
      showRecoveryOptions();
      throw new Error('Extension context invalidated - please refresh the page and try again');
    }
    
    // If the error is "Wallet is locked" and it's not a bypass method, try to unlock
    if (error.message === 'Wallet is locked' && !bypassLockMethods.includes(method)) {
      console.log('🔍 PayCio: Wallet is locked, attempting to unlock...');
      
      // Check current unlock status
      const isUnlocked = await checkWalletUnlockStatus();
      if (!isUnlocked) {
        console.log('🔍 PayCio: Showing unlock modal...');
        const unlockSuccess = await createUnlockModal();
        
        if (unlockSuccess) {
          console.log('🔍 PayCio: Wallet unlocked successfully, retrying request...');
          // Retry the request after unlock
          return await processWalletRequest(method, params);
      } else {
          throw new Error('User cancelled wallet unlock');
        }
      }
    }
    
    // Re-throw the original error
    throw error;
  }
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
        
        // Show unlock modal
        const unlockSuccess = await createUnlockModal();
        
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
    
    // Process the request with automatic unlock handling
    try {
      const result = await handleWalletRequest(args.method, args.params || []);
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
          
          // Show unlock modal
          const unlockSuccess = await createUnlockModal();
          
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
      
      // Process the request with automatic unlock handling
      try {
        const result = await handleWalletRequest(payload.method, payload.params || []);
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
    // Allow WalletConnect connections to work properly
    if (url.includes('relay.walletconnect.org') ||
        url.includes('relay.walletconnect.com') ||
        url.includes('wallet-connector')) {
      
      console.log('PayCio: Allowing WalletConnect WebSocket connection to:', url);
      
      // Create WebSocket normally for WalletConnect
        const ws = new originalWebSocket(url, protocols);
        
        // Add proper error handling for WalletConnect connections
        ws.addEventListener('error', (event) => {
          console.log('WalletConnect WebSocket error (handled):', event);
        });
        
        ws.addEventListener('close', (event) => {
          console.log('WalletConnect WebSocket closed:', event.code, event.reason);
        });
        
        return ws;
    }
    
    // Block only Binance connections that cause issues
    if (url.includes('nbstream.binance.com')) {
      console.log('PayCio: Blocking problematic Binance WebSocket connection to:', url);
        throw new Error(`WebSocket connection blocked for: ${url}`);
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
    console.log('PayCio: Creating confirmation popup:', message);
    
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
    
    const icon = document.createElement('img');
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: block;
      margin-right: 12px;
      object-fit: contain;
    `;
    // Try to get the logo URL, with fallback for local testing
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        icon.src = chrome.runtime.getURL('assets/logo.png');
          } else {
        // Fallback for local testing - use a data URL or placeholder
        icon.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
        }
      } catch (error) {
      // Fallback if chrome.runtime is not available
      icon.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
    }
    icon.alt = 'PayCio Wallet';
    
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
    isPayCio: true,
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
          const messageId = Date.now().toString();
          console.log('🔍 PayCio: getRealWalletAddress called with ID:', messageId);
          
          // Send message to content script to get wallet address
          window.postMessage({
            type: 'PAYCIO_GET_WALLET_ADDRESS',
            id: messageId
          }, '*');
          
          // Listen for response
          const handleMessage = (event: MessageEvent) => {
            console.log('🔍 PayCio: Received message in getRealWalletAddress:', event.data);
            if (event.source !== window) return;
            if (event.data.type === 'PAYCIO_WALLET_ADDRESS_RESPONSE' && event.data.id === messageId) {
              window.removeEventListener('message', handleMessage);
              console.log('📨 PayCio: Received wallet address response:', event.data);
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
          
          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            console.log('⚠️ PayCio: Timeout getting wallet address');
            resolve(null);
          }, 5000);
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
        case 'eth_accounts': {
          // If we have a selected address, return it, otherwise try to get the real wallet address
          if (provider.selectedAddress) {
            return [provider.selectedAddress];
          }
          
          // Try to get the real wallet address from the background script
          try {
            const realAddress = await provider.getRealWalletAddress();
            if (realAddress) {
              provider.selectedAddress = realAddress;
              provider._state.accounts = [realAddress];
              return [realAddress];
            }
          } catch (error) {
            console.log('🔍 PayCio: Could not get real wallet address for eth_accounts:', error);
          }
          
          return provider._state.accounts;
        }
          
        case 'eth_requestAccounts':
          console.log('PayCio: Connection request received');
          
          return new Promise(async (resolve, reject) => {
            // Check if wallet is unlocked first
            const isUnlocked = await checkWalletUnlockStatus();
            console.log('PayCio: Wallet unlock status:', isUnlocked);
            
            if (!isUnlocked) {
              console.log('PayCio: Wallet is locked, showing unlock popup...');
              try {
              const unlockSuccess = await createUnlockModal();
                console.log('PayCio: Unlock modal result:', unlockSuccess);
              if (!unlockSuccess) {
                  console.log('PayCio: User cancelled wallet unlock');
                reject(new Error('User cancelled wallet unlock'));
      return;
                }
                console.log('PayCio: Wallet unlocked successfully, proceeding with connection');
              } catch (error) {
                console.error('PayCio: Error during unlock process:', error);
                reject(new Error('Failed to unlock wallet'));
                    return;
                  }
                }
                
            // Show wallet selection modal instead of simple confirmation
            try {
              const selectedAddress = await createWalletSelectionModal();
              if (selectedAddress) {
                provider.selectedAddress = selectedAddress;
                provider._state.accounts = [selectedAddress];
                console.log('✅ PayCio: Connected with selected address:', selectedAddress);
                resolve([selectedAddress]);
              } else {
                console.log('PayCio: User cancelled wallet selection');
                reject(new Error('User cancelled wallet selection'));
              }
            } catch (error) {
              console.error('PayCio: Error during wallet selection:', error);
              reject(new Error('Failed to select wallet'));
            }
          });
          
        case 'eth_chainId': {
          return handleWalletRequest('eth_chainId', []);
        }
          
        case 'eth_getBalance': {
          const address = (request.params && request.params[0]) || provider.selectedAddress;
          return handleWalletRequest('eth_getBalance', [address, 'latest']);
        }
          
        case 'net_version': {
          return handleWalletRequest('net_version', []);
        }
          
        case 'wallet_switchEthereumChain': {
          return handleWalletRequest('wallet_switchEthereumChain', request.params || []);
        }
          
        case 'wallet_addEthereumChain': {
          return handleWalletRequest('wallet_addEthereumChain', request.params || []);
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
          // Forward unknown/tx methods to background with automatic unlock handling
          return handleWalletRequest(request.method, request.params || []);
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
  
  // ENABLED: Inject Ethereum provider
  console.log('🚀 PayCio: Injecting Ethereum provider...');
  if (!(window as any).ethereum) {
    Object.defineProperty(window, 'ethereum', {
      value: provider,
        writable: false,
        configurable: false
      });
    console.log('✅ PayCio: Ethereum provider injected as window.ethereum');
  } else {
    console.log('⚠️ PayCio: window.ethereum already exists, intercepting...');
    // If ethereum already exists, add our provider to the list
    if ((window as any).ethereum.providers) {
      (window as any).ethereum.providers.push(provider);
    } else {
      (window as any).ethereum.providers = [provider];
    }
    console.log('✅ PayCio: Added to existing providers');
    
    // Also intercept the existing provider
    interceptEthereumProvider();
  }

  // Also inject as window.paycioWallet for direct access
  Object.defineProperty(window, 'paycioWallet', {
    value: provider,
          writable: false,
          configurable: false
  });

  // Announce provider to DApps (EIP-1193)
  console.log('📢 PayCio: Announcing provider to DApps...');
  window.dispatchEvent(new Event('ethereum#initialized'));
  
  // Also dispatch the standard provider detection event
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'paycio-wallet-uuid',
          name: 'PayCio Wallet',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgcng9IjgiIGZpbGw9IiMxODBDQjIiLz48L3N2Zz4=',
          rdns: 'app.paycio.wallet'
        },
        provider: provider
      }
    }));
    console.log('📢 PayCio: EIP-6963 provider announced');
  }, 100);
  
  // Set up provider ready state
  provider.isConnected = () => true;
  provider._state = {
    accounts: [],
    chainId: '0x1',
    isUnlocked: false,
    networkVersion: '1'
  };
  
  // Emit connect event when provider is ready
  setTimeout(() => {
    provider.emit('connect', { chainId: '0x1' });
    console.log('📢 PayCio: Provider connect event emitted');
  }, 200);

  // ========== MULTI-CHAIN PROVIDER SUPPORT ==========
  
  // Bitcoin Provider (for Bitcoin, Litecoin, Bitcoin Cash, etc.)
  const bitcoinProvider = {
    isBitcoin: true,
    isPayCio: true,
    chainId: 'bitcoin',
    networkVersion: 'mainnet',
    
    // Bitcoin-specific methods
    async getAccounts() {
      console.log('🔍 Bitcoin getAccounts called');
      try {
        const response = await crossBrowserSendMessage({
          type: 'GET_ACCOUNTS',
          blockchain: 'bitcoin'
        });
        return response.accounts || [];
      } catch (error) {
        console.error('Bitcoin getAccounts error:', error);
        return [];
      }
    },
    
    async getBalance(address?: string) {
      console.log('🔍 Bitcoin getBalance called for:', address);
      try {
        const response = await crossBrowserSendMessage({
          type: 'GET_BALANCE',
          blockchain: 'bitcoin',
          address
        });
        return response.balance || '0';
      } catch (error) {
        console.error('Bitcoin getBalance error:', error);
        return '0';
      }
    },
    
    async signTransaction(txData: any) {
      console.log('🔍 Bitcoin signTransaction called:', txData);
      try {
        const response = await crossBrowserSendMessage({
          type: 'SIGN_TRANSACTION',
          blockchain: 'bitcoin',
          transaction: txData
        });
        return response.signedTransaction;
      } catch (error) {
        console.error('Bitcoin signTransaction error:', error);
        throw error;
      }
    },
    
    async sendTransaction(txData: any) {
      console.log('🔍 Bitcoin sendTransaction called:', txData);
      try {
        const response = await crossBrowserSendMessage({
          type: 'SEND_TRANSACTION',
          blockchain: 'bitcoin',
          transaction: txData
        });
        return response.txHash;
    } catch (error) {
        console.error('Bitcoin sendTransaction error:', error);
        throw error;
      }
    },
    
    // Event emitter methods
    on: (event: string, callback: Function) => {
      console.log(`Bitcoin provider listening for ${event}`);
    },
    removeListener: (event: string, callback: Function) => {},
    emit: (event: string, data: any) => {
      console.log(`Bitcoin provider emitting ${event}:`, data);
    }
  };
  
  // Solana Provider
  const solanaProvider = {
    isSolana: true,
    isPayCio: true,
    isPhantom: false, // Don't conflict with Phantom
    chainId: 'solana',
    networkVersion: 'mainnet-beta',
    
    // Solana-specific methods
    async connect() {
      console.log('🔍 Solana connect called');
      try {
        const response = await crossBrowserSendMessage({
          type: 'CONNECT',
          blockchain: 'solana'
        });
        return { publicKey: response.publicKey };
      } catch (error) {
        console.error('Solana connect error:', error);
        throw error;
      }
    },
    
    async getAccount() {
      console.log('🔍 Solana getAccount called');
      try {
        const response = await crossBrowserSendMessage({
          type: 'GET_ACCOUNTS',
          blockchain: 'solana'
        });
        return response.accounts?.[0];
      } catch (error) {
        console.error('Solana getAccount error:', error);
        return null;
      }
    },
    
    async signTransaction(transaction: any) {
      console.log('🔍 Solana signTransaction called:', transaction);
      try {
        const response = await crossBrowserSendMessage({
          type: 'SIGN_TRANSACTION',
          blockchain: 'solana',
          transaction
        });
        return response.signedTransaction;
      } catch (error) {
        console.error('Solana signTransaction error:', error);
        throw error;
      }
    },
    
    async signAndSendTransaction(transaction: any) {
      console.log('🔍 Solana signAndSendTransaction called:', transaction);
      try {
        const response = await crossBrowserSendMessage({
          type: 'SEND_TRANSACTION',
          blockchain: 'solana',
          transaction
        });
        return { signature: response.signature };
      } catch (error) {
        console.error('Solana signAndSendTransaction error:', error);
        throw error;
      }
    },
    
    // Event emitter methods
    on: (event: string, callback: Function) => {
      console.log(`Solana provider listening for ${event}`);
    },
    removeListener: (event: string, callback: Function) => {},
    emit: (event: string, data: any) => {
      console.log(`Solana provider emitting ${event}:`, data);
    }
  };
  
  // Inject Bitcoin provider
  Object.defineProperty(window, 'bitcoin', {
    value: bitcoinProvider,
    writable: false,
    configurable: false
  });
  console.log('✅ PayCio: Bitcoin provider injected as window.bitcoin');
  
  // Inject Solana provider
  Object.defineProperty(window, 'solana', {
    value: solanaProvider,
    writable: false,
    configurable: false
  });
  console.log('✅ PayCio: Solana provider injected as window.solana');
  
  // Inject PayCio-specific multi-chain provider
  Object.defineProperty(window, 'paycio', {
    value: {
      ethereum: provider,
      bitcoin: bitcoinProvider,
      solana: solanaProvider,
      
      // Multi-chain methods
      async switchChain(chainType: string) {
        console.log('🔍 PayCio switchChain called:', chainType);
        try {
          const response = await crossBrowserSendMessage({
            type: 'SWITCH_CHAIN',
            chainType
          });
          return response.success;
        } catch (error) {
          console.error('PayCio switchChain error:', error);
          throw error;
        }
      },
      
      async getSupportedChains() {
        return ['ethereum', 'bitcoin', 'litecoin', 'solana', 'polygon', 'bsc'];
      },
      
      async getCurrentChain() {
        try {
          const response = await crossBrowserSendMessage({
            type: 'GET_CURRENT_CHAIN'
          });
          return response.chainType;
        } catch (error) {
          console.error('PayCio getCurrentChain error:', error);
          return 'ethereum';
        }
      }
    },
    writable: false,
    configurable: false
  });
  console.log('✅ PayCio: Multi-chain provider injected as window.paycio');

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
      // Support multiple chains
      const supportedChains = {
        1: 'ethereum',
        56: 'bsc',
        137: 'polygon',
        43114: 'avalanche',
        42161: 'arbitrum',
        10: 'optimism',
        250: 'fantom',
        25: 'cronos'
      };
      
      const chainName = supportedChains[chainId];
      if (!chainName) {
        throw new Error(`Chain ${chainId} not supported`);
      }
      
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        });
      return provider;
      } catch (error) {
        if (error.code === 4902) {
          // Chain not added, try to add it
          const chainConfigs = {
            56: {
              chainName: 'BNB Smart Chain',
              rpcUrls: ['https://bsc-dataseed.binance.org'],
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              blockExplorerUrls: ['https://bscscan.com']
            },
            137: {
              chainName: 'Polygon',
              rpcUrls: ['https://polygon-rpc.com'],
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              blockExplorerUrls: ['https://polygonscan.com']
            },
            43114: {
              chainName: 'Avalanche',
              rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
              nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
              blockExplorerUrls: ['https://snowtrace.io']
            },
            42161: {
              chainName: 'Arbitrum One',
              rpcUrls: ['https://arb1.arbitrum.io/rpc'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://arbiscan.io']
            },
            10: {
              chainName: 'Optimism',
              rpcUrls: ['https://mainnet.optimism.io'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://optimistic.etherscan.io']
            }
          };
          
          const config = chainConfigs[chainId];
          if (config) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}`, ...config }]
            });
            return provider;
          }
        }
        throw error;
      }
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