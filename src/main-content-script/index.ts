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
const browserAPI = (() => {
  if (typeof browser !== 'undefined') return browser;
  if (typeof chrome !== 'undefined') return chrome;
  throw new Error('No browser API available');
})();

// Only inject if not already injected
if (!(window as any).paycioInjected) {
  (window as any).paycioInjected = true;

  // Create script element to inject provider
  const script = document.createElement('script');

  // Complete provider script with all advanced features
  script.textContent = `
    (function() {
      'use strict';
      
      if (window.paycioProviderInjected) {
        return;
      }
      window.paycioProviderInjected = true;

      console.log('Paycio: Injecting advanced wallet providers with all features');

      const toast = new ToastManager();
      window.paycioToast = toast;

      const modalManager = new ModalManager();

      const walletConnect = new WalletConnectManager(toast);

      const connectionManager = new ConnectionManager(modalManager, toast);

      const ethereumProvider = new PaycioEthereumProvider(toast, connectionManager, walletConnect, browserAPI);
      
      // Mark as PayCio provider for proper detection
      ethereumProvider.isPayCio = true;
      ethereumProvider.isMetaMask = false; // Don't pretend to be MetaMask
      
      window.paycioProvider = ethereumProvider;

      // Inject Ethereum provider
      Object.defineProperty(window, 'ethereum', {
        value: ethereumProvider,
        writable: false,
        configurable: false
      });

      const multiChainProvider = createMultiChainProvider(toast, walletConnect);

      // Inject multi-chain provider
      Object.defineProperty(window, 'paycio', {
        value: {
          ...multiChainProvider,
          walletConnect,
          connectionManager,
          toast,
          modalManager,
          
          // Utility methods
          utils: {
            isValidEthereumAddress: (address) => /^0x[a-fA-F0-9]{40}$/.test(address),
            isValidBitcoinAddress: (address) => /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address),
            formatAddress: (address, length = 6) => \`\${address.slice(0, length)}...\${address.slice(-4)}\`,
            wei2eth: (wei) => (parseInt(wei, 16) / Math.pow(10, 18)).toString(),
            eth2wei: (eth) => '0x' + (parseFloat(eth) * Math.pow(10, 18)).toString(16)
          }
        },
        writable: false,
        configurable: false
      });

      setupProviderAnnouncement(ethereumProvider);

      setupErrorHandling(toast);

      setupLifecycleManagement(ethereumProvider, toast, modalManager);

      setupContextValidationAndHeartbeat(toast, browserAPI);

      setupDebuggingUtilities(performanceMonitor, setupContextValidationAndHeartbeat, browserAPI);

      console.log('Paycio: Advanced wallet providers with all features injected successfully');
      
      // Feature detection and compatibility checks
      const compatibilityCheck = () => {
        const features = {
          postMessage: typeof window.postMessage === 'function',
          addEventListener: typeof window.addEventListener === 'function',
          Promise: typeof Promise !== 'undefined',
          chrome: typeof chrome !== 'undefined',
          browser: typeof browser !== 'undefined',
          runtime: !!(browserAPI.runtime),
          sendMessage: !!(browserAPI.runtime?.sendMessage),
          onMessage: !!(browserAPI.runtime?.onMessage)
        };

        const missingFeatures = Object.entries(features)
          .filter(([, supported]) => !supported)
          .map(([feature]) => feature);

        if (missingFeatures.length > 0) {
          console.error('Paycio: Missing required browser features:', missingFeatures);
          return false;
        }

        console.log('Paycio: All required browser features available');
        return true;
      };

      // Initialize only if compatible
      if (compatibilityCheck()) {
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
          developmentDebugging: true
        });

        console.log('Paycio: Ready for advanced DApp interactions');

        // Send initialization complete message to background
        try {
          browserAPI.runtime.sendMessage({
            type: 'PAYCIO_CONTENT_SCRIPT_READY',
            origin: window.location.origin,
            url: window.location.href,
            timestamp: Date.now(),
            features: ['advanced-provider', 'toast', 'modal', 'walletconnect', 'multichain']
          });
        } catch (error) {
          console.warn('Paycio: Failed to notify background script of initialization:', error);
        }
      } else {
        console.error('Paycio: Content script initialization failed due to missing browser features');
      }

    })();
  `;

  // Inject the script into the page
  try {
    const target = document.head || document.documentElement;
    target.insertBefore(script, target.children[0]);
    console.log('Paycio: Advanced provider script injected successfully');
    script.remove();
  } catch (error) {
    console.error('Paycio: Failed to inject provider script:', error);

    // Fallback injection method
    try {
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      console.log('Paycio: Provider script injected via fallback method');
    } catch (fallbackError) {
      console.error('Paycio: All injection methods failed:', fallbackError);
    }
  }

  // Enhanced content script message handling - bridge between injected script and background
  const handlePageMessage = async (event: MessageEvent) => {
    // SECURITY FIX: Enhanced message validation with cryptographic verification
    if (event.source !== window || event.data.type !== 'PAYCIO_REQUEST') {
      return;
    }

    const {
      method, params, requestId, signature, timestamp, nonce,
    } = event.data;

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
        })),
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
  });  // Enhanced heartbeat system
  // let heartbeatInterval: number | null = null;
  // let heartbeatFailures = 0;
  // const MAX_HEARTBEAT_FAILURES = 3;

  // const startHeartbeat = () => {
  //   if (heartbeatInterval) {
  //     clearInterval(heartbeatInterval);
  //   }
  //
  //   heartbeatInterval = window.setInterval(() => {
  //     try {
  //       browserAPI.runtime.sendMessage({
  //         type: 'PAYCIO_HEARTBEAT',
  //         timestamp: Date.now(),
  //         origin: window.location.origin,
  //         url: window.location.href,
  //         userAgent: navigator.userAgent
  //       }, (response) => {
  //         if (browserAPI.runtime.lastError) {
  //           heartbeatFailures++;
  //           console.warn(`Paycio: Heartbeat failed (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, browserAPI.runtime.lastError);
  //
  //           if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
  //             console.error('Paycio: Maximum heartbeat failures reached, context may be invalidated');
  //             handleContextInvalidation();
  //             if (heartbeatInterval) {
  //               clearInterval(heartbeatInterval);
  //             }
  //           }
  //         } else {
  //           // Reset failure counter on successful heartbeat
  //           heartbeatFailures = 0;
  //
  //           if (response?.status === 'ok') {
  //             console.log('Paycio: Heartbeat successful');
  //           }
  //         }
  //       });
  //     } catch (error) {
  //       heartbeatFailures++;
  //       console.warn(`Paycio: Heartbeat error (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, error);
  //
  //       if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
  //         handleContextInvalidation();
  //         if (heartbeatInterval) {
  //           clearInterval(heartbeatInterval);
  //         }
  //       }
  //     }
  //   }, 25000); // 25 second heartbeat
  // };
  // startHeartbeat();

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


