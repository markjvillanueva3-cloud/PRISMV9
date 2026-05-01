const PRISM_COATING_LOOKUP = {
    _normalize: function(coating) {
        return (coating || 'UNCOATED').toUpperCase().replace(/[^A-Z0-9]/g, '');
    },
    
    getLifeFactor: function(coating) {
        const key = 'LIFE_' + this._normalize(coating);
        return PRISM_CONSTANTS.COATINGS[key] || PRISM_CONSTANTS.COATINGS.LIFE_UNCOATED;
    },
    
    getSpeedFactor: function(coating) {
        const key = 'SPEED_' + this._normalize(coating);
        return PRISM_CONSTANTS.COATINGS[key] || PRISM_CONSTANTS.COATINGS.SPEED_UNCOATED;
    },
    
    getCostFactor: function(coating) {
        const key = 'COST_' + this._normalize(coating);
        return PRISM_CONSTANTS.COATINGS[key] || PRISM_CONSTANTS.COATINGS.COST_UNCOATED;
    },
    
    getMaxTemp: function(coating) {
        const key = 'MAX_TEMP_' + this._normalize(coating);
        return PRISM_CONSTANTS.COATINGS[key] || PRISM_CONSTANTS.COATINGS.MAX_TEMP_UNCOATED;
    },
    
    getAllFactors: function(coating) {
        return {
            life: this.getLifeFactor(coating),
            speed: this.getSpeedFactor(coating),
            cost: this.getCostFactor(coating),
            maxTemp: this.getMaxTemp(coating)
        };
    },
    
    listCoatings: function() {
        return ['uncoated', 'TiN', 'TiCN', 'TiAlN', 'AlTiN', 'AlCrN', 'nACo', 'DLC', 'CVD', 'PVD', 'diamond', 'CBN'];
    }
}