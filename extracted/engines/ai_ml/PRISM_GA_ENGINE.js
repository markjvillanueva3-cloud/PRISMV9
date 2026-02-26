// PRISM_GA_ENGINE - Genetic Algorithm Optimizer
// Built from PRISM_CONSTANTS.AI parameters + MIT 6.034 AI course
// Source: Lines 7827-7833 (config) + 19312 (gateway) + MIT/Stanford AI courses
// Mirrors PRISM_PSO_OPTIMIZER structure for consistency

const PRISM_GA_ENGINE = {
    name: 'PRISM_GA_ENGINE',
    version: '1.0.0',
    authority: 'PRISM_GA_ENGINE',
    source: 'MIT 6.034, Stanford CS 221',

    // CONFIGURATION (from PRISM_CONSTANTS.AI)
    config: {
        MAX_POPULATION: 200,
        MAX_GENERATIONS: 100,
        MUTATION_RATE: 0.01,
        CROSSOVER_RATE: 0.8,
        ELITE_RATIO: 0.1,
        TOURNAMENT_SIZE: 3,
        
        // Convergence
        CONVERGENCE_THRESHOLD: 1e-6,
        STAGNATION_LIMIT: 20,
        
        // Manufacturing defaults
        FEEDRATE_BOUNDS: { min: 50, max: 5000 },
        SPINDLE_BOUNDS: { min: 500, max: 20000 },
        DOC_BOUNDS: { min: 0.1, max: 10 },
        STEPOVER_BOUNDS: { min: 5, max: 80 }
    },

    // SECTION 1: CHROMOSOME OPERATIONS

    /**
     * Create a random chromosome (individual)
     * @param {Array} bounds - Array of {min, max} for each gene
     * @returns {Object} Individual with genes and fitness
     */
    createIndividual: function(bounds) {
        const genes = bounds.map(b => b.min + Math.random() * (b.max - b.min));
        return {
            genes: genes,
            fitness: -Infinity
        };
    },

    /**
     * Initialize population
     * @param {number} popSize - Population size
     * @param {Array} bounds - Bounds for each gene
     * @returns {Array} Population of individuals
     */
    initializePopulation: function(popSize, bounds) {
        const population = [];
        for (let i = 0; i < popSize; i++) {
            population.push(this.createIndividual(bounds));
        }
        return population;
    },

    /**
     * Tournament selection
     * @param {Array} population - Current population
     * @param {number} tournamentSize - Number of contestants
     * @returns {Object} Selected individual
     */
    tournamentSelection: function(population, tournamentSize = this.config.TOURNAMENT_SIZE) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            const contestant = population[idx];
            if (!best || contestant.fitness > best.fitness) {
                best = contestant;
            }
        }
        return { ...best, genes: [...best.genes] };
    },

    /**
     * Roulette wheel selection (fitness proportionate)
     * @param {Array} population - Current population (fitness must be positive)
     * @returns {Object} Selected individual
     */
    rouletteSelection: function(population) {
        // Shift fitness to ensure positive values
        const minFitness = Math.min(...population.map(p => p.fitness));
        const shift = minFitness < 0 ? -minFitness + 1 : 0;
        
        const totalFitness = population.reduce((sum, p) => sum + p.fitness + shift, 0);
        let spin = Math.random() * totalFitness;
        
        for (const individual of population) {
            spin -= (individual.fitness + shift);
            if (spin <= 0) {
                return { ...individual, genes: [...individual.genes] };
            }
        }
        return { ...population[population.length - 1], genes: [...population[population.length - 1].genes] };
    },

    /**
     * Single-point crossover
     * @param {Object} parent1 - First parent
     * @param {Object} parent2 - Second parent
     * @returns {Array} Two offspring
     */
    singlePointCrossover: function(parent1, parent2) {
        const point = Math.floor(Math.random() * parent1.genes.length);
        
        const child1Genes = [...parent1.genes.slice(0, point), ...parent2.genes.slice(point)];
        const child2Genes = [...parent2.genes.slice(0, point), ...parent1.genes.slice(point)];
        
        return [
            { genes: child1Genes, fitness: -Infinity },
            { genes: child2Genes, fitness: -Infinity }
        ];
    },

    /**
     * Two-point crossover
     * @param {Object} parent1 - First parent
     * @param {Object} parent2 - Second parent
     * @returns {Array} Two offspring
     */
    twoPointCrossover: function(parent1, parent2) {
        const len = parent1.genes.length;
        let point1 = Math.floor(Math.random() * len);
        let point2 = Math.floor(Math.random() * len);
        
        if (point1 > point2) [point1, point2] = [point2, point1];
        
        const child1Genes = [
            ...parent1.genes.slice(0, point1),
            ...parent2.genes.slice(point1, point2),
            ...parent1.genes.slice(point2)
        ];
        const child2Genes = [
            ...parent2.genes.slice(0, point1),
            ...parent1.genes.slice(point1, point2),
            ...parent2.genes.slice(point2)
        ];
        
        return [
            { genes: child1Genes, fitness: -Infinity },
            { genes: child2Genes, fitness: -Infinity }
        ];
    },

    /**
     * Uniform crossover
     * @param {Object} parent1 - First parent
     * @param {Object} parent2 - Second parent
     * @param {number} mixRatio - Probability of taking from parent1
     * @returns {Array} Two offspring
     */
    uniformCrossover: function(parent1, parent2, mixRatio = 0.5) {
        const child1Genes = [];
        const child2Genes = [];
        
        for (let i = 0; i < parent1.genes.length; i++) {
            if (Math.random() < mixRatio) {
                child1Genes.push(parent1.genes[i]);
                child2Genes.push(parent2.genes[i]);
            } else {
                child1Genes.push(parent2.genes[i]);
                child2Genes.push(parent1.genes[i]);
            }
        }
        
        return [
            { genes: child1Genes, fitness: -Infinity },
            { genes: child2Genes, fitness: -Infinity }
        ];
    },

    /**
     * Blend crossover (BLX-α) for real-valued genes
     * @param {Object} parent1 - First parent
     * @param {Object} parent2 - Second parent
     * @param {number} alpha - Exploration factor (typically 0.5)
     * @param {Array} bounds - Gene bounds
     * @returns {Array} Two offspring
     */
    blendCrossover: function(parent1, parent2, alpha = 0.5, bounds) {
        const child1Genes = [];
        const child2Genes = [];
        
        for (let i = 0; i < parent1.genes.length; i++) {
            const min = Math.min(parent1.genes[i], parent2.genes[i]);
            const max = Math.max(parent1.genes[i], parent2.genes[i]);
            const range = max - min;
            
            const lower = Math.max(bounds[i].min, min - alpha * range);
            const upper = Math.min(bounds[i].max, max + alpha * range);
            
            child1Genes.push(lower + Math.random() * (upper - lower));
            child2Genes.push(lower + Math.random() * (upper - lower));
        }
        
        return [
            { genes: child1Genes, fitness: -Infinity },
            { genes: child2Genes, fitness: -Infinity }
        ];
    },

    /**
     * Gaussian mutation
     * @param {Object} individual - Individual to mutate
     * @param {Array} bounds - Gene bounds
     * @param {number} mutationRate - Per-gene mutation probability
     * @param {number} sigma - Mutation standard deviation (ratio of range)
     * @returns {Object} Mutated individual
     */
    gaussianMutation: function(individual, bounds, mutationRate = this.config.MUTATION_RATE, sigma = 0.1) {
        const mutatedGenes = individual.genes.map((gene, i) => {
            if (Math.random() < mutationRate) {
                const range = bounds[i].max - bounds[i].min;
                const mutation = (Math.random() * 2 - 1) * sigma * range;
                let newGene = gene + mutation;
                // Clamp to bounds
                newGene = Math.max(bounds[i].min, Math.min(bounds[i].max, newGene));
                return newGene;
            }
            return gene;
        });
        
        return { genes: mutatedGenes, fitness: -Infinity };
    },

    /**
     * Uniform mutation
     * @param {Object} individual - Individual to mutate
     * @param {Array} bounds - Gene bounds
     * @param {number} mutationRate - Per-gene mutation probability
     * @returns {Object} Mutated individual
     */
    uniformMutation: function(individual, bounds, mutationRate = this.config.MUTATION_RATE) {
        const mutatedGenes = individual.genes.map((gene, i) => {
            if (Math.random() < mutationRate) {
                return bounds[i].min + Math.random() * (bounds[i].max - bounds[i].min);
            }
            return gene;
        });
        
        return { genes: mutatedGenes, fitness: -Infinity };
    },

    // SECTION 2: CORE GA ALGORITHM

    /**
     * Main optimization function
     * @param {Function} fitnessFunction - Function(genes) => fitness (higher is better)
     * @param {Array} bounds - Array of {min, max} for each gene
     * @param {Object} options - Optimization options
     * @returns {Object} Optimization result
     */
    optimize: function(fitnessFunction, bounds, options = {}) {
        const startTime = performance.now();
        
        const popSize = options.populationSize || this.config.MAX_POPULATION;
        const maxGenerations = options.maxGenerations || this.config.MAX_GENERATIONS;
        const mutationRate = options.mutationRate || this.config.MUTATION_RATE;
        const crossoverRate = options.crossoverRate || this.config.CROSSOVER_RATE;
        const eliteRatio = options.eliteRatio || this.config.ELITE_RATIO;
        const selectionMethod = options.selection || 'tournament';
        const crossoverMethod = options.crossover || 'blend';
        
        // Initialize population
        let population = this.initializePopulation(popSize, bounds);
        
        // Evaluate initial population
        for (const individual of population) {
            individual.fitness = fitnessFunction(individual.genes);
        }
        
        // Sort by fitness (descending)
        population.sort((a, b) => b.fitness - a.fitness);
        
        // Track best
        let globalBest = { ...population[0], genes: [...population[0].genes] };
        
        // Statistics
        const stats = {
            fitnessHistory: [globalBest.fitness],
            diversityHistory: [],
            convergenceGeneration: null
        };
        
        let stagnationCount = 0;
        let lastBestFitness = globalBest.fitness;
        
        // Evolution loop
        for (let gen = 0; gen < maxGenerations; gen++) {
            const newPopulation = [];
            
            // Elitism: preserve top individuals
            const eliteCount = Math.floor(popSize * eliteRatio);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...population[i], genes: [...population[i].genes] });
            }
            
            // Generate offspring
            while (newPopulation.length < popSize) {
                // Selection
                let parent1, parent2;
                if (selectionMethod === 'tournament') {
                    parent1 = this.tournamentSelection(population);
                    parent2 = this.tournamentSelection(population);
                } else {
                    parent1 = this.rouletteSelection(population);
                    parent2 = this.rouletteSelection(population);
                }
                
                // Crossover
                let offspring;
                if (Math.random() < crossoverRate) {
                    switch (crossoverMethod) {
                        case 'single': offspring = this.singlePointCrossover(parent1, parent2); break;
                        case 'two': offspring = this.twoPointCrossover(parent1, parent2); break;
                        case 'uniform': offspring = this.uniformCrossover(parent1, parent2); break;
                        case 'blend':
                        default: offspring = this.blendCrossover(parent1, parent2, 0.5, bounds); break;
                    }
                } else {
                    offspring = [
                        { genes: [...parent1.genes], fitness: -Infinity },
                        { genes: [...parent2.genes], fitness: -Infinity }
                    ];
                }
                
                // Mutation
                for (let child of offspring) {
                    child = this.gaussianMutation(child, bounds, mutationRate);
                    newPopulation.push(child);
                    if (newPopulation.length >= popSize) break;
                }
            }
            
            // Trim to exact population size
            population = newPopulation.slice(0, popSize);
            
            // Evaluate new population
            for (const individual of population) {
                if (individual.fitness === -Infinity) {
                    individual.fitness = fitnessFunction(individual.genes);
                }
            }
            
            // Sort by fitness
            population.sort((a, b) => b.fitness - a.fitness);
            
            // Update global best
            if (population[0].fitness > globalBest.fitness) {
                globalBest = { ...population[0], genes: [...population[0].genes] };
            }
            
            // Track statistics
            stats.fitnessHistory.push(globalBest.fitness);
            
            // Calculate diversity (standard deviation of fitness)
            const avgFitness = population.reduce((s, p) => s + p.fitness, 0) / popSize;
            const diversity = Math.sqrt(
                population.reduce((s, p) => s + Math.pow(p.fitness - avgFitness, 2), 0) / popSize
            );
            stats.diversityHistory.push(diversity);
            
            // Check convergence
            if (Math.abs(globalBest.fitness - lastBestFitness) < this.config.CONVERGENCE_THRESHOLD) {
                stagnationCount++;
                if (stagnationCount >= this.config.STAGNATION_LIMIT) {
                    stats.convergenceGeneration = gen;
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
            bestGenes: globalBest.genes,
            bestFitness: globalBest.fitness,
            generations: stats.fitnessHistory.length - 1,
            converged: stats.convergenceGeneration !== null,
            convergenceGeneration: stats.convergenceGeneration,
            executionTime: (endTime - startTime).toFixed(2) + 'ms',
            stats: stats
        };
    },

    /**
     * Evolve population for one generation (for external control)
     * @param {Array} population - Current population
     * @param {Function} fitnessFunction - Fitness function
     * @param {Array} bounds - Gene bounds
     * @param {Object} options - Evolution options
     * @returns {Array} Evolved population
     */
    evolve: function(population, fitnessFunction, bounds, options = {}) {
        // Evaluate fitness
        for (const individual of population) {
            if (individual.fitness === -Infinity) {
                individual.fitness = fitnessFunction(individual.genes);
            }
        }
        
        population.sort((a, b) => b.fitness - a.fitness);
        
        const newPopulation = [];
        const eliteCount = Math.floor(population.length * (options.eliteRatio || this.config.ELITE_RATIO));
        
        // Elitism
        for (let i = 0; i < eliteCount; i++) {
            newPopulation.push({ ...population[i], genes: [...population[i].genes] });
        }
        
        // Generate offspring
        while (newPopulation.length < population.length) {
            const parent1 = this.tournamentSelection(population);
            const parent2 = this.tournamentSelection(population);
            
            let offspring = this.blendCrossover(parent1, parent2, 0.5, bounds);
            
            for (let child of offspring) {
                child = this.gaussianMutation(child, bounds, options.mutationRate || this.config.MUTATION_RATE);
                newPopulation.push(child);
                if (newPopulation.length >= population.length) break;
            }
        }
        
        return newPopulation.slice(0, population.length);
    },

    // SECTION 3: MANUFACTURING-SPECIFIC OPTIMIZATION

    /**
     * Optimize cutting parameters for manufacturing
     * @param {Object} operation - Operation parameters
     * @param {Object} tool - Tool definition
     * @param {Object} material - Material properties
     * @param {Object} options - Options
     * @returns {Object} Optimized parameters
     */
    optimizeCuttingParams: function(operation, tool, material, options = {}) {
        const toolDiameter = tool.diameter || 10;
        const Kc = material.specificCuttingForce || material.Kc || 2000;
        
        const bounds = [
            options.feedrateBounds || this.config.FEEDRATE_BOUNDS,
            options.spindleBounds || this.config.SPINDLE_BOUNDS,
            options.stepoverBounds || { min: 10, max: 70 }
        ];
        
        const fitnessFunction = (genes) => {
            const feedrate = genes[0];
            const rpm = genes[1];
            const stepoverPercent = genes[2];
            
            const feedPerTooth = feedrate / (rpm * (tool.flutes || 4));
            const cuttingSpeed = Math.PI * toolDiameter * rpm / 1000;
            const stepover = stepoverPercent / 100 * toolDiameter;
            const doc = operation.doc || 1;
            
            // MRR
            const mrr = feedrate * stepover * doc / 1000;
            
            // Tool life (Taylor)
            const C = material.taylorC || 200;
            const n = material.taylorN || 0.25;
            const toolLife = C / Math.pow(cuttingSpeed, 1/n);
            
            // Surface quality
            const Ra = Math.pow(feedPerTooth, 2) / (8 * (tool.cornerRadius || 0.4));
            const qualityScore = 1 / (Ra + 0.001);
            
            // Constraints
            let penalty = 0;
            if (feedPerTooth < 0.02 || feedPerTooth > 0.3) penalty += 1000;
            if (cuttingSpeed < 30 || cuttingSpeed > 400) penalty += 500;
            
            const weights = options.weights || { mrr: 0.5, toolLife: 0.3, quality: 0.2 };
            return weights.mrr * mrr + 
                   weights.toolLife * Math.log(toolLife + 1) * 10 + 
                   weights.quality * qualityScore - penalty;
        };
        
        const result = this.optimize(fitnessFunction, bounds, {
            populationSize: options.populationSize || 50,
            maxGenerations: options.maxGenerations || 50,
            crossover: 'blend'
        });
        
        if (result.success) {
            const feedrate = result.bestGenes[0];
            const rpm = result.bestGenes[1];
            const stepoverPercent = result.bestGenes[2];
            
            return {
                success: true,
                feedrate: Math.round(feedrate),
                spindleSpeed: Math.round(rpm),
                stepoverPercent: stepoverPercent.toFixed(1),
                feedPerTooth: (feedrate / (rpm * (tool.flutes || 4))).toFixed(4),
                cuttingSpeed: (Math.PI * toolDiameter * rpm / 1000).toFixed(1),
                fitness: result.bestFitness,
                generations: result.generations,
                executionTime: result.executionTime
            };
        }
        
        return { success: false, error: 'Optimization failed' };
    },

    // SECTION 4: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_GA] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Sphere function
        try {
            const sphereFunction = (genes) => -genes.reduce((s, g) => s + g * g, 0);
            const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];
            
            const result = this.optimize(sphereFunction, bounds, {
                populationSize: 50,
                maxGenerations: 50
            });
            
            const dist = Math.sqrt(result.bestGenes[0]**2 + result.bestGenes[1]**2);
            const pass = dist < 2.0;
            
            results.tests.push({
                name: 'Sphere function',
                pass,
                distance: dist.toFixed(4),
                genes: result.bestGenes.map(g => g.toFixed(3))
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Sphere function', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: Selection operators
        try {
            const testPop = [
                { genes: [1], fitness: 10 },
                { genes: [2], fitness: 20 },
                { genes: [3], fitness: 30 }
            ];
            
            const tournament = this.tournamentSelection(testPop, 3);
            const roulette = this.rouletteSelection(testPop);
            
            const pass = tournament && roulette && tournament.genes && roulette.genes;
            
            results.tests.push({
                name: 'Selection operators',
                pass,
                tournamentFitness: tournament.fitness,
                rouletteFitness: roulette.fitness
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Selection operators', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: Crossover operators
        try {
            const p1 = { genes: [1, 2, 3, 4, 5] };
            const p2 = { genes: [6, 7, 8, 9, 10] };
            const bounds = Array(5).fill({ min: 0, max: 15 });
            
            const single = this.singlePointCrossover(p1, p2);
            const two = this.twoPointCrossover(p1, p2);
            const uniform = this.uniformCrossover(p1, p2);
            const blend = this.blendCrossover(p1, p2, 0.5, bounds);
            
            const pass = single.length === 2 && two.length === 2 && 
                        uniform.length === 2 && blend.length === 2;
            
            results.tests.push({
                name: 'Crossover operators',
                pass,
                singleChild: single[0].genes,
                blendChild: blend[0].genes.map(g => g.toFixed(2))
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Crossover operators', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: Manufacturing optimization
        try {
            const operation = { doc: 2 };
            const tool = { diameter: 10, flutes: 4, cornerRadius: 0.5 };
            const material = { specificCuttingForce: 2000, taylorN: 0.25, taylorC: 200 };
            
            const result = this.optimizeCuttingParams(operation, tool, material, {
                populationSize: 30,
                maxGenerations: 30
            });
            
            const pass = result.success && result.feedrate > 100 && result.spindleSpeed > 1000;
            
            results.tests.push({
                name: 'Manufacturing optimization',
                pass,
                feedrate: result.feedrate,
                rpm: result.spindleSpeed
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Manufacturing optimization', pass: false, error: e.message });
            results.failed++;
        }
        
        console.log(`[PRISM_GA] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};

// Export for PRISM system
if (typeof window !== 'undefined') window.PRISM_GA_ENGINE = PRISM_GA_ENGINE;
if (typeof module !== 'undefined') module.exports = PRISM_GA_ENGINE;
