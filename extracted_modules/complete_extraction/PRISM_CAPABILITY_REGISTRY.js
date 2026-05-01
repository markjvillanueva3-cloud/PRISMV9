const PRISM_CAPABILITY_REGISTRY = {
    version: '1.0.0',

    // Registry of all capabilities: { id: capability }
    capabilities: {},

    // Category and layer indices
    byCategory: {},
    byLayer: {},

    /**
     * Register a module capability
     * @param {string} moduleId - Full module path (e.g., 'layer3.algorithms.voronoi')
     * @param {object} capability - Capability definition
     */
    register(moduleId, capability) {
        const entry = {
            id: capability.id || moduleId,
            module: moduleId,
            name: capability.name,
            description: capability.description || '',
            category: capability.category || 'general',
            layer: capability.layer || this._inferLayer(moduleId),

            // Input/Output schema for auto-generating UI
            inputs: capability.inputs || {},
            outputs: capability.outputs || {},

            // UI hints
            ui: {
                icon: capability.icon || 'âš™ï¸',
                preferredComponent: capability.preferredComponent || null,
                menuPath: capability.menuPath || null,
                shortcut: capability.shortcut || null
            },
            // Execution function
            execute: capability.execute || null,

            // Metadata
            registered: Date.now(),
            version: capability.version || '1.0.0',
            source: capability.source || null
        };
        // Store in registry
        this.capabilities[entry.id] = entry;

        // Index by category
        if (!this.byCategory[entry.category]) {
            this.byCategory[entry.category] = [];
        }
        this.byCategory[entry.category].push(entry.id);

        // Index by layer
        if (!this.byLayer[entry.layer]) {
            this.byLayer[entry.layer] = [];
        }
        this.byLayer[entry.layer].push(entry.id);

        PRISM_EVENT_BUS.publish('capability:registered', entry, { source: 'CAPABILITY_REGISTRY' });
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] Registered capability: ${entry.name} (${entry.id})`);

        return entry.id;
    },
    /**
     * Get all capabilities
     */
    getAll() {
        return Object.values(this.capabilities);
    },
    /**
     * Get capabilities by category
     */
    getByCategory(category) {
        const ids = this.byCategory[category] || [];
        return ids.map(id => this.capabilities[id]);
    },
    /**
     * Get capabilities by layer
     */
    getByLayer(layer) {
        const ids = this.byLayer[layer] || [];
        return ids.map(id => this.capabilities[id]);
    },
    /**
     * Get a specific capability
     */
    get(id) {
        return this.capabilities[id] || null;
    },
    /**
     * Execute a capability
     */
    async execute(id, inputs) {
        const capability = this.capabilities[id];
        if (!capability) {
            throw new Error(`Unknown capability: ${id}`);
        }
        if (!capability.execute) {
            throw new Error(`Capability ${id} has no execute function`);
        }
        // Validate inputs
        const errors = this._validateInputs(inputs, capability.inputs);
        if (errors.length > 0) {
            throw new Error(`Invalid inputs: ${errors.join(', ')}`);
        }
        PRISM_EVENT_BUS.publish('capability:executing', { id, inputs }, { source: 'CAPABILITY_REGISTRY' });

        try {
            const result = await capability.execute(inputs);
            PRISM_EVENT_BUS.publish('capability:complete', { id, inputs, result }, { source: 'CAPABILITY_REGISTRY' });
            return result;
        } catch (error) {
            PRISM_EVENT_BUS.publish('capability:error', { id, inputs, error }, { source: 'CAPABILITY_REGISTRY' });
            throw error;
        }
    },
    /**
     * Generate UI schema for a capability (for auto-generating forms)
     */
    getUISchema(id) {
        const capability = this.capabilities[id];
        if (!capability) return null;

        return {
            title: capability.name,
            description: capability.description,
            fields: Object.entries(capability.inputs).map(([name, schema]) => ({
                name,
                label: schema.label || name,
                type: schema.type || 'text',
                required: schema.required || false,
                defaultValue: schema.default,
                options: schema.options,
                min: schema.min,
                max: schema.max
            }))
        };
    },
    /**
     * Get menu structure for auto-generating menus
     */
    getMenuStructure() {
        const menu = {};

        for (const cap of Object.values(this.capabilities)) {
            const path = cap.ui.menuPath || `${cap.category}/${cap.name}`;
            const parts = path.split('/');

            let current = menu;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = { _items: [], _submenu: {} };
                }
                current = current[parts[i]]._submenu;
            }
            if (!current._items) current._items = [];
            current._items.push({
                id: cap.id,
                label: parts[parts.length - 1],
                icon: cap.ui.icon,
                shortcut: cap.ui.shortcut
            });
        }
        return menu;
    },
    _inferLayer(moduleId) {
        const match = moduleId.match(/layer(\d+)/i);
        return match ? parseInt(match[1]) : 0;
    },
    _validateInputs(inputs, schema) {
        const errors = [];

        for (const [name, config] of Object.entries(schema)) {
            if (config.required && (inputs[name] === undefined || inputs[name] === null)) {
                errors.push(`${name} is required`);
            }
            if (inputs[name] !== undefined && config.type) {
                const actualType = typeof inputs[name];
                if (config.type === 'number' && actualType !== 'number') {
                    errors.push(`${name} must be a number`);
                }
            }
        }
        return errors;
    }
}