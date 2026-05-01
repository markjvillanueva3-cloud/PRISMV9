const PRISM_ENGINE_CORE = {
    // Engine state
    state: 'uninitialized', // uninitialized, initializing, running, paused, stopping, stopped
    subsystems: new Map(),
    initOrder: [],
    updateOrder: [],
    services: new Map(),
    config: {},
    
    // Lifecycle management
    async initialize(config = {}) {
        if (this.state !== 'uninitialized') {
            throw new Error(`Cannot initialize from state: ${this.state}`);
        }
        
        this.state = 'initializing';
        this.config = { ...this.defaultConfig, ...config };
        
        console.log('[ENGINE] Initializing...');
        
        try {
            // Sort subsystems by dependency
            this._resolveInitOrder();
            
            // Initialize in order
            for (const name of this.initOrder) {
                const subsystem = this.subsystems.get(name);
                console.log(`[ENGINE] Initializing subsystem: ${name}`);
                
                if (subsystem.init) {
                    await subsystem.init(this.config[name] || {});
                }
                subsystem.state = 'initialized';
            }
            
            this.state = 'running';
            console.log('[ENGINE] Initialization complete');
            
            this._emit('engine:initialized');
            
        } catch (error) {
            this.state = 'stopped';
            console.error('[ENGINE] Initialization failed:', error);
            throw error;
        }
    },
    
    async shutdown() {
        if (this.state === 'stopped' || this.state === 'uninitialized') {
            return;
        }
        
        this.state = 'stopping';
        console.log('[ENGINE] Shutting down...');
        
        // Shutdown in reverse order
        const reverseOrder = [...this.initOrder].reverse();
        
        for (const name of reverseOrder) {
            const subsystem = this.subsystems.get(name);
            console.log(`[ENGINE] Shutting down subsystem: ${name}`);
            
            try {
                if (subsystem.shutdown) {
                    await subsystem.shutdown();
                }
                subsystem.state = 'stopped';
            } catch (error) {
                console.error(`[ENGINE] Error shutting down ${name}:`, error);
            }
        }
        
        this.state = 'stopped';
        console.log('[ENGINE] Shutdown complete');
        
        this._emit('engine:shutdown');
    },
    
    // Subsystem registration
    registerSubsystem(name, subsystem, options = {}) {
        if (this.subsystems.has(name)) {
            throw new Error(`Subsystem already registered: ${name}`);
        }
        
        const wrapped = {
            ...subsystem,
            name,
            dependencies: options.dependencies || [],
            priority: options.priority || 0,
            state: 'registered'
        };
        
        this.subsystems.set(name, wrapped);
        console.log(`[ENGINE] Registered subsystem: ${name}`);
        
        return this;
    },
    
    getSubsystem(name) {
        const subsystem = this.subsystems.get(name);
        if (!subsystem) {
            throw new Error(`Unknown subsystem: ${name}`);
        }
        return subsystem;
    },
    
    // Service locator pattern
    registerService(name, service) {
        this.services.set(name, service);
        return this;
    },
    
    getService(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Unknown service: ${name}`);
        }
        return service;
    },
    
    // Main update loop
    update(deltaTime) {
        if (this.state !== 'running') return;
        
        for (const name of this.updateOrder) {
            const subsystem = this.subsystems.get(name);
            if (subsystem.state === 'initialized' && subsystem.update) {
                try {
                    subsystem.update(deltaTime);
                } catch (error) {
                    console.error(`[ENGINE] Update error in ${name}:`, error);
                }
            }
        }
    },
    
    // Fixed timestep update (for physics)
    fixedUpdate(fixedDeltaTime) {
        if (this.state !== 'running') return;
        
        for (const name of this.updateOrder) {
            const subsystem = this.subsystems.get(name);
            if (subsystem.state === 'initialized' && subsystem.fixedUpdate) {
                try {
                    subsystem.fixedUpdate(fixedDeltaTime);
                } catch (error) {
                    console.error(`[ENGINE] FixedUpdate error in ${name}:`, error);
                }
            }
        }
    },
    
    // Resolve initialization order based on dependencies
    _resolveInitOrder() {
        const visited = new Set();
        const order = [];
        
        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);
            
            const subsystem = this.subsystems.get(name);
            if (!subsystem) {
                throw new Error(`Missing dependency: ${name}`);
            }
            
            for (const dep of subsystem.dependencies) {
                visit(dep);
            }
            
            order.push(name);
        };
        
        for (const name of this.subsystems.keys()) {
            visit(name);
        }
        
        this.initOrder = order;
        
        // Update order sorted by priority
        this.updateOrder = [...order].sort((a, b) => {
            const pa = this.subsystems.get(a).priority || 0;
            const pb = this.subsystems.get(b).priority || 0;
            return pb - pa;
        });
    },
    
    // Simple event emission
    _listeners: new Map(),
    
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return () => this.off(event, callback);
    },
    
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            const idx = listeners.indexOf(callback);
            if (idx >= 0) listeners.splice(idx, 1);
        }
    },
    
    _emit(event, data) {
        const listeners = this._listeners.get(event) || [];
        for (const cb of listeners) {
            try {
                cb(data);
            } catch (e) {
                console.error(`[ENGINE] Event handler error:`, e);
            }
        }
    },
    
    // Default configuration
    defaultConfig: {
        fixedTimestep: 1/60,
        maxDeltaTime: 0.1
    }
}