const PRISM_TOAST = {
    container: null,
    queue: [],
    maxVisible: 5,
    
    init() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.className = 'prism-toast-container';
        this.container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            display: flex; flex-direction: column; gap: 10px;
            z-index: 100000; pointer-events: none;
        `;
        document.body.appendChild(this.container);
        
        // Inject animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes prism-toast-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes prism-toast-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        console.log('[PRISM_TOAST] Initialized');
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        
        const toast = document.createElement('div');
        toast.className = `prism-toast prism-toast-${type}`;
        
        const icons = { 
            success: '✓', 
            error: '✗', 
            warning: '⚠', 
            info: 'ℹ' 
        };
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        
        toast.innerHTML = `
            <span style="font-size: 18px; margin-right: 10px;">${icons[type] || icons.info}</span>
            <span>${message}</span>
            <button style="
                background: none; border: none; color: inherit;
                margin-left: 10px; cursor: pointer; font-size: 16px;
                opacity: 0.7; padding: 0;
            ">×</button>
        `;
        
        toast.style.cssText = `
            padding: 12px 16px; border-radius: 6px;
            display: flex; align-items: center;
            background: ${colors[type] || colors.info};
            color: white; min-width: 280px; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: prism-toast-in 0.3s ease;
            pointer-events: auto;
        `;
        
        // Close button handler
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', () => this._dismissToast(toast));
        
        this.container.appendChild(toast);
        
        // Limit visible toasts
        while (this.container.children.length > this.maxVisible) {
            this._dismissToast(this.container.firstChild);
        }
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this._dismissToast(toast), duration);
        }
        
        return toast;
    },
    
    _dismissToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.animation = 'prism-toast-out 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    },
    
    success(message, duration = 3000) { return this.show(message, 'success', duration); },
    error(message, duration = 5000) { return this.show(message, 'error', duration); },
    warning(message, duration = 4000) { return this.show(message, 'warning', duration); },
    info(message, duration = 3000) { return this.show(message, 'info', duration); },
    
    // Persistent toast that must be dismissed manually
    persistent(message, type = 'info') {
        return this.show(message, type, 0);
    },
    
    selfTest() {
        const results = [];
        
        this.init();
        
        // Test toast creation
        const toast = this.show('Test message', 'info', 0);
        results.push({
            test: 'Create toast',
            passed: toast !== null && this.container.contains(toast),
            message: 'Toast created'
        });
        
        // Test different types
        this.success('Success');
        this.warning('Warning');
        this.error('Error');
        results.push({
            test: 'Multiple toast types',
            passed: this.container.children.length === 4,
            message: `${this.container.children.length} toasts visible`
        });
        
        // Cleanup
        while (this.container.firstChild) {
            this.container.firstChild.remove();
        }
        
        return results;
    }
}