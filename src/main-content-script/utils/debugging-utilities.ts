import { PerformanceMonitor } from './performance-monitoring';
import { getBrowser } from '../../utils/browser';
import { setupContextValidationAndHeartbeat } from './context-validation';

declare global {
  interface Window {
     
    browserAPI: typeof chrome | typeof browser;
    paycioDebug: any;
  }
}

export const setupDebuggingUtilities = (performanceMonitor: PerformanceMonitor) => {
  const browserAPI = getBrowser();
  const isDevelopment = window.location.hostname === 'localhost'
                        || window.location.hostname === '127.0.0.1'
                        || window.location.hostname.includes('.local');

  if (isDevelopment) {

    // Log all provider events in development
    window.addEventListener('message', (event) => {
      if (event.data.type?.startsWith('PAYCIO_')) {
        performanceMonitor.logMessage();
      }
    });

    // Add debugging utilities to window
    (window as any).paycioDebug = {
      getPerformanceStats: () => performanceMonitor.getStats(),
      triggerContextCheck: () => setupContextValidationAndHeartbeat(window.paycioToast, browserAPI), // Pass toast and browserAPI
      testHeartbeat: () => setupContextValidationAndHeartbeat(window.paycioToast, browserAPI), // Pass toast and browserAPI
      getExtensionInfo: () => ({
        id: (browserAPI.runtime as any)?.id,
        version: (browserAPI.runtime as any)?.getManifest?.()?.version,
        contextValid: !!(browserAPI.runtime as any)?.id,
      }),
    };

  }
};
