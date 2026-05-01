// PRISM_DIFFERENTIAL_EVOLUTION - Differential Evolution Optimizer
// Built from PRISM_CONSTANTS.AI + MIT 6.036 + Storn & Price 1997
// Source: Lines 19317 (gateway) + Storn & Price original paper

const PRISM_DIFFERENTIAL_EVOLUTION = {
    name: 'PRISM_DIFFERENTIAL_EVOLUTION',
    version: '1.0.0',
    authority: 'PRISM_DIFFERENTIAL_EVOLUTION',
    source: 'MIT 6.036, Storn & Price 1997',

    // CONFIGURATION
    config: {
        // DE Parameters
        POPULATION_SIZE: 50,
        MAX_GENERATIONS: 1000,
        F: 0.8,              // Differential weight (mutation factor)
        CR: 0.9,             // Crossover probability
        
        // Strategy selection
        DEFAULT_STRATEGY: 'rand1bin',
        
        // Convergence
        CONVERGENCE_THRESHOLD: 1e-8,
        STAGNATION_LIMIT: 100,
        
        // Manufacturing defaults
        FEEDRATE_BOUNDS: { min: 50, max: 5000 },
        SPINDLE_BOUNDS: { min: 500, max: 20000 },
        DOC_BOUNDS: { min: 0.1, max: 10 }
    },

    // SECTION 1: MUTATION STRATEGIES

    /**
     * DE/rand/1 - Random base vector with single difference
     */
    mutationRand1: function(population, targetIdx, F) {
        const n = population.length;
        let r1, r2, r3;
        do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
        do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
        do { r3 = Math.floor(Math.random() * n); } while (r3 === targetIdx || r3 === r1 || r3 === r2);
        
        const base = population[r1];
        const diff1 = population[r2];
        const diff2 = population[r3];
        
        return base.genes.map((g, i) => g + F * (diff1.genes[i] - diff2.genes[i]));
    },

    /**
     * DE/best/1 - Best vector as base with single difference
     */
    mutationBest1: function(population, targetIdx, F, best) {
        const n = population.length;
        let r1, r2;
        do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
        do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
        
        return best.genes.map((g, i) => g + F * (population[r1].genes[i] - population[r2].genes[i]));
    },

    /**
     * DE/rand/2 - Random base with two difference vectors
     */
    mutationRand2: function(population, targetIdx, F) {
        const n = population.length;
        const indices = new Set([targetIdx]);
        while (indices.size < 6) {
            indices.add(Math.floor(Math.random() * n));
        }
        const [_, r1, r2, r3, r4, r5] = Array.from(indices);
        
        return population[r1].genes.map((g, i) => 
            g + F * (population[r2].genes[i] - population[r3].genes[i]) +
            F * (population[r4].genes[i] - population[r5].genes[i])
        );
    },

    /**
     * DE/best/2 - Best vector with two difference vectors
     */
    mutationBest2: function(population, targetIdx, F, best) {
        const n = population.length;
        const indices = new Set([targetIdx]);
        while (indices.size < 5) {
            indices.add(Math.floor(Math.random() * n));
        }
        const [_, r1, r2, r3, r4] = Array.from(indices);
        
        return best.genes.map((g, i) => 
            g + F * (population[r1].genes[i] - population[r2].genes[i]) +
            F * (population[r3].genes[i] - population[r4].genes[i])
        );
    },

    /**
     * DE/current-to-best/1 - Current vector modified toward best
     */
    mutationCurrentToBest1: function(population, targetIdx, F, best) {
        const n = population.length;
        let r1, r2;
        do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
        do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
        
        const current = population[targetIdx];
        return current.genes.map((g, i) => 
            g + F * (best.genes[i] - g) + F * (population[r1].genes[i] - population[r2].genes[i])
        );
    },

    /**
     * DE/current-to-rand/1 - Rotation-invariant variant
     */
    mutationCurrentToRand1: function(population, targetIdx, F, K = 0.5) {
        const n = population.length;
        let r1, r2, r3;
        do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
        do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
        do { r3 = Math.floor(Math.random() * n); } while (r3 === targetIdx || r3 === r1 || r3 === r2);
        
        const current = population[targetIdx];
        return current.genes.map((g, i) => 
            g + K * (population[r1].genes[i] - g) + F * (population[r2].genes[i] - population[r3].genes[i])
        );
    },

    // SECTION 2: CROSSOVER OPERATORS

    /**
     * Binomial crossover
     */
    crossoverBinomial: function(target, donor, CR) {
        const dim = target.length;
        const jRand = Math.floor(Math.random() * dim);
        
        return target.map((t, j) => 
            (Math.random() < CR || j === jRand) ? donor[j] : t
        );
    },

    /**
     * Exponential crossover
     */
    crossoverExponential: function(target, donor, CR) {
        const dim = target.length;
        const trial = [...target];
        let j = Math.floor(Math.random() * dim);
        let L = 0;
        
        do {
            trial[j] = donor[j];
            j = (j + 1) % dim;
            L++;
        } while (Math.random() < CR && L < dim);
        
        return trial;
    },

    // SECTION 3: CORE DE ALGORITHM

    /**
     * Initialize population
     */
    initializePopulation: function(popSize, bounds) {
        const population = [];
        for (let i = 0; i < popSize; i++) {
            const genes = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            population.push({ genes: genes, fitness: -Infinity });
        }
        return population;
    },

    /**
     * Apply bounds to donor vector
     */
    applyBounds: function(donor, bounds) {
        return donor.map((d, i) => {
            if (d < bounds[i].min) {
                // Reflect from boundary
                return bounds[i].min + Math.abs(bounds[i].min - d) % (bounds[i].max - bounds[i].min);
            }
            if (d > bounds[i].max) {
                return bounds[i].max - Math.abs(d - bounds[i].max) % (bounds[i].max - bounds[i].min);
            }
            return d;
        });
    },

    /**
     * Main optimization function
     * @param {Function} fitnessFunction - Function(genes) => fitness (higher is better)
     * @param {Array} bounds - Array of {min, max} for each dimension
     * @param {Object} options - Optimization options
     * @returns {Object} Optimization result
     */
    optimize: function(fitnessFunction, bounds, options = {}) {
        const startTime = performance.now();
        
        const popSize = options.populationSize || this.config.POPULATION_SIZE;
        const maxGenerations = options.maxGenerations || this.config.MAX_GENERATIONS;
        const F = options.F || this.config.F;
        const CR = options.CR || this.config.CR;
        const strategy = options.strategy || this.config.DEFAULT_STRATEGY;
        const crossoverType = options.crossover || 'binomial';
        
        // Initialize population
        let population = this.initializePopulation(popSize, bounds);
        
        // Evaluate initial population
        for (const individual of population) {
            individual.fitness = fitnessFunction(individual.genes);
        }
        
        // Track best
        let best = population.reduce((a, b) => a.fitness > b.fitness ? a : b);
        best = { genes: [...best.genes], fitness: best.fitness };
        
        // Statistics
        const stats = {
            fitnessHistory: [best.fitness],
            convergenceGeneration: null
        };
        
        let stagnationCount = 0;
        let lastBestFitness = best.fitness;
        
        // Select mutation strategy
        const getMutant = (pop, idx, f, b) => {
            switch (strategy) {
                case 'best1': case 'best1bin': return this.mutationBest1(pop, idx, f, b);
                case 'rand2': case 'rand2bin': return this.mutationRand2(pop, idx, f);
                case 'best2': case 'best2bin': return this.mutationBest2(pop, idx, f, b);
                case 'currentToBest1': return this.mutationCurrentToBest1(pop, idx, f, b);
                case 'currentToRand1': return this.mutationCurrentToRand1(pop, idx, f);
                case 'rand1': case 'rand1bin':
                default: return this.mutationRand1(pop, idx, f);
            }
        };
        
        // Select crossover
        const crossover = crossoverType === 'exponential' 
            ? this.crossoverExponential.bind(this) 
            : this.crossoverBinomial.bind(this);
        
        // Evolution loop
        for (let gen = 0; gen < maxGenerations; gen++) {
            const newPopulation = [];
            
            for (let i = 0; i < popSize; i++) {
                // Mutation
                const mutant = getMutant(population, i, F, best);
                
                // Apply bounds
                const boundedMutant = this.applyBounds(mutant, bounds);
                
                // Crossover
                const trial = crossover(population[i].genes, boundedMutant, CR);
                
                // Evaluate trial
                const trialFitness = fitnessFunction(trial);
                
                // Selection (greedy)
                if (trialFitness >= population[i].fitness) {
                    newPopulation.push({ genes: trial, fitness: trialFitness });
                    
                    // Update best
                    if (trialFitness > best.fitness) {
                        best = { genes: [...trial], fitness: trialFitness };
                        stagnationCount = 0;
                    }
                } else {
                    newPopulation.push({ ...population[i], genes: [...population[i].genes] });
                }
            }
            
            population = newPopulation;
            stats.fitnessHistory.push(best.fitness);
            
            // Check convergence
            if (Math.abs(best.fitness - lastBestFitness) < this.config.CONVERGENCE_THRESHOLD) {
                stagnationCount++;
                if (stagnationCount >= this.config.STAGNATION_LIMIT) {
                    stats.convergenceGeneration = gen;
                    break;
                }
            }
            lastBestFitness = best.fitness;
        }
        
        const endTime = performance.now();
        
        return {
            success: true,
            bestGenes: best.genes,
            bestFitness: best.fitness,
            generations: stats.fitnessHistory.length - 1,
            converged: stats.convergenceGeneration !== null,
            convergenceGeneration: stats.convergenceGeneration,
            strategy: strategy,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats
        };
    },

    /**
     * Self-adaptive DE (jDE variant)
     */
    optimizeAdaptive: function(fitnessFunction, bounds, options = {}) {
        const startTime = performance.now();
        
        const popSize = options.populationSize || this.config.POPULATION_SIZE;
        const maxGenerations = options.maxGenerations || this.config.MAX_GENERATIONS;
        const tau1 = options.tau1 || 0.1;  // F adaptation probability
        const tau2 = options.tau2 || 0.1;  // CR adaptation probability
        
        // Initialize population with individual F and CR
        let population = [];
        for (let i = 0; i < popSize; i++) {
            const genes = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            population.push({
                genes: genes,
                fitness: -Infinity,
                F: 0.5 + Math.random() * 0.5,
                CR: Math.random()
            });
        }
        
        // Evaluate
        for (const ind of population) {
            ind.fitness = fitnessFunction(ind.genes);
        }
        
        let best = population.reduce((a, b) => a.fitness > b.fitness ? a : b);
        best = { ...best, genes: [...best.genes] };
        
        const stats = { fitnessHistory: [best.fitness] };
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            const newPopulation = [];
            
            for (let i = 0; i < popSize; i++) {
                // Adapt F
                let F = population[i].F;
                if (Math.random() < tau1) {
                    F = 0.1 + Math.random() * 0.9;
                }
                
                // Adapt CR
                let CR = population[i].CR;
                if (Math.random() < tau2) {
                    CR = Math.random();
                }
                
                // Mutation (rand/1)
                const mutant = this.mutationRand1(population, i, F);
                const boundedMutant = this.applyBounds(mutant, bounds);
                
                // Crossover
                const trial = this.crossoverBinomial(population[i].genes, boundedMutant, CR);
                const trialFitness = fitnessFunction(trial);
                
                // Selection
                if (trialFitness >= population[i].fitness) {
                    newPopulation.push({ genes: trial, fitness: trialFitness, F, CR });
                    if (trialFitness > best.fitness) {
                        best = { genes: [...trial], fitness: trialFitness, F, CR };
                    }
                } else {
                    newPopulation.push({ ...population[i], genes: [...population[i].genes] });
                }
            }
            
            population = newPopulation;
            stats.fitnessHistory.push(best.fitness);
        }
        
        const endTime = performance.now();
        
        return {
            success: true,
            bestGenes: best.genes,
            bestFitness: best.fitness,
            adaptedF: best.F,
            adaptedCR: best.CR,
            generations: stats.fitnessHistory.length - 1,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats
        };
    },

    // SECTION 4: MANUFACTURING OPTIMIZATION

    /**
     * Optimize cutting parameters
     */
    optimizeCuttingParams: function(operation, tool, material, options = {}) {
        const toolDiameter = tool.diameter || 10;
        const Kc = material.specificCuttingForce || 2000;
        
        const bounds = [
            options.feedrateBounds || this.config.FEEDRATE_BOUNDS,
            options.spindleBounds || this.config.SPINDLE_BOUNDS,
            options.docBounds || this.config.DOC_BOUNDS
        ];
        
        const fitnessFunction = (genes) => {
            const feedrate = genes[0];
            const rpm = genes[1];
            const doc = genes[2];
            
            const feedPerTooth = feedrate / (rpm * (tool.flutes || 4));
            const cuttingSpeed = Math.PI * toolDiameter * rpm / 1000;
            const ae = (operation.stepover || 0.5) * toolDiameter;
            
            // MRR
            const mrr = feedrate * ae * doc / 1000;
            
            // Tool life
            const C = material.taylorC || 200;
            const n = material.taylorN || 0.25;
            const toolLife = C / Math.pow(cuttingSpeed, 1/n);
            
            // Constraints
            let penalty = 0;
            if (feedPerTooth < 0.02 || feedPerTooth > 0.3) penalty += 500;
            if (cuttingSpeed < 30 || cuttingSpeed > 400) penalty += 300;
            if (doc > (tool.fluteLength || 20) * 0.5) penalty += 200;
            
            const weights = options.weights || { mrr: 0.5, toolLife: 0.3, quality: 0.2 };
            const Ra = Math.pow(feedPerTooth, 2) / (8 * (tool.cornerRadius || 0.4));
            
            return weights.mrr * mrr + 
                   weights.toolLife * Math.log(toolLife + 1) * 10 + 
                   weights.quality / (Ra + 0.001) - penalty;
        };
        
        const result = this.optimize(fitnessFunction, bounds, {
            populationSize: options.populationSize || 30,
            maxGenerations: options.maxGenerations || 200,
            strategy: 'currentToBest1'
        });
        
        if (result.success) {
            const feedrate = result.bestGenes[0];
            const rpm = result.bestGenes[1];
            const doc = result.bestGenes[2];
            
            return {
                success: true,
                feedrate: Math.round(feedrate),
                spindleSpeed: Math.round(rpm),
                depthOfCut: doc.toFixed(3),
                feedPerTooth: (feedrate / (rpm * (tool.flutes || 4))).toFixed(4),
                cuttingSpeed: (Math.PI * toolDiameter * rpm / 1000).toFixed(1),
                fitness: result.bestFitness,
                generations: result.generations,
                strategy: result.strategy,
                executionTime: result.executionTime
            };
        }
        
        return { success: false, error: 'Optimization failed' };
    },

    // SECTION 5: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_DE] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Sphere function
        try {
            const sphereFunction = (genes) => -genes.reduce((s, g) => s + g * g, 0);
            const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];
            
            const result = this.optimize(sphereFunction, bounds, {
                populationSize: 30,
                maxGenerations: 100
            });
            
            const dist = Math.sqrt(result.bestGenes[0]**2 + result.bestGenes[1]**2);
            const pass = dist < 1.0;
            
            results.tests.push({
                name: 'Sphere function',
                pass,
                distance: dist.toFixed(4),
                strategy: result.strategy
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Sphere function', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: Different strategies
        try {
            const rastrigin = (genes) => {
                const A = 10;
                let sum = A * genes.length;
                for (const g of genes) {
                    sum += g * g - A * Math.cos(2 * Math.PI * g);
                }
                return -sum;  // Negate for maximization
            };
            const bounds = Array(5).fill({ min: -5.12, max: 5.12 });
            
            const strategies = ['rand1bin', 'best1bin', 'currentToBest1'];
            const strategyResults = {};
            
            for (const strat of strategies) {
                const result = this.optimize(rastrigin, bounds, {
                    populationSize: 40,
                    maxGenerations: 100,
                    strategy: strat
                });
                strategyResults[strat] = result.bestFitness;
            }
            
            const pass = Object.values(strategyResults).every(f => f > -50);
            
            results.tests.push({
                name: 'Strategy comparison',
                pass,
                results: Object.fromEntries(
                    Object.entries(strategyResults).map(([k, v]) => [k, v.toFixed(2)])
                )
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Strategy comparison', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: Adaptive DE
        try {
            const ackley = (genes) => {
                const n = genes.length;
                const sum1 = genes.reduce((s, g) => s + g * g, 0);
                const sum2 = genes.reduce((s, g) => s + Math.cos(2 * Math.PI * g), 0);
                return -(
                    -20 * Math.exp(-0.2 * Math.sqrt(sum1 / n)) -
                    Math.exp(sum2 / n) + 20 + Math.E
                );
            };
            const bounds = Array(10).fill({ min: -5, max: 5 });
            
            const result = this.optimizeAdaptive(ackley, bounds, {
                populationSize: 50,
                maxGenerations: 200
            });
            
            const pass = result.bestFitness > -5;
            
            results.tests.push({
                name: 'Adaptive DE (jDE)',
                pass,
                fitness: result.bestFitness.toFixed(4),
                adaptedF: result.adaptedF.toFixed(3),
                adaptedCR: result.adaptedCR.toFixed(3)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Adaptive DE', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: Manufacturing optimization
        try {
            const operation = { stepover: 0.4 };
            const tool = { diameter: 10, flutes: 4, cornerRadius: 0.5, fluteLength: 20 };
            const material = { specificCuttingForce: 2000, taylorN: 0.25, taylorC: 200 };
            
            const result = this.optimizeCuttingParams(operation, tool, material, {
                maxGenerations: 100
            });
            
            const pass = result.success && result.feedrate > 100 && result.spindleSpeed > 1000;
            
            results.tests.push({
                name: 'Cutting parameters',
                pass,
                feedrate: result.feedrate,
                rpm: result.spindleSpeed,
                doc: result.depthOfCut
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cutting parameters', pass: false, error: e.message });
            results.failed++;
        }
        
        console.log(`[PRISM_DE] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};

// Export
if (typeof window !== 'undefined') window.PRISM_DIFFERENTIAL_EVOLUTION = PRISM_DIFFERENTIAL_EVOLUTION;
if (typeof module !== 'undefined') module.exports = PRISM_DIFFERENTIAL_EVOLUTION;
