const PRISM_AI_UNIFIED_DATA_CONNECTOR = {

    version: '1.0.0',
    initialized: false,

    // Initialize all connections
    initialize: function() {
        console.log('[AI Data Connector] Initializing unified data connections...');

        // Register with AI systems
        this._registerWithAISystem();
        this._registerWithDeepLearning();
        this._populateMaterialModifiers();

        this.initialized = true;

        const stats = this.getStatistics();
        console.log(`[AI Data Connector] Initialized with ${stats.strategies} strategies, ${stats.materials} materials, ${stats.algorithms} algorithms`);

        return stats;
    },
    // Register with PRISM_AI_COMPLETE_SYSTEM
    _registerWithAISystem: function() {
        if (typeof PRISM_AI_COMPLETE_SYSTEM !== 'undefined') {
            PRISM_AI_COMPLETE_SYSTEM.dataConnector = this;
            console.log('  ✓ Connected to PRISM_AI_COMPLETE_SYSTEM');
        }
        if (typeof PRISM_TRUE_AI_SYSTEM !== 'undefined') {
            PRISM_TRUE_AI_SYSTEM.dataConnector = this;
            console.log('  ✓ Connected to PRISM_TRUE_AI_SYSTEM');
        }
    },
    // Register with Deep Learning systems
    _registerWithDeepLearning: function() {
        if (typeof PRISM_LEARNING_ENGINE !== 'undefined') {
            PRISM_LEARNING_ENGINE.dataConnector = this;
            console.log('  ✓ Connected to PRISM_LEARNING_ENGINE');
        }
        if (typeof PRISM_BAYESIAN_LEARNING !== 'undefined') {
            PRISM_BAYESIAN_LEARNING.dataConnector = this;
            console.log('  ✓ Connected to PRISM_BAYESIAN_LEARNING');
        }
    },
    // Populate material modifiers into all strategies
    _populateMaterialModifiers: function() {
        const allStrategies = PRISM_AI_TOOLPATH_DATABASE.getAllStrategies();
        const allMaterials = PRISM_AI_MATERIAL_MODIFIERS.getAllMaterials();

        let populatedCount = 0;

        for (const strategy of allStrategies) {
            // Get the actual strategy object to modify
            const category = PRISM_AI_TOOLPATH_DATABASE[strategy.category];
            if (category && category[strategy.key]) {
                category[strategy.key].materialModifiers = {};

                for (const material of allMaterials) {
                    category[strategy.key].materialModifiers[material.id] = {
                        speedMultiplier: material.speedMult || material.speedMultiplier || 1.0,
                        feedMultiplier: material.feedMult || material.feedMultiplier || 1.0,
                        docMultiplier: material.docMult || material.docMultiplier || 1.0,
                        wocMultiplier: material.wocMult || material.wocMultiplier || 1.0,
                        notes: material.notes || ''
                    };
                }
                populatedCount++;
            }
        }
        console.log(`  ✓ Populated ${populatedCount} strategies with ${allMaterials.length} material modifiers each`);
    },
    // Get unified data for AI training
    getTrainingData: function(options = {}) {
        const data = {
            strategies: PRISM_AI_TOOLPATH_DATABASE.getAllStrategies(),
            materials: PRISM_AI_MATERIAL_MODIFIERS.getAllMaterials(),
            knowledge: PRISM_AI_KNOWLEDGE_INTEGRATION.getAllAlgorithms(),
            databases: PRISM_AI_DATABASE_CONNECTOR.getAvailableDatabases()
        };
        if (options.includeRawDatabases) {
            data.rawDatabases = {
                materials: PRISM_AI_DATABASE_CONNECTOR.getDatabase('materials', 'primary'),
                tools: PRISM_AI_DATABASE_CONNECTOR.getDatabase('tools', 'database'),
                machines: PRISM_AI_DATABASE_CONNECTOR.getDatabase('machines', 'database')
            };
        }
        return data;
    },
    // Get statistics
    getStatistics: function() {
        return {
            strategies: PRISM_AI_TOOLPATH_DATABASE.getStrategyCount(),
            materials: PRISM_AI_MATERIAL_MODIFIERS.getMaterialCount(),
            materialFamilies: Object.keys(PRISM_AI_MATERIAL_MODIFIERS.materialFamilies).length,
            algorithms: PRISM_AI_KNOWLEDGE_INTEGRATION.getAllAlgorithms().length,
            courses: PRISM_AI_KNOWLEDGE_INTEGRATION.getCourseCount(),
            knowledgeDomains: Object.keys(PRISM_AI_KNOWLEDGE_INTEGRATION.knowledgeDomains).length,
            databaseCategories: Object.keys(PRISM_AI_DATABASE_CONNECTOR.databaseRegistry).length
        };
    },
    // Query interface for AI chatbot
    query: function(queryType, params) {
        switch (queryType) {
            case 'strategy':
                return PRISM_AI_TOOLPATH_DATABASE.getStrategy(params.id);

            case 'material':
                return PRISM_AI_MATERIAL_MODIFIERS.getModifiersForMaterial(params.id);

            case 'strategyForMaterial':
                const strategy = PRISM_AI_TOOLPATH_DATABASE.getStrategy(params.strategyId);
                const material = PRISM_AI_MATERIAL_MODIFIERS.getModifiersForMaterial(params.materialId);
                if (strategy && material) {
                    return {
                        strategy,
                        material,
                        adjustedParameters: this._adjustParameters(strategy.parameters, material)
                    };
                }
                return null;

            case 'knowledge':
                return PRISM_AI_KNOWLEDGE_INTEGRATION.getKnowledgeForDomain(params.domain);

            default:
                return null;
        }
    },
    _adjustParameters: function(strategyParams, materialModifiers) {
        if (!strategyParams) return null;

        const adjusted = {};
        for (const [param, config] of Object.entries(strategyParams)) {
            if (config.default !== undefined) {
                let value = config.default;

                // Apply material modifiers
                if (param.includes('speed') && materialModifiers.speedMultiplier) {
                    value *= materialModifiers.speedMultiplier;
                } else if (param.includes('feed') && materialModifiers.feedMultiplier) {
                    value *= materialModifiers.feedMultiplier;
                } else if (param.includes('depth') || param.includes('doc') || param.includes('stepdown')) {
                    value *= materialModifiers.docMultiplier || 1.0;
                } else if (param.includes('width') || param.includes('woc') || param.includes('stepover')) {
                    value *= materialModifiers.wocMultiplier || 1.0;
                }
                // Clamp to range if available
                if (config.range && Array.isArray(config.range)) {
                    value = Math.max(config.range[0], Math.min(config.range[1], value));
                }
                adjusted[param] = {
                    originalValue: config.default,
                    adjustedValue: value,
                    unit: config.unit
                };
            }
        }
        return adjusted;
    },
    // Generate training samples for neural network
    generateNeuralTrainingSamples: function(count = 1000) {
        const samples = [];
        const strategies = PRISM_AI_TOOLPATH_DATABASE.getAllStrategies();
        const materials = PRISM_AI_MATERIAL_MODIFIERS.getAllMaterials();

        for (let i = 0; i < count; i++) {
            // Random strategy and material
            const strategy = strategies[Math.floor(Math.random() * strategies.length)];
            const material = materials[Math.floor(Math.random() * materials.length)];

            // Create input vector
            const input = [
                this._encodeCategory(strategy.category),
                this._encodeMaterialFamily(material.family),
                material.speedMult || 1.0,
                material.feedMult || 1.0,
                material.docMult || 1.0,
                strategy.speedModifier || 1.0,
                strategy.feedModifier || 1.0
            ];

            // Create output vector (adjusted parameters)
            const output = [
                (material.speedMult || 1.0) * (strategy.speedModifier || 1.0),
                (material.feedMult || 1.0) * (strategy.feedModifier || 1.0),
                material.docMult || 1.0
            ];

            samples.push({ input, output, meta: { strategy: strategy.id, material: material.id } });
        }
        return samples;
    },
    _encodeCategory: function(category) {
        const categories = ['roughing', 'finishing', 'drilling', 'turning', '5-axis', 'specialty', 'contouring', 'facing'];
        const index = categories.indexOf(category);
        return index >= 0 ? index / categories.length : 0.5;
    },
    _encodeMaterialFamily: function(family) {
        const families = ['aluminum', 'steel', 'stainless', 'titanium', 'nickel', 'cast_iron', 'copper', 'plastic', 'composite'];
        const index = families.indexOf(family);
        return index >= 0 ? index / families.length : 0.5;
    }
}