import { PaycioEthereumProvider } from './ethereum-provider';
import { ToastManager } from './toast-manager';
import { ModalManager } from './modal-manager';

declare global {
  interface Window {
    paycioProvider: PaycioEthereumProvider; // Assuming PaycioEthereumProvider is set here
  }
}

export const setupLifecycleManagement = (ethereumProvider: PaycioEthereumProvider, toast: ToastManager, modalManager: ModalManager) => {
  let isNavigating = false;

  window.addEventListener('beforeunload', () => {
    isNavigating = true;

    if (ethereumProvider && typeof ethereumProvider.destroy === 'function') {
      ethereumProvider.destroy();
    }

    if (toast && typeof toast.destroy === 'function') {
      toast.destroy();
    }

    if (modalManager && typeof modalManager.destroy === 'function') {
      modalManager.destroy();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
    } else {
      if (!isNavigating && ethereumProvider && !ethereumProvider._initialized) {
        ethereumProvider.initialize();
      }
    }
  });
};
