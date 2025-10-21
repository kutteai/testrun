interface ToastConfig {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

class ToastManager {
  private toasts: Set<HTMLElement> = new Set();
  private container: HTMLElement | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'paycio-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(this.container);
  }

  show(message: string, type: string = 'info', duration: number = 4000) {
    if (!this.container) return;
    
    const toast = document.createElement('div');
    const toastId = Math.random().toString(36).substring(2);
    
    toast.style.cssText = `
      background: ${this.getToastColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 8px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      cursor: pointer;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="flex: 1;">${this.escapeHtml(message)}</div>
        <div style="opacity: 0.7; font-size: 18px; line-height: 1;">&times;</div>
      </div>
    `;
    
    this.container.appendChild(toast);
    this.toasts.add(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      if (toast) {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }
    });
    
    // Click to dismiss
    const dismiss = () => this.dismiss(toast);
    toast.addEventListener('click', dismiss);
    
    // Auto dismiss
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
    
    return toast;
  }

  private dismiss(toast: HTMLElement) {
    if (!this.toasts.has(toast)) return;
    
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(toast);
    }, 300);
  }

  private getToastColor(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.toasts.forEach(toast => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
    this.toasts.clear();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

export { ToastManager };
export type { ToastConfig };
