class ModalManager {
  constructor() {
    this.modals = new Set();
  }

  createModal(config) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      max-width: ${config.maxWidth || '500px'};
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      transform: scale(0.9) translateY(20px);
      transition: transform 0.2s ease;
    `;

    content.innerHTML = config.content;
    modal.appendChild(content);

    this.modals.add(modal);
    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      content.style.transform = 'scale(1) translateY(0)';
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  closeModal(modal) {
    if (!this.modals.has(modal)) return;

    modal.style.opacity = '0';
    modal.firstChild.style.transform = 'scale(0.9) translateY(20px)';

    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      this.modals.delete(modal);
    }, 200);
  }

  destroy() {
    this.modals.forEach((modal) => this.closeModal(modal));
  }
}

export { ModalManager };
