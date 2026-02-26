const PRISM_SAFETY_LOOKUP = {
    getFactor: function(application = 'general') {
        const app = application.toLowerCase();
        if (app.includes('nuclear')) return PRISM_CONSTANTS.SAFETY.FACTOR_NUCLEAR;
        if (app.includes('medical') || app.includes('implant')) return PRISM_CONSTANTS.SAFETY.FACTOR_MEDICAL_IMPLANT;
        if (app.includes('aerospace') || app.includes('flight')) return PRISM_CONSTANTS.SAFETY.FACTOR_AEROSPACE;
        if (app.includes('precision')) return PRISM_CONSTANTS.SAFETY.FACTOR_PRECISION_MACHINING;
        if (app.includes('prototype')) return PRISM_CONSTANTS.SAFETY.FACTOR_PROTOTYPE;
        return PRISM_CONSTANTS.SAFETY.FACTOR_GENERAL_MACHINING;
    },
    
    getCriticality: function(application) {
        const app = application.toLowerCase();
        if (app.includes('flight') || app.includes('critical')) return PRISM_CONSTANTS.SAFETY.CRITICALITY_FLIGHT_CRITICAL;
        if (app.includes('safety') || app.includes('aerospace') || app.includes('medical')) {
            return PRISM_CONSTANTS.SAFETY.CRITICALITY_SAFETY;
        }
        return PRISM_CONSTANTS.SAFETY.CRITICALITY_STANDARD;
    },
    
    getInspectionRequirement: function(criticality) {
        switch (criticality) {
            case 3: return PRISM_CONSTANTS.SAFETY.INSPECTION_FLIGHT;
            case 2: return PRISM_CONSTANTS.SAFETY.INSPECTION_SAFETY;
            default: return PRISM_CONSTANTS.SAFETY.INSPECTION_STANDARD;
        }
    },
    
    getDocumentationStandard: function(application) {
        const app = application.toLowerCase();
        if (app.includes('aerospace')) return PRISM_CONSTANTS.SAFETY.DOC_AEROSPACE;
        if (app.includes('medical')) return PRISM_CONSTANTS.SAFETY.DOC_MEDICAL;
        if (app.includes('automotive')) return PRISM_CONSTANTS.SAFETY.DOC_AUTOMOTIVE;
        return PRISM_CONSTANTS.SAFETY.DOC_STANDARD;
    },
    
    applyFactor: function(value, application = 'general') {
        const factor = this.getFactor(application);
        return {
            original: value,
            adjusted: value / factor,
            factor,
            application,
            message: `Value reduced from ${value} to ${(value/factor).toFixed(3)} with safety factor ${factor}`
        };
    },
    
    getSpeedLimit: function(maxSpeed, isFirstRun = false) {
        const factor = isFirstRun ? 
            PRISM_CONSTANTS.SAFETY.SPEED_FIRST_RUN_FACTOR :
            PRISM_CONSTANTS.SAFETY.SPEED_LIMIT_FACTOR;
        return maxSpeed * factor;
    }
}