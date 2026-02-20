const PRISM_EVOLUTIONARY_ENHANCED_ENGINE = {
    name: 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Kennedy & Eberhart, Dorigo',

    /**
     * Enhanced Particle Swarm Optimization
     * With inertia weight decay, constriction factor, and local best
     */
    pso: function(objective, bounds, params = {}) {
        const {
            numParticles = 30,
            maxIterations = 100,
            w = 0.9,           // Initial inertia
            wMin = 0.4,        // Final inertia
            c1 = 2.05,         // Cognitive coefficient
            c2 = 2.05,         // Social coefficient
            useConstriction = true,
            topology = 'global' // 'global', 'ring', or 'vonNeumann'
        } = params;

        const dim = bounds.length;
        const phi = c1 + c2;
        const chi = useConstriction ? 2 / Math.abs(2 - phi - Math.sqrt(phi * phi - 4 * phi)) : 1;

        // Initialize particles
        const particles = [];
        for (let i = 0; i < numParticles; i++) {
            const position = bounds.map(([min, max]) => min + Math.random() * (max - min));
            const velocity = bounds.map(([min, max]) => (Math.random() - 0.5) * (max - min) * 0.1);
            const fitness = objective(position);
            particles.push({
                position,
                velocity,
                fitness,
                pBest: [...position],
                pBestFitness: fitness
            });
        }

        // Global best
        let gBest = [...particles[0].position];
        let gBestFitness = particles[0].fitness;

        for (const p of particles) {
            if (p.fitness < gBestFitness) {
                gBestFitness = p.fitness;
                gBest = [...p.position];
            }
        }

        const history = [{ iteration: 0, best: gBestFitness }];

        // Main loop
        for (let iter = 0; iter < maxIterations; iter++) {
            // Linear inertia decay
            const currentW = w - (w - wMin) * iter / maxIterations;

            for (let i = 0; i < numParticles; i++) {
                const p = particles[i];

                // Get neighborhood best based on topology
                const nBest = this._getNeighborhoodBest(particles, i, topology);

                // Update velocity
                for (let d = 0; d < dim; d++) {
                    const r1 = Math.random(), r2 = Math.random();
                    p.velocity[d] = chi * (
                        currentW * p.velocity[d] +
                        c1 * r1 * (p.pBest[d] - p.position[d]) +
                        c2 * r2 * (nBest[d] - p.position[d])
                    );

                    // Velocity clamping
                    const vMax = (bounds[d][1] - bounds[d][0]) * 0.5;
                    p.velocity[d] = Math.max(-vMax, Math.min(vMax, p.velocity[d]));
                }

                // Update position
                for (let d = 0; d < dim; d++) {
                    p.position[d] += p.velocity[d];
                    // Boundary handling (reflection)
                    if (p.position[d] < bounds[d][0]) {
                        p.position[d] = bounds[d][0];
                        p.velocity[d] *= -0.5;
                    }
                    if (p.position[d] > bounds[d][1]) {
                        p.position[d] = bounds[d][1];
                        p.velocity[d] *= -0.5;
                    }
                }

                // Evaluate
                p.fitness = objective(p.position);

                // Update personal best
                if (p.fitness < p.pBestFitness) {
                    p.pBestFitness = p.fitness;
                    p.pBest = [...p.position];
                }

                // Update global best
                if (p.fitness < gBestFitness) {
                    gBestFitness = p.fitness;
                    gBest = [...p.position];
                }
            }

            history.push({ iteration: iter + 1, best: gBestFitness });
        }

        return { bestPosition: gBest, bestFitness: gBestFitness, history };
    },

    _getNeighborhoodBest: function(particles, idx, topology) {
        if (topology === 'global') {
            let best = particles[0];
            for (const p of particles) {
                if (p.pBestFitness < best.pBestFitness) best = p;
            }
            return best.pBest;
        }

        if (topology === 'ring') {
            const n = particles.length;
            const neighbors = [
                particles[(idx - 1 + n) % n],
                particles[idx],
                particles[(idx + 1) % n]
            ];
            let best = neighbors[0];
            for (const p of neighbors) {
                if (p.pBestFitness < best.pBestFitness) best = p;
            }
            return best.pBest;
        }

        return particles[idx].pBest;
    },

    /**
     * Enhanced Ant Colony Optimization
     * For combinatorial optimization (TSP-style)
     */
    aco: function(distances, params = {}) {
        const {
            numAnts = 30,
            maxIterations = 100,
            alpha = 1.0,      // Pheromone importance
            beta = 2.0,       // Heuristic importance
            rho = 0.1,        // Evaporation rate
            Q = 100,          // Pheromone deposit factor
            elitist = true,   // Use elitist AS
            minMax = true     // Use Min-Max AS
        } = params;

        const n = distances.length;
        const pheromone = Array.from({ length: n }, () => Array(n).fill(1));
        const tauMax = 1, tauMin = 0.01;

        let bestTour = null, bestLength = Infinity;
        const history = [];

        for (let iter = 0; iter < maxIterations; iter++) {
            const antTours = [];
            const antLengths = [];

            // Construct solutions
            for (let ant = 0; ant < numAnts; ant++) {
                const tour = [Math.floor(Math.random() * n)];
                const visited = new Set(tour);

                while (tour.length < n) {
                    const current = tour[tour.length - 1];
                    const probs = [];
                    let probSum = 0;

                    for (let j = 0; j < n; j++) {
                        if (visited.has(j)) {
                            probs.push(0);
                        } else {
                            const tau = Math.pow(pheromone[current][j], alpha);
                            const eta = Math.pow(1 / distances[current][j], beta);
                            const prob = tau * eta;
                            probs.push(prob);
                            probSum += prob;
                        }
                    }

                    // Roulette wheel selection
                    let r = Math.random() * probSum;
                    let next = 0;
                    for (let j = 0; j < n; j++) {
                        r -= probs[j];
                        if (r <= 0) {
                            next = j;
                            break;
                        }
                    }

                    tour.push(next);
                    visited.add(next);
                }

                // Calculate tour length
                let length = 0;
                for (let i = 0; i < n; i++) {
                    length += distances[tour[i]][tour[(i + 1) % n]];
                }

                antTours.push(tour);
                antLengths.push(length);

                if (length < bestLength) {
                    bestLength = length;
                    bestTour = [...tour];
                }
            }

            // Pheromone evaporation
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    pheromone[i][j] *= (1 - rho);
                }
            }

            // Pheromone deposit
            for (let ant = 0; ant < numAnts; ant++) {
                const deposit = Q / antLengths[ant];
                for (let i = 0; i < n; i++) {
                    const from = antTours[ant][i];
                    const to = antTours[ant][(i + 1) % n];
                    pheromone[from][to] += deposit;
                    pheromone[to][from] += deposit;
                }
            }

            // Elitist: extra deposit on best tour
            if (elitist && bestTour) {
                const deposit = Q / bestLength;
                for (let i = 0; i < n; i++) {
                    const from = bestTour[i];
                    const to = bestTour[(i + 1) % n];
                    pheromone[from][to] += deposit;
                    pheromone[to][from] += deposit;
                }
            }

            // Min-Max bounds
            if (minMax) {
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        pheromone[i][j] = Math.max(tauMin, Math.min(tauMax, pheromone[i][j]));
                    }
                }
            }

            history.push({ iteration: iter, bestLength });
        }

        return { bestTour, bestLength, history };
    },

    /**
     * Enhanced Genetic Algorithm
     * With multiple crossover/mutation operators and elitism
     */
    geneticAlgorithm: function(fitness, genotype, params = {}) {
        const {
            populationSize = 50,
            maxGenerations = 100,
            crossoverRate = 0.8,
            mutationRate = 0.1,
            elitismRate = 0.1,
            crossoverType = 'twoPoint', // 'onePoint', 'twoPoint', 'uniform'
            selectionType = 'tournament', // 'roulette', 'tournament', 'rank'
            tournamentSize = 3
        } = params;

        const { type, length, bounds } = genotype;

        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            let individual;
            if (type === 'binary') {
                individual = Array.from({ length }, () => Math.random() > 0.5 ? 1 : 0);
            } else if (type === 'real') {
                individual = bounds.map(([min, max]) => min + Math.random() * (max - min));
            } else {
                individual = Array.from({ length }, () => Math.random());
            }
            population.push({
                genes: individual,
                fitness: fitness(individual)
            });
        }

        const history = [];
        let bestEver = population.reduce((best, ind) => ind.fitness > best.fitness ? ind : best);

        for (let gen = 0; gen < maxGenerations; gen++) {
            // Selection
            const selected = this._selection(population, populationSize, selectionType, tournamentSize);

            // Create new population
            const newPopulation = [];

            // Elitism
            const eliteCount = Math.floor(populationSize * elitismRate);
            const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...sorted[i] });
            }

            // Crossover and mutation
            while (newPopulation.length < populationSize) {
                let child1, child2;

                if (Math.random() < crossoverRate) {
                    const parent1 = selected[Math.floor(Math.random() * selected.length)];
                    const parent2 = selected[Math.floor(Math.random() * selected.length)];
                    [child1, child2] = this._crossover(parent1.genes, parent2.genes, crossoverType);
                } else {
                    child1 = [...selected[Math.floor(Math.random() * selected.length)].genes];
                    child2 = [...selected[Math.floor(Math.random() * selected.length)].genes];
                }

                // Mutation
                child1 = this._mutate(child1, mutationRate, type, bounds);
                child2 = this._mutate(child2, mutationRate, type, bounds);

                newPopulation.push({ genes: child1, fitness: fitness(child1) });
                if (newPopulation.length < populationSize) {
                    newPopulation.push({ genes: child2, fitness: fitness(child2) });
                }
            }

            population = newPopulation;

            // Track best
            const currentBest = population.reduce((best, ind) => ind.fitness > best.fitness ? ind : best);
            if (currentBest.fitness > bestEver.fitness) {
                bestEver = { ...currentBest };
            }

            history.push({
                generation: gen,
                bestFitness: currentBest.fitness,
                avgFitness: population.reduce((s, ind) => s + ind.fitness, 0) / populationSize
            });
        }

        return { best: bestEver, population, history };
    },

    _selection: function(population, count, type, tournamentSize) {
        const selected = [];

        if (type === 'tournament') {
            for (let i = 0; i < count; i++) {
                const tournament = [];
                for (let j = 0; j < tournamentSize; j++) {
                    tournament.push(population[Math.floor(Math.random() * population.length)]);
                }
                selected.push(tournament.reduce((best, ind) => ind.fitness > best.fitness ? ind : best));
            }
        } else if (type === 'roulette') {
            const fitnessSum = population.reduce((s, ind) => s + Math.max(0, ind.fitness), 0);
            for (let i = 0; i < count; i++) {
                let r = Math.random() * fitnessSum;
                for (const ind of population) {
                    r -= Math.max(0, ind.fitness);
                    if (r <= 0) {
                        selected.push(ind);
                        break;
                    }
                }
            }
        } else { // rank
            const sorted = [...population].sort((a, b) => a.fitness - b.fitness);
            const ranks = sorted.map((_, i) => i + 1);
            const rankSum = ranks.reduce((a, b) => a + b, 0);
            for (let i = 0; i < count; i++) {
                let r = Math.random() * rankSum;
                for (let j = 0; j < sorted.length; j++) {
                    r -= ranks[j];
                    if (r <= 0) {
                        selected.push(sorted[j]);
                        break;
                    }
                }
            }
        }

        return selected;
    },

    _crossover: function(p1, p2, type) {
        const len = p1.length;
        let c1 = [...p1], c2 = [...p2];

        if (type === 'onePoint') {
            const point = Math.floor(Math.random() * len);
            for (let i = point; i < len; i++) {
                [c1[i], c2[i]] = [c2[i], c1[i]];
            }
        } else if (type === 'twoPoint') {
            const p1Idx = Math.floor(Math.random() * len);
            const p2Idx = Math.floor(Math.random() * len);
            const start = Math.min(p1Idx, p2Idx);
            const end = Math.max(p1Idx, p2Idx);
            for (let i = start; i < end; i++) {
                [c1[i], c2[i]] = [c2[i], c1[i]];
            }
        } else { // uniform
            for (let i = 0; i < len; i++) {
                if (Math.random() > 0.5) {
                    [c1[i], c2[i]] = [c2[i], c1[i]];
                }
            }
        }

        return [c1, c2];
    },

    _mutate: function(individual, rate, type, bounds) {
        const mutated = [...individual];
        for (let i = 0; i < mutated.length; i++) {
            if (Math.random() < rate) {
                if (type === 'binary') {
                    mutated[i] = 1 - mutated[i];
                } else if (type === 'real' && bounds) {
                    const range = bounds[i][1] - bounds[i][0];
                    mutated[i] += (Math.random() - 0.5) * range * 0.1;
                    mutated[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], mutated[i]));
                } else {
                    mutated[i] += (Math.random() - 0.5) * 0.1;
                }
            }
        }
        return mutated;
    },

    /**
     * Differential Evolution
     */
    differentialEvolution: function(objective, bounds, params = {}) {
        const {
            populationSize = 50,
            maxIterations = 100,
            F = 0.8,           // Mutation factor
            CR = 0.9,          // Crossover rate
            strategy = 'best1bin' // 'rand1bin', 'best1bin', 'rand2bin', 'best2bin'
        } = params;

        const dim = bounds.length;

        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            const individual = bounds.map(([min, max]) => min + Math.random() * (max - min));
            population.push({
                vector: individual,
                fitness: objective(individual)
            });
        }

        let best = population.reduce((b, ind) => ind.fitness < b.fitness ? ind : b);
        const history = [{ iteration: 0, best: best.fitness }];

        for (let iter = 0; iter < maxIterations; iter++) {
            const newPopulation = [];

            for (let i = 0; i < populationSize; i++) {
                const target = population[i];

                // Select mutation vectors
                let indices = [];
                while (indices.length < 5) {
                    const r = Math.floor(Math.random() * populationSize);
                    if (r !== i && !indices.includes(r)) indices.push(r);
                }

                // Mutation
                let mutant;
                if (strategy.includes('best')) {
                    mutant = best.vector.map((v, d) =>
                        v + F * (population[indices[0]].vector[d] - population[indices[1]].vector[d]));
                } else {
                    mutant = population[indices[0]].vector.map((v, d) =>
                        v + F * (population[indices[1]].vector[d] - population[indices[2]].vector[d]));
                }

                // Crossover
                const trial = target.vector.map((v, d) => {
                    if (Math.random() < CR || d === Math.floor(Math.random() * dim)) {
                        return Math.max(bounds[d][0], Math.min(bounds[d][1], mutant[d]));
                    }
                    return v;
                });

                // Selection
                const trialFitness = objective(trial);
                if (trialFitness <= target.fitness) {
                    newPopulation.push({ vector: trial, fitness: trialFitness });
                    if (trialFitness < best.fitness) {
                        best = { vector: [...trial], fitness: trialFitness };
                    }
                } else {
                    newPopulation.push(target);
                }
            }

            population = newPopulation;
            history.push({ iteration: iter + 1, best: best.fitness });
        }

        return { bestVector: best.vector, bestFitness: best.fitness, history };
    }
}