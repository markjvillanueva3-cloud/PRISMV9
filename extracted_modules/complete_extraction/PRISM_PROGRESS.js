const PRISM_PROGRESS = {
    container: null,
    total: 100,
    current: 0,
    cancelled: false,
    startTime: null,
    
    show(title, total = 100, options = {}) {
        if (this.container) this.hide();
        
        this.total = total;
        this.current = 0;
        this.cancelled = false;
        this.startTime = Date.now();
        
        this.container = document.createElement('div');
        this.container.className = 'prism-progress-overlay';
        this.container.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); display: flex;
            align-items: center; justify-content: center;
            z-index: 99999; backdrop-filter: blur(2px);
        `;
        
        const modal = document.createElement('div');
        modal.className = 'prism-progress-modal';
        modal.style.cssText = `
            background: var(--card-bg, #fff); padding: 24px 32px;
            border-radius: 8px; min-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: var(--text-primary, #1a1a1a);">${title}</h3>
            <div class="prism-progress-bar" style="
                height: 8px; background: var(--bg-tertiary, #e8e8e8);
                border-radius: 4px; overflow: hidden; margin-bottom: 8px;
            ">
                <div class="prism-progress-fill" style="
                    height: 100%; width: 0%; background: var(--accent, #2196F3);
                    transition: width 0.1s ease;
                "></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="prism-progress-text" style="color: var(--text-secondary, #4a4a4a);">0%</span>
                <span class="prism-progress-eta" style="color: var(--text-muted, #888);">Calculating...</span>
            </div>
            ${options.cancellable !== false ? `
                <button class="prism-progress-cancel" style="
                    margin-top: 16px; padding: 8px 16px; border: none;
                    background: var(--error, #f44336); color: white;
                    border-radius: 4px; cursor: pointer;
                ">Cancel</button>
            ` : ''}
        `;
        
        this.container.appendChild(modal);
        document.body.appendChild(this.container);
        
        // Add cancel handler
        const cancelBtn = this.container.querySelector('.prism-progress-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }
        
        return this;
    },
    
    update(value, message = '') {
        if (!this.container) return;
        
        this.current = value;
        const pct = Math.round((value / this.total) * 100);
        
        const fill = this.container.querySelector('.prism-progress-fill');
        const text = this.container.querySelector('.prism-progress-text');
        const eta = this.container.querySelector('.prism-progress-eta');
        
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = message || `${pct}%`;
        
        // Calculate ETA
        if (eta && pct > 5) {
            const elapsed = Date.now() - this.startTime;
            const remaining = (elapsed / pct) * (100 - pct);
            eta.textContent = this._formatTime(remaining);
        }
    },
    
    _formatTime(ms) {
        if (ms < 1000) return 'Almost done...';
        if (ms < 60000) return `~${Math.round(ms / 1000)}s remaining`;
        return `~${Math.round(ms / 60000)}m remaining`;
    },
    
    increment(amount = 1, message = '') {
        this.update(this.current + amount, message);
    },
    
    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    },
    
    cancel() {
        this.cancelled = true;
        this.hide();
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('progress:cancelled');
        }
    },
    
    isCancelled() { return this.cancelled; },
    
    // Promise-based wrapper for async operations
    async track(title, asyncFn, options = {}) {
        this.show(title, 100, options);
        
        try {
            const result = await asyncFn({
                update: (pct, msg) => this.update(pct, msg),
                isCancelled: () => this.isCancelled()
            });
            this.hide();
            return result;
        } catch (error) {
            this.hide();
            throw error;
        }
    },
    
    selfTest() {
        const results = [];
        
        // Test show/hide
        this.show('Test Operation', 100);
        results.push({
            test: 'Show progress',
            passed: this.container !== null,
            message: this.container ? 'Container created' : 'Container not created'
        });
        
        // Test update
        this.update(50, 'Halfway there');
        const fill = this.container?.querySelector('.prism-progress-fill');
        results.push({
            test: 'Update progress',
            passed: fill && fill.style.width === '50%',
            message: `Progress: ${fill?.style.width}`
        });
        
        // Test cancel
        this.cancel();
        results.push({
            test: 'Cancel and hide',
            passed: this.container === null && this.cancelled === true,
            message: this.cancelled ? 'Cancelled' : 'Not cancelled'
        });
        
        return results;
    }
}