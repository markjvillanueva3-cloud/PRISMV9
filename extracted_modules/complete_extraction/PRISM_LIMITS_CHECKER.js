const PRISM_LIMITS_CHECKER = {
    checkRPM: function(rpm, machineMax = PRISM_CONSTANTS.LIMITS.MAX_RPM) {
        if (rpm <= 0) return { valid: false, message: 'RPM must be positive', code: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE };
        if (rpm > machineMax) return { valid: false, message: `RPM ${rpm} exceeds machine max ${machineMax}`, code: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_RPM };
        if (rpm > machineMax * PRISM_CONSTANTS.SAFETY.SPEED_LIMIT_FACTOR) return { valid: true, warning: 'Approaching RPM limit', percent: (rpm/machineMax*100).toFixed(1) };
        return { valid: true, message: 'Within limits', percent: (rpm/machineMax*100).toFixed(1) };
    },
    
    checkFeed: function(feed, machineMax = PRISM_CONSTANTS.LIMITS.MAX_FEED) {
        if (feed <= 0) return { valid: false, message: 'Feed must be positive', code: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE };
        if (feed > machineMax) return { valid: false, message: `Feed ${feed} exceeds machine max ${machineMax}`, code: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_FEED };
        return { valid: true, message: 'Within limits', percent: (feed/machineMax*100).toFixed(1) };
    },
    
    checkPower: function(power, machineMax = PRISM_CONSTANTS.LIMITS.MAX_POWER) {
        if (power <= 0) return { valid: false, message: 'Power must be positive', code: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE };
        if (power > machineMax) return { valid: false, message: `Power ${power}kW exceeds machine max ${machineMax}kW`, code: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_POWER };
        if (power > machineMax * PRISM_CONSTANTS.SAFETY.POWER_LIMIT_FACTOR) return { valid: true, warning: 'Approaching power limit', percent: (power/machineMax*100).toFixed(1) };
        return { valid: true, message: 'Within limits', percent: (power/machineMax*100).toFixed(1) };
    },
    
    checkDOC: function(doc, toolDiameter) {
        const maxDoc = PRISM_CONSTANTS.LIMITS.MAX_DOC;
        const docRatio = doc / toolDiameter;
        if (doc <= 0) return { valid: false, message: 'DOC must be positive' };
        if (doc > maxDoc) return { valid: false, message: `DOC ${doc}mm exceeds max ${maxDoc}mm` };
        if (docRatio > 1.5) return { valid: true, warning: 'High DOC to diameter ratio', ratio: docRatio.toFixed(2) };
        return { valid: true, message: 'Within limits', ratio: docRatio.toFixed(2) };
    },
    
    checkAll: function(params, machineLimits = {}) {
        const results = {
            valid: true,
            checks: [],
            warnings: []
        };
        
        if (params.rpm) {
            const rpmCheck = this.checkRPM(params.rpm, machineLimits.maxRPM);
            results.checks.push({ param: 'RPM', ...rpmCheck });
            if (!rpmCheck.valid) results.valid = false;
            if (rpmCheck.warning) results.warnings.push(rpmCheck.warning);
        }
        
        if (params.feed) {
            const feedCheck = this.checkFeed(params.feed, machineLimits.maxFeed);
            results.checks.push({ param: 'Feed', ...feedCheck });
            if (!feedCheck.valid) results.valid = false;
        }
        
        if (params.power) {
            const powerCheck = this.checkPower(params.power, machineLimits.maxPower);
            results.checks.push({ param: 'Power', ...powerCheck });
            if (!powerCheck.valid) results.valid = false;
            if (powerCheck.warning) results.warnings.push(powerCheck.warning);
        }
        
        return results;
    }
}