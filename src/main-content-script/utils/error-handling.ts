import { ToastManager } from './toast-manager';

declare global {
  interface Window {
    paycioToast: ToastManager;
  }
}

export const setupErrorHandling = (toast: ToastManager) => {
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Paycio')) {
      // eslint-disable-next-line no-console
      console.error('Paycio Provider Error:', event.error);
      toast.show('Provider error occurred', 'error');
    }
  });
};
