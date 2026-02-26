const PRISM_VALIDATOR = {
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: SAFE NUMERICAL OPERATIONS
    // All operations have fallback values and integrate with PRISM_ERROR_CODES
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Safe division with zero protection
     * @param {number} a - Numerator
     * @param {number} b - Denominator
     * @param {number} fallback - Value to return if division fails
     * @returns {object} { value, success, error }
     */
    safeDiv: function(a, b, fallback = 0) {
        if (typeof a !== 'number' || !isFinite(a)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Numerator is not a valid number' };
        }
        if (typeof b !== 'number' || !isFinite(b)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Denominator is not a valid number' };
        }
        if (Math.abs(b) < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_DIVISION_BY_ZERO, message: 'Division by zero' };
        }
        const result = a / b;
        if (!isFinite(result)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OVERFLOW, message: 'Result overflow' };
        }
        return { value: result, success: true };
    },
    
    /**
     * Safe square root with negative protection
     */
    safeSqrt: function(x, fallback = 0) {
        if (typeof x !== 'number' || !isFinite(x)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Input is not a valid number' };
        }
        if (x < 0) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_SQRT, message: 'Cannot take square root of negative number' };
        }
        return { value: Math.sqrt(x), success: true };
    },
    
    /**
     * Safe power with overflow protection
     */
    safePow: function(base, exp, fallback = 0) {
        if (typeof base !== 'number' || !isFinite(base)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Base is not a valid number' };
        }
        if (typeof exp !== 'number' || !isFinite(exp)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Exponent is not a valid number' };
        }
        // Check for potential overflow
        if (base > 1 && exp > 709) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OVERFLOW, message: 'Result would overflow' };
        }
        // Check for negative base with non-integer exponent
        if (base < 0 && !Number.isInteger(exp)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NUMERICAL_INSTABILITY, message: 'Negative base with fractional exponent' };
        }
        const result = Math.pow(base, exp);
        if (!isFinite(result)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OVERFLOW, message: 'Result overflow' };
        }
        return { value: result, success: true };
    },
    
    /**
     * Safe logarithm with non-positive protection
     */
    safeLog: function(x, fallback = 0) {
        if (typeof x !== 'number' || !isFinite(x)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Input is not a valid number' };
        }
        if (x <= 0) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OUT_OF_RANGE, message: 'Cannot take log of non-positive number' };
        }
        return { value: Math.log(x), success: true };
    },
    
    /**
     * Safe log10 with non-positive protection
     */
    safeLog10: function(x, fallback = 0) {
        if (typeof x !== 'number' || !isFinite(x)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        }
        if (x <= 0) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OUT_OF_RANGE };
        }
        return { value: Math.log10(x), success: true };
    },
    
    /**
     * Safe exponential with overflow protection
     */
    safeExp: function(x, fallback = 0) {
        if (typeof x !== 'number' || !isFinite(x)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        }
        if (x > 709) { // Math.exp(709) ≈ Number.MAX_VALUE
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OVERFLOW };
        }
        return { value: Math.exp(x), success: true };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: TYPE VALIDATORS
    // Basic type checking utilities that return boolean
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    isNumeric: function(value) {
        return typeof value === 'number' && isFinite(value);
    },
    
    isPositive: function(value) {
        return this.isNumeric(value) && value > 0;
    },
    
    isNonNegative: function(value) {
        return this.isNumeric(value) && value >= 0;
    },
    
    isInteger: function(value) {
        return this.isNumeric(value) && Number.isInteger(value);
    },
    
    isPositiveInteger: function(value) {
        return this.isInteger(value) && value > 0;
    },
    
    isString: function(value) {
        return typeof value === 'string';
    },
    
    isNonEmptyString: function(value) {
        return typeof value === 'string' && value.trim().length > 0;
    },
    
    isArray: function(value) {
        return Array.isArray(value);
    },
    
    isNonEmptyArray: function(value) {
        return Array.isArray(value) && value.length > 0;
    },
    
    isObject: function(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    },
    
    isFunction: function(value) {
        return typeof value === 'function';
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: RANGE VALIDATORS
    // Range checking with integration to PRISM_CONSTANTS.LIMITS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Check if value is within range
     */
    isInRange: function(value, min, max) {
        return this.isNumeric(value) && value >= min && value <= max;
    },
    
    /**
     * Clamp value to range
     */
    clamp: function(value, min, max) {
        if (!this.isNumeric(value)) return min;
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Normalize value from one range to another
     */
    normalizeToRange: function(value, sourceMin, sourceMax, targetMin, targetMax) {
        if (!this.isNumeric(value)) return targetMin;
        const sourceRange = sourceMax - sourceMin;
        const targetRange = targetMax - targetMin;
        if (Math.abs(sourceRange) < PRISM_CONSTANTS.TOLERANCE.ZERO) return targetMin;
        const normalized = (value - sourceMin) / sourceRange;
        return targetMin + normalized * targetRange;
    },
    
    /**
     * Validate RPM against machine limits
     */
    validateRPM: function(rpm, machineMax = PRISM_CONSTANTS.LIMITS.MAX_RPM) {
        if (!this.isNumeric(rpm)) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'RPM must be a number' };
        }
        if (rpm <= 0) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE, message: 'RPM must be positive' };
        }
        if (rpm > machineMax) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_RPM, message: `RPM ${rpm} exceeds maximum ${machineMax}` };
        }
        const utilizationPercent = (rpm / machineMax) * 100;
        return { 
            valid: true, 
            value: rpm, 
            utilization: utilizationPercent.toFixed(1) + '%',
            warning: utilizationPercent > 90 ? 'Approaching RPM limit' : null
        };
    },
    
    /**
     * Validate feed rate against machine limits
     */
    validateFeed: function(feed, machineMax = PRISM_CONSTANTS.LIMITS.MAX_FEED) {
        if (!this.isNumeric(feed)) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'Feed must be a number' };
        }
        if (feed <= 0) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE, message: 'Feed must be positive' };
        }
        if (feed > machineMax) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_FEED, message: `Feed ${feed} exceeds maximum ${machineMax}` };
        }
        return { valid: true, value: feed };
    },
    
    /**
     * Validate depth of cut
     */
    validateDOC: function(doc, toolDiameter = null) {
        if (!this.isNumeric(doc)) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE, message: 'DOC must be a number' };
        }
        if (doc <= 0) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE, message: 'DOC must be positive' };
        }
        if (doc > PRISM_CONSTANTS.LIMITS.MAX_DOC) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OUT_OF_RANGE, message: `DOC ${doc} exceeds maximum ${PRISM_CONSTANTS.LIMITS.MAX_DOC}` };
        }
        if (toolDiameter && doc > toolDiameter * 1.5) {
            return { valid: true, value: doc, warning: 'DOC exceeds 1.5x tool diameter' };
        }
        return { valid: true, value: doc };
    },
    
    /**
     * Validate power requirement
     */
    validatePower: function(power, machineMax = PRISM_CONSTANTS.LIMITS.MAX_POWER) {
        if (!this.isNumeric(power)) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        }
        if (power < 0) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NEGATIVE_VALUE };
        }
        if (power > machineMax) {
            return { valid: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_EXCEEDS_POWER };
        }
        const utilizationPercent = (power / machineMax) * 100;
        return { 
            valid: true, 
            value: power,
            utilization: utilizationPercent.toFixed(1) + '%',
            warning: utilizationPercent > 85 ? 'Approaching power limit' : null
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: DOMAIN-SPECIFIC VALIDATORS
    // Comprehensive validation for manufacturing data types
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate material data object
     */
    validateMaterialData: function(material) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(material)) {
            return { valid: false, errors: ['Material must be an object'], warnings: [] };
        }
        
        // Required fields
        if (!this.isNonEmptyString(material.name) && !this.isNonEmptyString(material.id)) {
            errors.push('Material must have name or id');
        }
        
        // Validate base_speed if present
        if (material.base_speed !== undefined) {
            if (!this.isPositive(material.base_speed)) {
                errors.push('base_speed must be positive');
            } else if (material.base_speed > 2000) {
                warnings.push('base_speed unusually high (>2000 SFM)');
            }
        }
        
        // Validate machinability if present
        if (material.machinability !== undefined) {
            if (!this.isInRange(material.machinability, 0, 200)) {
                errors.push('machinability must be between 0-200');
            }
        }
        
        // Validate Kc (specific cutting force) if present
        if (material.kc1_1 !== undefined) {
            if (!this.isPositive(material.kc1_1)) {
                errors.push('kc1_1 must be positive');
            } else if (material.kc1_1 < 100 || material.kc1_1 > 5000) {
                warnings.push('kc1_1 outside typical range (100-5000 N/mm²)');
            }
        }
        
        // Validate mc (cutting force exponent) if present
        if (material.mc !== undefined) {
            if (!this.isInRange(material.mc, 0, 1)) {
                errors.push('mc must be between 0-1');
            }
        }
        
        // Validate Taylor coefficients if present
        if (material.taylor_n !== undefined) {
            if (!this.isInRange(material.taylor_n, 0.1, 0.5)) {
                warnings.push('taylor_n outside typical range (0.1-0.5)');
            }
        }
        if (material.taylor_C !== undefined) {
            if (!this.isPositive(material.taylor_C)) {
                errors.push('taylor_C must be positive');
            }
        }
        
        // Validate hardness if present
        if (material.hardness !== undefined) {
            if (!this.isInRange(material.hardness, 1, 70)) { // HRC scale
                warnings.push('hardness outside typical HRC range (1-70)');
            }
        }
        
        // Validate density if present
        if (material.density !== undefined) {
            if (!this.isInRange(material.density, 500, 25000)) { // kg/m³
                warnings.push('density outside typical range (500-25000 kg/m³)');
            }
        }
        
        // Validate thermal conductivity if present
        if (material.thermal_conductivity !== undefined) {
            if (!this.isPositive(material.thermal_conductivity)) {
                errors.push('thermal_conductivity must be positive');
            }
        }
        
        return { 
            valid: errors.length === 0, 
            errors, 
            warnings,
            data: material
        };
    },
    
    /**
     * Validate tool data object
     */
    validateToolData: function(tool) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(tool)) {
            return { valid: false, errors: ['Tool must be an object'], warnings: [] };
        }
        
        // Validate diameter
        if (tool.diameter !== undefined) {
            if (!this.isPositive(tool.diameter)) {
                errors.push('Tool diameter must be positive');
            } else if (tool.diameter < PRISM_CONSTANTS.LIMITS.MIN_TOOL_DIAMETER) {
                errors.push(`Tool diameter below minimum (${PRISM_CONSTANTS.LIMITS.MIN_TOOL_DIAMETER}mm)`);
            } else if (tool.diameter > PRISM_CONSTANTS.LIMITS.MAX_TOOL_DIAMETER) {
                errors.push(`Tool diameter exceeds maximum (${PRISM_CONSTANTS.LIMITS.MAX_TOOL_DIAMETER}mm)`);
            }
        } else {
            errors.push('Tool must have diameter');
        }
        
        // Validate flutes
        if (tool.flutes !== undefined) {
            if (!this.isPositiveInteger(tool.flutes)) {
                errors.push('Flutes must be a positive integer');
            } else if (tool.flutes > 12) {
                warnings.push('Unusually high flute count (>12)');
            }
        }
        
        // Validate stickout/length
        if (tool.stickout !== undefined || tool.length !== undefined) {
            const length = tool.stickout || tool.length;
            if (!this.isPositive(length)) {
                errors.push('Tool length/stickout must be positive');
            } else if (tool.diameter && length / tool.diameter > 10) {
                warnings.push('Very high L/D ratio (>10) - stability concern');
            }
        }
        
        // Validate helix angle
        if (tool.helix_angle !== undefined) {
            if (!this.isInRange(tool.helix_angle, 0, 60)) {
                errors.push('Helix angle must be 0-60 degrees');
            }
        }
        
        // Validate rake angle
        if (tool.rake_angle !== undefined) {
            if (!this.isInRange(tool.rake_angle, -30, 30)) {
                warnings.push('Rake angle outside typical range (-30 to +30 degrees)');
            }
        }
        
        // Validate coating
        if (tool.coating !== undefined && this.isNonEmptyString(tool.coating)) {
            const validCoatings = Object.keys(PRISM_CONSTANTS.COATINGS).filter(k => !k.includes('_'));
            if (!validCoatings.includes(tool.coating.toUpperCase())) {
                warnings.push(`Unknown coating: ${tool.coating}`);
            }
        }
        
        // Validate tool material
        if (tool.material !== undefined) {
            const validMaterials = ['carbide', 'hss', 'cobalt', 'ceramic', 'cbn', 'pcd'];
            if (!validMaterials.includes(tool.material.toLowerCase())) {
                warnings.push(`Unknown tool material: ${tool.material}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: tool };
    },
    
    /**
     * Validate machine data object
     */
    validateMachineData: function(machine) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(machine)) {
            return { valid: false, errors: ['Machine must be an object'], warnings: [] };
        }
        
        // Validate max RPM
        if (machine.max_rpm !== undefined) {
            if (!this.isPositive(machine.max_rpm)) {
                errors.push('max_rpm must be positive');
            } else if (machine.max_rpm > PRISM_CONSTANTS.LIMITS.MAX_RPM) {
                warnings.push(`max_rpm exceeds system limit (${PRISM_CONSTANTS.LIMITS.MAX_RPM})`);
            }
        }
        
        // Validate max feed
        if (machine.max_feed !== undefined) {
            if (!this.isPositive(machine.max_feed)) {
                errors.push('max_feed must be positive');
            }
        }
        
        // Validate max power
        if (machine.max_power !== undefined) {
            if (!this.isPositive(machine.max_power)) {
                errors.push('max_power must be positive');
            }
        }
        
        // Validate work envelope
        if (machine.work_envelope !== undefined) {
            if (this.isObject(machine.work_envelope)) {
                const { x, y, z } = machine.work_envelope;
                if (x !== undefined && !this.isPositive(x)) errors.push('work_envelope.x must be positive');
                if (y !== undefined && !this.isPositive(y)) errors.push('work_envelope.y must be positive');
                if (z !== undefined && !this.isPositive(z)) errors.push('work_envelope.z must be positive');
            }
        }
        
        // Validate axis count
        if (machine.axes !== undefined) {
            if (!this.isPositiveInteger(machine.axes) || machine.axes < 3 || machine.axes > 9) {
                errors.push('axes must be between 3-9');
            }
        }
        
        // Validate hourly rate
        if (machine.hourly_rate !== undefined) {
            if (!this.isNonNegative(machine.hourly_rate)) {
                errors.push('hourly_rate must be non-negative');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: machine };
    },
    
    /**
     * Validate cutting parameters object
     */
    validateCuttingParams: function(params, machine = null) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(params)) {
            return { valid: false, errors: ['Cutting params must be an object'], warnings: [] };
        }
        
        // Validate speed (SFM or m/min)
        if (params.speed !== undefined) {
            if (!this.isPositive(params.speed)) {
                errors.push('Cutting speed must be positive');
            } else if (params.speed > 3000) {
                warnings.push('Very high cutting speed (>3000) - verify units');
            }
        }
        
        // Validate RPM
        if (params.rpm !== undefined) {
            const maxRPM = machine?.max_rpm || PRISM_CONSTANTS.LIMITS.MAX_RPM;
            const rpmValidation = this.validateRPM(params.rpm, maxRPM);
            if (!rpmValidation.valid) {
                errors.push(rpmValidation.message);
            } else if (rpmValidation.warning) {
                warnings.push(rpmValidation.warning);
            }
        }
        
        // Validate feed per tooth
        if (params.fpt !== undefined || params.feed_per_tooth !== undefined) {
            const fpt = params.fpt || params.feed_per_tooth;
            if (!this.isPositive(fpt)) {
                errors.push('Feed per tooth must be positive');
            } else if (fpt > 1.0) {
                warnings.push('Very high feed per tooth (>1.0mm) - verify');
            }
        }
        
        // Validate feed rate
        if (params.feed !== undefined || params.feed_rate !== undefined) {
            const feed = params.feed || params.feed_rate;
            const maxFeed = machine?.max_feed || PRISM_CONSTANTS.LIMITS.MAX_FEED;
            const feedValidation = this.validateFeed(feed, maxFeed);
            if (!feedValidation.valid) {
                errors.push('Feed rate: ' + feedValidation.message);
            }
        }
        
        // Validate DOC
        if (params.doc !== undefined || params.depth_of_cut !== undefined || params.ap !== undefined) {
            const doc = params.doc || params.depth_of_cut || params.ap;
            const docValidation = this.validateDOC(doc, params.tool_diameter);
            if (!docValidation.valid) {
                errors.push(docValidation.message);
            } else if (docValidation.warning) {
                warnings.push(docValidation.warning);
            }
        }
        
        // Validate WOC (width of cut / stepover)
        if (params.woc !== undefined || params.ae !== undefined || params.stepover !== undefined) {
            const woc = params.woc || params.ae || params.stepover;
            if (!this.isPositive(woc)) {
                errors.push('Width of cut must be positive');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: params };
    },
    
    /**
     * Validate geometry/position data
     */
    validateGeometry: function(geometry) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(geometry)) {
            return { valid: false, errors: ['Geometry must be an object'], warnings: [] };
        }
        
        // Validate points array
        if (geometry.points !== undefined) {
            if (!this.isNonEmptyArray(geometry.points)) {
                errors.push('points must be a non-empty array');
            } else {
                for (let i = 0; i < geometry.points.length; i++) {
                    const p = geometry.points[i];
                    if (!this.position(p, `points[${i}]`)) {
                        errors.push(`Invalid point at index ${i}`);
                    }
                }
            }
        }
        
        // Validate bounding box
        if (geometry.bounds !== undefined || geometry.bbox !== undefined) {
            const bounds = geometry.bounds || geometry.bbox;
            if (this.isObject(bounds)) {
                if (bounds.min && bounds.max) {
                    if (!this.position(bounds.min, 'bounds.min') || !this.position(bounds.max, 'bounds.max')) {
                        errors.push('Invalid bounding box');
                    }
                }
            }
        }
        
        // Validate dimensions
        if (geometry.length !== undefined && !this.isNonNegative(geometry.length)) {
            errors.push('length must be non-negative');
        }
        if (geometry.width !== undefined && !this.isNonNegative(geometry.width)) {
            errors.push('width must be non-negative');
        }
        if (geometry.height !== undefined && !this.isNonNegative(geometry.height)) {
            errors.push('height must be non-negative');
        }
        if (geometry.diameter !== undefined && !this.isPositive(geometry.diameter)) {
            errors.push('diameter must be positive');
        }
        if (geometry.radius !== undefined && !this.isPositive(geometry.radius)) {
            errors.push('radius must be positive');
        }
        
        return { valid: errors.length === 0, errors, warnings, data: geometry };
    },
    
    /**
     * Validate toolpath data
     */
    validateToolpath: function(toolpath) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(toolpath)) {
            return { valid: false, errors: ['Toolpath must be an object'], warnings: [] };
        }
        
        // Validate points
        if (toolpath.points !== undefined) {
            if (!this.isNonEmptyArray(toolpath.points)) {
                errors.push('Toolpath must have points array');
            } else {
                if (toolpath.points.length > PRISM_CONSTANTS.LIMITS.MAX_TOOLPATH_POINTS) {
                    warnings.push(`Toolpath has ${toolpath.points.length} points (max: ${PRISM_CONSTANTS.LIMITS.MAX_TOOLPATH_POINTS})`);
                }
                // Spot check first and last points
                if (!this.position(toolpath.points[0], 'toolpath.start')) {
                    errors.push('Invalid toolpath start point');
                }
                if (!this.position(toolpath.points[toolpath.points.length - 1], 'toolpath.end')) {
                    errors.push('Invalid toolpath end point');
                }
            }
        }
        
        // Validate feed rates if present
        if (toolpath.feedrates !== undefined) {
            if (!this.isNonEmptyArray(toolpath.feedrates)) {
                errors.push('feedrates must be an array');
            }
        }
        
        // Validate operation type
        if (toolpath.operation !== undefined) {
            const validOps = ['roughing', 'semi_finishing', 'finishing', 'hsm', 'trochoidal', 'plunge', 'ramp', 'helix', 'drill', 'bore', 'tap', 'ream'];
            if (!validOps.includes(toolpath.operation.toLowerCase())) {
                warnings.push(`Unknown operation type: ${toolpath.operation}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: toolpath };
    },
    
    /**
     * Validate holder data
     */
    validateHolderData: function(holder) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(holder)) {
            return { valid: false, errors: ['Holder must be an object'], warnings: [] };
        }
        
        // Validate taper
        if (holder.taper !== undefined) {
            const validTapers = ['BT30', 'BT40', 'BT50', 'CAT40', 'CAT50', 'HSK-A63', 'HSK-A100', 'HSK-E40', 'HSK-F63', 'ER16', 'ER20', 'ER25', 'ER32', 'ER40'];
            if (!validTapers.some(t => holder.taper.toUpperCase().includes(t))) {
                warnings.push(`Unknown taper type: ${holder.taper}`);
            }
        }
        
        // Validate gauge length
        if (holder.gauge_length !== undefined) {
            if (!this.isPositive(holder.gauge_length)) {
                errors.push('gauge_length must be positive');
            }
        }
        
        // Validate runout
        if (holder.runout !== undefined) {
            if (!this.isNonNegative(holder.runout)) {
                errors.push('runout must be non-negative');
            } else if (holder.runout > 0.01) { // 10 microns
                warnings.push('High runout (>0.01mm)');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: holder };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: CROSS-REFERENCE VALIDATORS
    // Validate combinations of parameters
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate tool-material compatibility
     */
    validateToolMaterialCompatibility: function(tool, material) {
        const warnings = [];
        
        // Check coating compatibility with material
        if (tool.coating && material.material_class) {
            const coating = tool.coating.toUpperCase();
            const matClass = material.material_class.toLowerCase();
            
            // Diamond on ferrous = bad
            if (coating === 'DIAMOND' && ['steel', 'cast_iron', 'stainless'].includes(matClass)) {
                warnings.push('Diamond coating not recommended for ferrous materials');
            }
            
            // Uncoated on abrasive materials
            if (coating === 'UNCOATED' && material.abrasiveness > 1.5) {
                warnings.push('Uncoated tool on highly abrasive material - short life expected');
            }
            
            // High temp materials need appropriate coating
            if (['titanium', 'inconel', 'superalloy'].includes(matClass) && !['AlTiN', 'TiAlN', 'AlCrN'].includes(coating)) {
                warnings.push('Consider AlTiN/TiAlN coating for high-temp alloy');
            }
        }
        
        return { valid: true, warnings };
    },
    
    /**
     * Validate parameters against physics limits
     */
    validatePhysicsLimits: function(params, material, tool, machine) {
        const errors = [];
        const warnings = [];
        
        // Check power requirement
        if (params.power_required !== undefined && machine.max_power !== undefined) {
            if (params.power_required > machine.max_power) {
                errors.push(`Required power (${params.power_required}kW) exceeds machine capacity (${machine.max_power}kW)`);
            } else if (params.power_required > machine.max_power * PRISM_CONSTANTS.SAFETY.POWER_LIMIT_FACTOR) {
                warnings.push('Approaching machine power limit');
            }
        }
        
        // Check torque requirement
        if (params.torque_required !== undefined && machine.max_torque !== undefined) {
            if (params.torque_required > machine.max_torque) {
                errors.push(`Required torque exceeds machine capacity`);
            }
        }
        
        // Check tool deflection
        if (tool.stickout && tool.diameter) {
            const ldRatio = tool.stickout / tool.diameter;
            if (ldRatio > PRISM_CONSTANTS.BORING.LD_RATIO_STEEL_BAR_MAX && tool.material !== 'carbide') {
                warnings.push(`L/D ratio (${ldRatio.toFixed(1)}) high for non-carbide tool`);
            }
            if (ldRatio > PRISM_CONSTANTS.BORING.LD_RATIO_CARBIDE_BAR_MAX) {
                warnings.push(`L/D ratio (${ldRatio.toFixed(1)}) exceeds recommended maximum`);
            }
        }
        
        // Check temperature limits
        if (params.cutting_temperature !== undefined && material.material_class) {
            const maxTemp = PRISM_THERMAL_LOOKUP ? 
                PRISM_THERMAL_LOOKUP.getMaxTemp(material.material_class) :
                PRISM_CONSTANTS.THERMAL.MAX_TEMP_GENERAL;
            if (params.cutting_temperature > maxTemp) {
                warnings.push(`Predicted temperature (${params.cutting_temperature}°C) exceeds limit for ${material.material_class}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // ORIGINAL GEOMETRY VALIDATORS (Preserved from v8.87.004)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    position: function(pos, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (!pos || typeof pos !== 'object') {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid position from ${source}:`, pos);
            return false;
        }
        const x = pos.x ?? pos.X, y = pos.y ?? pos.Y, z = pos.z ?? pos.Z;
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Position missing coordinates from ${source}:`, pos);
            return false;
        }
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Position has NaN/Infinity from ${source}:`, pos);
            return false;
        }
        return true;
    },
    
    toolVector: function(vec, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (!vec || typeof vec !== 'object') return false;
        const i = vec.i ?? vec.x ?? vec.I ?? vec.X ?? 0;
        const j = vec.j ?? vec.y ?? vec.J ?? vec.Y ?? 0;
        const k = vec.k ?? vec.z ?? vec.K ?? vec.Z ?? 1;
        const len = Math.sqrt(i*i + j*j + k*k);
        if (len < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Zero-length tool vector from ${source}`);
            return false;
        }
        if (Math.abs(len - 1) > PRISM_CONSTANTS.TOLERANCE.UNIT_VECTOR) {
            PRISM_CONSTANTS.DEBUG && console.warn(`[VALIDATOR] Tool vector not normalized from ${source}: len=${len.toFixed(6)}`);
        }
        return true;
    },
    
    angle: function(value, min, max, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (typeof value !== 'number' || !isFinite(value)) {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid angle from ${source}:`, value);
            return false;
        }
        if (value < min || value > max) {
            PRISM_CONSTANTS.DEBUG && console.warn(`[VALIDATOR] Angle out of range from ${source}: ${value} not in [${min}, ${max}]`);
        }
        return true;
    },
    
    number: function(value, options = {}, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (typeof value !== 'number' || !isFinite(value)) {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid number from ${source}:`, value);
            return false;
        }
        if (options.min !== undefined && value < options.min) PRISM_CONSTANTS.DEBUG && console.warn(`[VALIDATOR] Number below min from ${source}: ${value} < ${options.min}`);
        if (options.max !== undefined && value > options.max) PRISM_CONSTANTS.DEBUG && console.warn(`[VALIDATOR] Number above max from ${source}: ${value} > ${options.max}`);
        if (options.positive && value <= 0) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Expected positive number from ${source}:`, value); return false; }
        if (options.nonNegative && value < 0) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Expected non-negative number from ${source}:`, value); return false; }
        return true;
    },
    
    array: function(arr, options = {}, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (!Array.isArray(arr)) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Expected array from ${source}:`, arr); return false; }
        if (options.length !== undefined && arr.length !== options.length) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Array length mismatch from ${source}`); return false; }
        if (options.minLength !== undefined && arr.length < options.minLength) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Array too short from ${source}`); return false; }
        return true;
    },
    
    matrix: function(mat, rows, cols, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (!Array.isArray(mat) || mat.length !== rows) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid matrix dimensions from ${source}`); return false; }
        for (let i = 0; i < rows; i++) {
            if (!Array.isArray(mat[i]) || mat[i].length !== cols) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid matrix row ${i} from ${source}`); return false; }
            for (let j = 0; j < cols; j++) {
                if (typeof mat[i][j] !== 'number' || !isFinite(mat[i][j])) { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid matrix element [${i}][${j}] from ${source}`); return false; }
            }
        }
        return true;
    },
    
    quaternion: function(q, source = 'unknown') {
        if (!PRISM_CONSTANTS.VALIDATE_ALL_INPUTS) return true;
        if (!q || typeof q !== 'object') { PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Invalid quaternion from ${source}:`, q); return false; }
        const { x, y, z, w } = q;
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || typeof w !== 'number') {
            PRISM_CONSTANTS.DEBUG && console.error(`[VALIDATOR] Quaternion missing components from ${source}:`, q);
            return false;
        }
        const len = Math.sqrt(x*x + y*y + z*z + w*w);
        if (Math.abs(len - 1) > PRISM_CONSTANTS.TOLERANCE.UNIT_VECTOR) {
            PRISM_CONSTANTS.DEBUG && console.warn(`[VALIDATOR] Quaternion not normalized from ${source}: len=${len.toFixed(6)}`);
        }
        return true;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2: COMPREHENSIVE VALIDATION RUNNER
    // Run all validations at once
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Comprehensive validation of complete job parameters
     */
    validateJobParameters: function(job) {
        const results = {
            valid: true,
            material: null,
            tool: null,
            machine: null,
            params: null,
            compatibility: null,
            physics: null,
            errors: [],
            warnings: []
        };
        
        // Validate material
        if (job.material) {
            results.material = this.validateMaterialData(job.material);
            if (!results.material.valid) {
                results.valid = false;
                results.errors.push(...results.material.errors.map(e => 'Material: ' + e));
            }
            results.warnings.push(...(results.material.warnings || []).map(w => 'Material: ' + w));
        }
        
        // Validate tool
        if (job.tool) {
            results.tool = this.validateToolData(job.tool);
            if (!results.tool.valid) {
                results.valid = false;
                results.errors.push(...results.tool.errors.map(e => 'Tool: ' + e));
            }
            results.warnings.push(...(results.tool.warnings || []).map(w => 'Tool: ' + w));
        }
        
        // Validate machine
        if (job.machine) {
            results.machine = this.validateMachineData(job.machine);
            if (!results.machine.valid) {
                results.valid = false;
                results.errors.push(...results.machine.errors.map(e => 'Machine: ' + e));
            }
            results.warnings.push(...(results.machine.warnings || []).map(w => 'Machine: ' + w));
        }
        
        // Validate cutting parameters
        if (job.params || job.cutting_params) {
            results.params = this.validateCuttingParams(job.params || job.cutting_params, job.machine);
            if (!results.params.valid) {
                results.valid = false;
                results.errors.push(...results.params.errors.map(e => 'Params: ' + e));
            }
            results.warnings.push(...(results.params.warnings || []).map(w => 'Params: ' + w));
        }
        
        // Cross-reference validations
        if (job.tool && job.material) {
            results.compatibility = this.validateToolMaterialCompatibility(job.tool, job.material);
            results.warnings.push(...(results.compatibility.warnings || []).map(w => 'Compatibility: ' + w));
        }
        
        // Physics validation
        if (job.params && job.material && job.tool && job.machine) {
            results.physics = this.validatePhysicsLimits(job.params, job.material, job.tool, job.machine);
            if (!results.physics.valid) {
                results.valid = false;
                results.errors.push(...results.physics.errors.map(e => 'Physics: ' + e));
            }
            results.warnings.push(...(results.physics.warnings || []).map(w => 'Physics: ' + w));
        }
        
        return results;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 EXTENSION: ADDITIONAL SAFE MATH OPERATIONS
    // Complete set of safe trigonometric and numeric operations
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Safe tangent with singularity protection
     */
    safeTan: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        // Check for near-singularity (π/2 + nπ)
        const normalized = x % Math.PI;
        if (Math.abs(Math.abs(normalized) - Math.PI/2) < PRISM_CONSTANTS.TOLERANCE.SINGULARITY) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NUMERICAL_INSTABILITY, message: 'Near tangent singularity' };
        }
        return { value: Math.tan(x), success: true };
    },
    
    /**
     * Safe sine (always succeeds but validates input)
     */
    safeSin: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.sin(x), success: true };
    },
    
    /**
     * Safe cosine (always succeeds but validates input)
     */
    safeCos: function(x, fallback = 1) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.cos(x), success: true };
    },
    
    /**
     * Safe atan2 with zero-vector protection
     */
    safeAtan2: function(y, x, fallback = 0) {
        if (!this.isNumeric(y) || !this.isNumeric(x)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        }
        if (Math.abs(x) < PRISM_CONSTANTS.TOLERANCE.ZERO && Math.abs(y) < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_NUMERICAL_INSTABILITY, message: 'atan2(0,0) undefined' };
        }
        return { value: Math.atan2(y, x), success: true };
    },
    
    /**
     * Safe arcsine with domain protection
     */
    safeAsin: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        if (x < -1 || x > 1) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OUT_OF_RANGE, message: 'asin domain is [-1, 1]' };
        }
        return { value: Math.asin(x), success: true };
    },
    
    /**
     * Safe arccosine with domain protection
     */
    safeAcos: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        if (x < -1 || x > 1) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_OUT_OF_RANGE, message: 'acos domain is [-1, 1]' };
        }
        return { value: Math.acos(x), success: true };
    },
    
    /**
     * Safe modulo with zero divisor protection
     */
    safeMod: function(a, b, fallback = 0) {
        if (!this.isNumeric(a) || !this.isNumeric(b)) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        }
        if (Math.abs(b) < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_DIVISION_BY_ZERO };
        }
        return { value: a % b, success: true };
    },
    
    /**
     * Safe min with empty array protection
     */
    safeMin: function(arr, fallback = 0) {
        if (!this.isNonEmptyArray(arr)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_INPUT };
        const numericValues = arr.filter(v => this.isNumeric(v));
        if (numericValues.length === 0) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.min(...numericValues), success: true };
    },
    
    /**
     * Safe max with empty array protection
     */
    safeMax: function(arr, fallback = 0) {
        if (!this.isNonEmptyArray(arr)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_INPUT };
        const numericValues = arr.filter(v => this.isNumeric(v));
        if (numericValues.length === 0) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.max(...numericValues), success: true };
    },
    
    /**
     * Safe absolute value
     */
    safeAbs: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.abs(x), success: true };
    },
    
    /**
     * Safe floor
     */
    safeFloor: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.floor(x), success: true };
    },
    
    /**
     * Safe ceil
     */
    safeCeil: function(x, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        return { value: Math.ceil(x), success: true };
    },
    
    /**
     * Safe round with precision
     */
    safeRound: function(x, decimals = 0, fallback = 0) {
        if (!this.isNumeric(x)) return { value: fallback, success: false, error: PRISM_CONSTANTS.ERROR_CODES.ERR_INVALID_TYPE };
        const factor = Math.pow(10, decimals);
        return { value: Math.round(x * factor) / factor, success: true };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 EXTENSION: ADDITIONAL TYPE VALIDATORS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    isBoolean: function(value) {
        return typeof value === 'boolean';
    },
    
    isDate: function(value) {
        return value instanceof Date && !isNaN(value.getTime());
    },
    
    isNullOrUndefined: function(value) {
        return value === null || value === undefined;
    },
    
    isPercentage: function(value, normalized = false) {
        // normalized=true means 0-1 range, false means 0-100 range
        if (!this.isNumeric(value)) return false;
        return normalized ? (value >= 0 && value <= 1) : (value >= 0 && value <= 100);
    },
    
    isAngleValid: function(value, unit = 'degrees') {
        if (!this.isNumeric(value)) return false;
        if (unit === 'radians') return value >= -2 * Math.PI && value <= 2 * Math.PI;
        return value >= -360 && value <= 360;
    },
    
    isValidEmail: function(value) {
        if (!this.isString(value)) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    
    isValidUrl: function(value) {
        if (!this.isString(value)) return false;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 EXTENSION: SECURITY VALIDATORS
    // Sanitization functions for input security
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Sanitize string input - remove potentially dangerous characters
     */
    sanitizeString: function(value, options = {}) {
        if (!this.isString(value)) return { value: '', sanitized: true, original: value };
        
        let sanitized = value;
        
        // Remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        
        // Trim whitespace
        if (options.trim !== false) sanitized = sanitized.trim();
        
        // Max length
        if (options.maxLength && sanitized.length > options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }
        
        // Remove HTML tags if specified
        if (options.stripHtml) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }
        
        return { value: sanitized, sanitized: sanitized !== value, original: value };
    },
    
    /**
     * Sanitize number input
     */
    sanitizeNumber: function(value, options = {}) {
        if (this.isNumeric(value)) {
            let result = value;
            if (options.min !== undefined) result = Math.max(result, options.min);
            if (options.max !== undefined) result = Math.min(result, options.max);
            if (options.integer) result = Math.round(result);
            return { value: result, sanitized: result !== value, original: value };
        }
        
        // Try to parse
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && isFinite(parsed)) {
            return this.sanitizeNumber(parsed, options);
        }
        
        return { value: options.fallback || 0, sanitized: true, original: value, error: 'Could not parse number' };
    },
    
    /**
     * Sanitize HTML content - escape dangerous characters
     */
    sanitizeHtml: function(value) {
        if (!this.isString(value)) return { value: '', sanitized: true };
        
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        const sanitized = value.replace(/[&<>"'/]/g, char => escapeMap[char]);
        return { value: sanitized, sanitized: sanitized !== value, original: value };
    },
    
    /**
     * Check for potential injection attacks
     */
    validateNoInjection: function(value) {
        if (!this.isString(value)) return { valid: true };
        
        const patterns = {
            sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
            script: /<script[^>]*>|<\/script>/i,
            eval: /\beval\s*\(/i,
            prototype: /__proto__|prototype\s*\[/i
        };
        
        const detected = [];
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(value)) detected.push(type);
        }
        
        return {
            valid: detected.length === 0,
            detected,
            message: detected.length > 0 ? `Potential ${detected.join(', ')} injection detected` : null
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 EXTENSION: ADDITIONAL DOMAIN VALIDATORS
    // Validators for all manufacturing data types
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate workpiece data
     */
    validateWorkpieceData: function(workpiece) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(workpiece)) {
            return { valid: false, errors: ['Workpiece must be an object'], warnings: [] };
        }
        
        // Validate dimensions
        if (workpiece.length !== undefined && !this.isPositive(workpiece.length)) {
            errors.push('Workpiece length must be positive');
        }
        if (workpiece.width !== undefined && !this.isPositive(workpiece.width)) {
            errors.push('Workpiece width must be positive');
        }
        if (workpiece.height !== undefined && !this.isPositive(workpiece.height)) {
            errors.push('Workpiece height must be positive');
        }
        if (workpiece.diameter !== undefined && !this.isPositive(workpiece.diameter)) {
            errors.push('Workpiece diameter must be positive');
        }
        
        // Validate material reference
        if (workpiece.material && !this.isNonEmptyString(workpiece.material) && !this.isObject(workpiece.material)) {
            errors.push('Workpiece material must be string ID or object');
        }
        
        // Validate stock type
        if (workpiece.stock_type) {
            const validTypes = ['bar', 'plate', 'sheet', 'billet', 'casting', 'forging', 'tube', 'hex', 'custom'];
            if (!validTypes.includes(workpiece.stock_type.toLowerCase())) {
                warnings.push(`Unknown stock type: ${workpiece.stock_type}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: workpiece };
    },
    
    /**
     * Validate operation data
     */
    validateOperationData: function(operation) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(operation)) {
            return { valid: false, errors: ['Operation must be an object'], warnings: [] };
        }
        
        // Validate operation type
        if (operation.type) {
            const validTypes = Object.keys(PRISM_CONSTANTS.OPERATIONS || {}).filter(k => !k.includes('_'));
            if (validTypes.length > 0 && !validTypes.some(t => operation.type.toLowerCase().includes(t.toLowerCase()))) {
                warnings.push(`Operation type '${operation.type}' may not be recognized`);
            }
        }
        
        // Validate quality level
        if (operation.quality) {
            const validQualities = ['rough', 'semi_finish', 'finish', 'precision', 'ultra_precision'];
            if (!validQualities.includes(operation.quality.toLowerCase())) {
                warnings.push(`Unknown quality level: ${operation.quality}`);
            }
        }
        
        // Validate tolerance
        if (operation.tolerance !== undefined) {
            if (!this.isPositive(operation.tolerance)) {
                errors.push('Tolerance must be positive');
            } else if (operation.tolerance < 0.001) {
                warnings.push('Extremely tight tolerance (<0.001mm) - verify achievability');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: operation };
    },
    
    /**
     * Validate setup data
     */
    validateSetupData: function(setup) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(setup)) {
            return { valid: false, errors: ['Setup must be an object'], warnings: [] };
        }
        
        // Validate fixture type
        if (setup.fixture_type) {
            const validFixtures = ['vise', 'chuck', 'collet', 'vacuum', 'magnetic', 'fixture_plate', 'custom', 'soft_jaws'];
            if (!validFixtures.includes(setup.fixture_type.toLowerCase())) {
                warnings.push(`Unknown fixture type: ${setup.fixture_type}`);
            }
        }
        
        // Validate setup time
        if (setup.setup_time !== undefined) {
            if (!this.isNonNegative(setup.setup_time)) {
                errors.push('Setup time must be non-negative');
            } else if (setup.setup_time > 480) { // 8 hours
                warnings.push('Very long setup time (>8 hours)');
            }
        }
        
        // Validate number of operations
        if (setup.num_ops !== undefined && !this.isPositiveInteger(setup.num_ops)) {
            errors.push('Number of operations must be positive integer');
        }
        
        return { valid: errors.length === 0, errors, warnings, data: setup };
    },
    
    /**
     * Validate fixture data
     */
    validateFixtureData: function(fixture) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(fixture)) {
            return { valid: false, errors: ['Fixture must be an object'], warnings: [] };
        }
        
        // Validate clamping force
        if (fixture.clamp_force !== undefined) {
            if (!this.isPositive(fixture.clamp_force)) {
                errors.push('Clamp force must be positive');
            }
        }
        
        // Validate repeatability
        if (fixture.repeatability !== undefined) {
            if (!this.isPositive(fixture.repeatability)) {
                errors.push('Repeatability must be positive');
            } else if (fixture.repeatability > 0.1) {
                warnings.push('Low repeatability (>0.1mm)');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: fixture };
    },
    
    /**
     * Validate coolant data
     */
    validateCoolantData: function(coolant) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(coolant)) {
            return { valid: false, errors: ['Coolant must be an object'], warnings: [] };
        }
        
        // Validate coolant type
        if (coolant.type) {
            const validTypes = Object.keys(PRISM_CONSTANTS.COOLANT || {}).filter(k => !k.includes('_'));
            if (validTypes.length > 0 && !validTypes.some(t => coolant.type.toUpperCase().includes(t))) {
                warnings.push(`Unknown coolant type: ${coolant.type}`);
            }
        }
        
        // Validate concentration
        if (coolant.concentration !== undefined) {
            if (!this.isInRange(coolant.concentration, 
                PRISM_CONSTANTS.MAINTENANCE?.COOLANT_CONCENTRATION_MIN || 3,
                PRISM_CONSTANTS.MAINTENANCE?.COOLANT_CONCENTRATION_MAX || 15)) {
                warnings.push('Coolant concentration outside recommended range');
            }
        }
        
        // Validate pH
        if (coolant.ph !== undefined) {
            if (!this.isInRange(coolant.ph,
                PRISM_CONSTANTS.MAINTENANCE?.COOLANT_PH_MIN || 8.0,
                PRISM_CONSTANTS.MAINTENANCE?.COOLANT_PH_MAX || 10.0)) {
                warnings.push('Coolant pH outside recommended range');
            }
        }
        
        // Validate pressure
        if (coolant.pressure !== undefined) {
            if (!this.isPositive(coolant.pressure)) {
                errors.push('Coolant pressure must be positive');
            } else if (coolant.pressure > 100) { // 100 bar
                warnings.push('Very high coolant pressure (>100 bar)');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: coolant };
    },
    
    /**
     * Validate coating data
     */
    validateCoatingData: function(coating) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(coating) && !this.isString(coating)) {
            return { valid: false, errors: ['Coating must be an object or string'], warnings: [] };
        }
        
        const coatingName = this.isString(coating) ? coating : coating.name || coating.type;
        
        if (coatingName) {
            const validCoatings = Object.keys(PRISM_CONSTANTS.COATINGS || {}).filter(k => !k.includes('_'));
            if (validCoatings.length > 0 && !validCoatings.includes(coatingName.toUpperCase())) {
                warnings.push(`Unknown coating: ${coatingName}`);
            }
        }
        
        // Validate thickness if object
        if (this.isObject(coating) && coating.thickness !== undefined) {
            if (!this.isPositive(coating.thickness)) {
                errors.push('Coating thickness must be positive');
            } else if (coating.thickness > 10) { // 10 microns
                warnings.push('Unusually thick coating (>10µm)');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: coating };
    },
    
    /**
     * Validate threading data
     */
    validateThreadingData: function(thread) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(thread)) {
            return { valid: false, errors: ['Threading data must be an object'], warnings: [] };
        }
        
        // Validate pitch
        if (thread.pitch !== undefined) {
            if (!this.isPositive(thread.pitch)) {
                errors.push('Thread pitch must be positive');
            } else if (thread.pitch < 0.2 || thread.pitch > 8) {
                warnings.push('Thread pitch outside common range (0.2-8mm)');
            }
        }
        
        // Validate TPI if imperial
        if (thread.tpi !== undefined) {
            if (!this.isPositive(thread.tpi)) {
                errors.push('TPI must be positive');
            } else if (thread.tpi < 4 || thread.tpi > 80) {
                warnings.push('TPI outside common range (4-80)');
            }
        }
        
        // Validate thread type
        if (thread.type) {
            const validTypes = ['metric', 'unc', 'unf', 'bsp', 'npt', 'acme', 'buttress', 'trapezoidal'];
            if (!validTypes.includes(thread.type.toLowerCase())) {
                warnings.push(`Unknown thread type: ${thread.type}`);
            }
        }
        
        // Validate thread class
        if (thread.class) {
            const validClasses = ['1', '2', '3', '4g6g', '6g', '6h', '4H5H', '6H'];
            if (!validClasses.some(c => thread.class.toUpperCase().includes(c.toUpperCase()))) {
                warnings.push(`Unknown thread class: ${thread.class}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: thread };
    },
    
    /**
     * Validate drilling data
     */
    validateDrillingData: function(drill) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(drill)) {
            return { valid: false, errors: ['Drilling data must be an object'], warnings: [] };
        }
        
        // Validate hole diameter
        if (drill.diameter !== undefined) {
            if (!this.isPositive(drill.diameter)) {
                errors.push('Hole diameter must be positive');
            }
        }
        
        // Validate depth
        if (drill.depth !== undefined) {
            if (!this.isPositive(drill.depth)) {
                errors.push('Hole depth must be positive');
            }
            // Check L/D ratio
            if (drill.diameter && drill.depth / drill.diameter > 10) {
                warnings.push('Deep hole (L/D > 10) - consider peck drilling');
            }
        }
        
        // Validate hole type
        if (drill.hole_type) {
            const validTypes = ['through', 'blind', 'counterbore', 'countersink', 'spot', 'center'];
            if (!validTypes.includes(drill.hole_type.toLowerCase())) {
                warnings.push(`Unknown hole type: ${drill.hole_type}`);
            }
        }
        
        // Validate peck depth
        if (drill.peck_depth !== undefined) {
            if (!this.isPositive(drill.peck_depth)) {
                errors.push('Peck depth must be positive');
            }
            if (drill.diameter && drill.peck_depth > drill.diameter * 3) {
                warnings.push('Peck depth > 3x diameter - consider smaller pecks');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: drill };
    },
    
    /**
     * Validate turning data (for lathe operations)
     */
    validateTurningData: function(turning) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(turning)) {
            return { valid: false, errors: ['Turning data must be an object'], warnings: [] };
        }
        
        // Validate part diameter
        if (turning.diameter !== undefined) {
            if (!this.isPositive(turning.diameter)) {
                errors.push('Part diameter must be positive');
            }
        }
        
        // Validate nose radius
        if (turning.nose_radius !== undefined) {
            if (!this.isPositive(turning.nose_radius)) {
                errors.push('Nose radius must be positive');
            }
            const validRadii = [PRISM_CONSTANTS.TURNING?.NOSE_RADIUS_FINE, PRISM_CONSTANTS.TURNING?.NOSE_RADIUS_LIGHT,
                               PRISM_CONSTANTS.TURNING?.NOSE_RADIUS_MEDIUM, PRISM_CONSTANTS.TURNING?.NOSE_RADIUS_HEAVY];
            if (validRadii.some(r => r) && !validRadii.some(r => Math.abs(turning.nose_radius - r) < 0.01)) {
                warnings.push('Non-standard nose radius');
            }
        }
        
        // Validate overhang
        if (turning.overhang !== undefined && turning.diameter !== undefined) {
            const ldRatio = turning.overhang / turning.diameter;
            const maxRatio = PRISM_CONSTANTS.TURNING?.OVERHANG_RATIO_SAFE || 3.0;
            if (ldRatio > maxRatio) {
                warnings.push(`Overhang ratio (${ldRatio.toFixed(1)}) exceeds safe limit (${maxRatio})`);
            }
        }
        
        // Validate insert shape
        if (turning.insert_shape) {
            const validShapes = ['CNMG', 'DNMG', 'TNMG', 'VNMG', 'WNMG', 'SNMG', 'RCMT', 'CCMT', 'DCMT'];
            if (!validShapes.some(s => turning.insert_shape.toUpperCase().includes(s))) {
                warnings.push(`Unknown insert shape: ${turning.insert_shape}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: turning };
    },
    
    /**
     * Validate boring data
     */
    validateBoringData: function(boring) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(boring)) {
            return { valid: false, errors: ['Boring data must be an object'], warnings: [] };
        }
        
        // Validate bore diameter
        if (boring.diameter !== undefined) {
            if (!this.isPositive(boring.diameter)) {
                errors.push('Bore diameter must be positive');
            }
            const minBore = PRISM_CONSTANTS.BORING?.MIN_BORE_STANDARD || 3.0;
            if (boring.diameter < minBore) {
                warnings.push(`Small bore diameter (<${minBore}mm) - consider micro boring`);
            }
        }
        
        // Validate L/D ratio
        if (boring.stickout !== undefined && boring.bar_diameter !== undefined) {
            const ldRatio = boring.stickout / boring.bar_diameter;
            const maxLD = boring.damped ? 
                (PRISM_CONSTANTS.BORING?.LD_RATIO_DAMPED_BAR_MAX || 10) :
                (PRISM_CONSTANTS.BORING?.LD_RATIO_CARBIDE_BAR_MAX || 6);
            if (ldRatio > maxLD) {
                errors.push(`L/D ratio (${ldRatio.toFixed(1)}) exceeds maximum (${maxLD})`);
            } else if (ldRatio > maxLD * 0.8) {
                warnings.push(`L/D ratio approaching limit`);
            }
        }
        
        // Validate bar-to-bore ratio
        if (boring.bar_diameter !== undefined && boring.diameter !== undefined) {
            const ratio = boring.bar_diameter / boring.diameter;
            const minRatio = PRISM_CONSTANTS.BORING?.BAR_TO_BORE_RATIO_MIN || 0.65;
            if (ratio < minRatio) {
                warnings.push(`Bar-to-bore ratio (${ratio.toFixed(2)}) below recommended (${minRatio})`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: boring };
    },
    
    /**
     * Validate grinding data
     */
    validateGrindingData: function(grinding) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(grinding)) {
            return { valid: false, errors: ['Grinding data must be an object'], warnings: [] };
        }
        
        // Validate wheel speed
        if (grinding.wheel_speed !== undefined) {
            if (!this.isPositive(grinding.wheel_speed)) {
                errors.push('Wheel speed must be positive');
            }
            const maxSpeed = PRISM_CONSTANTS.GRINDING?.WHEEL_SPEED_VITRIFIED_MAX || 35;
            if (grinding.wheel_speed > maxSpeed && !grinding.wheel_type?.toLowerCase().includes('cbn')) {
                warnings.push(`Wheel speed may exceed safe limit for wheel type`);
            }
        }
        
        // Validate wheel grade
        if (grinding.grade) {
            if (grinding.grade.length !== 1 || grinding.grade < 'A' || grinding.grade > 'Z') {
                warnings.push('Wheel grade should be A-Z');
            }
        }
        
        // Validate infeed
        if (grinding.infeed !== undefined) {
            if (!this.isPositive(grinding.infeed)) {
                errors.push('Infeed must be positive');
            }
            const maxInfeed = PRISM_CONSTANTS.GRINDING?.INFEED_ROUGH || 0.025;
            if (grinding.infeed > maxInfeed * 2) {
                warnings.push('Very aggressive infeed');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: grinding };
    },
    
    /**
     * Validate EDM data
     */
    validateEDMData: function(edm) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(edm)) {
            return { valid: false, errors: ['EDM data must be an object'], warnings: [] };
        }
        
        // Validate spark gap
        if (edm.spark_gap !== undefined) {
            if (!this.isPositive(edm.spark_gap)) {
                errors.push('Spark gap must be positive');
            }
            const minGap = PRISM_CONSTANTS.EDM?.SPARK_GAP_MIRROR || 0.005;
            const maxGap = PRISM_CONSTANTS.EDM?.SPARK_GAP_ROUGH || 0.05;
            if (edm.spark_gap < minGap || edm.spark_gap > maxGap * 2) {
                warnings.push('Spark gap outside typical range');
            }
        }
        
        // Validate electrode material
        if (edm.electrode_material) {
            const validMaterials = ['graphite', 'copper', 'copper_tungsten', 'tungsten'];
            if (!validMaterials.includes(edm.electrode_material.toLowerCase())) {
                warnings.push(`Unknown electrode material: ${edm.electrode_material}`);
            }
        }
        
        // Validate wire diameter for wire EDM
        if (edm.wire_diameter !== undefined) {
            if (!this.isPositive(edm.wire_diameter)) {
                errors.push('Wire diameter must be positive');
            }
            const standardDiameters = [0.1, 0.15, 0.2, 0.25, 0.3];
            if (!standardDiameters.some(d => Math.abs(edm.wire_diameter - d) < 0.01)) {
                warnings.push('Non-standard wire diameter');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: edm };
    },
    
    /**
     * Validate quote/estimate data
     */
    validateQuoteData: function(quote) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(quote)) {
            return { valid: false, errors: ['Quote data must be an object'], warnings: [] };
        }
        
        // Validate quantity
        if (quote.quantity !== undefined) {
            if (!this.isPositiveInteger(quote.quantity)) {
                errors.push('Quantity must be positive integer');
            }
        }
        
        // Validate lead time
        if (quote.lead_time !== undefined) {
            if (!this.isPositive(quote.lead_time)) {
                errors.push('Lead time must be positive');
            }
        }
        
        // Validate price
        if (quote.price !== undefined) {
            if (!this.isNonNegative(quote.price)) {
                errors.push('Price must be non-negative');
            }
        }
        
        // Validate margin
        if (quote.margin !== undefined) {
            if (!this.isInRange(quote.margin, 0, 100)) {
                warnings.push('Margin outside 0-100% range');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: quote };
    },
    
    /**
     * Validate schedule data
     */
    validateScheduleData: function(schedule) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(schedule)) {
            return { valid: false, errors: ['Schedule data must be an object'], warnings: [] };
        }
        
        // Validate start/end dates
        if (schedule.start_date) {
            const startDate = new Date(schedule.start_date);
            if (!this.isDate(startDate)) {
                errors.push('Invalid start date');
            }
        }
        
        if (schedule.end_date) {
            const endDate = new Date(schedule.end_date);
            if (!this.isDate(endDate)) {
                errors.push('Invalid end date');
            }
            if (schedule.start_date) {
                const startDate = new Date(schedule.start_date);
                if (endDate < startDate) {
                    errors.push('End date before start date');
                }
            }
        }
        
        // Validate priority
        if (schedule.priority !== undefined) {
            if (!this.isInRange(schedule.priority, 1, 10)) {
                warnings.push('Priority should be 1-10');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: schedule };
    },
    
    /**
     * Validate maintenance data
     */
    validateMaintenanceData: function(maintenance) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(maintenance)) {
            return { valid: false, errors: ['Maintenance data must be an object'], warnings: [] };
        }
        
        // Validate hours since last maintenance
        if (maintenance.hours_since_maintenance !== undefined) {
            if (!this.isNonNegative(maintenance.hours_since_maintenance)) {
                errors.push('Hours must be non-negative');
            }
            const interval = PRISM_CONSTANTS.MAINTENANCE?.SPINDLE_BEARING_CHECK || 2000;
            if (maintenance.hours_since_maintenance > interval) {
                warnings.push(`Maintenance overdue (${maintenance.hours_since_maintenance} hours > ${interval} interval)`);
            }
        }
        
        // Validate maintenance type
        if (maintenance.type) {
            const validTypes = ['preventive', 'corrective', 'predictive', 'calibration', 'cleaning', 'lubrication'];
            if (!validTypes.includes(maintenance.type.toLowerCase())) {
                warnings.push(`Unknown maintenance type: ${maintenance.type}`);
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: maintenance };
    },
    
    /**
     * Validate G-code data
     */
    validateGcodeData: function(gcode) {
        const errors = [];
        const warnings = [];
        
        if (!this.isString(gcode) && !this.isArray(gcode)) {
            return { valid: false, errors: ['G-code must be string or array'], warnings: [] };
        }
        
        const lines = this.isArray(gcode) ? gcode : gcode.split('\n');
        
        // Check for common issues
        let hasToolChange = false;
        let hasSpindleStart = false;
        let hasProgramEnd = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toString().trim().toUpperCase();
            
            if (line.match(/T\d+/)) hasToolChange = true;
            if (line.match(/M0?3|M0?4/)) hasSpindleStart = true;
            if (line.match(/M30|M0?2/)) hasProgramEnd = true;
            
            // Check for potentially dangerous rapid moves
            if (line.includes('G00') && line.includes('Z') && !line.includes('G43') && !line.includes('G49')) {
                const zMatch = line.match(/Z(-?[\d.]+)/);
                if (zMatch && parseFloat(zMatch[1]) < 0) {
                    warnings.push(`Line ${i+1}: Rapid move to negative Z without tool length comp`);
                }
            }
        }
        
        if (!hasSpindleStart && lines.length > 10) {
            warnings.push('No spindle start command (M03/M04) found');
        }
        
        if (!hasProgramEnd && lines.length > 5) {
            warnings.push('No program end (M30/M02) found');
        }
        
        return { valid: errors.length === 0, errors, warnings, lineCount: lines.length };
    },
    
    /**
     * Validate post processor data
     */
    validatePostProcessorData: function(post) {
        const errors = [];
        const warnings = [];
        
        if (!this.isObject(post)) {
            return { valid: false, errors: ['Post processor data must be an object'], warnings: [] };
        }
        
        // Validate controller type
        if (post.controller) {
            const validControllers = ['fanuc', 'siemens', 'mazak', 'haas', 'okuma', 'heidenhain', 'mitsubishi', 'fagor', 'hurco'];
            if (!validControllers.some(c => post.controller.toLowerCase().includes(c))) {
                warnings.push(`Unknown controller type: ${post.controller}`);
            }
        }
        
        // Validate decimal places
        if (post.decimal_places !== undefined) {
            if (!this.isInRange(post.decimal_places, 0, 6)) {
                warnings.push('Decimal places typically 0-6');
            }
        }
        
        // Validate line numbers
        if (post.line_numbers !== undefined) {
            if (!this.isBoolean(post.line_numbers)) {
                warnings.push('line_numbers should be boolean');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings, data: post };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 EXTENSION: ADDITIONAL CROSS-REFERENCE VALIDATORS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate operation-material compatibility
     */
    validateOperationMaterialCompatibility: function(operation, material) {
        const warnings = [];
        
        const opType = (operation.type || '').toLowerCase();
        const matClass = (material.material_class || material.type || '').toLowerCase();
        
        // Grinding ceramics/hardened materials
        if (opType.includes('grind') && material.hardness > 60) {
            // OK for grinding hard materials
        } else if (!opType.includes('grind') && material.hardness > 60) {
            warnings.push('Material hardness >60 HRC - consider grinding instead of cutting');
        }
        
        // EDM for hardened/exotic materials
        if (['titanium', 'inconel', 'tungsten', 'carbide'].includes(matClass) && 
            !opType.includes('edm') && !opType.includes('grind')) {
            warnings.push(`${matClass} may be better suited for EDM or grinding`);
        }
        
        return { valid: true, warnings };
    },
    
    /**
     * Validate tool-machine compatibility
     */
    validateToolMachineCompatibility: function(tool, machine) {
        const errors = [];
        const warnings = [];
        
        // Check taper compatibility
        if (tool.taper && machine.spindle_taper) {
            if (!tool.taper.toLowerCase().includes(machine.spindle_taper.toLowerCase())) {
                errors.push(`Tool taper (${tool.taper}) incompatible with machine (${machine.spindle_taper})`);
            }
        }
        
        // Check tool diameter vs machine capability
        if (tool.diameter > (machine.max_tool_diameter || 500)) {
            errors.push('Tool diameter exceeds machine capability');
        }
        
        // Check RPM requirement
        if (tool.recommended_rpm && machine.max_rpm) {
            if (tool.recommended_rpm > machine.max_rpm) {
                warnings.push('Tool recommended RPM exceeds machine maximum');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings };
    },
    
    /**
     * Validate coolant-material compatibility
     */
    validateCoolantMaterialCompatibility: function(coolant, material) {
        const warnings = [];
        
        const coolantType = (coolant.type || '').toLowerCase();
        const matClass = (material.material_class || '').toLowerCase();
        
        // Oil-based coolant on aluminum can cause staining
        if (coolantType.includes('oil') && matClass === 'aluminum') {
            warnings.push('Oil-based coolant may stain aluminum');
        }
        
        // Water-based on cast iron can cause rust
        if ((coolantType.includes('water') || coolantType.includes('emulsion')) && 
            matClass === 'cast_iron' && !coolant.rust_inhibitor) {
            warnings.push('Water-based coolant on cast iron - ensure rust inhibitor present');
        }
        
        // Dry machining titanium
        if (matClass === 'titanium' && coolantType === 'dry') {
            warnings.push('Titanium typically requires flood coolant');
        }
        
        return { valid: true, warnings };
    },
    
    /**
     * Validate speed-feed-DOC consistency
     */
    validateSpeedFeedDOCConsistency: function(params) {
        const errors = [];
        const warnings = [];
        
        // Check MRR is reasonable
        if (params.speed && params.feed && params.doc && params.woc) {
            const mrr = params.feed * params.doc * params.woc; // mm³/min approximation
            
            if (mrr > 500) {
                warnings.push('Very high material removal rate - verify machine capability');
            }
            if (mrr < 0.1) {
                warnings.push('Very low MRR - may not be economical');
            }
        }
        
        // Check chip load is reasonable
        if (params.fpt !== undefined) {
            if (params.fpt < 0.01) {
                warnings.push('Very low chip load may cause rubbing');
            }
            if (params.fpt > 0.5) {
                warnings.push('Very high chip load - verify tool capability');
            }
        }
        
        // Check DOC vs tool diameter ratio
        if (params.doc && params.tool_diameter) {
            const ratio = params.doc / params.tool_diameter;
            if (ratio > 1.5) {
                warnings.push('DOC > 1.5x tool diameter - may cause chatter');
            }
        }
        
        // Check stepover vs tool diameter
        if (params.woc && params.tool_diameter) {
            const ratio = params.woc / params.tool_diameter;
            if (ratio > 0.9 && params.operation !== 'slotting') {
                warnings.push('Stepover > 90% of diameter - excessive tool engagement');
            }
        }
        
        return { valid: errors.length === 0, errors, warnings };
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.2 TRUE ABSOLUTE MAXIMUM - SECTION A: Additional Safe Math Methods (13 new - no duplicates)
    // Sources: IEEE 754 floating point, numerical analysis best practices
    // Note: safeAtan2 and safeLog10 already defined above - not duplicating
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    safeAtan: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.atan(x);
    },
    
    safeTrunc: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.trunc(x);
    },
    
    safeSign: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.sign(x);
    },
    
    safeHypot: function(...args) {
        const filtered = args.filter(x => Number.isFinite(x));
        if (filtered.length === 0) return 0;
        return Math.hypot(...filtered);
    },
    
    safeCbrt: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.cbrt(x);
    },
    
    safeLog2: function(x, fallback = 0) {
        if (!Number.isFinite(x) || x <= 0) return fallback;
        return Math.log2(x);
    },
    
    safeExpm1: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        if (x > 700) return fallback; // Overflow protection
        return Math.expm1(x);
    },
    
    safeSinh: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        if (Math.abs(x) > 700) return fallback; // Overflow protection
        return Math.sinh(x);
    },
    
    safeCosh: function(x, fallback = 1) {
        if (!Number.isFinite(x)) return fallback;
        if (Math.abs(x) > 700) return fallback; // Overflow protection
        return Math.cosh(x);
    },
    
    safeTanh: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.tanh(x); // Tanh is bounded [-1, 1]
    },
    
    safeAsinh: function(x, fallback = 0) {
        if (!Number.isFinite(x)) return fallback;
        return Math.asinh(x);
    },
    
    safeAcosh: function(x, fallback = 0) {
        if (!Number.isFinite(x) || x < 1) return fallback;
        return Math.acosh(x);
    },
    
    safeAtanh: function(x, fallback = 0) {
        if (!Number.isFinite(x) || Math.abs(x) >= 1) return fallback;
        return Math.atanh(x);
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION B: Type Validators (12 new)
    // Sources: Three.js conventions, CAD/CAM data structures
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    isVector2D: function(v) {
        if (!v || typeof v !== 'object') return false;
        return Number.isFinite(v.x) && Number.isFinite(v.y);
    },
    
    isVector3D: function(v) {
        if (!v || typeof v !== 'object') return false;
        return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
    },
    
    isVector4D: function(v) {
        if (!v || typeof v !== 'object') return false;
        return Number.isFinite(v.x) && Number.isFinite(v.y) && 
               Number.isFinite(v.z) && Number.isFinite(v.w);
    },
    
    isMatrix3x3: function(m) {
        if (!Array.isArray(m) || m.length !== 3) return false;
        for (let i = 0; i < 3; i++) {
            if (!Array.isArray(m[i]) || m[i].length !== 3) return false;
            for (let j = 0; j < 3; j++) {
                if (!Number.isFinite(m[i][j])) return false;
            }
        }
        return true;
    },
    
    isMatrix4x4: function(m) {
        if (!Array.isArray(m) || m.length !== 4) return false;
        for (let i = 0; i < 4; i++) {
            if (!Array.isArray(m[i]) || m[i].length !== 4) return false;
            for (let j = 0; j < 4; j++) {
                if (!Number.isFinite(m[i][j])) return false;
            }
        }
        return true;
    },
    
    isTransformMatrix: function(m) {
        // A valid 4x4 transform matrix should have [0,0,0,1] as last row
        if (!this.isMatrix4x4(m)) return false;
        const tolerance = 1e-10;
        return Math.abs(m[3][0]) < tolerance && 
               Math.abs(m[3][1]) < tolerance && 
               Math.abs(m[3][2]) < tolerance && 
               Math.abs(m[3][3] - 1) < tolerance;
    },
    
    isBoundingBox2D: function(bbox) {
        if (!bbox || typeof bbox !== 'object') return false;
        if (bbox.min && bbox.max) {
            return this.isVector2D(bbox.min) && this.isVector2D(bbox.max) &&
                   bbox.min.x <= bbox.max.x && bbox.min.y <= bbox.max.y;
        }
        return false;
    },
    
    isBoundingBox3D: function(bbox) {
        if (!bbox || typeof bbox !== 'object') return false;
        if (bbox.min && bbox.max) {
            return this.isVector3D(bbox.min) && this.isVector3D(bbox.max) &&
                   bbox.min.x <= bbox.max.x && bbox.min.y <= bbox.max.y && bbox.min.z <= bbox.max.z;
        }
        return false;
    },
    
    isColorRGB: function(c) {
        if (!c || typeof c !== 'object') return false;
        const inRange = (v) => Number.isFinite(v) && v >= 0 && v <= 255;
        return inRange(c.r) && inRange(c.g) && inRange(c.b);
    },
    
    isColorHex: function(hex) {
        if (typeof hex !== 'string') return false;
        return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex);
    },
    
    isColorHSL: function(c) {
        if (!c || typeof c !== 'object') return false;
        return Number.isFinite(c.h) && c.h >= 0 && c.h <= 360 &&
               Number.isFinite(c.s) && c.s >= 0 && c.s <= 100 &&
               Number.isFinite(c.l) && c.l >= 0 && c.l <= 100;
    },
    
    isUnitVector: function(v, tolerance = 1e-6) {
        if (!this.isVector3D(v)) return false;
        const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return Math.abs(magnitude - 1) < tolerance;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION C: Geometry Validators (10 new)
    // Sources: NURBS Book (Piegl/Tiller), CAD kernel standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    validateNURBSCurve: function(curve) {
        const errors = [];
        
        if (!curve) { return { valid: false, errors: ['Curve is null/undefined'] }; }
        
        // Check degree
        if (!Number.isInteger(curve.degree) || curve.degree < 1 || curve.degree > 9) {
            errors.push('Degree must be integer 1-9');
        }
        
        // Check control points
        if (!Array.isArray(curve.controlPoints) || curve.controlPoints.length < 2) {
            errors.push('Control points must be array with at least 2 points');
        } else {
            curve.controlPoints.forEach((p, i) => {
                if (!this.isVector3D(p) && !this.isVector4D(p)) {
                    errors.push(`Control point ${i} is invalid`);
                }
            });
        }
        
        // Check knot vector
        if (curve.knots) {
            if (!Array.isArray(curve.knots)) {
                errors.push('Knots must be an array');
            } else {
                const n = (curve.controlPoints?.length || 0);
                const p = curve.degree || 3;
                const expectedKnots = n + p + 1;
                if (curve.knots.length !== expectedKnots) {
                    errors.push(`Knot vector length ${curve.knots.length} != expected ${expectedKnots}`);
                }
                // Check knot vector is non-decreasing
                for (let i = 1; i < curve.knots.length; i++) {
                    if (curve.knots[i] < curve.knots[i-1]) {
                        errors.push('Knot vector must be non-decreasing');
                        break;
                    }
                }
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateNURBSSurface: function(surface) {
        const errors = [];
        
        if (!surface) { return { valid: false, errors: ['Surface is null/undefined'] }; }
        
        // Check degrees
        if (!Number.isInteger(surface.degreeU) || surface.degreeU < 1) errors.push('Invalid degreeU');
        if (!Number.isInteger(surface.degreeV) || surface.degreeV < 1) errors.push('Invalid degreeV');
        
        // Check control point grid
        if (!Array.isArray(surface.controlPoints) || surface.controlPoints.length < 2) {
            errors.push('Control points must be 2D array');
        } else {
            const numU = surface.controlPoints.length;
            const numV = surface.controlPoints[0]?.length || 0;
            for (let i = 0; i < numU; i++) {
                if (!Array.isArray(surface.controlPoints[i]) || 
                    surface.controlPoints[i].length !== numV) {
                    errors.push(`Control point row ${i} has inconsistent length`);
                }
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateMesh: function(mesh) {
        const errors = [];
        
        if (!mesh) { return { valid: false, errors: ['Mesh is null/undefined'] }; }
        
        // Check vertices
        if (!Array.isArray(mesh.vertices) || mesh.vertices.length < 3) {
            errors.push('Mesh must have at least 3 vertices');
        }
        
        // Check faces
        if (!Array.isArray(mesh.faces) || mesh.faces.length < 1) {
            errors.push('Mesh must have at least 1 face');
        } else {
            const numVerts = mesh.vertices?.length || 0;
            mesh.faces.forEach((f, i) => {
                if (!Array.isArray(f) || f.length < 3) {
                    errors.push(`Face ${i} must have at least 3 vertex indices`);
                } else {
                    f.forEach((idx, j) => {
                        if (!Number.isInteger(idx) || idx < 0 || idx >= numVerts) {
                            errors.push(`Face ${i} has invalid vertex index at position ${j}`);
                        }
                    });
                }
            });
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateTriangle: function(tri) {
        const errors = [];
        
        if (!tri) { return { valid: false, errors: ['Triangle is null/undefined'] }; }
        
        // Check 3 vertices
        if (!Array.isArray(tri.vertices) || tri.vertices.length !== 3) {
            errors.push('Triangle must have exactly 3 vertices');
        } else {
            tri.vertices.forEach((v, i) => {
                if (!this.isVector3D(v)) errors.push(`Vertex ${i} is not valid 3D point`);
            });
            
            // Check for degenerate triangle (zero area)
            if (errors.length === 0) {
                const v0 = tri.vertices[0], v1 = tri.vertices[1], v2 = tri.vertices[2];
                const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
                const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
                const cross = {
                    x: e1.y * e2.z - e1.z * e2.y,
                    y: e1.z * e2.x - e1.x * e2.z,
                    z: e1.x * e2.y - e1.y * e2.x
                };
                const area = Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z) / 2;
                if (area < 1e-12) errors.push('Degenerate triangle (zero area)');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateSTL: function(stl) {
        const errors = [];
        
        if (!stl) { return { valid: false, errors: ['STL is null/undefined'] }; }
        
        if (!Array.isArray(stl.triangles)) {
            errors.push('STL must have triangles array');
        } else {
            stl.triangles.forEach((tri, i) => {
                const triResult = this.validateTriangle(tri);
                if (!triResult.valid) {
                    errors.push(`Triangle ${i}: ${triResult.errors.join(', ')}`);
                }
            });
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateArc: function(arc) {
        const errors = [];
        
        if (!arc) { return { valid: false, errors: ['Arc is null/undefined'] }; }
        
        // Check center
        if (!this.isVector3D(arc.center) && !this.isVector2D(arc.center)) {
            errors.push('Arc must have valid center point');
        }
        
        // Check radius
        if (!Number.isFinite(arc.radius) || arc.radius <= 0) {
            errors.push('Arc must have positive radius');
        }
        
        // Check angles
        if (arc.startAngle !== undefined && !Number.isFinite(arc.startAngle)) {
            errors.push('Start angle must be finite');
        }
        if (arc.endAngle !== undefined && !Number.isFinite(arc.endAngle)) {
            errors.push('End angle must be finite');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateCircle: function(circle) {
        const errors = [];
        
        if (!circle) { return { valid: false, errors: ['Circle is null/undefined'] }; }
        
        if (!this.isVector3D(circle.center) && !this.isVector2D(circle.center)) {
            errors.push('Circle must have valid center');
        }
        
        if (!Number.isFinite(circle.radius) || circle.radius <= 0) {
            errors.push('Circle must have positive radius');
        }
        
        if (circle.normal && !this.isVector3D(circle.normal)) {
            errors.push('Circle normal must be valid 3D vector');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateLine: function(line) {
        const errors = [];
        
        if (!line) { return { valid: false, errors: ['Line is null/undefined'] }; }
        
        if (line.start && line.end) {
            if (!this.isVector3D(line.start) && !this.isVector2D(line.start)) {
                errors.push('Line start must be valid point');
            }
            if (!this.isVector3D(line.end) && !this.isVector2D(line.end)) {
                errors.push('Line end must be valid point');
            }
        } else if (line.point && line.direction) {
            if (!this.isVector3D(line.point)) errors.push('Line point must be valid 3D point');
            if (!this.isVector3D(line.direction)) errors.push('Line direction must be valid 3D vector');
        } else {
            errors.push('Line must have start/end or point/direction');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validatePlane: function(plane) {
        const errors = [];
        
        if (!plane) { return { valid: false, errors: ['Plane is null/undefined'] }; }
        
        if (plane.point && plane.normal) {
            if (!this.isVector3D(plane.point)) errors.push('Plane point must be valid 3D point');
            if (!this.isVector3D(plane.normal)) errors.push('Plane normal must be valid 3D vector');
        } else if (plane.a !== undefined && plane.b !== undefined && 
                   plane.c !== undefined && plane.d !== undefined) {
            // Ax + By + Cz + D = 0 form
            if (!Number.isFinite(plane.a) || !Number.isFinite(plane.b) ||
                !Number.isFinite(plane.c) || !Number.isFinite(plane.d)) {
                errors.push('Plane coefficients must be finite');
            }
            // Normal should be non-zero
            const len = Math.sqrt(plane.a*plane.a + plane.b*plane.b + plane.c*plane.c);
            if (len < 1e-12) errors.push('Plane normal cannot be zero');
        } else {
            errors.push('Plane must have point/normal or a/b/c/d coefficients');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateSphere: function(sphere) {
        const errors = [];
        
        if (!sphere) { return { valid: false, errors: ['Sphere is null/undefined'] }; }
        
        if (!this.isVector3D(sphere.center)) {
            errors.push('Sphere must have valid 3D center');
        }
        
        if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) {
            errors.push('Sphere must have positive radius');
        }
        
        return { valid: errors.length === 0, errors };
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION D: Additional Manufacturing Validators (8 new)
    // Sources: Machine tool standards, PRISM manufacturing requirements
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    validateSpindleParams: function(params) {
        const errors = [];
        const limits = PRISM_CONSTANTS.LIMITS;
        const spindle = PRISM_CONSTANTS.SPINDLE;
        
        if (params.rpm !== undefined) {
            if (!Number.isFinite(params.rpm) || params.rpm < limits.MIN_RPM || params.rpm > limits.MAX_RPM) {
                errors.push(`RPM ${params.rpm} outside limits [${limits.MIN_RPM}, ${limits.MAX_RPM}]`);
            }
        }
        
        if (params.power !== undefined) {
            if (!Number.isFinite(params.power) || params.power < 0 || params.power > limits.MAX_POWER) {
                errors.push(`Power ${params.power} outside limits [0, ${limits.MAX_POWER}]`);
            }
        }
        
        if (params.torque !== undefined) {
            if (!Number.isFinite(params.torque) || params.torque < 0 || params.torque > limits.MAX_TORQUE) {
                errors.push(`Torque ${params.torque} outside limits [0, ${limits.MAX_TORQUE}]`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateForceComponents: function(forces) {
        const errors = [];
        const maxForce = PRISM_CONSTANTS.LIMITS.MAX_FORCE;
        
        if (!forces || typeof forces !== 'object') {
            return { valid: false, errors: ['Forces must be an object'] };
        }
        
        ['Fc', 'Ff', 'Fr', 'Fx', 'Fy', 'Fz'].forEach(comp => {
            if (forces[comp] !== undefined) {
                if (!Number.isFinite(forces[comp])) {
                    errors.push(`Force component ${comp} must be finite`);
                } else if (Math.abs(forces[comp]) > maxForce) {
                    errors.push(`Force component ${comp} exceeds maximum ${maxForce}N`);
                }
            }
        });
        
        return { valid: errors.length === 0, errors };
    },
    
    validateTemperature: function(temp, unit = 'C') {
        const errors = [];
        
        if (!Number.isFinite(temp)) {
            return { valid: false, errors: ['Temperature must be finite number'] };
        }
        
        // Absolute zero check
        const absZero = unit === 'K' ? 0 : (unit === 'C' ? -273.15 : -459.67);
        if (temp < absZero) {
            errors.push(`Temperature ${temp}${unit} below absolute zero`);
        }
        
        // Maximum cutting temperature
        const maxCutting = PRISM_CONSTANTS.LIMITS.MAX_TEMPERATURE;
        const maxInUnit = unit === 'K' ? maxCutting + 273.15 : 
                         (unit === 'F' ? maxCutting * 9/5 + 32 : maxCutting);
        if (temp > maxInUnit) {
            errors.push(`Temperature ${temp}${unit} exceeds maximum cutting temperature`);
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateSurfaceFinish: function(params) {
        const errors = [];
        const sf = PRISM_CONSTANTS.SURFACE_FINISH;
        
        if (params.Ra !== undefined) {
            if (!Number.isFinite(params.Ra) || params.Ra < 0) {
                errors.push('Ra must be non-negative number');
            } else if (params.Ra > sf.RA_AS_CAST) {
                errors.push(`Ra ${params.Ra} exceeds typical maximum`);
            }
        }
        
        if (params.Rz !== undefined) {
            if (!Number.isFinite(params.Rz) || params.Rz < 0) {
                errors.push('Rz must be non-negative number');
            }
        }
        
        // Rz should typically be 4-7x Ra
        if (params.Ra && params.Rz) {
            const ratio = params.Rz / params.Ra;
            if (ratio < 2 || ratio > 10) {
                errors.push(`Rz/Ra ratio ${ratio.toFixed(1)} outside typical range 4-7`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateTolerance: function(tol) {
        const errors = [];
        
        if (!tol || typeof tol !== 'object') {
            return { valid: false, errors: ['Tolerance must be an object'] };
        }
        
        // Check plus/minus tolerance
        if (tol.plus !== undefined && tol.minus !== undefined) {
            if (!Number.isFinite(tol.plus) || tol.plus < 0) {
                errors.push('Plus tolerance must be non-negative');
            }
            if (!Number.isFinite(tol.minus) || tol.minus > 0) {
                errors.push('Minus tolerance must be non-positive');
            }
        }
        
        // Check symmetric tolerance
        if (tol.symmetric !== undefined) {
            if (!Number.isFinite(tol.symmetric) || tol.symmetric < 0) {
                errors.push('Symmetric tolerance must be non-negative');
            }
        }
        
        // Check ISO tolerance grade
        if (tol.grade !== undefined) {
            if (!Number.isInteger(tol.grade) || tol.grade < 1 || tol.grade > 18) {
                errors.push('ISO tolerance grade must be 1-18');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateFilePath: function(path) {
        const errors = [];
        
        if (typeof path !== 'string') {
            return { valid: false, errors: ['Path must be a string'] };
        }
        
        if (path.length === 0) {
            errors.push('Path cannot be empty');
        }
        
        // Check for dangerous characters
        const dangerous = /[\x00-\x1f<>:"|?*]/;
        if (dangerous.test(path)) {
            errors.push('Path contains invalid characters');
        }
        
        // Check for path traversal
        if (path.includes('..')) {
            errors.push('Path traversal (..) not allowed');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateGCodeLine: function(line) {
        const errors = [];
        
        if (typeof line !== 'string') {
            return { valid: false, errors: ['G-code line must be a string'] };
        }
        
        const trimmed = line.trim();
        if (trimmed.length === 0) {
            return { valid: true, errors: [] }; // Empty lines are valid
        }
        
        // Check for valid G-code structure
        const gcodePattern = /^[NGMXYZIJKFSTPLQRHDEABC\d\.\-\s\(\)]+$/i;
        if (!gcodePattern.test(trimmed)) {
            errors.push('Line contains invalid G-code characters');
        }
        
        // Check for balanced parentheses (comments)
        let parenCount = 0;
        for (const char of trimmed) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) {
                errors.push('Unbalanced parentheses');
                break;
            }
        }
        if (parenCount !== 0) {
            errors.push('Unclosed comment parenthesis');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateMillingParams: function(params) {
        const errors = [];
        const milling = PRISM_CONSTANTS.MILLING;
        
        if (params.helixAngle !== undefined) {
            if (!Number.isFinite(params.helixAngle) || params.helixAngle < 0 || params.helixAngle > 60) {
                errors.push('Helix angle must be 0-60 degrees');
            }
        }
        
        if (params.stepover !== undefined) {
            if (!Number.isFinite(params.stepover) || params.stepover <= 0 || params.stepover > 1) {
                errors.push('Stepover must be 0-100% (0-1)');
            }
        }
        
        if (params.rampAngle !== undefined) {
            if (!Number.isFinite(params.rampAngle) || params.rampAngle < 0 || params.rampAngle > 45) {
                errors.push('Ramp angle must be 0-45 degrees');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION E: Array/Collection Validators (8 new)
    // Sources: JavaScript best practices, data validation patterns
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    isArrayOfNumbers: function(arr) {
        if (!Array.isArray(arr)) return false;
        return arr.every(x => typeof x === 'number' && Number.isFinite(x));
    },
    
    isArrayOfStrings: function(arr) {
        if (!Array.isArray(arr)) return false;
        return arr.every(x => typeof x === 'string');
    },
    
    isArrayOfVectors3D: function(arr) {
        if (!Array.isArray(arr)) return false;
        return arr.every(v => this.isVector3D(v));
    },
    
    isArrayOfPoints: function(arr, dimension = 3) {
        if (!Array.isArray(arr)) return false;
        if (dimension === 2) return arr.every(p => this.isVector2D(p));
        if (dimension === 3) return arr.every(p => this.isVector3D(p));
        return false;
    },
    
    isTypedArray: function(arr) {
        return arr instanceof Float32Array || arr instanceof Float64Array ||
               arr instanceof Int8Array || arr instanceof Int16Array ||
               arr instanceof Int32Array || arr instanceof Uint8Array ||
               arr instanceof Uint16Array || arr instanceof Uint32Array;
    },
    
    hasMinLength: function(arr, min) {
        return Array.isArray(arr) && arr.length >= min;
    },
    
    hasMaxLength: function(arr, max) {
        return Array.isArray(arr) && arr.length <= max;
    },
    
    isUnique: function(arr) {
        if (!Array.isArray(arr)) return false;
        return new Set(arr).size === arr.length;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION F: Format Validators (6 new)
    // Sources: RFC standards, industry formats
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    validateJSON: function(str) {
        if (typeof str !== 'string') {
            return { valid: false, errors: ['Input must be string'] };
        }
        try {
            JSON.parse(str);
            return { valid: true, errors: [] };
        } catch (e) {
            return { valid: false, errors: [e.message] };
        }
    },
    
    validateDateISO: function(dateStr) {
        const errors = [];
        
        if (typeof dateStr !== 'string') {
            return { valid: false, errors: ['Date must be string'] };
        }
        
        // ISO 8601 pattern
        const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
        if (!isoPattern.test(dateStr)) {
            errors.push('Date does not match ISO 8601 format');
        } else {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                errors.push('Invalid date value');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateUUID: function(uuid) {
        if (typeof uuid !== 'string') {
            return { valid: false, errors: ['UUID must be string'] };
        }
        
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(uuid)) {
            return { valid: false, errors: ['Invalid UUID format'] };
        }
        
        return { valid: true, errors: [] };
    },
    
    validateVersion: function(version) {
        if (typeof version !== 'string') {
            return { valid: false, errors: ['Version must be string'] };
        }
        
        // Semantic versioning pattern
        const semverPattern = /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+)?$/;
        if (!semverPattern.test(version)) {
            return { valid: false, errors: ['Invalid semantic version format'] };
        }
        
        return { valid: true, errors: [] };
    },
    
    validateRegex: function(pattern) {
        if (typeof pattern !== 'string') {
            return { valid: false, errors: ['Pattern must be string'] };
        }
        
        try {
            new RegExp(pattern);
            return { valid: true, errors: [] };
        } catch (e) {
            return { valid: false, errors: ['Invalid regex: ' + e.message] };
        }
    },
    
    validateXMLBasic: function(xml) {
        const errors = [];
        
        if (typeof xml !== 'string') {
            return { valid: false, errors: ['XML must be string'] };
        }
        
        // Basic XML well-formedness checks
        // Check for unbalanced tags (simplified)
        const tagStack = [];
        const tagPattern = /<\/?([a-zA-Z_][a-zA-Z0-9_\-.:]*)[^>]*\/?>/g;
        let match;
        
        while ((match = tagPattern.exec(xml)) !== null) {
            const fullTag = match[0];
            const tagName = match[1];
            
            if (fullTag.startsWith('</')) {
                // Closing tag
                if (tagStack.length === 0 || tagStack.pop() !== tagName) {
                    errors.push(`Unmatched closing tag: ${tagName}`);
                }
            } else if (!fullTag.endsWith('/>')) {
                // Opening tag (not self-closing)
                tagStack.push(tagName);
            }
        }
        
        if (tagStack.length > 0) {
            errors.push(`Unclosed tags: ${tagStack.join(', ')}`);
        }
        
        return { valid: errors.length === 0, errors };
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION G: Advanced Domain Validators (15 new) - TRUE ABSOLUTE MAXIMUM
    // Sources: PRISM codebase analysis, CNC machine specifications, CAM standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    validateAxisConfig: function(axis) {
        const errors = [];
        
        if (!axis || typeof axis !== 'object') {
            return { valid: false, errors: ['Axis config must be an object'] };
        }
        
        // Check axis name
        const validAxes = ['X', 'Y', 'Z', 'A', 'B', 'C', 'U', 'V', 'W'];
        if (axis.name && !validAxes.includes(axis.name.toUpperCase())) {
            errors.push(`Invalid axis name: ${axis.name}. Valid: ${validAxes.join(', ')}`);
        }
        
        // Check travel limits
        if (axis.minTravel !== undefined && axis.maxTravel !== undefined) {
            if (!Number.isFinite(axis.minTravel) || !Number.isFinite(axis.maxTravel)) {
                errors.push('Travel limits must be finite numbers');
            } else if (axis.minTravel >= axis.maxTravel) {
                errors.push('Min travel must be less than max travel');
            }
        }
        
        // Check rapid rate
        if (axis.rapidRate !== undefined) {
            if (!Number.isFinite(axis.rapidRate) || axis.rapidRate <= 0) {
                errors.push('Rapid rate must be positive number');
            }
        }
        
        // Check acceleration
        if (axis.acceleration !== undefined) {
            if (!Number.isFinite(axis.acceleration) || axis.acceleration <= 0) {
                errors.push('Acceleration must be positive number');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validatePocketOperation: function(pocket) {
        const errors = [];
        
        if (!pocket || typeof pocket !== 'object') {
            return { valid: false, errors: ['Pocket operation must be an object'] };
        }
        
        // Check boundary
        if (!pocket.boundary && !pocket.contour) {
            errors.push('Pocket must have boundary or contour');
        }
        
        // Check depth
        if (pocket.depth !== undefined) {
            if (!Number.isFinite(pocket.depth) || pocket.depth <= 0) {
                errors.push('Pocket depth must be positive number');
            }
        }
        
        // Check stepdown
        if (pocket.stepdown !== undefined) {
            if (!Number.isFinite(pocket.stepdown) || pocket.stepdown <= 0) {
                errors.push('Stepdown must be positive number');
            }
            if (pocket.depth && pocket.stepdown > pocket.depth) {
                errors.push('Stepdown cannot exceed total depth');
            }
        }
        
        // Check stepover
        if (pocket.stepover !== undefined) {
            if (!Number.isFinite(pocket.stepover) || pocket.stepover <= 0 || pocket.stepover > 1) {
                errors.push('Stepover must be between 0 and 1 (0-100%)');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateContourOperation: function(contour) {
        const errors = [];
        
        if (!contour || typeof contour !== 'object') {
            return { valid: false, errors: ['Contour operation must be an object'] };
        }
        
        // Check geometry
        if (!contour.geometry && !contour.curves && !contour.points) {
            errors.push('Contour must have geometry, curves, or points');
        }
        
        // Check side
        const validSides = ['left', 'right', 'on', 'inside', 'outside'];
        if (contour.side && !validSides.includes(contour.side.toLowerCase())) {
            errors.push(`Invalid side: ${contour.side}. Valid: ${validSides.join(', ')}`);
        }
        
        // Check compensation
        if (contour.compensation !== undefined) {
            if (!Number.isFinite(contour.compensation)) {
                errors.push('Compensation must be a number');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateKinematicsConfig: function(kinematics) {
        const errors = [];
        
        if (!kinematics || typeof kinematics !== 'object') {
            return { valid: false, errors: ['Kinematics config must be an object'] };
        }
        
        // Check type
        const validTypes = ['cartesian', 'polar', 'cylindrical', '5axis_table_table', 
                          '5axis_head_head', '5axis_head_table', 'robot'];
        if (kinematics.type && !validTypes.includes(kinematics.type.toLowerCase())) {
            errors.push(`Invalid kinematics type: ${kinematics.type}`);
        }
        
        // Check axes array
        if (kinematics.axes) {
            if (!Array.isArray(kinematics.axes)) {
                errors.push('Axes must be an array');
            } else {
                kinematics.axes.forEach((axis, i) => {
                    const result = this.validateAxisConfig(axis);
                    if (!result.valid) {
                        errors.push(`Axis ${i}: ${result.errors.join(', ')}`);
                    }
                });
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateSimulationParams: function(sim) {
        const errors = [];
        
        if (!sim || typeof sim !== 'object') {
            return { valid: false, errors: ['Simulation params must be an object'] };
        }
        
        // Check resolution
        if (sim.resolution !== undefined) {
            if (!Number.isFinite(sim.resolution) || sim.resolution <= 0) {
                errors.push('Resolution must be positive number');
            }
        }
        
        // Check time step
        if (sim.timeStep !== undefined) {
            if (!Number.isFinite(sim.timeStep) || sim.timeStep <= 0) {
                errors.push('Time step must be positive number');
            }
        }
        
        // Check collision tolerance
        if (sim.collisionTolerance !== undefined) {
            if (!Number.isFinite(sim.collisionTolerance) || sim.collisionTolerance < 0) {
                errors.push('Collision tolerance must be non-negative');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateLaserData: function(laser) {
        const errors = [];
        const laserConst = PRISM_CONSTANTS.LASER;
        
        if (!laser || typeof laser !== 'object') {
            return { valid: false, errors: ['Laser data must be an object'] };
        }
        
        // Check power
        if (laser.power !== undefined) {
            if (!Number.isFinite(laser.power) || laser.power < 0) {
                errors.push('Laser power must be non-negative');
            }
            if (laser.power > laserConst.POWER_ULTRA) {
                errors.push(`Power ${laser.power}W exceeds typical maximum ${laserConst.POWER_ULTRA}W`);
            }
        }
        
        // Check type
        const validTypes = [laserConst.TYPE_CO2, laserConst.TYPE_FIBER, 
                          laserConst.TYPE_DISC, laserConst.TYPE_DIODE];
        if (laser.type && !validTypes.includes(laser.type)) {
            errors.push(`Invalid laser type: ${laser.type}`);
        }
        
        // Check focus
        if (laser.focusPosition !== undefined) {
            if (!Number.isFinite(laser.focusPosition)) {
                errors.push('Focus position must be a number');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateWaterjetData: function(waterjet) {
        const errors = [];
        const wjConst = PRISM_CONSTANTS.WATERJET;
        
        if (!waterjet || typeof waterjet !== 'object') {
            return { valid: false, errors: ['Waterjet data must be an object'] };
        }
        
        // Check pressure
        if (waterjet.pressure !== undefined) {
            if (!Number.isFinite(waterjet.pressure) || waterjet.pressure <= 0) {
                errors.push('Pressure must be positive number');
            }
            if (waterjet.pressure > wjConst.PRESSURE_ULTRA) {
                errors.push(`Pressure ${waterjet.pressure}MPa exceeds maximum ${wjConst.PRESSURE_ULTRA}MPa`);
            }
        }
        
        // Check abrasive flow
        if (waterjet.abrasiveFlow !== undefined) {
            if (!Number.isFinite(waterjet.abrasiveFlow) || waterjet.abrasiveFlow < 0) {
                errors.push('Abrasive flow must be non-negative');
            }
        }
        
        // Check quality level
        if (waterjet.quality !== undefined) {
            if (!Number.isInteger(waterjet.quality) || waterjet.quality < 1 || waterjet.quality > 5) {
                errors.push('Quality level must be 1-5');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateTrochoidalParams: function(trochoidal) {
        const errors = [];
        
        if (!trochoidal || typeof trochoidal !== 'object') {
            return { valid: false, errors: ['Trochoidal params must be an object'] };
        }
        
        // Check stepover
        if (trochoidal.stepover !== undefined) {
            if (!Number.isFinite(trochoidal.stepover) || trochoidal.stepover <= 0 || trochoidal.stepover > 0.5) {
                errors.push('Trochoidal stepover should be 0-50% (0-0.5)');
            }
        }
        
        // Check max engagement
        if (trochoidal.maxEngagement !== undefined) {
            if (!Number.isFinite(trochoidal.maxEngagement) || trochoidal.maxEngagement <= 0 || trochoidal.maxEngagement > 1) {
                errors.push('Max engagement should be 0-100% (0-1)');
            }
        }
        
        // Check arc radius
        if (trochoidal.arcRadius !== undefined) {
            if (!Number.isFinite(trochoidal.arcRadius) || trochoidal.arcRadius <= 0) {
                errors.push('Arc radius must be positive');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateInterpolationMode: function(mode) {
        const errors = [];
        
        if (typeof mode === 'string') {
            const validModes = ['linear', 'circular_cw', 'circular_ccw', 'helical', 
                              'spline', 'nurbs', 'polynomial', 'rapid'];
            if (!validModes.includes(mode.toLowerCase())) {
                errors.push(`Invalid interpolation mode: ${mode}. Valid: ${validModes.join(', ')}`);
            }
        } else if (typeof mode === 'object' && mode !== null) {
            if (!mode.type) {
                errors.push('Interpolation mode object must have type property');
            }
        } else {
            errors.push('Interpolation mode must be string or object');
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateEulerAngles: function(euler) {
        const errors = [];
        
        if (!euler || typeof euler !== 'object') {
            return { valid: false, errors: ['Euler angles must be an object'] };
        }
        
        // Check angles
        ['x', 'y', 'z', 'roll', 'pitch', 'yaw', 'alpha', 'beta', 'gamma'].forEach(prop => {
            if (euler[prop] !== undefined) {
                if (!Number.isFinite(euler[prop])) {
                    errors.push(`Euler angle ${prop} must be a finite number`);
                }
            }
        });
        
        // Check order if specified
        if (euler.order) {
            const validOrders = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'];
            if (!validOrders.includes(euler.order.toUpperCase())) {
                errors.push(`Invalid Euler order: ${euler.order}. Valid: ${validOrders.join(', ')}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateProbeData: function(probe) {
        const errors = [];
        
        if (!probe || typeof probe !== 'object') {
            return { valid: false, errors: ['Probe data must be an object'] };
        }
        
        // Check probe type
        const validTypes = ['touch', 'laser', 'vision', 'tool_setter'];
        if (probe.type && !validTypes.includes(probe.type.toLowerCase())) {
            errors.push(`Invalid probe type: ${probe.type}`);
        }
        
        // Check calibration data
        if (probe.calibration) {
            if (probe.calibration.diameter !== undefined && 
                (!Number.isFinite(probe.calibration.diameter) || probe.calibration.diameter <= 0)) {
                errors.push('Probe diameter must be positive');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateToolChangeData: function(toolChange) {
        const errors = [];
        
        if (!toolChange || typeof toolChange !== 'object') {
            return { valid: false, errors: ['Tool change data must be an object'] };
        }
        
        // Check tool number
        if (toolChange.toolNumber !== undefined) {
            if (!Number.isInteger(toolChange.toolNumber) || toolChange.toolNumber < 0) {
                errors.push('Tool number must be non-negative integer');
            }
        }
        
        // Check change position
        if (toolChange.position) {
            if (!this.isVector3D(toolChange.position)) {
                errors.push('Tool change position must be valid 3D point');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateWorkOffsetData: function(offset) {
        const errors = [];
        
        if (!offset || typeof offset !== 'object') {
            return { valid: false, errors: ['Work offset data must be an object'] };
        }
        
        // Check offset number (G54-G59, etc.)
        if (offset.number !== undefined) {
            if (!Number.isInteger(offset.number) || offset.number < 1 || offset.number > 99) {
                errors.push('Work offset number must be 1-99');
            }
        }
        
        // Check coordinates
        ['x', 'y', 'z', 'a', 'b', 'c'].forEach(axis => {
            if (offset[axis] !== undefined) {
                if (!Number.isFinite(offset[axis])) {
                    errors.push(`Work offset ${axis.toUpperCase()} must be finite number`);
                }
            }
        });
        
        return { valid: errors.length === 0, errors };
    },
    
    validateMacroData: function(macro) {
        const errors = [];
        
        if (!macro || typeof macro !== 'object') {
            return { valid: false, errors: ['Macro data must be an object'] };
        }
        
        // Check macro number
        if (macro.number !== undefined) {
            if (!Number.isInteger(macro.number)) {
                errors.push('Macro number must be integer');
            }
        }
        
        // Check variables
        if (macro.variables) {
            if (!Array.isArray(macro.variables) && typeof macro.variables !== 'object') {
                errors.push('Macro variables must be array or object');
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateSubprogramData: function(subprogram) {
        const errors = [];
        
        if (!subprogram || typeof subprogram !== 'object') {
            return { valid: false, errors: ['Subprogram data must be an object'] };
        }
        
        // Check program number
        if (subprogram.number !== undefined) {
            if (!Number.isInteger(subprogram.number) || subprogram.number < 0) {
                errors.push('Subprogram number must be non-negative integer');
            }
        }
        
        // Check repeat count
        if (subprogram.repeatCount !== undefined) {
            if (!Number.isInteger(subprogram.repeatCount) || subprogram.repeatCount < 1) {
                errors.push('Repeat count must be positive integer');
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
}