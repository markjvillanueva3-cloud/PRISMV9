const PRISM_TOOL_GEOMETRY_LOOKUP = {
    getHelixAngle: function(materialClass, operation) {
        const cls = (materialClass || 'steel').toLowerCase();
        const op = (operation || 'general').toLowerCase();
        
        if (cls === 'aluminum') return PRISM_CONSTANTS.TOOL_GEOMETRY.HELIX_ALUMINUM;
        if (cls === 'hardened') return PRISM_CONSTANTS.TOOL_GEOMETRY.HELIX_HARDENED;
        if (op === 'finishing') return PRISM_CONSTANTS.TOOL_GEOMETRY.HELIX_FINISHING;
        if (op === 'hsm' || op === 'high_speed') return PRISM_CONSTANTS.TOOL_GEOMETRY.HELIX_HIGH_PERFORMANCE;
        return PRISM_CONSTANTS.TOOL_GEOMETRY.HELIX_STANDARD;
    },
    
    getRakeAngle: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.TOOL_GEOMETRY.RAKE_ALUMINUM;
            case 'hardened': return PRISM_CONSTANTS.TOOL_GEOMETRY.RAKE_HARDENED;
            default: return PRISM_CONSTANTS.TOOL_GEOMETRY.RAKE_POSITIVE;
        }
    },
    
    getRecommendedFlutes: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.TOOL_GEOMETRY.FLUTES_ALUMINUM;
            case 'steel': return PRISM_CONSTANTS.TOOL_GEOMETRY.FLUTES_STEEL;
            case 'titanium': return PRISM_CONSTANTS.TOOL_GEOMETRY.FLUTES_TITANIUM;
            case 'hardened': return PRISM_CONSTANTS.TOOL_GEOMETRY.FLUTES_HARDENED;
            default: return PRISM_CONSTANTS.TOOL_GEOMETRY.FLUTES_STEEL;
        }
    },
    
    getMaxStickout: function(diameter) {
        return diameter * PRISM_CONSTANTS.TOOL_GEOMETRY.STICKOUT_TO_DIAMETER_MAX;
    },
    
    getOptimalStickout: function(diameter) {
        return diameter * PRISM_CONSTANTS.TOOL_GEOMETRY.STICKOUT_TO_DIAMETER_OPTIMAL;
    },
    
    getCornerRadius: function(diameter, operation) {
        const op = (operation || 'standard').toLowerCase();
        let ratio;
        switch(op) {
            case 'finishing': ratio = PRISM_CONSTANTS.TOOL_GEOMETRY.CORNER_RADIUS_FINISHING; break;
            case 'roughing': ratio = PRISM_CONSTANTS.TOOL_GEOMETRY.CORNER_RADIUS_ROUGHING; break;
            case 'ballnose': ratio = PRISM_CONSTANTS.TOOL_GEOMETRY.CORNER_FULL; break;
            default: ratio = PRISM_CONSTANTS.TOOL_GEOMETRY.CORNER_RADIUS_STANDARD;
        }
        return diameter * ratio;
    }
}