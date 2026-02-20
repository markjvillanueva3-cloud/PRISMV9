const PRISM_RECENT_FILES = {
    storageKey: 'prism_recent_files',
    maxFiles: 20,
    files: [],
    
    init() {
        this.load();
        console.log('[PRISM_RECENT_FILES] Initialized with', this.files.length, 'files');
    },
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            this.files = data ? JSON.parse(data) : [];
        } catch {
            this.files = [];
        }
    },
    
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.files));
    },
    
    add(file) {
        const entry = {
            path: file.path || file.name,
            name: file.name || file.path.split('/').pop(),
            type: file.type || this._getType(file.path || file.name),
            timestamp: Date.now(),
            thumbnail: file.thumbnail || null,
            metadata: file.metadata || {}
        };
        
        // Remove if already exists
        this.files = this.files.filter(f => f.path !== entry.path);
        
        // Add to front
        this.files.unshift(entry);
        
        // Limit size
        this.files = this.files.slice(0, this.maxFiles);
        
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    remove(path) {
        this.files = this.files.filter(f => f.path !== path);
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    clear() {
        this.files = [];
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    getAll() {
        return this.files.map(f => ({
            ...f,
            age: this._formatAge(Date.now() - f.timestamp)
        }));
    },
    
    getRecent(count = 5) {
        return this.getAll().slice(0, count);
    },
    
    getByType(type) {
        return this.files.filter(f => f.type === type);
    },
    
    _getType(path) {
        const ext = path.split('.').pop().toLowerCase();
        const types = {
            'prism': 'project',
            'step': 'cad', 'stp': 'cad', 'iges': 'cad', 'igs': 'cad',
            'nc': 'gcode', 'ngc': 'gcode', 'gcode': 'gcode', 'tap': 'gcode',
            'stl': 'mesh', 'obj': 'mesh', '3mf': 'mesh',
            'dxf': 'drawing', 'dwg': 'drawing'
        };
        return types[ext] || 'unknown';
    },
    
    _formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        return `${weeks}w ago`;
    },
    
    createMenu() {
        const menu = document.createElement('div');
        menu.className = 'recent-files-menu';
        menu.style.cssText = `
            min-width: 300px; max-height: 400px;
            overflow-y: auto; padding: 8px 0;
        `;
        
        if (this.files.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No recent files';
            empty.style.cssText = 'padding: 16px; text-align: center; color: var(--text-muted);';
            menu.appendChild(empty);
            return menu;
        }
        
        const files = this.getAll();
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'recent-file-item';
            item.style.cssText = `
                display: flex; align-items: center; padding: 8px 16px;
                cursor: pointer; gap: 12px;
            `;
            
            const icon = document.createElement('span');
            icon.textContent = this._getIcon(file.type);
            icon.style.fontSize = '20px';
            
            const info = document.createElement('div');
            info.style.flex = '1';
            info.innerHTML = `
                <div style="font-weight:500">${file.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${file.path}</div>
            `;
            
            const age = document.createElement('span');
            age.textContent = file.age;
            age.style.cssText = 'font-size:11px;color:var(--text-muted)';
            
            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(age);
            
            item.addEventListener('click', () => {
                PRISM_EVENT_BUS?.publish?.('file:open', { path: file.path });
            });
            
            item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-secondary)'; });
            item.addEventListener('mouseleave', () => { item.style.background = ''; });
            
            menu.appendChild(item);
        });
        
        // Clear button
        const clearBtn = document.createElement('div');
        clearBtn.textContent = 'Clear Recent Files';
        clearBtn.style.cssText = `
            padding: 8px 16px; text-align: center;
            border-top: 1px solid var(--border);
            cursor: pointer; color: var(--text-muted);
        `;
        clearBtn.addEventListener('click', () => this.clear());
        menu.appendChild(clearBtn);
        
        return menu;
    },
    
    _getIcon(type) {
        const icons = {
            project: '📁', cad: '🔧', gcode: '📄',
            mesh: '🔺', drawing: '📐', unknown: '📄'
        };
        return icons[type] || icons.unknown;
    }
}