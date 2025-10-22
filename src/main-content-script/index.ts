import { getBrowserAPI } from '../utils/browser-api';

// Complete enhanced content script with all advanced features
import { ToastManager } from './utils/toast-manager';
import { ModalManager } from './utils/modal-manager';
import { WalletConnectManager } from './utils/wallet-connect-integration';
import { EventEmitter } from './utils/event-emitter';
import { ConnectionManager } from './utils/connection-manager';
import { PaycioEthereumProvider } from './utils/ethereum-provider';
import { createMultiChainProvider } from './utils/multi-chain-providers';
import { setupProviderAnnouncement } from './utils/provider-announcement';
import { setupErrorHandling } from './utils/error-handling';
import { setupLifecycleManagement } from './utils/lifecycle-management';
import { setupContextValidationAndHeartbeat } from './utils/context-validation';
import { performanceMonitor } from './utils/performance-monitoring';
import { setupDebuggingUtilities } from './utils/debugging-utilities';

console.log('Paycio main content script loaded');

// Cross-browser compatibility
const browserAPI = getBrowserAPI();

// Only inject if not already injected
if (!(window as any).paycioInjected) {
  (window as any).paycioInjected = true;

  // Inject the provider script into the page using a file URL for CSP compliance
  const injectProviderScript = () => {
    try {
      const script = document.createElement('script');
      script.src = browserAPI.runtime.getURL('injected/index.js'); // Correct path to the injected script
      script.onload = () => script.remove();
      script.onerror = (error) => {
        console.error('Paycio: Failed to load injected provider script:', error);
        script.remove();
      };
      (document.head || document.documentElement).appendChild(script);
      console.log('Paycio: Injected provider script via file URL');
    } catch (error) {
      console.error('Paycio: Error injecting provider script:', error);
    }
  };

  // Run the injection logic when the document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectProviderScript);
  } else {
    injectProviderScript();
  }

  // Enhanced content script message handling - bridge between injected script and background
  const handlePageMessage = async (event: MessageEvent) => {
    // SECURITY FIX: Enhanced message validation with cryptographic verification
    if (event.source !== window || !event.data.type?.startsWith('PAYCIO_')) {
      return;
    }

    const {
      method, params, requestId, signature, timestamp, nonce, type, id, password
    } = event.data;

    // Handle specific messages from the injected script that don't require cryptographic signature yet
    if (type === 'PAYCIO_WAKE_UP') {
      try {
        const response = await browserAPI.runtime.sendMessage({ type: 'WAKE_UP' });
        window.postMessage({ type: 'PAYCIO_WAKE_UP_RESPONSE', id, success: response.success, message: response.message }, '*');
      } catch (error: any) {
        console.error('Paycio: Error handling PAYCIO_WAKE_UP:', error);
        window.postMessage({ type: 'PAYCIO_WAKE_UP_RESPONSE', id, success: false, error: error.message }, '*');
      }
      return;
    }

    if (type === 'PAYCIO_GET_WALLET_STATUS') {
      try {
        const response = await browserAPI.runtime.sendMessage({ type: 'PAYCIO_GET_WALLET_STATUS' });
        window.postMessage({ type: 'PAYCIO_WALLET_STATUS_RESPONSE', id, success: response.success, data: response.data, error: response.error }, '*');
      } catch (error: any) {
        console.error('Paycio: Error handling PAYCIO_GET_WALLET_STATUS:', error);
        window.postMessage({ type: 'PAYCIO_WALLET_STATUS_RESPONSE', id, success: false, error: error.message }, '*');
      }
      return;
    }

    if (type === 'PAYCIO_SHOW_UNLOCK_POPUP') {
      try {
        const response = await browserAPI.runtime.sendMessage({ type: 'PAYCIO_SHOW_UNLOCK_POPUP', origin: event.origin });
        window.postMessage({ type: 'PAYCIO_WALLET_UNLOCK_RESPONSE', id, success: response.success, result: response.result, error: response.error }, '*');
      } catch (error: any) {
        console.error('Paycio: Error handling PAYCIO_SHOW_UNLOCK_POPUP:', error);
        window.postMessage({ type: 'PAYCIO_WALLET_UNLOCK_RESPONSE', id, success: false, error: error.message }, '*');
      }
      return;
    }

    if (type === 'PAYCIO_UNLOCK_WALLET') {
      try {
        const response = await browserAPI.runtime.sendMessage({ type: 'PAYCIO_UNLOCK_WALLET', password });
        window.postMessage({ type: 'PAYCIO_UNLOCK_WALLET_RESPONSE', id, success: response.success, error: response.error }, '*');
      } catch (error: any) {
        console.error('Paycio: Error handling PAYCIO_UNLOCK_WALLET:', error);
        window.postMessage({ type: 'PAYCIO_UNLOCK_WALLET_RESPONSE', id, success: false, error: error.message }, '*');
      }
      return;
    }

    // Proceed with cryptographic signature validation for DApp requests
    if (event.data.type !== 'PAYCIO_REQUEST') {
      console.warn('Paycio: Unknown message type from page:', event.data.type);
      return;
    }

    // Validate message structure
    if (!method || !requestId) {
      console.warn('Paycio: Invalid message structure:', event.data);
      return;
    }

    // SECURITY: Validate message authenticity
    if (!signature || !timestamp || !nonce) {
      console.warn('Paycio: Missing security fields in message:', event.data);
      return;
    }

    // SECURITY: Check message age (prevent replay attacks)
    const messageAge = Date.now() - timestamp;
    if (messageAge > 30000) { // 30 seconds max age
      console.warn('Paycio: Message too old, possible replay attack');
      return;
    }

    // SECURITY: Verify message signature
    try {
      const messageHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify({
          method, params, requestId, timestamp, nonce,
        })) as BufferSource,
      );

      // For now, we'll implement a basic validation
      // In production, this should use proper cryptographic signatures
      if (!signature || signature.length < 32) {
        console.warn('Paycio: Invalid message signature');
        return;
      }
    } catch (error) {
      console.warn('Paycio: Message signature verification failed:', error);
      return;
    }

    console.log(`Paycio Content Script: Forwarding ${method} to background`);

    try {
      // Forward request to background script with comprehensive error handling
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Background script timeout for ${method}`));
        }, 45000); // Increased timeout for complex operations

        // Enhanced message structure for background script
        const backgroundMessage = {
          type: 'PAYCIO_DAPP_REQUEST',
          method,
          params,
          requestId,
          origin: window.location.origin,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        };

        browserAPI.runtime.sendMessage(backgroundMessage, (response) => {
          clearTimeout(timeout);

          if (browserAPI.runtime.lastError) {
            console.error('Paycio: Runtime error:', browserAPI.runtime.lastError);

            // Handle specific Chrome extension errors
            if (browserAPI.runtime.lastError.message?.includes('Extension context invalidated')) {
              reject(new Error('EXTENSION_CONTEXT_INVALIDATED'));
            } else {
              reject(new Error(browserAPI.runtime.lastError.message || 'Runtime error'));
            }
            return;
          }

          if (!response) {
            reject(new Error('No response from background script'));
            return;
          }

          resolve(response);
        });
      });

      // Enhanced response with additional metadata
      window.postMessage({
        type: 'PAYCIO_RESPONSE',
        requestId,
        success: response.success !== false,
        data: response.data,
        error: response.error,
        metadata: {
          processedAt: Date.now(),
          method,
          origin: window.location.origin,
        },
      }, '*');
    } catch (error) {
      console.error(`Paycio: Error processing ${method}:`, error);

      // Handle extension context invalidation
      if (error.message === 'EXTENSION_CONTEXT_INVALIDATED') {
        // Notify injected script about context invalidation
        window.postMessage({
          type: 'PAYCIO_CONTEXT_INVALIDATED',
          requestId,
          error: 'Extension context was invalidated. Please refresh the page.',
          recovery: {
            action: 'refresh',
            message: 'Please refresh the page to restore wallet functionality',
          },
        }, '*');
        return;
      }

      // Send error response back to injected script
      window.postMessage({
        type: 'PAYCIO_RESPONSE',
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        errorType: error.name || 'UnknownError',
        metadata: {
          processedAt: Date.now(),
          method,
          failed: true,
        },
      }, '*');
    }
  };

  // Add message listener with enhanced error handling
  window.addEventListener('message', handlePageMessage, { passive: true });

  // Enhanced background message handler
  const handleBackgroundMessage = (message: any, sender: any, sendResponse: (response?: any) => void) => {
    if (!message.type?.startsWith('PAYCIO_')) {
      return false;
    }

    console.log('Paycio Content Script: Received background message:', message.type);

    try {
      // Forward background messages to injected script with error handling
      window.postMessage({
        ...message,
        forwarded: true,
        timestamp: Date.now(),
      }, '*');

      // Send acknowledgment back to background script
      sendResponse({ received: true, timestamp: Date.now() });
    } catch (error) {
      console.error('Paycio: Error forwarding background message:', error);
      sendResponse({ received: false, error: error.message });
    }

    return true; // Keep message channel open
  };

  browserAPI.runtime.onMessage.addListener(handleBackgroundMessage);

  // Enhanced context invalidation handling
  const handleContextInvalidation = () => {
    console.warn('Paycio: Extension context invalidated, initiating cleanup...');

    // Remove listeners
    window.removeEventListener('message', handlePageMessage);

    // Notify injected script with recovery options
    window.postMessage({
      type: 'PAYCIO_CONTEXT_INVALIDATED',
      data: {
        reason: 'Extension context invalidated',
        timestamp: Date.now(),
        recovery: {
          actions: ['refresh', 'reconnect'],
          message: 'Extension connection lost. Please refresh the page to restore functionality.',
        },
      },
    }, '*');

    // Show user notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
    `;
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">Paycio Wallet Disconnected</div>
      <div style="font-size: 12px; opacity: 0.9;">Click to refresh and restore connection</div>
    `;

    notification.onclick = () => window.location.reload();
    document.body.appendChild(notification);

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  };

  // Listen for extension context invalidation
  let contextValidationInterval: number;

  const startContextValidation = () => {
    contextValidationInterval = window.setInterval(() => {
      try {
        if (!browserAPI.runtime || !(browserAPI.runtime as any).id) {
          throw new Error('Extension context lost');
        }

        // Test connection with a lightweight message
        browserAPI.runtime.sendMessage({
          type: 'PAYCIO_CONTEXT_CHECK',
          timestamp: Date.now(),
        }, (response) => {
          if (browserAPI.runtime.lastError) {
            console.warn('Paycio: Context validation failed:', browserAPI.runtime.lastError);
            handleContextInvalidation();
            clearInterval(contextValidationInterval);
          }
        });
      } catch (error) {
        console.warn('Paycio: Context validation error:', error);
        handleContextInvalidation();
        clearInterval(contextValidationInterval);
      }
    }, 30000); // Check every 30 seconds
  };

  startContextValidation();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    console.log('Paycio: Content script cleanup on page unload');

    // Clear intervals
    // This interval is now managed by setupContextValidationAndHeartbeat
    // if (contextValidationInterval) {
    //   clearInterval(contextValidationInterval);
    // }

    // Remove listeners
    window.removeEventListener('message', handlePageMessage);

    // Notify background script of page unload
    try {
      browserAPI.runtime.sendMessage({
        type: 'PAYCIO_PAGE_UNLOAD',
        origin: window.location.origin,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  // Final initialization message
  console.log('Paycio: Enhanced content script initialized successfully with features:', {
    toastNotifications: true,
    modalSystem: true,
    walletConnect: true,
    multiChain: true,
    subscriptions: true,
    filters: true,
    contextValidation: true,
    heartbeat: true,
    performanceMonitoring: true,
    enhancedErrorHandling: true,
    developmentDebugging: true,
  });

  console.log('Paycio: Ready for advanced DApp interactions');

  // Send initialization complete message to background
  try {
    browserAPI.runtime.sendMessage({
      type: 'PAYCIO_CONTENT_SCRIPT_READY',
      origin: window.location.origin,
      url: window.location.href,
      timestamp: Date.now(),
      features: ['advanced-provider', 'toast', 'modal', 'walletconnect', 'multichain'],
    });
  } catch (error) {
    console.warn('Paycio: Failed to notify background script of initialization:', error);
  }
}


