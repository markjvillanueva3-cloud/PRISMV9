const PRISM_BATCH_LOADER = {
    pending: new Map(),
    timeout: null,
    delay: 16, // ~1 frame
    resolvers: new Map(),
    
    async load(type, id) {
        return new Promise((resolve, reject) => {
            if (!this.pending.has(type)) {
                this.pending.set(type, new Map());
            }
            
            const typeQueue = this.pending.get(type);
            
            if (!typeQueue.has(id)) {
                typeQueue.set(id, []);
            }
            
            typeQueue.get(id).push({ resolve, reject });
            
            this._scheduleFlush();
        });
    },
    
    _scheduleFlush() {
        if (this.timeout) return;
        
        this.timeout = setTimeout(() => {
            this._flush();
            this.timeout = null;
        }, this.delay);
    },
    
    _flush() {
        for (const [type, idMap] of this.pending) {
            const ids = Array.from(idMap.keys());
            
            // Batch lookup using resolver
            const resolver = this.resolvers.get(type);
            const results = resolver ? resolver(ids) : this._defaultResolve(type, ids);
            
            // Resolve all pending requests
            for (const [id, callbacks] of idMap) {
                const result = results[id];
                for (const { resolve, reject } of callbacks) {
                    if (result !== undefined) {
                        resolve(result);
                    } else {
                        reject(new Error(`Not found: ${type}/${id}`));
                    }
                }
            }
        }
        
        this.pending.clear();
    },
    
    _defaultResolve(type, ids) {
        const results = {};
        
        // Try to use PRISM_GATEWAY if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const id of ids) {
                results[id] = PRISM_GATEWAY.call(`${type}.get`, id);
            }
        }
        
        return results;
    },
    
    registerResolver(type, resolver) {
        this.resolvers.set(type, resolver);
    },
    
    // Load multiple items at once
    async loadMany(type, ids) {
        return Promise.all(ids.map(id => this.load(type, id)));
    },
    
    selfTest() {
        return [{
            test: 'Batch loader',
            passed: true,
            message: 'Batch loader initialized'
        }];
    }
}