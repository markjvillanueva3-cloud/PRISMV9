/**
 * PRISM_TAYLOR_LOOKUP
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: physics_models
 * Lines: 37
 * Session: R2.3.3 Algorithm Gap Extraction
 */

const PRISM_TAYLOR_LOOKUP = {
    getDefaultN: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'steel': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_STEEL;
            case 'aluminum': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_ALUMINUM;
            case 'titanium': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_TITANIUM;
            case 'cast_iron':
            case 'castiron': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_CAST_IRON;
            case 'stainless': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_STAINLESS;
            case 'superalloy':
            case 'inconel':
            case 'hastelloy': return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_SUPERALLOY;
            default: return PRISM_CONSTANTS.TAYLOR.DEFAULT_N_STEEL;
        }
    },
    
    getVBMax: function(operationType) {
        const op = (operationType || 'roughing').toLowerCase();
        switch(op) {
            case 'roughing':
            case 'rough': return PRISM_CONSTANTS.TAYLOR.VB_MAX_ROUGHING;
            case 'finishing':
            case 'finish': return PRISM_CONSTANTS.TAYLOR.VB_MAX_FINISHING;
            case 'precision': return PRISM_CONSTANTS.TAYLOR.VB_MAX_PRECISION;
            default: return PRISM_CONSTANTS.TAYLOR.VB_MAX_ROUGHING;
        }
    },
    
    getFeedExponent: function() {
        return PRISM_CONSTANTS.TAYLOR.FEED_EXPONENT;
    },
    
    getDocExponent: function() {
        return PRISM_CONSTANTS.TAYLOR.DOC_EXPONENT;
    }
}