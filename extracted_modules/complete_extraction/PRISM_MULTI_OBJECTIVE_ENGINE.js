const PRISM_MULTI_OBJECTIVE_ENGINE = {
    name: 'PRISM_MULTI_OBJECTIVE_ENGINE',
    version: '1.0.0',
    description: 'Multi-objective optimization: NSGA-II, NSGA-III, Pareto methods',
    source: 'Deb 2002, Deb & Jain 2014',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Pareto Dominance Check
    // ─────────────────────────────────────────────────────────────────────────────
    
    dominates: function(a, b) {
        // Returns true if a dominates b (all objectives minimized)
        let dominated = true;
        let strictlyBetter = false;
        
        for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i]) {
                dominated = false;
                break;
            }
            if (a[i] < b[i]) {
                strictlyBetter = true;
            }
        }
        
        return dominated && strictlyBetter;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Non-Dominated Sorting
    // ─────────────────────────────────────────────────────────────────────────────
    
    nonDominatedSort: function(population) {
        const n = population.length;
        const dominationCount = new Array(n).fill(0);
        const dominatedBy = population.map(() => []);
        const fronts = [[]];
        
        // Calculate domination relationships
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (this.dominates(population[i].objectives, population[j].objectives)) {
                    dominatedBy[i].push(j);
                    dominationCount[j]++;
                } else if (this.dominates(population[j].objectives, population[i].objectives)) {
                    dominatedBy[j].push(i);
                    dominationCount[i]++;
                }
            }
            
            if (dominationCount[i] === 0) {
                population[i].rank = 0;
                fronts[0].push(i);
            }
        }
        
        // Build fronts
        let frontIndex = 0;
        while (fronts[frontIndex].length > 0) {
            const nextFront = [];
            
            for (const i of fronts[frontIndex]) {
                for (const j of dominatedBy[i]) {
                    dominationCount[j]--;
                    if (dominationCount[j] === 0) {
                        population[j].rank = frontIndex + 1;
                        nextFront.push(j);
                    }
                }
            }
            
            frontIndex++;
            fronts.push(nextFront);
        }
        
        fronts.pop(); // Remove empty last front
        return fronts;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Crowding Distance
    // ─────────────────────────────────────────────────────────────────────────────
    
    calculateCrowdingDistance: function(population, frontIndices) {
        const n = frontIndices.length;
        if (n === 0) return;
        
        const numObjectives = population[frontIndices[0]].objectives.length;
        
        // Initialize distances
        for (const i of frontIndices) {
            population[i].crowdingDistance = 0;
        }
        
        // Calculate distance for each objective
        for (let m = 0; m < numObjectives; m++) {
            // Sort by this objective
            const sorted = [...frontIndices].sort((a, b) =>
                population[a].objectives[m] - population[b].objectives[m]
            );
            
            // Boundary points get infinite distance
            population[sorted[0]].crowdingDistance = Infinity;
            population[sorted[n - 1]].crowdingDistance = Infinity;
            
            // Calculate range
            const fMin = population[sorted[0]].objectives[m];
            const fMax = population[sorted[n - 1]].objectives[m];
            const range = fMax - fMin;
            
            if (range === 0) continue;
            
            // Calculate distance for interior points
            for (let i = 1; i < n - 1; i++) {
                const prev = population[sorted[i - 1]].objectives[m];
                const next = population[sorted[i + 1]].objectives[m];
                population[sorted[i]].crowdingDistance += (next - prev) / range;
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    nsgaII: function(config) {
        const {
            objectives,           // Array of objective functions
            bounds,               // [[lb, ub], ...] for each variable
            populationSize = 100,
            maxGenerations = 100,
            crossoverProbability = 0.9,
            mutationProbability = 0.1,
            mutationScale = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Initialize population
        let population = this._initializePopulation(populationSize, bounds);
        this._evaluatePopulation(population, objectives);
        
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
                if (Math.random() < crossoverProbability) {
                    [child1, child2] = this._sbxCrossover(parent1.x, parent2.x, bounds);
                } else {
                    child1 = [...parent1.x];
                    child2 = [...parent2.x];
                }
                
                // Mutation
                this._polynomialMutation(child1, bounds, mutationProbability, mutationScale);
                this._polynomialMutation(child2, bounds, mutationProbability, mutationScale);
                
                offspring.push({ x: child1 });
                if (offspring.length < populationSize) {
                    offspring.push({ x: child2 });
                }
            }
            
            // Evaluate offspring
            this._evaluatePopulation(offspring, objectives);
            
            // Combine parent and offspring
            const combined = [...population, ...offspring];
            
            // Non-dominated sorting
            const fronts = this.nonDominatedSort(combined);
            
            // Select next generation
            const nextGeneration = [];
            let frontIndex = 0;
            
            while (nextGeneration.length + fronts[frontIndex].length <= populationSize) {
                for (const i of fronts[frontIndex]) {
                    nextGeneration.push(combined[i]);
                }
                frontIndex++;
                
                if (frontIndex >= fronts.length) break;
            }
            
            // Fill remaining with crowding distance
            if (nextGeneration.length < populationSize && frontIndex < fronts.length) {
                this.calculateCrowdingDistance(combined, fronts[frontIndex]);
                
                const lastFront = fronts[frontIndex].map(i => combined[i]);
                lastFront.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
                
                const remaining = populationSize - nextGeneration.length;
                for (let i = 0; i < remaining; i++) {
                    nextGeneration.push(lastFront[i]);
                }
            }
            
            population = nextGeneration;
            
            // Get Pareto front for history
            const paretoFront = fronts[0].map(i => ({
                x: combined[i].x,
                objectives: combined[i].objectives
            }));
            
            history.push({
                generation: gen,
                paretoFrontSize: paretoFront.length,
                hypervolume: this._calculateHypervolume(paretoFront, numObjectives)
            });
        }
        
        // Final Pareto front
        const finalFronts = this.nonDominatedSort(population);
        const paretoFront = finalFronts[0].map(i => ({
            x: population[i].x,
            objectives: population[i].objectives
        }));
        
        return {
            paretoFront,
            population,
            generations: maxGenerations,
            history,
            method: 'NSGA-II'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods for NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    _initializePopulation: function(size, bounds) {
        return Array(size).fill(null).map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
    },
    
    _evaluatePopulation: function(population, objectives) {
        for (const individual of population) {
            individual.objectives = objectives.map(f => f(individual.x));
        }
    },
    
    _tournamentSelect: function(population, tournamentSize = 2) {
        let best = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            
            if (best === null) {
                best = candidate;
            } else if (candidate.rank < best.rank) {
                best = candidate;
            } else if (candidate.rank === best.rank && candidate.crowdingDistance > best.crowdingDistance) {
                best = candidate;
            }
        }
        
        return best;
    },
    
    _sbxCrossover: function(parent1, parent2, bounds, eta = 20) {
        const n = parent1.length;
        const child1 = new Array(n);
        const child2 = new Array(n);
        
        for (let i = 0; i < n; i++) {
            if (Math.random() < 0.5) {
                const [lb, ub] = bounds[i];
                const y1 = Math.min(parent1[i], parent2[i]);
                const y2 = Math.max(parent1[i], parent2[i]);
                
                if (y2 - y1 > 1e-10) {
                    const beta1 = 1 + 2 * (y1 - lb) / (y2 - y1);
                    const beta2 = 1 + 2 * (ub - y2) / (y2 - y1);
                    
                    const alpha1 = 2 - Math.pow(beta1, -(eta + 1));
                    const alpha2 = 2 - Math.pow(beta2, -(eta + 1));
                    
                    const u = Math.random();
                    
                    const betaq1 = u <= 1/alpha1 ?
                        Math.pow(u * alpha1, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha1), 1/(eta + 1));
                    
                    const betaq2 = u <= 1/alpha2 ?
                        Math.pow(u * alpha2, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha2), 1/(eta + 1));
                    
                    child1[i] = 0.5 * ((y1 + y2) - betaq1 * (y2 - y1));
                    child2[i] = 0.5 * ((y1 + y2) + betaq2 * (y2 - y1));
                    
                    child1[i] = Math.max(lb, Math.min(ub, child1[i]));
                    child2[i] = Math.max(lb, Math.min(ub, child2[i]));
                } else {
                    child1[i] = parent1[i];
                    child2[i] = parent2[i];
                }
            } else {
                child1[i] = parent1[i];
                child2[i] = parent2[i];
            }
        }
        
        return [child1, child2];
    },
    
    _polynomialMutation: function(x, bounds, probability, scale, eta = 20) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                const delta = ub - lb;
                const u = Math.random();
                
                let deltaq;
                if (u < 0.5) {
                    deltaq = Math.pow(2 * u, 1/(eta + 1)) - 1;
                } else {
                    deltaq = 1 - Math.pow(2 * (1 - u), 1/(eta + 1));
                }
                
                x[i] += deltaq * delta * scale;
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    _calculateHypervolume: function(front, numObjectives) {
        // Simplified hypervolume calculation (2D only for now)
        if (numObjectives !== 2 || front.length === 0) {
            return 0;
        }
        
        // Reference point (nadir)
        const refPoint = [1.1, 1.1]; // Assuming normalized objectives
        
        // Sort by first objective
        const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
        
        let hv = 0;
        for (let i = 0; i < sorted.length; i++) {
            const width = (i === sorted.length - 1 ? refPoint[0] : sorted[i + 1].objectives[0]) - sorted[i].objectives[0];
            const height = refPoint[1] - sorted[i].objectives[1];
            hv += width * height;
        }
        
        return hv;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.nsgaII', 'PRISM_MULTI_OBJECTIVE_ENGINE.nsgaII');
            PRISM_GATEWAY.register('moo.dominates', 'PRISM_MULTI_OBJECTIVE_ENGINE.dominates');
            PRISM_GATEWAY.register('moo.nonDominatedSort', 'PRISM_MULTI_OBJECTIVE_ENGINE.nonDominatedSort');
            PRISM_GATEWAY.register('moo.crowdingDistance', 'PRISM_MULTI_OBJECTIVE_ENGINE.calculateCrowdingDistance');
        }
    }
}