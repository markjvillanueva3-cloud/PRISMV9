const PRISM_COOLANT_LOOKUP = {
    _normalize: function(coolant) {
        return (coolant || 'FLOOD').toUpperCase().replace(/[^A-Z_]/g, '').replace(/ /g, '_');
    },
    
    getLifeFactor: function(coolant) {
        const key = 'LIFE_' + this._normalize(coolant);
        return PRISM_CONSTANTS.COOLANT[key] || PRISM_CONSTANTS.COOLANT.LIFE_FLOOD;
    },
    
    getSpeedFactor: function(coolant) {
        const key = 'SPEED_' + this._normalize(coolant);
        return PRISM_CONSTANTS.COOLANT[key] || PRISM_CONSTANTS.COOLANT.SPEED_FLOOD;
    },
    
    getAllFactors: function(coolant) {
        return {
            life: this.getLifeFactor(coolant),
            speed: this.getSpeedFactor(coolant)
        };
    },
    
    listCoolantTypes: function() {
        return ['dry', 'mist', 'flood', 'through_spindle', 'cryogenic', 'MQL'];
    }
}