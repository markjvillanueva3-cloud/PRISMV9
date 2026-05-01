const PRISM_TOAST_SYSTEM = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;';
      document.body.appendChild(this.container);
    }
    // Create global showToast function
    window.showToast = this.show.bind(this);
    console.log('[PRISM_TOAST_SYSTEM] Initialized');
  },
  show(message, type = 'info') {
    if (!this.container) this.init();

    const colors = {
      success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', icon: '✓' },
      error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', icon: '✗' },
      warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', icon: '⚠' },
      info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', icon: 'ℹ' }
    };
    const color = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.className = 'prism-toast';
    toast.innerHTML = `<span style="margin-right: 8px;">${color.icon}</span>${message}`;
    toast.style.cssText = `
      padding: 12px 20px;
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      display: flex;
      align-items: center;
    `;

    this.container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    return toast;
  }
}