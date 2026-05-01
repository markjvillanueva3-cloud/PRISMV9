const PRISM_DATABASE_RETROFIT = {
    version: '1.0.0',
    registeredDatabases: [],

    /**
     * Register all Layer 1-4 databases with PRISM_DATABASE_STATE
     */
    registerAllDatabases() {
        const databases = [
            { name: 'johnsonCook', global: 'PRISM_JOHNSON_COOK_DATABASE', description: 'Johnson-Cook material parameters' },
            { name: 'thermalProperties', global: 'PRISM_THERMAL_PROPERTIES', description: 'Thermal material properties' },
            { name: 'toolTypes', global: 'PRISM_TOOL_TYPES_COMPLETE', description: 'Cutting tool types' },
            { name: 'clampingMechanisms', global: 'PRISM_CLAMPING_MECHANISMS_COMPLETE', description: 'Workholding systems' },
            { name: 'materialAliases', global: 'PRISM_MATERIAL_ALIASES', description: 'Material name mappings' },
            { name: 'bvhEngine', global: 'PRISM_BVH_ENGINE', description: 'Collision detection BVH' },
            { name: 'machineModelsV2', global: 'PRISM_MACHINE_3D_MODEL_DATABASE_V2', description: 'Machine 3D models v2' },
            { name: 'machineModelsV3', global: 'PRISM_MACHINE_3D_MODEL_DATABASE_V3', description: 'Machine 3D models v3' },
            { name: 'postDatabase', global: 'PRISM_ENHANCED_POST_DATABASE_V2', description: 'Post processor definitions' },
            { name: 'fusionPost', global: 'PRISM_FUSION_POST_DATABASE', description: 'Fusion 360 post database' },
            { name: 'bigDaishowaHolders', global: 'PRISM_BIG_DAISHOWA_HOLDER_DATABASE', description: 'BIG DAISHOWA tool holders' },
            { name: 'zeniCatalog', global: 'PRISM_ZENI_COMPLETE_CATALOG', description: 'Zeni tool catalog' },
            { name: 'majorManufacturers', global: 'PRISM_MAJOR_MANUFACTURERS_CATALOG', description: 'Major tool manufacturers' },
            { name: 'manufacturersBatch2', global: 'PRISM_MANUFACTURERS_CATALOG_BATCH2', description: 'Additional manufacturers' }
        ];

        for (const db of databases) {
            if (typeof window[db.global] !== 'undefined' && typeof PRISM_DATABASE_STATE !== 'undefined') {
                try {
                    PRISM_DATABASE_STATE.registerDatabase(db.name, window[db.global]);
                    this.registeredDatabases.push(db.name);
                    console.log(`[RETROFIT] Registered database: ${db.name}`);
                } catch (e) {
                    console.warn(`[RETROFIT] Failed to register ${db.name}:`, e.message);
                }
            }
        }
        console.log(`[RETROFIT] Registered ${this.registeredDatabases.length} additional databases`);
        PRISM_EVENT_BUS.publish('retrofit:databases:registered', {
            count: this.registeredDatabases.length,
            databases: this.registeredDatabases
        });

        return this.registeredDatabases;
    }
}