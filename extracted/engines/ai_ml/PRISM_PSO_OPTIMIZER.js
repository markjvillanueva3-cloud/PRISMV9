// PRISM_PSO_OPTIMIZER - Lines 754042-754903 (862 lines) - Particle Swarm Optimization\n\nconst PRISM_PSO_OPTIMIZER = {

    version: '1.0.0',
    authority: 'PRISM_PSO_OPTIMIZER',
    created: '2026-01-14',
    innovationId: 'PSO_FEEDRATE',

    // CONFIGURATION

    config: {
        // PSO Parameters
        DEFAULT_SWARM_SIZE: 30,        // Number of particles
        DEFAULT_ITERATIONS: 100,       // Maximum iterations
        DEFAULT_W: 0.7,                // Inertia weight
        DEFAULT_W_MIN: 0.4,            // Minimum inertia (adaptive)
        DEFAULT_W_MAX: 0.9,            // Maximum inertia (adaptive)
        DEFAULT_C1: 1.5,               // Cognitive coefficient
        DEFAULT_C2: 1.5,               // Social coefficient

        // Velocity limits
        V_MAX_RATIO: 0.2,              // Max velocity as ratio of range

        // Convergence
        CONVERGENCE_THRESHOLD: 1e-6,
        STAGNATION_LIMIT: 15,

        // Multi-objective
        PARETO_ARCHIVE_SIZE: 100,      // Max solutions in Pareto archive

        // Manufacturing defaults
        FEEDRATE_BOUNDS: { min: 50, max: 5000 },      // mm/min
        SPINDLE_BOUNDS: { min: 500, max: 20000 },     // RPM
        DOC_BOUNDS: { min: 0.1, max: 10 },            // mm (depth of cut)
        WOC_BOUNDS: { min: 0.1, max: 50 },            // mm (width of cut)
        STEPOVER_BOUNDS: { min: 5, max: 80 }          // percent of tool diameter
    },
    // SECTION 1: CORE PSO ALGORITHM

    /**
     * Create a particle with position, velocity, and memory
     * @param {Array} bounds - Array of {min, max} for each dimension
     * @returns {Object} Particle object
     */
    createParticle: function(bounds) {
        const dimensions = bounds.length;
        const position = [];
        const velocity = [];

        for (let i = 0; i < dimensions; i++) {
            const range = bounds[i].max - bounds[i].min;
            position.push(bounds[i].min + Math.random() * range);
            velocity.push((Math.random() - 0.5) * range * this.config.V_MAX_RATIO);
        }
        return {
            position: position,
            velocity: velocity,
            bestPosition: [...position],
            bestFitness: -Infinity,
            fitness: -Infinity
        };
    },
    /**
     * Initialize a swarm of particles
     * @param {number} swarmSize - Number of particles
     * @param {Array} bounds - Bounds for each dimension
     * @returns {Array} Array of particles
     */
    initializeSwarm: function(swarmSize, bounds) {
        const swarm = [];
        for (let i = 0; i < swarmSize; i++) {
            swarm.push(this.createParticle(bounds));
        }
        return swarm;
    },
    /**
     * Update particle velocity and position
     * @param {Object} particle - Particle to update
     * @param {Array} globalBest - Global best position
     * @param {Array} bounds - Parameter bounds
     * @param {Object} params - PSO parameters (w, c1, c2)
     * @returns {Object} Updated particle
     */
    updateParticle: function(particle, globalBest, bounds, params = {}) {
        const w = params.w || this.config.DEFAULT_W;
        const c1 = params.c1 || this.config.DEFAULT_C1;
        const c2 = params.c2 || this.config.DEFAULT_C2;

        const dimensions = particle.position.length;
        const newVelocity = [];
        const newPosition = [];

        for (let i = 0; i < dimensions; i++) {
            const range = bounds[i].max - bounds[i].min;
            const vMax = range * this.config.V_MAX_RATIO;

            // Velocity update equation
            const cognitive = c1 * Math.random() * (particle.bestPosition[i] - particle.position[i]);
            const social = c2 * Math.random() * (globalBest[i] - particle.position[i]);
            let v = w * particle.velocity[i] + cognitive + social;

            // Clamp velocity
            v = Math.max(-vMax, Math.min(vMax, v));
            newVelocity.push(v);

            // Position update
            let p = particle.position[i] + v;

            // Boundary handling (reflection)
            if (p < bounds[i].min) {
                p = bounds[i].min + (bounds[i].min - p) * 0.5;
                newVelocity[i] *= -0.5;
            } else if (p > bounds[i].max) {
                p = bounds[i].max - (p - bounds[i].max) * 0.5;
                newVelocity[i] *= -0.5;
            }
            // Final clamp
            p = Math.max(bounds[i].min, Math.min(bounds[i].max, p));
            newPosition.push(p);
        }
        return {
            ...particle,
            position: newPosition,
            velocity: newVelocity
        };
    },
    /**
     * Adaptive inertia weight (decreases over iterations)
     * @param {number} iteration - Current iteration
     * @param {number} maxIterations - Maximum iterations
     * @returns {number} Inertia weight
     */
    adaptiveInertia: function(iteration, maxIterations) {
        return this.config.DEFAULT_W_MAX -
            (this.config.DEFAULT_W_MAX - this.config.DEFAULT_W_MIN) *
            (iteration / maxIterations);
    },
    // SECTION 2: SINGLE-OBJECTIVE OPTIMIZATION

    /**
     * General-purpose PSO optimization
     * @param {Function} fitnessFunction - Function(position) => fitness value (higher is better)
     * @param {Array} bounds - Array of {min, max} for each dimension
     * @param {Object} options - Optimization options
     * @returns {Object} Optimization result
     */
    optimize: function(fitnessFunction, bounds, options = {}) {
        const startTime = performance.now();

        const swarmSize = options.swarmSize || this.config.DEFAULT_SWARM_SIZE;
        const maxIterations = options.maxIterations || this.config.DEFAULT_ITERATIONS;
        const adaptive = options.adaptive !== false;

        // Initialize swarm
        const swarm = this.initializeSwarm(swarmSize, bounds);

        // Global best tracking
        let globalBest = {
            position: [...swarm[0].position],
            fitness: -Infinity
        };
        // Statistics
        const stats = {
            fitnessHistory: [],
            convergenceIteration: null
        };
        let stagnationCount = 0;
        let lastBestFitness = -Infinity;

        // Main PSO loop
        for (let iter = 0; iter < maxIterations; iter++) {
            const w = adaptive ? this.adaptiveInertia(iter, maxIterations) : this.config.DEFAULT_W;

            // Evaluate and update each particle
            for (let i = 0; i < swarm.length; i++) {
                // Evaluate fitness
                const fitness = fitnessFunction(swarm[i].position);
                swarm[i].fitness = fitness;

                // Update personal best
                if (fitness > swarm[i].bestFitness) {
                    swarm[i].bestFitness = fitness;
                    swarm[i].bestPosition = [...swarm[i].position];
                }
                // Update global best
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = [...swarm[i].position];
                }
            }
            // Update particle positions
            for (let i = 0; i < swarm.length; i++) {
                swarm[i] = this.updateParticle(swarm[i], globalBest.position, bounds, { w });
            }
            // Track statistics
            stats.fitnessHistory.push(globalBest.fitness);

            // Check convergence
            if (Math.abs(globalBest.fitness - lastBestFitness) < this.config.CONVERGENCE_THRESHOLD) {
                stagnationCount++;
                if (stagnationCount >= this.config.STAGNATION_LIMIT) {
                    stats.convergenceIteration = iter;
                    break;
                }
            } else {
                stagnationCount = 0;
            }
            lastBestFitness = globalBest.fitness;
        }
        const endTime = performance.now();

        return {
            success: true,
            bestPosition: globalBest.position,
            bestFitness: globalBest.fitness,
            iterations: stats.fitnessHistory.length,
            converged: stats.convergenceIteration !== null,
            convergenceIteration: stats.convergenceIteration,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats
        };
    },
    // SECTION 3: MULTI-OBJECTIVE OPTIMIZATION (MOPSO)

    /**
     * Multi-objective PSO optimization
     * @param {Array} objectiveFunctions - Array of fitness functions (all maximized)
     * @param {Array} bounds - Parameter bounds
     * @param {Object} options - Options including weights
     * @returns {Object} Pareto front and selected solution
     */
    optimizeMultiObjective: function(objectiveFunctions, bounds, options = {}) {
        const startTime = performance.now();

        const swarmSize = options.swarmSize || this.config.DEFAULT_SWARM_SIZE;
        const maxIterations = options.maxIterations || this.config.DEFAULT_ITERATIONS;
        const weights = options.weights || objectiveFunctions.map(() => 1 / objectiveFunctions.length);

        // Pareto archive
        let paretoArchive = [];

        // Initialize swarm
        const swarm = this.initializeSwarm(swarmSize, bounds);

        // Evaluate initial swarm
        for (const particle of swarm) {
            particle.objectives = objectiveFunctions.map(f => f(particle.position));
            particle.fitness = this._weightedSum(particle.objectives, weights);
            particle.bestObjectives = [...particle.objectives];
            particle.bestFitness = particle.fitness;
        }
        // Main MOPSO loop
        for (let iter = 0; iter < maxIterations; iter++) {
            const w = this.adaptiveInertia(iter, maxIterations);

            // Update Pareto archive
            for (const particle of swarm) {
                this._updateParetoArchive(paretoArchive, {
                    position: [...particle.position],
                    objectives: [...particle.objectives]
                });
            }
            // Trim archive if too large
            if (paretoArchive.length > this.config.PARETO_ARCHIVE_SIZE) {
                paretoArchive = this._crowdingDistanceSelection(
                    paretoArchive,
                    this.config.PARETO_ARCHIVE_SIZE
                );
            }
            // Update particles
            for (let i = 0; i < swarm.length; i++) {
                // Select leader from Pareto archive
                const leader = this._selectLeader(paretoArchive);

                // Update velocity and position
                swarm[i] = this.updateParticle(swarm[i], leader.position, bounds, { w });

                // Evaluate new position
                swarm[i].objectives = objectiveFunctions.map(f => f(swarm[i].position));
                swarm[i].fitness = this._weightedSum(swarm[i].objectives, weights);

                // Update personal best (using dominance)
                if (this._dominates(swarm[i].objectives, swarm[i].bestObjectives)) {
                    swarm[i].bestPosition = [...swarm[i].position];
                    swarm[i].bestObjectives = [...swarm[i].objectives];
                    swarm[i].bestFitness = swarm[i].fitness;
                }
            }
        }
        // Final Pareto archive update
        for (const particle of swarm) {
            this._updateParetoArchive(paretoArchive, {
                position: [...particle.position],
                objectives: [...particle.objectives]
            });
        }
        // Select best compromise solution
        const bestCompromise = this._selectBestCompromise(paretoArchive, weights);

        const endTime = performance.now();

        return {
            success: true,
            paretoFront: paretoArchive,
            paretoSize: paretoArchive.length,
            bestCompromise: bestCompromise,
            iterations: maxIterations,
            executionTime: (endTime - startTime).toFixed(2) + 'ms'
        };
    },
    /**
     * Calculate weighted sum of objectives
     */
    _weightedSum: function(objectives, weights) {
        let sum = 0;
        for (let i = 0; i < objectives.length; i++) {
            sum += objectives[i] * (weights[i] || 1);
        }
        return sum;
    },
    /**
     * Check if solution A dominates solution B
     */
    _dominates: function(objA, objB) {
        let dominated = false;
        for (let i = 0; i < objA.length; i++) {
            if (objA[i] < objB[i]) return false;
            if (objA[i] > objB[i]) dominated = true;
        }
        return dominated;
    },
    /**
     * Update Pareto archive with new solution
     */
    _updateParetoArchive: function(archive, solution) {
        // Check if solution is dominated by any archive member
        for (const member of archive) {
            if (this._dominates(member.objectives, solution.objectives)) {
                return; // Solution is dominated, don't add
            }
        }
        // Remove archive members dominated by new solution
        for (let i = archive.length - 1; i >= 0; i--) {
            if (this._dominates(solution.objectives, archive[i].objectives)) {
                archive.splice(i, 1);
            }
        }
        // Add new solution
        archive.push(solution);
    },
    /**
     * Select leader from Pareto archive (roulette wheel based on crowding)
     */
    _selectLeader: function(archive) {
        if (archive.length === 0) return null;
        if (archive.length === 1) return archive[0];

        // Simple random selection for now
        // Full implementation would use crowding distance
        return archive[Math.floor(Math.random() * archive.length)];
    },
    /**
     * Crowding distance selection to maintain diversity
     */
    _crowdingDistanceSelection: function(archive, targetSize) {
        if (archive.length <= targetSize) return archive;

        const numObjectives = archive[0].objectives.length;

        // Calculate crowding distance for each solution
        for (const sol of archive) {
            sol.crowdingDistance = 0;
        }
        for (let m = 0; m < numObjectives; m++) {
            // Sort by objective m
            archive.sort((a, b) => a.objectives[m] - b.objectives[m]);

            // Boundary solutions get infinite distance
            archive[0].crowdingDistance = Infinity;
            archive[archive.length - 1].crowdingDistance = Infinity;

            // Calculate distance for others
            const range = archive[archive.length - 1].objectives[m] - archive[0].objectives[m];
            if (range > 0) {
                for (let i = 1; i < archive.length - 1; i++) {
                    archive[i].crowdingDistance +=
                        (archive[i + 1].objectives[m] - archive[i - 1].objectives[m]) / range;
                }
            }
        }
        // Sort by crowding distance (descending) and take top
        archive.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
        return archive.slice(0, targetSize);
    },
    /**
     * Select best compromise solution from Pareto front
     */
    _selectBestCompromise: function(archive, weights) {
        if (archive.length === 0) return null;

        let best = archive[0];
        let bestScore = this._weightedSum(best.objectives, weights);

        for (const sol of archive) {
            const score = this._weightedSum(sol.objectives, weights);
            if (score > bestScore) {
                bestScore = score;
                best = sol;
            }
        }
        return best;
    },
    // SECTION 4: MANUFACTURING-SPECIFIC OPTIMIZATION

    /**
     * Optimize feedrate for a toolpath segment
     * @param {Object} segment - Toolpath segment with geometry info
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Optimization options
     * @returns {Object} Optimized feedrate and parameters
     */
    optimizeFeedrate: function(segment, tool, material, options = {}) {
        const bounds = [
            options.feedrateBounds || this.config.FEEDRATE_BOUNDS,
            options.spindleBounds || this.config.SPINDLE_BOUNDS
        ];

        // Extract relevant parameters
        const toolDiameter = tool.diameter || 10;
        const engagement = segment.engagement || 0.5; // Radial engagement ratio
        const doc = segment.doc || 1; // Depth of cut

        // Material parameters
        const Kc = material.specificCuttingForce || material.Kc || 2000; // N/mm²
        const n = material.taylorN || 0.25;
        const C = material.taylorC || 200;

        // Fitness function: maximize MRR while respecting constraints
        const fitnessFunction = (params) => {
            const feedrate = params[0];  // mm/min
            const rpm = params[1];

            // Calculate derived values
            const feedPerTooth = feedrate / (rpm * (tool.flutes || 4));
            const cuttingSpeed = Math.PI * toolDiameter * rpm / 1000; // m/min

            // Material Removal Rate (maximize)
            const ae = engagement * toolDiameter;
            const mrr = feedrate * ae * doc / 1000; // cm³/min

            // Tool life estimate (Taylor's equation)
            const toolLife = C / Math.pow(cuttingSpeed, 1/n);

            // Surface quality estimate (lower is better, so invert)
            const theoreticalRa = Math.pow(feedPerTooth, 2) / (8 * (tool.cornerRadius || 0.4));
            const qualityScore = 1 / (theoreticalRa + 0.001);

            // Constraints (penalize violations)
            let penalty = 0;

            // Feed per tooth limits
            if (feedPerTooth < 0.02) penalty += 1000;
            if (feedPerTooth > 0.3) penalty += 1000;

            // Cutting speed limits
            if (cuttingSpeed < 30) penalty += 500;
            if (cuttingSpeed > 400) penalty += 500;

            // Cutting force estimate
            const force = Kc * feedPerTooth * doc * ae;
            if (force > 5000) penalty += (force - 5000) * 0.1;

            // Weighted fitness
            const weights = options.weights || { mrr: 0.5, toolLife: 0.3, quality: 0.2 };
            const fitness =
                weights.mrr * mrr +
                weights.toolLife * Math.log(toolLife + 1) * 10 +
                weights.quality * qualityScore -
                penalty;

            return fitness;
        };
        // Run optimization
        const result = this.optimize(fitnessFunction, bounds, {
            swarmSize: options.swarmSize || 25,
            maxIterations: options.maxIterations || 50
        });

        if (result.success) {
            const optFeedrate = result.bestPosition[0];
            const optRpm = result.bestPosition[1];
            const feedPerTooth = optFeedrate / (optRpm * (tool.flutes || 4));
            const cuttingSpeed = Math.PI * toolDiameter * optRpm / 1000;

            return {
                success: true,
                feedrate: Math.round(optFeedrate),
                feedrateUnit: 'mm/min',
                spindleSpeed: Math.round(optRpm),
                spindleUnit: 'rpm',
                feedPerTooth: feedPerTooth.toFixed(4),
                cuttingSpeed: cuttingSpeed.toFixed(1),
                cuttingSpeedUnit: 'm/min',
                fitness: result.bestFitness,
                iterations: result.iterations,
                executionTime: result.executionTime
            };
        }
        return { success: false, error: 'Optimization failed' };
    },
    /**
     * Optimize engagement parameters (stepover, stepdown)
     * @param {Object} operation - Operation definition
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Options
     * @returns {Object} Optimized engagement parameters
     */
    optimizeEngagement: function(operation, tool, material, options = {}) {
        const toolDiameter = tool.diameter || 10;

        const bounds = [
            { min: 5, max: 80 },   // Stepover %
            { min: 0.1, max: Math.min(tool.fluteLength || 20, 10) }  // Stepdown mm
        ];

        const fitnessFunction = (params) => {
            const stepoverPercent = params[0];
            const stepdown = params[1];

            const stepover = stepoverPercent / 100 * toolDiameter;

            // Engagement angle
            const engagementAngle = Math.acos(1 - stepover / toolDiameter);

            // MRR
            const feedrate = options.feedrate || 1000;
            const mrr = feedrate * stepover * stepdown / 1000;

            // Tool deflection estimate (penalize high engagement)
            const deflectionRisk = Math.pow(stepdown / toolDiameter, 2) * engagementAngle;

            // Chip thinning factor
            const chipThinning = stepoverPercent < 50 ?
                1 / Math.sqrt(1 - Math.pow(1 - stepoverPercent/50, 2)) : 1;

            // Penalties
            let penalty = 0;

            // Engagement angle limit (HSM typically < 90°)
            if (engagementAngle > Math.PI / 2) penalty += 500;

            // Stepdown too aggressive
            if (stepdown > toolDiameter * 0.5) penalty += 300;

            // Fitness: balance MRR, tool life, and stability
            return mrr * 10 - deflectionRisk * 100 - chipThinning * 10 - penalty;
        };
        const result = this.optimize(fitnessFunction, bounds, {
            swarmSize: 20,
            maxIterations: 40
        });

        if (result.success) {
            const stepoverPercent = result.bestPosition[0];
            const stepdown = result.bestPosition[1];
            const stepover = stepoverPercent / 100 * toolDiameter;

            return {
                success: true,
                stepoverPercent: stepoverPercent.toFixed(1),
                stepover: stepover.toFixed(3),
                stepoverUnit: 'mm',
                stepdown: stepdown.toFixed(3),
                stepdownUnit: 'mm',
                engagementAngle: (Math.acos(1 - stepover / toolDiameter) * 180 / Math.PI).toFixed(1),
                engagementAngleUnit: 'degrees',
                fitness: result.bestFitness,
                executionTime: result.executionTime
            };
        }
        return { success: false };
    },
    /**
     * Optimize entire toolpath with varying feedrates per segment
     * @param {Array} segments - Array of toolpath segments
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Options
     * @returns {Object} Optimized toolpath with per-segment feedrates
     */
    optimizeToolpath: function(segments, tool, material, options = {}) {
        const startTime = performance.now();

        const optimizedSegments = [];
        let totalCycleTime = 0;
        let baselineCycleTime = 0;

        const defaultFeedrate = options.defaultFeedrate || 1000;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Calculate baseline time
            const segmentLength = segment.length || 10;
            baselineCycleTime += segmentLength / defaultFeedrate;

            // Optimize this segment
            const result = this.optimizeFeedrate(segment, tool, material, {
                ...options,
                maxIterations: 30  // Fewer iterations per segment for speed
            });

            if (result.success) {
                optimizedSegments.push({
                    ...segment,
                    optimizedFeedrate: result.feedrate,
                    optimizedRpm: result.spindleSpeed
                });
                totalCycleTime += segmentLength / result.feedrate;
            } else {
                optimizedSegments.push({
                    ...segment,
                    optimizedFeedrate: defaultFeedrate,
                    optimizedRpm: tool.defaultRpm || 6000
                });
                totalCycleTime += segmentLength / defaultFeedrate;
            }
        }
        const endTime = performance.now();
        const improvement = ((baselineCycleTime - totalCycleTime) / baselineCycleTime) * 100;

        return {
            success: true,
            segments: optimizedSegments,
            segmentCount: segments.length,
            baselineCycleTime: (baselineCycleTime * 60).toFixed(1) + 's',
            optimizedCycleTime: (totalCycleTime * 60).toFixed(1) + 's',
            improvement: improvement.toFixed(1) + '%',
            executionTime: (endTime - startTime).toFixed(2) + 'ms'
        };
    },
    /**
     * Multi-objective optimization: cycle time vs tool life vs quality
     * @param {Object} params - Operation parameters
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Options including objective weights
     * @returns {Object} Pareto front and recommended solution
     */
    optimizeMultiObjectiveCutting: function(params, tool, material, options = {}) {
        const toolDiameter = tool.diameter || 10;
        const Kc = material.specificCuttingForce || 2000;

        const bounds = [
            options.feedrateBounds || this.config.FEEDRATE_BOUNDS,
            options.spindleBounds || this.config.SPINDLE_BOUNDS,
            { min: 10, max: 70 }  // Stepover %
        ];

        // Objective 1: Maximize MRR (minimize cycle time)
        const mrrObjective = (pos) => {
            const feedrate = pos[0];
            const stepoverPercent = pos[2];
            const stepover = stepoverPercent / 100 * toolDiameter;
            const doc = params.doc || 1;
            return feedrate * stepover * doc / 1000;
        };
        // Objective 2: Maximize tool life
        const toolLifeObjective = (pos) => {
            const rpm = pos[1];
            const cuttingSpeed = Math.PI * toolDiameter * rpm / 1000;
            const C = material.taylorC || 200;
            const n = material.taylorN || 0.25;
            return Math.log(C / Math.pow(cuttingSpeed, 1/n) + 1);
        };
        // Objective 3: Maximize surface quality (minimize Ra)
        const qualityObjective = (pos) => {
            const feedrate = pos[0];
            const rpm = pos[1];
            const feedPerTooth = feedrate / (rpm * (tool.flutes || 4));
            const cornerRadius = tool.cornerRadius || 0.4;
            const Ra = Math.pow(feedPerTooth, 2) / (8 * cornerRadius);
            return 1 / (Ra + 0.001);  // Invert so higher is better
        };
        const result = this.optimizeMultiObjective(
            [mrrObjective, toolLifeObjective, qualityObjective],
            bounds,
            {
                swarmSize: options.swarmSize || 40,
                maxIterations: options.maxIterations || 80,
                weights: options.weights || [0.4, 0.35, 0.25]
            }
        );

        if (result.success && result.bestCompromise) {
            const best = result.bestCompromise;
            return {
                success: true,
                recommended: {
                    feedrate: Math.round(best.position[0]),
                    spindleSpeed: Math.round(best.position[1]),
                    stepoverPercent: best.position[2].toFixed(1)
                },
                objectives: {
                    mrr: best.objectives[0].toFixed(2),
                    toolLifeScore: best.objectives[1].toFixed(2),
                    qualityScore: best.objectives[2].toFixed(2)
                },
                paretoFront: result.paretoFront.map(sol => ({
                    feedrate: Math.round(sol.position[0]),
                    rpm: Math.round(sol.position[1]),
                    stepover: sol.position[2].toFixed(1),
                    objectives: sol.objectives
                })),
                paretoSize: result.paretoSize,
                executionTime: result.executionTime
            };
        }
        return { success: false };
    },
    // SECTION 5: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_PSO] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Simple function optimization (Sphere function)
        try {
            const sphereFunction = (pos) => {
                return -pos.reduce((sum, x) => sum + x * x, 0);  // Negative for maximization
            };
            const bounds = [
                { min: -10, max: 10 },
                { min: -10, max: 10 }
            ];

            const result = this.optimize(sphereFunction, bounds, { maxIterations: 50 });

            // Optimum should be near (0, 0)
            const dist = Math.sqrt(result.bestPosition[0]**2 + result.bestPosition[1]**2);
            const pass = dist < 1.0;

            results.tests.push({
                name: 'Sphere function optimization',
                pass,
                distance: dist.toFixed(4),
                position: result.bestPosition.map(x => x.toFixed(3))
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Sphere function', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Feedrate optimization
        try {
            const segment = { engagement: 0.4, doc: 2 };
            const tool = { diameter: 10, flutes: 4, cornerRadius: 0.5 };
            const material = { specificCuttingForce: 2000, taylorN: 0.25, taylorC: 200 };

            const result = this.optimizeFeedrate(segment, tool, material, { maxIterations: 30 });

            const pass = result.success &&
                         result.feedrate > 100 &&
                         result.spindleSpeed > 1000;

            results.tests.push({
                name: 'Feedrate optimization',
                pass,
                feedrate: result.feedrate,
                rpm: result.spindleSpeed
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Feedrate optimization', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Multi-objective optimization
        try {
            const obj1 = (pos) => -pos[0];  // Minimize x
            const obj2 = (pos) => -pos[1];  // Minimize y

            const bounds = [
                { min: 0, max: 10 },
                { min: 0, max: 10 }
            ];

            const result = this.optimizeMultiObjective([obj1, obj2], bounds, {
                swarmSize: 20,
                maxIterations: 30
            });

            const pass = result.success && result.paretoFront.length > 0;

            results.tests.push({
                name: 'Multi-objective optimization',
                pass,
                paretoSize: result.paretoSize
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Multi-objective', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Engagement optimization
        try {
            const operation = { type: 'pocket' };
            const tool = { diameter: 12, fluteLength: 25 };
            const material = { name: 'Aluminum' };

            const result = this.optimizeEngagement(operation, tool, material);

            const pass = result.success &&
                         parseFloat(result.stepoverPercent) > 0 &&
                         parseFloat(result.stepdown) > 0;

            results.tests.push({
                name: 'Engagement optimization',
                pass,
                stepover: result.stepoverPercent + '%',
                stepdown: result.stepdown + 'mm'
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Engagement optimization', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Convergence behavior
        try {
            let evaluations = 0;
            const trackingFunction = (pos) => {
                evaluations++;
                return -(pos[0] - 5)**2 - (pos[1] - 5)**2;
            };
            const bounds = [
                { min: 0, max: 10 },
                { min: 0, max: 10 }
            ];

            const result = this.optimize(trackingFunction, bounds, {
                swarmSize: 15,
                maxIterations: 100
            });

            const pass = result.converged || result.iterations < 100;

            results.tests.push({
                name: 'Convergence behavior',
                pass,
                converged: result.converged,
                iterations: result.iterations,
                evaluations: evaluations
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Convergence', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_PSO] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};
