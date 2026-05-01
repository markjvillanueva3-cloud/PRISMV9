const PRISM_STABILITY_LOOKUP = {
    getMaxDeflection: function(operation = 'finish') {
        const opLower = operation.toLowerCase();
        if (opLower.includes('finish') || opLower.includes('precision')) {
            return PRISM_CONSTANTS.STABILITY.DEFLECTION_MAX_FINISH;
        } else if (opLower.includes('semi')) {
            return PRISM_CONSTANTS.STABILITY.DEFLECTION_MAX_SEMI_FINISH;
        }
        return PRISM_CONSTANTS.STABILITY.DEFLECTION_MAX_ROUGH;
    },
    
    getChatterFrequencyRange: function() {
        return {
            min: PRISM_CONSTANTS.STABILITY.CHATTER_FREQ_MIN,
            max: PRISM_CONSTANTS.STABILITY.CHATTER_FREQ_MAX,
            typical: PRISM_CONSTANTS.STABILITY.CHATTER_FREQ_TYPICAL
        };
    },
    
    estimateDeflection: function(force, stickout, diameter, material = 'carbide') {
        // δ = (F * L³) / (3 * E * I)
        const E = material === 'carbide' ? 
            PRISM_CONSTANTS.PHYSICS.CARBIDE_YOUNGS_MODULUS * 1e6 : 
            PRISM_CONSTANTS.PHYSICS.HSS_YOUNGS_MODULUS * 1e6; // Pa
        const I = (Math.PI * Math.pow(diameter/1000, 4)) / 64; // m^4
        const L = stickout / 1000; // m
        const F = force; // N
        
        const deflection = (F * Math.pow(L, 3)) / (3 * E * I);
        return deflection * 1000; // mm
    },
    
    checkStability: function(rpm, doc, tool) {
        const toothPassingFreq = (rpm * (tool.flutes || 4)) / 60; // Hz
        const chatterRange = this.getChatterFrequencyRange();
        
        // Simple stability check - avoid integer ratios of natural frequency
        const toolNatFreq = tool.naturalFrequency || 2000; // Hz, estimate
        const ratio = toothPassingFreq / toolNatFreq;
        const nearResonance = Math.abs(ratio - Math.round(ratio)) < 0.1;
        
        return {
            stable: !nearResonance,
            toothPassingFreq,
            toolNatFreq,
            ratio: ratio.toFixed(2),
            message: nearResonance ? 
                `WARNING: Tooth passing freq ${toothPassingFreq.toFixed(0)}Hz near resonance` :
                `Stable: Tooth passing freq ${toothPassingFreq.toFixed(0)}Hz clear of resonance`,
            suggestion: nearResonance ? 
                `Adjust RPM to ${Math.round((toolNatFreq * 0.85 * 60) / (tool.flutes || 4))} or ${Math.round((toolNatFreq * 1.15 * 60) / (tool.flutes || 4))}` :
                null
        };
    },
    
    recommendLDRatio: function(toolMaterial = 'carbide', damped = false) {
        if (damped) return PRISM_CONSTANTS.BORING.LD_RATIO_DAMPED_BAR_MAX;
        if (toolMaterial === 'carbide') return PRISM_CONSTANTS.BORING.LD_RATIO_CARBIDE_BAR_MAX;
        return PRISM_CONSTANTS.BORING.LD_RATIO_STEEL_BAR_MAX;
    }
}