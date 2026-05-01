const PRISM_DRILLING_LOOKUP = {
    getPeckDepth: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.DRILLING.PECK_DEPTH_ALUMINUM;
            case 'stainless': return PRISM_CONSTANTS.DRILLING.PECK_DEPTH_STAINLESS;
            case 'titanium': return PRISM_CONSTANTS.DRILLING.PECK_DEPTH_TITANIUM;
            default: return PRISM_CONSTANTS.DRILLING.PECK_DEPTH_STANDARD;
        }
    },
    
    isDeepHole: function(depth, diameter) {
        return (depth / diameter) >= PRISM_CONSTANTS.DRILLING.DEEP_HOLE_THRESHOLD;
    },
    
    needsGundrill: function(depth, diameter) {
        return (depth / diameter) >= PRISM_CONSTANTS.DRILLING.GUNDRILLING_THRESHOLD;
    },
    
    getPointAngle: function(materialClass) {
        const cls = (materialClass || 'steel').toLowerCase();
        switch(cls) {
            case 'aluminum': return PRISM_CONSTANTS.DRILLING.POINT_ANGLE_ALUMINUM;
            case 'titanium': return PRISM_CONSTANTS.DRILLING.POINT_ANGLE_TITANIUM;
            default: return PRISM_CONSTANTS.DRILLING.POINT_ANGLE_STANDARD;
        }
    },
    
    getRetractHeight: function(isPartialRetract) {
        return isPartialRetract ? 
            PRISM_CONSTANTS.DRILLING.PECK_RETRACT_PARTIAL : 
            PRISM_CONSTANTS.DRILLING.PECK_RETRACT_FULL;
    },
    
    getPilotDiameter: function(finalDiameter) {
        return finalDiameter * PRISM_CONSTANTS.DRILLING.PILOT_DIAMETER_RATIO;
    }
}