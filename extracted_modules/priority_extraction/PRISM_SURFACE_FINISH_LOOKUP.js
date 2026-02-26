const PRISM_SURFACE_FINISH_LOOKUP = {
    getRaTarget: function(quality, isInch = false) {
        const q = (quality || 'finish').toLowerCase();
        if (isInch) {
            switch(q) {
                case 'rough': return PRISM_CONSTANTS.SURFACE_FINISH.RA_ROUGH_INCH;
                case 'semi_finish':
                case 'semifinish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_SEMI_FINISH_INCH;
                case 'finish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINISH_INCH;
                case 'fine':
                case 'fine_finish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINE_FINISH_INCH;
                case 'precision': return PRISM_CONSTANTS.SURFACE_FINISH.RA_PRECISION_INCH;
                case 'mirror': return PRISM_CONSTANTS.SURFACE_FINISH.RA_MIRROR_INCH;
                default: return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINISH_INCH;
            }
        } else {
            switch(q) {
                case 'rough': return PRISM_CONSTANTS.SURFACE_FINISH.RA_ROUGH;
                case 'semi_finish':
                case 'semifinish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_SEMI_FINISH;
                case 'finish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINISH;
                case 'fine':
                case 'fine_finish': return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINE_FINISH;
                case 'precision': return PRISM_CONSTANTS.SURFACE_FINISH.RA_PRECISION;
                case 'mirror': return PRISM_CONSTANTS.SURFACE_FINISH.RA_MIRROR;
                default: return PRISM_CONSTANTS.SURFACE_FINISH.RA_FINISH;
            }
        }
    },
    
    getFeedFactor: function(targetRa) {
        if (targetRa >= 6.3) return PRISM_CONSTANTS.SURFACE_FINISH.FEED_FACTOR_RA_6_3;
        if (targetRa >= 3.2) return PRISM_CONSTANTS.SURFACE_FINISH.FEED_FACTOR_RA_3_2;
        if (targetRa >= 1.6) return PRISM_CONSTANTS.SURFACE_FINISH.FEED_FACTOR_RA_1_6;
        if (targetRa >= 0.8) return PRISM_CONSTANTS.SURFACE_FINISH.FEED_FACTOR_RA_0_8;
        return PRISM_CONSTANTS.SURFACE_FINISH.FEED_FACTOR_RA_0_4;
    },
    
    raToRz: function(ra) {
        return ra * PRISM_CONSTANTS.SURFACE_FINISH.RZ_TO_RA_RATIO;
    },
    
    rzToRa: function(rz) {
        return rz / PRISM_CONSTANTS.SURFACE_FINISH.RZ_TO_RA_RATIO;
    },
    
    // Calculate cusp height for ball endmill
    calculateCuspHeight: function(stepover, ballRadius) {
        return ballRadius - Math.sqrt(ballRadius * ballRadius - stepover * stepover / 4);
    },
    
    // Calculate stepover for target cusp height
    calculateStepoverForCusp: function(targetCuspHeight, ballRadius) {
        return 2 * Math.sqrt(targetCuspHeight * (2 * ballRadius - targetCuspHeight));
    }
}