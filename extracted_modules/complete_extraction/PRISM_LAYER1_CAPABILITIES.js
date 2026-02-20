const PRISM_LAYER1_CAPABILITIES = {

    /**
     * Register all Layer 1 capabilities with PRISM_CAPABILITY_REGISTRY
     */
    registerAll() {
        // Material Lookup Capability
        PRISM_CAPABILITY_REGISTRY.register('layer1.materials', {
            id: 'materials.lookup',
            name: 'Material Database Lookup',
            description: 'Look up material properties by name, ID, or ISO classification',
            category: 'materials',
            inputs: {
                query: { type: 'string', required: true, description: 'Material name, ID, or search term' },
                type: { type: 'string', required: false, options: ['name', 'id', 'iso', 'search'] }
            },
            outputs: {
                material: { type: 'object', description: 'Complete material data with cutting parameters' }
            },
            execute: async (inputs) => {
                const { query, type = 'search' } = inputs;
                let result = null;

                if (typeof PRISM_MATERIALS_MASTER !== 'undefined') {
                    if (type === 'id' && PRISM_MATERIALS_MASTER.byId) {
                        result = PRISM_MATERIALS_MASTER.byId(query);
                    } else if (PRISM_MATERIALS_MASTER.materials) {
                        result = PRISM_MATERIALS_MASTER.materials.find(m =>
                            m.name?.toLowerCase().includes(query.toLowerCase()) ||
                            m.iso_code?.includes(query)
                        );
                    }
                }
                PRISM_EVENT_BUS.publish('materials:lookup:complete', { query, result });
                return result;
            },
            preferredUI: 'search-panel'
        });

        // Material Cutting Parameters Capability
        PRISM_CAPABILITY_REGISTRY.register('layer1.materials', {
            id: 'materials.cuttingParams',
            name: 'Get Cutting Parameters',
            description: 'Calculate optimal cutting parameters for material/tool combination',
            category: 'materials',
            inputs: {
                materialId: { type: 'string', required: true },
                toolType: { type: 'string', required: true },
                toolDiameter: { type: 'number', required: true, unit: 'mm' },
                operation: { type: 'string', required: false }
            },
            outputs: {
                speed: { type: 'number', unit: 'm/min', description: 'Cutting speed' },
                feed: { type: 'number', unit: 'mm/tooth', description: 'Feed per tooth' },
                doc: { type: 'number', unit: 'mm', description: 'Depth of cut' },
                woc: { type: 'number', unit: 'mm', description: 'Width of cut' }
            },
            execute: async (inputs) => {
                const { materialId, toolType, toolDiameter, operation = 'roughing' } = inputs;

                // Get material data
                let material = null;
                if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && PRISM_MATERIALS_MASTER.byId) {
                    material = PRISM_MATERIALS_MASTER.byId(materialId);
                }
                if (!material) {
                    throw new Error(`Material not found: ${materialId}`);
                }
                // Calculate parameters using Layer 1 formulas
                const params = {
                    speed: material.cutting_speed_range?.[operation === 'finishing' ? 1 : 0] || 100,
                    feed: material.feed_per_tooth?.[operation === 'finishing' ? 1 : 0] || 0.1,
                    doc: toolDiameter * (operation === 'finishing' ? 0.1 : 0.5),
                    woc: toolDiameter * (operation === 'finishing' ? 0.3 : 0.7),
                    rpm: (1000 * (material.cutting_speed_range?.[0] || 100)) / (Math.PI * toolDiameter)
                };
                PRISM_EVENT_BUS.publish('materials:params:calculated', { inputs, params });
                return params;
            },
            preferredUI: 'parameter-panel'
        });

        // Tool Holder Lookup
        PRISM_CAPABILITY_REGISTRY.register('layer1.tooling', {
            id: 'tooling.holderLookup',
            name: 'Tool Holder Lookup',
            description: 'Find compatible tool holders by interface type',
            category: 'tooling',
            inputs: {
                interface: { type: 'string', required: false, description: 'Interface type (HSK-A63, BT40, etc.)' },
                toolDiameter: { type: 'number', required: false, unit: 'mm' }
            },
            outputs: {
                holders: { type: 'array', description: 'Compatible tool holders' }
            },
            execute: async (inputs) => {
                const { interface: iface, toolDiameter } = inputs;
                let holders = [];

                if (typeof PRISM_TOOL_HOLDER_INTERFACES_COMPLETE !== 'undefined') {
                    holders = PRISM_TOOL_HOLDER_INTERFACES_COMPLETE.types || [];

                    if (iface) {
                        holders = holders.filter(h => h.interface === iface || h.name?.includes(iface));
                    }
                    if (toolDiameter) {
                        holders = holders.filter(h =>
                            h.min_tool_diameter <= toolDiameter && h.max_tool_diameter >= toolDiameter
                        );
                    }
                }
                PRISM_EVENT_BUS.publish('tooling:holders:found', { inputs, count: holders.length });
                return holders;
            },
            preferredUI: 'list-panel'
        });

        // Coating Lookup
        PRISM_CAPABILITY_REGISTRY.register('layer1.tooling', {
            id: 'tooling.coatingLookup',
            name: 'Tool Coating Lookup',
            description: 'Find optimal coating for material/operation',
            category: 'tooling',
            inputs: {
                materialType: { type: 'string', required: false },
                operation: { type: 'string', required: false }
            },
            outputs: {
                coatings: { type: 'array', description: 'Recommended coatings' }
            },
            execute: async (inputs) => {
                const { materialType, operation } = inputs;
                let coatings = [];

                if (typeof PRISM_COATINGS_COMPLETE !== 'undefined') {
                    coatings = PRISM_COATINGS_COMPLETE.types || [];

                    if (materialType) {
                        coatings = coatings.filter(c =>
                            c.suitable_materials?.includes(materialType) ||
                            c.applications?.some(a => a.toLowerCase().includes(materialType.toLowerCase()))
                        );
                    }
                }
                PRISM_EVENT_BUS.publish('tooling:coatings:found', { inputs, count: coatings.length });
                return coatings;
            },
            preferredUI: 'list-panel'
        });

        // Taylor Tool Life Prediction
        PRISM_CAPABILITY_REGISTRY.register('layer1.analytics', {
            id: 'analytics.taylorToolLife',
            name: 'Taylor Tool Life Prediction',
            description: 'Predict tool life using Taylor equation: VT^n = C',
            category: 'analytics',
            inputs: {
                cuttingSpeed: { type: 'number', required: true, unit: 'm/min' },
                materialId: { type: 'string', required: true },
                toolMaterial: { type: 'string', required: true }
            },
            outputs: {
                toolLife: { type: 'number', unit: 'minutes', description: 'Predicted tool life' },
                taylorN: { type: 'number', description: 'Taylor exponent' },
                taylorC: { type: 'number', description: 'Taylor constant' }
            },
            execute: async (inputs) => {
                const { cuttingSpeed, materialId, toolMaterial } = inputs;

                // Get Taylor parameters
                let n = 0.25; // Default
                let C = 300;  // Default

                if (typeof PRISM_TAYLOR_COMPLETE !== 'undefined' && PRISM_TAYLOR_COMPLETE.combinations) {
                    const combo = PRISM_TAYLOR_COMPLETE.combinations.find(c =>
                        c.workpiece_material === materialId && c.tool_material === toolMaterial
                    );
                    if (combo) {
                        n = combo.n;
                        C = combo.C;
                    }
                }
                // Taylor equation: T = (C/V)^(1/n)
                const toolLife = Math.pow(C / cuttingSpeed, 1 / n);

                const result = { toolLife, taylorN: n, taylorC: C };
                PRISM_EVENT_BUS.publish('analytics:toolLife:calculated', { inputs, result });
                return result;
            },
            preferredUI: 'result-panel'
        });

        console.log('[RETROFIT] Layer 1 capabilities registered: 5');
    }
}