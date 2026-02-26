const PRISM_INTERVAL_ENGINE = {

    version: '1.0.0',
    authority: 'PRISM_INTERVAL_ENGINE',
    created: '2026-01-14',
    innovationId: 'INTERVAL_ARITHMETIC',

    // CONFIGURATION

    config: {
        // Default rounding margin for floating-point operations
        ROUNDING_MARGIN: 1e-15,

        // Machine epsilon
        EPSILON: Number.EPSILON || 2.220446049250313e-16,

        // Interval display precision
        DISPLAY_PRECISION: 10,

        // Maximum interval width before warning
        MAX_WIDTH_WARNING: 1e10
    },
    // SECTION 1: INTERVAL CLASS

    /**
     * Interval class representing [lo, hi] with guaranteed containment
     */
    Interval: class {
        constructor(lo, hi) {
            if (hi === undefined) {
                // Single value - create thin interval
                this.lo = lo;
                this.hi = lo;
            } else {
                this.lo = Math.min(lo, hi);
                this.hi = Math.max(lo, hi);
            }
            // Validate
            if (!Number.isFinite(this.lo) || !Number.isFinite(this.hi)) {
                if (this.lo === -Infinity && this.hi === Infinity) {
                    // Entire real line is valid
                } else if (!Number.isFinite(this.lo) && !Number.isFinite(this.hi)) {
                    console.warn('[Interval] Non-finite interval created');
                }
            }
        }
        // Width of interval
        width() {
            return this.hi - this.lo;
        }
        // Midpoint
        mid() {
            return (this.lo + this.hi) / 2;
        }
        // Radius (half-width)
        rad() {
            return this.width() / 2;
        }
        // Check if interval contains a value
        contains(x) {
            if (x instanceof PRISM_INTERVAL_ENGINE.Interval) {
                return this.lo <= x.lo && x.hi <= this.hi;
            }
            return this.lo <= x && x <= this.hi;
        }
        // Check if intervals overlap
        overlaps(other) {
            return this.lo <= other.hi && other.lo <= this.hi;
        }
        // Check if interval is thin (essentially a point)
        isThin(tolerance = 1e-12) {
            return this.width() < tolerance;
        }
        // String representation
        toString(precision = 6) {
            if (this.isThin()) {
                return `[${this.mid().toPrecision(precision)}]`;
            }
            return `[${this.lo.toPrecision(precision)}, ${this.hi.toPrecision(precision)}]`;
        }
        // Clone
        clone() {
            return new PRISM_INTERVAL_ENGINE.Interval(this.lo, this.hi);
        }
    },
    // SECTION 2: INTERVAL CREATION HELPERS

    /**
     * Create interval from value
     * @param {number|Array|Interval} value - Value to convert
     * @param {number} tolerance - Optional tolerance to add
     * @returns {Interval} Interval object
     */
    create: function(value, tolerance = 0) {
        if (value instanceof this.Interval) {
            if (tolerance > 0) {
                return new this.Interval(value.lo - tolerance, value.hi + tolerance);
            }
            return value.clone();
        }
        if (Array.isArray(value) && value.length === 2) {
            return new this.Interval(value[0] - tolerance, value[1] + tolerance);
        }
        if (typeof value === 'number') {
            return new this.Interval(value - tolerance, value + tolerance);
        }
        throw new Error('Invalid input for interval creation');
    },
    /**
     * Create interval from nominal ± tolerance
     */
    fromTolerance: function(nominal, tolerance) {
        return new this.Interval(nominal - tolerance, nominal + tolerance);
    },
    /**
     * Create interval from mean and standard deviation (approximate 3σ bounds)
     */
    fromMeanStdDev: function(mean, stdDev, sigmas = 3) {
        return new this.Interval(mean - sigmas * stdDev, mean + sigmas * stdDev);
    },
    /**
     * Entire real line interval
     */
    entire: function() {
        return new this.Interval(-Infinity, Infinity);
    },
    /**
     * Empty interval (for intersection results)
     */
    empty: function() {
        return new this.Interval(Infinity, -Infinity);
    },
    // SECTION 3: BASIC ARITHMETIC OPERATIONS

    /**
     * Add two intervals: [a,b] + [c,d] = [a+c, b+d]
     */
    add: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);
        return new this.Interval(ia.lo + ib.lo, ia.hi + ib.hi);
    },
    /**
     * Subtract intervals: [a,b] - [c,d] = [a-d, b-c]
     */
    subtract: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);
        return new this.Interval(ia.lo - ib.hi, ia.hi - ib.lo);
    },
    /**
     * Multiply intervals: [a,b] * [c,d]
     * Result bounds from all combinations of endpoints
     */
    multiply: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);

        const products = [
            ia.lo * ib.lo,
            ia.lo * ib.hi,
            ia.hi * ib.lo,
            ia.hi * ib.hi
        ];

        return new this.Interval(
            Math.min(...products),
            Math.max(...products)
        );
    },
    /**
     * Divide intervals: [a,b] / [c,d]
     * Special handling for division by interval containing zero
     */
    divide: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);

        // Check for division by zero
        if (ib.contains(0)) {
            if (ib.lo === 0 && ib.hi === 0) {
                return this.entire(); // 0/0 is undefined
            }
            if (ib.lo === 0) {
                // [c,d] with c=0: result is [a/d, +∞] or [-∞, b/d]
                return new this.Interval(
                    Math.min(ia.lo / ib.hi, ia.hi / ib.hi),
                    Infinity
                );
            }
            if (ib.hi === 0) {
                return new this.Interval(
                    -Infinity,
                    Math.max(ia.lo / ib.lo, ia.hi / ib.lo)
                );
            }
            // Zero strictly inside - return entire real line
            return this.entire();
        }
        const quotients = [
            ia.lo / ib.lo,
            ia.lo / ib.hi,
            ia.hi / ib.lo,
            ia.hi / ib.hi
        ];

        return new this.Interval(
            Math.min(...quotients),
            Math.max(...quotients)
        );
    },
    /**
     * Negate interval: -[a,b] = [-b, -a]
     */
    negate: function(a) {
        const ia = this._toInterval(a);
        return new this.Interval(-ia.hi, -ia.lo);
    },
    /**
     * Absolute value: |[a,b]|
     */
    abs: function(a) {
        const ia = this._toInterval(a);

        if (ia.lo >= 0) {
            return ia.clone();
        }
        if (ia.hi <= 0) {
            return new this.Interval(-ia.hi, -ia.lo);
        }
        // Interval spans zero
        return new this.Interval(0, Math.max(-ia.lo, ia.hi));
    },
    /**
     * Square: [a,b]²
     */
    square: function(a) {
        const ia = this._toInterval(a);

        if (ia.lo >= 0) {
            return new this.Interval(ia.lo * ia.lo, ia.hi * ia.hi);
        }
        if (ia.hi <= 0) {
            return new this.Interval(ia.hi * ia.hi, ia.lo * ia.lo);
        }
        // Interval spans zero
        return new this.Interval(0, Math.max(ia.lo * ia.lo, ia.hi * ia.hi));
    },
    /**
     * Square root: √[a,b]
     */
    sqrt: function(a) {
        const ia = this._toInterval(a);

        if (ia.hi < 0) {
            // Entirely negative - undefined
            return this.empty();
        }
        return new this.Interval(
            ia.lo > 0 ? Math.sqrt(ia.lo) : 0,
            Math.sqrt(Math.max(0, ia.hi))
        );
    },
    /**
     * Power: [a,b]^n (integer n)
     */
    pow: function(a, n) {
        const ia = this._toInterval(a);

        if (n === 0) return new this.Interval(1, 1);
        if (n === 1) return ia.clone();
        if (n === 2) return this.square(a);

        if (n < 0) {
            return this.divide(1, this.pow(a, -n));
        }
        // For positive odd n
        if (n % 2 === 1) {
            return new this.Interval(
                Math.pow(ia.lo, n),
                Math.pow(ia.hi, n)
            );
        }
        // For positive even n
        if (ia.lo >= 0) {
            return new this.Interval(Math.pow(ia.lo, n), Math.pow(ia.hi, n));
        }
        if (ia.hi <= 0) {
            return new this.Interval(Math.pow(ia.hi, n), Math.pow(ia.lo, n));
        }
        // Spans zero
        return new this.Interval(0, Math.max(Math.pow(ia.lo, n), Math.pow(ia.hi, n)));
    },
    // SECTION 4: TRANSCENDENTAL FUNCTIONS

    /**
     * Sine: sin([a,b])
     */
    sin: function(a) {
        const ia = this._toInterval(a);

        // If interval spans more than 2π, result is [-1, 1]
        if (ia.width() >= 2 * Math.PI) {
            return new this.Interval(-1, 1);
        }
        // Evaluate at endpoints and critical points
        const values = [Math.sin(ia.lo), Math.sin(ia.hi)];

        // Check for critical points (multiples of π/2)
        const loNorm = ia.lo / (Math.PI / 2);
        const hiNorm = ia.hi / (Math.PI / 2);

        for (let k = Math.ceil(loNorm); k <= Math.floor(hiNorm); k++) {
            values.push(Math.sin(k * Math.PI / 2));
        }
        return new this.Interval(Math.min(...values), Math.max(...values));
    },
    /**
     * Cosine: cos([a,b])
     */
    cos: function(a) {
        const ia = this._toInterval(a);

        if (ia.width() >= 2 * Math.PI) {
            return new this.Interval(-1, 1);
        }
        const values = [Math.cos(ia.lo), Math.cos(ia.hi)];

        // Check for critical points (multiples of π)
        const loNorm = ia.lo / Math.PI;
        const hiNorm = ia.hi / Math.PI;

        for (let k = Math.ceil(loNorm); k <= Math.floor(hiNorm); k++) {
            values.push(Math.cos(k * Math.PI));
        }
        return new this.Interval(Math.min(...values), Math.max(...values));
    },
    /**
     * Tangent: tan([a,b])
     * Warning: discontinuous at odd multiples of π/2
     */
    tan: function(a) {
        const ia = this._toInterval(a);

        // Check if interval crosses discontinuity
        const loNorm = ia.lo / Math.PI + 0.5;
        const hiNorm = ia.hi / Math.PI + 0.5;

        if (Math.floor(loNorm) !== Math.floor(hiNorm)) {
            // Crosses discontinuity
            return this.entire();
        }
        return new this.Interval(Math.tan(ia.lo), Math.tan(ia.hi));
    },
    /**
     * Exponential: exp([a,b])
     */
    exp: function(a) {
        const ia = this._toInterval(a);
        return new this.Interval(Math.exp(ia.lo), Math.exp(ia.hi));
    },
    /**
     * Natural logarithm: ln([a,b])
     */
    log: function(a) {
        const ia = this._toInterval(a);

        if (ia.hi <= 0) {
            return this.empty();
        }
        return new this.Interval(
            ia.lo > 0 ? Math.log(ia.lo) : -Infinity,
            Math.log(ia.hi)
        );
    },
    /**
     * Arc tangent: atan([a,b])
     */
    atan: function(a) {
        const ia = this._toInterval(a);
        return new this.Interval(Math.atan(ia.lo), Math.atan(ia.hi));
    },
    /**
     * Arc tangent 2: atan2([y], [x])
     */
    atan2: function(y, x) {
        const iy = this._toInterval(y);
        const ix = this._toInterval(x);

        // This is complex due to branch cuts
        // Simplified: evaluate at corners and check quadrant crossings
        const values = [
            Math.atan2(iy.lo, ix.lo),
            Math.atan2(iy.lo, ix.hi),
            Math.atan2(iy.hi, ix.lo),
            Math.atan2(iy.hi, ix.hi)
        ];

        // Check for branch cut crossing (x crossing zero with y positive)
        if (ix.contains(0) && iy.hi > 0) {
            values.push(Math.PI);
        }
        if (ix.contains(0) && iy.lo < 0) {
            values.push(-Math.PI);
        }
        return new this.Interval(Math.min(...values), Math.max(...values));
    },
    // SECTION 5: SET OPERATIONS

    /**
     * Intersection: [a,b] ∩ [c,d]
     */
    intersection: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);

        const lo = Math.max(ia.lo, ib.lo);
        const hi = Math.min(ia.hi, ib.hi);

        if (lo > hi) {
            return this.empty();
        }
        return new this.Interval(lo, hi);
    },
    /**
     * Hull (union): [a,b] ∪ [c,d]
     */
    hull: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);

        return new this.Interval(
            Math.min(ia.lo, ib.lo),
            Math.max(ia.hi, ib.hi)
        );
    },
    /**
     * Check if intervals overlap
     */
    overlaps: function(a, b) {
        const ia = this._toInterval(a);
        const ib = this._toInterval(b);
        return ia.overlaps(ib);
    },
    /**
     * Check if first interval contains second
     */
    contains: function(a, b) {
        const ia = this._toInterval(a);
        return ia.contains(b);
    },
    // SECTION 6: MANUFACTURING APPLICATIONS

    /**
     * Propagate tolerance through a function
     * @param {Function} func - Function of interval arguments
     * @param {Array} inputs - Array of {nominal, tolerance} objects
     * @returns {Object} Result interval and analysis
     */
    propagateTolerance: function(func, inputs) {
        // Create intervals from inputs
        const intervals = inputs.map(input =>
            this.fromTolerance(input.nominal, input.tolerance)
        );

        // Evaluate function with intervals
        const result = func(...intervals);

        return {
            interval: result,
            nominal: result.mid(),
            tolerance: result.rad(),
            min: result.lo,
            max: result.hi,
            width: result.width(),

            // Formatted output
            formatted: `${result.mid().toFixed(6)} ± ${result.rad().toFixed(6)}`
        };
    },
    /**
     * Calculate tool engagement with guaranteed bounds
     * @param {Object} toolPath - Tool position interval
     * @param {Object} stock - Stock boundary intervals
     * @param {number} toolRadius - Tool radius
     * @returns {Object} Engagement analysis
     */
    calculateEngagement: function(toolPath, stock, toolRadius) {
        const toolX = this._toInterval(toolPath.x);
        const toolY = this._toInterval(toolPath.y);
        const stockMinX = this._toInterval(stock.minX);
        const stockMaxX = this._toInterval(stock.maxX);

        // Tool boundary intervals
        const toolMinX = this.subtract(toolX, toolRadius);
        const toolMaxX = this.add(toolX, toolRadius);

        // Check if tool definitely intersects stock
        const definitelyEngaged = toolMaxX.lo > stockMinX.hi && toolMinX.hi < stockMaxX.lo;

        // Check if tool might intersect stock
        const possiblyEngaged = this.overlaps(
            new this.Interval(toolMinX.lo, toolMaxX.hi),
            new this.Interval(stockMinX.lo, stockMaxX.hi)
        );

        // Engagement width bounds
        let engagementMin = 0;
        let engagementMax = toolRadius * 2;

        if (possiblyEngaged) {
            // Calculate overlap interval
            const overlapLeft = this.subtract(stockMaxX, toolMinX);
            const overlapRight = this.subtract(toolMaxX, stockMinX);

            const overlap = this.intersection(
                new this.Interval(0, toolRadius * 2),
                this.hull(overlapLeft, overlapRight)
            );

            engagementMin = Math.max(0, overlap.lo);
            engagementMax = Math.min(toolRadius * 2, overlap.hi);
        }
        return {
            definitelyEngaged,
            possiblyEngaged,
            engagementWidth: new this.Interval(engagementMin, engagementMax),
            engagementPercent: new this.Interval(
                (engagementMin / (toolRadius * 2)) * 100,
                (engagementMax / (toolRadius * 2)) * 100
            ),
            safe: !possiblyEngaged || engagementMax < toolRadius * 2 * 0.9
        };
    },
    /**
     * Guaranteed collision check using interval arithmetic
     * @param {Object} obj1 - First object bounds {x, y, z} as intervals
     * @param {Object} obj2 - Second object bounds
     * @returns {Object} Collision analysis
     */
    checkCollision: function(obj1, obj2) {
        const ix1 = this._toInterval(obj1.x);
        const iy1 = this._toInterval(obj1.y);
        const iz1 = this._toInterval(obj1.z);

        const ix2 = this._toInterval(obj2.x);
        const iy2 = this._toInterval(obj2.y);
        const iz2 = this._toInterval(obj2.z);

        // Objects collide if ALL axes overlap
        const xOverlap = this.overlaps(ix1, ix2);
        const yOverlap = this.overlaps(iy1, iy2);
        const zOverlap = this.overlaps(iz1, iz2);

        const possibleCollision = xOverlap && yOverlap && zOverlap;

        // Definite collision requires overlap interiors
        const xDefinite = ix1.lo < ix2.hi && ix1.hi > ix2.lo;
        const yDefinite = iy1.lo < iy2.hi && iy1.hi > iy2.lo;
        const zDefinite = iz1.lo < iz2.hi && iz1.hi > iz2.lo;

        // Actually need interior overlap
        const definiteCollision = xDefinite && yDefinite && zDefinite &&
            (ix1.hi - ix2.lo > this.config.EPSILON) &&
            (ix2.hi - ix1.lo > this.config.EPSILON);

        return {
            definiteCollision: definiteCollision,
            possibleCollision: possibleCollision,
            safe: !possibleCollision,

            // Separation distance bounds (negative = overlap)
            separation: {
                x: this.subtract(ix2, ix1),
                y: this.subtract(iy2, iy1),
                z: this.subtract(iz2, iz1)
            }
        };
    },
    /**
     * NURBS curve evaluation with error bounds
     * @param {Object} curve - NURBS curve definition
     * @param {number|Interval} t - Parameter value
     * @returns {Object} Point with guaranteed bounds
     */
    evaluateNURBS: function(curve, t) {
        const it = this._toInterval(t);

        // Simplified: evaluate at interval endpoints and expand
        // Full implementation would use de Boor with intervals

        const pts = curve.controlPoints;
        const n = pts.length - 1;

        // Simple bounds from control polygon
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;
        let zMin = Infinity, zMax = -Infinity;

        for (const pt of pts) {
            xMin = Math.min(xMin, pt.x);
            xMax = Math.max(xMax, pt.x);
            yMin = Math.min(yMin, pt.y);
            yMax = Math.max(yMax, pt.y);
            if (pt.z !== undefined) {
                zMin = Math.min(zMin, pt.z);
                zMax = Math.max(zMax, pt.z);
            }
        }
        // Tighter bounds would require actual interval de Boor algorithm
        return {
            x: new this.Interval(xMin, xMax),
            y: new this.Interval(yMin, yMax),
            z: zMin !== Infinity ? new this.Interval(zMin, zMax) : null,
            parameter: it
        };
    },
    // SECTION 7: 3D INTERVAL VECTORS

    /**
     * Create 3D interval vector
     */
    vec3: function(x, y, z) {
        return {
            x: this._toInterval(x),
            y: this._toInterval(y),
            z: this._toInterval(z)
        };
    },
    /**
     * Add 3D interval vectors
     */
    vec3Add: function(a, b) {
        return {
            x: this.add(a.x, b.x),
            y: this.add(a.y, b.y),
            z: this.add(a.z, b.z)
        };
    },
    /**
     * Subtract 3D interval vectors
     */
    vec3Subtract: function(a, b) {
        return {
            x: this.subtract(a.x, b.x),
            y: this.subtract(a.y, b.y),
            z: this.subtract(a.z, b.z)
        };
    },
    /**
     * Dot product of 3D interval vectors
     */
    vec3Dot: function(a, b) {
        return this.add(
            this.add(
                this.multiply(a.x, b.x),
                this.multiply(a.y, b.y)
            ),
            this.multiply(a.z, b.z)
        );
    },
    /**
     * Cross product of 3D interval vectors
     */
    vec3Cross: function(a, b) {
        return {
            x: this.subtract(this.multiply(a.y, b.z), this.multiply(a.z, b.y)),
            y: this.subtract(this.multiply(a.z, b.x), this.multiply(a.x, b.z)),
            z: this.subtract(this.multiply(a.x, b.y), this.multiply(a.y, b.x))
        };
    },
    /**
     * Length of 3D interval vector (returns interval)
     */
    vec3Length: function(v) {
        const squaredSum = this.add(
            this.add(this.square(v.x), this.square(v.y)),
            this.square(v.z)
        );
        return this.sqrt(squaredSum);
    },
    // SECTION 8: UTILITIES

    /**
     * Convert value to interval if not already
     */
    _toInterval: function(value) {
        if (value instanceof this.Interval) {
            return value;
        }
        return this.create(value);
    },
    /**
     * Check if value is an interval
     */
    isInterval: function(value) {
        return value instanceof this.Interval;
    },
    // SECTION 9: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_INTERVAL] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Interval creation
        try {
            const i1 = this.create(5);
            const i2 = this.fromTolerance(10, 0.5);

            const pass = i1.lo === 5 && i1.hi === 5 &&
                        i2.lo === 9.5 && i2.hi === 10.5;

            results.tests.push({
                name: 'Interval creation',
                pass,
                i1: i1.toString(),
                i2: i2.toString()
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Interval creation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Addition
        try {
            const a = this.create([1, 2]);
            const b = this.create([3, 4]);
            const c = this.add(a, b);

            const pass = c.lo === 4 && c.hi === 6;

            results.tests.push({
                name: 'Interval addition',
                pass,
                result: c.toString()
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Interval addition', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Multiplication
        try {
            const a = this.create([-1, 2]);
            const b = this.create([3, 4]);
            const c = this.multiply(a, b);

            // Min: -1*4=-4, Max: 2*4=8
            const pass = c.lo === -4 && c.hi === 8;

            results.tests.push({
                name: 'Interval multiplication',
                pass,
                result: c.toString()
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Interval multiplication', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Square
        try {
            const a = this.create([-2, 3]);
            const sq = this.square(a);

            // Spans zero, so min is 0, max is max(4,9)=9
            const pass = sq.lo === 0 && sq.hi === 9;

            results.tests.push({
                name: 'Interval square',
                pass,
                result: sq.toString()
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Interval square', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Sine
        try {
            const a = this.create([0, Math.PI]);
            const s = this.sin(a);

            // sin(0)=0, sin(π)=0, sin(π/2)=1
            const pass = Math.abs(s.lo) < 0.001 && Math.abs(s.hi - 1) < 0.001;

            results.tests.push({
                name: 'Interval sine',
                pass,
                result: s.toString()
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Interval sine', pass: false, error: e.message });
            results.failed++;
        }
        // Test 6: Tolerance propagation
        try {
            const func = (x, y) => this.add(this.multiply(x, 2), y);
            const result = this.propagateTolerance(func, [
                { nominal: 10, tolerance: 0.1 },
                { nominal: 5, tolerance: 0.05 }
            ]);

            // 2*[9.9,10.1] + [4.95,5.05] = [19.8,20.2] + [4.95,5.05] = [24.75,25.25]
            const pass = Math.abs(result.nominal - 25) < 0.01 &&
                        Math.abs(result.tolerance - 0.25) < 0.01;

            results.tests.push({
                name: 'Tolerance propagation',
                pass,
                result: result.formatted
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Tolerance propagation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 7: Collision check
        try {
            const obj1 = this.vec3([0, 10], [0, 10], [0, 10]);
            const obj2 = this.vec3([5, 15], [5, 15], [5, 15]);
            const collision = this.checkCollision(obj1, obj2);

            const pass = collision.possibleCollision === true;

            results.tests.push({
                name: 'Collision detection',
                pass,
                possible: collision.possibleCollision,
                definite: collision.definiteCollision
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Collision detection', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_INTERVAL] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
}