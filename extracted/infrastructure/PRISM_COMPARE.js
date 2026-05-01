// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_COMPARE - Extracted from PRISM v8.89 Monolith
// Source: PRISM_v8_89_002_TRUE_100_PERCENT.html
// Lines: 15367-17556 (2190 lines)
// Extracted: 2026-01-30
// Purpose: Deep comparison utilities
// ═══════════════════════════════════════════════════════════════════════════════

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
        const mag2 = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
        
        if (!this.isNear(mag1, mag2, percentTolerance)) return false;
        
        // Compare direction if vectors are non-zero
        if (mag1 > PRISM_CONSTANTS.TOLERANCE.ZERO && mag2 > PRISM_CONSTANTS.TOLERANCE.ZERO) {
            const dot = (x1*x2 + y1*y2 + z1*z2) / (mag1 * mag2);
            // dot product of 1 means same direction
            return this.isNear(dot, 1, percentTolerance / 10);
        }
        
        return true;
    },
    
    /**
     * Check if two vectors are parallel (same or opposite direction)
     */
    vectorsParallel: function(v1, v2, tolerance = PRISM_CONSTANTS.TOLERANCE.PARALLEL) {
        if (!v1 || !v2) return false;
        const x1 = v1.x ?? v1.X ?? v1[0] ?? 0;
        const y1 = v1.y ?? v1.Y ?? v1[1] ?? 0;
        const z1 = v1.z ?? v1.Z ?? v1[2] ?? 0;
        const x2 = v2.x ?? v2.X ?? v2[0] ?? 0;
        const y2 = v2.y ?? v2.Y ?? v2[1] ?? 0;
        const z2 = v2.z ?? v2.Z ?? v2[2] ?? 0;
        
        // Cross product magnitude should be near zero for parallel vectors
        const cross = {
            x: y1 * z2 - z1 * y2,
            y: z1 * x2 - x1 * z2,
            z: x1 * y2 - y1 * x2
        };
        const crossMag = Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z);
        const v1Mag = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
        const v2Mag = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
        
        if (v1Mag < PRISM_CONSTANTS.TOLERANCE.ZERO || v2Mag < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            return true; // Zero vector is parallel to everything
        }
        
        return crossMag < tolerance * v1Mag * v2Mag;
    },
    
    /**
     * Check if two vectors are perpendicular (orthogonal)
     */
    vectorsPerpendicular: function(v1, v2, tolerance = PRISM_CONSTANTS.TOLERANCE.PERPENDICULAR) {
        if (!v1 || !v2) return false;
        const x1 = v1.x ?? v1.X ?? v1[0] ?? 0;
        const y1 = v1.y ?? v1.Y ?? v1[1] ?? 0;
        const z1 = v1.z ?? v1.Z ?? v1[2] ?? 0;
        const x2 = v2.x ?? v2.X ?? v2[0] ?? 0;
        const y2 = v2.y ?? v2.Y ?? v2[1] ?? 0;
        const z2 = v2.z ?? v2.Z ?? v2[2] ?? 0;
        
        // Dot product should be zero for perpendicular vectors
        const dot = x1*x2 + y1*y2 + z1*z2;
        const v1Mag = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
        const v2Mag = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
        
        if (v1Mag < PRISM_CONSTANTS.TOLERANCE.ZERO || v2Mag < PRISM_CONSTANTS.TOLERANCE.ZERO) {
            return false; // Zero vector has no direction
        }
        
        return Math.abs(dot) < tolerance * v1Mag * v2Mag;
    },
    
    /**
     * Check if vector is normalized (unit length)
     */
    vectorIsUnit: function(v, tolerance = PRISM_CONSTANTS.TOLERANCE.UNIT_VECTOR) {
        if (!v) return false;
        const x = v.x ?? v.X ?? v[0] ?? 0;
        const y = v.y ?? v.Y ?? v[1] ?? 0;
        const z = v.z ?? v.Z ?? v[2] ?? 0;
        const mag = Math.sqrt(x*x + y*y + z*z);
        return this.equal(mag, 1.0, tolerance);
    },
    
    /**
     * Check if vectors have same direction (not opposite)
     */
    vectorsSameDirection: function(v1, v2, tolerance = PRISM_CONSTANTS.TOLERANCE.PARALLEL) {
        if (!this.vectorsParallel(v1, v2, tolerance)) return false;
        
        const x1 = v1.x ?? v1.X ?? v1[0] ?? 0;
        const y1 = v1.y ?? v1.Y ?? v1[1] ?? 0;
        const z1 = v1.z ?? v1.Z ?? v1[2] ?? 0;
        const x2 = v2.x ?? v2.X ?? v2[0] ?? 0;
        const y2 = v2.y ?? v2.Y ?? v2[1] ?? 0;
        const z2 = v2.z ?? v2.Z ?? v2[2] ?? 0;
        
        // Dot product should be positive for same direction
        const dot = x1*x2 + y1*y2 + z1*z2;
        return dot > 0;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 6: ARRAY COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two arrays are equal (element-wise)
     */
    arraysEqual: function(arr1, arr2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        if (arr1.length !== arr2.length) return false;
        
        for (let i = 0; i < arr1.length; i++) {
            if (!this.equal(arr1[i], arr2[i], tolerance)) return false;
        }
        return true;
    },
    
    /**
     * Check if two arrays are nearly equal (percentage tolerance)
     */
    arraysNear: function(arr1, arr2, percentTolerance = 5) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        if (arr1.length !== arr2.length) return false;
        
        for (let i = 0; i < arr1.length; i++) {
            if (!this.isNear(arr1[i], arr2[i], percentTolerance)) return false;
        }
        return true;
    },
    
    /**
     * Get unique values from array with tolerance
     */
    uniqueWithTolerance: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr)) return [];
        const result = [];
        for (const val of arr) {
            if (!result.some(existing => this.equal(existing, val, tolerance))) {
                result.push(val);
            }
        }
        return result;
    },
    
    /**
     * Find minimum value with tolerance (returns first if multiple are "equal")
     */
    minWithTolerance: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr) || arr.length === 0) return NaN;
        let min = arr[0];
        for (let i = 1; i < arr.length; i++) {
            if (this.lessThan(arr[i], min, tolerance)) {
                min = arr[i];
            }
        }
        return min;
    },
    
    /**
     * Find maximum value with tolerance
     */
    maxWithTolerance: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr) || arr.length === 0) return NaN;
        let max = arr[0];
        for (let i = 1; i < arr.length; i++) {
            if (this.greaterThan(arr[i], max, tolerance)) {
                max = arr[i];
            }
        }
        return max;
    },
    
    /**
     * Sort array with tolerance-aware comparison
     * Returns new sorted array
     */
    sortWithTolerance: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr)) return [];
        return [...arr].sort((a, b) => this.compare(a, b, tolerance));
    },
    
    /**
     * Binary search in sorted array with tolerance
     * Returns index of found element or -1
     */
    binarySearchWithTolerance: function(sortedArr, value, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(sortedArr)) return -1;
        
        let left = 0;
        let right = sortedArr.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const cmp = this.compare(value, sortedArr[mid], tolerance);
            
            if (cmp === 0) return mid;
            if (cmp < 0) right = mid - 1;
            else left = mid + 1;
        }
        
        return -1;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 7: MATRIX COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two matrices are equal (element-wise)
     */
    matricesEqual: function(m1, m2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(m1) || !Array.isArray(m2)) return false;
        if (m1.length !== m2.length) return false;
        
        for (let i = 0; i < m1.length; i++) {
            if (!this.arraysEqual(m1[i], m2[i], tolerance)) return false;
        }
        return true;
    },
    
    /**
     * Check if 4x4 transformation matrices are equal
     * Handles both array-of-arrays and flat 16-element array
     */
    transformsEqual: function(t1, t2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!t1 || !t2) return false;
        
        // Flatten if needed
        const flat1 = Array.isArray(t1[0]) ? t1.flat() : t1;
        const flat2 = Array.isArray(t2[0]) ? t2.flat() : t2;
        
        if (flat1.length !== 16 || flat2.length !== 16) return false;
        
        return this.arraysEqual(flat1, flat2, tolerance);
    },
    
    /**
     * Check if matrix is identity (within tolerance)
     */
    isIdentityMatrix: function(m, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(m)) return false;
        
        const flat = Array.isArray(m[0]) ? m.flat() : m;
        const size = Math.sqrt(flat.length);
        
        if (!Number.isInteger(size)) return false;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const expected = i === j ? 1 : 0;
                const actual = flat[i * size + j];
                if (!this.equal(actual, expected, tolerance)) return false;
            }
        }
        return true;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 8: QUATERNION COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two quaternions represent same rotation
     * Note: q and -q represent same rotation
     */
    quaternionsEqual: function(q1, q2, tolerance = PRISM_CONSTANTS.TOLERANCE.ANGLE) {
        if (!q1 || !q2) return false;
        
        const x1 = q1.x ?? q1[0] ?? 0;
        const y1 = q1.y ?? q1[1] ?? 0;
        const z1 = q1.z ?? q1[2] ?? 0;
        const w1 = q1.w ?? q1[3] ?? 1;
        
        const x2 = q2.x ?? q2[0] ?? 0;
        const y2 = q2.y ?? q2[1] ?? 0;
        const z2 = q2.z ?? q2[2] ?? 0;
        const w2 = q2.w ?? q2[3] ?? 1;
        
        // Check both q and -q (same rotation)
        const dot = x1*x2 + y1*y2 + z1*z2 + w1*w2;
        
        // |dot| should be ~1 for same rotation
        return Math.abs(Math.abs(dot) - 1) < tolerance;
    },
    
    /**
     * Check if quaternion is normalized
     */
    quaternionIsUnit: function(q, tolerance = PRISM_CONSTANTS.TOLERANCE.UNIT_VECTOR) {
        if (!q) return false;
        const x = q.x ?? q[0] ?? 0;
        const y = q.y ?? q[1] ?? 0;
        const z = q.z ?? q[2] ?? 0;
        const w = q.w ?? q[3] ?? 1;
        const mag = Math.sqrt(x*x + y*y + z*z + w*w);
        return this.equal(mag, 1.0, tolerance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 9: BOUNDING BOX COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two bounding boxes overlap
     */
    bboxesOverlap: function(bbox1, bbox2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!bbox1 || !bbox2) return false;
        
        const min1 = bbox1.min || bbox1.minimum || { x: bbox1.minX, y: bbox1.minY, z: bbox1.minZ };
        const max1 = bbox1.max || bbox1.maximum || { x: bbox1.maxX, y: bbox1.maxY, z: bbox1.maxZ };
        const min2 = bbox2.min || bbox2.minimum || { x: bbox2.minX, y: bbox2.minY, z: bbox2.minZ };
        const max2 = bbox2.max || bbox2.maximum || { x: bbox2.maxX, y: bbox2.maxY, z: bbox2.maxZ };
        
        return this.rangesOverlap(min1.x, max1.x, min2.x, max2.x, tolerance) &&
               this.rangesOverlap(min1.y, max1.y, min2.y, max2.y, tolerance) &&
               this.rangesOverlap(min1.z, max1.z, min2.z, max2.z, tolerance);
    },
    
    /**
     * Check if two bounding boxes are equal
     */
    bboxesEqual: function(bbox1, bbox2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!bbox1 || !bbox2) return false;
        
        const min1 = bbox1.min || bbox1.minimum || { x: bbox1.minX, y: bbox1.minY, z: bbox1.minZ };
        const max1 = bbox1.max || bbox1.maximum || { x: bbox1.maxX, y: bbox1.maxY, z: bbox1.maxZ };
        const min2 = bbox2.min || bbox2.minimum || { x: bbox2.minX, y: bbox2.minY, z: bbox2.minZ };
        const max2 = bbox2.max || bbox2.maximum || { x: bbox2.maxX, y: bbox2.maxY, z: bbox2.maxZ };
        
        return this.positionsEqual(min1, min2, tolerance) && this.positionsEqual(max1, max2, tolerance);
    },
    
    /**
     * Check if point is inside bounding box
     */
    pointInBBox: function(point, bbox, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!point || !bbox) return false;
        
        const px = point.x ?? point.X ?? point[0] ?? 0;
        const py = point.y ?? point.Y ?? point[1] ?? 0;
        const pz = point.z ?? point.Z ?? point[2] ?? 0;
        
        const min = bbox.min || bbox.minimum || { x: bbox.minX, y: bbox.minY, z: bbox.minZ };
        const max = bbox.max || bbox.maximum || { x: bbox.maxX, y: bbox.maxY, z: bbox.maxZ };
        
        return this.isWithinRange(px, min.x, max.x, tolerance) &&
               this.isWithinRange(py, min.y, max.y, tolerance) &&
               this.isWithinRange(pz, min.z, max.z, tolerance);
    },
    
    /**
     * Check if first bbox contains second bbox
     */
    bboxContains: function(outer, inner, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!outer || !inner) return false;
        
        const outerMin = outer.min || outer.minimum || { x: outer.minX, y: outer.minY, z: outer.minZ };
        const outerMax = outer.max || outer.maximum || { x: outer.maxX, y: outer.maxY, z: outer.maxZ };
        const innerMin = inner.min || inner.minimum || { x: inner.minX, y: inner.minY, z: inner.minZ };
        const innerMax = inner.max || inner.maximum || { x: inner.maxX, y: inner.maxY, z: inner.maxZ };
        
        return this.rangeContains(outerMin.x, outerMax.x, innerMin.x, innerMax.x, tolerance) &&
               this.rangeContains(outerMin.y, outerMax.y, innerMin.y, innerMax.y, tolerance) &&
               this.rangeContains(outerMin.z, outerMax.z, innerMin.z, innerMax.z, tolerance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 10: GEOMETRIC PRIMITIVE COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two planes are equal (same normal and distance)
     * Plane defined as {normal: {x,y,z}, distance: number} or {a,b,c,d} for ax+by+cz+d=0
     */
    planesEqual: function(plane1, plane2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!plane1 || !plane2) return false;
        
        // Extract normal and distance
        let n1, d1, n2, d2;
        
        if (plane1.normal) {
            n1 = plane1.normal;
            d1 = plane1.distance ?? plane1.d ?? 0;
        } else {
            n1 = { x: plane1.a, y: plane1.b, z: plane1.c };
            d1 = plane1.d ?? 0;
        }
        
        if (plane2.normal) {
            n2 = plane2.normal;
            d2 = plane2.distance ?? plane2.d ?? 0;
        } else {
            n2 = { x: plane2.a, y: plane2.b, z: plane2.c };
            d2 = plane2.d ?? 0;
        }
        
        // Check if normals are parallel (same or opposite)
        if (!this.vectorsParallel(n1, n2, tolerance)) return false;
        
        // Check distance (accounting for possible normal flip)
        if (this.vectorsSameDirection(n1, n2, tolerance)) {
            return this.equal(d1, d2, tolerance);
        } else {
            return this.equal(d1, -d2, tolerance);
        }
    },
    
    /**
     * Check if two lines are equal (same or overlapping)
     * Line defined as {point: {x,y,z}, direction: {x,y,z}}
     */
    linesEqual: function(line1, line2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!line1 || !line2) return false;
        
        const p1 = line1.point || line1.origin || { x: 0, y: 0, z: 0 };
        const d1 = line1.direction || line1.dir || { x: 1, y: 0, z: 0 };
        const p2 = line2.point || line2.origin || { x: 0, y: 0, z: 0 };
        const d2 = line2.direction || line2.dir || { x: 1, y: 0, z: 0 };
        
        // Directions must be parallel
        if (!this.vectorsParallel(d1, d2, tolerance)) return false;
        
        // Point p2 must lie on line1
        // Vector from p1 to p2 must be parallel to direction
        const p1ToP2 = {
            x: (p2.x ?? 0) - (p1.x ?? 0),
            y: (p2.y ?? 0) - (p1.y ?? 0),
            z: (p2.z ?? 0) - (p1.z ?? 0)
        };
        
        // If p1 and p2 are the same point, lines are equal
        if (this.isZero(p1ToP2.x) && this.isZero(p1ToP2.y) && this.isZero(p1ToP2.z)) {
            return true;
        }
        
        // p1ToP2 must be parallel to line direction
        return this.vectorsParallel(p1ToP2, d1, tolerance);
    },
    
    /**
     * Check if two circles/arcs are equal
     * Circle defined as {center: {x,y,z}, normal: {x,y,z}, radius: number}
     */
    circlesEqual: function(c1, c2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!c1 || !c2) return false;
        
        // Check radius
        if (!this.equal(c1.radius, c2.radius, tolerance)) return false;
        
        // Check center
        if (!this.positionsEqual(c1.center, c2.center, tolerance)) return false;
        
        // Check normal (same plane)
        if (c1.normal && c2.normal) {
            if (!this.vectorsParallel(c1.normal, c2.normal, tolerance)) return false;
        }
        
        return true;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 11: MANUFACTURING-SPECIFIC COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Compare cutting parameters with appropriate tolerances
     */
    cuttingParamsEqual: function(params1, params2) {
        if (!params1 || !params2) return false;
        
        // Speed comparison (SFM/m-min) - 1% tolerance
        if (params1.speed !== undefined && params2.speed !== undefined) {
            if (!this.isNear(params1.speed, params2.speed, 1)) return false;
        }
        
        // Feed comparison - 1% tolerance
        if (params1.feed !== undefined && params2.feed !== undefined) {
            if (!this.isNear(params1.feed, params2.feed, 1)) return false;
        }
        
        // DOC comparison - 0.01mm tolerance
        if (params1.doc !== undefined && params2.doc !== undefined) {
            if (!this.equal(params1.doc, params2.doc, 0.01)) return false;
        }
        
        // RPM comparison - integer tolerance
        if (params1.rpm !== undefined && params2.rpm !== undefined) {
            if (!this.equal(params1.rpm, params2.rpm, 1)) return false;
        }
        
        return true;
    },
    
    /**
     * Compare tool dimensions with appropriate tolerances
     */
    toolDimensionsEqual: function(tool1, tool2) {
        if (!tool1 || !tool2) return false;
        
        // Diameter - micron level
        if (tool1.diameter !== undefined && tool2.diameter !== undefined) {
            if (!this.equal(tool1.diameter, tool2.diameter, 0.001)) return false;
        }
        
        // Length - 0.01mm tolerance
        if (tool1.length !== undefined && tool2.length !== undefined) {
            if (!this.equal(tool1.length, tool2.length, 0.01)) return false;
        }
        
        // Flutes - exact match
        if (tool1.flutes !== undefined && tool2.flutes !== undefined) {
            if (tool1.flutes !== tool2.flutes) return false;
        }
        
        return true;
    },
    
    /**
     * Compare surface finish values (Ra, Rz, etc.)
     */
    surfaceFinishEqual: function(sf1, sf2, tolerance = PRISM_CONSTANTS.TOLERANCE.SURFACE_FINISH) {
        return this.equal(sf1, sf2, tolerance);
    },
    
    /**
     * Compare tool wear values
     */
    toolWearEqual: function(wear1, wear2, tolerance = PRISM_CONSTANTS.TOLERANCE.TOOL_WEAR) {
        return this.equal(wear1, wear2, tolerance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 12: UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Get tolerance type for specific context
     */
    getToleranceFor: function(context) {
        const tolerances = {
            'position': PRISM_CONSTANTS.TOLERANCE.POSITION,
            'angle': PRISM_CONSTANTS.TOLERANCE.ANGLE,
            'parameter': PRISM_CONSTANTS.TOLERANCE.PARAMETER,
            'singularity': PRISM_CONSTANTS.TOLERANCE.SINGULARITY,
            'convergence': PRISM_CONSTANTS.TOLERANCE.CONVERGENCE,
            'zero': PRISM_CONSTANTS.TOLERANCE.ZERO,
            'surface_finish': PRISM_CONSTANTS.TOLERANCE.SURFACE_FINISH,
            'tool_wear': PRISM_CONSTANTS.TOLERANCE.TOOL_WEAR,
            'parallel': PRISM_CONSTANTS.TOLERANCE.PARALLEL,
            'perpendicular': PRISM_CONSTANTS.TOLERANCE.PERPENDICULAR,
            'unit_vector': PRISM_CONSTANTS.TOLERANCE.UNIT_VECTOR
        };
        return tolerances[context.toLowerCase()] || PRISM_CONSTANTS.TOLERANCE.POSITION;
    },
    
    /**
     * Describe comparison result in human-readable form
     */
    describeComparison: function(a, b, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        const diff = Math.abs(a - b);
        const cmp = this.compare(a, b, tolerance);
        
        return {
            a,
            b,
            difference: diff,
            percentDiff: b !== 0 ? (diff / Math.abs(b)) * 100 : (a === 0 ? 0 : Infinity),
            tolerance,
            withinTolerance: cmp === 0,
            comparison: cmp === 0 ? 'equal' : (cmp < 0 ? 'less' : 'greater'),
            description: cmp === 0 
                ? `Values are equal within tolerance (diff=${diff.toExponential(2)})`
                : `Value ${a} is ${cmp < 0 ? 'less' : 'greater'} than ${b} (diff=${diff.toExponential(2)})`
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 13: COLLINEARITY & COPLANARITY
    // Critical for CAD/CAM geometry processing
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if three points are collinear (on same line)
     */
    pointsCollinear: function(p1, p2, p3, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!p1 || !p2 || !p3) return false;
        
        const x1 = p1.x ?? p1[0] ?? 0, y1 = p1.y ?? p1[1] ?? 0, z1 = p1.z ?? p1[2] ?? 0;
        const x2 = p2.x ?? p2[0] ?? 0, y2 = p2.y ?? p2[1] ?? 0, z2 = p2.z ?? p2[2] ?? 0;
        const x3 = p3.x ?? p3[0] ?? 0, y3 = p3.y ?? p3[1] ?? 0, z3 = p3.z ?? p3[2] ?? 0;
        
        // Vector from p1 to p2
        const v1 = { x: x2 - x1, y: y2 - y1, z: z2 - z1 };
        // Vector from p1 to p3
        const v2 = { x: x3 - x1, y: y3 - y1, z: z3 - z1 };
        
        // Cross product should be zero for collinear points
        return this.vectorsParallel(v1, v2, tolerance);
    },
    
    /**
     * Check if four points are coplanar (on same plane)
     */
    pointsCoplanar: function(p1, p2, p3, p4, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!p1 || !p2 || !p3 || !p4) return false;
        
        const x1 = p1.x ?? p1[0] ?? 0, y1 = p1.y ?? p1[1] ?? 0, z1 = p1.z ?? p1[2] ?? 0;
        const x2 = p2.x ?? p2[0] ?? 0, y2 = p2.y ?? p2[1] ?? 0, z2 = p2.z ?? p2[2] ?? 0;
        const x3 = p3.x ?? p3[0] ?? 0, y3 = p3.y ?? p3[1] ?? 0, z3 = p3.z ?? p3[2] ?? 0;
        const x4 = p4.x ?? p4[0] ?? 0, y4 = p4.y ?? p4[1] ?? 0, z4 = p4.z ?? p4[2] ?? 0;
        
        // Three vectors from p1
        const v1 = { x: x2 - x1, y: y2 - y1, z: z2 - z1 };
        const v2 = { x: x3 - x1, y: y3 - y1, z: z3 - z1 };
        const v3 = { x: x4 - x1, y: y4 - y1, z: z4 - z1 };
        
        // Scalar triple product (v1 · (v2 × v3)) should be zero
        const cross = {
            x: v2.y * v3.z - v2.z * v3.y,
            y: v2.z * v3.x - v2.x * v3.z,
            z: v2.x * v3.y - v2.y * v3.x
        };
        const scalarTriple = v1.x * cross.x + v1.y * cross.y + v1.z * cross.z;
        
        // Normalize by volume scale
        const v1Mag = Math.sqrt(v1.x*v1.x + v1.y*v1.y + v1.z*v1.z);
        const v2Mag = Math.sqrt(v2.x*v2.x + v2.y*v2.y + v2.z*v2.z);
        const v3Mag = Math.sqrt(v3.x*v3.x + v3.y*v3.y + v3.z*v3.z);
        const scale = v1Mag * v2Mag * v3Mag;
        
        if (scale < PRISM_CONSTANTS.TOLERANCE.ZERO) return true; // Degenerate case
        
        return Math.abs(scalarTriple) < tolerance * scale;
    },
    
    /**
     * Check if point lies on line segment
     */
    pointOnLineSegment: function(point, lineStart, lineEnd, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!point || !lineStart || !lineEnd) return false;
        
        const px = point.x ?? point[0] ?? 0, py = point.y ?? point[1] ?? 0, pz = point.z ?? point[2] ?? 0;
        const ax = lineStart.x ?? lineStart[0] ?? 0, ay = lineStart.y ?? lineStart[1] ?? 0, az = lineStart.z ?? lineStart[2] ?? 0;
        const bx = lineEnd.x ?? lineEnd[0] ?? 0, by = lineEnd.y ?? lineEnd[1] ?? 0, bz = lineEnd.z ?? lineEnd[2] ?? 0;
        
        // Check collinearity
        if (!this.pointsCollinear(point, lineStart, lineEnd, tolerance)) return false;
        
        // Check if point is between start and end
        const dotAB = (bx-ax)*(bx-ax) + (by-ay)*(by-ay) + (bz-az)*(bz-az);
        if (dotAB < tolerance * tolerance) return this.positionsEqual(point, lineStart, tolerance);
        
        const dotAP = (px-ax)*(bx-ax) + (py-ay)*(by-ay) + (pz-az)*(bz-az);
        const t = dotAP / dotAB;
        
        return t >= -tolerance && t <= 1 + tolerance;
    },
    
    /**
     * Check if point lies on infinite line
     */
    pointOnLine: function(point, linePoint, lineDirection, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!point || !linePoint || !lineDirection) return false;
        
        const px = point.x ?? point[0] ?? 0, py = point.y ?? point[1] ?? 0, pz = point.z ?? point[2] ?? 0;
        const lx = linePoint.x ?? linePoint[0] ?? 0, ly = linePoint.y ?? linePoint[1] ?? 0, lz = linePoint.z ?? linePoint[2] ?? 0;
        
        // Vector from line point to test point
        const toPoint = { x: px - lx, y: py - ly, z: pz - lz };
        
        // Should be parallel to line direction
        return this.vectorsParallel(toPoint, lineDirection, tolerance) || 
               (this.isZero(toPoint.x) && this.isZero(toPoint.y) && this.isZero(toPoint.z));
    },
    
    /**
     * Check if point lies on plane
     */
    pointOnPlane: function(point, planePoint, planeNormal, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!point || !planePoint || !planeNormal) return false;
        
        const px = point.x ?? point[0] ?? 0, py = point.y ?? point[1] ?? 0, pz = point.z ?? point[2] ?? 0;
        const ox = planePoint.x ?? planePoint[0] ?? 0, oy = planePoint.y ?? planePoint[1] ?? 0, oz = planePoint.z ?? planePoint[2] ?? 0;
        const nx = planeNormal.x ?? planeNormal[0] ?? 0, ny = planeNormal.y ?? planeNormal[1] ?? 0, nz = planeNormal.z ?? planeNormal[2] ?? 0;
        
        // Distance from plane = dot(point - planePoint, normal) / |normal|
        const toPoint = { x: px - ox, y: py - oy, z: pz - oz };
        const dot = toPoint.x * nx + toPoint.y * ny + toPoint.z * nz;
        const normalMag = Math.sqrt(nx*nx + ny*ny + nz*nz);
        
        if (normalMag < PRISM_CONSTANTS.TOLERANCE.ZERO) return false;
        
        const distance = Math.abs(dot) / normalMag;
        return distance < tolerance;
    },
    
    /**
     * Check if two lines are coplanar (lie in same plane)
     */
    linesCoplanar: function(line1Point, line1Dir, line2Point, line2Dir, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        // Vector connecting the two line points
        const p1 = line1Point, p2 = line2Point;
        const x1 = p1.x ?? p1[0] ?? 0, y1 = p1.y ?? p1[1] ?? 0, z1 = p1.z ?? p1[2] ?? 0;
        const x2 = p2.x ?? p2[0] ?? 0, y2 = p2.y ?? p2[1] ?? 0, z2 = p2.z ?? p2[2] ?? 0;
        const connecting = { x: x2 - x1, y: y2 - y1, z: z2 - z1 };
        
        // Scalar triple product of connecting vector and two directions should be zero
        const d1 = line1Dir, d2 = line2Dir;
        const d1x = d1.x ?? d1[0] ?? 0, d1y = d1.y ?? d1[1] ?? 0, d1z = d1.z ?? d1[2] ?? 0;
        const d2x = d2.x ?? d2[0] ?? 0, d2y = d2.y ?? d2[1] ?? 0, d2z = d2.z ?? d2[2] ?? 0;
        
        // connecting · (d1 × d2)
        const cross = {
            x: d1y * d2z - d1z * d2y,
            y: d1z * d2x - d1x * d2z,
            z: d1x * d2y - d1y * d2x
        };
        const scalarTriple = connecting.x * cross.x + connecting.y * cross.y + connecting.z * cross.z;
        
        const scale = Math.sqrt(connecting.x*connecting.x + connecting.y*connecting.y + connecting.z*connecting.z) *
                      Math.sqrt(d1x*d1x + d1y*d1y + d1z*d1z) *
                      Math.sqrt(d2x*d2x + d2y*d2y + d2z*d2z);
        
        if (scale < PRISM_CONSTANTS.TOLERANCE.ZERO) return true;
        
        return Math.abs(scalarTriple) < tolerance * scale;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 14: CONVERGENCE & NUMERICAL STABILITY
    // Essential for iterative algorithms
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if sequence has converged
     * @param {number} current - Current value
     * @param {number} previous - Previous value
     * @param {number} tolerance - Convergence tolerance
     * @param {string} type - 'absolute' or 'relative'
     */
    hasConverged: function(current, previous, tolerance = PRISM_CONSTANTS.TOLERANCE.CONVERGENCE, type = 'relative') {
        if (!Number.isFinite(current) || !Number.isFinite(previous)) return false;
        
        const diff = Math.abs(current - previous);
        
        if (type === 'absolute') {
            return diff < tolerance;
        } else {
            // Relative convergence
            const maxMag = Math.max(Math.abs(current), Math.abs(previous), 1e-10);
            return diff / maxMag < tolerance;
        }
    },
    
    /**
     * Check if array/vector sequence has converged
     */
    arrayHasConverged: function(current, previous, tolerance = PRISM_CONSTANTS.TOLERANCE.CONVERGENCE, type = 'relative') {
        if (!Array.isArray(current) || !Array.isArray(previous)) return false;
        if (current.length !== previous.length) return false;
        
        for (let i = 0; i < current.length; i++) {
            if (!this.hasConverged(current[i], previous[i], tolerance, type)) {
                return false;
            }
        }
        return true;
    },
    
    /**
     * Check if value is numerically stable (not approaching infinity or NaN)
     */
    isNumericallyStable: function(value, maxMagnitude = 1e15) {
        if (!Number.isFinite(value)) return false;
        return Math.abs(value) < maxMagnitude;
    },
    
    /**
     * Check if gradient is vanishing (too small)
     */
    gradientVanishing: function(gradient, threshold = 1e-10) {
        if (Array.isArray(gradient)) {
            const norm = Math.sqrt(gradient.reduce((sum, g) => sum + g*g, 0));
            return norm < threshold;
        }
        return Math.abs(gradient) < threshold;
    },
    
    /**
     * Check if gradient is exploding (too large)
     */
    gradientExploding: function(gradient, threshold = 1e10) {
        if (Array.isArray(gradient)) {
            const norm = Math.sqrt(gradient.reduce((sum, g) => sum + g*g, 0));
            return norm > threshold;
        }
        return Math.abs(gradient) > threshold;
    },
    
    /**
     * Check if learning rate is appropriate for gradient
     */
    learningRateAppropriate: function(learningRate, gradient, maxStep = 1.0) {
        const gradNorm = Array.isArray(gradient) 
            ? Math.sqrt(gradient.reduce((sum, g) => sum + g*g, 0))
            : Math.abs(gradient);
        const stepSize = learningRate * gradNorm;
        return stepSize < maxStep && stepSize > 0;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 15: TOLERANCE STACKUP & STATISTICAL COMPARISONS
    // For manufacturing precision analysis
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * RSS (Root Sum Square) tolerance stackup comparison
     * Statistical method for independent tolerances
     */
    toleranceStackupRSS: function(tolerances) {
        if (!Array.isArray(tolerances) || tolerances.length === 0) return 0;
        const sumSquares = tolerances.reduce((sum, t) => sum + t*t, 0);
        return Math.sqrt(sumSquares);
    },
    
    /**
     * Worst-case tolerance stackup
     * Conservative method assuming all tolerances stack in same direction
     */
    toleranceStackupWorstCase: function(tolerances) {
        if (!Array.isArray(tolerances) || tolerances.length === 0) return 0;
        return tolerances.reduce((sum, t) => sum + Math.abs(t), 0);
    },
    
    /**
     * Compare if assembly fits within tolerance
     * @param {number} nominalGap - Nominal gap/clearance
     * @param {number[]} tolerances - Array of contributing tolerances
     * @param {string} method - 'rss' or 'worstcase'
     */
    assemblyFits: function(nominalGap, tolerances, method = 'rss') {
        const stackup = method === 'rss' 
            ? this.toleranceStackupRSS(tolerances)
            : this.toleranceStackupWorstCase(tolerances);
        return nominalGap >= stackup;
    },
    
    /**
     * Check if measurement is within specification
     * @param {number} measured - Measured value
     * @param {number} nominal - Nominal value
     * @param {number} plusTol - Upper tolerance (+)
     * @param {number} minusTol - Lower tolerance (-), positive number
     */
    withinSpec: function(measured, nominal, plusTol, minusTol = null) {
        if (minusTol === null) minusTol = plusTol; // Symmetric tolerance
        const lower = nominal - Math.abs(minusTol);
        const upper = nominal + Math.abs(plusTol);
        return measured >= lower && measured <= upper;
    },
    
    /**
     * Calculate Cpk (process capability index) comparison
     * Cpk >= 1.33 is typically acceptable, >= 1.67 is good
     */
    processCapable: function(mean, stdDev, upperSpec, lowerSpec, minCpk = 1.33) {
        if (stdDev <= 0) return false;
        const cpu = (upperSpec - mean) / (3 * stdDev);
        const cpl = (mean - lowerSpec) / (3 * stdDev);
        const cpk = Math.min(cpu, cpl);
        return cpk >= minCpk;
    },
    
    /**
     * Check if two values are statistically significantly different
     * Using simple z-test approximation
     */
    statisticallyDifferent: function(mean1, std1, n1, mean2, std2, n2, confidenceLevel = 0.95) {
        // Pooled standard error
        const se = Math.sqrt((std1*std1/n1) + (std2*std2/n2));
        if (se < PRISM_CONSTANTS.TOLERANCE.ZERO) return !this.equal(mean1, mean2);
        
        const z = Math.abs(mean1 - mean2) / se;
        
        // Z critical values (approximate)
        const zCritical = confidenceLevel === 0.99 ? 2.576 : 
                          confidenceLevel === 0.95 ? 1.96 : 
                          confidenceLevel === 0.90 ? 1.645 : 1.96;
        
        return z > zCritical;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 16: G-CONTINUITY (Geometric Continuity)
    // Critical for CAD surface/curve quality
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check G0 continuity (positional) - curves/surfaces touch
     */
    isG0Continuous: function(point1, point2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.positionsEqual(point1, point2, tolerance);
    },
    
    /**
     * Check G1 continuity (tangent) - tangent vectors parallel
     */
    isG1Continuous: function(point1, tangent1, point2, tangent2, posTolerance = PRISM_CONSTANTS.TOLERANCE.POSITION, angTolerance = PRISM_CONSTANTS.TOLERANCE.ANGLE) {
        // Must be G0 first
        if (!this.isG0Continuous(point1, point2, posTolerance)) return false;
        
        // Tangent vectors must be parallel (same direction)
        return this.vectorsSameDirection(tangent1, tangent2, Math.sin(angTolerance));
    },
    
    /**
     * Check G2 continuity (curvature) - curvature values equal
     */
    isG2Continuous: function(point1, tangent1, curvature1, point2, tangent2, curvature2, posTolerance = PRISM_CONSTANTS.TOLERANCE.POSITION, curvatureTolerance = 0.001) {
        // Must be G1 first
        if (!this.isG1Continuous(point1, tangent1, point2, tangent2, posTolerance)) return false;
        
        // Curvature values must match
        if (typeof curvature1 === 'number' && typeof curvature2 === 'number') {
            return this.isNear(curvature1, curvature2, curvatureTolerance * 100);
        }
        
        // Curvature vectors must match
        return this.vectorNear(curvature1, curvature2, curvatureTolerance * 100);
    },
    
    /**
     * Check G3 continuity (rate of curvature change)
     */
    isG3Continuous: function(g2Data1, g2Data2, curvatureDerivative1, curvatureDerivative2, tolerance = 0.01) {
        // Must be G2 first
        if (!this.isG2Continuous(
            g2Data1.point, g2Data1.tangent, g2Data1.curvature,
            g2Data2.point, g2Data2.tangent, g2Data2.curvature
        )) return false;
        
        // Curvature derivatives must match
        return this.isNear(curvatureDerivative1, curvatureDerivative2, tolerance * 100);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 17: NURBS/SPLINE PARAMETER COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Compare NURBS parameter values (u, v)
     * Parameter space is typically [0, 1]
     */
    parametersEqual: function(u1, u2, tolerance = PRISM_CONSTANTS.TOLERANCE.PARAMETER) {
        return this.equal(u1, u2, tolerance);
    },
    
    /**
     * Check if parameter is at start of curve/surface
     */
    isParameterAtStart: function(u, tolerance = PRISM_CONSTANTS.TOLERANCE.PARAMETER) {
        return this.isZero(u, tolerance);
    },
    
    /**
     * Check if parameter is at end of curve/surface
     */
    isParameterAtEnd: function(u, maxParam = 1.0, tolerance = PRISM_CONSTANTS.TOLERANCE.PARAMETER) {
        return this.equal(u, maxParam, tolerance);
    },
    
    /**
     * Check if parameter is within valid range
     */
    isParameterValid: function(u, minParam = 0, maxParam = 1, tolerance = PRISM_CONSTANTS.TOLERANCE.PARAMETER) {
        return this.greaterOrEqual(u, minParam, tolerance) && this.lessOrEqual(u, maxParam, tolerance);
    },
    
    /**
     * Check if two knot vectors are equal
     */
    knotVectorsEqual: function(knots1, knots2, tolerance = PRISM_CONSTANTS.TOLERANCE.PARAMETER) {
        return this.arraysEqual(knots1, knots2, tolerance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 18: DISTANCE COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two distances are equal
     */
    distancesEqual: function(d1, d2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.equal(d1, d2, tolerance);
    },
    
    /**
     * Check if distance is within limit
     */
    distanceWithinLimit: function(distance, maxDistance, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.lessOrEqual(distance, maxDistance, tolerance);
    },
    
    /**
     * Compare two 3D distances (point-to-point)
     */
    point3DDistanceEqual: function(p1, p2, p3, p4, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        const d1 = this.calculateDistance3D(p1, p2);
        const d2 = this.calculateDistance3D(p3, p4);
        return this.equal(d1, d2, tolerance);
    },
    
    /**
     * Helper: Calculate 3D distance
     */
    calculateDistance3D: function(p1, p2) {
        const x1 = p1.x ?? p1[0] ?? 0, y1 = p1.y ?? p1[1] ?? 0, z1 = p1.z ?? p1[2] ?? 0;
        const x2 = p2.x ?? p2[0] ?? 0, y2 = p2.y ?? p2[1] ?? 0, z2 = p2.z ?? p2[2] ?? 0;
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) + (z2-z1)*(z2-z1));
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 19: AREA & VOLUME COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if two areas are equal
     */
    areasEqual: function(area1, area2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION * PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.equal(area1, area2, tolerance);
    },
    
    /**
     * Check if two volumes are equal
     */
    volumesEqual: function(vol1, vol2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION * PRISM_CONSTANTS.TOLERANCE.POSITION * PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.equal(vol1, vol2, tolerance);
    },
    
    /**
     * Check if area/volume is effectively zero
     */
    areaIsZero: function(area, tolerance = 1e-12) {
        return this.isZero(area, tolerance);
    },
    
    volumeIsZero: function(volume, tolerance = 1e-18) {
        return this.isZero(volume, tolerance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 20: MACHINE EPSILON & FLOATING POINT UTILITIES
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Machine epsilon for double precision
     */
    MACHINE_EPSILON: Number.EPSILON || 2.220446049250313e-16,
    
    /**
     * Get machine epsilon
     */
    getMachineEpsilon: function() {
        return this.MACHINE_EPSILON;
    },
    
    /**
     * Check if difference is within machine precision
     */
    withinMachinePrecision: function(a, b) {
        return this.ulpEqual(a, b, 1);
    },
    
    /**
     * Get number of significant digits that match
     */
    matchingDigits: function(a, b) {
        if (a === b) return 16; // Max for double
        if (a === 0 || b === 0) return 0;
        
        const relDiff = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
        if (relDiff === 0) return 16;
        
        return Math.max(0, Math.floor(-Math.log10(relDiff)));
    },
    
    /**
     * Check if value is representable (not denormalized)
     */
    isNormalNumber: function(value) {
        if (!Number.isFinite(value)) return false;
        if (value === 0) return true;
        return Math.abs(value) >= Number.MIN_VALUE;
    },
    
    /**
     * Round to significant figures
     */
    roundToSignificantFigures: function(value, sigFigs) {
        if (value === 0) return 0;
        const magnitude = Math.floor(Math.log10(Math.abs(value)));
        const scale = Math.pow(10, sigFigs - magnitude - 1);
        return Math.round(value * scale) / scale;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // SECTION 21: MONOTONICITY & SEQUENCE COMPARISONS
    // ─────────────────────────────────────────────────────────────────────────────────────
    
    /**
     * Check if array is monotonically increasing
     */
    isMonotonicallyIncreasing: function(arr, strict = false, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr) || arr.length < 2) return true;
        
        for (let i = 1; i < arr.length; i++) {
            if (strict) {
                if (!this.greaterThan(arr[i], arr[i-1], tolerance)) return false;
            } else {
                if (!this.greaterOrEqual(arr[i], arr[i-1], tolerance)) return false;
            }
        }
        return true;
    },
    
    /**
     * Check if array is monotonically decreasing
     */
    isMonotonicallyDecreasing: function(arr, strict = false, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr) || arr.length < 2) return true;
        
        for (let i = 1; i < arr.length; i++) {
            if (strict) {
                if (!this.lessThan(arr[i], arr[i-1], tolerance)) return false;
            } else {
                if (!this.lessOrEqual(arr[i], arr[i-1], tolerance)) return false;
            }
        }
        return true;
    },
    
    /**
     * Check if array is monotonic (either direction)
     */
    isMonotonic: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        return this.isMonotonicallyIncreasing(arr, false, tolerance) || 
               this.isMonotonicallyDecreasing(arr, false, tolerance);
    },
    
    /**
     * Check if array values are evenly spaced
     */
    isEvenlySpaced: function(arr, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(arr) || arr.length < 3) return true;
        
        const spacing = arr[1] - arr[0];
        for (let i = 2; i < arr.length; i++) {
            if (!this.equal(arr[i] - arr[i-1], spacing, tolerance)) return false;
        }
        return true;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SESSION 1.3 TRUE ABSOLUTE MAXIMUM - SECTION H: Spindle/RPM Comparisons (5 new)
    // Sources: PRISM_CONSTANTS.SPINDLE, machine tool standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    rpmEqual: function(rpm1, rpm2, tolerancePercent = 0.5) {
        // RPM comparison with percentage tolerance (default 0.5%)
        if (!Number.isFinite(rpm1) || !Number.isFinite(rpm2)) return false;
        const tolerance = Math.max(rpm1, rpm2) * (tolerancePercent / 100);
        return Math.abs(rpm1 - rpm2) <= tolerance;
    },
    
    rpmNear: function(rpm1, rpm2, rpmTolerance = 10) {
        // RPM comparison with absolute tolerance
        if (!Number.isFinite(rpm1) || !Number.isFinite(rpm2)) return false;
        return Math.abs(rpm1 - rpm2) <= rpmTolerance;
    },
    
    spindleSpeedsCompatible: function(required, available) {
        // Check if available spindle speed range covers required
        if (!required || !available) return false;
        return available.min <= required.min && available.max >= required.max;
    },
    
    runoutAcceptable: function(measured, maxAllowed = PRISM_CONSTANTS.SPINDLE.RUNOUT_STANDARD) {
        if (!Number.isFinite(measured)) return false;
        return measured <= maxAllowed;
    },
    
    accelerationSufficient: function(required, available) {
        if (!Number.isFinite(required) || !Number.isFinite(available)) return false;
        return available >= required;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION I: Economics/Cost Comparisons (6 new)
    // Sources: PRISM_CONSTANTS.ECONOMICS, manufacturing cost analysis
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    costEqual: function(cost1, cost2, tolerancePercent = 1) {
        // Cost comparison with percentage tolerance
        if (!Number.isFinite(cost1) || !Number.isFinite(cost2)) return false;
        if (cost1 === 0 && cost2 === 0) return true;
        const tolerance = Math.max(cost1, cost2) * (tolerancePercent / 100);
        return Math.abs(cost1 - cost2) <= tolerance;
    },
    
    priceNear: function(price1, price2, absoluteTolerance = 0.01) {
        // Price comparison for currency (default $0.01)
        if (!Number.isFinite(price1) || !Number.isFinite(price2)) return false;
        return Math.abs(price1 - price2) <= absoluteTolerance;
    },
    
    marginAcceptable: function(margin, minMargin = PRISM_CONSTANTS.ECONOMICS.PROFIT_MARGIN_MINIMUM) {
        if (!Number.isFinite(margin)) return false;
        return margin >= minMargin;
    },
    
    ratesEqual: function(rate1, rate2, tolerancePercent = 2) {
        // Hourly rate comparison
        return this.costEqual(rate1, rate2, tolerancePercent);
    },
    
    quotesComparable: function(quote1, quote2, variancePercent = 5) {
        // Check if two quotes are within acceptable variance
        if (!quote1?.total || !quote2?.total) return false;
        return this.costEqual(quote1.total, quote2.total, variancePercent);
    },
    
    costWithinBudget: function(cost, budget, overrunAllowed = 0) {
        if (!Number.isFinite(cost) || !Number.isFinite(budget)) return false;
        return cost <= budget * (1 + overrunAllowed / 100);
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION J: Time Comparisons (5 new)
    // Sources: PRISM_CONSTANTS.TIME_ESTIMATION, production scheduling
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    timeEqual: function(time1, time2, toleranceSeconds = 1) {
        if (!Number.isFinite(time1) || !Number.isFinite(time2)) return false;
        return Math.abs(time1 - time2) <= toleranceSeconds;
    },
    
    cycleTimeNear: function(time1, time2, tolerancePercent = 5) {
        if (!Number.isFinite(time1) || !Number.isFinite(time2)) return false;
        if (time1 === 0 && time2 === 0) return true;
        const tolerance = Math.max(time1, time2) * (tolerancePercent / 100);
        return Math.abs(time1 - time2) <= tolerance;
    },
    
    durationWithinLimit: function(actual, limit) {
        if (!Number.isFinite(actual) || !Number.isFinite(limit)) return false;
        return actual <= limit;
    },
    
    setupTimesEqual: function(setup1, setup2, toleranceMinutes = 5) {
        return this.timeEqual(setup1, setup2, toleranceMinutes * 60);
    },
    
    scheduleSlotsOverlap: function(slot1, slot2) {
        if (!slot1?.start || !slot1?.end || !slot2?.start || !slot2?.end) return false;
        return slot1.start < slot2.end && slot2.start < slot1.end;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION K: Force/Torque/Power Comparisons (6 new)
    // Sources: PRISM_CONSTANTS.FORCE, machining dynamics
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    forceEqual: function(f1, f2, toleranceN = 1) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        return Math.abs(f1 - f2) <= toleranceN;
    },
    
    forcesNear: function(forces1, forces2, tolerancePercent = 5) {
        // Compare force vectors (Fc, Ff, Fr or Fx, Fy, Fz)
        const components = ['Fc', 'Ff', 'Fr', 'Fx', 'Fy', 'Fz', 'x', 'y', 'z'];
        for (const comp of components) {
            if (forces1[comp] !== undefined && forces2[comp] !== undefined) {
                const tol = Math.max(Math.abs(forces1[comp]), Math.abs(forces2[comp])) * (tolerancePercent / 100);
                if (Math.abs(forces1[comp] - forces2[comp]) > Math.max(tol, 0.1)) return false;
            }
        }
        return true;
    },
    
    torqueEqual: function(t1, t2, toleranceNm = 0.1) {
        if (!Number.isFinite(t1) || !Number.isFinite(t2)) return false;
        return Math.abs(t1 - t2) <= toleranceNm;
    },
    
    powerEqual: function(p1, p2, tolerancePercent = 2) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        if (p1 === 0 && p2 === 0) return true;
        const tolerance = Math.max(p1, p2) * (tolerancePercent / 100);
        return Math.abs(p1 - p2) <= tolerance;
    },
    
    forceWithinMachineLimit: function(force, machineMax) {
        if (!Number.isFinite(force) || !Number.isFinite(machineMax)) return false;
        return Math.abs(force) <= machineMax;
    },
    
    torqueSufficient: function(required, available) {
        if (!Number.isFinite(required) || !Number.isFinite(available)) return false;
        return available >= required;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION L: Temperature Comparisons (4 new)
    // Sources: PRISM_CONSTANTS.THERMAL, cutting temperature analysis
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    temperatureEqual: function(t1, t2, toleranceC = 1) {
        if (!Number.isFinite(t1) || !Number.isFinite(t2)) return false;
        return Math.abs(t1 - t2) <= toleranceC;
    },
    
    temperatureWithinLimit: function(temp, maxTemp) {
        if (!Number.isFinite(temp) || !Number.isFinite(maxTemp)) return false;
        return temp <= maxTemp;
    },
    
    thermalExpansionSignificant: function(deltaTemp, coefficient, length, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        // Check if thermal expansion exceeds tolerance
        const expansion = deltaTemp * coefficient * length;
        return Math.abs(expansion) > tolerance;
    },
    
    temperaturesInRange: function(temp, min, max) {
        if (!Number.isFinite(temp) || !Number.isFinite(min) || !Number.isFinite(max)) return false;
        return temp >= min && temp <= max;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION M: Milling-Specific Comparisons (5 new)
    // Sources: PRISM_CONSTANTS.MILLING, high-speed machining standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    stepoverEqual: function(s1, s2, tolerancePercent = 1) {
        // Stepover as percentage of tool diameter
        if (!Number.isFinite(s1) || !Number.isFinite(s2)) return false;
        return Math.abs(s1 - s2) <= tolerancePercent / 100;
    },
    
    helixAngleEqual: function(a1, a2, toleranceDeg = 1) {
        if (!Number.isFinite(a1) || !Number.isFinite(a2)) return false;
        return Math.abs(a1 - a2) <= toleranceDeg;
    },
    
    radialEngagementEqual: function(ae1, ae2, tolerancePercent = 2) {
        if (!Number.isFinite(ae1) || !Number.isFinite(ae2)) return false;
        return Math.abs(ae1 - ae2) <= tolerancePercent / 100;
    },
    
    rampAngleAcceptable: function(angle, maxAngle = PRISM_CONSTANTS.MILLING.RAMP_ANGLE_DEFAULT) {
        if (!Number.isFinite(angle)) return false;
        return angle <= maxAngle;
    },
    
    chipThinningApplies: function(ae_ratio, threshold = PRISM_CONSTANTS.MILLING.CHIP_THINNING_THRESHOLD) {
        // Check if chip thinning compensation needed
        if (!Number.isFinite(ae_ratio)) return false;
        return ae_ratio < threshold;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION N: Laser/Waterjet/Non-traditional Comparisons (6 new)
    // Sources: PRISM_CONSTANTS.LASER, PRISM_CONSTANTS.WATERJET
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    laserPowerEqual: function(p1, p2, toleranceW = 10) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        return Math.abs(p1 - p2) <= toleranceW;
    },
    
    kerfWidthsEqual: function(k1, k2, tolerance = 0.01) {
        if (!Number.isFinite(k1) || !Number.isFinite(k2)) return false;
        return Math.abs(k1 - k2) <= tolerance;
    },
    
    waterjetPressureEqual: function(p1, p2, toleranceMPa = 5) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        return Math.abs(p1 - p2) <= toleranceMPa;
    },
    
    qualityLevelsEqual: function(q1, q2) {
        return q1 === q2;
    },
    
    abrasiveFlowEqual: function(f1, f2, toleranceGmin = 10) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        return Math.abs(f1 - f2) <= toleranceGmin;
    },
    
    focusPositionsEqual: function(f1, f2, tolerance = 0.1) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        return Math.abs(f1 - f2) <= tolerance;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION O: Kinematics/Axis Comparisons (4 new)
    // Sources: PRISM_CONSTANTS.KINEMATICS, machine tool specifications
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    axisLimitsEqual: function(limits1, limits2, tolerance = 0.01) {
        if (!limits1 || !limits2) return false;
        return this.equal(limits1.min, limits2.min, tolerance) &&
               this.equal(limits1.max, limits2.max, tolerance);
    },
    
    positionWithinTravel: function(pos, axis) {
        if (!Number.isFinite(pos) || !axis) return false;
        return pos >= (axis.minTravel || axis.min) && pos <= (axis.maxTravel || axis.max);
    },
    
    backlashAcceptable: function(measured, maxAllowed = PRISM_CONSTANTS.KINEMATICS.BACKLASH_X) {
        if (!Number.isFinite(measured)) return false;
        return measured <= maxAllowed;
    },
    
    jerkWithinLimit: function(jerk, maxJerk = PRISM_CONSTANTS.KINEMATICS.JERK_LIMIT) {
        if (!Number.isFinite(jerk)) return false;
        return jerk <= maxJerk;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION P: Euler/Rotation/Orientation Comparisons (3 new)
    // Sources: Three.js, robotics standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    eulerAnglesEqual: function(e1, e2, toleranceRad = 0.001) {
        if (!e1 || !e2) return false;
        const props = ['x', 'y', 'z', 'roll', 'pitch', 'yaw'];
        for (const p of props) {
            if (e1[p] !== undefined && e2[p] !== undefined) {
                if (Math.abs(e1[p] - e2[p]) > toleranceRad) return false;
            }
        }
        return true;
    },
    
    orientationsEqual: function(o1, o2, tolerance = 0.001) {
        // Compare orientations (could be Euler, quaternion, or matrix)
        if (o1.x !== undefined && o1.w !== undefined) {
            return this.quaternionsEqual(o1, o2, tolerance);
        }
        return this.eulerAnglesEqual(o1, o2, tolerance);
    },
    
    rotationOrdersMatch: function(order1, order2) {
        return order1?.toUpperCase() === order2?.toUpperCase();
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION Q: Work Offset/Coordinate Comparisons (3 new)
    // Sources: G-code standards, CNC programming
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    workOffsetsEqual: function(wo1, wo2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!wo1 || !wo2) return false;
        const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
        for (const axis of axes) {
            if (wo1[axis] !== undefined && wo2[axis] !== undefined) {
                if (!this.equal(wo1[axis], wo2[axis], tolerance)) return false;
            }
        }
        return true;
    },
    
    offsetNumbersEqual: function(n1, n2) {
        return n1 === n2;
    },
    
    coordinateSystemsCompatible: function(cs1, cs2) {
        // Check if coordinate systems are same type
        if (!cs1 || !cs2) return false;
        return cs1.type === cs2.type && cs1.handedness === cs2.handedness;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION R: Tapping/Threading Comparisons (3 new)
    // Sources: PRISM_CONSTANTS.TAPPING, PRISM_CONSTANTS.THREADING
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    pitchEqual: function(p1, p2, tolerance = 0.001) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        return Math.abs(p1 - p2) <= tolerance;
    },
    
    threadSpecsMatch: function(t1, t2) {
        if (!t1 || !t2) return false;
        return this.pitchEqual(t1.pitch, t2.pitch) &&
               t1.type === t2.type &&
               (t1.class === t2.class || (!t1.class && !t2.class));
    },
    
    tapSizeCompatible: function(tap, hole) {
        if (!tap?.diameter || !hole?.diameter) return false;
        // Tap should be slightly larger than pilot hole
        return tap.diameter > hole.diameter && tap.diameter < hole.diameter * 1.3;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION S: Fixture/Clamping Comparisons (3 new)
    // Sources: PRISM_CONSTANTS.FIXTURE, workholding standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    clampForceEqual: function(f1, f2, toleranceN = 50) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        return Math.abs(f1 - f2) <= toleranceN;
    },
    
    clampForceSufficient: function(available, required, safetyFactor = PRISM_CONSTANTS.FIXTURE.SAFETY_FACTOR_CLAMP) {
        if (!Number.isFinite(available) || !Number.isFinite(required)) return false;
        return available >= required * safetyFactor;
    },
    
    frictionCoefficientsEqual: function(f1, f2, tolerance = 0.02) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        return Math.abs(f1 - f2) <= tolerance;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION T: Advanced Geometry Comparisons (8 new)
    // Sources: NURBS mathematics, mesh processing, CAD kernel standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    nurbsCurvesEqual: function(curve1, curve2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!curve1 || !curve2) return false;
        // Check degree
        if (curve1.degree !== curve2.degree) return false;
        // Check control points
        if (!this.controlPointsEqual(curve1.controlPoints, curve2.controlPoints, tolerance)) return false;
        // Check knot vectors
        if (!this.knotVectorsEqual(curve1.knots, curve2.knots, PRISM_CONSTANTS.TOLERANCE.PARAMETER)) return false;
        // Check weights if rational
        if (curve1.weights || curve2.weights) {
            if (!this.weightsArrayEqual(curve1.weights, curve2.weights, 1e-6)) return false;
        }
        return true;
    },
    
    nurbsSurfacesEqual: function(surf1, surf2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!surf1 || !surf2) return false;
        // Check degrees
        if (surf1.degreeU !== surf2.degreeU || surf1.degreeV !== surf2.degreeV) return false;
        // Check control point grid dimensions
        if (!surf1.controlPoints || !surf2.controlPoints) return false;
        if (surf1.controlPoints.length !== surf2.controlPoints.length) return false;
        // Compare control point grid
        for (let i = 0; i < surf1.controlPoints.length; i++) {
            if (!this.controlPointsEqual(surf1.controlPoints[i], surf2.controlPoints[i], tolerance)) return false;
        }
        return true;
    },
    
    controlPointsEqual: function(pts1, pts2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!Array.isArray(pts1) || !Array.isArray(pts2)) return false;
        if (pts1.length !== pts2.length) return false;
        for (let i = 0; i < pts1.length; i++) {
            if (!this.positionsEqual(pts1[i], pts2[i], tolerance)) return false;
        }
        return true;
    },
    
    weightsArrayEqual: function(w1, w2, tolerance = 1e-6) {
        if (!w1 && !w2) return true;
        if (!Array.isArray(w1) || !Array.isArray(w2)) return false;
        if (w1.length !== w2.length) return false;
        for (let i = 0; i < w1.length; i++) {
            if (Math.abs(w1[i] - w2[i]) > tolerance) return false;
        }
        return true;
    },
    
    meshesEqual: function(mesh1, mesh2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!mesh1 || !mesh2) return false;
        // Check vertex count
        if (mesh1.vertices?.length !== mesh2.vertices?.length) return false;
        // Check face count
        if (mesh1.faces?.length !== mesh2.faces?.length) return false;
        // Compare vertices
        if (!this.controlPointsEqual(mesh1.vertices, mesh2.vertices, tolerance)) return false;
        // Compare faces (index arrays)
        if (mesh1.faces && mesh2.faces) {
            for (let i = 0; i < mesh1.faces.length; i++) {
                if (!this.arraysEqual(mesh1.faces[i], mesh2.faces[i])) return false;
            }
        }
        return true;
    },
    
    trianglesEqual: function(tri1, tri2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!tri1 || !tri2) return false;
        // Check all 3 vertices match (in any order)
        const matched = [false, false, false];
        for (const v1 of [tri1.v0 || tri1[0], tri1.v1 || tri1[1], tri1.v2 || tri1[2]]) {
            for (let i = 0; i < 3; i++) {
                if (!matched[i]) {
                    const v2 = [tri2.v0 || tri2[0], tri2.v1 || tri2[1], tri2.v2 || tri2[2]][i];
                    if (this.positionsEqual(v1, v2, tolerance)) {
                        matched[i] = true;
                        break;
                    }
                }
            }
        }
        return matched.every(m => m);
    },
    
    arcsEqual: function(arc1, arc2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!arc1 || !arc2) return false;
        // Check centers
        if (!this.positionsEqual(arc1.center, arc2.center, tolerance)) return false;
        // Check radii
        if (!this.equal(arc1.radius, arc2.radius, tolerance)) return false;
        // Check angles
        const angleTol = PRISM_CONSTANTS.TOLERANCE.ANGLE;
        if (!this.anglesEqual(arc1.startAngle, arc2.startAngle, angleTol)) return false;
        if (!this.anglesEqual(arc1.endAngle, arc2.endAngle, angleTol)) return false;
        return true;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION U: Toolpath Comparisons (5 new)
    // Sources: PRISM_CONSTANTS.TOOLPATH, CAM toolpath standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    scallopsEqual: function(s1, s2, tolerance = PRISM_CONSTANTS.TOLERANCE.SURFACE_FINISH) {
        if (!Number.isFinite(s1) || !Number.isFinite(s2)) return false;
        return Math.abs(s1 - s2) <= tolerance;
    },
    
    clearanceHeightsEqual: function(h1, h2, tolerance = 0.1) {
        if (!Number.isFinite(h1) || !Number.isFinite(h2)) return false;
        return Math.abs(h1 - h2) <= tolerance;
    },
    
    cuspHeightsEqual: function(c1, c2, tolerance = 0.001) {
        if (!Number.isFinite(c1) || !Number.isFinite(c2)) return false;
        return Math.abs(c1 - c2) <= tolerance;
    },
    
    toolpathSegmentsEqual: function(seg1, seg2, tolerance = PRISM_CONSTANTS.TOLERANCE.POSITION) {
        if (!seg1 || !seg2) return false;
        // Check type
        if (seg1.type !== seg2.type) return false;
        // Check start/end points
        if (!this.positionsEqual(seg1.start, seg2.start, tolerance)) return false;
        if (!this.positionsEqual(seg1.end, seg2.end, tolerance)) return false;
        // If arc, check center
        if (seg1.type === 'arc' && seg2.type === 'arc') {
            if (!this.positionsEqual(seg1.center, seg2.center, tolerance)) return false;
        }
        return true;
    },
    
    feedratesEqual: function(f1, f2, tolerancePercent = 1) {
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) return false;
        if (f1 === 0 && f2 === 0) return true;
        const tolerance = Math.max(f1, f2) * (tolerancePercent / 100);
        return Math.abs(f1 - f2) <= tolerance;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION V: Simulation Comparisons (4 new)
    // Sources: PRISM_CONSTANTS.SIMULATION, FEA/CFD standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    simulationResolutionsEqual: function(r1, r2, tolerancePercent = 5) {
        if (!Number.isFinite(r1) || !Number.isFinite(r2)) return false;
        const tolerance = Math.max(r1, r2) * (tolerancePercent / 100);
        return Math.abs(r1 - r2) <= tolerance;
    },
    
    timeStepsEqual: function(t1, t2, tolerancePercent = 1) {
        if (!Number.isFinite(t1) || !Number.isFinite(t2)) return false;
        if (t1 === 0 && t2 === 0) return true;
        const tolerance = Math.max(t1, t2) * (tolerancePercent / 100);
        return Math.abs(t1 - t2) <= tolerance;
    },
    
    collisionTolerancesEqual: function(c1, c2, tolerance = 0.001) {
        if (!Number.isFinite(c1) || !Number.isFinite(c2)) return false;
        return Math.abs(c1 - c2) <= tolerance;
    },
    
    simulationConfigsCompatible: function(config1, config2) {
        if (!config1 || !config2) return false;
        // Check essential parameters match
        if (config1.type !== config2.type) return false;
        // Resolution should be similar
        if (config1.resolution && config2.resolution) {
            if (!this.simulationResolutionsEqual(config1.resolution, config2.resolution, 20)) return false;
        }
        return true;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION W: Statistical Comparisons (10 new) - Mathematical Maximum
    // Sources: Statistics, probability theory, SPC/Six Sigma
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    confidenceIntervalsOverlap: function(ci1, ci2) {
        // ci = { lower, upper } or { mean, margin }
        const l1 = ci1.lower !== undefined ? ci1.lower : ci1.mean - ci1.margin;
        const u1 = ci1.upper !== undefined ? ci1.upper : ci1.mean + ci1.margin;
        const l2 = ci2.lower !== undefined ? ci2.lower : ci2.mean - ci2.margin;
        const u2 = ci2.upper !== undefined ? ci2.upper : ci2.mean + ci2.margin;
        return l1 <= u2 && l2 <= u1;
    },
    
    variancesEqual: function(var1, var2, fCritical = 2.0) {
        // F-test for equality of variances
        if (!Number.isFinite(var1) || !Number.isFinite(var2) || var1 <= 0 || var2 <= 0) return false;
        const fRatio = Math.max(var1, var2) / Math.min(var1, var2);
        return fRatio <= fCritical;
    },
    
    probabilitiesEqual: function(p1, p2, tolerance = 0.01) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        if (p1 < 0 || p1 > 1 || p2 < 0 || p2 > 1) return false;
        return Math.abs(p1 - p2) <= tolerance;
    },
    
    distributionsSimilar: function(dist1, dist2, tolerance = 0.05) {
        // Compare distribution parameters (assumes same type)
        if (!dist1 || !dist2) return false;
        if (dist1.type !== dist2.type) return false;
        // For normal: compare mean and stdDev
        if (dist1.mean !== undefined && dist2.mean !== undefined) {
            const meanTol = Math.max(Math.abs(dist1.mean), Math.abs(dist2.mean)) * tolerance;
            if (Math.abs(dist1.mean - dist2.mean) > meanTol) return false;
        }
        if (dist1.stdDev !== undefined && dist2.stdDev !== undefined) {
            const stdTol = Math.max(dist1.stdDev, dist2.stdDev) * tolerance;
            if (Math.abs(dist1.stdDev - dist2.stdDev) > stdTol) return false;
        }
        return true;
    },
    
    meansStatisticallyEqual: function(mean1, std1, n1, mean2, std2, n2, alpha = 0.05) {
        // Two-sample t-test approximation
        const pooledSE = Math.sqrt((std1 * std1 / n1) + (std2 * std2 / n2));
        if (pooledSE === 0) return mean1 === mean2;
        const tStat = Math.abs(mean1 - mean2) / pooledSE;
        // Approximate critical value for large samples
        const tCritical = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
        return tStat <= tCritical;
    },
    
    cpkValuesEqual: function(cpk1, cpk2, tolerance = 0.1) {
        if (!Number.isFinite(cpk1) || !Number.isFinite(cpk2)) return false;
        return Math.abs(cpk1 - cpk2) <= tolerance;
    },
    
    cpkAcceptable: function(cpk, minCpk = 1.33) {
        if (!Number.isFinite(cpk)) return false;
        return cpk >= minCpk;
    },
    
    correlationsEqual: function(r1, r2, tolerance = 0.05) {
        // Compare correlation coefficients
        if (!Number.isFinite(r1) || !Number.isFinite(r2)) return false;
        if (r1 < -1 || r1 > 1 || r2 < -1 || r2 > 1) return false;
        return Math.abs(r1 - r2) <= tolerance;
    },
    
    correlationSignificant: function(r, n, alpha = 0.05) {
        // Test if correlation is statistically significant
        if (!Number.isFinite(r) || !Number.isFinite(n) || n < 3) return false;
        const tStat = r * Math.sqrt((n - 2) / (1 - r * r));
        const tCritical = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
        return Math.abs(tStat) >= tCritical;
    },
    
    percentileEqual: function(p1, p2, tolerance = 0.01) {
        if (!Number.isFinite(p1) || !Number.isFinite(p2)) return false;
        return Math.abs(p1 - p2) <= tolerance;
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECTION X: G-code/Post-Processor Comparisons (4 new)
    // Sources: RS274, ISO 6983, CNC programming standards
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    modalGroupsEqual: function(g1, g2) {
        // Compare modal G-code groups
        if (!g1 || !g2) return false;
        const groups = ['motion', 'plane', 'distance', 'feedrate', 'units', 'cutter_comp', 'tool_length', 'cycle', 'coordinate'];
        for (const group of groups) {
            if (g1[group] !== undefined && g2[group] !== undefined) {
                if (g1[group] !== g2[group]) return false;
            }
        }
        return true;
    },
    
    blockFormatsEqual: function(fmt1, fmt2) {
        if (!fmt1 || !fmt2) return false;
        return fmt1.lineNumbers === fmt2.lineNumbers &&
               fmt1.decimals === fmt2.decimals &&
               fmt1.leadingZeros === fmt2.leadingZeros;
    },
    
    gcodeCompatible: function(gcode1, gcode2) {
        // Check if two G-code dialects are compatible
        if (typeof gcode1 !== 'string' || typeof gcode2 !== 'string') return false;
        // Same code family is compatible
        return gcode1.toUpperCase() === gcode2.toUpperCase();
    },
    
    postProcessorsCompatible: function(post1, post2) {
        if (!post1 || !post2) return false;
        // Same controller family
        if (post1.controller !== post2.controller) return false;
        // Check critical settings
        return post1.format === post2.format;
    }
};
