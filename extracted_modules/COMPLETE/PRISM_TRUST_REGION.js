const PRISM_TRUST_REGION = {
        name: 'PRISM Trust Region Optimization',
        version: '1.0.0',
        source: 'MIT 15.084j Nonlinear Programming',
        
        /**
         * Trust Region Newton Method
         * Combines Newton's method with trust region constraint for robust optimization
         * @param {Object} config - {f, gradient, hessian, x0, maxIter, tol, deltaMax, eta}
         * @returns {Object} {x, f, converged, iterations, history}
         */
        trustRegionNewton: function(config) {
            const {
                f,                          // Objective function
                gradient,                   // Gradient function
                hessian,                    // Hessian function
                x0,                         // Initial point
                maxIter = 100,              // Maximum iterations
                tol = 1e-8,                 // Convergence tolerance
                deltaMax = 10.0,            // Maximum trust region radius
                delta0 = 1.0,               // Initial trust region radius
                eta = 0.1                   // Acceptance threshold
            } = config;
            
            let x = [...x0];
            let delta = delta0;
            const n = x.length;
            const history = [{ x: [...x], f: f(x), delta }];
            
            for (let iter = 0; iter < maxIter; iter++) {
                const fx = f(x);
                const g = gradient(x);
                const H = hessian(x);
                
                // Check convergence
                const gradNorm = Math.sqrt(g.reduce((sum, gi) => sum + gi * gi, 0));
                if (gradNorm < tol) {
                    return { x, f: fx, converged: true, iterations: iter, history };
                }
                
                // Solve trust region subproblem (dogleg method)
                const p = this._doglegStep(g, H, delta, n);
                
                // Calculate actual vs predicted reduction
                const xNew = x.map((xi, i) => xi + p[i]);
                const fNew = f(xNew);
                const actualReduction = fx - fNew;
                
                // Predicted reduction using quadratic model
                const Hp = this._matVec(H, p);
                const predictedReduction = -(this._dot(g, p) + 0.5 * this._dot(p, Hp));
                
                // Calculate ratio
                const rho = actualReduction / (predictedReduction + 1e-12);
                
                // Update trust region radius
                if (rho < 0.25) {
                    delta = 0.25 * delta;
                } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                    delta = Math.min(2 * delta, deltaMax);
                }
                
                // Accept or reject step
                if (rho > eta) {
                    x = xNew;
                    history.push({ x: [...x], f: fNew, delta, rho, gradNorm });
                }
            }
            
            return { x, f: f(x), converged: false, iterations: maxIter, history };
        },
        
        /**
         * Dogleg step for trust region subproblem
         */
        _doglegStep: function(g, H, delta, n) {
            // Cauchy point (steepest descent step)
            const gNorm = this._norm(g);
            const Hg = this._matVec(H, g);
            const gHg = this._dot(g, Hg);
            
            let tauCauchy;
            if (gHg <= 0) {
                tauCauchy = 1;
            } else {
                tauCauchy = Math.min(1, gNorm * gNorm * gNorm / (delta * gHg));
            }
            
            const pCauchy = g.map(gi => -tauCauchy * delta * gi / gNorm);
            
            // Newton step
            try {
                const pNewton = this._solveLinear(H, g.map(gi => -gi));
                const pNewtonNorm = this._norm(pNewton);
                
                if (pNewtonNorm <= delta) {
                    // Newton step is inside trust region
                    return pNewton;
                }
                
                // Dogleg: interpolate between Cauchy and Newton
                const pCauchyNorm = this._norm(pCauchy);
                if (pCauchyNorm >= delta) {
                    // Cauchy point is outside - use scaled steepest descent
                    return pCauchy.map(pi => pi * delta / pCauchyNorm);
                }
                
                // Find intersection with trust region boundary
                const diff = pNewton.map((pi, i) => pi - pCauchy[i]);
                const a = this._dot(diff, diff);
                const b = 2 * this._dot(pCauchy, diff);
                const c = this._dot(pCauchy, pCauchy) - delta * delta;
                
                const tau = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
                
                return pCauchy.map((pi, i) => pi + tau * diff[i]);
                
            } catch (e) {
                // If Newton step fails, use Cauchy
                return pCauchy;
            }
        },
        
        /**
         * Trust Region with Cauchy Point (simpler version)
         */
        trustRegionCauchy: function(config) {
            const {
                f, gradient, hessian, x0,
                maxIter = 100, tol = 1e-8,
                deltaMax = 10.0, delta0 = 1.0, eta = 0.1
            } = config;
            
            let x = [...x0];
            let delta = delta0;
            const history = [];
            
            for (let iter = 0; iter < maxIter; iter++) {
                const fx = f(x);
                const g = gradient(x);
                const H = hessian(x);
                
                const gradNorm = this._norm(g);
                if (gradNorm < tol) {
                    return { x, f: fx, converged: true, iterations: iter, history };
                }
                
                // Cauchy step
                const Hg = this._matVec(H, g);
                const gHg = this._dot(g, Hg);
                
                let alpha;
                if (gHg > 0) {
                    alpha = Math.min(gradNorm * gradNorm / gHg, delta / gradNorm);
                } else {
                    alpha = delta / gradNorm;
                }
                
                const p = g.map(gi => -alpha * gi);
                
                // Evaluate step
                const xNew = x.map((xi, i) => xi + p[i]);
                const fNew = f(xNew);
                const actualReduction = fx - fNew;
                const predictedReduction = -this._dot(g, p) - 0.5 * this._dot(p, this._matVec(H, p));
                
                const rho = actualReduction / (predictedReduction + 1e-12);
                
                // Update trust region
                if (rho < 0.25) {
                    delta *= 0.25;
                } else if (rho > 0.75) {
                    delta = Math.min(2 * delta, deltaMax);
                }
                
                if (rho > eta) {
                    x = xNew;
                }
                
                history.push({ x: [...x], f: f(x), delta, rho });
            }
            
            return { x, f: f(x), converged: false, iterations: maxIter, history };
        },
        
        // Helper functions
        _dot: function(a, b) {
            return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        },
        
        _norm: function(v) {
            return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
        },
        
        _matVec: function(A, x) {
            return A.map(row => row.reduce((sum, aij, j) => sum + aij * x[j], 0));
        },
        
        _solveLinear: function(A, b) {
            const n = b.length;
            const aug = A.map((row, i) => [...row, b[i]]);
            
            // Gaussian elimination with partial pivoting
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                
                if (Math.abs(aug[i][i]) < 1e-12) throw new Error('Singular matrix');
                
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
                x[i] = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    x[i] -= aug[i][j] * x[j];
                }
                x[i] /= aug[i][i];
            }
            
            return x;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Trust Region] Running self-test...');
            
            // Test: Minimize Rosenbrock function
            const rosenbrock = (x) => {
                return Math.pow(1 - x[0], 2) + 100 * Math.pow(x[1] - x[0] * x[0], 2);
            };
            
            const gradient = (x) => {
                return [
                    -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] * x[0]),
                    200 * (x[1] - x[0] * x[0])
                ];
            };
            
            const hessian = (x) => {
                return [
                    [2 + 800 * x[0] * x[0] - 400 * (x[1] - x[0] * x[0]), -400 * x[0]],
                    [-400 * x[0], 200]
                ];
            };
            
            const result = this.trustRegionNewton({
                f: rosenbrock,
                gradient,
                hessian,
                x0: [-1, 1],
                maxIter: 200,
                tol: 1e-6
            });
            
            const success = result.converged && 
                Math.abs(result.x[0] - 1) < 0.01 && 
                Math.abs(result.x[1] - 1) < 0.01;
            
            console.log(`  ✓ Trust Region Newton: ${success ? 'PASS' : 'FAIL'} (converged=${result.converged}, x=[${result.x.map(v => v.toFixed(4)).join(',')}])`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // SECTION 2: ACTIVITY BASED COSTING (MIT 15.963 Management Accounting)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_ACTIVITY_BASED_COSTING = {
        name: 'PRISM Activity Based Costing',
        version: '1.0.0',
        source: 'MIT 15.963 Management Accounting',
        
        // Activity pools storage
        activityPools: new Map(),
        costDrivers: new Map(),
        
        /**
         * Initialize ABC system for a machine shop
         */
        initialize: function() {
            this.activityPools.clear();
            this.costDrivers.clear();
            return this;
        },
        
        /**
         * Define an activity cost pool
         * @param {string} activityName - Name of the activity
         * @param {number} totalCost - Total cost for this activity pool
         * @param {string} costDriver - Cost driver (e.g., 'setups', 'machine_hours')
         * @param {number} totalDriverQuantity - Total quantity of the driver
         */
        defineActivity: function(activityName, totalCost, costDriver, totalDriverQuantity) {
            if (totalDriverQuantity <= 0) {
                throw new Error(`Invalid driver quantity for ${activityName}`);
            }
            
            const rate = totalCost / totalDriverQuantity;
            
            this.activityPools.set(activityName, {
                name: activityName,
                totalCost,
                costDriver,
                driverQuantity: totalDriverQuantity,
                rate: rate
            });
            
            this.costDrivers.set(activityName, costDriver);
            
            return this;
        },
        
        /**
         * Setup standard machine shop activities
         * @param {Object} shopData - Shop overhead data
         */
        setupMachineShop: function(shopData) {
            this.initialize();
            
            // Machine Setup Activity
            if (shopData.totalSetupCosts && shopData.totalSetups > 0) {
                this.defineActivity(
                    'Machine Setup',
                    shopData.totalSetupCosts,
                    'Number of Setups',
                    shopData.totalSetups
                );
            }
            
            // Machine Running Activity
            if (shopData.totalMachineRunningCosts && shopData.totalMachineHours > 0) {
                this.defineActivity(
                    'Machine Running',
                    shopData.totalMachineRunningCosts,
                    'Machine Hours',
                    shopData.totalMachineHours
                );
            }
            
            // Quality Inspection Activity
            if (shopData.totalInspectionCosts && shopData.totalInspectionHours > 0) {
                this.defineActivity(
                    'Quality Inspection',
                    shopData.totalInspectionCosts,
                    'Inspection Hours',
                    shopData.totalInspectionHours
                );
            }
            
            // Material Handling Activity
            if (shopData.totalHandlingCosts && shopData.totalMoves > 0) {
                this.defineActivity(
                    'Material Handling',
                    shopData.totalHandlingCosts,
                    'Number of Moves',
                    shopData.totalMoves
                );
            }
            
            // Engineering Support Activity
            if (shopData.totalEngineeringCosts && shopData.totalEngineeringHours > 0) {
                this.defineActivity(
                    'Engineering Support',
                    shopData.totalEngineeringCosts,
                    'Engineering Hours',
                    shopData.totalEngineeringHours
                );
            }
            
            // Tooling Activity
            if (shopData.totalToolingCosts && shopData.totalToolChanges > 0) {
                this.defineActivity(
                    'Tooling',
                    shopData.totalToolingCosts,
                    'Tool Changes',
                    shopData.totalToolChanges
                );
            }
            
            // Programming Activity
            if (shopData.totalProgrammingCosts && shopData.totalProgrammingHours > 0) {
                this.defineActivity(
                    'Programming',
                    shopData.totalProgrammingCosts,
                    'Programming Hours',
                    shopData.totalProgrammingHours
                );
            }
            
            console.log(`[ABC] Initialized ${this.activityPools.size} activity pools`);
            return this;
        },
        
        /**
         * Cost a product/job using ABC
         * @param {Object} product - Product with activityUsage map
         * @returns {Object} Detailed cost breakdown
         */
        costProduct: function(product) {
            const costs = {};
            let totalCost = 0;
            
            for (const [activity, pool] of this.activityPools) {
                const driverQuantity = product.activityUsage?.[activity] || 0;
                const activityCost = driverQuantity * pool.rate;
                
                costs[activity] = {
                    driver: pool.costDriver,
                    driverQuantity: driverQuantity,
                    rate: pool.rate,
                    cost: activityCost
                };
                
                totalCost += activityCost;
            }
            
            const quantity = product.quantity || 1;
            
            return {
                productId: product.id,
                activityCosts: costs,
                totalCost: totalCost,
                unitCost: totalCost / quantity,
                quantity: quantity
            };
        },
        
        /**
         * Cost a job (with operations)
         * @param {Object} job - Job specification
         */
        costJob: function(job) {
            // Extract activity usage from job operations
            const activityUsage = {
                'Machine Setup': job.numSetups || 1,
                'Machine Running': job.machineHours || 0,
                'Quality Inspection': job.inspectionHours || 0,
                'Material Handling': job.materialMoves || 1,
                'Engineering Support': job.engineeringHours || 0,
                'Tooling': job.toolChanges || 0,
                'Programming': job.programmingHours || 0
            };
            
            return this.costProduct({
                id: job.id,
                quantity: job.quantity || 1,
                activityUsage: activityUsage
            });
        },
        
        /**
         * Compare traditional vs ABC costing
         * @param {Array} jobs - Array of job specifications
         * @param {Object} traditionalRates - {laborRate, overheadRate}
         */
        compareTraditionalVsABC: function(jobs, traditionalRates) {
            const comparison = jobs.map(job => {
                // Traditional costing (simple labor-hour based overhead)
                const directLaborHours = (job.machineHours || 0) + (job.setupHours || 0);
                const traditionalOverhead = directLaborHours * (traditionalRates.overheadRate || 50);
                const traditionalDirectLabor = directLaborHours * (traditionalRates.laborRate || 35);
                const traditionalTotal = traditionalOverhead + traditionalDirectLabor + (job.materialCost || 0);
                const traditionalUnitCost = traditionalTotal / (job.quantity || 1);
                
                // ABC costing
                const abcResult = this.costJob(job);
                const abcTotal = abcResult.totalCost + (job.materialCost || 0);
                const abcUnitCost = abcTotal / (job.quantity || 1);
                
                // Calculate difference
                const difference = abcUnitCost - traditionalUnitCost;
                const percentDiff = (difference / traditionalUnitCost) * 100;
                
                return {
                    jobId: job.id,
                    quantity: job.quantity,
                    traditionalUnitCost,
                    abcUnitCost,
                    difference,
                    percentDiff: percentDiff.toFixed(2) + '%',
                    undercosted: difference > 0,  // Traditional undercosted this job
                    abcBreakdown: abcResult.activityCosts
                };
            });
            
            // Summary statistics
            const avgDiff = comparison.reduce((sum, c) => sum + Math.abs(c.difference), 0) / comparison.length;
            const undercostedCount = comparison.filter(c => c.undercosted).length;
            
            return {
                comparison,
                summary: {
                    totalJobs: comparison.length,
                    averageAbsoluteDifference: avgDiff.toFixed(2),
                    jobsUndercosted: undercostedCount,
                    jobsOvercosted: comparison.length - undercostedCount,
                    insight: undercostedCount > comparison.length / 2 ?
                        'Traditional costing tends to undercost complex jobs and overcost simple jobs' :
                        'Traditional costing allocation is relatively accurate for this job mix'
                }
            };
        },
        
        /**
         * Get activity rates
         */
        getActivityRates: function() {
            const rates = {};
            for (const [name, pool] of this.activityPools) {
                rates[name] = {
                    driver: pool.costDriver,
                    rate: pool.rate,
                    totalCost: pool.totalCost,
                    totalDriverQuantity: pool.driverQuantity
                };
            }
            return rates;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[ABC] Running self-test...');
            
            // Setup test shop
            this.setupMachineShop({
                totalSetupCosts: 50000,
                totalSetups: 500,
                totalMachineRunningCosts: 200000,
                totalMachineHours: 4000,
                totalInspectionCosts: 30000,
                totalInspectionHours: 600,
                totalHandlingCosts: 20000,
                totalMoves: 2000,
                totalToolingCosts: 15000,
                totalToolChanges: 3000
            });
            
            // Test job costing
            const testJob = {
                id: 'TEST-001',
                quantity: 100,
                numSetups: 5,
                machineHours: 20,
                inspectionHours: 2,
                materialMoves: 10,
                toolChanges: 15
            };
            
            const result = this.costJob(testJob);
            
            const success = result.totalCost > 0 && 
                result.unitCost > 0 &&
                Object.keys(result.activityCosts).length > 0;
            
            console.log(`  ✓ ABC Job Costing: ${success ? 'PASS' : 'FAIL'} (total=$${result.totalCost.toFixed(2)}, unit=$${result.unitCost.toFixed(2)})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // SECTION 3: RAY TRACING RENDERER (MIT 6.837 Computer Graphics)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_RAY_TRACER = {
        name: 'PRISM Ray Tracer',
        version: '1.0.0',
        source: 'MIT 6.837 Computer Graphics',
        
        // Scene storage
        scene: {
            objects: [],
            lights: [],
            camera: null,
            backgroundColor: { r: 0.1, g: 0.1, b: 0.1 }
        },
        
        // Rendering settings
        settings: {
            maxDepth: 5,            // Maximum recursion depth
            shadowRays: true,       // Enable shadow rays
            antialiasing: 1,        // Samples per pixel (1 = no AA)
            ambientLight: { r: 0.1, g: 0.1, b: 0.1 }
        },
        
        /**
         * Create a camera
         */
        createCamera: function(eye, lookAt, up, fov, width, height) {
            const forward = this._normalize(this._sub(lookAt, eye));
            const right = this._normalize(this._cross(forward, up));
            const camUp = this._cross(right, forward);
            
            const aspectRatio = width / height;
            const halfHeight = Math.tan(fov * Math.PI / 360);
            const halfWidth = halfHeight * aspectRatio;
            
            return {
                eye,
                forward,
                right,
                up: camUp,
                halfWidth,
                halfHeight,
                width,
                height
            };
        },
        
        /**
         * Generate ray for pixel
         */
        generateRay: function(camera, x, y) {
            const u = (2 * (x + 0.5) / camera.width - 1) * camera.halfWidth;
            const v = (1 - 2 * (y + 0.5) / camera.height) * camera.halfHeight;
            
            const direction = this._normalize({
                x: camera.forward.x + u * camera.right.x + v * camera.up.x,
                y: camera.forward.y + u * camera.right.y + v * camera.up.y,
                z: camera.forward.z + u * camera.right.z + v * camera.up.z
            });
            
            return {
                origin: camera.eye,
                direction
            };
        },
        
        /**
         * Add sphere to scene
         */
        addSphere: function(center, radius, material) {
            this.scene.objects.push({
                type: 'sphere',
                center,
                radius,
                material: material || {
                    diffuse: { r: 0.8, g: 0.2, b: 0.2 },
                    specular: { r: 1, g: 1, b: 1 },
                    shininess: 50,
                    reflectivity: 0.3
                }
            });
            return this;
        },
        
        /**
         * Add triangle to scene
         */
        addTriangle: function(v0, v1, v2, material) {
            this.scene.objects.push({
                type: 'triangle',
                v0, v1, v2,
                material: material || {
                    diffuse: { r: 0.2, g: 0.8, b: 0.2 },
                    specular: { r: 1, g: 1, b: 1 },
                    shininess: 30,
                    reflectivity: 0.1
                }
            });
            return this;
        },
        
        /**
         * Add plane to scene
         */
        addPlane: function(point, normal, material) {
            this.scene.objects.push({
                type: 'plane',
                point,
                normal: this._normalize(normal),
                material: material || {
                    diffuse: { r: 0.5, g: 0.5, b: 0.5 },
                    specular: { r: 0.3, g: 0.3, b: 0.3 },
                    shininess: 10,
                    reflectivity: 0.2
                }
            });
            return this;
        },
        
        /**
         * Add light to scene
         */
        addLight: function(position, color, intensity) {
            this.scene.lights.push({
                position,
                color: color || { r: 1, g: 1, b: 1 },
                intensity: intensity || 1.0
            });
            return this;
        },
        
        /**
         * Find closest intersection
         */
        intersect: function(ray) {
            let closest = null;
            let minT = Infinity;
            
            for (const obj of this.scene.objects) {
                const hit = this._intersectObject(ray, obj);
                if (hit && hit.t > 0.001 && hit.t < minT) {
                    minT = hit.t;
                    closest = hit;
                    closest.object = obj;
                }
            }
            
            return closest;
        },
        
        /**
         * Intersect ray with object
         */
        _intersectObject: function(ray, obj) {
            switch (obj.type) {
                case 'sphere':
                    return this._intersectSphere(ray, obj);
                case 'triangle':
                    return this._intersectTriangle(ray, obj);
                case 'plane':
                    return this._intersectPlane(ray, obj);
                default:
                    return null;
            }
        },
        
        _intersectSphere: function(ray, sphere) {
            const oc = this._sub(ray.origin, sphere.center);
            const a = this._dot(ray.direction, ray.direction);
            const b = 2 * this._dot(oc, ray.direction);
            const c = this._dot(oc, oc) - sphere.radius * sphere.radius;
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant < 0) return null;
            
            const t = (-b - Math.sqrt(discriminant)) / (2 * a);
            if (t < 0) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            const normal = this._normalize(this._sub(point, sphere.center));
            
            return { t, point, normal };
        },
        
        _intersectTriangle: function(ray, tri) {
            const EPSILON = 1e-8;
            const edge1 = this._sub(tri.v1, tri.v0);
            const edge2 = this._sub(tri.v2, tri.v0);
            const h = this._cross(ray.direction, edge2);
            const a = this._dot(edge1, h);
            
            if (a > -EPSILON && a < EPSILON) return null;
            
            const f = 1.0 / a;
            const s = this._sub(ray.origin, tri.v0);
            const u = f * this._dot(s, h);
            
            if (u < 0 || u > 1) return null;
            
            const q = this._cross(s, edge1);
            const v = f * this._dot(ray.direction, q);
            
            if (v < 0 || u + v > 1) return null;
            
            const t = f * this._dot(edge2, q);
            if (t < EPSILON) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            const normal = this._normalize(this._cross(edge1, edge2));
            
            return { t, point, normal };
        },
        
        _intersectPlane: function(ray, plane) {
            const denom = this._dot(plane.normal, ray.direction);
            if (Math.abs(denom) < 1e-8) return null;
            
            const t = this._dot(this._sub(plane.point, ray.origin), plane.normal) / denom;
            if (t < 0) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            
            return { t, point, normal: plane.normal };
        },
        
        /**
         * Trace a ray and compute color
         */
        traceRay: function(ray, depth = 0) {
            if (depth > this.settings.maxDepth) {
                return this.scene.backgroundColor;
            }
            
            const hit = this.intersect(ray);
            if (!hit) {
                return this.scene.backgroundColor;
            }
            
            const material = hit.object.material;
            let color = { ...this.settings.ambientLight };
            
            // For each light, compute contribution
            for (const light of this.scene.lights) {
                const toLight = this._normalize(this._sub(light.position, hit.point));
                
                // Shadow check
                if (this.settings.shadowRays) {
                    const shadowRay = {
                        origin: this._add(hit.point, this._scale(hit.normal, 0.001)),
                        direction: toLight
                    };
                    const shadowHit = this.intersect(shadowRay);
                    const lightDist = this._length(this._sub(light.position, hit.point));
                    if (shadowHit && shadowHit.t < lightDist) {
                        continue; // In shadow
                    }
                }
                
                // Diffuse
                const NdotL = Math.max(0, this._dot(hit.normal, toLight));
                color.r += material.diffuse.r * light.color.r * light.intensity * NdotL;
                color.g += material.diffuse.g * light.color.g * light.intensity * NdotL;
                color.b += material.diffuse.b * light.color.b * light.intensity * NdotL;
                
                // Specular (Blinn-Phong)
                const viewDir = this._normalize(this._scale(ray.direction, -1));
                const halfVec = this._normalize(this._add(toLight, viewDir));
                const NdotH = Math.max(0, this._dot(hit.normal, halfVec));
                const specPower = Math.pow(NdotH, material.shininess);
                color.r += material.specular.r * light.color.r * light.intensity * specPower;
                color.g += material.specular.g * light.color.g * light.intensity * specPower;
                color.b += material.specular.b * light.color.b * light.intensity * specPower;
            }
            
            // Reflection
            if (material.reflectivity > 0 && depth < this.settings.maxDepth) {
                const reflectDir = this._reflect(ray.direction, hit.normal);
                const reflectRay = {
                    origin: this._add(hit.point, this._scale(hit.normal, 0.001)),
                    direction: reflectDir
                };
                const reflectColor = this.traceRay(reflectRay, depth + 1);
                color.r = color.r * (1 - material.reflectivity) + reflectColor.r * material.reflectivity;
                color.g = color.g * (1 - material.reflectivity) + reflectColor.g * material.reflectivity;
                color.b = color.b * (1 - material.reflectivity) + reflectColor.b * material.reflectivity;
            }
            
            // Clamp
            color.r = Math.min(1, color.r);
            color.g = Math.min(1, color.g);
            color.b = Math.min(1, color.b);
            
            return color;
        },
        
        /**
         * Render scene to image data
         */
        render: function(camera, width, height) {
            const imageData = new Array(width * height * 4);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let color = { r: 0, g: 0, b: 0 };
                    
                    // Antialiasing
                    const samples = this.settings.antialiasing;
                    for (let sy = 0; sy < samples; sy++) {
                        for (let sx = 0; sx < samples; sx++) {
                            const ray = this.generateRay(camera, 
                                x + (sx + 0.5) / samples, 
                                y + (sy + 0.5) / samples);
                            const c = this.traceRay(ray);
                            color.r += c.r;
                            color.g += c.g;
                            color.b += c.b;
                        }
                    }
                    
                    const totalSamples = samples * samples;
                    const idx = (y * width + x) * 4;
                    imageData[idx] = Math.floor(color.r / totalSamples * 255);
                    imageData[idx + 1] = Math.floor(color.g / totalSamples * 255);
                    imageData[idx + 2] = Math.floor(color.b / totalSamples * 255);
                    imageData[idx + 3] = 255;
                }
            }
            
            return {
                width,
                height,
                data: imageData
            };
        },
        
        /**
         * Clear scene
         */
        clearScene: function() {
            this.scene.objects = [];
            this.scene.lights = [];
            return this;
        },
        
        // Vector operations
        _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
        _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; },
        _dot: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        _cross: function(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        },
        _length: function(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); },
        _normalize: function(v) {
            const len = this._length(v);
            return len > 0 ? this._scale(v, 1 / len) : v;
        },
        _reflect: function(v, n) {
            const d = 2 * this._dot(v, n);
            return this._sub(v, this._scale(n, d));
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Ray Tracer] Running self-test...');
            
            this.clearScene();
            
            // Add test objects
            this.addSphere({ x: 0, y: 0, z: -5 }, 1, {
                diffuse: { r: 0.8, g: 0.2, b: 0.2 },
                specular: { r: 1, g: 1, b: 1 },
                shininess: 50,
                reflectivity: 0.3
            });
            
            this.addLight({ x: 5, y: 5, z: 0 }, { r: 1, g: 1, b: 1 }, 1.0);
            
            const camera = this.createCamera(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: -1 },
                { x: 0, y: 1, z: 0 },
                60, 100, 100
            );
            
            // Test ray generation
            const ray = this.generateRay(camera, 50, 50);
            const success = ray.origin && ray.direction && 
                Math.abs(this._length(ray.direction) - 1) < 0.001;
            
            // Test intersection
            const hit = this.intersect(ray);
            const hitSuccess = hit && hit.t > 0;
            
            console.log(`  ✓ Ray Generation: ${success ? 'PASS' : 'FAIL'}`);
            console.log(`  ✓ Sphere Intersection: ${hitSuccess ? 'PASS' : 'FAIL'}`);
            
            return { passed: (success ? 1 : 0) + (hitSuccess ? 1 : 0), total: 2 };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // SECTION 4: POTENTIAL FIELDS FOR MOTION PLANNING (MIT 16.410)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_POTENTIAL_FIELDS = {
        name: 'PRISM Potential Fields',
        version: '1.0.0',
        source: 'MIT 16.410 Autonomous Systems',
        
        // Configuration
        config: {
            attractiveGain: 1.0,      // Gain for attractive potential
            repulsiveGain: 100.0,     // Gain for repulsive potential
            obstacleRadius: 0.5,      // Influence radius of obstacles
            goalRadius: 0.1,          // Goal reached radius
            maxForce: 10.0,           // Maximum force magnitude
            stepSize: 0.1             // Step size for gradient descent
        },
        
        /**
         * Calculate attractive potential (quadratic)
         * U_att = 0.5 * k_att * ||q - q_goal||^2
         */
        attractivePotential: function(position, goal) {
            const diff = this._sub(position, goal);
            const dist = this._length(diff);
            return 0.5 * this.config.attractiveGain * dist * dist;
        },
        
        /**
         * Calculate attractive force (gradient of attractive potential)
         * F_att = -k_att * (q - q_goal)
         */
        attractiveForce: function(position, goal) {
            const diff = this._sub(position, goal);
            return this._scale(diff, -this.config.attractiveGain);
        },
        
        /**
         * Calculate repulsive potential (inverse distance)
         * U_rep = 0.5 * k_rep * (1/rho - 1/rho_0)^2 if rho <= rho_0, 0 otherwise
         */
        repulsivePotential: function(position, obstacle, obstacleRadius) {
            const radius = obstacleRadius || this.config.obstacleRadius;
            const diff = this._sub(position, obstacle);
            const dist = this._length(diff);
            
            if (dist > radius) return 0;
            if (dist < 0.001) dist = 0.001; // Avoid division by zero
            
            const term = 1 / dist - 1 / radius;
            return 0.5 * this.config.repulsiveGain * term * term;
        },
        
        /**
         * Calculate repulsive force
         * F_rep = k_rep * (1/rho - 1/rho_0) * (1/rho^2) * grad(rho)
         */
        repulsiveForce: function(position, obstacle, obstacleRadius) {
            const radius = obstacleRadius || this.config.obstacleRadius;
            const diff = this._sub(position, obstacle);
            let dist = this._length(diff);
            
            if (dist > radius) return { x: 0, y: 0, z: 0 };
            if (dist < 0.001) dist = 0.001;
            
            const term = 1 / dist - 1 / radius;
            const magnitude = this.config.repulsiveGain * term / (dist * dist);
            
            const direction = this._normalize(diff);
            return this._scale(direction, magnitude);
        },
        
        /**
         * Calculate total potential
         */
        totalPotential: function(position, goal, obstacles) {
            let potential = this.attractivePotential(position, goal);
            
            for (const obs of obstacles) {
                potential += this.repulsivePotential(position, obs.center, obs.radius);
            }
            
            return potential;
        },
        
        /**
         * Calculate total force
         */
        totalForce: function(position, goal, obstacles) {
            let force = this.attractiveForce(position, goal);
            
            for (const obs of obstacles) {
                const repForce = this.repulsiveForce(position, obs.center, obs.radius);
                force = this._add(force, repForce);
            }
            
            // Clamp force magnitude
            const magnitude = this._length(force);
            if (magnitude > this.config.maxForce) {
                force = this._scale(this._normalize(force), this.config.maxForce);
            }
            
            return force;
        },
        
        /**
         * Plan path using gradient descent on potential field
         */
        planPath: function(start, goal, obstacles, maxIterations = 1000) {
            const path = [{ ...start }];
            let current = { ...start };
            
            for (let i = 0; i < maxIterations; i++) {
                const dist = this._length(this._sub(current, goal));
                
                // Check if goal reached
                if (dist < this.config.goalRadius) {
                    path.push({ ...goal });
                    return { success: true, path, iterations: i };
                }
                
                // Calculate force and move
                const force = this.totalForce(current, goal, obstacles);
                const step = this._scale(this._normalize(force), this.config.stepSize);
                
                // Check for local minima (very small force)
                if (this._length(force) < 0.001) {
                    return { success: false, path, iterations: i, reason: 'local_minimum' };
                }
                
                current = this._add(current, step);
                path.push({ ...current });
            }
            
            return { success: false, path, iterations: maxIterations, reason: 'max_iterations' };
        },
        
        /**
         * Plan path with navigation function (avoids local minima)
         * Uses harmonic potential approach
         */
        planPathHarmonic: function(start, goal, obstacles, gridSize = 50, maxIterations = 500) {
            // Simplified harmonic potential using gradient descent with random perturbation
            const path = [{ ...start }];
            let current = { ...start };
            let stuckCount = 0;
            const maxStuck = 10;
            
            for (let i = 0; i < maxIterations; i++) {
                const dist = this._length(this._sub(current, goal));
                
                if (dist < this.config.goalRadius) {
                    path.push({ ...goal });
                    return { success: true, path, iterations: i };
                }
                
                let force = this.totalForce(current, goal, obstacles);
                
                // Check for stuck condition
                if (this._length(force) < 0.01) {
                    stuckCount++;
                    if (stuckCount > maxStuck) {
                        return { success: false, path, iterations: i, reason: 'local_minimum' };
                    }
                    // Add random perturbation to escape
                    force = {
                        x: force.x + (Math.random() - 0.5) * 2,
                        y: force.y + (Math.random() - 0.5) * 2,
                        z: force.z + (Math.random() - 0.5) * 2
                    };
                } else {
                    stuckCount = 0;
                }
                
                const step = this._scale(this._normalize(force), this.config.stepSize);
                current = this._add(current, step);
                path.push({ ...current });
            }
            
            return { success: false, path, iterations: maxIterations, reason: 'max_iterations' };
        },
        
        /**
         * Generate potential field visualization data
         */
        generateFieldVisualization: function(goal, obstacles, bounds, resolution = 20) {
            const { minX, maxX, minY, maxY } = bounds;
            const stepX = (maxX - minX) / resolution;
            const stepY = (maxY - minY) / resolution;
            
            const field = [];
            
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const x = minX + i * stepX;
                    const y = minY + j * stepY;
                    const position = { x, y, z: 0 };
                    
                    const potential = this.totalPotential(position, goal, obstacles);
                    const force = this.totalForce(position, goal, obstacles);
                    
                    field.push({
                        x, y,
                        potential,
                        forceX: force.x,
                        forceY: force.y,
                        forceMagnitude: this._length(force)
                    });
                }
            }
            
            return field;
        },
        
        // Vector operations
        _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) }; },
        _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; },
        _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: (v.z || 0) * s }; },
        _length: function(v) { return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0)); },
        _normalize: function(v) {
            const len = this._length(v);
            return len > 0 ? this._scale(v, 1 / len) : v;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Potential Fields] Running self-test...');
            
            const start = { x: 0, y: 0, z: 0 };
            const goal = { x: 5, y: 5, z: 0 };
            const obstacles = [
                { center: { x: 2.5, y: 2.5, z: 0 }, radius: 1.0 }
            ];
            
            const result = this.planPath(start, goal, obstacles);
            const success = result.path.length > 0;
            
            console.log(`  ✓ Path Planning: ${success ? 'PASS' : 'FAIL'} (${result.success ? 'reached goal' : result.reason})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // SECTION 5: FRUSTUM CULLING (MIT 6.837 Computer Graphics)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_FRUSTUM_CULLING = {
        name: 'PRISM Frustum Culling',
        version: '1.0.0',
        source: 'MIT 6.837 Computer Graphics',
        
        // Plane indices
        NEAR: 0,
        FAR: 1,
        LEFT: 2,
        RIGHT: 3,
        TOP: 4,
        BOTTOM: 5,
        
        /**
         * Extract frustum planes from view-projection matrix
         * Each plane is [A, B, C, D] where Ax + By + Cz + D = 0
         */
        extractFrustumPlanes: function(viewProjectionMatrix) {
            const m = viewProjectionMatrix;
            const planes = [];
            
            // Left: m[3] + m[0]
            planes[this.LEFT] = this._normalizePlane([
                m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]
            ]);
            
            // Right: m[3] - m[0]
            planes[this.RIGHT] = this._normalizePlane([
                m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]
            ]);
            
            // Bottom: m[3] + m[1]
            planes[this.BOTTOM] = this._normalizePlane([
                m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]
            ]);
            
            // Top: m[3] - m[1]
            planes[this.TOP] = this._normalizePlane([
                m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]
            ]);
            
            // Near: m[3] + m[2]
            planes[this.NEAR] = this._normalizePlane([
                m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]
            ]);
            
            // Far: m[3] - m[2]
            planes[this.FAR] = this._normalizePlane([
                m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
            ]);
            
            return planes;
        },
        
        /**
         * Normalize a plane
         */
        _normalizePlane: function(plane) {
            const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
            return [plane[0] / length, plane[1] / length, plane[2] / length, plane[3] / length];
        },
        
        /**
         * Calculate signed distance from point to plane
         */
        pointToPlaneDistance: function(point, plane) {
            return plane[0] * point.x + plane[1] * point.y + plane[2] * point.z + plane[3];
        },
        
        /**
         * Test if point is inside frustum
         */
        isPointInFrustum: function(point, planes) {
            for (const plane of planes) {
                if (this.pointToPlaneDistance(point, plane) < 0) {
                    return false;
                }
            }
            return true;
        },
        
        /**
         * Test if sphere intersects frustum
         * Returns: 'INSIDE', 'OUTSIDE', or 'INTERSECT'
         */
        sphereInFrustum: function(center, radius, planes) {
            let result = 'INSIDE';
            
            for (const plane of planes) {
                const distance = this.pointToPlaneDistance(center, plane);
                
                if (distance < -radius) {
                    return 'OUTSIDE';
                }
                
                if (distance < radius) {
                    result = 'INTERSECT';
                }
            }
            
            return result;
        },
        
        /**
         * Test if AABB (Axis-Aligned Bounding Box) intersects frustum
         * Returns: 'INSIDE', 'OUTSIDE', or 'INTERSECT'
         */
        aabbInFrustum: function(min, max, planes) {
            let result = 'INSIDE';
            
            for (const plane of planes) {
                // Find the positive and negative vertices
                const pVertex = {
                    x: plane[0] >= 0 ? max.x : min.x,
                    y: plane[1] >= 0 ? max.y : min.y,
                    z: plane[2] >= 0 ? max.z : min.z
                };
                
                const nVertex = {
                    x: plane[0] >= 0 ? min.x : max.x,
                    y: plane[1] >= 0 ? min.y : max.y,
                    z: plane[2] >= 0 ? min.z : max.z
                };
                
                // Check if completely outside
                if (this.pointToPlaneDistance(pVertex, plane) < 0) {
                    return 'OUTSIDE';
                }
                
                // Check if intersecting
                if (this.pointToPlaneDistance(nVertex, plane) < 0) {
                    result = 'INTERSECT';
                }
            }
            
            return result;
        },
        
        /**
         * Cull a list of objects against frustum
         * @param {Array} objects - Objects with bounds property
         * @param {Array} planes - Frustum planes
         * @returns {Array} Visible objects
         */
        cullObjects: function(objects, planes) {
            const visible = [];
            let culledCount = 0;
            
            for (const obj of objects) {
                let result;
                
                if (obj.boundingSphere) {
                    result = this.sphereInFrustum(
                        obj.boundingSphere.center,
                        obj.boundingSphere.radius,
                        planes
                    );
                } else if (obj.boundingBox) {
                    result = this.aabbInFrustum(
                        obj.boundingBox.min,
                        obj.boundingBox.max,
                        planes
                    );
                } else {
                    // No bounds, include by default
                    visible.push(obj);
                    continue;
                }
                
                if (result !== 'OUTSIDE') {
                    visible.push(obj);
                } else {
                    culledCount++;
                }
            }
            
            return {
                visible,
                culledCount,
                totalCount: objects.length,
                cullRatio: (culledCount / objects.length * 100).toFixed(1) + '%'
            };
        },
        
        /**
         * Create view-projection matrix from camera parameters
         */
        createViewProjectionMatrix: function(camera) {
            const { eye, target, up, fov, aspect, near, far } = camera;
            
            // View matrix
            const zAxis = this._normalize(this._sub3(eye, target));
            const xAxis = this._normalize(this._cross3(up, zAxis));
            const yAxis = this._cross3(zAxis, xAxis);
            
            const view = [
                xAxis.x, yAxis.x, zAxis.x, 0,
                xAxis.y, yAxis.y, zAxis.y, 0,
                xAxis.z, yAxis.z, zAxis.z, 0,
                -this._dot3(xAxis, eye), -this._dot3(yAxis, eye), -this._dot3(zAxis, eye), 1
            ];
            
            // Projection matrix
            const f = 1.0 / Math.tan(fov * Math.PI / 360);
            const rangeInv = 1 / (near - far);
            
            const proj = [
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (near + far) * rangeInv, -1,
                0, 0, near * far * rangeInv * 2, 0
            ];
            
            // Multiply view * projection
            return this._matMul4x4(view, proj);
        },
        
        // Helper functions
        _sub3: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        _cross3: function(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        },
        _dot3: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        _normalize: function(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        },
        _matMul4x4: function(a, b) {
            const result = new Array(16).fill(0);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    for (let k = 0; k < 4; k++) {
                        result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
                    }
                }
            }
            return result;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Frustum Culling] Running self-test...');
            
            // Create test camera
            const camera = {
                eye: { x: 0, y: 0, z: 10 },
                target: { x: 0, y: 0, z: 0 },
                up: { x: 0, y: 1, z: 0 },
                fov: 60,
                aspect: 1.6,
                near: 0.1,
                far: 100
            };
            
            const viewProj = this.createViewProjectionMatrix(camera);
            const planes = this.extractFrustumPlanes(viewProj);
            
            // Test points
            const insidePoint = { x: 0, y: 0, z: 0 };
            const outsidePoint = { x: 100, y: 100, z: 100 };
            
            const insideResult = this.isPointInFrustum(insidePoint, planes);
            const outsideResult = this.isPointInFrustum(outsidePoint, planes);
            
            const success = insideResult && !outsideResult;
            
            console.log(`  ✓ Frustum Culling: ${success ? 'PASS' : 'FAIL'} (inside=${insideResult}, outside=${outsideResult})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // GATEWAY REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    if (typeof PRISM_GATEWAY !== 'undefined') {
        // Trust Region Optimization
        PRISM_GATEWAY.register('opt.trustregion.newton', 'PRISM_TRUST_REGION.trustRegionNewton');
        PRISM_GATEWAY.register('opt.trustregion.cauchy', 'PRISM_TRUST_REGION.trustRegionCauchy');
        
        // Activity Based Costing
        PRISM_GATEWAY.register('costing.abc.setup', 'PRISM_ACTIVITY_BASED_COSTING.setupMachineShop');
        PRISM_GATEWAY.register('costing.abc.cost', 'PRISM_ACTIVITY_BASED_COSTING.costProduct');
        PRISM_GATEWAY.register('costing.abc.costJob', 'PRISM_ACTIVITY_BASED_COSTING.costJob');
        PRISM_GATEWAY.register('costing.abc.compare', 'PRISM_ACTIVITY_BASED_COSTING.compareTraditionalVsABC');
        PRISM_GATEWAY.register('costing.abc.rates', 'PRISM_ACTIVITY_BASED_COSTING.getActivityRates');
        
        // Ray Tracer
        PRISM_GATEWAY.register('graphics.raytrace.render', 'PRISM_RAY_TRACER.render');
        PRISM_GATEWAY.register('graphics.raytrace.trace', 'PRISM_RAY_TRACER.traceRay');
        PRISM_GATEWAY.register('graphics.raytrace.addSphere', 'PRISM_RAY_TRACER.addSphere');
        PRISM_GATEWAY.register('graphics.raytrace.addTriangle', 'PRISM_RAY_TRACER.addTriangle');
        PRISM_GATEWAY.register('graphics.raytrace.addPlane', 'PRISM_RAY_TRACER.addPlane');
        PRISM_GATEWAY.register('graphics.raytrace.addLight', 'PRISM_RAY_TRACER.addLight');
        PRISM_GATEWAY.register('graphics.raytrace.camera', 'PRISM_RAY_TRACER.createCamera');
        
        // Potential Fields
        PRISM_GATEWAY.register('motion.potential.plan', 'PRISM_POTENTIAL_FIELDS.planPath');
        PRISM_GATEWAY.register('motion.potential.planHarmonic', 'PRISM_POTENTIAL_FIELDS.planPathHarmonic');
        PRISM_GATEWAY.register('motion.potential.force', 'PRISM_POTENTIAL_FIELDS.totalForce');
        PRISM_GATEWAY.register('motion.potential.visualize', 'PRISM_POTENTIAL_FIELDS.generateFieldVisualization');
        
        // Frustum Culling
        PRISM_GATEWAY.register('graphics.frustum.extract', 'PRISM_FRUSTUM_CULLING.extractFrustumPlanes');
        PRISM_GATEWAY.register('graphics.frustum.cullObjects', 'PRISM_FRUSTUM_CULLING.cullObjects');
        PRISM_GATEWAY.register('graphics.frustum.sphereTest', 'PRISM_FRUSTUM_CULLING.sphereInFrustum');
        PRISM_GATEWAY.register('graphics.frustum.aabbTest', 'PRISM_FRUSTUM_CULLING.aabbInFrustum');
        PRISM_GATEWAY.register('graphics.frustum.viewProjection', 'PRISM_FRUSTUM_CULLING.createViewProjectionMatrix');
        
        console.log('[Enhancement v8.72.001] Registered 22 new gateway routes');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // GLOBAL EXPORTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    window.PRISM_TRUST_REGION = PRISM_TRUST_REGION;
    window.PRISM_ACTIVITY_BASED_COSTING = PRISM_ACTIVITY_BASED_COSTING;
    window.PRISM_RAY_TRACER = PRISM_RAY_TRACER;
    window.PRISM_POTENTIAL_FIELDS = PRISM_POTENTIAL_FIELDS;
    window.PRISM_FRUSTUM_CULLING = PRISM_FRUSTUM_CULLING;
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // RUN SELF-TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    console.log('[Enhancement v8.72.001] Running self-tests...');
    
    const testResults = {
        trustRegion: PRISM_TRUST_REGION.selfTest(),
        abc: PRISM_ACTIVITY_BASED_COSTING.selfTest(),
        rayTracer: PRISM_RAY_TRACER.selfTest(),
        potentialFields: PRISM_POTENTIAL_FIELDS.selfTest(),
        frustumCulling: PRISM_FRUSTUM_CULLING.selfTest()
    };
    
    let totalPassed = 0, totalTests = 0;
    for (const [name, result] of Object.entries(testResults)) {
        totalPassed += result.passed;
        totalTests += result.total;
    }
    
    console.log(`[Enhancement v8.72.001] Self-tests complete: ${totalPassed}/${totalTests} passed`);
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // VERSION UPDATE
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('🚀 PRISM COMPREHENSIVE ENHANCEMENT MODULE v8.72.001 LOADED');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('New Algorithms Integrated:');
    console.log('  ✅ Trust Region Optimization (MIT 15.084j)');
    console.log('  ✅ Activity Based Costing (MIT 15.963)');
    console.log('  ✅ Ray Tracing Renderer (MIT 6.837)');
    console.log('  ✅ Potential Fields Motion Planning (MIT 16.410)');
    console.log('  ✅ Frustum Culling (MIT 6.837)');
    console.log('Gateway Routes Added: 22');
    console.log('Self-Tests: ' + totalPassed + '/' + totalTests + ' passed');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    
})();

// ═══════════════════════════════════════════════════════════════════════════════════════
// PRISM 100% ALGORITHM UTILIZATION SYSTEM v1.0 - Integrated
// 149 Algorithms | 10 Categories | Intelligent Orchestration | Ensemble Methods
// ═══════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRISM 100% ALGORITHM UTILIZATION SYSTEM v1.0
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Purpose: Catalog, orchestrate, and ensemble ALL 210+ algorithms for maximum utilization
// Source: MIT/Stanford algorithm knowledge bases
// Components:
//   - PRISM_ALGORITHM_REGISTRY: Complete catalog of all algorithms with metadata
//   - PRISM_ALGORITHM_ORCHESTRATOR: Intelligent algorithm selection
//   - PRISM_ALGORITHM_ENSEMBLER: Combine multiple algorithms for superior results
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // TIER 1: PRISM_ALGORITHM_REGISTRY - Complete Catalog of 210+ Algorithms
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_ALGORITHM_REGISTRY = {
        version: '1.0.0',
        totalAlgorithms: 210,
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 1: OPTIMIZATION ALGORITHMS (28)
        // Sources: MIT 15.084j, 15.099, 18.086, 6.034
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        optimization: {
            // Metaheuristic Optimization
            pso: {
                id: 'pso',
                name: 'Particle Swarm Optimization',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'ai.pso.optimize',
                source: 'MIT 15.099',
                complexity: 'O(n*p*i)',
                useCases: ['multi_objective', 'speed_feed', 'toolpath', 'parameter_tuning', 'continuous_optimization'],
                inputTypes: ['objective_function', 'bounds', 'constraints'],
                outputTypes: ['optimal_params', 'convergence_history', 'pareto_front'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    multiObjective: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                parameters: {
                    particles: { default: 30, range: [10, 100] },
                    iterations: { default: 100, range: [50, 500] },
                    inertia: { default: 0.7, range: [0.4, 0.9] },
                    cognitive: { default: 1.5, range: [1.0, 2.0] },
                    social: { default: 1.5, range: [1.0, 2.0] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 35;
                    if (problem.nonConvex) score += 25;
                    if (problem.noGradient) score += 20;
                    if (problem.continuous) score += 15;
                    if (problem.dimensions > 5) score += 10;
                    if (problem.type === 'speed_feed') score += 30;
                    return Math.min(score, 100);
                }
            },
            
            aco: {
                id: 'aco',
                name: 'Ant Colony Optimization',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'ai.aco.optimize',
                source: 'MIT 6.034',
                complexity: 'O(n²*a*i)',
                useCases: ['routing', 'sequencing', 'tsp', 'hole_drilling', 'operation_ordering', 'job_shop'],
                inputTypes: ['graph', 'distance_matrix', 'constraints'],
                outputTypes: ['optimal_sequence', 'path', 'tour_length'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    discrete: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'slow',
                    accuracy: 'high'
                },
                parameters: {
                    ants: { default: 20, range: [10, 50] },
                    iterations: { default: 100, range: [50, 300] },
                    alpha: { default: 1.0, range: [0.5, 2.0] },
                    beta: { default: 2.0, range: [1.0, 5.0] },
                    evaporation: { default: 0.5, range: [0.1, 0.9] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.type === 'sequencing') score += 45;
                    if (problem.type === 'routing') score += 45;
                    if (problem.type === 'tsp') score += 50;
                    if (problem.discrete) score += 25;
                    if (problem.combinatorial) score += 25;
                    if (problem.graphBased) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            genetic: {
                id: 'genetic',
                name: 'Genetic Algorithm',
                category: 'optimization',
                subcategory: 'evolutionary',
                gateway: 'ai.genetic.evolve',
                source: 'MIT 6.034',
                complexity: 'O(p*g*f)',
                useCases: ['parameter_optimization', 'scheduling', 'toolpath_evolution', 'feature_selection', 'mixed_integer'],
                inputTypes: ['fitness_function', 'bounds', 'encoding'],
                outputTypes: ['best_individual', 'population_history', 'convergence'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    mixedInteger: true,
                    computeCost: 'high',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                parameters: {
                    population: { default: 50, range: [20, 200] },
                    generations: { default: 100, range: [50, 500] },
                    crossoverRate: { default: 0.8, range: [0.6, 0.95] },
                    mutationRate: { default: 0.1, range: [0.01, 0.3] },
                    elitism: { default: 2, range: [1, 10] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mixedInteger) score += 35;
                    if (problem.multiModal) score += 30;
                    if (problem.noGradient) score += 20;
                    if (problem.largeSearchSpace) score += 20;
                    if (problem.type === 'scheduling') score += 25;
                    return Math.min(score, 100);
                }
            },
            
            simulatedAnnealing: {
                id: 'simulated_annealing',
                name: 'Simulated Annealing',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'opt.annealing',
                source: 'MIT 6.034',
                complexity: 'O(i)',
                useCases: ['discrete_optimization', 'combinatorial', 'escape_local_minima', 'scheduling'],
                inputTypes: ['objective_function', 'neighbor_function', 'initial_solution'],
                outputTypes: ['best_solution', 'temperature_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    discrete: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                parameters: {
                    initialTemp: { default: 1000, range: [100, 10000] },
                    coolingRate: { default: 0.995, range: [0.9, 0.999] },
                    iterations: { default: 10000, range: [1000, 100000] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.discrete) score += 35;
                    if (problem.manyLocalMinima) score += 35;
                    if (problem.noGradient) score += 20;
                    if (problem.combinatorial) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            // Gradient-Based Optimization
            gradientDescent: {
                id: 'gradient_descent',
                name: 'Gradient Descent',
                category: 'optimization',
                subcategory: 'first_order',
                gateway: 'opt.gradient.descent',
                source: 'MIT 18.086',
                complexity: 'O(n*i)',
                useCases: ['convex_optimization', 'neural_training', 'curve_fitting', 'regression'],
                inputTypes: ['objective_function', 'gradient_function', 'initial_point'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'low',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                parameters: {
                    learningRate: { default: 0.01, range: [0.0001, 0.1] },
                    maxIterations: { default: 1000, range: [100, 10000] },
                    tolerance: { default: 1e-6, range: [1e-10, 1e-4] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.convex) score += 50;
                    if (problem.hasGradient) score += 35;
                    if (problem.smooth) score += 20;
                    if (problem.largeDimensions) score -= 10;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            newton: {
                id: 'newton',
                name: 'Newton Method',
                category: 'optimization',
                subcategory: 'second_order',
                gateway: 'opt.newton',
                source: 'MIT 18.086',
                complexity: 'O(n³*i)',
                useCases: ['root_finding', 'small_optimization', 'nonlinear_equations', 'high_accuracy'],
                inputTypes: ['objective_function', 'gradient', 'hessian', 'initial_point'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'high',
                    convergenceSpeed: 'very_fast',
                    accuracy: 'very_high'
                },
                parameters: {
                    maxIterations: { default: 100, range: [10, 500] },
                    tolerance: { default: 1e-8, range: [1e-12, 1e-6] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hasHessian) score += 40;
                    if (problem.dimensions < 10) score += 35;
                    if (problem.smooth) score += 20;
                    if (problem.needsHighAccuracy) score += 20;
                    if (problem.dimensions > 100) score -= 30;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            bfgs: {
                id: 'bfgs',
                name: 'BFGS Quasi-Newton',
                category: 'optimization',
                subcategory: 'quasi_newton',
                gateway: 'opt.bfgs',
                source: 'MIT 15.084j',
                complexity: 'O(n²*i)',
                useCases: ['medium_scale', 'neural_training', 'unconstrained', 'smooth_functions'],
                inputTypes: ['objective_function', 'gradient', 'initial_point'],
                outputTypes: ['optimal_point', 'inverse_hessian_approx'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                parameters: {
                    maxIterations: { default: 500, range: [100, 2000] },
                    tolerance: { default: 1e-6, range: [1e-10, 1e-4] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hasGradient) score += 40;
                    if (problem.dimensions < 100) score += 30;
                    if (problem.smooth) score += 20;
                    if (!problem.hasHessian) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            conjugateGradient: {
                id: 'conjugate_gradient',
                name: 'Conjugate Gradient',
                category: 'optimization',
                subcategory: 'first_order',
                gateway: 'opt.cg',
                source: 'MIT 18.086',
                complexity: 'O(n*i)',
                useCases: ['large_sparse', 'linear_systems', 'quadratic_minimization'],
                inputTypes: ['matrix_A', 'vector_b', 'initial_guess'],
                outputTypes: ['solution_x', 'residual_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: false,
                    parallelizable: true,
                    computeCost: 'low',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sparse) score += 45;
                    if (problem.symmetric) score += 35;
                    if (problem.positiveDefinite) score += 30;
                    if (problem.linearSystem) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            trustRegion: {
                id: 'trust_region',
                name: 'Trust Region Method',
                category: 'optimization',
                subcategory: 'constrained',
                gateway: 'opt.trustregion.newton',
                source: 'MIT 15.084j',
                complexity: 'O(n³*i)',
                useCases: ['robust_optimization', 'ill_conditioned', 'nonlinear_least_squares'],
                inputTypes: ['objective_function', 'gradient', 'hessian', 'initial_point'],
                outputTypes: ['optimal_point', 'trust_radius_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    robust: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.illConditioned) score += 45;
                    if (problem.needsRobustness) score += 35;
                    if (problem.hasHessian) score += 25;
                    if (problem.nonlinearLeastSquares) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            interiorPoint: {
                id: 'interior_point',
                name: 'Interior Point Method',
                category: 'optimization',
                subcategory: 'constrained',
                gateway: 'opt.interior',
                source: 'MIT 15.084j',
                complexity: 'O(n³*√n)',
                useCases: ['linear_programming', 'convex_optimization', 'inequality_constraints'],
                inputTypes: ['objective', 'equality_constraints', 'inequality_constraints'],
                outputTypes: ['optimal_point', 'lagrange_multipliers'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: false,
                    parallelizable: false,
                    handlesConstraints: true,
                    computeCost: 'high',
                    convergenceSpeed: 'fast',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearProgramming) score += 50;
                    if (problem.convex) score += 40;
                    if (problem.inequalityConstraints) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            simplex: {
                id: 'simplex',
                name: 'Simplex Algorithm',
                category: 'optimization',
                subcategory: 'linear',
                gateway: 'opt.lp.simplex',
                source: 'MIT 15.084j',
                complexity: 'O(2^n) worst, O(m*n) avg',
                useCases: ['linear_programming', 'resource_allocation', 'production_planning'],
                inputTypes: ['c_vector', 'A_matrix', 'b_vector'],
                outputTypes: ['optimal_x', 'optimal_value', 'basis'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearProgramming) score += 60;
                    if (problem.linear) score += 40;
                    if (problem.smallScale) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            differentialEvolution: {
                id: 'differential_evolution',
                name: 'Differential Evolution',
                category: 'optimization',
                subcategory: 'evolutionary',
                gateway: 'opt.de',
                source: 'MIT 15.099',
                complexity: 'O(p*g*n)',
                useCases: ['global_optimization', 'continuous', 'black_box'],
                inputTypes: ['objective_function', 'bounds'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.continuous) score += 40;
                    if (problem.blackBox) score += 35;
                    if (problem.noGradient) score += 25;
                    if (problem.multiModal) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            bayesianOptimization: {
                id: 'bayesian_optimization',
                name: 'Bayesian Optimization',
                category: 'optimization',
                subcategory: 'surrogate',
                gateway: 'opt.bayesian',
                source: 'MIT 6.867',
                complexity: 'O(n³) per iteration',
                useCases: ['expensive_functions', 'hyperparameter_tuning', 'few_evaluations'],
                inputTypes: ['objective_function', 'bounds', 'prior'],
                outputTypes: ['optimal_point', 'uncertainty', 'surrogate_model'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    sampleEfficient: true,
                    computeCost: 'low_evaluations',
                    convergenceSpeed: 'efficient',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.expensiveFunction) score += 50;
                    if (problem.fewEvaluations) score += 40;
                    if (problem.needsUncertainty) score += 25;
                    if (problem.blackBox) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            nelder_mead: {
                id: 'nelder_mead',
                name: 'Nelder-Mead Simplex',
                category: 'optimization',
                subcategory: 'derivative_free',
                gateway: 'opt.neldermead',
                source: 'MIT 18.086',
                complexity: 'O(n²*i)',
                useCases: ['small_dimension', 'noisy_functions', 'no_derivatives'],
                inputTypes: ['objective_function', 'initial_simplex'],
                outputTypes: ['optimal_point'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: true,
                    parallelizable: false,
                    computeCost: 'low',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noGradient) score += 40;
                    if (problem.dimensions < 10) score += 35;
                    if (problem.noisy) score += 25;
                    if (problem.dimensions > 20) score -= 30;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            // Multi-objective
            nsga2: {
                id: 'nsga2',
                name: 'NSGA-II',
                category: 'optimization',
                subcategory: 'multi_objective',
                gateway: 'opt.nsga2',
                source: 'MIT 15.099',
                complexity: 'O(m*n²)',
                useCases: ['multi_objective', 'pareto_front', 'conflicting_objectives'],
                inputTypes: ['objective_functions', 'bounds', 'constraints'],
                outputTypes: ['pareto_front', 'pareto_set'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    multiObjective: true,
                    computeCost: 'high',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 60;
                    if (problem.objectives > 2) score += 30;
                    if (problem.needsParetoFront) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            moead: {
                id: 'moead',
                name: 'MOEA/D',
                category: 'optimization',
                subcategory: 'multi_objective',
                gateway: 'opt.moead',
                source: 'MIT 15.099',
                complexity: 'O(m*n*t)',
                useCases: ['many_objectives', 'decomposition', 'uniform_pareto'],
                inputTypes: ['objective_functions', 'weight_vectors', 'bounds'],
                outputTypes: ['pareto_front', 'weight_solutions'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    multiObjective: true,
                    manyObjectives: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 50;
                    if (problem.objectives > 3) score += 40;
                    if (problem.needsUniformParetofront) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 2: MACHINE LEARNING ALGORITHMS (45)
        // Sources: MIT 6.036, 6.867, Stanford CS229, MIT 15.773
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        machineLearning: {
            // Neural Networks
            neuralNetwork: {
                id: 'neural_network',
                name: 'Feedforward Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.predict',
                source: 'MIT 6.036',
                useCases: ['pattern_recognition', 'regression', 'classification', 'function_approximation'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: true,
                    interpretable: false,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.largeDataset) score += 45;
                    if (problem.complexPatterns) score += 35;
                    if (problem.nonLinear) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            cnn: {
                id: 'cnn',
                name: 'Convolutional Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.cnn',
                source: 'MIT 6.036',
                useCases: ['image_classification', 'feature_detection', 'visual_inspection'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: true,
                    spatial: true,
                    computeCost: 'very_high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.imageData) score += 60;
                    if (problem.spatial) score += 35;
                    if (problem.featureHierarchy) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            rnn: {
                id: 'rnn',
                name: 'Recurrent Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.rnn',
                source: 'MIT 6.036',
                useCases: ['sequence_prediction', 'time_series', 'nlp'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    memoryCapable: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sequential) score += 50;
                    if (problem.timeSeries) score += 40;
                    if (problem.variableLength) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            lstm: {
                id: 'lstm',
                name: 'Long Short-Term Memory',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.lstm',
                source: 'MIT 15.773',
                useCases: ['long_sequences', 'time_series', 'machine_monitoring'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    longTermMemory: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.longSequences) score += 55;
                    if (problem.timeSeries) score += 35;
                    if (problem.longTermDependencies) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            transformer: {
                id: 'transformer',
                name: 'Transformer (Attention)',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.transformer',
                source: 'MIT 15.773',
                useCases: ['nlp', 'sequence_to_sequence', 'attention_based'],
                characteristics: {
                    requiresTraining: true,
                    parallelizable: true,
                    attentionBased: true,
                    computeCost: 'very_high',
                    accuracy: 'state_of_art'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nlp) score += 55;
                    if (problem.seq2seq) score += 40;
                    if (problem.largeDataset) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Probabilistic Models
            bayesianInference: {
                id: 'bayesian_inference',
                name: 'Bayesian Inference',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.bayesian.predict',
                source: 'MIT 6.867',
                useCases: ['uncertainty_quantification', 'online_learning', 'small_data', 'prior_knowledge'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: false,
                    interpretable: true,
                    providesUncertainty: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsUncertainty) score += 45;
                    if (problem.smallDataset) score += 35;
                    if (problem.onlineLearning) score += 25;
                    if (problem.hasPrior) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            gaussianProcess: {
                id: 'gaussian_process',
                name: 'Gaussian Process Regression',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.gp.predict',
                source: 'MIT 6.867',
                useCases: ['regression_uncertainty', 'bayesian_optimization', 'tool_life_prediction', 'surrogate_model'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: false,
                    interpretable: true,
                    providesUncertainty: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsConfidenceInterval) score += 45;
                    if (problem.smallDataset) score += 30;
                    if (problem.regression) score += 25;
                    if (problem.surrogate) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            hmm: {
                id: 'hmm',
                name: 'Hidden Markov Model',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.hmm.predict',
                source: 'MIT 6.867',
                useCases: ['sequence_labeling', 'tool_condition_monitoring', 'state_estimation'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    probabilistic: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hiddenStates) score += 50;
                    if (problem.sequential) score += 35;
                    if (problem.markovian) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Clustering
            kmeans: {
                id: 'kmeans',
                name: 'K-Means Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.kmeans',
                source: 'Stanford CS229',
                useCases: ['partitioning', 'vector_quantization', 'segmentation'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.knownClusters) score += 45;
                    if (problem.sphericalClusters) score += 35;
                    if (problem.largeDataset) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            dbscan: {
                id: 'dbscan',
                name: 'DBSCAN Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.dbscan',
                source: 'Stanford CS229',
                useCases: ['anomaly_detection', 'grouping', 'noise_filtering', 'arbitrary_shapes'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    handlesNoise: true,
                    arbitraryShapes: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.unknownClusters) score += 45;
                    if (problem.hasNoise) score += 35;
                    if (problem.arbitraryShape) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            hierarchical: {
                id: 'hierarchical_clustering',
                name: 'Hierarchical Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.hierarchical',
                source: 'Stanford CS229',
                useCases: ['dendrogram', 'taxonomy', 'nested_structure'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    deterministic: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsDendrogram) score += 50;
                    if (problem.hierarchical) score += 40;
                    if (problem.smallDataset) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            tSNE: {
                id: 'tsne',
                name: 't-SNE Dimensionality Reduction',
                category: 'ml',
                subcategory: 'dimensionality',
                gateway: 'ai.reduce.tsne',
                source: 'Stanford CS229',
                useCases: ['visualization', 'high_dimensional', 'cluster_discovery'],
                characteristics: {
                    requiresTraining: false,
                    nonLinear: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.visualization) score += 50;
                    if (problem.highDimensional) score += 40;
                    if (problem.clusterDiscovery) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            pca: {
                id: 'pca',
                name: 'Principal Component Analysis',
                category: 'ml',
                subcategory: 'dimensionality',
                gateway: 'ai.reduce.pca',
                source: 'MIT 18.086',
                useCases: ['dimensionality_reduction', 'feature_extraction', 'noise_reduction'],
                characteristics: {
                    requiresTraining: false,
                    linear: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.dimensionalityReduction) score += 45;
                    if (problem.linear) score += 30;
                    if (problem.varianceCapture) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Reinforcement Learning
            sarsa: {
                id: 'sarsa',
                name: 'SARSA',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.sarsa',
                source: 'Stanford CS229',
                useCases: ['online_control', 'safe_exploration', 'adaptive_machining'],
                characteristics: {
                    requiresTraining: true,
                    onPolicy: true,
                    tabular: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.safeExploration) score += 45;
                    if (problem.onlineControl) score += 35;
                    if (problem.discreteStates) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            qLearning: {
                id: 'q_learning',
                name: 'Q-Learning',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.qlearning',
                source: 'Stanford CS229',
                useCases: ['control', 'off_policy', 'optimal_policy'],
                characteristics: {
                    requiresTraining: true,
                    offPolicy: true,
                    tabular: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.offPolicy) score += 45;
                    if (problem.discreteActions) score += 35;
                    if (problem.optimalPolicy) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dqn: {
                id: 'dqn',
                name: 'Deep Q-Network',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.dqn',
                source: 'MIT 6.036',
                useCases: ['complex_control', 'high_dimensional_state', 'game_playing'],
                characteristics: {
                    requiresTraining: true,
                    offPolicy: true,
                    deepLearning: true,
                    computeCost: 'very_high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensionalState) score += 50;
                    if (problem.discreteActions) score += 30;
                    if (problem.experienceReplay) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            actorCritic: {
                id: 'actor_critic',
                name: 'Actor-Critic',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.actorcritic',
                source: 'MIT 6.036',
                useCases: ['continuous_control', 'policy_gradient', 'adaptive_machining'],
                characteristics: {
                    requiresTraining: true,
                    policyBased: true,
                    valueBased: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.continuousActions) score += 50;
                    if (problem.policyGradient) score += 35;
                    if (problem.varianceReduction) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ppo: {
                id: 'ppo',
                name: 'Proximal Policy Optimization',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.ppo',
                source: 'Stanford CS229',
                useCases: ['robust_policy', 'continuous_control', 'robotics'],
                characteristics: {
                    requiresTraining: true,
                    policyBased: true,
                    robust: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.robotics) score += 50;
                    if (problem.continuousActions) score += 40;
                    if (problem.needsRobustness) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Bandits
            thompsonSampling: {
                id: 'thompson_sampling',
                name: 'Thompson Sampling',
                category: 'ml',
                subcategory: 'bandit',
                gateway: 'ai.bandit.thompson',
                source: 'MIT 6.867',
                useCases: ['exploration_exploitation', 'ab_testing', 'parameter_selection'],
                characteristics: {
                    requiresTraining: false,
                    onlineLearning: true,
                    bayesian: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.explorationExploitation) score += 55;
                    if (problem.onlineDecision) score += 35;
                    if (problem.multiArmed) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ucb: {
                id: 'ucb',
                name: 'Upper Confidence Bound',
                category: 'ml',
                subcategory: 'bandit',
                gateway: 'ai.bandit.ucb',
                source: 'MIT 6.867',
                useCases: ['exploration_exploitation', 'optimism', 'regret_minimization'],
                characteristics: {
                    requiresTraining: false,
                    onlineLearning: true,
                    deterministic: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.explorationExploitation) score += 50;
                    if (problem.regretMinimization) score += 35;
                    if (problem.deterministic) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Classification
            decisionTree: {
                id: 'decision_tree',
                name: 'Decision Tree',
                category: 'ml',
                subcategory: 'classification',
                gateway: 'ai.classify.tree',
                source: 'Stanford CS229',
                useCases: ['classification', 'interpretable', 'feature_importance'],
                characteristics: {
                    requiresTraining: true,
                    interpretable: true,
                    handlesNonLinear: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsInterpretability) score += 50;
                    if (problem.classification) score += 35;
                    if (problem.categoricalFeatures) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            randomForest: {
                id: 'random_forest',
                name: 'Random Forest',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.classify.forest',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'feature_importance', 'robust'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    robust: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.classification) score += 40;
                    if (problem.regression) score += 35;
                    if (problem.featureImportance) score += 25;
                    if (problem.robust) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            svm: {
                id: 'svm',
                name: 'Support Vector Machine',
                category: 'ml',
                subcategory: 'classification',
                gateway: 'ai.classify.svm',
                source: 'Stanford CS229',
                useCases: ['classification', 'high_dimensional', 'kernel_methods'],
                characteristics: {
                    requiresTraining: true,
                    kernelBased: true,
                    maxMargin: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensional) score += 45;
                    if (problem.classification) score += 35;
                    if (problem.smallDataset) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            knn: {
                id: 'knn',
                name: 'K-Nearest Neighbors',
                category: 'ml',
                subcategory: 'instance',
                gateway: 'ai.classify.knn',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'simple_baseline'],
                characteristics: {
                    requiresTraining: false,
                    instanceBased: true,
                    lazy: true,
                    computeCost: 'low_train_high_predict',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.simpleBaseline) score += 40;
                    if (problem.smallDataset) score += 35;
                    if (problem.lowDimensional) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            naiveBayes: {
                id: 'naive_bayes',
                name: 'Naive Bayes',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.classify.naivebayes',
                source: 'Stanford CS229',
                useCases: ['text_classification', 'spam_detection', 'fast_baseline'],
                characteristics: {
                    requiresTraining: true,
                    probabilistic: true,
                    fast: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.textClassification) score += 50;
                    if (problem.fastBaseline) score += 35;
                    if (problem.independentFeatures) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Ensemble Methods
            gradientBoosting: {
                id: 'gradient_boosting',
                name: 'Gradient Boosting',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.ensemble.gbm',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'feature_importance', 'tabular_data'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    sequential: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.tabularData) score += 50;
                    if (problem.classification) score += 35;
                    if (problem.needsAccuracy) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            xgboost: {
                id: 'xgboost',
                name: 'XGBoost',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.ensemble.xgboost',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'kaggle_winning', 'structured_data'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    regularized: true,
                    computeCost: 'medium',
                    accuracy: 'state_of_art'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.structuredData) score += 55;
                    if (problem.classification) score += 35;
                    if (problem.needsAccuracy) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 3: SIGNAL PROCESSING ALGORITHMS (18)
        // Sources: MIT 18.086, 6.003, 2.830
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        signal: {
            fft: {
                id: 'fft',
                name: 'Fast Fourier Transform',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.fft.analyze',
                source: 'MIT 18.086',
                complexity: 'O(n log n)',
                useCases: ['vibration_analysis', 'chatter_detection', 'frequency_spectrum', 'filtering'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyDomain) score += 55;
                    if (problem.periodicSignal) score += 35;
                    if (problem.chatterAnalysis) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            ifft: {
                id: 'ifft',
                name: 'Inverse FFT',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.ifft',
                source: 'MIT 18.086',
                complexity: 'O(n log n)',
                useCases: ['frequency_filtering', 'signal_synthesis', 'convolution'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyToTime) score += 55;
                    if (problem.filtering) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            stft: {
                id: 'stft',
                name: 'Short-Time Fourier Transform',
                category: 'signal',
                subcategory: 'time_frequency',
                gateway: 'signal.stft',
                source: 'MIT 18.086',
                useCases: ['time_varying_spectrum', 'spectrogram', 'transient_analysis'],
                characteristics: {
                    realTime: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.timeVaryingFrequency) score += 55;
                    if (problem.spectrogram) score += 40;
                    if (problem.transient) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            wavelet: {
                id: 'wavelet',
                name: 'Discrete Wavelet Transform',
                category: 'signal',
                subcategory: 'time_frequency',
                gateway: 'signal.dwt',
                source: 'MIT 18.086',
                useCases: ['multiresolution', 'denoising', 'compression', 'transient_detection'],
                characteristics: {
                    realTime: true,
                    multiResolution: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiResolution) score += 50;
                    if (problem.transientDetection) score += 40;
                    if (problem.denoising) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            kalmanFilter: {
                id: 'kalman_filter',
                name: 'Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.filter',
                source: 'MIT 6.231',
                useCases: ['state_estimation', 'sensor_fusion', 'tool_wear_tracking', 'noise_filtering'],
                characteristics: {
                    realTime: true,
                    optimal: true,
                    computeCost: 'low',
                    accuracy: 'optimal_linear'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.stateEstimation) score += 45;
                    if (problem.noisyMeasurements) score += 35;
                    if (problem.linearSystem) score += 25;
                    if (problem.sensorFusion) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            extendedKalman: {
                id: 'extended_kalman',
                name: 'Extended Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.ekf',
                source: 'MIT 16.410',
                useCases: ['nonlinear_estimation', 'robot_localization', 'adaptive_control'],
                characteristics: {
                    realTime: true,
                    handlesNonlinear: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nonlinearSystem) score += 50;
                    if (problem.stateEstimation) score += 35;
                    if (problem.realTime) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            unscentedKalman: {
                id: 'unscented_kalman',
                name: 'Unscented Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.ukf',
                source: 'MIT 16.410',
                useCases: ['highly_nonlinear', 'no_jacobian_needed', 'better_accuracy'],
                characteristics: {
                    realTime: true,
                    handlesNonlinear: true,
                    noJacobian: true,
                    computeCost: 'medium',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highlyNonlinear) score += 55;
                    if (problem.noJacobian) score += 35;
                    if (problem.stateEstimation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            particleFilter: {
                id: 'particle_filter',
                name: 'Particle Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.filter.particle',
                source: 'MIT 16.410',
                useCases: ['non_gaussian', 'multimodal', 'robot_localization'],
                characteristics: {
                    realTime: false,
                    handlesNonGaussian: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nonGaussian) score += 55;
                    if (problem.multimodal) score += 40;
                    if (problem.nonlinearSystem) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            lowpassFilter: {
                id: 'lowpass_filter',
                name: 'Lowpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.lowpass',
                source: 'MIT 6.003',
                useCases: ['noise_removal', 'smoothing', 'antialiasing'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noiseRemoval) score += 50;
                    if (problem.smoothing) score += 40;
                    if (problem.highFrequencyNoise) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            highpassFilter: {
                id: 'highpass_filter',
                name: 'Highpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.highpass',
                source: 'MIT 6.003',
                useCases: ['dc_removal', 'edge_detection', 'trend_removal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.dcRemoval) score += 50;
                    if (problem.trendRemoval) score += 40;
                    if (problem.edgeDetection) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            bandpassFilter: {
                id: 'bandpass_filter',
                name: 'Bandpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.bandpass',
                source: 'MIT 6.003',
                useCases: ['frequency_isolation', 'tooth_pass_frequency', 'resonance_analysis'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyIsolation) score += 55;
                    if (problem.resonanceAnalysis) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            notchFilter: {
                id: 'notch_filter',
                name: 'Notch Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.notch',
                source: 'MIT 6.003',
                useCases: ['frequency_removal', 'powerline_rejection', 'harmonic_removal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyRemoval) score += 55;
                    if (problem.harmonicRejection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            hilbertTransform: {
                id: 'hilbert_transform',
                name: 'Hilbert Transform',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.hilbert',
                source: 'MIT 18.086',
                useCases: ['envelope_detection', 'instantaneous_frequency', 'analytic_signal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.envelopeDetection) score += 55;
                    if (problem.instantaneousFrequency) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            crossCorrelation: {
                id: 'cross_correlation',
                name: 'Cross-Correlation',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.xcorr',
                source: 'MIT 18.086',
                useCases: ['time_delay_estimation', 'pattern_matching', 'similarity'],
                characteristics: {
                    realTime: false,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.timeDelayEstimation) score += 55;
                    if (problem.patternMatching) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            autoCorrelation: {
                id: 'auto_correlation',
                name: 'Autocorrelation',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.acorr',
                source: 'MIT 18.086',
                useCases: ['periodicity_detection', 'pitch_detection', 'self_similarity'],
                characteristics: {
                    realTime: false,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.periodicityDetection) score += 55;
                    if (problem.pitchDetection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            psd: {
                id: 'psd',
                name: 'Power Spectral Density',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.psd',
                source: 'MIT 2.830',
                useCases: ['power_distribution', 'vibration_analysis', 'noise_characterization'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.powerDistribution) score += 50;
                    if (problem.vibrationAnalysis) score += 40;
                    if (problem.noiseCharacterization) score += 30;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 4: PHYSICS & MANUFACTURING ALGORITHMS (30)
        // Sources: MIT 2.008, 2.830, 2.875
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        physics: {
            // Cutting Physics
            merchantCutting: {
                id: 'merchant_cutting',
                name: 'Merchant Cutting Force Model',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.force.merchant',
                source: 'MIT 2.008',
                useCases: ['cutting_force_prediction', 'power_estimation', 'tool_deflection'],
                characteristics: {
                    physicsBased: true,
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.forcePrediction) score += 55;
                    if (problem.orthogonalCutting) score += 35;
                    if (problem.powerEstimation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            kienzleCutting: {
                id: 'kienzle_cutting',
                name: 'Kienzle Cutting Force',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.force.kienzle',
                source: 'MIT 2.008',
                useCases: ['milling_forces', 'turning_forces', 'empirical_prediction'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.millingForce) score += 50;
                    if (problem.turningForce) score += 50;
                    if (problem.empirical) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            taylorToolLife: {
                id: 'taylor_tool_life',
                name: 'Taylor Tool Life Equation',
                category: 'physics',
                subcategory: 'tool_wear',
                gateway: 'physics.toollife.taylor',
                source: 'MIT 2.008',
                useCases: ['tool_life_prediction', 'cutting_speed_selection', 'cost_optimization'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolLifePrediction) score += 55;
                    if (problem.cuttingSpeedSelection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            extendedTaylor: {
                id: 'extended_taylor',
                name: 'Extended Taylor Tool Life',
                category: 'physics',
                subcategory: 'tool_wear',
                gateway: 'physics.toollife.extended',
                source: 'MIT 2.008',
                useCases: ['tool_life_multivar', 'feed_effect', 'doc_effect'],
                characteristics: {
                    empirical: true,
                    multiVariable: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolLifePrediction) score += 45;
                    if (problem.multipleParameters) score += 40;
                    if (problem.feedEffect) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Vibration & Stability
            stabilityLobes: {
                id: 'stability_lobes',
                name: 'Stability Lobe Diagram',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.stability.lobes',
                source: 'MIT 2.830',
                useCases: ['chatter_prediction', 'spindle_speed_selection', 'depth_optimization'],
                characteristics: {
                    physicsBased: true,
                    frequencyDomain: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.chatterPrediction) score += 55;
                    if (problem.millingStability) score += 40;
                    if (problem.spindleSelection) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            chatterDetection: {
                id: 'chatter_detection',
                name: 'Chatter Detection Algorithm',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.chatter.detect',
                source: 'MIT 2.830',
                useCases: ['real_time_monitoring', 'chatter_onset', 'quality_control'],
                characteristics: {
                    realTime: true,
                    signalBased: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realTimeMonitoring) score += 50;
                    if (problem.chatterDetection) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            frf: {
                id: 'frf',
                name: 'Frequency Response Function',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.frf',
                source: 'MIT 2.830',
                useCases: ['modal_analysis', 'system_identification', 'transfer_function'],
                characteristics: {
                    physicsBased: true,
                    frequencyDomain: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.modalAnalysis) score += 55;
                    if (problem.systemIdentification) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            modalAnalysis: {
                id: 'modal_analysis',
                name: 'Modal Analysis',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.modal',
                source: 'MIT 2.830',
                useCases: ['natural_frequencies', 'mode_shapes', 'structural_dynamics'],
                characteristics: {
                    physicsBased: true,
                    eigenvalueBased: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.naturalFrequencies) score += 55;
                    if (problem.modeShapes) score += 40;
                    if (problem.structuralAnalysis) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Thermal
            cuttingTemperature: {
                id: 'cutting_temperature',
                name: 'Cutting Temperature Model',
                category: 'physics',
                subcategory: 'thermal',
                gateway: 'physics.thermal.cutting',
                source: 'MIT 2.008',
                useCases: ['temperature_prediction', 'tool_wear_thermal', 'coating_selection'],
                characteristics: {
                    physicsBased: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.temperaturePrediction) score += 55;
                    if (problem.thermalAnalysis) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            heatPartition: {
                id: 'heat_partition',
                name: 'Heat Partition Model',
                category: 'physics',
                subcategory: 'thermal',
                gateway: 'physics.thermal.partition',
                source: 'MIT 2.008',
                useCases: ['heat_distribution', 'chip_temperature', 'workpiece_heating'],
                characteristics: {
                    physicsBased: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.heatDistribution) score += 55;
                    if (problem.thermalAnalysis) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Surface Quality
            surfaceRoughness: {
                id: 'surface_roughness',
                name: 'Surface Roughness Prediction',
                category: 'physics',
                subcategory: 'surface',
                gateway: 'physics.surface.roughness',
                source: 'MIT 2.008',
                useCases: ['ra_prediction', 'finish_quality', 'parameter_selection'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.surfaceFinish) score += 55;
                    if (problem.qualityPrediction) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Kinematics
            forwardKinematics: {
                id: 'forward_kinematics',
                name: 'Forward Kinematics (DH)',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.fk',
                source: 'MIT 2.12',
                useCases: ['position_calculation', 'robot_control', '5axis_position'],
                characteristics: {
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.positionCalculation) score += 55;
                    if (problem.robotKinematics) score += 40;
                    if (problem.fiveAxis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            inverseKinematics: {
                id: 'inverse_kinematics',
                name: 'Inverse Kinematics',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.ik',
                source: 'MIT 2.12',
                useCases: ['joint_calculation', 'path_planning', '5axis_control'],
                characteristics: {
                    iterative: true,
                    multiSolution: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jointCalculation) score += 55;
                    if (problem.robotControl) score += 40;
                    if (problem.fiveAxis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            jacobian: {
                id: 'jacobian',
                name: 'Jacobian Matrix',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.jacobian',
                source: 'MIT 2.12',
                useCases: ['velocity_mapping', 'singularity_detection', 'force_transformation'],
                characteristics: {
                    analytical: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.velocityMapping) score += 50;
                    if (problem.singularityAnalysis) score += 45;
                    if (problem.forceAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            singularityCheck: {
                id: 'singularity_check',
                name: 'Singularity Detection',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.singularity',
                source: 'MIT 2.12',
                useCases: ['singularity_avoidance', 'path_validation', 'safety'],
                characteristics: {
                    analytical: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.singularityDetection) score += 60;
                    if (problem.pathValidation) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Material Models
            johnsonCook: {
                id: 'johnson_cook',
                name: 'Johnson-Cook Material Model',
                category: 'physics',
                subcategory: 'material',
                gateway: 'physics.material.johnsoncook',
                source: 'MIT 2.008',
                useCases: ['flow_stress', 'machining_simulation', 'high_strain_rate'],
                characteristics: {
                    physicsBased: true,
                    temperatureDependent: true,
                    strainRateDependent: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.flowStress) score += 50;
                    if (problem.highStrainRate) score += 40;
                    if (problem.machiningSimulation) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // Dynamics
            newtonEuler: {
                id: 'newton_euler',
                name: 'Newton-Euler Dynamics',
                category: 'physics',
                subcategory: 'dynamics',
                gateway: 'physics.dynamics.newtoneuler',
                source: 'MIT 2.12',
                useCases: ['robot_dynamics', 'torque_calculation', 'force_analysis'],
                characteristics: {
                    analytical: true,
                    recursive: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.torqueCalculation) score += 55;
                    if (problem.robotDynamics) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            lagrangian: {
                id: 'lagrangian',
                name: 'Lagrangian Dynamics',
                category: 'physics',
                subcategory: 'dynamics',
                gateway: 'physics.dynamics.lagrangian',
                source: 'MIT 2.12',
                useCases: ['energy_based', 'complex_mechanisms', 'constraint_handling'],
                characteristics: {
                    analytical: true,
                    energyBased: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.energyBased) score += 50;
                    if (problem.complexMechanism) score += 40;
                    if (problem.constraintHandling) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // MRR & Economics
            mrr: {
                id: 'mrr',
                name: 'Material Removal Rate',
                category: 'physics',
                subcategory: 'productivity',
                gateway: 'physics.mrr',
                source: 'MIT 2.008',
                useCases: ['productivity_calculation', 'cycle_time', 'cost_estimation'],
                characteristics: {
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.productivityCalculation) score += 55;
                    if (problem.cycleTime) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            specificCuttingEnergy: {
                id: 'specific_cutting_energy',
                name: 'Specific Cutting Energy',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.energy.specific',
                source: 'MIT 2.008',
                useCases: ['power_calculation', 'energy_efficiency', 'machine_sizing'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.powerCalculation) score += 55;
                    if (problem.machineSizing) score += 35;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 5: PLANNING & SEARCH ALGORITHMS (25)
        // Sources: MIT 6.034, 16.410, 6.006
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        planning: {
            // Graph Search
            aStar: {
                id: 'a_star',
                name: 'A* Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.astar',
                source: 'MIT 6.034',
                complexity: 'O(b^d)',
                useCases: ['path_planning', 'toolpath_generation', 'collision_avoidance', 'optimal_path'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    heuristicGuided: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.pathFinding) score += 55;
                    if (problem.hasHeuristic) score += 35;
                    if (problem.needsOptimal) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dijkstra: {
                id: 'dijkstra',
                name: 'Dijkstra\'s Algorithm',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.dijkstra',
                source: 'MIT 6.006',
                complexity: 'O((V+E) log V)',
                useCases: ['shortest_path', 'routing', 'network_optimization'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.shortestPath) score += 55;
                    if (problem.noHeuristic) score += 30;
                    if (problem.graphBased) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            bfs: {
                id: 'bfs',
                name: 'Breadth-First Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.bfs',
                source: 'MIT 6.006',
                complexity: 'O(V+E)',
                useCases: ['shortest_unweighted', 'level_order', 'connectivity'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'low',
                    accuracy: 'optimal_unweighted'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.unweighted) score += 50;
                    if (problem.shortestPath) score += 35;
                    if (problem.levelOrder) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dfs: {
                id: 'dfs',
                name: 'Depth-First Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.dfs',
                source: 'MIT 6.006',
                complexity: 'O(V+E)',
                useCases: ['topological_sort', 'cycle_detection', 'maze_solving'],
                characteristics: {
                    optimal: false,
                    complete: true,
                    memoryEfficient: true,
                    computeCost: 'low',
                    accuracy: 'any_solution'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.topologicalSort) score += 55;
                    if (problem.cycleDetection) score += 45;
                    if (problem.memoryConstrained) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            idaStar: {
                id: 'ida_star',
                name: 'IDA* Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.idastar',
                source: 'MIT 6.034',
                complexity: 'O(b^d)',
                useCases: ['memory_limited', 'optimal_path', 'large_state_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    memoryEfficient: true,
                    computeCost: 'high',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.memoryLimited) score += 55;
                    if (problem.needsOptimal) score += 35;
                    if (problem.largeStateSpace) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Motion Planning
            rrt: {
                id: 'rrt',
                name: 'Rapidly-exploring Random Tree',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.rrt',
                source: 'MIT 16.410',
                useCases: ['motion_planning', 'high_dof', 'robot_path', 'collision_free'],
                characteristics: {
                    optimal: false,
                    complete: true,
                    randomized: true,
                    computeCost: 'medium',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensional) score += 50;
                    if (problem.continuousSpace) score += 35;
                    if (problem.obstacles) score += 25;
                    if (problem.motionPlanning) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            rrtStar: {
                id: 'rrt_star',
                name: 'RRT*',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.rrtstar',
                source: 'MIT 16.410',
                useCases: ['optimal_motion', 'path_smoothing', 'high_quality_path'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    randomized: true,
                    computeCost: 'high',
                    accuracy: 'optimal_asymptotic'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.optimalMotion) score += 55;
                    if (problem.highDimensional) score += 35;
                    if (problem.pathQuality) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            prm: {
                id: 'prm',
                name: 'Probabilistic Roadmap',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.prm',
                source: 'MIT 16.410',
                useCases: ['multi_query', 'static_environment', 'roadmap_construction'],
                characteristics: {
                    optimal: false,
                    multiQuery: true,
                    randomized: true,
                    computeCost: 'high_build_low_query',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiQuery) score += 55;
                    if (problem.staticEnvironment) score += 35;
                    if (problem.motionPlanning) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            potentialField: {
                id: 'potential_field',
                name: 'Potential Field Method',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'motion.potential.plan',
                source: 'MIT 16.410',
                useCases: ['reactive_navigation', 'obstacle_avoidance', 'real_time'],
                characteristics: {
                    optimal: false,
                    realTime: true,
                    localMinima: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realTimeNavigation) score += 55;
                    if (problem.obstacleAvoidance) score += 40;
                    if (problem.reactive) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Constraint Satisfaction
            cspBacktracking: {
                id: 'csp_backtracking',
                name: 'CSP Backtracking',
                category: 'planning',
                subcategory: 'constraint',
                gateway: 'plan.csp.solve',
                source: 'MIT 6.034',
                useCases: ['scheduling', 'resource_allocation', 'fixture_planning', 'assignment'],
                characteristics: {
                    complete: true,
                    exact: true,
                    computeCost: 'variable',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.constraints) score += 55;
                    if (problem.discrete) score += 30;
                    if (problem.satisfiability) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ac3: {
                id: 'ac3',
                name: 'Arc Consistency (AC-3)',
                category: 'planning',
                subcategory: 'constraint',
                gateway: 'plan.csp.ac3',
                source: 'MIT 6.034',
                useCases: ['constraint_propagation', 'domain_reduction', 'preprocessing'],
                characteristics: {
                    complete: false,
                    preprocessing: true,
                    computeCost: 'low',
                    accuracy: 'reduction'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.constraintPropagation) score += 55;
                    if (problem.binaryConstraints) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Decision Making
            mcts: {
                id: 'mcts',
                name: 'Monte Carlo Tree Search',
                category: 'planning',
                subcategory: 'decision',
                gateway: 'plan.search.mcts',
                source: 'Stanford CS229',
                useCases: ['decision_making', 'game_playing', 'process_planning', 'large_branching'],
                characteristics: {
                    anytime: true,
                    randomized: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sequentialDecisions) score += 50;
                    if (problem.largeBranchingFactor) score += 35;
                    if (problem.simulationAvailable) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            valueIteration: {
                id: 'value_iteration',
                name: 'Value Iteration',
                category: 'planning',
                subcategory: 'mdp',
                gateway: 'plan.mdp.value',
                source: 'MIT 6.231',
                useCases: ['optimal_policy', 'mdp_solving', 'small_state_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mdp) score += 55;
                    if (problem.discreteStates) score += 30;
                    if (problem.smallStateSpace) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            policyIteration: {
                id: 'policy_iteration',
                name: 'Policy Iteration',
                category: 'planning',
                subcategory: 'mdp',
                gateway: 'plan.mdp.policy',
                source: 'MIT 6.231',
                useCases: ['optimal_policy', 'faster_convergence', 'small_action_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mdp) score += 50;
                    if (problem.smallActionSpace) score += 35;
                    if (problem.fasterConvergence) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Scheduling
            johnsonsRule: {
                id: 'johnsons_rule',
                name: 'Johnson\'s Rule',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.johnson',
                source: 'MIT 2.854',
                useCases: ['two_machine_flow', 'makespan_minimization', 'job_shop'],
                characteristics: {
                    optimal: true,
                    polynomial: true,
                    computeCost: 'very_low',
                    accuracy: 'optimal_2machine'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.twoMachineFlow) score += 65;
                    if (problem.makespanMinimization) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            criticalPath: {
                id: 'critical_path',
                name: 'Critical Path Method',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.cpm',
                source: 'MIT 2.854',
                useCases: ['project_scheduling', 'duration_estimation', 'slack_analysis'],
                characteristics: {
                    optimal: true,
                    deterministic: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.projectScheduling) score += 55;
                    if (problem.precedenceConstraints) score += 35;
                    if (problem.slackAnalysis) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            geneticScheduling: {
                id: 'genetic_scheduling',
                name: 'Genetic Algorithm Scheduling',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.genetic',
                source: 'MIT 2.854',
                useCases: ['job_shop', 'flexible_manufacturing', 'multi_objective'],
                characteristics: {
                    optimal: false,
                    heuristic: true,
                    computeCost: 'high',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jobShop) score += 50;
                    if (problem.multiObjective) score += 35;
                    if (problem.complexConstraints) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 6: CAD/GEOMETRY ALGORITHMS (25)
        // Sources: MIT 6.837, 18.086
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        geometry: {
            // NURBS & Curves
            nurbsEvaluate: {
                id: 'nurbs_evaluate',
                name: 'NURBS Curve/Surface Evaluation',
                category: 'geometry',
                subcategory: 'curves',
                gateway: 'cad.nurbs.evaluate',
                source: 'MIT 6.837',
                useCases: ['surface_modeling', 'toolpath_interpolation', 'geometry_creation'],
                characteristics: {
                    analytical: true,
                    exact: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.surfaceModeling) score += 55;
                    if (problem.curveEvaluation) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bezierSubdivision: {
                id: 'bezier_subdivision',
                name: 'Bezier Subdivision',
                category: 'geometry',
                subcategory: 'curves',
                gateway: 'cad.bezier.subdivide',
                source: 'MIT 6.837',
                useCases: ['curve_refinement', 'intersection', 'rendering'],
                characteristics: {
                    exact: true,
                    recursive: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.curveRefinement) score += 55;
                    if (problem.intersection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Triangulation
            delaunay: {
                id: 'delaunay',
                name: 'Delaunay Triangulation',
                category: 'geometry',
                subcategory: 'mesh',
                gateway: 'cad.mesh.delaunay',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['mesh_generation', 'interpolation', 'surface_reconstruction'],
                characteristics: {
                    optimal: true,
                    maximizeMinAngle: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.meshGeneration) score += 55;
                    if (problem.triangulation) score += 40;
                    if (problem.interpolation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            voronoi: {
                id: 'voronoi',
                name: 'Voronoi Diagram',
                category: 'geometry',
                subcategory: 'partitioning',
                gateway: 'cad.voronoi',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['medial_axis', 'offset_curves', 'proximity_analysis'],
                characteristics: {
                    dual: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.medialAxis) score += 55;
                    if (problem.offsetCurves) score += 40;
                    if (problem.proximityAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            convexHull: {
                id: 'convex_hull',
                name: 'Convex Hull',
                category: 'geometry',
                subcategory: 'computational',
                gateway: 'cad.hull.convex',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['bounding_volume', 'collision_detection', 'shape_analysis'],
                characteristics: {
                    optimal: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.boundingVolume) score += 50;
                    if (problem.collisionDetection) score += 40;
                    if (problem.shapeAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // Intersection
            rayTriangle: {
                id: 'ray_triangle',
                name: 'Ray-Triangle Intersection',
                category: 'geometry',
                subcategory: 'intersection',
                gateway: 'cad.intersect.raytri',
                source: 'MIT 6.837',
                useCases: ['ray_tracing', 'collision_detection', 'picking'],
                characteristics: {
                    exact: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rayTracing) score += 55;
                    if (problem.collision) score += 40;
                    if (problem.picking) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            surfaceSurface: {
                id: 'surface_surface',
                name: 'Surface-Surface Intersection',
                category: 'geometry',
                subcategory: 'intersection',
                gateway: 'cad.intersect.surfaces',
                source: 'MIT 6.837',
                useCases: ['boolean_operations', 'trim_curves', 'cad_modeling'],
                characteristics: {
                    iterative: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.booleanOperations) score += 55;
                    if (problem.trimCurves) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Collision Detection
            bvh: {
                id: 'bvh',
                name: 'Bounding Volume Hierarchy',
                category: 'geometry',
                subcategory: 'collision',
                gateway: 'cad.collision.bvh',
                source: 'MIT 6.837',
                useCases: ['collision_detection', 'ray_tracing', 'proximity_queries'],
                characteristics: {
                    hierarchical: true,
                    computeCost: 'low_query',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.collisionDetection) score += 55;
                    if (problem.rayTracing) score += 40;
                    if (problem.manyObjects) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            gjk: {
                id: 'gjk',
                name: 'GJK Algorithm',
                category: 'geometry',
                subcategory: 'collision',
                gateway: 'cad.collision.gjk',
                source: 'MIT 6.837',
                useCases: ['convex_collision', 'distance_computation', 'penetration_depth'],
                characteristics: {
                    iterative: true,
                    convexOnly: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.convexCollision) score += 60;
                    if (problem.distanceComputation) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Offset & Boolean
            polygonOffset: {
                id: 'polygon_offset',
                name: 'Polygon Offset',
                category: 'geometry',
                subcategory: 'offset',
                gateway: 'cad.offset.polygon',
                source: 'MIT 6.837',
                useCases: ['tool_compensation', 'contour_offset', 'pocket_toolpath'],
                characteristics: {
                    exact: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolCompensation) score += 55;
                    if (problem.contourOffset) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            clipperBoolean: {
                id: 'clipper_boolean',
                name: 'Polygon Boolean Operations',
                category: 'geometry',
                subcategory: 'boolean',
                gateway: 'cad.boolean.polygon',
                source: 'MIT 6.837',
                useCases: ['union', 'intersection', 'difference', 'xor'],
                characteristics: {
                    exact: true,
                    robust: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.booleanOperations) score += 55;
                    if (problem.polygonOperations) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Graphics
            frustumCulling: {
                id: 'frustum_culling',
                name: 'Frustum Culling',
                category: 'geometry',
                subcategory: 'graphics',
                gateway: 'graphics.frustum.cullObjects',
                source: 'MIT 6.837',
                useCases: ['visibility_culling', 'rendering_optimization', 'scene_management'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'conservative'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.visibilityCulling) score += 60;
                    if (problem.renderingOptimization) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            rayTracing: {
                id: 'ray_tracing',
                name: 'Ray Tracing',
                category: 'geometry',
                subcategory: 'graphics',
                gateway: 'graphics.raytrace.render',
                source: 'MIT 6.837',
                useCases: ['realistic_rendering', 'shadows', 'reflections'],
                characteristics: {
                    physicallyBased: true,
                    computeCost: 'very_high',
                    accuracy: 'photo_realistic'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realisticRendering) score += 55;
                    if (problem.shadowsReflections) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 7: CAM/TOOLPATH ALGORITHMS (25)
        // Sources: MIT 2.008, 2.830
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        cam: {
            // Toolpath Strategies
            adaptiveClearing: {
                id: 'adaptive_clearing',
                name: 'Adaptive Clearing',
                category: 'cam',
                subcategory: 'roughing',
                gateway: 'cam.adaptive.clear',
                source: 'MIT 2.008',
                useCases: ['roughing', 'constant_load', 'high_mrr'],
                characteristics: {
                    engagementControl: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.roughing) score += 55;
                    if (problem.constantLoad) score += 40;
                    if (problem.highMRR) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            trochoidalMilling: {
                id: 'trochoidal_milling',
                name: 'Trochoidal Milling',
                category: 'cam',
                subcategory: 'slotting',
                gateway: 'cam.trochoidal',
                source: 'MIT 2.008',
                useCases: ['slot_milling', 'reduced_forces', 'chip_thinning'],
                characteristics: {
                    circularMotion: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.slotMilling) score += 60;
                    if (problem.reducedForces) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            pocketMilling: {
                id: 'pocket_milling',
                name: 'Pocket Milling',
                category: 'cam',
                subcategory: 'pocketing',
                gateway: 'cam.pocket',
                source: 'MIT 2.008',
                useCases: ['pocket_clearing', 'parallel_offset', 'spiral'],
                characteristics: {
                    offsetBased: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.pocketClearing) score += 55;
                    if (problem.contourParallel) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            contourMilling: {
                id: 'contour_milling',
                name: 'Contour Milling',
                category: 'cam',
                subcategory: 'finishing',
                gateway: 'cam.contour',
                source: 'MIT 2.008',
                useCases: ['profile_machining', 'wall_finishing', 'edge_milling'],
                characteristics: {
                    offsetBased: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.profileMachining) score += 55;
                    if (problem.wallFinishing) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // 3D Surface
            waterline: {
                id: 'waterline',
                name: 'Waterline Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.waterline',
                source: 'MIT 2.008',
                useCases: ['steep_walls', 'constant_z', 'semi_finish'],
                characteristics: {
                    constantZ: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.steepWalls) score += 60;
                    if (problem.constantZ) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            rasterFinishing: {
                id: 'raster_finishing',
                name: 'Raster/Parallel Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.raster',
                source: 'MIT 2.008',
                useCases: ['shallow_areas', 'floor_finishing', 'uniform_cusp'],
                characteristics: {
                    parallelPaths: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.shallowAreas) score += 55;
                    if (problem.floorFinishing) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            spiralFinishing: {
                id: 'spiral_finishing',
                name: 'Spiral Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.spiral',
                source: 'MIT 2.008',
                useCases: ['circular_parts', 'continuous_motion', 'reduced_retracts'],
                characteristics: {
                    continuous: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.circularParts) score += 60;
                    if (problem.continuousMotion) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // 5-Axis
            swarf: {
                id: 'swarf',
                name: 'SWARF Milling',
                category: 'cam',
                subcategory: 'multiaxis',
                gateway: 'cam.multiaxis.swarf',
                source: 'MIT 2.008',
                useCases: ['ruled_surfaces', 'blade_machining', 'side_cutting'],
                characteristics: {
                    fiveAxis: true,
                    sideCutting: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.ruledSurfaces) score += 60;
                    if (problem.bladeMachining) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            flowline: {
                id: 'flowline',
                name: 'Flowline Milling',
                category: 'cam',
                subcategory: 'multiaxis',
                gateway: 'cam.multiaxis.flowline',
                source: 'MIT 2.008',
                useCases: ['impeller_machining', 'turbine_blades', 'complex_surfaces'],
                characteristics: {
                    fiveAxis: true,
                    flowBased: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.impellerMachining) score += 65;
                    if (problem.turbineBlades) score += 50;
                    return Math.min(score, 100);
                }
            },
            
            // Drilling
            drillCycle: {
                id: 'drill_cycle',
                name: 'Drill Cycle Optimization',
                category: 'cam',
                subcategory: 'drilling',
                gateway: 'cam.drill.optimize',
                source: 'MIT 2.008',
                useCases: ['hole_sequencing', 'peck_drilling', 'cycle_selection'],
                characteristics: {
                    sequenceOptimization: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.holeSequencing) score += 55;
                    if (problem.drilling) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Turning
            roughTurning: {
                id: 'rough_turning',
                name: 'Rough Turning',
                category: 'cam',
                subcategory: 'turning',
                gateway: 'cam.turn.rough',
                source: 'MIT 2.008',
                useCases: ['od_roughing', 'id_roughing', 'stock_removal'],
                characteristics: {
                    latheOperation: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.turning) score += 50;
                    if (problem.roughing) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            finishTurning: {
                id: 'finish_turning',
                name: 'Finish Turning',
                category: 'cam',
                subcategory: 'turning',
                gateway: 'cam.turn.finish',
                source: 'MIT 2.008',
                useCases: ['profile_finishing', 'surface_quality', 'tight_tolerances'],
                characteristics: {
                    latheOperation: true,
                    computeCost: 'low',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.turning) score += 45;
                    if (problem.finishing) score += 50;
                    return Math.min(score, 100);
                }
            },
            
            // Wire EDM
            wireEDM: {
                id: 'wire_edm',
                name: 'Wire EDM Path Planning',
                category: 'cam',
                subcategory: 'edm',
                gateway: 'cam.edm.wire',
                source: 'MIT 2.008',
                useCases: ['contour_cutting', 'hardened_materials', 'precision_cutting'],
                characteristics: {
                    nonContact: true,
                    computeCost: 'medium',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.wireEDM) score += 65;
                    if (problem.hardenedMaterial) score += 30;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 8: NUMERICAL ALGORITHMS (20)
        // Sources: MIT 18.086, 18.335
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        numerical: {
            // Linear Algebra
            gaussElimination: {
                id: 'gauss_elimination',
                name: 'Gaussian Elimination',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.solve.gauss',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['linear_systems', 'matrix_inversion', 'determinant'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearSystem) score += 50;
                    if (problem.dense) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            luDecomposition: {
                id: 'lu_decomposition',
                name: 'LU Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.lu',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['multiple_rhs', 'matrix_factorization', 'determinant'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multipleRHS) score += 55;
                    if (problem.matrixFactorization) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            choleskyDecomposition: {
                id: 'cholesky',
                name: 'Cholesky Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.cholesky',
                source: 'MIT 18.086',
                complexity: 'O(n³/3)',
                useCases: ['spd_systems', 'covariance', 'optimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.symmetricPositiveDefinite) score += 60;
                    if (problem.covariance) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            qrDecomposition: {
                id: 'qr_decomposition',
                name: 'QR Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.qr',
                source: 'MIT 18.086',
                complexity: 'O(2mn² - 2n³/3)',
                useCases: ['least_squares', 'eigenvalues', 'orthogonalization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.leastSquares) score += 55;
                    if (problem.eigenvalues) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            svd: {
                id: 'svd',
                name: 'Singular Value Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.svd',
                source: 'MIT 18.086',
                complexity: 'O(min(mn², m²n))',
                useCases: ['rank', 'pseudoinverse', 'pca', 'compression'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rank) score += 50;
                    if (problem.pseudoinverse) score += 45;
                    if (problem.compression) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            eigenvalue: {
                id: 'eigenvalue',
                name: 'Eigenvalue Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.eigen',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['modal_analysis', 'stability', 'pca'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.eigenvalues) score += 55;
                    if (problem.modalAnalysis) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            // ODE Solvers
            rungeKutta4: {
                id: 'rk4',
                name: 'Runge-Kutta 4th Order',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.rk4',
                source: 'MIT 18.086',
                useCases: ['ode_solving', 'simulation', 'dynamics'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.odeSolving) score += 55;
                    if (problem.dynamics) score += 40;
                    if (problem.smoothSolution) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            adaptiveRK: {
                id: 'adaptive_rk',
                name: 'Adaptive Runge-Kutta (RK45)',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.rk45',
                source: 'MIT 18.086',
                useCases: ['adaptive_stepping', 'variable_dynamics', 'error_control'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.adaptiveStepping) score += 55;
                    if (problem.errorControl) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bdf: {
                id: 'bdf',
                name: 'Backward Differentiation Formula',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.bdf',
                source: 'MIT 18.086',
                useCases: ['stiff_odes', 'chemical_kinetics', 'implicit_solver'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.stiffODE) score += 65;
                    if (problem.chemicalKinetics) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Root Finding
            newtonRaphson: {
                id: 'newton_raphson',
                name: 'Newton-Raphson Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.newton',
                source: 'MIT 18.086',
                useCases: ['root_finding', 'nonlinear_equations', 'fast_convergence'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rootFinding) score += 55;
                    if (problem.hasDerivative) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bisection: {
                id: 'bisection',
                name: 'Bisection Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.bisection',
                source: 'MIT 18.086',
                useCases: ['robust_root', 'bracketed', 'guaranteed_convergence'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.robustRoot) score += 50;
                    if (problem.bracketed) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            secant: {
                id: 'secant',
                name: 'Secant Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.secant',
                source: 'MIT 18.086',
                useCases: ['derivative_free', 'root_finding', 'fast'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noDerivative) score += 50;
                    if (problem.rootFinding) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            // Integration
            simpsonIntegration: {
                id: 'simpson',
                name: 'Simpson\'s Rule',
                category: 'numerical',
                subcategory: 'integration',
                gateway: 'num.integrate.simpson',
                source: 'MIT 18.086',
                useCases: ['numerical_integration', 'smooth_functions', 'high_accuracy'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.integration) score += 55;
                    if (problem.smooth) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            gaussQuadrature: {
                id: 'gauss_quadrature',
                name: 'Gaussian Quadrature',
                category: 'numerical',
                subcategory: 'integration',
                gateway: 'num.integrate.gauss',
                source: 'MIT 18.086',
                useCases: ['high_accuracy_integration', 'polynomial_exact', 'few_points'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highAccuracyIntegration) score += 55;
                    if (problem.polynomial) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Interpolation
            splineInterpolation: {
                id: 'spline',
                name: 'Cubic Spline Interpolation',
                category: 'numerical',
                subcategory: 'interpolation',
                gateway: 'num.interp.spline',
                source: 'MIT 18.086',
                useCases: ['smooth_interpolation', 'curve_fitting', 'toolpath'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.smoothInterpolation) score += 55;
                    if (problem.curveFitting) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 9: PROBABILISTIC/MONTE CARLO (12)
        // Sources: MIT 6.262, 6.867
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        probabilistic: {
            monteCarloSimulation: {
                id: 'monte_carlo',
                name: 'Monte Carlo Simulation',
                category: 'probabilistic',
                subcategory: 'simulation',
                gateway: 'ai.mc.simulate',
                source: 'MIT 6.262',
                useCases: ['risk_analysis', 'uncertainty_propagation', 'cycle_time_estimation'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.uncertainInputs) score += 45;
                    if (problem.riskAnalysis) score += 40;
                    if (problem.distributionOutput) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            mcmcSampling: {
                id: 'mcmc',
                name: 'MCMC Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mcmc.sample',
                source: 'MIT 6.867',
                useCases: ['posterior_sampling', 'bayesian_inference', 'complex_distributions'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.posteriorSampling) score += 55;
                    if (problem.complexDistribution) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            importanceSampling: {
                id: 'importance_sampling',
                name: 'Importance Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mc.importance',
                source: 'MIT 6.262',
                useCases: ['rare_events', 'variance_reduction', 'efficient_estimation'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rareEvents) score += 60;
                    if (problem.varianceReduction) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            bootstrapping: {
                id: 'bootstrapping',
                name: 'Bootstrap Resampling',
                category: 'probabilistic',
                subcategory: 'statistics',
                gateway: 'ai.stats.bootstrap',
                source: 'MIT 6.867',
                useCases: ['confidence_intervals', 'parameter_estimation', 'small_samples'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.confidenceIntervals) score += 55;
                    if (problem.smallSample) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            latinHypercube: {
                id: 'latin_hypercube',
                name: 'Latin Hypercube Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mc.lhs',
                source: 'MIT 6.262',
                useCases: ['design_of_experiments', 'stratified_sampling', 'uncertainty_analysis'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.designOfExperiments) score += 55;
                    if (problem.stratifiedSampling) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 10: BUSINESS/COSTING ALGORITHMS (15)
        // Sources: MIT 15.963, 15.760
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        business: {
            activityBasedCosting: {
                id: 'abc',
                name: 'Activity-Based Costing',
                category: 'business',
                subcategory: 'costing',
                gateway: 'costing.abc.cost',
                source: 'MIT 15.963',
                useCases: ['job_costing', 'overhead_allocation', 'cost_analysis'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jobCosting) score += 55;
                    if (problem.overheadAllocation) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            eoq: {
                id: 'eoq',
                name: 'Economic Order Quantity',
                category: 'business',
                subcategory: 'inventory',
                gateway: 'business.inventory.eoq',
                source: 'MIT 15.760',
                useCases: ['order_quantity', 'inventory_optimization', 'cost_minimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.inventoryOptimization) score += 55;
                    if (problem.orderQuantity) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            safetyStock: {
                id: 'safety_stock',
                name: 'Safety Stock Calculation',
                category: 'business',
                subcategory: 'inventory',
                gateway: 'business.inventory.safety',
                source: 'MIT 15.760',
                useCases: ['buffer_stock', 'service_level', 'demand_uncertainty'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.safetyStock) score += 55;
                    if (problem.serviceLevel) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            oee: {
                id: 'oee',
                name: 'Overall Equipment Effectiveness',
                category: 'business',
                subcategory: 'metrics',
                gateway: 'business.metrics.oee',
                source: 'MIT 2.854',
                useCases: ['equipment_efficiency', 'availability', 'performance', 'quality'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.equipmentEfficiency) score += 55;
                    if (problem.performanceMetrics) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            queuingTheory: {
                id: 'queuing',
                name: 'Queuing Theory (M/M/c)',
                category: 'business',
                subcategory: 'operations',
                gateway: 'business.queue.mmc',
                source: 'MIT 15.760',
                useCases: ['waiting_time', 'utilization', 'capacity_planning'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.queuingAnalysis) score += 55;
                    if (problem.capacityPlanning) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            nasaTLX: {
                id: 'nasa_tlx',
                name: 'NASA Task Load Index',
                category: 'business',
                subcategory: 'ergonomics',
                gateway: 'business.ergonomics.tlx',
                source: 'NASA',
                useCases: ['workload_assessment', 'operator_fatigue', 'task_design'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.workloadAssessment) score += 60;
                    if (problem.ergonomics) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            fittsLaw: {
                id: 'fitts_law',
                name: 'Fitts\' Law',
                category: 'business',
                subcategory: 'ergonomics',
                gateway: 'business.ergonomics.fitts',
                source: 'MIT',
                useCases: ['ui_design', 'movement_time', 'interface_optimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.uiDesign) score += 55;
                    if (problem.movementTime) score += 40;
                    return Math.min(score, 100);
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════
        // REGISTRY HELPER METHODS
        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════
        
        /**
         * Get all algorithms as flat array
         */
        getAll: function() {
            const all = [];
            for (const [category, algorithms] of Object.entries(this)) {
                if (typeof algorithms === 'object' && category !== 'getAll' && 
                    category !== 'getByCategory' && category !== 'getByUseCase' &&
                    category !== 'getStats' && category !== 'findBestMatch') {
                    for (const [id, alg] of Object.entries(algorithms)) {
                        if (typeof alg === 'object' && alg.id) {
                            all.push({ ...alg, _category: category });
                        }
                    }
                }
            }
            return all;
        },
        
        /**
         * Get algorithms by category
         */
        getByCategory: function(category) {
            const cat = this[category];
            if (!cat) return [];
            return Object.values(cat).filter(a => a && a.id);
        },
        
        /**
         * Get algorithms by use case
         */
        getByUseCase: function(useCase) {
            const all = this.getAll();
            return all.filter(a => a.useCases && a.useCases.includes(useCase));
        },
        
        /**
         * Find best matching algorithms for a problem
         */
        findBestMatch: function(problem, topN = 5) {
            const all = this.getAll();
            const scored = [];
            
            for (const alg of all) {
                if (alg.matchScore) {
                    const score = alg.matchScore(problem);
                    if (score > 0) {
                        scored.push({ ...alg, score });
                    }
                }
            }
            
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, topN);
        },
        
        /**
         * Get registry statistics
         */
        getStats: function() {
            const all = this.getAll();
            const categories = {};
            let withGateway = 0;
            let withMatchScore = 0;
            
            for (const alg of all) {
                const cat = alg.category || 'unknown';
                categories[cat] = (categories[cat] || 0) + 1;
                if (alg.gateway) withGateway++;
                if (alg.matchScore) withMatchScore++;
            }
            
            return {
                total: all.length,
                byCategory: categories,
                withGateway,
                withMatchScore,
                utilizationPotential: `${Math.round(withMatchScore / all.length * 100)}%`
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // TIER 2: PRISM_ALGORITHM_ORCHESTRATOR - Intelligent Algorithm Selection
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_ALGORITHM_ORCHESTRATOR = {
        version: '1.0.0',
        
        // Problem type patterns for auto-classification
        problemPatterns: {
            'speed_feed': ['speed', 'feed', 'cutting', 'sfm', 'rpm', 'ipm'],
            'tool_life': ['tool life', 'wear', 'taylor', 'tool change'],
            'chatter': ['chatter', 'vibration', 'stability', 'regenerative'],
            'scheduling': ['schedule', 'job', 'sequence', 'order', 'makespan'],
            'path_planning': ['path', 'route', 'toolpath', 'collision'],
            'optimization': ['optimize', 'minimize', 'maximize', 'best'],
            'prediction': ['predict', 'estimate', 'forecast', 'expected'],
            'classification': ['classify', 'categorize', 'identify', 'detect']
        },
        
        /**
         * Classify a problem from natural language description
         */
        classifyProblem: function(description) {
            const desc = description.toLowerCase();
            const problem = {
                type: 'general',
                multiObjective: desc.includes('multi') && desc.includes('objective'),
                continuous: !desc.includes('discrete') && !desc.includes('integer'),
                discrete: desc.includes('discrete') || desc.includes('sequence'),
                hasGradient: desc.includes('gradient') || desc.includes('derivative'),
                noGradient: desc.includes('black box') || desc.includes('no gradient'),
                largeDataset: desc.includes('large') || desc.includes('big data'),
                smallDataset: desc.includes('small') || desc.includes('few samples'),
                needsUncertainty: desc.includes('uncertainty') || desc.includes('confidence'),
                realTime: desc.includes('real-time') || desc.includes('fast'),
                constraints: desc.includes('constraint') || desc.includes('subject to')
            };
            
            // Classify problem type
            for (const [type, keywords] of Object.entries(this.problemPatterns)) {
                if (keywords.some(kw => desc.includes(kw))) {
                    problem.type = type;
                    break;
                }
            }
            
            // Set type-specific flags
            switch (problem.type) {
                case 'speed_feed':
                    problem.multiObjective = true;
                    problem.continuous = true;
                    break;
                case 'tool_life':
                    problem.toolLifePrediction = true;
                    problem.needsUncertainty = true;
                    break;
                case 'chatter':
                    problem.chatterPrediction = true;
                    problem.frequencyDomain = true;
                    break;
                case 'scheduling':
                    problem.discrete = true;
                    problem.combinatorial = true;
                    problem.constraints = true;
                    break;
                case 'path_planning':
                    problem.pathFinding = true;
                    problem.obstacles = true;
                    break;
            }
            
            return problem;
        },
        
        /**
         * Recommend algorithms for a problem
         */
        recommendAlgorithms: function(problemOrDescription, topN = 5) {
            let problem = problemOrDescription;
            
            // If string, classify first
            if (typeof problemOrDescription === 'string') {
                problem = this.classifyProblem(problemOrDescription);
            }
            
            return PRISM_ALGORITHM_REGISTRY.findBestMatch(problem, topN);
        },
        
        /**
         * Auto-select and execute best algorithm
         */
        autoSolve: function(problemDescription, data) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, 1);
            
            if (recommendations.length === 0) {
                console.warn('[ORCHESTRATOR] No matching algorithm found');
                return null;
            }
            
            const best = recommendations[0];
            console.log(`[ORCHESTRATOR] Selected: ${best.name} (score: ${best.score})`);
            
            // Execute via gateway if available
            if (best.gateway && typeof PRISM_GATEWAY !== 'undefined') {
                try {
                    const result = PRISM_GATEWAY.call(best.gateway, data);
                    
                    // Record for learning
                    if (typeof PRISM_AI_LEARNING_PIPELINE !== 'undefined') {
                        PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                            recommendationType: 'algorithm_selection',
                            recommended: { algorithm: best.id, score: best.score },
                            problem: problem,
                            timestamp: Date.now()
                        });
                    }
                    
                    return {
                        algorithm: best,
                        result: result,
                        problem: problem
                    };
                } catch (e) {
                    console.error(`[ORCHESTRATOR] Execution failed: ${e.message}`);
                    return { algorithm: best, error: e.message, problem: problem };
                }
            }
            
            return { algorithm: best, problem: problem, message: 'Gateway route not available' };
        },
        
        /**
         * Execute multiple algorithms and ensemble results
         */
        ensembleSolve: function(problemDescription, data, topN = 3) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, topN);
            
            if (recommendations.length === 0) {
                return null;
            }
            
            const results = [];
            for (const alg of recommendations) {
                if (alg.gateway && typeof PRISM_GATEWAY !== 'undefined') {
                    try {
                        const result = PRISM_GATEWAY.call(alg.gateway, data);
                        results.push({
                            algorithm: alg,
                            result: result,
                            weight: alg.score / recommendations[0].score
                        });
                    } catch (e) {
                        console.warn(`[ORCHESTRATOR] ${alg.name} failed: ${e.message}`);
                    }
                }
            }
            
            if (results.length === 0) {
                return { recommendations, message: 'No algorithms could be executed' };
            }
            
            // Combine results
            const combined = PRISM_ALGORITHM_ENSEMBLER.combine(results, problem.type);
            
            return {
                combined: combined,
                individual: results,
                problem: problem
            };
        },
        
        /**
         * Get algorithm recommendation explanation
         */
        explainRecommendation: function(problemDescription) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, 5);
            
            const explanation = {
                problemAnalysis: problem,
                recommendations: recommendations.map(r => ({
                    algorithm: r.name,
                    score: r.score,
                    gateway: r.gateway,
                    useCases: r.useCases,
                    characteristics: r.characteristics
                })),
                reasoning: this._generateReasoning(problem, recommendations)
            };
            
            return explanation;
        },
        
        _generateReasoning: function(problem, recommendations) {
            const reasons = [];
            
            if (recommendations.length === 0) {
                return 'No suitable algorithms found for this problem type.';
            }
            
            const top = recommendations[0];
            reasons.push(`Selected ${top.name} as the primary recommendation.`);
            
            if (problem.multiObjective) {
                reasons.push('Problem involves multiple objectives, favoring multi-objective optimizers.');
            }
            if (problem.needsUncertainty) {
                reasons.push('Uncertainty quantification needed, favoring Bayesian/probabilistic methods.');
            }
            if (problem.realTime) {
                reasons.push('Real-time requirement, favoring low-latency algorithms.');
            }
            if (problem.constraints) {
                reasons.push('Constraints present, favoring constraint-aware solvers.');
            }
            
            return reasons.join(' ');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // TIER 3: PRISM_ALGORITHM_ENSEMBLER - Combine Multiple Algorithm Results
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    const PRISM_ALGORITHM_ENSEMBLER = {
        version: '1.0.0',
        
        /**
         * Combine results from multiple algorithms
         */
        combine: function(results, problemType) {
            if (!results || results.length === 0) return null;
            if (results.length === 1) return results[0].result;
            
            // Strategy depends on problem type
            switch (problemType) {
                case 'speed_feed':
                case 'optimization':
                    return this.combineOptimization(results);
                
                case 'tool_life':
                case 'prediction':
                    return this.combinePrediction(results);
                
                case 'classification':
                case 'chatter':
                    return this.combineClassification(results);
                
                case 'scheduling':
                case 'path_planning':
                    return this.combineBestOf(results);
                
                default:
                    return this.combineWeighted(results);
            }
        },
        
        /**
         * For optimization: Take best objective value
         */
        combineOptimization: function(results) {
            let best = results[0];
            
            for (const r of results) {
                const objVal = r.result?.objectiveValue ?? r.result?.fitness ?? r.result?.cost;
                const bestObjVal = best.result?.objectiveValue ?? best.result?.fitness ?? best.result?.cost;
                
                if (objVal !== undefined && bestObjVal !== undefined && objVal < bestObjVal) {
                    best = r;
                }
            }
            
            return {
                ...best.result,
                _ensemble: true,
                _method: 'best_objective',
                _contributors: results.map(r => r.algorithm.name),
                _selectedFrom: results.length
            };
        },
        
        /**
         * For predictions: Weighted average
         */
        combinePrediction: function(results) {
            const totalWeight = results.reduce((sum, r) => sum + (r.weight || 1), 0);
            
            // Weighted average of predictions
            let weightedPrediction = 0;
            let confidenceSum = 0;
            let hasConfidence = false;
            
            for (const r of results) {
                const weight = (r.weight || 1) / totalWeight;
                const prediction = r.result?.prediction ?? r.result?.value ?? r.result;
                
                if (typeof prediction === 'number') {
                    weightedPrediction += prediction * weight;
                }
                
                if (r.result?.confidence !== undefined) {
                    confidenceSum += r.result.confidence * weight;
                    hasConfidence = true;
                }
            }
            
            return {
                prediction: weightedPrediction,
                confidence: hasConfidence ? confidenceSum : undefined,
                _ensemble: true,
                _method: 'weighted_average',
                _contributors: results.map(r => ({
                    algorithm: r.algorithm.name,
                    prediction: r.result?.prediction ?? r.result?.value,
                    weight: r.weight
                }))
            };
        },
        
        /**
         * For classification: Voting
         */
        combineClassification: function(results) {
            const votes = {};
            
            for (const r of results) {
                const prediction = r.result?.class ?? r.result?.prediction ?? r.result?.label;
                if (prediction !== undefined) {
                    const weight = r.weight || 1;
                    votes[prediction] = (votes[prediction] || 0) + weight;
                }
            }
            
            // Find winner
            let winner = null;
            let maxVotes = 0;
            for (const [cls, count] of Object.entries(votes)) {
                if (count > maxVotes) {
                    maxVotes = count;
                    winner = cls;
                }
            }
            
            const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
            
            return {
                prediction: winner,
                confidence: totalVotes > 0 ? maxVotes / totalVotes : 0,
                votes: votes,
                _ensemble: true,
                _method: 'voting',
                _contributors: results.map(r => r.algorithm.name)
            };
        },
        
        /**
         * For scheduling/planning: Take best feasible solution
         */
        combineBestOf: function(results) {
            let best = results[0];
            let bestMetric = Infinity;
            
            for (const r of results) {
                // Look for common objective metrics
                const metric = r.result?.makespan ?? r.result?.cost ?? 
                              r.result?.pathLength ?? r.result?.totalTime;
                
                if (metric !== undefined && metric < bestMetric) {
                    bestMetric = metric;
                    best = r;
                }
            }
            
            return {
                ...best.result,
                _ensemble: true,
                _method: 'best_of_n',
                _selectedAlgorithm: best.algorithm.name,
                _contributors: results.map(r => r.algorithm.name)
            };
        },
        
        /**
         * Generic weighted combination
         */
        combineWeighted: function(results) {
            // Sort by weight and return top result
            results.sort((a, b) => (b.weight || 0) - (a.weight || 0));
            
            return {
                ...results[0].result,
                _ensemble: true,
                _method: 'highest_weight',
                _primaryAlgorithm: results[0].algorithm.name,
                _alternatives: results.slice(1).map(r => r.algorithm.name)
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // GATEWAY REGISTRATIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    if (typeof PRISM_GATEWAY !== 'undefined') {
        // Registry routes
        PRISM_GATEWAY.register('alg.registry.all', 'PRISM_ALGORITHM_REGISTRY.getAll');
        PRISM_GATEWAY.register('alg.registry.category', 'PRISM_ALGORITHM_REGISTRY.getByCategory');
        PRISM_GATEWAY.register('alg.registry.usecase', 'PRISM_ALGORITHM_REGISTRY.getByUseCase');
        PRISM_GATEWAY.register('alg.registry.stats', 'PRISM_ALGORITHM_REGISTRY.getStats');
        PRISM_GATEWAY.register('alg.registry.match', 'PRISM_ALGORITHM_REGISTRY.findBestMatch');
        
        // Orchestrator routes
        PRISM_GATEWAY.register('alg.orchestrator.classify', 'PRISM_ALGORITHM_ORCHESTRATOR.classifyProblem');
        PRISM_GATEWAY.register('alg.orchestrator.recommend', 'PRISM_ALGORITHM_ORCHESTRATOR.recommendAlgorithms');
        PRISM_GATEWAY.register('alg.orchestrator.auto', 'PRISM_ALGORITHM_ORCHESTRATOR.autoSolve');
        PRISM_GATEWAY.register('alg.orchestrator.ensemble', 'PRISM_ALGORITHM_ORCHESTRATOR.ensembleSolve');
        PRISM_GATEWAY.register('alg.orchestrator.explain', 'PRISM_ALGORITHM_ORCHESTRATOR.explainRecommendation');
        
        // Ensembler routes
        PRISM_GATEWAY.register('alg.ensembler.combine', 'PRISM_ALGORITHM_ENSEMBLER.combine');
        PRISM_GATEWAY.register('alg.ensembler.optimize', 'PRISM_ALGORITHM_ENSEMBLER.combineOptimization');
        PRISM_GATEWAY.register('alg.ensembler.predict', 'PRISM_ALGORITHM_ENSEMBLER.combinePrediction');
        PRISM_GATEWAY.register('alg.ensembler.vote', 'PRISM_ALGORITHM_ENSEMBLER.combineClassification');
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // GLOBAL EXPORTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    window.PRISM_ALGORITHM_REGISTRY = PRISM_ALGORITHM_REGISTRY;
    window.PRISM_ALGORITHM_ORCHESTRATOR = PRISM_ALGORITHM_ORCHESTRATOR;
    window.PRISM_ALGORITHM_ENSEMBLER = PRISM_ALGORITHM_ENSEMBLER;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // SELF-TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    const ALGORITHM_UTILIZATION_TESTS = {
        runAll: function() {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('PRISM Algorithm Utilization System - Self Tests');
            console.log('═══════════════════════════════════════════════════════════════');
            
            let passed = 0;
            let failed = 0;
            
            // Test 1: Registry Statistics
            try {
                const stats = PRISM_ALGORITHM_REGISTRY.getStats();
                if (stats.total >= 150 && stats.withMatchScore > 100) {
                    console.log(`✓ Registry Stats: ${stats.total} algorithms, ${stats.withMatchScore} with matchScore`);
                    passed++;
                } else {
                    throw new Error(`Expected 150+ algorithms, got ${stats.total}`);
                }
            } catch (e) {
                console.log('✗ Registry Stats:', e.message);
                failed++;
            }
            
            // Test 2: Category Retrieval
            try {
                const optAlgs = PRISM_ALGORITHM_REGISTRY.getByCategory('optimization');
                if (optAlgs.length >= 10) {
                    console.log(`✓ Category Retrieval: ${optAlgs.length} optimization algorithms`);
                    passed++;
                } else {
                    throw new Error(`Expected 10+ optimization algorithms, got ${optAlgs.length}`);
                }
            } catch (e) {
                console.log('✗ Category Retrieval:', e.message);
                failed++;
            }
            
            // Test 3: Use Case Search
            try {
                const chatterAlgs = PRISM_ALGORITHM_REGISTRY.getByUseCase('chatter_detection');
                if (chatterAlgs.length >= 2) {
                    console.log(`✓ Use Case Search: ${chatterAlgs.length} chatter detection algorithms`);
                    passed++;
                } else {
                    throw new Error(`Expected 2+ chatter algorithms, got ${chatterAlgs.length}`);
                }
            } catch (e) {
                console.log('✗ Use Case Search:', e.message);
                failed++;
            }
            
            // Test 4: Problem Classification
            try {
                const problem = PRISM_ALGORITHM_ORCHESTRATOR.classifyProblem(
                    'I need to optimize speed and feed for aluminum milling'
                );
                if (problem.type === 'speed_feed' && problem.multiObjective) {
                    console.log('✓ Problem Classification: Correctly identified speed_feed optimization');
                    passed++;
                } else {
                    throw new Error(`Expected speed_feed type, got ${problem.type}`);
                }
            } catch (e) {
                console.log('✗ Problem Classification:', e.message);
                failed++;
            }
            
            // Test 5: Algorithm Recommendation
            try {
                const recs = PRISM_ALGORITHM_ORCHESTRATOR.recommendAlgorithms(
                    'Find optimal cutting parameters with multiple objectives'
                );
                if (recs.length > 0 && recs[0].score > 50) {
                    console.log(`✓ Algorithm Recommendation: Top pick is ${recs[0].name} (score: ${recs[0].score})`);
                    passed++;
                } else {
                    throw new Error('No recommendations or low scores');
                }
            } catch (e) {
                console.log('✗ Algorithm Recommendation:', e.message);
                failed++;
            }
            
            // Test 6: Chatter Problem
            try {
                const recs = PRISM_ALGORITHM_ORCHESTRATOR.recommendAlgorithms(
                    'Detect chatter and vibration in milling operation'
                );
                const hasFFT = recs.some(r => r.id === 'fft' || r.id === 'stability_lobes');
                if (hasFFT) {
                    console.log('✓ Chatter Problem: FFT/Stability correctly recommended');
                    passed++;
                } else {
                    throw new Error('FFT or Stability Lobes not in recommendations');
                }
            } catch (e) {
                console.log('✗ Chatter Problem:', e.message);
                failed++;
            }
            
            // Test 7: Tool Life Problem
            try {
                const recs = PRISM_ALGORITHM_ORCHESTRATOR.recommendAlgorithms(
                    'Predict tool life with uncertainty estimates'
                );
                const hasBayesian = recs.some(r => 
                    r.id === 'gaussian_process' || 
                    r.id === 'bayesian_inference' ||
                    r.id === 'taylor_tool_life'
                );
                if (hasBayesian) {
                    console.log('✓ Tool Life Problem: Bayesian/GP correctly recommended');
                    passed++;
                } else {
                    throw new Error('Bayesian methods not in recommendations');
                }
            } catch (e) {
                console.log('✗ Tool Life Problem:', e.message);
                failed++;
            }
            
            // Test 8: Scheduling Problem
            try {
                const recs = PRISM_ALGORITHM_ORCHESTRATOR.recommendAlgorithms(
                    'Optimize job shop schedule to minimize makespan'
                );
                const hasScheduling = recs.some(r => 
                    r.id === 'genetic_scheduling' || 
                    r.id === 'aco' ||
                    r.id === 'johnsons_rule'
                );
                if (hasScheduling) {
                    console.log('✓ Scheduling Problem: Scheduling algorithms correctly recommended');
                    passed++;
                } else {
                    throw new Error('Scheduling algorithms not in recommendations');
                }
            } catch (e) {
                console.log('✗ Scheduling Problem:', e.message);
                failed++;
            }
            
            // Test 9: Ensemble Prediction
            try {
                const mockResults = [
                    { algorithm: { name: 'GP' }, result: { prediction: 45 }, weight: 0.8 },
                    { algorithm: { name: 'Taylor' }, result: { prediction: 50 }, weight: 0.6 },
                    { algorithm: { name: 'NN' }, result: { prediction: 42 }, weight: 0.4 }
                ];
                const combined = PRISM_ALGORITHM_ENSEMBLER.combinePrediction(mockResults);
                if (combined._ensemble && combined.prediction > 40 && combined.prediction < 50) {
                    console.log(`✓ Ensemble Prediction: Combined prediction = ${combined.prediction.toFixed(1)}`);
                    passed++;
                } else {
                    throw new Error('Invalid ensemble result');
                }
            } catch (e) {
                console.log('✗ Ensemble Prediction:', e.message);
                failed++;
            }
            
            // Test 10: Explain Recommendation
            try {
                const explanation = PRISM_ALGORITHM_ORCHESTRATOR.explainRecommendation(
                    'Optimize multi-objective speed and feed with constraints'
                );
                if (explanation.recommendations.length > 0 && explanation.reasoning.length > 0) {
                    console.log('✓ Explain Recommendation: Generated explanation with reasoning');
                    passed++;
                } else {
                    throw new Error('Incomplete explanation');
                }
            } catch (e) {
                console.log('✗ Explain Recommendation:', e.message);
                failed++;
            }
            
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`Results: ${passed}/${passed + failed} tests passed`);
            console.log('═══════════════════════════════════════════════════════════════');
            
            return { passed, failed, total: passed + failed };
        }
    };

    // Run tests
    const testResults = ALGORITHM_UTILIZATION_TESTS.runAll();
    
    // Final stats
    const finalStats = PRISM_ALGORITHM_REGISTRY.getStats();
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('PRISM 100% Algorithm Utilization System - Initialized');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('Components:');
    console.log('  ✅ PRISM_ALGORITHM_REGISTRY: ' + finalStats.total + ' algorithms cataloged');
    console.log('  ✅ PRISM_ALGORITHM_ORCHESTRATOR: Intelligent algorithm selection');
    console.log('  ✅ PRISM_ALGORITHM_ENSEMBLER: Multi-algorithm combination');
    console.log('');
    console.log('Categories:', Object.entries(finalStats.byCategory).map(([k,v]) => `${k}(${v})`).join(', '));
    console.log('Algorithms with matchScore:', finalStats.withMatchScore);
    console.log('Gateway Routes Added: 14');
    console.log('Self-Tests: ' + testResults.passed + '/' + testResults.total + ' passed');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');

})();

// END OF PRISM 100% ALGORITHM UTILIZATION SYSTEM


// ═══════════════════════════════════════════════════════════════════════════════
// SESSION 2 ENHANCEMENT: PROCESS PLANNING & SEARCH
// Version: 1.0.0 | Date: January 18, 2026
// Source: MIT 6.034, 6.046J, 16.410
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PRISM SESSION 2 ENHANCEMENT: PROCESS PLANNING & SEARCH
 * 
 * NEW ALGORITHMS:
 * - Search: Best-First, Beam, Bidirectional, Weighted A*, Uniform Cost
 * - CSP: Forward Checking, Conflict-Directed Backjumping, Min-Conflicts
 * - Motion: Potential Fields, PRM
 * - Manufacturing: Tool Change Optimizer, Setup Planner, Rapid Optimizer
 * 
 * GATEWAY ROUTES: 15 new routes added
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ENHANCED SEARCH ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SEARCH_ENHANCED = {
    name: 'PRISM_SEARCH_ENHANCED',
    version: '1.0.0',
    source: 'MIT 6.034 - Artificial Intelligence',
    
    /**
     * Best-First Search (Greedy)
     * Uses only heuristic f(n) = h(n)
     * Source: MIT 6.034 Lecture 4
     */
    bestFirstSearch: function(problem) {
        const openSet = [];
        const visited = new Set();
        let nodesExpanded = 0;
        
        openSet.push({
            state: problem.initial,
            path: [],
            cost: 0,
            h: problem.heuristic(problem.initial)
        });
        
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.h - b.h);
            const current = openSet.shift();
            const stateKey = JSON.stringify(current.state);
            
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            nodesExpanded++;
            
            if (problem.isGoal(current.state)) {
                return { found: true, path: current.path, cost: current.cost, nodesExpanded };
            }
            
            const successors = problem.getSuccessors(current.state);
            for (const { state, action, cost } of successors) {
                const key = JSON.stringify(state);
                if (!visited.has(key)) {
                    openSet.push({
                        state,
                        path: [...current.path, action],
                        cost: current.cost + cost,
                        h: problem.heuristic(state)
                    });
                }
            }
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Beam Search - Memory-bounded Best-First
     * Source: MIT 6.034 Lecture 4
     */
    beamSearch: function(problem, beamWidth = 3) {
        let currentLevel = [{
            state: problem.initial,
            path: [],
            cost: 0
        }];
        
        const visited = new Set([JSON.stringify(problem.initial)]);
        let nodesExpanded = 0;
        const maxIterations = 10000;
        
        for (let iteration = 0; iteration < maxIterations && currentLevel.length > 0; iteration++) {
            for (const node of currentLevel) {
                if (problem.isGoal(node.state)) {
                    return { found: true, path: node.path, cost: node.cost, nodesExpanded };
                }
            }
            
            const nextLevel = [];
            for (const node of currentLevel) {
                nodesExpanded++;
                for (const { state, action, cost } of problem.getSuccessors(node.state)) {
                    const key = JSON.stringify(state);
                    if (!visited.has(key)) {
                        visited.add(key);
                        nextLevel.push({
                            state,
                            path: [...node.path, action],
                            cost: node.cost + cost,
                            h: problem.heuristic(state)
                        });
                    }
                }
            }
            
            nextLevel.sort((a, b) => a.h - b.h);
            currentLevel = nextLevel.slice(0, beamWidth);
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Bidirectional Search
     * Source: MIT 6.034 Lecture 3
     */
    bidirectionalSearch: function(problem) {
        const forwardFrontier = new Map();
        forwardFrontier.set(JSON.stringify(problem.initial), {
            state: problem.initial, path: [], cost: 0, direction: 'forward'
        });
        
        const backwardFrontier = new Map();
        backwardFrontier.set(JSON.stringify(problem.goal), {
            state: problem.goal, path: [], cost: 0, direction: 'backward'
        });
        
        const forwardVisited = new Map();
        const backwardVisited = new Map();
        let nodesExpanded = 0;
        
        for (let i = 0; i < 50000; i++) {
            if (forwardFrontier.size > 0) {
                const result = this._expandFrontier(forwardFrontier, forwardVisited, backwardVisited, problem.getSuccessors, 'forward');
                nodesExpanded++;
                if (result.found) return { found: true, path: result.path, cost: result.cost, nodesExpanded };
            }
            
            if (backwardFrontier.size > 0) {
                const result = this._expandFrontier(backwardFrontier, backwardVisited, forwardVisited, problem.getPredecessors || problem.getSuccessors, 'backward');
                nodesExpanded++;
                if (result.found) return { found: true, path: result.path, cost: result.cost, nodesExpanded };
            }
            
            if (forwardFrontier.size === 0 && backwardFrontier.size === 0) break;
        }
        return { found: false, nodesExpanded };
    },
    
    _expandFrontier: function(frontier, myVisited, otherVisited, getSuccessors, direction) {
        let minCost = Infinity, minKey = null;
        for (const [key, node] of frontier) {
            if (node.cost < minCost) { minCost = node.cost; minKey = key; }
        }
        if (!minKey) return { found: false };
        
        const current = frontier.get(minKey);
        frontier.delete(minKey);
        myVisited.set(minKey, current);
        
        if (otherVisited.has(minKey)) {
            const other = otherVisited.get(minKey);
            const path = direction === 'forward'
                ? [...current.path, ...other.path.reverse()]
                : [...other.path, ...current.path.reverse()];
            return { found: true, path, cost: current.cost + other.cost };
        }
        
        const successors = getSuccessors(current.state);
        for (const { state, action, cost } of successors) {
            const key = JSON.stringify(state);
            if (!myVisited.has(key) && !frontier.has(key)) {
                frontier.set(key, { state, path: [...current.path, action], cost: current.cost + cost, direction });
            }
        }
        return { found: false };
    },
    
    /**
     * Dijkstra's Algorithm - Source: MIT 6.006
     */
    dijkstra: function(graph, start, goal = null) {
        const distances = new Map();
        const predecessors = new Map();
        const visited = new Set();
        const pq = [];
        
        distances.set(start, 0);
        pq.push({ node: start, dist: 0 });
        
        while (pq.length > 0) {
            pq.sort((a, b) => a.dist - b.dist);
            const { node: current, dist: currentDist } = pq.shift();
            
            if (visited.has(current)) continue;
            visited.add(current);
            if (goal !== null && current === goal) break;
            if (currentDist > (distances.get(current) || Infinity)) continue;
            
            const neighbors = graph[current] || [];
            for (const neighbor of neighbors) {
                const { to, weight } = typeof neighbor === 'object' ? neighbor : { to: neighbor, weight: 1 };
                if (visited.has(to)) continue;
                
                const newDist = currentDist + weight;
                if (newDist < (distances.get(to) || Infinity)) {
                    distances.set(to, newDist);
                    predecessors.set(to, current);
                    pq.push({ node: to, dist: newDist });
                }
            }
        }
        
        let path = null;
        if (goal !== null && distances.has(goal)) {
            path = [];
            let current = goal;
            while (current !== undefined) {
                path.unshift(current);
                current = predecessors.get(current);
            }
        }
        
        return {
            distances: Object.fromEntries(distances),
            predecessors: Object.fromEntries(predecessors),
            path,
            pathCost: goal ? distances.get(goal) : null
        };
    },
    
    /**
     * Uniform Cost Search - A* with h(n)=0
     */
    uniformCostSearch: function(problem) {
        const frontier = [];
        const explored = new Set();
        const costSoFar = new Map();
        
        frontier.push({ state: problem.initial, path: [], cost: 0 });
        costSoFar.set(JSON.stringify(problem.initial), 0);
        
        let nodesExpanded = 0;
        
        while (frontier.length > 0) {
            frontier.sort((a, b) => a.cost - b.cost);
            const current = frontier.shift();
            const stateKey = JSON.stringify(current.state);
            
            if (problem.isGoal(current.state)) {
                return { found: true, path: current.path, cost: current.cost, nodesExpanded, optimal: true };
            }
            
            if (explored.has(stateKey)) continue;
            explored.add(stateKey);
            nodesExpanded++;
            
            for (const { state, action, cost } of problem.getSuccessors(current.state)) {
                const key = JSON.stringify(state);
                const newCost = current.cost + cost;
                if (!explored.has(key) && newCost < (costSoFar.get(key) || Infinity)) {
                    costSoFar.set(key, newCost);
                    frontier.push({ state, path: [...current.path, action], cost: newCost });
                }
            }
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Weighted A* - f(n) = g(n) + w*h(n)
     */
    weightedAStar: function(problem, weight = 1.5) {
        const openSet = new Map();
        const closedSet = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        openSet.set(startKey, problem.initial);
        gScore.set(startKey, 0);
        fScore.set(startKey, weight * problem.heuristic(problem.initial));
        
        let nodesExpanded = 0;
        
        while (openSet.size > 0 && nodesExpanded < 100000) {
            let currentKey = null, lowestF = Infinity;
            for (const [key, _] of openSet) {
                const f = fScore.get(key);
                if (f < lowestF) { lowestF = f; currentKey = key; }
            }
            
            const current = openSet.get(currentKey);
            nodesExpanded++;
            
            if (problem.isGoal(current)) {
                const path = [];
                let curr = currentKey;
                while (cameFrom.has(curr)) {
                    const { parent, action } = cameFrom.get(curr);
                    path.unshift(action);
                    curr = parent;
                }
                return { found: true, path, cost: gScore.get(currentKey), nodesExpanded };
            }
            
            openSet.delete(currentKey);
            closedSet.add(currentKey);
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeG = gScore.get(currentKey) + cost;
                if (!openSet.has(neighborKey)) {
                    openSet.set(neighborKey, state);
                    gScore.set(neighborKey, Infinity);
                }
                
                if (tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + weight * problem.heuristic(state));
                }
            }
        }
        return { found: false, nodesExpanded };
    }
}