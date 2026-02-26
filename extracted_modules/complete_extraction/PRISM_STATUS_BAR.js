const PRISM_STATUS_BAR = {
    container: null,
    sections: {},
    
    init(container) {
        this.container = container;
        this.container.className = 'prism-status-bar';
        this.container.style.cssText = `
            display: flex; align-items: center;
            height: 24px; padding: 0 8px;
            background: var(--header-bg, #1a1a1a);
            color: var(--header-text, #fff);
            font-size: 12px; font-family: var(--font-family, sans-serif);
            border-top: 1px solid var(--border, #333);
        `;
        
        this._createDefaultSections();
        this._setupListeners();
        
        console.log('[PRISM_STATUS_BAR] Initialized');
    },
    
    _createDefaultSections() {
        // Left sections
        this.addSection('message', { position: 'left', flex: 1 });
        
        // Right sections
        this.addSection('selection', { position: 'right', width: '120px' });
        this.addSection('position', { position: 'right', width: '180px' });
        this.addSection('unit', { position: 'right', width: '50px' });
        this.addSection('zoom', { position: 'right', width: '60px' });
        
        // Set defaults
        this.set('message', 'Ready');
        this.set('selection', 'No selection');
        this.set('position', 'X: 0.000  Y: 0.000  Z: 0.000');
        this.set('unit', 'inch');
        this.set('zoom', '100%');
    },
    
    addSection(id, options = {}) {
        const section = document.createElement('div');
        section.className = `status-section status-${id}`;
        section.style.cssText = `
            padding: 0 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            ${options.flex ? `flex: ${options.flex};` : ''}
            ${options.width ? `width: ${options.width};` : ''}
            ${options.minWidth ? `min-width: ${options.minWidth};` : ''}
            ${options.align ? `text-align: ${options.align};` : ''}
        `;
        
        if (options.clickable) {
            section.style.cursor = 'pointer';
            section.addEventListener('click', () => {
                PRISM_EVENT_BUS?.publish?.(`statusbar:click:${id}`);
            });
        }
        
        if (options.position === 'left') {
            // Insert at beginning
            this.container.insertBefore(section, this.container.firstChild);
        } else {
            this.container.appendChild(section);
        }
        
        this.sections[id] = section;
        return section;
    },
    
    set(id, text, options = {}) {
        const section = this.sections[id];
        if (!section) return;
        
        section.textContent = text;
        
        if (options.icon) {
            section.innerHTML = `<span style="margin-right:4px">${options.icon}</span>${text}`;
        }
        
        if (options.color) {
            section.style.color = options.color;
        }
        
        if (options.tooltip) {
            section.title = options.tooltip;
        }
    },
    
    setMessage(text, type = 'info') {
        const colors = {
            info: 'inherit',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        this.set('message', text, { color: colors[type] });
        
        // Clear after timeout for non-info messages
        if (type !== 'info') {
            setTimeout(() => this.set('message', 'Ready'), 5000);
        }
    },
    
    setPosition(x, y, z) {
        const format = (n) => n.toFixed(3).padStart(8);
        this.set('position', `X:${format(x)} Y:${format(y)} Z:${format(z)}`);
    },
    
    setSelection(count, type = 'objects') {
        if (count === 0) {
            this.set('selection', 'No selection');
        } else {
            this.set('selection', `${count} ${type} selected`);
        }
    },
    
    setZoom(percent) {
        this.set('zoom', `${Math.round(percent)}%`);
    },
    
    setUnit(unit) {
        this.set('unit', unit);
    },
    
    showProgress(percent, text = '') {
        if (!this.sections.progress) {
            this.addSection('progress', { position: 'right', width: '150px' });
        }
        
        const progressBar = `
            <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:4px;background:#444;border-radius:2px;overflow:hidden">
                    <div style="width:${percent}%;height:100%;background:var(--accent,#2196F3)"></div>
                </div>
                <span>${percent}%</span>
            </div>
        `;
        
        this.sections.progress.innerHTML = progressBar;
    },
    
    hideProgress() {
        if (this.sections.progress) {
            this.sections.progress.remove();
            delete this.sections.progress;
        }
    },
    
    _setupListeners() {
        // Listen for events
        PRISM_EVENT_BUS?.subscribe?.('viewport:zoom', (e) => this.setZoom(e.zoom * 100));
        PRISM_EVENT_BUS?.subscribe?.('cursor:position', (e) => this.setPosition(e.x, e.y, e.z));
        PRISM_EVENT_BUS?.subscribe?.('selection:changed', (e) => this.setSelection(e.count, e.type));
    }
}