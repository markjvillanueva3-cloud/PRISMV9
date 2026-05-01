/**
 * PRISM_FORCE_LOOKUP
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: physics
 * Lines: 43
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_FORCE_LOOKUP = {
    getDefaultKc: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'steel': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_STEEL;
            case 'aluminum': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_ALUMINUM;
            case 'titanium': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_TITANIUM;
            case 'cast_iron':
            case 'castiron': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_CAST_IRON;
            case 'stainless': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_STAINLESS;
            case 'superalloy':
            case 'inconel': return PRISM_CONSTANTS.FORCE.DEFAULT_KC_SUPERALLOY;
            default: return PRISM_CONSTANTS.FORCE.DEFAULT_KC_STEEL;
        }
    },
    
    getDefaultMc: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'steel': return PRISM_CONSTANTS.FORCE.DEFAULT_MC_STEEL;
            case 'aluminum': return PRISM_CONSTANTS.FORCE.DEFAULT_MC_ALUMINUM;
            case 'titanium': return PRISM_CONSTANTS.FORCE.DEFAULT_MC_TITANIUM;
            case 'cast_iron':
            case 'castiron': return PRISM_CONSTANTS.FORCE.DEFAULT_MC_CAST_IRON;
            default: return PRISM_CONSTANTS.FORCE.DEFAULT_MC_STEEL;
        }
    },
    
    getForceDistribution: function() {
        return {
            tangential: PRISM_CONSTANTS.FORCE.TANGENTIAL_FACTOR,
            radial: PRISM_CONSTANTS.FORCE.RADIAL_FACTOR,
            axial: PRISM_CONSTANTS.FORCE.AXIAL_FACTOR
        };
    },
    
    getSafetyFactors: function() {
        return {
            force: PRISM_CONSTANTS.FORCE.FORCE_SAFETY_FACTOR,
            power: PRISM_CONSTANTS.FORCE.POWER_SAFETY_FACTOR
        };
    }
}