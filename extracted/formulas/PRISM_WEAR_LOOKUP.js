/**
 * PRISM_WEAR_LOOKUP
 * Extracted from PRISM v8.89.002 monolith
 * References: 8
 * Category: tool_life
 * Lines: 63
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_WEAR_LOOKUP = {
    getVBMax: function(operation = 'general') {
        const opLower = operation.toLowerCase();
        if (opLower.includes('finish') || opLower.includes('precision')) {
            return PRISM_CONSTANTS.WEAR.VB_MAX_FINISHING;
        } else if (opLower.includes('semi')) {
            return PRISM_CONSTANTS.WEAR.VB_MAX_SEMI_FINISHING;
        } else if (opLower.includes('heavy')) {
            return PRISM_CONSTANTS.WEAR.VB_MAX_HEAVY_ROUGHING;
        }
        return PRISM_CONSTANTS.WEAR.VB_MAX_ROUGHING;
    },
    
    identifyWearMode: function(conditions) {
        const { speed, temperature, materialHardness, toolHardness } = conditions;
        const modes = [];
        
        // Check for built-up edge
        if (speed < PRISM_CONSTANTS.WEAR.BUE_SPEED_MAX && 
            temperature < PRISM_CONSTANTS.WEAR.BUE_TEMP_THRESHOLD) {
            modes.push({ mode: 'BUE', action: 'Increase cutting speed' });
        }
        
        // Check for abrasive wear
        const hardnessRatio = toolHardness / materialHardness;
        if (hardnessRatio < PRISM_CONSTANTS.WEAR.ABRASIVE_WEAR_HARDNESS_RATIO) {
            modes.push({ mode: 'abrasive', action: 'Use harder tool coating' });
        }
        
        // Check for diffusion wear
        if (temperature > PRISM_CONSTANTS.WEAR.DIFFUSION_WEAR_TEMP) {
            modes.push({ mode: 'diffusion', action: 'Reduce speed or improve cooling' });
        }
        
        // Check for adhesion wear
        if (speed < PRISM_CONSTANTS.WEAR.ADHESION_WEAR_SPEED) {
            modes.push({ mode: 'adhesion', action: 'Increase speed or use different coating' });
        }
        
        // Check for oxidation wear
        if (temperature > PRISM_CONSTANTS.WEAR.OXIDATION_WEAR_TEMP) {
            modes.push({ mode: 'oxidation', action: 'Use oxidation-resistant coating (AlTiN)' });
        }
        
        return modes.length > 0 ? modes : [{ mode: 'normal', action: 'Monitor wear progression' }];
    },
    
    estimateWearStage: function(currentVB) {
        const rates = PRISM_CONSTANTS.WEAR;
        if (currentVB < 0.1) return { stage: 'break-in', wearRate: rates.WEAR_RATE_INITIAL, remainingLife: 'high' };
        if (currentVB < 0.25) return { stage: 'steady-state', wearRate: rates.WEAR_RATE_STEADY, remainingLife: 'medium' };
        return { stage: 'rapid', wearRate: rates.WEAR_RATE_RAPID, remainingLife: 'low', action: 'Replace tool soon' };
    },
    
    getToolLifeCriteria: function() {
        return {
            flankWear: PRISM_CONSTANTS.WEAR.TOOL_LIFE_VB,
            surfaceFinishDegradation: PRISM_CONSTANTS.WEAR.TOOL_LIFE_SURFACE_FINISH,
            forceIncrease: PRISM_CONSTANTS.WEAR.TOOL_LIFE_FORCE_INCREASE,
            powerIncrease: PRISM_CONSTANTS.WEAR.TOOL_LIFE_POWER_INCREASE
        };
    }
}