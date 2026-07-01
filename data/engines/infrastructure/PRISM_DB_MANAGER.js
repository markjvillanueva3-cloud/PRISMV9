/**
 * PRISM_DB_MANAGER
 * Extracted from PRISM v8.89.002 monolith
 * References: 25
 * Lines: 251
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_DATABASE_MANAGER = (function() {
    'use strict';

    console.log('[PRISM_DB_MANAGER] Initializing Database Management System v1.0...');

    // CENTRAL DATABASE REGISTRY
    // Every database MUST be registered here to prevent duplicates

    const DATABASE_REGISTRY = {

        // LAYER 1 CORE DATABASES (Protected - cannot be duplicated)
        LAYER_1_CORE: {
            'PRISM_MATERIALS_MASTER': {
                description: 'Master materials database (810 materials)',
                version: '3.0.0',
                protected: true,
                addMethod: 'addMaterial',
                searchMethod: 'getMaterial',
                structure: 'ISO groups + byId lookup',
                location: 'PRISM_MATERIALS_MASTER'
            },
            'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE': {
                description: 'Tool holder interfaces (73 types)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addToolHolder',
                searchMethod: 'getToolHolder',
                structure: 'keyed by interface name',
                location: 'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE'
            },
            'PRISM_COATINGS_COMPLETE': {
                description: 'Tool coatings database (47 types)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addCoating',
                searchMethod: 'getCoating',
                structure: 'keyed by coating name',
                location: 'PRISM_COATINGS_COMPLETE'
            },
            'PRISM_TOOLPATH_STRATEGIES_COMPLETE': {
                description: 'CAM toolpath strategies (175 strategies)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addStrategy',
                searchMethod: 'getStrategy',
                structure: 'categorized by feature type',
                location: 'PRISM_TOOLPATH_STRATEGIES_COMPLETE'
            },
            'PRISM_TOOL_TYPES_COMPLETE': {
                description: 'Cutting tool types (55 types)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addToolType',
                searchMethod: 'getToolType',
                structure: 'keyed by tool type name',
                location: 'PRISM_TOOL_TYPES_COMPLETE'
            },
            'PRISM_CLAMPING_MECHANISMS_COMPLETE': {
                description: 'Clamping/workholding (24 types)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addClampingMechanism',
                searchMethod: 'getClampingMechanism',
                structure: 'keyed by mechanism name',
                location: 'PRISM_CLAMPING_MECHANISMS_COMPLETE'
            },
            'PRISM_TAYLOR_COMPLETE': {
                description: 'Taylor tool life combinations (15,184)',
                version: '1.0.0',
                protected: true,
                addMethod: 'addTaylorData',
                searchMethod: 'getTaylorData',
                structure: 'keyed by material-tool-coating',
                location: 'PRISM_TAYLOR_COMPLETE'
            }
        },
        // MACHINE DATABASES
        MACHINES: {
            'UnifiedMasterDatabase.MACHINES': {
                description: 'Machine specifications (VMC, HMC, Lathe, 5-axis, Swiss)',
                version: '1.0.0',
                protected: false,
                addMethod: 'addMachine',
                searchMethod: 'getMachine',
                categories: ['VMC', 'HMC', 'FIVE_AXIS', 'LATHE', 'SWISS', 'MILL_TURN', 'EDM', 'GRINDING'],
                location: 'UnifiedMasterDatabase.machines'
            },
            'GENERIC_MACHINE_MODELS_DATABASE': {
                description: 'Generic parametric machine models',
                version: '1.0.0',
                protected: false,
                location: 'GENERIC_MACHINE_MODELS_DATABASE'
            }
        },
        // TOOL DATABASES
        TOOLS: {
            'PRISM_BIG_DAISHOWA_HOLDER_DATABASE': {
                description: 'BIG DAISHOWA tool holders',
                version: '1.0.0',
                protected: false,
                manufacturer: 'BIG DAISHOWA',
                addMethod: 'addBigDaishowaHolder',
                location: 'PRISM_BIG_DAISHOWA_HOLDER_DATABASE'
            },
            'PRISM_TOOL_PROPERTIES_DATABASE': {
                description: 'Cutting tool properties and parameters',
                version: '1.0.0',
                protected: false,
                addMethod: 'addToolProperties',
                location: 'PRISM_TOOL_PROPERTIES_DATABASE'
            }
        },
        // CAM/POST PROCESSOR DATABASES
        CAM: {
            'PRISM_FUSION_POST_DATABASE': {
                description: 'Fusion 360 post processors',
                version: '1.0.0',
                protected: false,
                location: 'PRISM_FUSION_POST_DATABASE'
            },
            'MASTERCAM_TOOLPATH_DATABASE': {
                description: 'Mastercam toolpath configurations',
                version: '1.0.0',
                protected: false,
                location: 'MASTERCAM_TOOLPATH_DATABASE'
            },
            'PRISM_HYPERMILL_FIXTURE_DATABASE': {
                description: 'HyperMill fixture setups',
                version: '1.0.0',
                protected: false,
                location: 'PRISM_HYPERMILL_FIXTURE_DATABASE'
            }
        },
        // KNOWLEDGE DATABASES
        KNOWLEDGE: {
            'CNC_FUNDAMENTALS_KNOWLEDGE_DATABASE': {
                description: 'CNC fundamentals and best practices',
                version: '1.0.0',
                protected: false,
                location: 'CNC_FUNDAMENTALS_KNOWLEDGE_DATABASE'
            },
            'CNC_GCODE_REFERENCE_DATABASE': {
                description: 'G-code reference',
                version: '1.0.0',
                protected: false,
                location: 'CNC_GCODE_REFERENCE_DATABASE'
            },
            'MECHANICAL_ENGINEERING_KNOWLEDGE_DATABASE': {
                description: 'Mechanical engineering formulas',
                version: '1.0.0',
                protected: false,
                location: 'MECHANICAL_ENGINEERING_KNOWLEDGE_DATABASE'
            },
            'CUTTING_PARAMETERS_LEARNING_DATABASE': {
                description: 'Cutting parameter recommendations',
                version: '1.0.0',
                protected: false,
                location: 'CUTTING_PARAMETERS_LEARNING_DATABASE'
            },
            'ENGINEERING_FORMULAS_DATABASE': {
                description: 'Engineering calculation formulas',
                version: '1.0.0',
                protected: false,
                location: 'ENGINEERING_FORMULAS_DATABASE'
            }
        },
        // MANUFACTURER CATALOGS (Expandable category for uploaded catalogs)
        MANUFACTURER_CATALOGS: {
            // This category is for manufacturer-specific data
            // New manufacturers can be added here without creating separate databases
        }
    };
    // ANTI-DUPLICATE SYSTEM

    const AntiDuplicate = {

        // Check if a database already exists
        databaseExists: function(name) {
            // Check all registry categories
            for (const category of Object.values(DATABASE_REGISTRY)) {
                if (category[name]) {
                    return {
                        exists: true,
                        info: category[name],
                        message: `Database "${name}" already exists. Use addTo() instead.`
                    };
                }
            }
            // Also check window for unregistered databases
            if (typeof window !== 'undefined' && window[name]) {
                return {
                    exists: true,
                    unregistered: true,
                    message: `Database "${name}" exists but is not registered. Register it first.`
                };
            }
            return { exists: false };
        },
        // Find similar database names to prevent near-duplicates
        findSimilar: function(proposedName) {
            const similar = [];
            const normalizedProposed = proposedName.toLowerCase().replace(/[_\-\s]/g, '');

            for (const category of Object.values(DATABASE_REGISTRY)) {
                for (const dbName of Object.keys(category)) {
                    const normalizedDb = dbName.toLowerCase().replace(/[_\-\s]/g, '');

                    // Check for similarity
                    if (this._similarity(normalizedProposed, normalizedDb) > 0.7) {
                        similar.push({
                            name: dbName,
                            similarity: this._similarity(normalizedProposed, normalizedDb),
                            info: category[dbName]
                        });
                    }
                }
            }
            return similar.sort((a, b) => b.similarity - a.similarity);
        },
        // Levenshtein distance for similarity check
        _similarity: function(s1, s2) {
            const longer = s1.length > s2.length ? s1 : s2;
            const shorter = s1.length > s2.length ? s2 : s1;

            if (longer.length === 0) return 1.0;

            const distance = this._levenshtein(longer, shorter);
            return (longer.length - distance) / longer.length;
        },
        _levenshtein: function(s1, s2) {
            const costs = [];
            for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
                for (let j = 0; j <= s2.length; j++) {
                    if (i === 0) {
                        costs[j] = j;
                    } else if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
                if (i > 0) costs[s2.length] = lastValue;
            }
            return costs[s2.length];
        }
    };
})();