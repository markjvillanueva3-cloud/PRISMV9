const PRISM_LOGGER = {
    levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
    currentLevel: 1, // INFO
    logs: [],
    maxLogs: 1000,
    listeners: [],
    
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] ?? 1;
        } else {
            this.currentLevel = level;
        }
    },
    
    log(level, module, message, data = {}) {
        const levelNum = typeof level === 'string' ? this.levels[level.toUpperCase()] : level;
        if (levelNum < this.currentLevel) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            level: typeof level === 'string' ? level.toUpperCase() : Object.keys(this.levels)[level],
            module,
            message,
            data,
            stack: level === 'ERROR' || levelNum === 3 ? new Error().stack : undefined
        };
        
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Console output
        const prefix = `[${entry.timestamp.slice(11, 23)}] [${entry.level}] [${module}]`;
        const consoleMethod = entry.level === 'ERROR' ? 'error' : 
                            entry.level === 'WARN' ? 'warn' : 
                            entry.level === 'DEBUG' ? 'debug' : 'log';
        
        if (Object.keys(data).length > 0) {
            console[consoleMethod](prefix, message, data);
        } else {
            console[consoleMethod](prefix, message);
        }
        
        // Notify listeners
        this.listeners.forEach(listener => {
            try { listener(entry); } catch (e) {}
        });
        
        // Emit event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('log:entry', entry);
        }
    },
    
    debug(module, msg, data) { this.log('DEBUG', module, msg, data); },
    info(module, msg, data) { this.log('INFO', module, msg, data); },
    warn(module, msg, data) { this.log('WARN', module, msg, data); },
    error(module, msg, data) { this.log('ERROR', module, msg, data); },
    
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    },
    
    getRecent(count = 100, level = null) {
        let logs = this.logs.slice(-count);
        if (level) {
            logs = logs.filter(l => l.level === level.toUpperCase());
        }
        return logs;
    },
    
    getByModule(module, count = 100) {
        return this.logs
            .filter(l => l.module === module)
            .slice(-count);
    },
    
    search(query) {
        const q = query.toLowerCase();
        return this.logs.filter(l => 
            l.message.toLowerCase().includes(q) ||
            l.module.toLowerCase().includes(q) ||
            JSON.stringify(l.data).toLowerCase().includes(q)
        );
    },
    
    export() {
        return JSON.stringify(this.logs, null, 2);
    },
    
    clear() {
        this.logs = [];
    },
    
    getStatistics() {
        const counts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 };
        const modules = {};
        
        this.logs.forEach(l => {
            counts[l.level]++;
            modules[l.module] = (modules[l.module] || 0) + 1;
        });
        
        return { counts, modules, total: this.logs.length };
    },
    
    selfTest() {
        const results = [];
        
        const initialCount = this.logs.length;
        this.info('TEST', 'Test message', { key: 'value' });
        
        results.push({
            test: 'Log entry creation',
            passed: this.logs.length === initialCount + 1,
            message: 'Log entry created'
        });
        
        const recent = this.getRecent(1);
        results.push({
            test: 'Get recent logs',
            passed: recent.length === 1 && recent[0].module === 'TEST',
            message: `Got ${recent.length} recent logs`
        });
        
        return results;
    }
}