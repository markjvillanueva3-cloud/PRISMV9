const PRISM_LAZY_LOADER = {
    loaded: new Set(),
    loading: new Map(),
    
    databases: {
        materials: { size: 'large', priority: 'high' },
        machines: { size: 'large', priority: 'high' },
        tools: { size: 'large', priority: 'high' },
        toolHolders: { size: 'medium', priority: 'medium' },
        workHolding: { size: 'medium', priority: 'medium' },
        coatings: { size: 'small', priority: 'low' },
        strategies: { size: 'medium', priority: 'high' },
        postProcessors: { size: 'medium', priority: 'medium' }
    },
    
    async load(database) {
        if (this.loaded.has(database)) {
            return true;
        }
        
        if (this.loading.has(database)) {
            return this.loading.get(database);
        }
        
        const promise = new Promise(async (resolve) => {
            const startTime = performance.now();
            console.log(`[PRISM_LAZY_LOADER] Loading ${database}...`);
            
            // In production, this would fetch from separate files
            // For now, we mark as loaded (databases are in main build)
            await new Promise(r => setTimeout(r, 10)); // Simulate async
            
            this.loaded.add(database);
            this.loading.delete(database);
            
            const elapsed = performance.now() - startTime;
            console.log(`[PRISM_LAZY_LOADER] Loaded ${database} in ${elapsed.toFixed(1)}ms`);
            
            resolve(true);
        });
        
        this.loading.set(database, promise);
        return promise;
    },
    
    async ensure(databases) {
        const toLoad = databases.filter(db => !this.loaded.has(db));
        if (toLoad.length === 0) return true;
        
        return Promise.all(toLoad.map(db => this.load(db)));
    },
    
    async preload(priority = 'high') {
        const toPreload = Object.entries(this.databases)
            .filter(([_, config]) => config.priority === priority)
            .map(([name, _]) => name);
        
        console.log(`[PRISM_LAZY_LOADER] Preloading ${priority} priority:`, toPreload);
        return this.ensure(toPreload);
    },
    
    isLoaded(database) {
        return this.loaded.has(database);
    },
    
    isLoading(database) {
        return this.loading.has(database);
    },
    
    getStatus() {
        return {
            loaded: Array.from(this.loaded),
            loading: Array.from(this.loading.keys()),
            pending: Object.keys(this.databases).filter(
                db => !this.loaded.has(db) && !this.loading.has(db)
            )
        };
    },
    
    selfTest() {
        const results = [];
        
        // Test load
        this.load('test_db').then(() => {
            results.push({
                test: 'Load database',
                passed: this.loaded.has('test_db'),
                message: 'Database loaded'
            });
        });
        
        // Test isLoaded
        results.push({
            test: 'isLoaded check',
            passed: !this.isLoaded('nonexistent'),
            message: 'Correctly reports unloaded'
        });
        
        return results;
    }
}