const PRISM_AI_DATABASE_CONNECTOR = {

    version: '1.0.0',
    created: '2026-01-15',

    // Database Registry - ALL databases the AI can access
    databaseRegistry: {

        // LAYER 1: Materials & Tools
        materials: {
            primary: 'PRISM_MATERIALS_MASTER',
            aliases: 'PRISM_MATERIAL_ALIASES',
            cutting: 'PRISM_MATERIAL_KC_DATABASE',
            thermal: 'PRISM_THERMAL_PROPERTIES',
            johnsonCook: 'PRISM_JOHNSON_COOK_DATABASE',
            groups: 'PRISM_MATERIAL_GROUPS_COMPLETE',
            extended: 'PRISM_EXTENDED_MATERIAL_CUTTING_DB',
            unified: 'PRISM_UNIFIED_MATERIAL_ACCESS'
        },
        tools: {
            database: 'PRISM_CUTTING_TOOL_DATABASE_V2',
            holders: 'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE',
            coatings: 'PRISM_COATINGS_COMPLETE',
            types: 'PRISM_TOOL_TYPES_COMPLETE',
            life: 'PRISM_TOOL_LIFE_ESTIMATOR',
            performance: 'PRISM_TOOL_PERFORMANCE_ENGINE'
        },
        // LAYER 2: Machines & Controllers
        machines: {
            database: 'MachineDatabase',
            unified: 'PRISM_UNIFIED_MANUFACTURER_DATABASE',
            controllers: 'PRISM_CONTROLLER_DATABASE',
            capabilities: 'PRISM_CAPABILITY_ASSESSMENT_DATABASE',
            integration: 'PRISM_DEEP_MACHINE_INTEGRATION'
        },
        // LAYER 3: Toolpath Strategies
        toolpaths: {
            complete: 'PRISM_TOOLPATH_STRATEGIES_COMPLETE',
            parameters: 'PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE',
            optimization: 'PRISM_TOOLPATH_OPTIMIZATION',
            decision: 'PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE',
            featureStrategy: 'PRISM_FEATURE_STRATEGY_COMPLETE'
        },
        // LAYER 4: CAD/CAM Operations
        cam: {
            adaptive: 'PRISM_ADAPTIVE_CLEARING_ENGINE',
            hsm: 'PRISM_ADAPTIVE_HSM_ENGINE',
            multiaxis: 'PRISM_MULTIAXIS_TOOLPATH_ENGINE',
            rest: 'PRISM_REST_MACHINING_ENGINE',
            aircut: 'PRISM_AIRCUT_ELIMINATION_ENGINE',
            lathe: 'PRISM_ENHANCED_LATHE_OPERATIONS_ENGINE'
        },
        // LAYER 5: Post Processors
        posts: {
            database: 'PRISM_VERIFIED_POST_DATABASE_V2',
            fusion: 'PRISM_FUSION_POST_DATABASE',
            enhanced: 'PRISM_ENHANCED_POST_DATABASE_V2',
            universal: 'PRISM_UNIVERSAL_POST_GENERATOR_V2'
        },
        // LAYER 6: Workholding & Fixtures
        workholding: {
            database: 'PRISM_WORKHOLDING_DATABASE',
            geometry: 'PRISM_WORKHOLDING_GEOMETRY_EXTENDED',
            fixtures: 'PRISM_FIXTURE_DATABASE',
            vises: 'PRISM_KURT_VISE_DATABASE',
            chucks: 'PRISM_CHUCK_DATABASE_V2'
        },
        // LAYER 7: Business & Costs
        business: {
            costs: 'PRISM_COST_DATABASE',
            inventory: 'PRISM_INVENTORY_ENGINE',
            jobCosting: 'PRISM_JOB_COSTING_ENGINE',
            tracking: 'PRISM_JOB_TRACKING_ENGINE',
            financial: 'PRISM_FINANCIAL_ENGINE'
        },
        // LAYER 8: Knowledge & University Algorithms
        knowledge: {
            university: 'PRISM_UNIVERSITY_ALGORITHMS',
            crossDisciplinary: 'PRISM_CROSS_DOMAIN',
            mlPatterns: 'PRISM_ML_TRAINING_PATTERNS_DATABASE',
            safety: 'PRISM_CNC_SAFETY_DATABASE'
        }
    },
    // Get database reference safely
    getDatabase: function(category, name) {
        try {
            const dbName = this.databaseRegistry[category]?.[name];
            if (!dbName) return null;

            if (typeof window !== 'undefined' && window[dbName]) {
                return window[dbName];
            }
            // Try eval as fallback
            try {
                return eval(dbName);
            } catch (e) {
                return null;
            }
        } catch (e) {
            console.warn(`[AI Connector] Cannot access ${category}.${name}`);
            return null;
        }
    },
    // Get all available databases
    getAvailableDatabases: function() {
        const available = {};

        for (const [category, databases] of Object.entries(this.databaseRegistry)) {
            available[category] = {};
            for (const [name, dbName] of Object.entries(databases)) {
                const db = this.getDatabase(category, name);
                available[category][name] = {
                    name: dbName,
                    available: db !== null,
                    entries: this._countEntries(db)
                };
            }
        }
        return available;
    },
    _countEntries: function(db) {
        if (!db) return 0;
        if (Array.isArray(db)) return db.length;
        if (typeof db === 'object') {
            if (db.materials) return Object.keys(db.materials).length;
            if (db.strategies) return Object.keys(db.strategies).length;
            if (db.tools) return Object.keys(db.tools).length;
            return Object.keys(db).length;
        }
        return 0;
    }
}