const PRISM_THERMAL_LOOKUP = {
    getMaxTemp: function(materialClass) {
        const key = `MAX_TEMP_${materialClass.toUpperCase()}`;
        return PRISM_CONSTANTS.THERMAL[key] || PRISM_CONSTANTS.THERMAL.MAX_TEMP_GENERAL;
    },
    
    getWorkpieceMaxTemp: function(materialClass) {
        const key = `WORKPIECE_MAX_${materialClass.toUpperCase()}`;
        return PRISM_CONSTANTS.THERMAL[key] || 100; // Default safe value
    },
    
    getCoolantRequired: function(cuttingTemp, materialClass) {
        const maxTemp = this.getMaxTemp(materialClass);
        if (cuttingTemp < maxTemp * 0.6) return { required: false, recommendation: 'DRY' };
        if (cuttingTemp < maxTemp * 0.8) return { required: true, recommendation: 'MIST' };
        if (cuttingTemp < maxTemp) return { required: true, recommendation: 'FLOOD' };
        return { required: true, recommendation: 'THROUGH_SPINDLE', warning: 'High temperature zone' };
    },
    
    estimateCuttingTemp: function(speed, feed, material) {
        // Simplified temperature estimation (actual uses physics models)
        // T = T_ambient + K * V^0.4 * f^0.2
        const K = material.thermal_factor || 100;
        const V = speed; // m/min
        const f = feed; // mm
        return 20 + K * Math.pow(V/100, 0.4) * Math.pow(f, 0.2);
    },
    
    getThermalExpansion: function(materialClass, tempRise) {
        const coef = PRISM_CONSTANTS.MATERIALS[`THERMAL_EXPANSION_${materialClass.toUpperCase()}`] || 12e-6;
        return coef * tempRise; // mm/mm per degree
    }
}