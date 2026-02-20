const PRISM_MATERIAL_STRATEGY_INTEGRATION = {
    version: '3.0.0',
    modifiers: {
        'GROUP_P_STEEL': { preferred: ['adaptive_clearing','trochoidal','high_feed'], avoid: [], speedMult: 1.0, feedMult: 1.0, coolant: 'flood' },
        'GROUP_M_STAINLESS': { preferred: ['trochoidal','constant_chip_load'], avoid: ['full_slotting'], speedMult: 0.7, feedMult: 0.85, coolant: 'flood_hp' },
        'GROUP_K_CAST_IRON': { preferred: ['high_feed','face_mill'], avoid: [], speedMult: 1.2, feedMult: 1.1, coolant: 'dry_mist' },
        'GROUP_N_NONFERROUS': { preferred: ['high_speed'], avoid: ['slow_speeds'], speedMult: 2.5, feedMult: 1.5, coolant: 'flood_mist' },
        'GROUP_S_SUPERALLOYS': { preferred: ['trochoidal','light_passes'], avoid: ['heavy_doc'], speedMult: 0.3, feedMult: 0.6, coolant: 'high_pressure' },
        'GROUP_H_HARDENED': { preferred: ['light_passes','cbn_tools'], avoid: ['heavy_doc'], speedMult: 0.4, feedMult: 0.5, coolant: 'dry_air' }
    },
    getModifiedStrategy: function(matId, featureType, options = {}) {
        const mat = PRISM_MATERIALS_MASTER.getMaterial(matId);
        if (!mat) return null;
        const base = PRISM_FEATURE_STRATEGY_MAP.getRecommendedStrategy(featureType, options);
        const mod = this.modifiers[mat.isoGroup];
        if (!mod) return base;
        return { ...base, materialModifiers: mod, material: mat };
    }
}