const PRISM_CONSOLIDATED_MATERIALS = {
    // Note: This consolidates duplicated material definitions
    // Other sections now reference this database instead of defining inline

    baseMetals: {
        aluminum: {
            density: 0.098,
            machinability: 0.9,
            cuttingSpeed: { min: 400, max: 2000, units: 'sfm' },
            iso_category: 'N1'
        },
        steel: {
            density: 0.284,
            machinability: 0.7,
            cuttingSpeed: { min: 200, max: 600, units: 'sfm' },
            iso_category: 'P2'
        },
        stainless: {
            density: 0.289,
            machinability: 0.5,
            cuttingSpeed: { min: 150, max: 400, units: 'sfm' },
            iso_category: 'M1',
            workHardening: 'high'
        },
        titanium: {
            density: 0.163,
            machinability: 0.3,
            cuttingSpeed: { min: 100, max: 300, units: 'sfm' },
            iso_category: 'S2',
            chipType: 'segmented'
        }
    },
    // Reference function to get material properties
    getMaterial: function(materialName) {
        const normalized = materialName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Check base metals
        if (this.baseMetals[normalized]) {
            return this.baseMetals[normalized];
        }
        // Check exotic materials
        if (typeof EXOTIC_MATERIALS_DATABASE !== 'undefined') {
            // Search through exotic database
            // ... implementation
        }
        // Check enhanced heat treat
        if (typeof ENHANCED_MATERIALS_WITH_HEAT_TREAT !== 'undefined') {
            // Search through heat treat database
            // ... implementation
        }
        return null;
    }
}