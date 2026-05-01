const PRISM_MULTI_OBJECTIVE = {
    name: 'PRISM_MULTI_OBJECTIVE',
    version: '1.0.0',
    source: 'MIT 15.099 - Multi-Objective Optimization',
    
    /**
     * NSGA-II (Non-dominated Sorting Genetic Algorithm II)
     * State-of-the-art multi-objective evolutionary algorithm
     * Source: MIT 15.099
     */
    nsgaII: function(config) {
        const {
            objectives,           // Array of objective functions (all minimization)
            bounds,               // [{min, max}, ...] for each variable
            populationSize = 100,
            maxGenerations = 200,
            crossoverProb = 0.9,
            mutationProb = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            const individual = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            const fitness = objectives.map(f => f(individual));
            population.push({ x: individual, fitness, rank: 0, crowdingDistance: 0 });
        }
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            // Create offspring
            const offspring = [];
            while (offspring.length < populationSize) {
                // Tournament selection
                const parent1 = this._tournamentSelect(population);
                const parent2 = this._tournamentSelect(population);
                
                // Crossover
                let child1, child2;
                if (Math.random() < crossoverProb) {
                    [child1, child2] = this._sbxCrossover(parent1.x, parent2.x, bounds);
                } else {
                    child1 = [...parent1.x];
                    child2 = [...parent2.x];
                }
                
                // Mutation
                if (Math.random() < mutationProb) {
                    this._polynomialMutation(child1, bounds);
                }
                if (Math.random() < mutationProb) {
                    this._polynomialMutation(child2, bounds);
                }
                
                offspring.push({
                    x: child1,
                    fitness: objectives.map(f => f(child1)),
                    rank: 0,
                    crowdingDistance: 0
                });
                if (offspring.length < populationSize) {
                    offspring.push({
                        x: child2,
                        fitness: objectives.map(f => f(child2)),
                        rank: 0,
                        crowdingDistance: 0
                    });
                }
            }
            
            // Combine parent and offspring
            const combined = [...population, ...offspring];
            
            // Non-dominated sorting
            const fronts = this._nonDominatedSort(combined);
            
            // Select next generation
            population = [];
            let frontIndex = 0;
            
            while (population.length + fronts[frontIndex].length <= populationSize) {
                // Calculate crowding distance
                this._assignCrowdingDistance(fronts[frontIndex], numObjectives);
                
                for (const ind of fronts[frontIndex]) {
                    population.push(ind);
                }
                frontIndex++;
                
                if (frontIndex >= fronts.length) break;
            }
            
            // Fill remaining with crowding distance selection
            if (population.length < populationSize && frontIndex < fronts.length) {
                this._assignCrowdingDistance(fronts[frontIndex], numObjectives);
                fronts[frontIndex].sort((a, b) => b.crowdingDistance - a.crowdingDistance);
                
                while (population.length < populationSize) {
                    population.push(fronts[frontIndex].shift());
                }
            }
            
            // Record history
            const paretoFront = fronts[0].map(ind => ({
                x: [...ind.x],
                fitness: [...ind.fitness]
            }));
            history.push({ generation: gen, paretoFrontSize: paretoFront.length, paretoFront });
        }
        
        // Return final Pareto front
        const finalFronts = this._nonDominatedSort(population);
        const paretoFront = finalFronts[0].map(ind => ({
            x: [...ind.x],
            objectives: [...ind.fitness]
        }));
        
        return {
            paretoFront,
            generations: maxGenerations,
            history,
            method: 'NSGA-II'
        };
    },
    
    _tournamentSelect: function(population, tournamentSize = 2) {
        const candidates = [];
        for (let i = 0; i < tournamentSize; i++) {
            candidates.push(population[Math.floor(Math.random() * population.length)]);
        }
        
        candidates.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return b.crowdingDistance - a.crowdingDistance;
        });
        
        return candidates[0];
    },
    
    _sbxCrossover: function(parent1, parent2, bounds, eta = 20) {
        const n = parent1.length;
        const child1 = [];
        const child2 = [];
        
        for (let i = 0; i < n; i++) {
            if (Math.random() < 0.5) {
                // SBX
                const u = Math.random();
                const beta = u <= 0.5
                    ? Math.pow(2 * u, 1 / (eta + 1))
                    : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
                
                child1[i] = 0.5 * ((1 + beta) * parent1[i] + (1 - beta) * parent2[i]);
                child2[i] = 0.5 * ((1 - beta) * parent1[i] + (1 + beta) * parent2[i]);
            } else {
                child1[i] = parent1[i];
                child2[i] = parent2[i];
            }
            
            // Clip to bounds
            child1[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, child1[i]));
            child2[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, child2[i]));
        }
        
        return [child1, child2];
    },
    
    _polynomialMutation: function(x, bounds, eta = 20) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < 1 / x.length) {
                const u = Math.random();
                const delta = u < 0.5
                    ? Math.pow(2 * u, 1 / (eta + 1)) - 1
                    : 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));
                
                x[i] += delta * (bounds[i].max - bounds[i].min);
                x[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, x[i]));
            }
        }
    },
    
    _nonDominatedSort: function(population) {
        const n = population.length;
        const S = new Array(n).fill(null).map(() => []);
        const dominationCount = new Array(n).fill(0);
        const fronts = [[]];
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                
                if (this._dominates(population[i], population[j])) {
                    S[i].push(j);
                } else if (this._dominates(population[j], population[i])) {
                    dominationCount[i]++;
                }
            }
            
            if (dominationCount[i] === 0) {
                population[i].rank = 0;
                fronts[0].push(population[i]);
            }
        }
        
        let frontIndex = 0;
        while (fronts[frontIndex].length > 0) {
            const nextFront = [];
            
            for (const p of fronts[frontIndex]) {
                const pIndex = population.indexOf(p);
                for (const qIndex of S[pIndex]) {
                    dominationCount[qIndex]--;
                    if (dominationCount[qIndex] === 0) {
                        population[qIndex].rank = frontIndex + 1;
                        nextFront.push(population[qIndex]);
                    }
                }
            }
            
            frontIndex++;
            fronts.push(nextFront);
        }
        
        return fronts.filter(f => f.length > 0);
    },
    
    _dominates: function(a, b) {
        let dominated = false;
        for (let i = 0; i < a.fitness.length; i++) {
            if (a.fitness[i] > b.fitness[i]) return false;
            if (a.fitness[i] < b.fitness[i]) dominated = true;
        }
        return dominated;
    },
    
    _assignCrowdingDistance: function(front, numObjectives) {
        const n = front.length;
        if (n === 0) return;
        
        for (const ind of front) {
            ind.crowdingDistance = 0;
        }
        
        for (let m = 0; m < numObjectives; m++) {
            front.sort((a, b) => a.fitness[m] - b.fitness[m]);
            
            front[0].crowdingDistance = Infinity;
            front[n - 1].crowdingDistance = Infinity;
            
            const fMin = front[0].fitness[m];
            const fMax = front[n - 1].fitness[m];
            const range = fMax - fMin || 1;
            
            for (let i = 1; i < n - 1; i++) {
                front[i].crowdingDistance += 
                    (front[i + 1].fitness[m] - front[i - 1].fitness[m]) / range;
            }
        }
    },
    
    /**
     * MOEA/D (Multi-objective Evolutionary Algorithm based on Decomposition)
     * Source: MIT 15.099
     */
    moead: function(config) {
        const {
            objectives,
            bounds,
            populationSize = 100,
            maxGenerations = 200,
            neighborhoodSize = 20,
            crossoverProb = 0.9
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Generate uniformly distributed weight vectors
        const weights = this._generateWeightVectors(populationSize, numObjectives);
        
        // Initialize population
        const population = [];
        for (let i = 0; i < populationSize; i++) {
            const x = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            population.push({
                x,
                fitness: objectives.map(f => f(x)),
                weight: weights[i]
            });
        }
        
        // Compute neighborhoods based on weight distance
        const neighborhoods = this._computeNeighborhoods(weights, neighborhoodSize);
        
        // Reference point (ideal point)
        let z = new Array(numObjectives).fill(Infinity);
        for (const ind of population) {
            for (let m = 0; m < numObjectives; m++) {
                z[m] = Math.min(z[m], ind.fitness[m]);
            }
        }
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            for (let i = 0; i < populationSize; i++) {
                // Select parents from neighborhood
                const neighborhood = neighborhoods[i];
                const p1Index = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                const p2Index = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                
                // Generate offspring
                let offspring;
                if (Math.random() < crossoverProb) {
                    [offspring] = this._sbxCrossover(
                        population[p1Index].x,
                        population[p2Index].x,
                        bounds
                    );
                } else {
                    offspring = [...population[i].x];
                }
                
                this._polynomialMutation(offspring, bounds);
                
                const offspringFitness = objectives.map(f => f(offspring));
                
                // Update reference point
                for (let m = 0; m < numObjectives; m++) {
                    z[m] = Math.min(z[m], offspringFitness[m]);
                }
                
                // Update neighbors
                for (const j of neighborhood) {
                    const tch_offspring = this._tchebycheff(offspringFitness, weights[j], z);
                    const tch_current = this._tchebycheff(population[j].fitness, weights[j], z);
                    
                    if (tch_offspring < tch_current) {
                        population[j].x = [...offspring];
                        population[j].fitness = [...offspringFitness];
                    }
                }
            }
            
            history.push({
                generation: gen,
                referencePoint: [...z]
            });
        }
        
        // Extract Pareto front
        const paretoFront = this._extractParetoFront(population);
        
        return {
            paretoFront: paretoFront.map(ind => ({
                x: [...ind.x],
                objectives: [...ind.fitness]
            })),
            referencePoint: z,
            generations: maxGenerations,
            history,
            method: 'MOEA/D'
        };
    },
    
    _generateWeightVectors: function(n, m) {
        if (m === 2) {
            return Array.from({ length: n }, (_, i) => [i / (n - 1), 1 - i / (n - 1)]);
        }
        
        // For m > 2, use simplex-lattice design
        const weights = [];
        const H = Math.round(Math.pow(n, 1 / (m - 1)));
        
        const generate = (current, remaining, depth) => {
            if (depth === m - 1) {
                weights.push([...current, remaining]);
                return;
            }
            
            for (let i = 0; i <= H; i++) {
                const w = i / H;
                if (w <= remaining + 1e-10) {
                    generate([...current, w], remaining - w, depth + 1);
                }
            }
        };
        
        generate([], 1, 0);
        return weights.slice(0, n);
    },
    
    _computeNeighborhoods: function(weights, size) {
        const n = weights.length;
        const neighborhoods = [];
        
        for (let i = 0; i < n; i++) {
            const distances = [];
            for (let j = 0; j < n; j++) {
                let dist = 0;
                for (let k = 0; k < weights[i].length; k++) {
                    dist += (weights[i][k] - weights[j][k]) ** 2;
                }
                distances.push({ index: j, dist });
            }
            
            distances.sort((a, b) => a.dist - b.dist);
            neighborhoods.push(distances.slice(0, size).map(d => d.index));
        }
        
        return neighborhoods;
    },
    
    _tchebycheff: function(fitness, weight, z) {
        let max = -Infinity;
        for (let i = 0; i < fitness.length; i++) {
            const val = weight[i] * Math.abs(fitness[i] - z[i]);
            if (val > max) max = val;
        }
        return max;
    },
    
    _extractParetoFront: function(population) {
        const front = [];
        
        for (const p of population) {
            let dominated = false;
            for (const q of population) {
                if (this._dominates(q, p)) {
                    dominated = true;
                    break;
                }
            }
            if (!dominated) {
                front.push(p);
            }
        }
        
        return front;
    },
    
    /**
     * Pareto Front Utilities
     */
    paretoUtils: {
        /**
         * Calculate hypervolume indicator
         */
        hypervolume: function(front, referencePoint) {
            // 2D hypervolume calculation
            if (front.length === 0) return 0;
            if (front[0].objectives.length !== 2) {
                console.warn('Hypervolume: Only 2D supported');
                return 0;
            }
            
            const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
            let volume = 0;
            let prevY = referencePoint[1];
            
            for (const point of sorted) {
                const width = referencePoint[0] - point.objectives[0];
                const height = prevY - point.objectives[1];
                if (width > 0 && height > 0) {
                    volume += width * height;
                }
                prevY = Math.min(prevY, point.objectives[1]);
            }
            
            return volume;
        },
        
        /**
         * Find knee point (maximum distance from line connecting extremes)
         */
        findKneePoint: function(front) {
            if (front.length < 3) return front[0];
            
            const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
            const first = sorted[0].objectives;
            const last = sorted[sorted.length - 1].objectives;
            
            let maxDist = -Infinity;
            let kneePoint = sorted[0];
            
            for (const point of sorted) {
                // Distance from point to line connecting first and last
                const x0 = point.objectives[0];
                const y0 = point.objectives[1];
                const x1 = first[0], y1 = first[1];
                const x2 = last[0], y2 = last[1];
                
                const dist = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) /
                    Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
                
                if (dist > maxDist) {
                    maxDist = dist;
                    kneePoint = point;
                }
            }
            
            return kneePoint;
        },
        
        /**
         * Select solution closest to ideal point
         */
        selectClosestToIdeal: function(front, idealPoint) {
            let minDist = Infinity;
            let closest = front[0];
            
            for (const point of front) {
                let dist = 0;
                for (let i = 0; i < idealPoint.length; i++) {
                    dist += (point.objectives[i] - idealPoint[i]) ** 2;
                }
                dist = Math.sqrt(dist);
                
                if (dist < minDist) {
                    minDist = dist;
                    closest = point;
                }
            }
            
            return closest;
        }
    }
}