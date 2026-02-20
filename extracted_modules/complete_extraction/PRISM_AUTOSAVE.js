const PRISM_AUTOSAVE = {
    interval: 60000, // 1 minute
    maxBackups: 10,
    storageKey: 'prism_autosave',
    timer: null,
    isDirty: false,
    
    init(options = {}) {
        this.interval = options.interval || this.interval;
        this.maxBackups = options.maxBackups || this.maxBackups;
        this.getState = options.getState || (() => ({}));
        this.setState = options.setState || (() => {});
        
        // Check for crash recovery
        this.checkRecovery();
        
        // Start auto-save timer
        this.start();
        
        // Listen for changes
        PRISM_EVENT_BUS?.subscribe?.('state:changed', () => { this.isDirty = true; });
        
        // Save before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                this.save();
                e.returnValue = 'You have unsaved changes.';
                return e.returnValue;
            }
        });
        
        console.log('[PRISM_AUTOSAVE] Initialized');
    },
    
    start() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            if (this.isDirty) {
                this.save();
            }
        }, this.interval);
    },
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },
    
    save() {
        try {
            const state = this.getState();
            const backup = {
                timestamp: Date.now(),
                version: PRISM_CONSTANTS?.VERSION || '1.0',
                state
            };
            
            // Get existing backups
            let backups = this.getBackups();
            
            // Add new backup
            backups.unshift(backup);
            
            // Limit backups
            backups = backups.slice(0, this.maxBackups);
            
            // Save to storage
            localStorage.setItem(this.storageKey, JSON.stringify(backups));
            
            this.isDirty = false;
            console.log('[PRISM_AUTOSAVE] Saved at', new Date().toLocaleTimeString());
            
            PRISM_EVENT_BUS?.publish?.('autosave:saved', backup);
            
            return true;
        } catch (error) {
            console.error('[PRISM_AUTOSAVE] Save failed:', error);
            return false;
        }
    },
    
    getBackups() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },
    
    getLatestBackup() {
        const backups = this.getBackups();
        return backups[0] || null;
    },
    
    recover(index = 0) {
        const backups = this.getBackups();
        const backup = backups[index];
        
        if (!backup) {
            console.warn('[PRISM_AUTOSAVE] No backup found at index', index);
            return false;
        }
        
        try {
            this.setState(backup.state);
            console.log('[PRISM_AUTOSAVE] Recovered from', new Date(backup.timestamp).toLocaleString());
            PRISM_EVENT_BUS?.publish?.('autosave:recovered', backup);
            return true;
        } catch (error) {
            console.error('[PRISM_AUTOSAVE] Recovery failed:', error);
            return false;
        }
    },
    
    checkRecovery() {
        const backup = this.getLatestBackup();
        if (!backup) return;
        
        const age = Date.now() - backup.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
            // Recent backup exists - offer recovery
            PRISM_EVENT_BUS?.publish?.('autosave:recovery_available', backup);
            
            // Could show UI prompt here
            console.log('[PRISM_AUTOSAVE] Recovery available from', new Date(backup.timestamp).toLocaleString());
        }
    },
    
    clearBackups() {
        localStorage.removeItem(this.storageKey);
        console.log('[PRISM_AUTOSAVE] Backups cleared');
    },
    
    getBackupList() {
        return this.getBackups().map((b, i) => ({
            index: i,
            timestamp: b.timestamp,
            date: new Date(b.timestamp).toLocaleString(),
            version: b.version,
            age: this._formatAge(Date.now() - b.timestamp)
        }));
    },
    
    _formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    },
    
    markDirty() {
        this.isDirty = true;
    },
    
    markClean() {
        this.isDirty = false;
    }
}