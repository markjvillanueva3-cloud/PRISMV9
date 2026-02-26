// PRISM_ACO_SEQUENCER - Lines 753244-754001 (758 lines) - Ant Colony Optimization\n\nconst PRISM_ACO_SEQUENCER = {

    version: '1.0.0',
    authority: 'PRISM_ACO_SEQUENCER',
    created: '2026-01-14',
    innovationId: 'ACO_HOLE_SEQUENCING',

    // CONFIGURATION

    config: {
        // ACO Parameters
        DEFAULT_ANTS: 20,              // Number of ants per iteration
        DEFAULT_ITERATIONS: 100,       // Number of iterations
        DEFAULT_ALPHA: 1.0,            // Pheromone importance
        DEFAULT_BETA: 2.0,             // Heuristic (distance) importance
        DEFAULT_EVAPORATION: 0.5,      // Pheromone evaporation rate (0-1)
        DEFAULT_Q: 100,                // Pheromone deposit factor
        DEFAULT_INITIAL_PHEROMONE: 1.0,// Initial pheromone level

        // Elitist parameters
        ELITIST_WEIGHT: 2.0,           // Extra pheromone for best ant

        // Convergence
        CONVERGENCE_THRESHOLD: 0.001,  // Stop if improvement < this
        STAGNATION_LIMIT: 20,          // Iterations without improvement

        // Tool change penalties (in time units)
        TOOL_CHANGE_TIME: 15,          // Seconds per tool change
        SETUP_CHANGE_TIME: 300,        // Seconds per setup change

        // Performance
        MAX_FEATURES: 1000,            // Maximum features to optimize
        PARALLEL_THRESHOLD: 50         // Use parallel processing above this
    },
    // SECTION 1: CORE ACO ALGORITHM

    /**
     * Initialize pheromone matrix
     * @param {number} numNodes - Number of features/operations
     * @param {number} initialValue - Initial pheromone level
     * @returns {Array} 2D pheromone matrix
     */
    initializePheromones: function(numNodes, initialValue) {
        const init = initialValue || this.config.DEFAULT_INITIAL_PHEROMONE;
        const pheromones = [];

        for (let i = 0; i < numNodes; i++) {
            pheromones[i] = [];
            for (let j = 0; j < numNodes; j++) {
                pheromones[i][j] = (i === j) ? 0 : init;
            }
        }
        return pheromones;
    },
    /**
     * Calculate distance matrix from feature positions
     * @param {Array} features - Array of features with x, y, z positions
     * @returns {Array} 2D distance matrix
     */
    calculateDistanceMatrix: function(features) {
        const n = features.length;
        const distances = [];

        for (let i = 0; i < n; i++) {
            distances[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    distances[i][j] = Infinity; // Can't go to self
                } else {
                    const fi = features[i];
                    const fj = features[j];

                    // 3D Euclidean distance
                    const dx = (fj.x || 0) - (fi.x || 0);
                    const dy = (fj.y || 0) - (fi.y || 0);
                    const dz = (fj.z || 0) - (fi.z || 0);

                    distances[i][j] = Math.sqrt(dx*dx + dy*dy + dz*dz);
                }
            }
        }
        return distances;
    },
    /**
     * Calculate tool change matrix
     * @param {Array} features - Array of features with toolId
     * @returns {Array} 2D matrix of tool change penalties
     */
    calculateToolChangeMatrix: function(features) {
        const n = features.length;
        const matrix = [];

        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    const tool1 = features[i].toolId || features[i].tool;
                    const tool2 = features[j].toolId || features[j].tool;

                    // Add penalty if tool change required
                    matrix[i][j] = (tool1 !== tool2) ? this.config.TOOL_CHANGE_TIME : 0;
                }
            }
        }
        return matrix;
    },
    /**
     * Select next node using probability distribution
     * @param {number} currentNode - Current position
     * @param {Array} unvisited - Set of unvisited nodes
     * @param {Array} pheromones - Pheromone matrix
     * @param {Array} distances - Distance matrix
     * @param {Object} params - Alpha, beta parameters
     * @returns {number} Selected next node
     */
    selectNextNode: function(currentNode, unvisited, pheromones, distances, params = {}) {
        const alpha = params.alpha || this.config.DEFAULT_ALPHA;
        const beta = params.beta || this.config.DEFAULT_BETA;

        const probabilities = [];
        let total = 0;

        for (const node of unvisited) {
            const tau = Math.pow(pheromones[currentNode][node], alpha);
            const dist = distances[currentNode][node];
            const eta = dist > 0 ? Math.pow(1 / dist, beta) : 1;

            const probability = tau * eta;
            probabilities.push({ node, probability });
            total += probability;
        }
        // Handle edge case of zero total probability
        if (total <= 0) {
            return unvisited[Math.floor(Math.random() * unvisited.length)];
        }
        // Roulette wheel selection
        let random = Math.random() * total;

        for (const { node, probability } of probabilities) {
            random -= probability;
            if (random <= 0) {
                return node;
            }
        }
        // Fallback to last node
        return probabilities[probabilities.length - 1].node;
    },
    /**
     * Construct a complete tour for one ant
     * @param {number} startNode - Starting position (or -1 for best start)
     * @param {number} numNodes - Total number of nodes
     * @param {Array} pheromones - Pheromone matrix
     * @param {Array} distances - Distance matrix
     * @param {Object} params - Algorithm parameters
     * @returns {Object} Tour path and cost
     */
    constructTour: function(startNode, numNodes, pheromones, distances, params = {}) {
        // Initialize
        const path = [];
        const unvisited = new Set();

        for (let i = 0; i < numNodes; i++) {
            unvisited.add(i);
        }
        // Select start node
        let current;
        if (startNode >= 0 && startNode < numNodes) {
            current = startNode;
        } else {
            // Random start
            current = Math.floor(Math.random() * numNodes);
        }
        path.push(current);
        unvisited.delete(current);

        // Build tour
        while (unvisited.size > 0) {
            const next = this.selectNextNode(
                current,
                Array.from(unvisited),
                pheromones,
                distances,
                params
            );

            path.push(next);
            unvisited.delete(next);
            current = next;
        }
        // Calculate total cost
        const cost = this.calculatePathCost(path, distances);

        return { path, cost };
    },
    /**
     * Calculate total path cost
     * @param {Array} path - Sequence of node indices
     * @param {Array} distances - Distance matrix
     * @param {Array} toolChanges - Optional tool change matrix
     * @returns {number} Total cost
     */
    calculatePathCost: function(path, distances, toolChanges = null) {
        let cost = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];

            cost += distances[from][to];

            if (toolChanges) {
                cost += toolChanges[from][to];
            }
        }
        return cost;
    },
    /**
     * Update pheromone trails
     * @param {Array} pheromones - Pheromone matrix (modified in place)
     * @param {Array} tours - Array of tour objects { path, cost }
     * @param {Object} params - Evaporation rate, Q factor
     * @param {Object} bestTour - Best tour for elitist update
     */
    updatePheromones: function(pheromones, tours, params = {}, bestTour = null) {
        const evaporation = params.evaporation || this.config.DEFAULT_EVAPORATION;
        const Q = params.Q || this.config.DEFAULT_Q;
        const n = pheromones.length;

        // Evaporation
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                pheromones[i][j] *= (1 - evaporation);

                // Minimum pheromone level
                if (pheromones[i][j] < 0.001) {
                    pheromones[i][j] = 0.001;
                }
            }
        }
        // Deposit pheromones from all ants
        for (const tour of tours) {
            const deposit = Q / tour.cost;

            for (let i = 0; i < tour.path.length - 1; i++) {
                const from = tour.path[i];
                const to = tour.path[i + 1];

                pheromones[from][to] += deposit;
                pheromones[to][from] += deposit; // Symmetric
            }
        }
        // Elitist update - extra pheromone for best tour
        if (bestTour && bestTour.path) {
            const elitistDeposit = (Q / bestTour.cost) * this.config.ELITIST_WEIGHT;

            for (let i = 0; i < bestTour.path.length - 1; i++) {
                const from = bestTour.path[i];
                const to = bestTour.path[i + 1];

                pheromones[from][to] += elitistDeposit;
                pheromones[to][from] += elitistDeposit;
            }
        }
    },
    // SECTION 2: MAIN OPTIMIZATION FUNCTIONS

    /**
     * Optimize sequence of features/operations
     * @param {Array} features - Array of features with position { x, y, z }
     * @param {Object} options - Optimization parameters
     * @returns {Object} Optimized sequence and statistics
     */
    optimizeSequence: function(features, options = {}) {
        const startTime = performance.now();

        if (!features || features.length < 2) {
            return {
                success: true,
                sequence: features ? features.map((_, i) => i) : [],
                cost: 0,
                improvement: 0,
                iterations: 0,
                message: 'Trivial case - no optimization needed'
            };
        }
        const n = features.length;

        // Check size limit
        if (n > this.config.MAX_FEATURES) {
            console.warn(`[PRISM_ACO] Feature count ${n} exceeds limit ${this.config.MAX_FEATURES}`);
        }
        // Parameters
        const numAnts = options.numAnts || this.config.DEFAULT_ANTS;
        const iterations = options.iterations || this.config.DEFAULT_ITERATIONS;
        const alpha = options.alpha || this.config.DEFAULT_ALPHA;
        const beta = options.beta || this.config.DEFAULT_BETA;
        const evaporation = options.evaporation || this.config.DEFAULT_EVAPORATION;
        const startNode = options.startNode !== undefined ? options.startNode : -1;

        // Initialize
        const distances = this.calculateDistanceMatrix(features);
        const pheromones = this.initializePheromones(n);

        // Track best solution
        let bestTour = null;
        let bestCost = Infinity;

        // Calculate baseline (simple sequential)
        const baselinePath = features.map((_, i) => i);
        const baselineCost = this.calculatePathCost(baselinePath, distances);

        // Convergence tracking
        let stagnationCount = 0;
        let lastBestCost = Infinity;

        // Statistics
        const stats = {
            costHistory: [],
            improvementHistory: []
        };
        // Main ACO loop
        for (let iter = 0; iter < iterations; iter++) {
            const tours = [];

            // Each ant constructs a tour
            for (let ant = 0; ant < numAnts; ant++) {
                const tour = this.constructTour(
                    startNode,
                    n,
                    pheromones,
                    distances,
                    { alpha, beta }
                );

                tours.push(tour);

                // Update best
                if (tour.cost < bestCost) {
                    bestCost = tour.cost;
                    bestTour = { ...tour };
                }
            }
            // Update pheromones
            this.updatePheromones(
                pheromones,
                tours,
                { evaporation, Q: this.config.DEFAULT_Q },
                bestTour
            );

            // Track statistics
            stats.costHistory.push(bestCost);
            stats.improvementHistory.push(
                baselineCost > 0 ? ((baselineCost - bestCost) / baselineCost) * 100 : 0
            );

            // Check convergence
            if (Math.abs(lastBestCost - bestCost) < this.config.CONVERGENCE_THRESHOLD) {
                stagnationCount++;
                if (stagnationCount >= this.config.STAGNATION_LIMIT) {
                    console.log(`[PRISM_ACO] Converged at iteration ${iter}`);
                    break;
                }
            } else {
                stagnationCount = 0;
            }
            lastBestCost = bestCost;
        }
        const endTime = performance.now();
        const improvement = baselineCost > 0
            ? ((baselineCost - bestCost) / baselineCost) * 100
            : 0;

        return {
            success: true,
            sequence: bestTour.path,
            cost: bestCost,
            baselineCost: baselineCost,
            improvement: improvement.toFixed(2) + '%',
            improvementValue: improvement,
            iterations: stats.costHistory.length,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats,
            features: features,
            message: `Optimized ${n} features with ${improvement.toFixed(1)}% improvement`
        };
    },
    /**
     * Optimize hole drilling sequence (specialized for drilling)
     * @param {Array} holes - Array of hole positions { x, y, z, diameter, depth }
     * @param {Object} options - Optimization parameters
     * @returns {Object} Optimized sequence
     */
    optimizeHoleSequence: function(holes, options = {}) {
        // Add drilling-specific considerations
        const result = this.optimizeSequence(holes, {
            ...options,
            // Higher beta for drilling (distance more important)
            beta: options.beta || 3.0
        });

        // Calculate actual travel distance
        if (result.success && result.sequence) {
            let travelDistance = 0;
            for (let i = 0; i < result.sequence.length - 1; i++) {
                const from = holes[result.sequence[i]];
                const to = holes[result.sequence[i + 1]];

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                travelDistance += Math.sqrt(dx*dx + dy*dy);
            }
            result.travelDistance = travelDistance;
            result.travelDistanceUnit = 'mm';
        }
        return result;
    },
    /**
     * Optimize sequence considering tool changes
     * @param {Array} features - Features with toolId property
     * @param {Object} options - Optimization parameters
     * @returns {Object} Optimized sequence minimizing travel + tool changes
     */
    optimizeWithToolChanges: function(features, options = {}) {
        const startTime = performance.now();

        if (!features || features.length < 2) {
            return {
                success: true,
                sequence: features ? features.map((_, i) => i) : [],
                cost: 0,
                toolChanges: 0,
                message: 'Trivial case'
            };
        }
        const n = features.length;

        // Parameters
        const numAnts = options.numAnts || this.config.DEFAULT_ANTS;
        const iterations = options.iterations || this.config.DEFAULT_ITERATIONS;
        const toolChangePenalty = options.toolChangePenalty || this.config.TOOL_CHANGE_TIME;

        // Calculate matrices
        const distances = this.calculateDistanceMatrix(features);
        const toolChanges = this.calculateToolChangeMatrix(features);

        // Combine into cost matrix (distance + tool change penalty)
        const costMatrix = [];
        for (let i = 0; i < n; i++) {
            costMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                costMatrix[i][j] = distances[i][j] + toolChanges[i][j] * toolChangePenalty;
            }
        }
        // Run ACO with combined cost
        const pheromones = this.initializePheromones(n);
        let bestTour = null;
        let bestCost = Infinity;

        for (let iter = 0; iter < iterations; iter++) {
            const tours = [];

            for (let ant = 0; ant < numAnts; ant++) {
                const tour = this.constructTour(-1, n, pheromones, costMatrix, {
                    alpha: options.alpha || 1.0,
                    beta: options.beta || 2.0
                });

                tours.push(tour);

                if (tour.cost < bestCost) {
                    bestCost = tour.cost;
                    bestTour = { ...tour };
                }
            }
            this.updatePheromones(pheromones, tours, {
                evaporation: options.evaporation || 0.5
            }, bestTour);
        }
        // Count actual tool changes in best sequence
        let actualToolChanges = 0;
        for (let i = 0; i < bestTour.path.length - 1; i++) {
            if (toolChanges[bestTour.path[i]][bestTour.path[i + 1]] > 0) {
                actualToolChanges++;
            }
        }
        // Calculate pure travel distance
        const travelDistance = this.calculatePathCost(bestTour.path, distances);

        const endTime = performance.now();

        return {
            success: true,
            sequence: bestTour.path,
            totalCost: bestCost,
            travelDistance: travelDistance,
            toolChanges: actualToolChanges,
            toolChangeTime: actualToolChanges * toolChangePenalty,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            message: `Optimized ${n} features: ${actualToolChanges} tool changes, ${travelDistance.toFixed(1)}mm travel`
        };
    },
    // SECTION 3: UTILITY FUNCTIONS

    /**
     * Group features by tool for pre-sorting
     * @param {Array} features - Features with toolId
     * @returns {Object} Grouped features by tool
     */
    groupByTool: function(features) {
        const groups = {};

        features.forEach((feature, index) => {
            const toolId = feature.toolId || feature.tool || 'default';
            if (!groups[toolId]) {
                groups[toolId] = [];
            }
            groups[toolId].push({ ...feature, originalIndex: index });
        });

        return groups;
    },
    /**
     * Optimize within tool groups, then concatenate
     * @param {Array} features - Features with toolId
     * @param {Object} options - Options
     * @returns {Object} Optimized sequence
     */
    optimizeByToolGroups: function(features, options = {}) {
        const groups = this.groupByTool(features);
        const toolOrder = Object.keys(groups);

        let finalSequence = [];
        let totalCost = 0;

        // Optimize each tool group independently
        for (const toolId of toolOrder) {
            const groupFeatures = groups[toolId];

            if (groupFeatures.length > 1) {
                const result = this.optimizeSequence(groupFeatures, options);

                // Map back to original indices
                const originalIndices = result.sequence.map(i =>
                    groupFeatures[i].originalIndex
                );

                finalSequence.push(...originalIndices);
                totalCost += result.cost;
            } else {
                finalSequence.push(groupFeatures[0].originalIndex);
            }
        }
        return {
            success: true,
            sequence: finalSequence,
            cost: totalCost,
            toolGroups: toolOrder.length,
            message: `Optimized ${features.length} features in ${toolOrder.length} tool groups`
        };
    },
    /**
     * Apply optimized sequence to feature array
     * @param {Array} features - Original features
     * @param {Array} sequence - Optimized sequence indices
     * @returns {Array} Reordered features
     */
    applySequence: function(features, sequence) {
        return sequence.map(i => features[i]);
    },
    /**
     * Estimate time savings from optimization
     * @param {number} baselineCost - Original path cost (distance)
     * @param {number} optimizedCost - Optimized path cost
     * @param {number} rapidFeedrate - Machine rapid feedrate (mm/min)
     * @returns {Object} Time savings estimate
     */
    estimateTimeSavings: function(baselineCost, optimizedCost, rapidFeedrate = 10000) {
        const distanceSaved = baselineCost - optimizedCost;
        const timeSavedMinutes = distanceSaved / rapidFeedrate;
        const timeSavedSeconds = timeSavedMinutes * 60;

        return {
            distanceSaved: distanceSaved,
            distanceUnit: 'mm',
            timeSavedSeconds: timeSavedSeconds,
            timeSavedMinutes: timeSavedMinutes,
            percentImprovement: ((distanceSaved / baselineCost) * 100).toFixed(2) + '%'
        };
    },
    // SECTION 4: VISUALIZATION HELPERS

    /**
     * Generate path visualization data
     * @param {Array} features - Features with positions
     * @param {Array} sequence - Optimized sequence
     * @returns {Object} Visualization data for Three.js
     */
    generatePathVisualization: function(features, sequence) {
        const points = [];
        const lines = [];

        for (let i = 0; i < sequence.length; i++) {
            const feature = features[sequence[i]];
            points.push({
                x: feature.x || 0,
                y: feature.y || 0,
                z: feature.z || 0,
                index: sequence[i],
                order: i
            });

            if (i > 0) {
                const prev = features[sequence[i - 1]];
                lines.push({
                    from: { x: prev.x || 0, y: prev.y || 0, z: prev.z || 0 },
                    to: { x: feature.x || 0, y: feature.y || 0, z: feature.z || 0 },
                    order: i - 1
                });
            }
        }
        return { points, lines };
    },
    // SECTION 5: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_ACO] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Simple sequence optimization
        try {
            const features = [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
                { x: 50, y: 50 }
            ];

            const result = this.optimizeSequence(features, { iterations: 20 });
            const pass = result.success && result.sequence.length === 5;

            results.tests.push({
                name: 'Simple sequence optimization',
                pass,
                improvement: result.improvement
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Simple sequence optimization', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Hole sequence with known optimal
        try {
            // Line of holes - optimal is sequential
            const holes = [];
            for (let i = 0; i < 10; i++) {
                holes.push({ x: i * 10, y: 0, z: 0 });
            }
            const result = this.optimizeHoleSequence(holes, { iterations: 50 });

            // Check that it found a good path (should be close to sequential)
            const pass = result.success && result.cost < 100; // 90mm optimal

            results.tests.push({
                name: 'Hole sequence optimization',
                pass,
                cost: result.cost,
                optimal: 90
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Hole sequence optimization', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Tool change optimization
        try {
            const features = [
                { x: 0, y: 0, toolId: 'T1' },
                { x: 10, y: 0, toolId: 'T2' },
                { x: 20, y: 0, toolId: 'T1' },
                { x: 30, y: 0, toolId: 'T2' }
            ];

            const result = this.optimizeWithToolChanges(features, { iterations: 30 });

            // Should group by tool to minimize changes
            const pass = result.success && result.toolChanges <= 2;

            results.tests.push({
                name: 'Tool change optimization',
                pass,
                toolChanges: result.toolChanges
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Tool change optimization', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Large dataset performance
        try {
            const features = [];
            for (let i = 0; i < 100; i++) {
                features.push({
                    x: Math.random() * 500,
                    y: Math.random() * 500,
                    z: 0
                });
            }
            const startTime = performance.now();
            const result = this.optimizeSequence(features, { iterations: 30 });
            const endTime = performance.now();

            const pass = result.success && (endTime - startTime) < 5000; // Under 5 seconds

            results.tests.push({
                name: 'Large dataset (100 features)',
                pass,
                time: (endTime - startTime).toFixed(0) + 'ms',
                improvement: result.improvement
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Large dataset', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Pheromone update
        try {
            const pheromones = this.initializePheromones(5);
            const initialValue = pheromones[0][1];

            const tours = [
                { path: [0, 1, 2, 3, 4], cost: 100 },
                { path: [0, 2, 1, 3, 4], cost: 120 }
            ];

            this.updatePheromones(pheromones, tours, { evaporation: 0.5 });

            // Pheromone should have changed
            const pass = pheromones[0][1] !== initialValue;

            results.tests.push({
                name: 'Pheromone update',
                pass,
                before: initialValue,
                after: pheromones[0][1]
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Pheromone update', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_ACO] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};
