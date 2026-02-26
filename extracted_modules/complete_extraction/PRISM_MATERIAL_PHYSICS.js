const PRISM_MATERIAL_PHYSICS = {
    _normalize: function(material) {
        return (material || 'STEEL').toUpperCase().replace(/[^A-Z_]/g, '');
    },
    
    getDensity: function(material) {
        const key = this._normalize(material) + '_DENSITY';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_DENSITY;
    },
    
    getYoungsModulus: function(material) {
        const key = this._normalize(material) + '_YOUNGS_MODULUS';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_YOUNGS_MODULUS;
    },
    
    getPoisson: function(material) {
        const key = this._normalize(material) + '_POISSON';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_POISSON;
    },
    
    getThermalConductivity: function(material) {
        const key = this._normalize(material) + '_THERMAL_CONDUCTIVITY';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_THERMAL_CONDUCTIVITY;
    },
    
    getSpecificHeat: function(material) {
        const key = this._normalize(material) + '_SPECIFIC_HEAT';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_SPECIFIC_HEAT;
    },
    
    getMeltingPoint: function(material) {
        const key = this._normalize(material) + '_MELTING_POINT';
        return PRISM_CONSTANTS.MATERIALS[key] || PRISM_CONSTANTS.MATERIALS.STEEL_MELTING_POINT;
    },
    
    getAllProperties: function(material) {
        return {
            density: this.getDensity(material),
            youngsModulus: this.getYoungsModulus(material),
            poisson: this.getPoisson(material),
            thermalConductivity: this.getThermalConductivity(material),
            specificHeat: this.getSpecificHeat(material),
            meltingPoint: this.getMeltingPoint(material)
        };
    }
}