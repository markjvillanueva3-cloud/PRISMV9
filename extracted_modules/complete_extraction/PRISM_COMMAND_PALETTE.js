const PRISM_COMMAND_PALETTE = {
    commands: new Map(),
    history: [],
    maxHistory: 20,
    element: null,
    isOpen: false,
    
    init() {
        this._createDOM();
        this._setupKeyboard();
        console.log('[PRISM_COMMAND_PALETTE] Initialized');
    },
    
    _createDOM() {
        this.element = document.createElement('div');
        this.element.className = 'prism-command-palette';
        this.element.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: none;
            align-items: flex-start; justify-content: center;
            padding-top: 15vh; z-index: 99999;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'command-palette-modal';
        modal.style.cssText = `
            background: var(--bg-primary, #fff); border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); width: 600px;
            max-width: 90vw; max-height: 60vh; overflow: hidden;
            display: flex; flex-direction: column;
        `;
        
        // Search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Type a command...';
        this.input.style.cssText = `
            width: 100%; padding: 16px 20px; border: none;
            font-size: 16px; outline: none;
            border-bottom: 1px solid var(--border, #eee);
        `;
        this.input.addEventListener('input', () => this._filterCommands());
        this.input.addEventListener('keydown', (e) => this._handleKeydown(e));
        
        // Results list
        this.results = document.createElement('div');
        this.results.className = 'command-results';
        this.results.style.cssText = `
            flex: 1; overflow-y: auto; padding: 8px 0;
        `;
        
        modal.appendChild(this.input);
        modal.appendChild(this.results);
        this.element.appendChild(modal);
        document.body.appendChild(this.element);
        
        // Click backdrop to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });
    },
    
    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+P or Cmd+Shift+P
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }
            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },
    
    register(id, command) {
        this.commands.set(id, {
            id,
            label: command.label || id,
            description: command.description || '',
            shortcut: command.shortcut || '',
            category: command.category || 'General',
            action: command.action,
            icon: command.icon || ''
        });
    },
    
    unregister(id) {
        this.commands.delete(id);
    },
    
    open() {
        this.isOpen = true;
        this.element.style.display = 'flex';
        this.input.value = '';
        this.input.focus();
        this._filterCommands();
    },
    
    close() {
        this.isOpen = false;
        this.element.style.display = 'none';
    },
    
    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    },
    
    _filterCommands() {
        const query = this.input.value.toLowerCase();
        this.results.innerHTML = '';
        this.selectedIndex = 0;
        
        let filtered = Array.from(this.commands.values());
        
        if (query) {
            filtered = filtered.filter(cmd => 
                cmd.label.toLowerCase().includes(query) ||
                cmd.description.toLowerCase().includes(query) ||
                cmd.category.toLowerCase().includes(query)
            ).sort((a, b) => {
                // Prioritize label matches
                const aLabel = a.label.toLowerCase().indexOf(query);
                const bLabel = b.label.toLowerCase().indexOf(query);
                if (aLabel !== -1 && bLabel === -1) return -1;
                if (bLabel !== -1 && aLabel === -1) return 1;
                return aLabel - bLabel;
            });
        } else {
            // Show recent commands first
            const recent = this.history.slice(0, 5).map(id => this.commands.get(id)).filter(Boolean);
            const rest = filtered.filter(cmd => !this.history.includes(cmd.id));
            filtered = [...recent, ...rest];
        }
        
        // Group by category
        const grouped = new Map();
        filtered.forEach(cmd => {
            if (!grouped.has(cmd.category)) grouped.set(cmd.category, []);
            grouped.get(cmd.category).push(cmd);
        });
        
        let index = 0;
        for (const [category, commands] of grouped) {
            // Category header
            const header = document.createElement('div');
            header.textContent = category;
            header.style.cssText = `
                padding: 8px 16px; font-size: 11px; font-weight: 600;
                color: var(--text-muted, #999); text-transform: uppercase;
            `;
            this.results.appendChild(header);
            
            // Commands
            for (const cmd of commands) {
                const item = this._createResultItem(cmd, index);
                this.results.appendChild(item);
                index++;
            }
        }
        
        this.filteredCommands = filtered;
        this._updateSelection();
    },
    
    _createResultItem(cmd, index) {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.dataset.index = index;
        item.style.cssText = `
            padding: 10px 16px; cursor: pointer;
            display: flex; align-items: center; gap: 12px;
        `;
        
        if (cmd.icon) {
            const icon = document.createElement('span');
            icon.textContent = cmd.icon;
            icon.style.fontSize = '18px';
            item.appendChild(icon);
        }
        
        const content = document.createElement('div');
        content.style.flex = '1';
        
        const label = document.createElement('div');
        label.textContent = cmd.label;
        label.style.fontWeight = '500';
        content.appendChild(label);
        
        if (cmd.description) {
            const desc = document.createElement('div');
            desc.textContent = cmd.description;
            desc.style.cssText = 'font-size: 12px; color: var(--text-muted, #999);';
            content.appendChild(desc);
        }
        
        item.appendChild(content);
        
        if (cmd.shortcut) {
            const shortcut = document.createElement('kbd');
            shortcut.textContent = cmd.shortcut;
            shortcut.style.cssText = `
                padding: 2px 6px; background: var(--bg-secondary, #f0f0f0);
                border-radius: 3px; font-size: 11px; font-family: monospace;
            `;
            item.appendChild(shortcut);
        }
        
        item.addEventListener('click', () => this._executeCommand(cmd));
        item.addEventListener('mouseenter', () => {
            this.selectedIndex = index;
            this._updateSelection();
        });
        
        return item;
    },
    
    _handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
                this._updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this._updateSelection();
                break;
            case 'Enter':
                if (this.filteredCommands[this.selectedIndex]) {
                    this._executeCommand(this.filteredCommands[this.selectedIndex]);
                }
                break;
        }
    },
    
    _updateSelection() {
        const items = this.results.querySelectorAll('.command-item');
        items.forEach((item, i) => {
            item.style.background = i === this.selectedIndex ? 'var(--accent, #2196F3)11' : '';
        });
        
        // Scroll into view
        const selected = items[this.selectedIndex];
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    },
    
    _executeCommand(cmd) {
        // Update history
        this.history = [cmd.id, ...this.history.filter(id => id !== cmd.id)].slice(0, this.maxHistory);
        
        this.close();
        
        if (typeof cmd.action === 'function') {
            cmd.action();
        } else if (typeof cmd.action === 'string') {
            PRISM_EVENT_BUS?.publish?.(cmd.action);
        }
    },
    
    // Pre-register common commands
    registerDefaults() {
        this.register('save', { label: 'Save', shortcut: 'Ctrl+S', category: 'File', action: () => PRISM_EVENT_BUS?.publish?.('file:save') });
        this.register('open', { label: 'Open File', shortcut: 'Ctrl+O', category: 'File', action: () => PRISM_EVENT_BUS?.publish?.('file:open') });
        this.register('undo', { label: 'Undo', shortcut: 'Ctrl+Z', category: 'Edit', action: () => PRISM_HISTORY?.undo?.() });
        this.register('redo', { label: 'Redo', shortcut: 'Ctrl+Y', category: 'Edit', action: () => PRISM_HISTORY?.redo?.() });
        this.register('theme', { label: 'Toggle Theme', category: 'View', action: () => PRISM_THEME_MANAGER?.toggle?.() });
        this.register('shortcuts', { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', category: 'Help', action: () => {} });
    }
}