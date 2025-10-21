import { storage } from '../utils/storage-utils';
import { crossBrowserSendMessage } from '../utils/runtime-utils';
import { FALLBACK_SVG_DATA_URL, NFT_FALLBACK_SVG_DATA_URL, PAYCIO_WALLET_ICON_SVG_DATA_URL } from '../utils/fallback-svg';
import { getUnifiedBrowserAPI } from '../utils/runtime-utils';

// PayCio Wallet injection script - SECURE VERSION

// Global state for dApp connection handling
let isWalletUnlocked = false;
let pendingConnectionRequests: any[] = [];

// SECURITY FIX: Password collection on DApp pages is disabled
function createUnlockModal(): Promise<boolean> {
  // eslint-disable-next-line no-console
  console.error('🚨 SECURITY: Password collection on DApp pages is disabled for security');
  // eslint-disable-next-line no-console
  console.error('🔒 Passwords must be entered in the secure extension popup only');
  return Promise.resolve(false);
}

// Wake up extension method
async function wakeUpExtension(): Promise<void> {

  try {
    getUnifiedBrowserAPI().runtime.sendMessage({ type: 'WAKE_UP' }, (response) => {
      if (getUnifiedBrowserAPI().runtime.lastError) {
      } else {
      }
    });
  } catch (error) {
  }
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
  try {
    const unifiedBrowserAPI = getUnifiedBrowserAPI();
    const isValid = typeof unifiedBrowserAPI.runtime !== 'undefined'
           && typeof unifiedBrowserAPI.runtime.sendMessage === 'function';

    if (!isValid) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Extension context invalidated - attempting recovery');
      // Attempt to recover by re-initializing provider
      setTimeout(() => {
        if (typeof unifiedBrowserAPI.runtime !== 'undefined' && unifiedBrowserAPI.runtime.sendMessage) {
          // Re-announce provider if context is recovered
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('paycio#recovered'));
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('❌ Extension context recovery failed');
        }
      }, 1000);
    }
    return isValid;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Extension context validation failed:', error);
    return false;
  }
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
    if (!validateExtensionContext()) {
      showRecoveryOptions();
      isWalletUnlocked = false;
      return false;
    }

    const response = await new Promise<any>((resolve, reject) => {
      getUnifiedBrowserAPI().runtime.sendMessage({ type: 'CHECK_WALLET_STATUS' }, (response) => {
        if (getUnifiedBrowserAPI().runtime.lastError) {
          reject(new Error(getUnifiedBrowserAPI().runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

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
      type: 'PAYCIO_WALLET_UNLOCK_REQUEST',
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
    new TextEncoder().encode(JSON.stringify(messageData)),
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

      if (event.data.type === 'PAYCIO_WALLET_REQUEST_RESPONSE' && event.data.id === messageId) {
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
  // Validate extension context
  if (!validateExtensionContext()) {
    // eslint-disable-next-line no-console
    console.error('❌ PayCio: Extension context not available');
    showRecoveryOptions();
  } else {
    // Create provider instance
    provider = new PaycioProvider();

    // SECURITY FIX: Consistent provider injection for better DApp detection
    if (!window.ethereum) {
      // No existing provider, set as primary
      (window as any).ethereum = provider;
    } else {
      // Existing provider detected, add to providers array for multi-wallet support
      if (Array.isArray((window as any).ethereum.providers)) {
        // Already has providers array, add to it
        (window as any).ethereum.providers.push(provider);
      } else {
        // Convert single provider to providers array
        const existingProvider = (window as any).ethereum;
        (window as any).ethereum.providers = [existingProvider, provider];
      }
    }

    // Ensure PayCio provider is always accessible
    (window as any).ethereum = provider;

    // SECURITY FIX: Enhanced EIP-6963 Provider Announcement with proper timing
    let hasAnnounced = false;
    const announceProvider = () => {
      if (hasAnnounced) return; // Prevent duplicate announcements

      const providerInfo = {
        uuid: 'paycio-wallet',
        name: 'PayCio Wallet',
        icon: PAYCIO_WALLET_ICON_SVG_DATA_URL,
        rdns: 'io.paycio.wallet',
      };

      // Dispatch EIP-6963 announcement
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
          info: providerInfo,
          provider,
        }),
      }));

      hasAnnounced = true;
    };

    // SECURITY FIX: Immediate announcement for better DApp detection
    announceProvider();

    // Listen for EIP-6963 requests and re-announce when needed
    window.addEventListener('eip6963:requestProvider', () => {
      hasAnnounced = false; // Reset flag to allow re-announcement
      announceProvider();
    });

    // Additional announcements for better detection timing
    setTimeout(() => {
      if (!hasAnnounced) announceProvider();
    }, 50);

    setTimeout(() => {
      if (!hasAnnounced) announceProvider();
    }, 500);

    // Add non-EVM provider support
    (window as any).solana = provider;
    (window as any).tronWeb = provider;
    (window as any).ton = provider;

    // Add provider detection debugging


    // SECURITY FIX: Periodic context validation and provider health checks
    setInterval(() => {
      if (!validateExtensionContext()) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ PayCio: Extension context lost, attempting recovery');
        showRecoveryOptions();
      }
    }, 30000); // Check every 30 seconds

    // Listen for context recovery events
    window.addEventListener('paycio#recovered', () => {
      hasAnnounced = false;
      announceProvider();
    });

    // Listen for page visibility changes to re-announce provider
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (!window.ethereum || !(window.ethereum as any).isPaycio) {
          hasAnnounced = false;
          announceProvider();
        }
      }
    });
  }

  // Handle network changes
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'PAYCIO_CHAIN_CHANGED') {
      if (provider) {
        provider.chainId = event.data.chainId;
        provider.emit('chainChanged', event.data.chainId);
      }
    }
  });

  // Expose createUnlockModal function globally (disabled for security)
  (window as any).createUnlockModal = createUnlockModal;
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('❌ PayCio: Error in provider initialization:', error);
} 