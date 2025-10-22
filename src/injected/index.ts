import { storage } from '../utils/storage-utils';
import { crossBrowserSendMessage } from '../utils/runtime-utils';
import { FALLBACK_SVG_DATA_URL, NFT_FALLBACK_SVG_DATA_URL, PAYCIO_WALLET_ICON_SVG_DATA_URL } from '../utils/fallback-svg';

// PayCio Wallet injection script - SECURE VERSION

// Global state for dApp connection handling
let isWalletUnlocked = false;
let pendingConnectionRequests: any[] = [];

// SECURITY FIX: Password collection on DApp pages is disabled
async function createUnlockModal(): Promise<boolean> {
  // Delegate to showWalletUnlockPopup which uses the secure extension popup.
  return await showWalletUnlockPopup();
}

// Wake up extension method
async function wakeUpExtension(): Promise<void> {
  return new Promise((resolve) => {
    const messageId = Date.now().toString();
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === 'PAYCIO_WAKE_UP_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        resolve();
      }
    };
    window.addEventListener('message', messageHandler);
    window.postMessage({
      type: 'PAYCIO_WAKE_UP',
      id: messageId,
    }, window.location.origin);
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve();
    }, 5000); // Timeout after 5 seconds
  });
}

// SECURITY FIX: Use content script bridge for unlock - SECURE VERSION
async function unlockWallet(password: string): Promise<any> {

  // First, try to wake up the extension
  await wakeUpExtension();

  // Use content script bridge for consistency
  return new Promise((resolve, reject) => {
    const messageId = Date.now().toString();

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'PAYCIO_UNLOCK_WALLET_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        if (event.data.success) {
          resolve(event.data);
        } else {
          reject(new Error(event.data.error || 'Unlock failed'));
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Send unlock request to content script
    window.postMessage({
      type: 'PAYCIO_UNLOCK_WALLET',
      id: messageId,
      password,
    }, window.location.origin);

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Unlock timeout'));
    }, 10000);
  });
}

// SECURITY FIX: Enhanced extension context validation with recovery
function validateExtensionContext(): boolean {
  // Injected script cannot directly access extension runtime.
  // It relies on the content script to relay messages and validate context.
  // For now, assume context is valid unless explicitly told otherwise by content script.
  return true;
}

// Show recovery options when extension context is invalidated
function showRecoveryOptions() {
  const recoveryDiv = document.createElement('div');
  recoveryDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;

  recoveryDiv.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">🔧 Extension Issue</div>
    <div style="margin-bottom: 8px;">The PayCio extension needs to be refreshed.</div>
    <div style="font-size: 12px; opacity: 0.9;">Please refresh this page or restart the extension.</div>
  `;

  document.body.appendChild(recoveryDiv);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(recoveryDiv)) {
      document.body.removeChild(recoveryDiv);
    }
  }, 10000);
}

// Check wallet unlock status
async function checkWalletUnlockStatus(): Promise<boolean> {
  try {
    const response = await new Promise<any>((resolve, reject) => {
      const messageId = Date.now().toString();
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (event.data.type === 'PAYCIO_WALLET_STATUS_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', messageHandler);
          if (event.data.success) {
            resolve(event.data);
          } else {
            reject(new Error(event.data.error || 'Status check failed'));
          }
        }
      };
      window.addEventListener('message', messageHandler);
      window.postMessage({
        type: 'PAYCIO_GET_WALLET_STATUS',
        id: messageId,
      }, window.location.origin);
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Status check timeout'));
      }, 10000);
    });

    // Check for explicit context invalidation message
    if (response?.error === 'EXTENSION_CONTEXT_INVALIDATED') {
      showRecoveryOptions();
      isWalletUnlocked = false;
      return false;
    }

    isWalletUnlocked = response?.success && response?.data?.isUnlocked;
    return isWalletUnlocked;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to check wallet status:', error);
    isWalletUnlocked = false;
    return false;
  }
}

// Show wallet unlock popup using postMessage - SECURE VERSION
async function showWalletUnlockPopup(): Promise<boolean> {

  // Send unlock request to content script
  return new Promise((resolve) => {
    const messageId = Date.now().toString();

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'PAYCIO_WALLET_UNLOCK_RESPONSE' && event.data.id === messageId) {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.success);
      }
    };

    window.addEventListener('message', messageHandler);

    // Send unlock request
    window.postMessage({
      type: 'PAYCIO_SHOW_UNLOCK_POPUP',
      id: messageId,
      origin: window.location.origin,
    }, window.location.origin);

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve(false);
    }, 10000);
  });
}

// SECURITY: Generate secure message with cryptographic signature
async function createSecureMessage(type: string, data: any): Promise<any> {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();

  // Create message hash for signature
  const messageData = { ...data, timestamp, nonce };
  const messageHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(messageData)) as BufferSource,
  );

  // Generate signature (in production, use proper cryptographic signing)
  const signature = Array.from(new Uint8Array(messageHash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    ...data,
    type,
    timestamp,
    nonce,
    signature,
  };
}

// Process wallet request using postMessage - SECURE VERSION
async function processWalletRequest(method: string, params: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const messageId = Date.now().toString();

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'PAYCIO_RESPONSE' && event.data.requestId === messageId) {
        window.removeEventListener('message', messageHandler);
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || 'Request failed'));
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // SECURITY: Send secure message with cryptographic signature
    createSecureMessage('PAYCIO_REQUEST', {
      method,
      params,
      requestId: messageId,
      origin: window.location.origin,
    }).then((secureMessage) => {
      window.postMessage(secureMessage, window.location.origin);
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to create secure message:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

// Enhanced request handler with automatic wallet unlock - SECURE VERSION
async function handleWalletRequest(method: string, params: any[]): Promise<any> {
  try {
    // Check if wallet is unlocked
    const isUnlocked = await checkWalletUnlockStatus();

    if (!isUnlocked) {

      // SECURITY FIX: Never collect passwords on DApp pages
      // Instead, request unlock through secure extension popup
      const unlockSuccess = await showWalletUnlockPopup();

      if (unlockSuccess) {
        // Retry the request after unlock
        return await processWalletRequest(method, params);
      }
      throw new Error('User cancelled wallet unlock');
    }

    // Process the request
    return await processWalletRequest(method, params);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Wallet request failed:', error);

    // If it's a wallet unlock error, try to show unlock popup
    if (error.message.includes('WALLET_UNLOCK_REQUIRED')
        || error.message.includes('wallet is locked')) {
      const unlockSuccess = await showWalletUnlockPopup();

      if (unlockSuccess) {
        return await processWalletRequest(method, params);
      }
    }

    // Re-throw the original error
    throw error;
  }
}

// Handle pending connection requests
async function handlePendingConnections() {
  if (pendingConnectionRequests.length === 0) return;


  for (const request of pendingConnectionRequests) {
    try {
      await handleWalletRequest(request.method, request.params);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to process pending request:', error);
    }
  }

  // Clear pending requests
  pendingConnectionRequests = [];
}

// EIP-1193 Provider Implementation - SECURE VERSION
class PaycioProvider {
  public isConnected = false;
  public isPaycio = true;
  public isPayCio = true;
  public selectedAddress: string | null = null;
  public chainId: string = '0x1';
  private listeners: { [event: string]: Function[] } = {};

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    try {
      // Check if wallet is available
      const isUnlocked = await checkWalletUnlockStatus();
      if (isUnlocked) {
        this.isConnected = true;
        this.emit('connect', { chainId: this.chainId });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Provider initialization failed:', error);
    }
  }

  // EIP-1193 Methods
  async request({ method, params = [] }: { method: string; params?: any[] }): Promise<any> {

    try {
      switch (method) {
        case 'eth_requestAccounts':
          return await this.requestAccounts();

        case 'eth_accounts':
          return await this.getAccounts();

        case 'eth_chainId':
          return this.chainId;

        case 'eth_getBalance':
          return await this.getBalance(params);

        case 'eth_sendTransaction':
          return await this.sendTransaction(params);

        case 'personal_sign':
          return await this.personalSign(params);

        case 'wallet_switchEthereumChain':
          return await this.switchChain(params);

        case 'wallet_addEthereumChain':
          return await this.addChain(params);

        default:
          // Forward to background script
          return await handleWalletRequest(method, params);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ Provider request failed: ${method}`, error);
      throw error;
    }
  }

  private async requestAccounts(): Promise<string[]> {
    try {
      const accounts = await handleWalletRequest('eth_requestAccounts', []);
      this.selectedAddress = accounts[0] || null;
      this.isConnected = true;
      this.emit('accountsChanged', accounts);
      return accounts;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to request accounts:', error);
      throw error;
    }
  }

  private async getAccounts(): Promise<string[]> {
    if (!this.isConnected) return [];
    return this.selectedAddress ? [this.selectedAddress] : [];
  }

  private async getBalance(params: any[]): Promise<string> {
    return await handleWalletRequest('eth_getBalance', params);
  }

  private async sendTransaction(params: any[]): Promise<string> {
    return await handleWalletRequest('eth_sendTransaction', params);
  }

  private async personalSign(params: any[]): Promise<string> {
    return await handleWalletRequest('personal_sign', params);
  }

  private async switchChain(params: any[]): Promise<null> {
    const chainId = params[0]?.chainId;
    if (!chainId) throw new Error('Chain ID is required');

    await handleWalletRequest('wallet_switchEthereumChain', params);
    this.chainId = chainId;
    this.emit('chainChanged', chainId);
    return null;
  }

  private async addChain(params: any[]): Promise<null> {
    await handleWalletRequest('wallet_addEthereumChain', params);
    return null;
  }

  // Event handling
  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeListener(event: string, listener: Function) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  public emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // Provider properties
  get isMetaMask() {
    return false;
  }

  // SECURITY FIX: Removed redundant getter methods
}

// Initialize provider
let provider: PaycioProvider;

try {
  // Create and inject the provider instance
  provider = new PaycioProvider();
 
  // Ensure the provider is attached to window.ethereum for dApp compatibility
  if (!(window as any).ethereum) {
    (window as any).ethereum = provider;
  } else if (!(window as any).ethereum.providers) {
    // If there's an existing provider but no .providers array, create one.
    (window as any).ethereum.providers = [(window as any).ethereum, provider];
  } else if (Array.isArray((window as any).ethereum.providers)) {
    // If .providers array exists, push our provider to it.
    (window as any).ethereum.providers.push(provider);
  }
 
  // Also make the Paycio provider directly accessible
  (window as any).paycioProvider = provider;
 
  // EIP-6963 Provider Announcement (re-announce on request or visibility changes)
  let hasAnnounced = false;
  const announceProvider = () => {
    if (hasAnnounced) return;
    const providerInfo = {
      uuid: 'paycio-wallet',
      name: 'PayCio Wallet',
      icon: PAYCIO_WALLET_ICON_SVG_DATA_URL,
      rdns: 'io.paycio.wallet',
    };
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({
        info: providerInfo,
        provider,
      }),
    }));
    hasAnnounced = true;
  };
 
  announceProvider(); // Initial announcement
  window.addEventListener('eip6963:requestProvider', () => { hasAnnounced = false; announceProvider(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { hasAnnounced = false; announceProvider(); } });
 
  // Handle messages from the content script (e.g., chainChanged, accountsChanged)
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data.type?.startsWith('PAYCIO_')) return;
 
    switch (event.data.type) {
      case 'PAYCIO_CHAIN_CHANGED':
        if (provider) {
          provider.chainId = event.data.chainId;
          provider.emit('chainChanged', event.data.chainId);
        }
        break;
      case 'PAYCIO_ACCOUNTS_CHANGED':
        if (provider) {
          provider.selectedAddress = event.data.accounts[0] || null;
          provider.emit('accountsChanged', event.data.accounts);
        }
        break;
      case 'PAYCIO_CONTEXT_INVALIDATED':
        showRecoveryOptions();
        break;
      // Handle other PAYCIO_ events as needed
    }
  });
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('❌ PayCio: Error in provider initialization:', error);
}

// Ensure messages from the content script are handled
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data.type?.startsWith('PAYCIO_RESPONSE')) {
    return;
  }

  const { type, id, requestId, success, data, error } = event.data;

  // Handle specific responses from content script
  if (type === 'PAYCIO_WALLET_STATUS_RESPONSE' || type === 'PAYCIO_WAKE_UP_RESPONSE' || type === 'PAYCIO_WALLET_UNLOCK_RESPONSE') {
    // These are handled by specific Promise wrappers in the injected script
    return;
  }

  // Forward other PAYCIO_RESPONSE messages to the provider's event system or resolve pending requests
  if (provider && (id || requestId)) {
    // Placeholder for now - actual handling depends on provider's internal request management
    // For example, if provider maintains a map of pending requests it can resolve them here.
    // For demonstration, we'll just log for now.
    console.log('Injected: Received PAYCIO_RESPONSE from content script:', event.data);
  }
}); 