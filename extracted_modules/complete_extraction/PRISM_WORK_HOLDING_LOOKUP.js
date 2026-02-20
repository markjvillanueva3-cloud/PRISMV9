const PRISM_WORK_HOLDING_LOOKUP = {
    calculateClampForce: function(cuttingForce, materialType = 'steel') {
        const friction = materialType === 'aluminum' ? 
            PRISM_CONSTANTS.WORK_HOLDING.CLAMP_FORCE_FRICTION_ALUMINUM :
            PRISM_CONSTANTS.WORK_HOLDING.CLAMP_FORCE_FRICTION_STEEL;
        
        return (cuttingForce * PRISM_CONSTANTS.WORK_HOLDING.CLAMP_FORCE_SAFETY_FACTOR) / friction;
    },
    
    getMinClampContact: function() {
        return PRISM_CONSTANTS.WORK_HOLDING.MIN_CLAMP_CONTACT;
    },
    
    getMinJawOverlap: function(partHeight) {
        return partHeight * (PRISM_CONSTANTS.WORK_HOLDING.MIN_JAW_OVERLAP_PERCENT / 100);
    },
    
    getVacuumHoldingForce: function(sealArea, vacuumPressure = 0.7) {
        // sealArea in cm², vacuumPressure in bar (0.7 = typical)
        return sealArea * vacuumPressure * 10; // Approximate force in N
    },
    
    getMagneticHoldingForce: function(contactArea) {
        // contactArea in cm²
        return contactArea * PRISM_CONSTANTS.WORK_HOLDING.MAG_CHUCK_HOLDING_FORCE; // kg
    },
    
    getFixtureGridSpacing: function(isMetric = true) {
        return isMetric ? 
            PRISM_CONSTANTS.WORK_HOLDING.FIXTURE_GRID_SPACING_METRIC :
            PRISM_CONSTANTS.WORK_HOLDING.FIXTURE_GRID_SPACING_INCH;
    }
}