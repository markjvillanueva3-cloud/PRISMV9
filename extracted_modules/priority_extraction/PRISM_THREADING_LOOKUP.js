const PRISM_THREADING_LOOKUP = {
    getThreadPercent: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.THREADING.THREAD_PERCENT_ALUMINUM;
            case 'steel': return PRISM_CONSTANTS.THREADING.THREAD_PERCENT_STEEL;
            case 'stainless': return PRISM_CONSTANTS.THREADING.THREAD_PERCENT_STAINLESS;
            default: return PRISM_CONSTANTS.THREADING.THREAD_PERCENT_STANDARD;
        }
    },
    
    getTapDrillFactor: function(threadPercent) {
        if (threadPercent <= 50) return PRISM_CONSTANTS.THREADING.TAP_DRILL_50_PERCENT;
        if (threadPercent <= 65) return PRISM_CONSTANTS.THREADING.TAP_DRILL_65_PERCENT;
        if (threadPercent <= 75) return PRISM_CONSTANTS.THREADING.TAP_DRILL_75_PERCENT;
        return PRISM_CONSTANTS.THREADING.TAP_DRILL_85_PERCENT;
    },
    
    getTapSpeedFactor: function(tapType) {
        const type = (tapType || 'hss').toLowerCase();
        switch(type) {
            case 'hss': return PRISM_CONSTANTS.THREADING.TAP_SPEED_FACTOR_HSS;
            case 'cobalt': return PRISM_CONSTANTS.THREADING.TAP_SPEED_FACTOR_COBALT;
            case 'carbide': return PRISM_CONSTANTS.THREADING.TAP_SPEED_FACTOR_CARBIDE;
            case 'form': return PRISM_CONSTANTS.THREADING.TAP_SPEED_FACTOR_FORM;
            default: return PRISM_CONSTANTS.THREADING.TAP_SPEED_FACTOR_HSS;
        }
    },
    
    getInfeedPasses: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.THREADING.PASSES_MIN_ALUMINUM;
            case 'titanium': return PRISM_CONSTANTS.THREADING.PASSES_MIN_TITANIUM;
            default: return PRISM_CONSTANTS.THREADING.PASSES_MIN_STEEL;
        }
    }
}