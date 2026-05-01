const PRISM_PLUGIN_MANAGER = {
    plugins: new Map(),
    hooks: new Map(),
    initialized: false,
    
    register(plugin) {
        // Validate plugin
        if (!plugin.id || !plugin.name || !plugin.version) {
            console.error('[PRISM_PLUGIN_MANAGER] Plugin must have id, name, and version');
            return false;
        }
        
        if (this.plugins.has(plugin.id)) {
            console.warn(`[PRISM_PLUGIN_MANAGER] Plugin ${plugin.id} already registered`);
            return false;
        }
        
        // Store plugin
        this.plugins.set(plugin.id, {
            ...plugin,
            enabled: true,
            loadedAt: Date.now()
        });
        
        // Initialize plugin if manager is already initialized
        if (this.initialized && typeof plugin.init === 'function') {
            try {
                plugin.init(this.getAPI());
            } catch (error) {
                console.error(`[PRISM_PLUGIN_MANAGER] Failed to init ${plugin.id}:`, error);
            }
        }
        
        // Register plugin hooks
        if (plugin.hooks) {
            Object.entries(plugin.hooks).forEach(([hook, handler]) => {
                this.addHook(hook, handler, plugin.id);
            });
        }
        
        console.log(`[PRISM_PLUGIN_MANAGER] Registered: ${plugin.name} v${plugin.version}`);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('plugin:registered', { id: plugin.id, name: plugin.name });
        }
        
        return true;
    },
    
    unregister(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        
        // Call cleanup if available
        if (typeof plugin.cleanup === 'function') {
            plugin.cleanup();
        }
        
        // Remove hooks
        for (const [hookName, handlers] of this.hooks) {
            this.hooks.set(hookName, handlers.filter(h => h.pluginId !== pluginId));
        }
        
        this.plugins.delete(pluginId);
        console.log(`[PRISM_PLUGIN_MANAGER] Unregistered: ${pluginId}`);
        
        return true;
    },
    
    addHook(name, handler, pluginId) {
        if (!this.hooks.has(name)) {
            this.hooks.set(name, []);
        }
        this.hooks.get(name).push({ handler, pluginId, priority: 0 });
    },
    
    async executeHook(name, data) {
        if (!this.hooks.has(name)) return data;
        
        const handlers = this.hooks.get(name)
            .filter(h => {
                const plugin = this.plugins.get(h.pluginId);
                return plugin && plugin.enabled;
            })
            .sort((a, b) => b.priority - a.priority);
        
        let result = data;
        for (const { handler, pluginId } of handlers) {
            try {
                result = await handler(result);
            } catch (error) {
                console.error(`[PRISM_PLUGIN_MANAGER] Hook ${name} failed for ${pluginId}:`, error);
            }
        }
        
        return result;
    },
    
    getAPI() {
        return {
            gateway: typeof PRISM_GATEWAY !== 'undefined' ? PRISM_GATEWAY : null,
            eventBus: typeof PRISM_EVENT_BUS !== 'undefined' ? PRISM_EVENT_BUS : null,
            state: typeof PRISM_STATE_STORE !== 'undefined' ? PRISM_STATE_STORE : null,
            ui: typeof PRISM_UI_ADAPTER !== 'undefined' ? PRISM_UI_ADAPTER : null,
            toast: PRISM_TOAST,
            progress: PRISM_PROGRESS,
            history: PRISM_HISTORY
        };
    },
    
    init() {
        if (this.initialized) return;
        
        // Initialize all registered plugins
        for (const [id, plugin] of this.plugins) {
            if (typeof plugin.init === 'function') {
                try {
                    plugin.init(this.getAPI());
                } catch (error) {
                    console.error(`[PRISM_PLUGIN_MANAGER] Failed to init ${id}:`, error);
                }
            }
        }
        
        this.initialized = true;
        console.log(`[PRISM_PLUGIN_MANAGER] Initialized ${this.plugins.size} plugins`);
    },
    
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = true;
            return true;
        }
        return false;
    },
    
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = false;
            return true;
        }
        return false;
    },
    
    getPlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            enabled: p.enabled
        }));
    },
    
    selfTest() {
        const results = [];
        
        // Test plugin registration
        const testPlugin = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            init: (api) => console.log('Test plugin initialized'),
            hooks: {
                'test:hook': (data) => ({ ...data, modified: true })
            }
        };
        
        const registered = this.register(testPlugin);
        results.push({
            test: 'Register plugin',
            passed: registered && this.plugins.has('test-plugin'),
            message: registered ? 'Registered' : 'Failed to register'
        });
        
        // Test hook execution
        this.executeHook('test:hook', { value: 1 }).then(result => {
            results.push({
                test: 'Execute hook',
                passed: result.modified === true,
                message: result.modified ? 'Hook modified data' : 'Hook failed'
            });
        });
        
        // Cleanup
        this.unregister('test-plugin');
        
        return results;
    }
}