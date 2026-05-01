const PRISM_COMPARE = {
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.3: PRISM_COMPARE - ABSOLUTE MAXIMUM IMPLEMENTATION
    // Float-safe comparisons for ALL numeric types with full PRISM_CONSTANTS integration
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 1: CORE SCALAR COMPARISONS
    // Basic float-safe comparison operations
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two values are equal within tolerance
     * @param {number} a - First value
     * @param {number} b - Second value
     * @param {number} tolerance - Comparison tolerance (default: POSITION)
     * @returns {boolean} True if values are within tolerance
     */
    equal: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return Math.abs(a - b) < tolerance;
    },
    
    // Alias for roadmap compliance
    isEqual: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.equal(a, b, tolerance);
    },
    
    /**
     * Check if a is less than b (accounting for tolerance)
     */
    lessThan: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return a < b - tolerance;
    },
    
    isLessThan: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.lessThan(a, b, tolerance);
    },
    
    /**
     * Check if a is greater than b (accounting for tolerance)
     */
    greaterThan: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return a > b + tolerance;
    },
    
    isGreaterThan: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.greaterThan(a, b, tolerance);
    },
    
    /**
     * Check if a is less than or equal to b (accounting for tolerance)
     */
    lessOrEqual: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return a < b + tolerance;
    },
    
    isLessOrEqual: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.lessOrEqual(a, b, tolerance);
    },
    
    /**
     * Check if a is greater than or equal to b (accounting for tolerance)
     */
    greaterOrEqual: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return a > b - tolerance;
    },
    
    isGreaterOrEqual: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.greaterOrEqual(a, b, tolerance);
    },
    
    /**
     * Check if value is effectively zero
     */
    isZero: function(value, tolerance = PRISM_CONSTANTS.TOLERANCE.ZERO) {
        if (!Number.isFinite(value)) return false;
        return Math.abs(value) < tolerance;
    },
    
    /**
     * Get comparison result: -1 (less), 0 (equal), 1 (greater)
     */
    compare: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
        if (this.equal(a, b, tolerance)) return 0;
        return a < b ? -1 : 1;
    },
    
    /**
     * Get sign of value: -1 (negative), 0 (zero), 1 (positive)
     */
    sign: function(value, tolerance = PRISM_CONSTANTS.TOLERANCE.ZERO) {
        if (!Number.isFinite(value)) return NaN;
        if (this.isZero(value, tolerance)) return 0;
        return value < 0 ? -1 : 1;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 2: SPECIALIZED SCALAR COMPARISONS
    // Advanced comparison with percentages, ranges, and uncertainty
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if value is near target within percent tolerance
     * @param {number} value - Value to check
     * @param {number} target - Target value
     * @param {number} percentTolerance - Tolerance as percentage (e.g., 5 for 5%)
     * @returns {boolean} True if within percentage tolerance
     */
    isNear: function(value, target, percentTolerance = 5) {
        if (!Number.isFinite(value) || !Number.isFinite(target)) return false;
        if (this.isZero(target)) {
            // For zero target, use absolute tolerance based on percent of value
            return Math.abs(value) < Math.abs(percentTolerance / 100);
        }
        const percentDiff = Math.abs((value - target) / target) * 100;
        return percentDiff < percentTolerance;
    },
    
    /**
     * Check if value is within range [min, max] with tolerance
     * @param {number} value - Value to check
     * @param {number} min - Minimum of range
     * @param {number} max - Maximum of range
     * @param {number} tolerance - Tolerance for boundary comparison
     * @returns {boolean} True if within range (inclusive with tolerance)
     */
    isWithinRange: function(value, min, max, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return false;
        return this.greaterOrEqual(value, min, tolerance) && this.lessOrEqual(value, max, tolerance);
    },
    
    /**
     * Compare values with uncertainty/error bars
     * Determines if ranges overlap (statistically indistinguishable)
     * @param {number} a - First value
     * @param {number} aUncertainty - Uncertainty of first value (±)
     * @param {number} b - Second value
     * @param {number} bUncertainty - Uncertainty of second value (±)
     * @returns {object} { equal: boolean, aLower: boolean, aHigher: boolean, overlap: number }
     */
    compareWithUncertainty: function(a, aUncertainty, b, bUncertainty) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            return { equal: false, aLower: false, aHigher: false, overlap: 0, valid: false };
        }
        
        const aMin = a - Math.abs(aUncertainty);
        const aMax = a + Math.abs(aUncertainty);
        const bMin = b - Math.abs(bUncertainty);
        const bMax = b + Math.abs(bUncertainty);
        
        // Check for range overlap
        const overlap = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
        const totalRange = (aMax - aMin) + (bMax - bMin);
        const overlapPercent = totalRange > 0 ? (overlap / totalRange) * 200 : 100; // 0-100%
        
        // Determine relationship
        const rangesOverlap = aMax >= bMin && bMax >= aMin;
        
        return {
            equal: rangesOverlap,
            aLower: aMax < bMin,
            aHigher: aMin > bMax,
            overlap: overlapPercent,
            confidence: rangesOverlap ? 1 - (overlap / totalRange) : 1,
            valid: true
        };
    },
    
    /**
     * Compare using relative tolerance (for large numbers)
     * tolerance = max(absTol, relTol * max(|a|, |b|))
     */
    relativeEqual: function(a, b, relativeTolerance = 1e-9, absoluteTolerance = PRISM_CONSTANTS.TOLERANCE.ZERO) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        const maxMagnitude = Math.max(Math.abs(a), Math.abs(b));
        const tolerance = Math.max(absoluteTolerance, relativeTolerance * maxMagnitude);
        return Math.abs(a - b) < tolerance;
    },
    
    /**
     * Compare using ULP (Units in Last Place) - most accurate for floating point
     * Two floats are equal if they differ by at most ulpTolerance ULPs
     */
    ulpEqual: function(a, b, ulpTolerance = 4) {
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        if (a === b) return true;
        
        // Convert to integer representation
        const aBuffer = new ArrayBuffer(8);
        const bBuffer = new ArrayBuffer(8);
        new Float64Array(aBuffer)[0] = a;
        new Float64Array(bBuffer)[0] = b;
        const aInt = new BigInt64Array(aBuffer)[0];
        const bInt = new BigInt64Array(bBuffer)[0];
        
        // Check ULP difference
        const diff = aInt > bInt ? aInt - bInt : bInt - aInt;
        return diff <= BigInt(ulpTolerance);
    },
    
    /**
     * Get appropriate tolerance for a given magnitude
     * Larger numbers need larger tolerances
     */
    toleranceForMagnitude: function(magnitude, baseTolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        const absMag = Math.abs(magnitude);
        if (absMag < 1) return baseTolerance;
        return baseTolerance * Math.pow(10, Math.floor(Math.log10(absMag)));
    },
    
    /**
     * Check if value is finite and valid for comparison
     */
    isFiniteAndValid: function(value) {
        return typeof value === 'number' && Number.isFinite(value);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 3: RANGE COMPARISONS
    // Operations on intervals/ranges
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two ranges overlap
     * @param {number} min1 - Min of first range
     * @param {number} max1 - Max of first range
     * @param {number} min2 - Min of second range
     * @param {number} max2 - Max of second range
     * @param {number} tolerance - Tolerance for boundary comparison
     */
    rangesOverlap: function(min1, max1, min2, max2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.lessOrEqual(min1, max2, tolerance) && this.greaterOrEqual(max1, min2, tolerance);
    },
    
    /**
     * Check if two ranges are equal
     */
    rangesEqual: function(min1, max1, min2, max2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.equal(min1, min2, tolerance) && this.equal(max1, max2, tolerance);
    },
    
    /**
     * Check if first range contains second range
     */
    rangeContains: function(outerMin, outerMax, innerMin, innerMax, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.lessOrEqual(outerMin, innerMin, tolerance) && this.greaterOrEqual(outerMax, innerMax, tolerance);
    },
    
    /**
     * Get overlap amount between two ranges (0 if no overlap)
     */
    rangeOverlapAmount: function(min1, max1, min2, max2) {
        const overlapMin = Math.max(min1, min2);
        const overlapMax = Math.min(max1, max2);
        return Math.max(0, overlapMax - overlapMin);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 4: ANGLE COMPARISONS
    // Special handling for angular values (wrap-around)
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two angles are equal (handles wrap-around)
     * @param {number} a1 - First angle in radians
     * @param {number} a2 - Second angle in radians
     * @param {number} tolerance - Angular tolerance
     */
    anglesEqual: function(a1, a2, tolerance = PRISM_CONSTANTS.TOLERANCE.ANGLE) {
        if (!Number.isFinite(a1) || !Number.isFinite(a2)) return false;
        let diff = a1 - a2;
        // Normalize to [-π, π]
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        return Math.abs(diff) < tolerance;
    },
    
    /**
     * Check if two angles are equal in degrees
     */
    anglesEqualDegrees: function(a1, a2, toleranceDegrees = 0.001) {
        return this.anglesEqual(a1 * Math.PI / 180, a2 * Math.PI / 180, toleranceDegrees * Math.PI / 180);
    },
    
    /**
     * Check if angle is within range (handles wrap-around)
     * @param {number} angle - Angle to check (radians)
     * @param {number} minAngle - Minimum angle (radians)
     * @param {number} maxAngle - Maximum angle (radians)
     */
    angleInRange: function(angle, minAngle, maxAngle, tolerance = PRISM_CONSTANTS.TOLERANCE.ANGLE) {
        // Normalize all angles to [0, 2π]
        const normalize = (a) => {
            while (a < 0) a += 2 * Math.PI;
            while (a >= 2 * Math.PI) a -= 2 * Math.PI;
            return a;
        };
        
        const normAngle = normalize(angle);
        const normMin = normalize(minAngle);
        const normMax = normalize(maxAngle);
        
        if (normMin <= normMax) {
            // Normal case: range doesn't cross 0
            return this.greaterOrEqual(normAngle, normMin, tolerance) && 
                   this.lessOrEqual(normAngle, normMax, tolerance);
        } else {
            // Range crosses 0 (e.g., 350° to 10°)
            return this.greaterOrEqual(normAngle, normMin, tolerance) || 
                   this.lessOrEqual(normAngle, normMax, tolerance);
        }
    },
    
    /**
     * Get angular difference (always positive, always ≤ π)
     */
    angularDifference: function(a1, a2) {
        let diff = Math.abs(a1 - a2);
        while (diff > Math.PI) diff = 2 * Math.PI - diff;
        return diff;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 5: VECTOR COMPARISONS (2D and 3D)
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two 3D positions are equal
     */
    positionsEqual: function(p1, p2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!p1 || !p2) return false;
        const x1 = p1.x ?? p1.X ?? p1[0] ?? 0;
        const y1 = p1.y ?? p1.Y ?? p1[1] ?? 0;
        const z1 = p1.z ?? p1.Z ?? p1[2] ?? 0;
        const x2 = p2.x ?? p2.X ?? p2[0] ?? 0;
        const y2 = p2.y ?? p2.Y ?? p2[1] ?? 0;
        const z2 = p2.z ?? p2.Z ?? p2[2] ?? 0;
        return this.equal(x1, x2, tolerance) && this.equal(y1, y2, tolerance) && this.equal(z1, z2, tolerance);
    },
    
    /**
     * Check if two vectors are equal (component-wise)
     * Works with objects {x,y,z} or arrays [x,y,z]
     */
    vectorsEqual: function(v1, v2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.positionsEqual(v1, v2, tolerance);
    },
    
    /**
     * Check if vectors are equal within percentage tolerance
     */
    vectorNear: function(v1, v2, percentTolerance = 5) {
        if (!v1 || !v2) return false;
        const x1 = v1.x ?? v1.X ?? v1[0] ?? 0;
        const y1 = v1.y ?? v1.Y ?? v1[1] ?? 0;
        const z1 = v1.z ?? v1.Z ?? v1[2] ?? 0;
        const x2 = v2.x ?? v2.X ?? v2[0] ?? 0;
        const y2 = v2.y ?? v2.Y ?? v2[1] ?? 0;
        const z2 = v2.z ?? v2.Z ?? v2[2] ?? 0;
        
        // Compare magnitudes
        const mag1 = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
        const mag2 = Math.sqrt(x2*x2 + y2*y2 + z2*z2)