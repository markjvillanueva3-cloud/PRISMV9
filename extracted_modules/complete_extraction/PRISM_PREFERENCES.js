const PRISM_PREFERENCES = {
    storageKey: 'prism_preferences',
    defaults: {},
    values: {},
    schema: [],
    
    init(schema, defaults = {}) {
        this.schema = schema;
        this.defaults = defaults;
        this.load();
        console.log('[PRISM_PREFERENCES] Initialized');
    },
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const saved = data ? JSON.parse(data) : {};
            this.values = { ...this.defaults, ...saved };
        } catch {
            this.values = { ...this.defaults };
        }
    },
    
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.values));
        PRISM_EVENT_BUS?.publish?.('preferences:changed', this.values);
    },
    
    get(key, defaultValue) {
        return this.values[key] ?? defaultValue ?? this.defaults[key];
    },
    
    set(key, value) {
        const oldValue = this.values[key];
        this.values[key] = value;
        this.save();
        PRISM_EVENT_BUS?.publish?.(`preference:${key}`, { value, oldValue });
    },
    
    reset(key) {
        if (key) {
            this.values[key] = this.defaults[key];
        } else {
            this.values = { ...this.defaults };
        }
        this.save();
    },
    
    export() {
        return JSON.stringify(this.values, null, 2);
    },
    
    import(json) {
        try {
            const data = JSON.parse(json);
            this.values = { ...this.defaults, ...data };
            this.save();
            return true;
        } catch {
            return false;
        }
    },
    
    createPanel(container) {
        container.innerHTML = '';
        container.className = 'prism-preferences-panel';
        
        // Group by category
        const grouped = new Map();
        this.schema.forEach(pref => {
            const cat = pref.category || 'General';
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat).push(pref);
        });
        
        for (const [category, prefs] of grouped) {
            const section = document.createElement('div');
            section.className = 'pref-section';
            
            const header = document.createElement('h3');
            header.textContent = category;
            header.style.cssText = 'margin: 16px 0 8px; padding: 8px 0; border-bottom: 1px solid var(--border);';
            section.appendChild(header);
            
            prefs.forEach(pref => {
                const row = this._createPrefRow(pref);
                section.appendChild(row);
            });
            
            container.appendChild(section);
        }
        
        // Buttons
        const buttons = document.createElement('div');
        buttons.style.cssText = 'margin-top: 20px; display: flex; gap: 8px;';
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Defaults';
        resetBtn.addEventListener('click', () => { this.reset(); this.createPanel(container); });
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => {
            const data = this.export();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prism-preferences.json';
            a.click();
        });
        
        buttons.appendChild(resetBtn);
        buttons.appendChild(exportBtn);
        container.appendChild(buttons);
    },
    
    _createPrefRow(pref) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; padding: 8px 0;';
        
        const label = document.createElement('label');
        label.textContent = pref.label;
        label.style.cssText = 'flex: 0 0 200px;';
        if (pref.description) label.title = pref.description;
        
        let input;
        const value = this.get(pref.key);
        
        switch (pref.type) {
            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = value;
                input.addEventListener('change', () => this.set(pref.key, input.checked));
                break;
                
            case 'select':
                input = document.createElement('select');
                input.style.cssText = 'padding: 4px 8px;';
                pref.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value ?? opt;
                    option.textContent = opt.label ?? opt;
                    option.selected = option.value === value;
                    input.appendChild(option);
                });
                input.addEventListener('change', () => this.set(pref.key, input.value));
                break;
                
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                input.min = pref.min;
                input.max = pref.max;
                input.step = pref.step || 1;
                input.style.cssText = 'width: 100px; padding: 4px 8px;';
                input.addEventListener('change', () => this.set(pref.key, parseFloat(input.value)));
                break;
                
            case 'color':
                input = document.createElement('input');
                input.type = 'color';
                input.value = value;
                input.addEventListener('change', () => this.set(pref.key, input.value));
                break;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.style.cssText = 'flex: 1; padding: 4px 8px;';
                input.addEventListener('change', () => this.set(pref.key, input.value));
        }
        
        row.appendChild(label);
        row.appendChild(input);
        
        return row;
    }
}