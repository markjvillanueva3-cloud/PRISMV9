/**
 * PRISM_MATH_FOUNDATIONS
 * Extracted from PRISM v8.89.002 monolith
 * References: 21
 * Category: math
 * Lines: 1722
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_MATH_FOUNDATIONS = {

    version: '1.0.0',
    phase: 'Phase 1: Mathematical Foundations',
    created: '2026-01-14',

    // SECTION 1: INTERVAL ARITHMETIC ENGINE (INDUSTRY FIRST)
    // Source: Moore (1966), PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Guaranteed bounds on ALL geometric calculations

    intervalArithmetic: {
        name: "Interval Arithmetic Engine",
        description: "Every calculation carries guaranteed bounds - no false negatives possible",
        industryFirst: true,

        // Basic Interval Operations
        // Interval representation: [lower, upper]
        // Invariant: lower <= true value <= upper

        // Create interval from value and tolerance
        create: function(value, tolerance = 0) {
            if (Array.isArray(value)) return value; // Already an interval
            return [value - Math.abs(tolerance), value + Math.abs(tolerance)];
        },
        // Create interval from min/max
        fromBounds: function(lower, upper) {
            return [Math.min(lower, upper), Math.max(lower, upper)];
        },
        // Get midpoint of interval
        mid: function(a) {
            return (a[0] + a[1]) / 2;
        },
        // Get width of interval
        width: function(a) {
            return a[1] - a[0];
        },
        // Check if intervals overlap
        overlaps: function(a, b) {
            return a[0] <= b[1] && b[0] <= a[1];
        },
        // Check if interval contains value
        contains: function(interval, value) {
            return interval[0] <= value && value <= interval[1];
        },
        // Addition: [a,b] + [c,d] = [a+c, b+d]
        add: function(a, b) {
            return [a[0] + b[0], a[1] + b[1]];
        },
        // Subtraction: [a,b] - [c,d] = [a-d, b-c]
        sub: function(a, b) {
            return [a[0] - b[1], a[1] - b[0]];
        },
        // Multiplication: consider all combinations
        mul: function(a, b) {
            const products = [
                a[0] * b[0], a[0] * b[1],
                a[1] * b[0], a[1] * b[1]
            ];
            return [Math.min(...products), Math.max(...products)];
        },
        // Division: handle interval containing zero
        div: function(a, b) {
            if (b[0] <= 0 && b[1] >= 0) {
                // Division by interval containing zero
                if (b[0] === 0 && b[1] === 0) {
                    return [NaN, NaN];
                } else if (b[0] === 0) {
                    return this.mul(a, [1/b[1], Infinity]);
                } else if (b[1] === 0) {
                    return this.mul(a, [-Infinity, 1/b[0]]);
                } else {
                    return [-Infinity, Infinity];
                }
            }
            return this.mul(a, [1/b[1], 1/b[0]]);
        },
        // Square root
        sqrt: function(a) {
            if (a[1] < 0) return [NaN, NaN]; // No real square root
            return [Math.sqrt(Math.max(0, a[0])), Math.sqrt(a[1])];
        },
        // Power (integer exponent)
        pow: function(a, n) {
            if (n === 0) return [1, 1];
            if (n === 1) return [...a];
            if (n < 0) return this.div([1, 1], this.pow(a, -n));

            if (n % 2 === 0) {
                // Even power - need to handle sign changes
                if (a[0] >= 0) {
                    return [Math.pow(a[0], n), Math.pow(a[1], n)];
                } else if (a[1] <= 0) {
                    return [Math.pow(a[1], n), Math.pow(a[0], n)];
                } else {
                    // Interval spans zero
                    return [0, Math.max(Math.pow(a[0], n), Math.pow(a[1], n))];
                }
            } else {
                // Odd power - monotonic
                return [Math.pow(a[0], n), Math.pow(a[1], n)];
            }
        },
        // Absolute value
        abs: function(a) {
            if (a[0] >= 0) return [...a];
            if (a[1] <= 0) return [-a[1], -a[0]];
            return [0, Math.max(-a[0], a[1])];
        },
        // Exponential
        exp: function(a) {
            return [Math.exp(a[0]), Math.exp(a[1])];
        },
        // Natural logarithm
        log: function(a) {
            if (a[1] <= 0) return [NaN, NaN];
            return [a[0] > 0 ? Math.log(a[0]) : -Infinity, Math.log(a[1])];
        },
        // Trigonometric Functions with Conservative Bounds

        sin: function(a) {
            const twoPi = 2 * Math.PI;
            const width = a[1] - a[0];

            // If interval spans full period, return [-1, 1]
            if (width >= twoPi) return [-1, 1];

            // Normalize to [0, 2π]
            const start = ((a[0] % twoPi) + twoPi) % twoPi;
            const end = start + width;

            let min = Math.min(Math.sin(a[0]), Math.sin(a[1]));
            let max = Math.max(Math.sin(a[0]), Math.sin(a[1]));

            // Check for extrema within interval
            const halfPi = Math.PI / 2;
            const threeHalfPi = 3 * Math.PI / 2;

            // Check maximum at π/2 + 2πk
            for (let k = 0; k <= Math.ceil(width / twoPi) + 1; k++) {
                const maxPoint = halfPi + k * twoPi;
                if (start <= maxPoint && maxPoint <= end) max = 1;
            }
            // Check minimum at 3π/2 + 2πk
            for (let k = 0; k <= Math.ceil(width / twoPi) + 1; k++) {
                const minPoint = threeHalfPi + k * twoPi;
                if (start <= minPoint && minPoint <= end) min = -1;
            }
            return [min, max];
        },
        cos: function(a) {
            // cos(x) = sin(x + π/2)
            return this.sin([a[0] + Math.PI/2, a[1] + Math.PI/2]);
        },
        tan: function(a) {
            const halfPi = Math.PI / 2;
            const period = Math.PI;

            // Check if interval contains asymptote
            const start = ((a[0] % period) + period) % period;
            const width = a[1] - a[0];

            if (width >= period || (start < halfPi && start + width > halfPi)) {
                return [-Infinity, Infinity];
            }
            return [Math.tan(a[0]), Math.tan(a[1])];
        },
        // Inverse trigonometric
        asin: function(a) {
            const lo = Math.max(-1, a[0]);
            const hi = Math.min(1, a[1]);
            if (lo > hi) return [NaN, NaN];
            return [Math.asin(lo), Math.asin(hi)];
        },
        acos: function(a) {
            const lo = Math.max(-1, a[0]);
            const hi = Math.min(1, a[1]);
            if (lo > hi) return [NaN, NaN];
            return [Math.acos(hi), Math.acos(lo)]; // acos is decreasing
        },
        atan: function(a) {
            return [Math.atan(a[0]), Math.atan(a[1])];
        },
        atan2: function(y, x) {
            // Conservative bounds for atan2
            const corners = [
                Math.atan2(y[0], x[0]),
                Math.atan2(y[0], x[1]),
                Math.atan2(y[1], x[0]),
                Math.atan2(y[1], x[1])
            ];

            // Check for discontinuity at ±π
            if (this.contains(x, 0) && this.contains(y, 0)) {
                return [-Math.PI, Math.PI];
            }
            return [Math.min(...corners), Math.max(...corners)];
        },
        // Vector Operations with Intervals

        // Vector addition
        vectorAdd: function(v1, v2) {
            return v1.map((a, i) => this.add(a, v2[i]));
        },
        // Vector subtraction
        vectorSub: function(v1, v2) {
            return v1.map((a, i) => this.sub(a, v2[i]));
        },
        // Scalar multiplication
        vectorScale: function(v, s) {
            return v.map(a => this.mul(a, s));
        },
        // Dot product
        dot: function(v1, v2) {
            let result = [0, 0];
            for (let i = 0; i < v1.length; i++) {
                result = this.add(result, this.mul(v1[i], v2[i]));
            }
            return result;
        },
        // Cross product (3D)
        cross: function(v1, v2) {
            return [
                this.sub(this.mul(v1[1], v2[2]), this.mul(v1[2], v2[1])),
                this.sub(this.mul(v1[2], v2[0]), this.mul(v1[0], v2[2])),
                this.sub(this.mul(v1[0], v2[1]), this.mul(v1[1], v2[0]))
            ];
        },
        // Vector length squared
        lengthSquared: function(v) {
            return this.dot(v, v);
        },
        // Vector length
        length: function(v) {
            return this.sqrt(this.lengthSquared(v));
        },
        // Normalize vector (returns interval vector)
        normalize: function(v) {
            const len = this.length(v);
            if (len[0] <= 0 && len[1] >= 0) {
                // Length interval contains zero - undefined direction
                return v.map(() => [-Infinity, Infinity]);
            }
            return v.map(a => this.div(a, len));
        },
        // Matrix Operations with Intervals

        // Matrix multiplication
        matrixMul: function(A, B) {
            const m = A.length;
            const n = B[0].length;
            const p = B.length;

            const C = [];
            for (let i = 0; i < m; i++) {
                C[i] = [];
                for (let j = 0; j < n; j++) {
                    let sum = [0, 0];
                    for (let k = 0; k < p; k++) {
                        sum = this.add(sum, this.mul(A[i][k], B[k][j]));
                    }
                    C[i][j] = sum;
                }
            }
            return C;
        },
        // Transform point by 4x4 matrix
        transformPoint: function(T, point) {
            // T is 4x4 interval matrix, point is [x, y, z]
            const p = [
                Array.isArray(point[0]) ? point[0] : [point[0], point[0]],
                Array.isArray(point[1]) ? point[1] : [point[1], point[1]],
                Array.isArray(point[2]) ? point[2] : [point[2], point[2]],
                [1, 1]
            ];

            const result = [];
            for (let i = 0; i < 3; i++) {
                let sum = [0, 0];
                for (let j = 0; j < 4; j++) {
                    sum = this.add(sum, this.mul(T[i][j], p[j]));
                }
                result.push(sum);
            }
            return result;
        },
        // COLLISION DETECTION with Guaranteed Results (INDUSTRY FIRST)

        /**
         * Interval-based collision check with guaranteed completeness
         * @param {Array} toolPosition - [[x_lo, x_hi], [y_lo, y_hi], [z_lo, z_hi]]
         * @param {Array} toolRadius - [r_lo, r_hi]
         * @param {Array} surfacePoints - Array of {x, y, z} points
         * @returns {Object} { safe: boolean, uncertain: boolean, collision: boolean }
         */
        intervalCollisionCheck: function(toolPosition, toolRadius, surfacePoints) {
            let minDistanceSquared = [Infinity, Infinity];
            let closestPoint = null;

            for (const point of surfacePoints) {
                // Distance squared from tool center to point
                const dx = this.sub(toolPosition[0], [point.x, point.x]);
                const dy = this.sub(toolPosition[1], [point.y, point.y]);
                const dz = this.sub(toolPosition[2], [point.z, point.z]);

                const distSq = this.add(
                    this.add(this.pow(dx, 2), this.pow(dy, 2)),
                    this.pow(dz, 2)
                );

                if (distSq[0] < minDistanceSquared[0]) {
                    minDistanceSquared = distSq;
                    closestPoint = point;
                }
            }
            const minDistance = this.sqrt(minDistanceSquared);

            // Compare with tool radius
            const margin = this.sub(minDistance, toolRadius);

            if (margin[0] > 0) {
                // Lower bound of distance > upper bound of radius
                // GUARANTEED SAFE
                return {
                    safe: true,
                    uncertain: false,
                    collision: false,
                    minDistance: minDistance,
                    margin: margin,
                    closestPoint: closestPoint
                };
            } else if (margin[1] < 0) {
                // Upper bound of distance < lower bound of radius
                // GUARANTEED COLLISION
                return {
                    safe: false,
                    uncertain: false,
                    collision: true,
                    minDistance: minDistance,
                    penetration: this.abs(margin),
                    closestPoint: closestPoint
                };
            } else {
                // Intervals overlap - UNCERTAIN
                return {
                    safe: false,
                    uncertain: true,
                    collision: false,
                    minDistance: minDistance,
                    margin: margin,
                    closestPoint: closestPoint,
                    recommendation: "Refine geometry or reduce tolerances"
                };
            }
        },
        /**
         * Sphere-sphere collision with intervals
         */
        sphereSphereCollision: function(center1, radius1, center2, radius2) {
            const dx = this.sub(center1[0], center2[0]);
            const dy = this.sub(center1[1], center2[1]);
            const dz = this.sub(center1[2], center2[2]);

            const distSq = this.add(this.add(this.pow(dx, 2), this.pow(dy, 2)), this.pow(dz, 2));
            const dist = this.sqrt(distSq);

            const sumRadii = this.add(radius1, radius2);
            const margin = this.sub(dist, sumRadii);

            if (margin[0] > 0) return { safe: true, uncertain: false, collision: false };
            if (margin[1] < 0) return { safe: false, uncertain: false, collision: true };
            return { safe: false, uncertain: true, collision: false };
        },
        /**
         * AABB-AABB collision with intervals
         */
        aabbCollision: function(min1, max1, min2, max2) {
            // Check overlap on each axis
            for (let i = 0; i < 3; i++) {
                const overlap = this.overlaps(
                    [min1[i][0], max1[i][1]],
                    [min2[i][0], max2[i][1]]
                );

                if (!overlap) {
                    return { safe: true, uncertain: false, collision: false };
                }
            }
            // All axes overlap - check if definitely colliding
            let definiteOverlap = true;
            for (let i = 0; i < 3; i++) {
                if (max1[i][0] < min2[i][1] || max2[i][0] < min1[i][1]) {
                    definiteOverlap = false;
                    break;
                }
            }
            if (definiteOverlap) {
                return { safe: false, uncertain: false, collision: true };
            }
            return { safe: false, uncertain: true, collision: false };
        },
        // STEP Parser Integration

        /**
         * Parse STEP coordinate with tolerance
         */
        parseCoordinate: function(value, tolerance = 1e-6) {
            const v = parseFloat(value);
            return [v - tolerance, v + tolerance];
        },
        /**
         * Compute interval bounding box from interval points
         */
        boundingBox: function(intervalPoints) {
            const min = [
                [Infinity, Infinity],
                [Infinity, Infinity],
                [Infinity, Infinity]
            ];
            const max = [
                [-Infinity, -Infinity],
                [-Infinity, -Infinity],
                [-Infinity, -Infinity]
            ];

            for (const p of intervalPoints) {
                for (let i = 0; i < 3; i++) {
                    min[i][0] = Math.min(min[i][0], p[i][0]);
                    min[i][1] = Math.min(min[i][1], p[i][1]);
                    max[i][0] = Math.max(max[i][0], p[i][0]);
                    max[i][1] = Math.max(max[i][1], p[i][1]);
                }
            }
            return { min, max };
        },
        // Manufacturing application reference
        prismApplication: "CollisionDetectionEngine - guaranteed complete collision detection, STEP tolerance analysis"
    },
    // SECTION 2: GAUSSIAN PROCESS ENGINE
    // Source: Rasmussen & Williams (2006), MIT 6.867, PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Probabilistic predictions with uncertainty bounds

    gaussianProcess: {
        name: "Gaussian Process Regression Engine",
        description: "Probabilistic predictions with uncertainty bounds for manufacturing",

        // Kernel Functions

        kernels: {
            /**
             * RBF (Squared Exponential) kernel - infinitely differentiable
             * k(x1, x2) = σ² * exp(-||x1-x2||² / (2*l²))
             */
            rbf: function(x1, x2, lengthScale = 1, variance = 1) {
                let sqDist = 0;
                for (let i = 0; i < x1.length; i++) {
                    sqDist += (x1[i] - x2[i]) ** 2;
                }
                return variance * Math.exp(-0.5 * sqDist / (lengthScale ** 2));
            },
            /**
             * Matern 3/2 kernel - once differentiable
             * Good for rough functions
             */
            matern32: function(x1, x2, lengthScale = 1, variance = 1) {
                let dist = 0;
                for (let i = 0; i < x1.length; i++) {
                    dist += (x1[i] - x2[i]) ** 2;
                }
                dist = Math.sqrt(dist);
                const r = Math.sqrt(3) * dist / lengthScale;
                return variance * (1 + r) * Math.exp(-r);
            },
            /**
             * Matern 5/2 kernel - twice differentiable
             * Good balance between RBF and Matern 3/2
             */
            matern52: function(x1, x2, lengthScale = 1, variance = 1) {
                let dist = 0;
                for (let i = 0; i < x1.length; i++) {
                    dist += (x1[i] - x2[i]) ** 2;
                }
                dist = Math.sqrt(dist);
                const r = Math.sqrt(5) * dist / lengthScale;
                return variance * (1 + r + r * r / 3) * Math.exp(-r);
            },
            /**
             * Rational Quadratic kernel
             * Equivalent to infinite mixture of RBF kernels
             */
            rationalQuadratic: function(x1, x2, lengthScale = 1, variance = 1, alpha = 1) {
                let sqDist = 0;
                for (let i = 0; i < x1.length; i++) {
                    sqDist += (x1[i] - x2[i]) ** 2;
                }
                return variance * Math.pow(1 + sqDist / (2 * alpha * lengthScale ** 2), -alpha);
            },
            /**
             * Periodic kernel - for repeating patterns
             */
            periodic: function(x1, x2, lengthScale = 1, variance = 1, period = 1) {
                let dist = 0;
                for (let i = 0; i < x1.length; i++) {
                    dist += (x1[i] - x2[i]) ** 2;
                }
                dist = Math.sqrt(dist);
                const sinTerm = Math.sin(Math.PI * dist / period);
                return variance * Math.exp(-2 * sinTerm * sinTerm / (lengthScale ** 2));
            },
            /**
             * Linear kernel - for linear relationships
             */
            linear: function(x1, x2, variance = 1, offset = 0) {
                let dotProduct = 0;
                for (let i = 0; i < x1.length; i++) {
                    dotProduct += (x1[i] - offset) * (x2[i] - offset);
                }
                return variance * dotProduct;
            }
        },
        // Matrix Operations

        /**
         * Compute kernel matrix K(X1, X2)
         */
        kernelMatrix: function(X1, X2, kernel, params) {
            const n1 = X1.length;
            const n2 = X2.length;
            const K = [];

            for (let i = 0; i < n1; i++) {
                K[i] = [];
                for (let j = 0; j < n2; j++) {
                    K[i][j] = kernel(X1[i], X2[j], params.lengthScale, params.variance, params.alpha);
                }
            }
            return K;
        },
        /**
         * Cholesky decomposition: A = L * L^T
         * Returns lower triangular matrix L
         */
        cholesky: function(A) {
            const n = A.length;
            const L = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = 0; j <= i; j++) {
                    let sum = 0;
                    for (let k = 0; k < j; k++) {
                        sum += L[i][k] * L[j][k];
                    }
                    if (i === j) {
                        const diag = A[i][i] - sum;
                        if (diag < 0) {
                            // Add jitter for numerical stability
                            L[i][j] = Math.sqrt(Math.max(diag + 1e-6, 1e-10));
                        } else {
                            L[i][j] = Math.sqrt(diag);
                        }
                    } else {
                        L[i][j] = (A[i][j] - sum) / L[j][j];
                    }
                }
            }
            return L;
        },
        /**
         * Solve L * x = b (forward substitution)
         */
        forwardSolve: function(L, b) {
            const n = L.length;
            const x = new Array(n);

            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < i; j++) {
                    sum += L[i][j] * x[j];
                }
                x[i] = (b[i] - sum) / L[i][i];
            }
            return x;
        },
        /**
         * Solve L^T * x = b (backward substitution)
         */
        backwardSolve: function(L, b) {
            const n = L.length;
            const x = new Array(n);

            for (let i = n - 1; i >= 0; i--) {
                let sum = 0;
                for (let j = i + 1; j < n; j++) {
                    sum += L[j][i] * x[j];
                }
                x[i] = (b[i] - sum) / L[i][i];
            }
            return x;
        },
        // Training and Prediction

        /**
         * Train GP model
         * @param {Array} X - Training inputs (n x d)
         * @param {Array} y - Training outputs (n x 1)
         * @param {string} kernelType - Kernel type ('rbf', 'matern32', 'matern52', etc.)
         * @param {Object} params - Kernel parameters
         * @returns {Object} Trained model
         */
        train: function(X, y, kernelType = 'rbf', params = {}) {
            const kernel = this.kernels[kernelType];
            const { lengthScale = 1, variance = 1, noiseVariance = 0.01, alpha = 1 } = params;

            // Compute kernel matrix
            const K = this.kernelMatrix(X, X, kernel, { lengthScale, variance, alpha });

            // Add noise to diagonal
            for (let i = 0; i < K.length; i++) {
                K[i][i] += noiseVariance;
            }
            // Cholesky decomposition
            const L = this.cholesky(K);

            // Solve for alpha = K^-1 * y using Cholesky
            // K * alpha = y
            // L * L^T * alpha = y
            // L * z = y, then L^T * alpha = z
            const z = this.forwardSolve(L, y);
            const alpha_vec = this.backwardSolve(L, z);

            // Compute log marginal likelihood for model selection
            let logDetK = 0;
            for (let i = 0; i < L.length; i++) {
                logDetK += 2 * Math.log(L[i][i]);
            }
            const n = y.length;
            let dataFit = 0;
            for (let i = 0; i < n; i++) {
                dataFit += y[i] * alpha_vec[i];
            }
            const logMarginalLikelihood = -0.5 * dataFit - 0.5 * logDetK - 0.5 * n * Math.log(2 * Math.PI);

            return {
                X_train: X,
                y_train: y,
                L: L,
                alpha: alpha_vec,
                kernel: kernel,
                kernelType: kernelType,
                params: { lengthScale, variance, noiseVariance, alpha },
                logMarginalLikelihood: logMarginalLikelihood
            };
        },
        /**
         * Predict with trained GP model
         * @param {Object} model - Trained GP model
         * @param {Array} X_new - Test inputs (m x d)
         * @returns {Array} Predictions with uncertainty
         */
        predict: function(model, X_new) {
            const { X_train, alpha, L, kernel, params } = model;

            const predictions = [];

            for (const x of X_new) {
                // Compute k* (kernel between x and training points)
                const kStar = X_train.map(xi =>
                    kernel(x, xi, params.lengthScale, params.variance, params.alpha)
                );

                // Mean: μ = k*^T * α
                const mean = kStar.reduce((sum, k, i) => sum + k * alpha[i], 0);

                // Variance: σ² = k(x,x) - k*^T * K^-1 * k*
                const kxx = kernel(x, x, params.lengthScale, params.variance, params.alpha);
                const v = this.forwardSolve(L, kStar);
                const variance = kxx - v.reduce((sum, vi) => sum + vi * vi, 0);

                const stdDev = Math.sqrt(Math.max(variance, 0));

                predictions.push({
                    mean: mean,
                    variance: Math.max(variance, 0),
                    stdDev: stdDev,
                    confidence95: [
                        mean - 1.96 * stdDev,
                        mean + 1.96 * stdDev
                    ],
                    confidence99: [
                        mean - 2.576 * stdDev,
                        mean + 2.576 * stdDev
                    ]
                });
            }
            return predictions;
        },
        // Manufacturing Applications

        /**
         * Predict cutting parameters with uncertainty
         */
        predictCuttingParameters: function(historicalData, newConditions) {
            // historicalData: [{features: [...], result: value}, ...]
            // newConditions: [[features], [features], ...]

            const X = historicalData.map(d => d.features);
            const y = historicalData.map(d => d.result);

            // Normalize features
            const featureMeans = X[0].map((_, i) =>
                X.reduce((sum, x) => sum + x[i], 0) / X.length
            );
            const featureStds = X[0].map((_, i) => {
                const mean = featureMeans[i];
                const variance = X.reduce((sum, x) => sum + (x[i] - mean) ** 2, 0) / X.length;
                return Math.sqrt(variance) || 1;
            });

            const X_norm = X.map(x => x.map((v, i) => (v - featureMeans[i]) / featureStds[i]));
            const X_new_norm = newConditions.map(x => x.map((v, i) => (v - featureMeans[i]) / featureStds[i]));

            // Train and predict
            const model = this.train(X_norm, y, 'matern52', {
                lengthScale: 1,
                variance: 1,
                noiseVariance: 0.1
            });
            const predictions = this.predict(model, X_new_norm);

            return predictions.map((p, i) => ({
                conditions: newConditions[i],
                predictedValue: p.mean,
                uncertainty: p.stdDev,
                confidence95: p.confidence95,
                reliable: p.stdDev < Math.abs(p.mean) * 0.2 // <20% relative uncertainty
            }));
        },
        /**
         * Predict surface uncertainty from probe data
         */
        predictSurfaceUncertainty: function(probePoints, probeValues, queryPoints) {
            // probePoints: [[x, y], ...]
            // probeValues: [z, ...]
            // queryPoints: [[x, y], ...]

            const model = this.train(probePoints, probeValues, 'rbf', {
                lengthScale: 10, // Adjust based on probe spacing
                variance: 1,
                noiseVariance: 0.001 // Probe measurement noise
            });

            return this.predict(model, queryPoints);
        },
        /**
         * Predict tool wear from cutting history
         */
        predictToolWear: function(cuttingHistory, newConditions) {
            // cuttingHistory: [{cutLength, feedRate, speed, material, wear}, ...]
            const X = cuttingHistory.map(h => [h.cutLength, h.feedRate, h.speed, h.materialHardness]);
            const y = cuttingHistory.map(h => h.wear);

            return this.predictCuttingParameters(
                cuttingHistory.map((h, i) => ({ features: X[i], result: y[i] })),
                newConditions
            );
        },
        prismApplication: "PredictionEngine - cutting parameters, surface quality, tool wear with confidence intervals"
    },
    // SECTION 3: KRIGING INTERPOLATION ENGINE
    // Source: Matheron (1963), Geostatistics, PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Optimal spatial interpolation for surface reconstruction

    kriging: {
        name: "Kriging Interpolation Engine",
        description: "Optimal linear unbiased prediction for spatial data - Best Linear Unbiased Estimator (BLUE)",

        // Variogram Models
        // γ(h) = semivariance as function of distance h

        variogramModels: {
            /**
             * Spherical variogram - most common
             * γ(h) = nugget + sill * [1.5*(h/range) - 0.5*(h/range)³] for h < range
             * γ(h) = nugget + sill for h >= range
             */
            spherical: function(h, range, sill, nugget = 0) {
                if (h === 0) return 0;
                if (h >= range) return sill + nugget;
                const ratio = h / range;
                return nugget + sill * (1.5 * ratio - 0.5 * ratio * ratio * ratio);
            },
            /**
             * Exponential variogram - approaches sill asymptotically
             * γ(h) = nugget + sill * [1 - exp(-3h/range)]
             */
            exponential: function(h, range, sill, nugget = 0) {
                if (h === 0) return 0;
                return nugget + sill * (1 - Math.exp(-3 * h / range));
            },
            /**
             * Gaussian variogram - very smooth
             * γ(h) = nugget + sill * [1 - exp(-3(h/range)²)]
             */
            gaussian: function(h, range, sill, nugget = 0) {
                if (h === 0) return 0;
                return nugget + sill * (1 - Math.exp(-3 * (h / range) ** 2));
            },
            /**
             * Power variogram - no sill (unbounded)
             * γ(h) = nugget + slope * h^power
             */
            power: function(h, slope, power, nugget = 0) {
                if (h === 0) return 0;
                return nugget + slope * Math.pow(h, power);
            },
            /**
             * Linear variogram
             * γ(h) = nugget + slope * h
             */
            linear: function(h, slope, _, nugget = 0) {
                if (h === 0) return 0;
                return nugget + slope * h;
            }
        },
        // Distance and Utility Functions

        /**
         * Euclidean distance
         */
        distance: function(p1, p2) {
            let sum = 0;
            for (let i = 0; i < p1.length; i++) {
                sum += (p1[i] - p2[i]) ** 2;
            }
            return Math.sqrt(sum);
        },
        /**
         * Fit variogram to data using method of moments
         */
        fitVariogram: function(points, values, numBins = 15, modelType = 'spherical') {
            const n = points.length;
            const distances = [];
            const semivariances = [];

            // Compute all pairwise distances and semivariances
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    distances.push(this.distance(points[i], points[j]));
                    semivariances.push(0.5 * (values[i] - values[j]) ** 2);
                }
            }
            if (distances.length === 0) {
                return { model: modelType, range: 1, sill: 1, nugget: 0 };
            }
            // Bin by distance
            const maxDist = Math.max(...distances);
            const binWidth = maxDist / numBins;
            const bins = Array(numBins).fill(0).map(() => ({ sum: 0, count: 0, distSum: 0 }));

            for (let i = 0; i < distances.length; i++) {
                const binIndex = Math.min(Math.floor(distances[i] / binWidth), numBins - 1);
                bins[binIndex].sum += semivariances[i];
                bins[binIndex].distSum += distances[i];
                bins[binIndex].count++;
            }
            // Compute empirical variogram
            const empirical = bins
                .map((bin, i) => ({
                    distance: bin.count > 0 ? bin.distSum / bin.count : (i + 0.5) * binWidth,
                    semivariance: bin.count > 0 ? bin.sum / bin.count : 0,
                    count: bin.count
                }))
                .filter(b => b.count > 0 && b.semivariance > 0);

            if (empirical.length < 2) {
                const variance = values.reduce((sum, v) => {
                    const mean = values.reduce((s, x) => s + x, 0) / values.length;
                    return sum + (v - mean) ** 2;
                }, 0) / values.length;
                return { model: modelType, range: maxDist / 2, sill: variance, nugget: 0, empirical: [] };
            }
            // Estimate sill (plateau value)
            const sill = empirical[empirical.length - 1].semivariance;

            // Estimate range (distance where ~95% of sill is reached)
            let range = maxDist / 2;
            for (let i = 0; i < empirical.length; i++) {
                if (empirical[i].semivariance >= 0.95 * sill) {
                    range = empirical[i].distance;
                    break;
                }
            }
            // Estimate nugget (intercept)
            const nugget = empirical.length > 0 && empirical[0].distance > 0 ?
                Math.max(0, empirical[0].semivariance - sill * 0.1) : 0;

            return {
                model: modelType,
                range: range,
                sill: sill,
                nugget: nugget,
                empirical: empirical
            };
        },
        /**
         * Simple Gaussian elimination solver
         */
        solveSystem: function(A, b) {
            const n = A.length;
            const aug = A.map((row, i) => [...row, b[i]]);

            // Forward elimination with partial pivoting
            for (let i = 0; i < n; i++) {
                // Find pivot
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

                if (Math.abs(aug[i][i]) < 1e-12) continue; // Skip singular

                // Eliminate
                for (let k = i + 1; k < n; k++) {
                    const factor = aug[k][i] / aug[i][i];
                    for (let j = i; j <= n; j++) {
                        aug[k][j] -= factor * aug[i][j];
                    }
                }
            }
            // Back substitution
            const x = new Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                if (Math.abs(aug[i][i]) < 1e-12) continue;
                x[i] = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    x[i] -= aug[i][j] * x[j];
                }
                x[i] /= aug[i][i];
            }
            return x;
        },
        // Kriging Methods

        /**
         * Ordinary Kriging - unknown constant mean
         * @param {Array} knownPoints - Known data locations [[x,y], ...]
         * @param {Array} knownValues - Known data values [z, ...]
         * @param {Array} unknownPoint - Location to estimate [x, y]
         * @param {Object} variogramParams - {model, range, sill, nugget}
         * @returns {Object} {value, variance, stdDev, weights}
         */
        ordinaryKriging: function(knownPoints, knownValues, unknownPoint, variogramParams) {
            const n = knownPoints.length;
            const { model, range, sill, nugget } = variogramParams;
            const variogram = this.variogramModels[model];

            // Build kriging matrix [C | 1]
            //                      [1 | 0]
            // where C[i][j] = sill + nugget - γ(h_ij)  (covariance)
            const C = [];
            for (let i = 0; i <= n; i++) {
                C[i] = [];
                for (let j = 0; j <= n; j++) {
                    if (i === n && j === n) {
                        C[i][j] = 0; // Lagrange multiplier constraint
                    } else if (i === n || j === n) {
                        C[i][j] = 1; // Unbiasedness constraint
                    } else {
                        const h = this.distance(knownPoints[i], knownPoints[j]);
                        // Covariance = sill + nugget - semivariance
                        C[i][j] = sill + nugget - variogram(h, range, sill, nugget);
                    }
                }
            }
            // Build right-hand side (covariances to unknown point)
            const c = [];
            for (let i = 0; i < n; i++) {
                const h = this.distance(knownPoints[i], unknownPoint);
                c[i] = sill + nugget - variogram(h, range, sill, nugget);
            }
            c[n] = 1; // Unbiasedness constraint

            // Solve system for weights
            const weights = this.solveSystem(C, c);

            // Compute estimate
            let estimate = 0;
            for (let i = 0; i < n; i++) {
                estimate += weights[i] * knownValues[i];
            }
            // Compute kriging variance
            let variance = sill + nugget; // C(0,0)
            for (let i = 0; i < n; i++) {
                variance -= weights[i] * c[i];
            }
            variance -= weights[n]; // Lagrange multiplier contribution

            return {
                value: estimate,
                variance: Math.max(variance, 0),
                stdDev: Math.sqrt(Math.max(variance, 0)),
                weights: weights.slice(0, n),
                lagrangeMultiplier: weights[n]
            };
        },
        /**
         * Simple Kriging - known constant mean
         */
        simpleKriging: function(knownPoints, knownValues, unknownPoint, variogramParams, mean) {
            const n = knownPoints.length;
            const { model, range, sill, nugget } = variogramParams;
            const variogram = this.variogramModels[model];

            // Build covariance matrix
            const C = [];
            for (let i = 0; i < n; i++) {
                C[i] = [];
                for (let j = 0; j < n; j++) {
                    const h = this.distance(knownPoints[i], knownPoints[j]);
                    C[i][j] = sill + nugget - variogram(h, range, sill, nugget);
                }
            }
            // Build covariance vector to unknown point
            const c = [];
            for (let i = 0; i < n; i++) {
                const h = this.distance(knownPoints[i], unknownPoint);
                c[i] = sill + nugget - variogram(h, range, sill, nugget);
            }
            // Solve for weights
            const weights = this.solveSystem(C, c);

            // Compute estimate
            let estimate = mean;
            for (let i = 0; i < n; i++) {
                estimate += weights[i] * (knownValues[i] - mean);
            }
            // Compute variance
            let variance = sill + nugget;
            for (let i = 0; i < n; i++) {
                variance -= weights[i] * c[i];
            }
            return {
                value: estimate,
                variance: Math.max(variance, 0),
                stdDev: Math.sqrt(Math.max(variance, 0)),
                weights: weights
            };
        },
        /**
         * Interpolate entire grid
         */
        interpolateGrid: function(knownPoints, knownValues, gridBounds, gridResolution) {
            // Fit variogram
            const variogramParams = this.fitVariogram(knownPoints, knownValues);

            const { minX, maxX, minY, maxY } = gridBounds;
            const nx = Math.ceil((maxX - minX) / gridResolution) + 1;
            const ny = Math.ceil((maxY - minY) / gridResolution) + 1;

            const grid = {
                values: [],
                variances: [],
                nx: nx,
                ny: ny,
                bounds: gridBounds,
                resolution: gridResolution,
                variogram: variogramParams
            };
            for (let j = 0; j < ny; j++) {
                const row = [];
                const varRow = [];
                for (let i = 0; i < nx; i++) {
                    const x = minX + i * gridResolution;
                    const y = minY + j * gridResolution;

                    const result = this.ordinaryKriging(
                        knownPoints,
                        knownValues,
                        [x, y],
                        variogramParams
                    );

                    row.push(result.value);
                    varRow.push(result.variance);
                }
                grid.values.push(row);
                grid.variances.push(varRow);
            }
            return grid;
        },
        // Manufacturing Applications

        /**
         * Interpolate probe data for surface reconstruction
         */
        interpolateProbeData: function(probePoints, probeValues, queryPoints) {
            const variogramParams = this.fitVariogram(probePoints, probeValues);

            return queryPoints.map(qp => {
                const result = this.ordinaryKriging(probePoints, probeValues, qp, variogramParams);
                return {
                    point: qp,
                    value: result.value,
                    uncertainty: result.stdDev,
                    confidence95: [result.value - 1.96 * result.stdDev, result.value + 1.96 * result.stdDev]
                };
            });
        },
        /**
         * Reconstruct surface from sparse probe points
         */
        reconstructSurface: function(probePoints, probeValues, resolution) {
            // Find bounding box
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const p of probePoints) {
                minX = Math.min(minX, p[0]);
                maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]);
                maxY = Math.max(maxY, p[1]);
            }
            // Add margin
            const margin = resolution * 2;
            const bounds = {
                minX: minX - margin,
                maxX: maxX + margin,
                minY: minY - margin,
                maxY: maxY + margin
            };
            return this.interpolateGrid(probePoints, probeValues, bounds, resolution);
        },
        prismApplication: "SurfaceReconstructionEngine - optimal probe data interpolation, uncertainty mapping"
    },
    // SECTION 4: SPECTRAL GRAPH ANALYSIS ENGINE (INDUSTRY FIRST)
    // Source: Chung (1997), MIT 18.409, PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Automatic part decomposition using graph Laplacian eigenvectors

    spectralGraph: {
        name: "Spectral Graph Analysis Engine",
        description: "Use eigenvalues of graph Laplacian for automatic part decomposition and feature grouping",
        industryFirst: true,

        // Graph Construction

        /**
         * Build adjacency matrix from face connectivity
         * @param {Array} faces - Array of face objects
         * @param {Object} faceNeighbors - Map of face index to neighbor indices
         * @returns {Array} Adjacency matrix A
         */
        buildAdjacencyMatrix: function(faces, faceNeighbors) {
            const n = faces.length;
            const A = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                const neighbors = faceNeighbors[i] || [];
                for (const neighbor of neighbors) {
                    if (neighbor >= 0 && neighbor < n) {
                        A[i][neighbor] = 1;
                        A[neighbor][i] = 1;
                    }
                }
            }
            return A;
        },
        /**
         * Build weighted adjacency matrix (weight by dihedral angle)
         * @param {Array} faces - Array of face objects
         * @param {Object} faceNeighbors - Map of face index to neighbor indices
         * @param {Array} faceNormals - Array of normal vectors [[nx,ny,nz], ...]
         * @returns {Array} Weighted adjacency matrix W
         */
        buildWeightedAdjacency: function(faces, faceNeighbors, faceNormals) {
            const n = faces.length;
            const W = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                const neighbors = faceNeighbors[i] || [];
                for (const neighbor of neighbors) {
                    if (neighbor >= 0 && neighbor < n && neighbor !== i) {
                        // Weight based on dihedral angle
                        const n1 = faceNormals[i];
                        const n2 = faceNormals[neighbor];

                        if (n1 && n2) {
                            const dot = n1[0]*n2[0] + n1[1]*n2[1] + n1[2]*n2[2];
                            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

                            // Higher weight for smooth transitions (similar normals)
                            // Sigma controls the falloff rate
                            const sigma = 0.5;
                            W[i][neighbor] = Math.exp(-angle / sigma);
                            W[neighbor][i] = W[i][neighbor];
                        } else {
                            W[i][neighbor] = 1;
                            W[neighbor][i] = 1;
                        }
                    }
                }
            }
            return W;
        },
        /**
         * Compute degree matrix D where D[i][i] = sum of row i in adjacency
         */
        degreeMatrix: function(A) {
            const n = A.length;
            const D = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                D[i][i] = A[i].reduce((sum, w) => sum + w, 0);
            }
            return D;
        },
        /**
         * Compute unnormalized graph Laplacian: L = D - A
         */
        laplacian: function(A) {
            const D = this.degreeMatrix(A);
            const n = A.length;
            const L = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    L[i][j] = D[i][j] - A[i][j];
                }
            }
            return L;
        },
        /**
         * Compute normalized symmetric Laplacian: L_sym = D^(-1/2) L D^(-1/2) = I - D^(-1/2) A D^(-1/2)
         */
        normalizedLaplacian: function(A) {
            const D = this.degreeMatrix(A);
            const L = this.laplacian(A);
            const n = A.length;

            // D^(-1/2)
            const Dinvsqrt = Array(n).fill(0).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                Dinvsqrt[i][i] = D[i][i] > 0 ? 1 / Math.sqrt(D[i][i]) : 0;
            }
            // L_sym = D^(-1/2) L D^(-1/2)
            const L_sym = Array(n).fill(0).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    L_sym[i][j] = Dinvsqrt[i][i] * L[i][j] * Dinvsqrt[j][j];
                }
            }
            return L_sym;
        },
        /**
         * Compute random walk normalized Laplacian: L_rw = D^(-1) L = I - D^(-1) A
         */
        randomWalkLaplacian: function(A) {
            const D = this.degreeMatrix(A);
            const n = A.length;

            const L_rw = Array(n).fill(0).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        L_rw[i][j] = 1;
                    } else if (D[i][i] > 0) {
                        L_rw[i][j] = -A[i][j] / D[i][i];
                    }
                }
            }
            return L_rw;
        },
        // Eigenvalue Computation

        /**
         * Power iteration for finding dominant eigenvector
         */
        powerIterationSingle: function(M, maxIterations = 100, tolerance = 1e-6) {
            const n = M.length;

            // Random initial vector
            let x = Array(n).fill(0).map(() => Math.random() - 0.5);

            // Normalize
            let norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
            x = x.map(xi => xi / norm);

            let eigenvalue = 0;

            for (let iter = 0; iter < maxIterations; iter++) {
                // y = M * x
                const y = M.map(row => row.reduce((sum, mij, j) => sum + mij * x[j], 0));

                // Compute eigenvalue (Rayleigh quotient)
                eigenvalue = y.reduce((sum, yi, i) => sum + yi * x[i], 0);

                // Normalize
                norm = Math.sqrt(y.reduce((sum, yi) => sum + yi * yi, 0));
                const xNew = y.map(yi => yi / norm);

                // Check convergence
                const diff = Math.sqrt(xNew.reduce((sum, xi, i) => sum + (xi - x[i]) ** 2, 0));
                x = xNew;

                if (diff < tolerance) break;
            }
            return { eigenvalue, eigenvector: x };
        },
        /**
         * Power iteration with deflation for multiple eigenvectors
         * For Laplacian, we want SMALLEST eigenvalues, so we use (maxEig*I - L)
         */
        powerIteration: function(M, numVectors = 5, maxIterations = 100, tolerance = 1e-6) {
            const n = M.length;
            const eigenvectors = [];
            const eigenvalues = [];

            // Estimate max eigenvalue for shift
            let maxEig = 0;
            for (let i = 0; i < n; i++) {
                maxEig = Math.max(maxEig, M[i][i] + 1);
            }
            // Shift matrix: M_shifted = maxEig*I - M
            // Largest eigenvalue of M_shifted corresponds to smallest of M
            const M_shifted = M.map((row, i) =>
                row.map((val, j) => (i === j ? maxEig - val : -val))
            );

            // Work with a copy we can deflate
            const A = M_shifted.map(row => [...row]);

            for (let v = 0; v < numVectors && v < n; v++) {
                // Random initial vector
                let x = Array(n).fill(0).map(() => Math.random() - 0.5);

                // Orthogonalize against previous eigenvectors
                for (const ev of eigenvectors) {
                    const dot = x.reduce((sum, xi, i) => sum + xi * ev[i], 0);
                    x = x.map((xi, i) => xi - dot * ev[i]);
                }
                // Normalize
                let norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
                if (norm < 1e-10) {
                    // Degenerate - generate new random vector
                    x = Array(n).fill(0).map(() => Math.random() - 0.5);
                    norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
                }
                x = x.map(xi => xi / norm);

                // Power iteration
                for (let iter = 0; iter < maxIterations; iter++) {
                    // y = A * x
                    const y = A.map(row => row.reduce((sum, aij, j) => sum + aij * x[j], 0));

                    // Orthogonalize against previous eigenvectors
                    for (const ev of eigenvectors) {
                        const dot = y.reduce((sum, yi, i) => sum + yi * ev[i], 0);
                        for (let i = 0; i < n; i++) y[i] -= dot * ev[i];
                    }
                    // Normalize
                    norm = Math.sqrt(y.reduce((sum, yi) => sum + yi * yi, 0));
                    if (norm < 1e-10) break;

                    const xNew = y.map(yi => yi / norm);

                    // Check convergence
                    const diff = Math.sqrt(xNew.reduce((sum, xi, i) => sum + (xi - x[i]) ** 2, 0));
                    x = xNew;

                    if (diff < tolerance) break;
                }
                // Compute eigenvalue (of original matrix M)
                const Mx = M.map(row => row.reduce((sum, mij, j) => sum + mij * x[j], 0));
                const eigenvalue = x.reduce((sum, xi, i) => sum + xi * Mx[i], 0);

                eigenvectors.push(x);
                eigenvalues.push(eigenvalue);
            }
            // Sort by eigenvalue (ascending for Laplacian)
            const sorted = eigenvalues
                .map((ev, i) => ({ eigenvalue: ev, eigenvector: eigenvectors[i] }))
                .sort((a, b) => a.eigenvalue - b.eigenvalue);

            return {
                eigenvalues: sorted.map(s => s.eigenvalue),
                eigenvectors: sorted.map(s => s.eigenvector)
            };
        },
        // Clustering Algorithms

        /**
         * K-means clustering
         */
        kmeans: function(data, k, maxIterations = 100) {
            const n = data.length;
            if (n === 0 || k <= 0) return { assignments: [], centroids: [] };

            const dim = data[0].length;

            // Initialize centroids using k-means++
            const centroids = [];
            const indices = new Set();

            // First centroid: random
            let firstIdx = Math.floor(Math.random() * n);
            centroids.push([...data[firstIdx]]);
            indices.add(firstIdx);

            // Remaining centroids: probability proportional to squared distance
            while (centroids.length < k && centroids.length < n) {
                const distances = data.map((point, idx) => {
                    if (indices.has(idx)) return 0;
                    return Math.min(...centroids.map(c => {
                        let d = 0;
                        for (let i = 0; i < dim; i++) d += (point[i] - c[i]) ** 2;
                        return d;
                    }));
                });

                const totalDist = distances.reduce((a, b) => a + b, 0);
                if (totalDist === 0) break;

                let r = Math.random() * totalDist;
                for (let i = 0; i < n; i++) {
                    r -= distances[i];
                    if (r <= 0) {
                        centroids.push([...data[i]]);
                        indices.add(i);
                        break;
                    }
                }
            }
            let assignments = new Array(n).fill(0);

            for (let iter = 0; iter < maxIterations; iter++) {
                // Assign to nearest centroid
                const newAssignments = data.map(point => {
                    let minDist = Infinity;
                    let bestCluster = 0;

                    for (let c = 0; c < centroids.length; c++) {
                        let dist = 0;
                        for (let d = 0; d < dim; d++) {
                            dist += (point[d] - centroids[c][d]) ** 2;
                        }
                        if (dist < minDist) {
                            minDist = dist;
                            bestCluster = c;
                        }
                    }
                    return bestCluster;
                });

                // Check convergence
                if (newAssignments.every((a, i) => a === assignments[i])) break;
                assignments = newAssignments;

                // Update centroids
                for (let c = 0; c < centroids.length; c++) {
                    const clusterPoints = data.filter((_, i) => assignments[i] === c);
                    if (clusterPoints.length > 0) {
                        for (let d = 0; d < dim; d++) {
                            centroids[c][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
                        }
                    }
                }
            }
            return { assignments, centroids };
        },
        /**
         * Spectral clustering using normalized Laplacian
         * @param {Array} adjacency - Adjacency or similarity matrix
         * @param {number} numClusters - Number of clusters
         * @returns {Object} {assignments, eigenvalues, eigenvectors}
         */
        spectralClustering: function(adjacency, numClusters) {
            const n = adjacency.length;
            if (n === 0) return { assignments: [] };

            // Compute normalized Laplacian
            const L = this.normalizedLaplacian(adjacency);

            // Find smallest k eigenvectors (skip first which is constant)
            const numEig = Math.min(numClusters + 1, n);
            const { eigenvalues, eigenvectors } = this.powerIteration(L, numEig);

            // Use eigenvectors 1 to k (skip eigenvector 0)
            const embedding = [];
            for (let i = 0; i < n; i++) {
                const row = [];
                for (let j = 1; j < Math.min(numClusters + 1, eigenvectors.length); j++) {
                    row.push(eigenvectors[j][i]);
                }
                if (row.length > 0) {
                    // Normalize row
                    const norm = Math.sqrt(row.reduce((sum, x) => sum + x * x, 0));
                    embedding.push(norm > 1e-10 ? row.map(x => x / norm) : row);
                } else {
                    embedding.push([0]);
                }
            }
            // K-means on embedded points
            const { assignments, centroids } = this.kmeans(embedding, numClusters);

            return {
                assignments,
                eigenvalues,
                eigenvectors,
                embedding,
                centroids
            };
        },
        // Manufacturing Applications

        /**
         * Decompose part into natural regions for multi-setup machining
         * @param {Object} brep - B-Rep model with faces
         * @param {number} numRegions - Target number of regions
         * @returns {Object} {regions, faceAssignments, eigenvalues}
         */
        decomposePart: function(brep, numRegions = 4) {
            // Extract face information
            const faces = brep.faces || [];
            const n = faces.length;

            if (n === 0) return { regions: [], faceAssignments: [] };

            // Build face adjacency
            const faceNeighbors = {};
            for (let i = 0; i < n; i++) {
                faceNeighbors[i] = faces[i].neighbors || [];
            }
            // Get face normals
            const faceNormals = faces.map(f => f.normal || [0, 0, 1]);

            // Build weighted adjacency matrix
            const W = this.buildWeightedAdjacency(faces, faceNeighbors, faceNormals);

            // Perform spectral clustering
            const result = this.spectralClustering(W, numRegions);

            // Group faces by region
            const regions = [];
            for (let r = 0; r < numRegions; r++) {
                const regionFaces = faces.filter((_, i) => result.assignments[i] === r);
                regions.push({
                    id: r,
                    faces: regionFaces,
                    faceIndices: result.assignments.map((a, i) => a === r ? i : -1).filter(x => x >= 0),
                    dominantNormal: this.computeDominantNormal(regionFaces.map((_, i) => faceNormals[result.assignments.indexOf(r)]))
                });
            }
            return {
                regions,
                faceAssignments: result.assignments,
                eigenvalues: result.eigenvalues,
                eigenvectors: result.eigenvectors
            };
        },
        /**
         * Compute dominant normal direction for a set of face normals
         */
        computeDominantNormal: function(normals) {
            if (!normals || normals.length === 0) return [0, 0, 1];

            // Average normals (simple approach)
            const avg = [0, 0, 0];
            for (const n of normals) {
                if (n) {
                    avg[0] += n[0] || 0;
                    avg[1] += n[1] || 0;
                    avg[2] += n[2] || 0;
                }
            }
            const len = Math.sqrt(avg[0]**2 + avg[1]**2 + avg[2]**2);
            if (len > 1e-10) {
                return [avg[0]/len, avg[1]/len, avg[2]/len];
            }
            return [0, 0, 1];
        },
        /**
         * Suggest optimal setups based on part decomposition
         */
        suggestSetups: function(brep, maxSetups = 6) {
            const decomposition = this.decomposePart(brep, maxSetups);

            // Analyze each region
            const setups = decomposition.regions.map((region, i) => {
                return {
                    setupNumber: i + 1,
                    faceCount: region.faceIndices.length,
                    workholding: this.suggestWorkholding(region.dominantNormal),
                    accessDirection: region.dominantNormal,
                    features: region.faceIndices
                };
            });

            // Sort by face count (largest first)
            setups.sort((a, b) => b.faceCount - a.faceCount);

            // Renumber
            setups.forEach((s, i) => s.setupNumber = i + 1);

            return {
                setups,
                totalSetups: setups.length,
                eigenGap: this.computeEigenGap(decomposition.eigenvalues),
                confidence: this.computeClusteringConfidence(decomposition.eigenvalues, maxSetups)
            };
        },
        /**
         * Suggest workholding based on access direction
         */
        suggestWorkholding: function(normal) {
            const [nx, ny, nz] = normal;

            // Determine dominant axis
            const absX = Math.abs(nx);
            const absY = Math.abs(ny);
            const absZ = Math.abs(nz);

            if (absZ >= absX && absZ >= absY) {
                return nz > 0 ? 'Top clamp / Vacuum' : 'Fixture plate';
            } else if (absX >= absY) {
                return 'Side clamp / 4th axis';
            } else {
                return 'End clamp / Tombstone';
            }
        },
        /**
         * Compute eigen gap (indicates natural cluster structure)
         */
        computeEigenGap: function(eigenvalues) {
            if (eigenvalues.length < 2) return 0;

            let maxGap = 0;
            let gapIndex = 0;

            for (let i = 1; i < eigenvalues.length; i++) {
                const gap = eigenvalues[i] - eigenvalues[i-1];
                if (gap > maxGap) {
                    maxGap = gap;
                    gapIndex = i;
                }
            }
            return { gap: maxGap, suggestedClusters: gapIndex };
        },
        /**
         * Compute confidence in clustering result
         */
        computeClusteringConfidence: function(eigenvalues, k) {
            if (eigenvalues.length < k + 1) return 0.5;

            // Ratio of k-th to (k+1)-th eigenvalue
            // Large ratio indicates good separation
            const ratio = eigenvalues[k] / (eigenvalues[k-1] + 1e-10);

            // Map to 0-1 confidence
            return Math.min(1, Math.max(0, 1 - 1/ratio));
        },
        /**
         * Group features by spectral similarity
         */
        groupFeatures: function(features, numGroups = 3) {
            if (features.length === 0) return { groups: [] };

            // Build feature similarity matrix based on properties
            const n = features.length;
            const W = Array(n).fill(0).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const similarity = this.computeFeatureSimilarity(features[i], features[j]);
                    W[i][j] = similarity;
                    W[j][i] = similarity;
                }
            }
            // Spectral clustering
            const result = this.spectralClustering(W, numGroups);

            // Group features
            const groups = [];
            for (let g = 0; g < numGroups; g++) {
                groups.push({
                    id: g,
                    features: features.filter((_, i) => result.assignments[i] === g),
                    featureIndices: result.assignments.map((a, i) => a === g ? i : -1).filter(x => x >= 0)
                });
            }
            return { groups, assignments: result.assignments };
        },
        /**
         * Compute similarity between two features
         */
        computeFeatureSimilarity: function(f1, f2) {
            // Type similarity
            const typeSim = f1.type === f2.type ? 1 : 0.3;

            // Size similarity (if available)
            let sizeSim = 1;
            if (f1.dimensions && f2.dimensions) {
                const vol1 = (f1.dimensions.length || 1) * (f1.dimensions.width || 1) * (f1.dimensions.depth || 1);
                const vol2 = (f2.dimensions.length || 1) * (f2.dimensions.width || 1) * (f2.dimensions.depth || 1);
                const ratio = Math.min(vol1, vol2) / Math.max(vol1, vol2);
                sizeSim = ratio;
            }
            // Location similarity (if available)
            let locSim = 1;
            if (f1.centroid && f2.centroid) {
                const dist = Math.sqrt(
                    (f1.centroid[0] - f2.centroid[0]) ** 2 +
                    (f1.centroid[1] - f2.centroid[1]) ** 2 +
                    (f1.centroid[2] - f2.centroid[2]) ** 2
                );
                locSim = Math.exp(-dist / 50); // Decay with distance
            }
            return typeSim * 0.4 + sizeSim * 0.3 + locSim * 0.3;
        },
        prismApplication: "PartDecompositionEngine - automatic setup planning, feature grouping"
    }
}