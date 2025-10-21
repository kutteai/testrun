import { getBrowser } from '../../utils/browser';

declare global {
  interface Window {
    browserAPI: typeof chrome | ReturnType<typeof getBrowser>;
  }
}

export const setupContextValidationAndHeartbeat = (toast: any, browserAPI: typeof chrome | ReturnType<typeof getBrowser>) => {
  const isContentScriptContext = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const handleContextInvalidation = () => {
    // eslint-disable-next-line no-console
    console.warn('Paycio: Extension context invalidated, initiating cleanup...');

    // Remove listeners
    // window.removeEventListener('message', handlePageMessage); // This listener will be managed by the main script

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
            // eslint-disable-next-line no-console
            console.warn('Paycio: Context validation failed:', browserAPI.runtime.lastError);
            handleContextInvalidation();
            clearInterval(contextValidationInterval);
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Paycio: Context validation error:', error);
        handleContextInvalidation();
        clearInterval(contextValidationInterval);
      }
    }, 30000); // Check every 30 seconds
  };

  startContextValidation();

  // Enhanced heartbeat system
  let heartbeatInterval: number | null = null;
  let heartbeatFailures = 0;
  const MAX_HEARTBEAT_FAILURES = 3;

  const startHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    heartbeatInterval = window.setInterval(() => {
      try {
        browserAPI.runtime.sendMessage({
          type: 'PAYCIO_HEARTBEAT',
          timestamp: Date.now(),
          origin: window.location.origin,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }, (response) => {
          if (browserAPI.runtime.lastError) {
            heartbeatFailures++;
            // eslint-disable-next-line no-console
            console.warn(`Paycio: Heartbeat failed (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, browserAPI.runtime.lastError);

            if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
              // eslint-disable-next-line no-console
              console.error('Paycio: Maximum heartbeat failures reached, context may be invalidated');
              handleContextInvalidation();
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
            }
          } else {
            // Reset failure counter on successful heartbeat
            heartbeatFailures = 0;

            if (response?.status === 'ok') {
            }
          }
        });
      } catch (error) {
        heartbeatFailures++;
        // eslint-disable-next-line no-console
        console.warn(`Paycio: Heartbeat error (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}):`, error);

        if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
          handleContextInvalidation();
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }
    }, 25000); // 25 second heartbeat
  };

  startHeartbeat();
};

