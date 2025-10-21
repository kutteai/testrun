import { browserAPI } from './browser-compatibility';
import { ToastManager } from './toast-manager';
import { PerformanceMetrics } from '../../types/content-script';

class ProviderInjector {
  private connectedDApps = new Set<string>();
  private performanceMetrics: PerformanceMetrics;
  private toast: ToastManager;

  constructor(performanceMetrics: PerformanceMetrics, toast: ToastManager) {
    this.performanceMetrics = performanceMetrics;
    this.toast = toast;
  }

  public injectProviderScript(): void {
    if (document.documentElement.getAttribute('data-paycio-injected') === 'true') {
      return;
    }

    try {
      const extensionId = this.getExtensionId();
      if (!extensionId) {
        throw new Error('Could not determine extension ID');
      }

      const script = document.createElement('script');
      script.src = browserAPI.runtime.getURL('injected/provider.js');
      script.onload = () => {
        script.remove();
      };
      script.onerror = (error) => {
        // eslint-disable-next-line no-console
        console.error('❌ Failed to inject PayCio provider script:', error);
        this.performanceMetrics.errorCount++;
        this.toast.show('Failed to load wallet provider', 'error');
      };

      (document.head || document.documentElement).appendChild(script);
      document.documentElement.setAttribute('data-paycio-injected', 'true');

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line no-console
      console.error('Failed to inject provider script:', err);
      this.toast.show(`Failed to inject wallet: ${err.message}`, 'error');
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
        const match = src.match(/chrome-extension:\/\/([^/]+)\//);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting extension ID:', error);
      return null;
    }
  }

  public destroy(): void {
    document.documentElement.removeAttribute('data-paycio-injected');
  }
}

export { ProviderInjector };
