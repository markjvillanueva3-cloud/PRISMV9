// PRISM_SIMULATED_ANNEALING - Simulated Annealing Optimizer
// Built from PRISM_CONSTANTS.AI + MIT 6.034 AI course
// Source: Lines 7837-7841 (config) + 19316 (gateway) + Kirkpatrick et al. (1983)

const PRISM_SIMULATED_ANNEALING = {
    name: 'PRISM_SIMULATED_ANNEALING',
    version: '1.0.0',
    authority: 'PRISM_SIMULATED_ANNEALING',
    source: 'MIT 6.034, Kirkpatrick (1983)',

    // CONFIGURATION
    config: {
        // Temperature schedule
        INITIAL_TEMP: 1000,
        FINAL_TEMP: 0.001,
        COOLING_RATE: 0.95,        // Geometric cooling
        
        // Iterations
        MAX_ITERATIONS: 10000,
        ITERATIONS_PER_TEMP: 100,  // Markov chain length
        
        // Convergence
        CONVERGENCE_THRESHOLD: 1e-8,
        STAGNATION_LIMIT: 500,
        
        // Reheating
        REHEAT_ENABLED: true,
        REHEAT_THRESHOLD: 200,     // Stagnation before reheat
        REHEAT_FACTOR: 2.0,
        
        // Neighbor generation
        NEIGHBOR_SIGMA: 0.1,       // Step size as ratio of range
        
        // Manufacturing defaults
        FEEDRATE_BOUNDS: { min: 50, max: 5000 },
        SPINDLE_BOUNDS: { min: 500, max: 20000 },
        DOC_BOUNDS: { min: 0.1, max: 10 }
    },

    // SECTION 1: CORE ALGORITHM

    /**
     * Generate neighbor solution
     * @param {Array} current - Current solution
     * @param {Array} bounds - Solution bounds
     * @param {number} temperature - Current temperature (affects step size)
     * @returns {Array} Neighbor solution
     */
    generateNeighbor: function(current, bounds, temperature) {
        const neighbor = [];
        const adaptiveSigma = this.config.NEIGHBOR_SIGMA * Math.sqrt(temperature / this.config.INITIAL_TEMP);
        
        for (let i = 0; i < current.length; i++) {
            const range = bounds[i].max - bounds[i].min;
            // Gaussian perturbation
            const perturbation = (Math.random() * 2 - 1) * adaptiveSigma * range;
            let newVal = current[i] + perturbation;
            
            // Boundary handling (reflection)
            if (newVal < bounds[i].min) {
                newVal = bounds[i].min + Math.abs(bounds[i].min - newVal);
            }
            if (newVal > bounds[i].max) {
                newVal = bounds[i].max - Math.abs(newVal - bounds[i].max);
            }
            
            // Final clamp
            newVal = Math.max(bounds[i].min, Math.min(bounds[i].max, newVal));
            neighbor.push(newVal);
        }
        
        return neighbor;
    },

    /**
     * Metropolis acceptance criterion
     * @param {number} currentEnergy - Current solution energy (negative fitness)
     * @param {number} newEnergy - New solution energy
     * @param {number} temperature - Current temperature
     * @returns {boolean} Whether to accept the new solution
     */
    acceptanceProbability: function(currentEnergy, newEnergy, temperature) {
        // Lower energy is better (we negate fitness)
        if (newEnergy < currentEnergy) {
            return true;  // Always accept improvements
        }
        
        // Accept worse solutions with probability exp(-ΔE/T)
        const delta = newEnergy - currentEnergy;
        const probability = Math.exp(-delta / temperature);
        return Math.random() < probability;
    },

    /**
     * Cooling schedules
     */
    coolingSchedules: {
        geometric: function(temp, rate) {
            return temp * rate;
        },
        linear: function(temp, rate, initialTemp, iteration, maxIterations) {
            return initialTemp * (1 - iteration / maxIterations);
        },
        logarithmic: function(temp, initialTemp, iteration) {
            return initialTemp / Math.log(iteration + 2);
        },
        exponential: function(temp, rate, iteration) {
            return temp * Math.pow(rate, iteration);
        },
        adaptive: function(temp, acceptanceRate, targetRate = 0.3) {
            // Adjust based on acceptance rate
            if (acceptanceRate > targetRate) {
                return temp * 0.9;  // Cool faster if accepting too much
            } else {
                return temp * 0.99; // Cool slower if rejecting too much
            }
        }
    },

    /**
     * Main optimization function
     * @param {Function} fitnessFunction - Function(solution) => fitness (higher is better)
     * @param {Array} bounds - Array of {min, max} for each dimension
     * @param {Object} options - Optimization options
     * @returns {Object} Optimization result
     */
    optimize: function(fitnessFunction, bounds, options = {}) {
        const startTime = performance.now();
        
        const initialTemp = options.initialTemp || this.config.INITIAL_TEMP;
        const finalTemp = options.finalTemp || this.config.FINAL_TEMP;
        const coolingRate = options.coolingRate || this.config.COOLING_RATE;
        const maxIterations = options.maxIterations || this.config.MAX_ITERATIONS;
        const iterationsPerTemp = options.iterationsPerTemp || this.config.ITERATIONS_PER_TEMP;
        const coolingSchedule = options.coolingSchedule || 'geometric';
        const reheatEnabled = options.reheatEnabled !== false && this.config.REHEAT_ENABLED;
        
        // Initialize solution
        let current = options.initialSolution || bounds.map(b => 
            b.min + Math.random() * (b.max - b.min)
        );
        let currentFitness = fitnessFunction(current);
        let currentEnergy = -currentFitness;  // SA minimizes energy
        
        // Track best
        let best = [...current];
        let bestFitness = currentFitness;
        let bestEnergy = currentEnergy;
        
        // State
        let temperature = initialTemp;
        let iteration = 0;
        let stagnationCount = 0;
        let totalAccepted = 0;
        let totalRejected = 0;
        let reheats = 0;
        
        // Statistics
        const stats = {
            fitnessHistory: [bestFitness],
            temperatureHistory: [temperature],
            acceptanceHistory: []
        };
        
        // Main SA loop
        while (temperature > finalTemp && iteration < maxIterations) {
            let acceptedThisTemp = 0;
            
            // Markov chain at current temperature
            for (let i = 0; i < iterationsPerTemp && iteration < maxIterations; i++) {
                iteration++;
                
                // Generate neighbor
                const neighbor = this.generateNeighbor(current, bounds, temperature);
                const neighborFitness = fitnessFunction(neighbor);
                const neighborEnergy = -neighborFitness;
                
                // Acceptance decision
                if (this.acceptanceProbability(currentEnergy, neighborEnergy, temperature)) {
                    current = neighbor;
                    currentFitness = neighborFitness;
                    currentEnergy = neighborEnergy;
                    acceptedThisTemp++;
                    totalAccepted++;
                    
                    // Update best if improved
                    if (currentFitness > bestFitness) {
                        best = [...current];
                        bestFitness = currentFitness;
                        bestEnergy = currentEnergy;
                        stagnationCount = 0;
                    } else {
                        stagnationCount++;
                    }
                } else {
                    totalRejected++;
                    stagnationCount++;
                }
            }
            
            // Track acceptance rate
            const acceptanceRate = acceptedThisTemp / iterationsPerTemp;
            stats.acceptanceHistory.push(acceptanceRate);
            
            // Cooling
            switch (coolingSchedule) {
                case 'linear':
                    temperature = this.coolingSchedules.linear(
                        temperature, coolingRate, initialTemp, iteration, maxIterations
                    );
                    break;
                case 'logarithmic':
                    temperature = this.coolingSchedules.logarithmic(temperature, initialTemp, iteration);
                    break;
                case 'adaptive':
                    temperature = this.coolingSchedules.adaptive(temperature, acceptanceRate);
                    break;
                case 'geometric':
                default:
                    temperature = this.coolingSchedules.geometric(temperature, coolingRate);
            }
            
            // Reheating if stuck
            if (reheatEnabled && stagnationCount > this.config.REHEAT_THRESHOLD) {
                temperature = Math.min(temperature * this.config.REHEAT_FACTOR, initialTemp * 0.5);
                stagnationCount = 0;
                reheats++;
            }
            
            stats.fitnessHistory.push(bestFitness);
            stats.temperatureHistory.push(temperature);
        }
        
        const endTime = performance.now();
        
        return {
            success: true,
            bestSolution: best,
            bestFitness: bestFitness,
            iterations: iteration,
            finalTemperature: temperature,
            acceptanceRate: (totalAccepted / (totalAccepted + totalRejected)).toFixed(4),
            reheats: reheats,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats
        };
    },

    /**
     * Batch annealing - multiple runs with different initial solutions
     * @param {Function} fitnessFunction - Fitness function
     * @param {Array} bounds - Solution bounds
     * @param {Object} options - Options including numRuns
     * @returns {Object} Best result from all runs
     */
    batchOptimize: function(fitnessFunction, bounds, options = {}) {
        const numRuns = options.numRuns || 5;
        const results = [];
        
        for (let run = 0; run < numRuns; run++) {
            const result = this.optimize(fitnessFunction, bounds, {
                ...options,
                initialSolution: null  // Random initialization each run
            });
            results.push(result);
        }
        
        // Find best
        results.sort((a, b) => b.bestFitness - a.bestFitness);
        
        return {
            best: results[0],
            allResults: results.map(r => ({
                fitness: r.bestFitness,
                iterations: r.iterations
            })),
            numRuns: numRuns
        };
    },

    // SECTION 2: MANUFACTURING OPTIMIZATION

    /**
     * Optimize cutting parameters
     * @param {Object} operation - Operation definition
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Options
     * @returns {Object} Optimized parameters
     */
    optimizeCuttingParams: function(operation, tool, material, options = {}) {
        const toolDiameter = tool.diameter || 10;
        const Kc = material.specificCuttingForce || 2000;
        
        const bounds = [
            options.feedrateBounds || this.config.FEEDRATE_BOUNDS,
            options.spindleBounds || this.config.SPINDLE_BOUNDS,
            options.docBounds || this.config.DOC_BOUNDS
        ];
        
        const fitnessFunction = (solution) => {
            const feedrate = solution[0];
            const rpm = solution[1];
            const doc = solution[2];
            
            const feedPerTooth = feedrate / (rpm * (tool.flutes || 4));
            const cuttingSpeed = Math.PI * toolDiameter * rpm / 1000;
            const ae = (operation.stepover || 0.5) * toolDiameter;
            
            // MRR
            const mrr = feedrate * ae * doc / 1000;
            
            // Tool life
            const C = material.taylorC || 200;
            const n = material.taylorN || 0.25;
            const toolLife = C / Math.pow(cuttingSpeed, 1/n);
            
            // Surface quality
            const Ra = Math.pow(feedPerTooth, 2) / (8 * (tool.cornerRadius || 0.4));
            
            // Constraints
            let penalty = 0;
            if (feedPerTooth < 0.02 || feedPerTooth > 0.3) penalty += 500;
            if (cuttingSpeed < 30 || cuttingSpeed > 400) penalty += 300;
            if (doc > tool.fluteLength * 0.5) penalty += 200;
            
            const weights = options.weights || { mrr: 0.5, toolLife: 0.3, quality: 0.2 };
            return weights.mrr * mrr + 
                   weights.toolLife * Math.log(toolLife + 1) * 10 + 
                   weights.quality / (Ra + 0.001) - penalty;
        };
        
        const result = this.optimize(fitnessFunction, bounds, {
            initialTemp: 500,
            maxIterations: options.maxIterations || 3000,
            iterationsPerTemp: 50
        });
        
        if (result.success) {
            const feedrate = result.bestSolution[0];
            const rpm = result.bestSolution[1];
            const doc = result.bestSolution[2];
            
            return {
                success: true,
                feedrate: Math.round(feedrate),
                spindleSpeed: Math.round(rpm),
                depthOfCut: doc.toFixed(3),
                feedPerTooth: (feedrate / (rpm * (tool.flutes || 4))).toFixed(4),
                cuttingSpeed: (Math.PI * toolDiameter * rpm / 1000).toFixed(1),
                fitness: result.bestFitness,
                iterations: result.iterations,
                acceptanceRate: result.acceptanceRate,
                executionTime: result.executionTime
            };
        }
        
        return { success: false, error: 'Optimization failed' };
    },

    /**
     * Optimize tool sequence (TSP-like problem)
     * @param {Array} operations - Array of operations with positions
     * @param {Object} options - Options
     * @returns {Object} Optimized sequence
     */
    optimizeToolSequence: function(operations, options = {}) {
        const n = operations.length;
        if (n < 2) return { success: true, sequence: [0], distance: 0 };
        
        // Distance matrix
        const distance = (i, j) => {
            const op1 = operations[i];
            const op2 = operations[j];
            const dx = (op2.x || 0) - (op1.x || 0);
            const dy = (op2.y || 0) - (op1.y || 0);
            const dz = (op2.z || 0) - (op1.z || 0);
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        };
        
        // Total route distance
        const routeDistance = (route) => {
            let total = 0;
            for (let i = 0; i < route.length - 1; i++) {
                total += distance(route[i], route[i+1]);
            }
            return total;
        };
        
        // Neighbor: 2-opt swap
        const generateNeighborSequence = (route) => {
            const newRoute = [...route];
            const i = Math.floor(Math.random() * (n - 1)) + 1;
            const j = Math.floor(Math.random() * (n - i)) + i;
            
            // Reverse segment between i and j
            while (i < j) {
                [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
                i++; j--;
            }
            
            return newRoute;
        };
        
        // Initialize with greedy nearest neighbor
        let current = [0];
        const remaining = new Set([...Array(n).keys()].slice(1));
        while (remaining.size > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const r of remaining) {
                const d = distance(current[current.length - 1], r);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = r;
                }
            }
            current.push(nearest);
            remaining.delete(nearest);
        }
        
        let currentDist = routeDistance(current);
        let best = [...current];
        let bestDist = currentDist;
        
        // SA for sequence
        let temperature = options.initialTemp || 100 * n;
        const finalTemp = 0.1;
        const coolingRate = 0.995;
        
        for (let iter = 0; iter < (options.maxIterations || 5000); iter++) {
            const neighbor = generateNeighborSequence(current);
            const neighborDist = routeDistance(neighbor);
            
            const delta = neighborDist - currentDist;
            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                current = neighbor;
                currentDist = neighborDist;
                
                if (currentDist < bestDist) {
                    best = [...current];
                    bestDist = currentDist;
                }
            }
            
            temperature *= coolingRate;
            if (temperature < finalTemp) break;
        }
        
        return {
            success: true,
            sequence: best,
            distance: bestDist.toFixed(2),
            improvement: ((routeDistance([...Array(n).keys()]) - bestDist) / 
                         routeDistance([...Array(n).keys()]) * 100).toFixed(1) + '%'
        };
    },

    // SECTION 3: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_SA] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Sphere function
        try {
            const sphereFunction = (sol) => -sol.reduce((s, x) => s + x * x, 0);
            const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];
            
            const result = this.optimize(sphereFunction, bounds, {
                initialTemp: 100,
                maxIterations: 2000
            });
            
            const dist = Math.sqrt(result.bestSolution[0]**2 + result.bestSolution[1]**2);
            const pass = dist < 2.0;
            
            results.tests.push({
                name: 'Sphere function',
                pass,
                distance: dist.toFixed(4),
                acceptanceRate: result.acceptanceRate
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Sphere function', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: Cooling schedules
        try {
            const temp = 100;
            const geo = this.coolingSchedules.geometric(temp, 0.95);
            const lin = this.coolingSchedules.linear(temp, 0.95, 100, 50, 100);
            const log = this.coolingSchedules.logarithmic(temp, 100, 10);
            
            const pass = geo < temp && lin < temp && log < temp;
            
            results.tests.push({
                name: 'Cooling schedules',
                pass,
                geometric: geo.toFixed(2),
                linear: lin.toFixed(2),
                logarithmic: log.toFixed(2)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cooling schedules', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: Manufacturing optimization
        try {
            const operation = { stepover: 0.4 };
            const tool = { diameter: 10, flutes: 4, cornerRadius: 0.5, fluteLength: 20 };
            const material = { specificCuttingForce: 2000, taylorN: 0.25, taylorC: 200 };
            
            const result = this.optimizeCuttingParams(operation, tool, material, {
                maxIterations: 1500
            });
            
            const pass = result.success && result.feedrate > 100 && result.spindleSpeed > 1000;
            
            results.tests.push({
                name: 'Cutting parameters',
                pass,
                feedrate: result.feedrate,
                rpm: result.spindleSpeed
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cutting parameters', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: Sequence optimization
        try {
            const operations = [
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 0, z: 0 },
                { x: 10, y: 10, z: 0 },
                { x: 0, y: 10, z: 0 },
                { x: 5, y: 5, z: 0 }
            ];
            
            const result = this.optimizeToolSequence(operations, { maxIterations: 1000 });
            
            const pass = result.success && result.sequence.length === 5;
            
            results.tests.push({
                name: 'Sequence optimization',
                pass,
                distance: result.distance,
                improvement: result.improvement
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Sequence optimization', pass: false, error: e.message });
            results.failed++;
        }
        
        console.log(`[PRISM_SA] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};

// Export
if (typeof window !== 'undefined') window.PRISM_SIMULATED_ANNEALING = PRISM_SIMULATED_ANNEALING;
if (typeof module !== 'undefined') module.exports = PRISM_SIMULATED_ANNEALING;
