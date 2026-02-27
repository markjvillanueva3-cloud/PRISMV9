// PRISM_OPTIMIZATION_COMPLETE - Lines 766109-766307 (199 lines) - Optimization complete\n\nconst PRISM_OPTIMIZATION_COMPLETE = {

    /**
     * Simulated Annealing
     */
    SimulatedAnnealing: class {
        constructor(config = {}) {
            this.initialTemp = config.initialTemp || 1000;
            this.coolingRate = config.coolingRate || 0.995;
            this.minTemp = config.minTemp || 0.01;
            this.maxIterations = config.maxIterations || 10000;
        }
        optimize(objectiveFn, initialSolution, neighborFn) {
            let currentSolution = [...initialSolution];
            let currentEnergy = objectiveFn(currentSolution);

            let bestSolution = [...currentSolution];
            let bestEnergy = currentEnergy;

            let temperature = this.initialTemp;
            let iteration = 0;

            while (temperature > this.minTemp && iteration < this.maxIterations) {
                // Generate neighbor
                const neighbor = neighborFn(currentSolution);
                const neighborEnergy = objectiveFn(neighbor);

                // Accept or reject
                const deltaE = neighborEnergy - currentEnergy;

                if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temperature)) {
                    currentSolution = neighbor;
                    currentEnergy = neighborEnergy;

                    if (currentEnergy < bestEnergy) {
                        bestSolution = [...currentSolution];
                        bestEnergy = currentEnergy;
                    }
                }
                // Cool down
                temperature *= this.coolingRate;
                iteration++;
            }
            return {
                solution: bestSolution,
                energy: bestEnergy,
                iterations: iteration
            };
        }
    },
    /**
     * Differential Evolution
     */
    DifferentialEvolution: class {
        constructor(config = {}) {
            this.populationSize = config.populationSize || 50;
            this.F = config.F || 0.8;  // Mutation factor
            this.CR = config.CR || 0.9; // Crossover probability
            this.maxGenerations = config.maxGenerations || 100;
        }
        optimize(objectiveFn, bounds) {
            const dim = bounds.length;

            // Initialize population
            let population = [];
            let fitness = [];

            for (let i = 0; i < this.populationSize; i++) {
                const individual = bounds.map(b => b.min + Math.random() * (b.max - b.min));
                population.push(individual);
                fitness.push(objectiveFn(individual));
            }
            let bestIdx = fitness.indexOf(Math.min(...fitness));
            let bestSolution = [...population[bestIdx]];
            let bestFitness = fitness[bestIdx];

            for (let gen = 0; gen < this.maxGenerations; gen++) {
                for (let i = 0; i < this.populationSize; i++) {
                    // Select 3 random individuals (different from i)
                    const candidates = [];
                    while (candidates.length < 3) {
                        const idx = Math.floor(Math.random() * this.populationSize);
                        if (idx !== i && !candidates.includes(idx)) {
                            candidates.push(idx);
                        }
                    }
                    // Mutation
                    const mutant = population[candidates[0]].map((x, d) =>
                        x + this.F * (population[candidates[1]][d] - population[candidates[2]][d])
                    );

                    // Clip to bounds
                    for (let d = 0; d < dim; d++) {
                        mutant[d] = Math.max(bounds[d].min, Math.min(bounds[d].max, mutant[d]));
                    }
                    // Crossover
                    const jRand = Math.floor(Math.random() * dim);
                    const trial = population[i].map((x, d) =>
                        (Math.random() < this.CR || d === jRand) ? mutant[d] : x
                    );

                    // Selection
                    const trialFitness = objectiveFn(trial);
                    if (trialFitness < fitness[i]) {
                        population[i] = trial;
                        fitness[i] = trialFitness;

                        if (trialFitness < bestFitness) {
                            bestSolution = [...trial];
                            bestFitness = trialFitness;
                        }
                    }
                }
            }
            return {
                solution: bestSolution,
                fitness: bestFitness,
                population,
                allFitness: fitness
            };
        }
    },
    /**
     * CMA-ES (Covariance Matrix Adaptation Evolution Strategy) - Simplified
     */
    CMAES: class {
        constructor(config = {}) {
            this.sigma = config.sigma || 0.5;
            this.lambda = config.lambda || null; // Population size
            this.maxIterations = config.maxIterations || 100;
        }
        optimize(objectiveFn, initialMean, bounds = null) {
            const n = initialMean.length;
            this.lambda = this.lambda || Math.floor(4 + 3 * Math.log(n));
            const mu = Math.floor(this.lambda / 2);

            // Initialize
            let mean = [...initialMean];
            let sigma = this.sigma;
            let C = Array(n).fill(null).map((_, i) =>
                Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
            ); // Identity covariance

            let bestSolution = [...mean];
            let bestFitness = objectiveFn(mean);

            for (let iter = 0; iter < this.maxIterations; iter++) {
                // Sample population
                const samples = [];
                const fitnesses = [];

                for (let i = 0; i < this.lambda; i++) {
                    // Sample from N(mean, sigma^2 * C)
                    const z = Array(n).fill(0).map(() => {
                        const u1 = Math.random();
                        const u2 = Math.random();
                        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    });

                    // Apply covariance (simplified: diagonal)
                    const sample = mean.map((m, d) => m + sigma * z[d] * Math.sqrt(C[d][d]));

                    // Clip to bounds if provided
                    if (bounds) {
                        for (let d = 0; d < n; d++) {
                            sample[d] = Math.max(bounds[d].min, Math.min(bounds[d].max, sample[d]));
                        }
                    }
                    samples.push(sample);
                    fitnesses.push(objectiveFn(sample));
                }
                // Sort by fitness
                const indices = fitnesses.map((_, i) => i).sort((a, b) => fitnesses[a] - fitnesses[b]);

                // Update best
                if (fitnesses[indices[0]] < bestFitness) {
                    bestFitness = fitnesses[indices[0]];
                    bestSolution = [...samples[indices[0]]];
                }
                // Update mean (weighted average of top mu)
                const newMean = Array(n).fill(0);
                for (let i = 0; i < mu; i++) {
                    const weight = 1 / mu; // Simplified: equal weights
                    for (let d = 0; d < n; d++) {
                        newMean[d] += weight * samples[indices[i]][d];
                    }
                }
                mean = newMean;

                // Update sigma (simplified adaptation)
                sigma *= 0.99;
            }
            return {
                solution: bestSolution,
                fitness: bestFitness
            };
        }
    }
};
