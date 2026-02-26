const PRISM_MATERIAL_PROPERTIES = {
    
    // Thermal and electrical properties
    properties: {
        'steel_1045': {
            name: 'Steel 1045',
            E_GPa: 205,
            nu: 0.29,
            yield_MPa: 530,
            ultimate_MPa: 625,
            density_kg_m3: 7850,
            thermalConductivity_W_mK: 49.8,
            thermalExpansion_per_K: 11.2e-6,
            specificHeat_J_kgK: 486,
            resistivity_ohm_m: 1.71e-7
        },
        'aluminum_6061': {
            name: 'Aluminum 6061-T6',
            E_GPa: 69,
            nu: 0.33,
            yield_MPa: 276,
            ultimate_MPa: 310,
            density_kg_m3: 2700,
            thermalConductivity_W_mK: 167,
            thermalExpansion_per_K: 23.6e-6,
            specificHeat_J_kgK: 896,
            resistivity_ohm_m: 3.99e-8
        },
        'titanium_6al4v': {
            name: 'Titanium 6Al-4V',
            E_GPa: 114,
            nu: 0.34,
            yield_MPa: 880,
            ultimate_MPa: 950,
            density_kg_m3: 4430,
            thermalConductivity_W_mK: 6.7,
            thermalExpansion_per_K: 8.6e-6,
            specificHeat_J_kgK: 526,
            resistivity_ohm_m: 1.78e-6
        },
        'inconel_718': {
            name: 'Inconel 718',
            E_GPa: 200,
            nu: 0.29,
            yield_MPa: 1034,
            ultimate_MPa: 1241,
            density_kg_m3: 8220,
            thermalConductivity_W_mK: 11.4,
            thermalExpansion_per_K: 13e-6,
            specificHeat_J_kgK: 435,
            resistivity_ohm_m: 1.25e-6
        },
        'copper': {
            name: 'Copper (annealed)',
            E_GPa: 117,
            nu: 0.35,
            yield_MPa: 70,
            ultimate_MPa: 220,
            density_kg_m3: 8960,
            thermalConductivity_W_mK: 401,
            thermalExpansion_per_K: 16.5e-6,
            specificHeat_J_kgK: 385,
            resistivity_ohm_m: 1.68e-8
        }
    },
    
    /**
     * Get material properties
     * @param {string} material - Material key
     * @returns {Object} Material properties
     */
    get: function(material) {
        const key = material.toLowerCase().replace(/[\s-]/g, '_');
        return this.properties[key] || null;
    },
    
    /**
     * List available materials
     * @returns {Array} Material names
     */
    list: function() {
        return Object.keys(this.properties).map(k => this.properties[k].name);
    }
}