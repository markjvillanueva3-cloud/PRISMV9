const PRISM_PHASE2_MULTI_OBJECTIVE = {
    name: 'Phase 2 Multi-Objective Optimization',
    version: '1.0.0',
    source: 'Stanford AA222, MIT 15.099, CMU 24-785',
    
    /**
     * NSGA-II (Non-dominated Sorting Genetic Algorithm II)
     * Source: Stanford AA222 - MDO, CMU 24-785
     * The gold standard for multi-objective optimization
     */
    nsgaII: function(objectives, bounds, options = {}) {
        const config = {
            populationSize: options.populationSize || 100,
            maxGenerations: options.maxGenerations || 100,
            crossoverRate: options.crossoverRate || 0.9,
            mutationRate: options.mutationRate || 0.1,
            crossoverEta: options.crossoverEta || 20,
            mutationEta: options.mutationEta || 20
        };
        
        const dim = bounds.length;
        const numObjectives = objectives.length;
        
        // Initialize population
        let population = [];
        for (let i = 0; i < config.populationSize; i++) {
            const x = bounds.map(b => b[0] + Math.random() * (b[1] - b[0]));
            const f = objectives.map(obj => obj(x));
            population.push({ x, f, rank: 0, crowdingDistance: 0 });
        }
        
        // Main NSGA-II loop
        for (let gen = 0; gen < config.maxGenerations; gen++) {
            // Non-dominated sorting
            this._nonDominatedSort(population);
            
            // Calculate crowding distance
            this._calculateCrowdingDistance(population, numObjectives);
            
            // Create offspring
            const offspring = [];
            while (offspring.length < config.populationSize) {
                const parent1 = this._tournamentSelect(population);
                const parent2 = this._tournamentSelect(population);
                
                // SBX crossover
                let child1, child2;
                if (Math.random() < config.crossoverRate) {
                    [child1, child2] = this._sbxCrossover(parent1.x, parent2.x, bounds, config.crossoverEta);
                } else {
                    child1 = [...parent1.x];
                    child2 = [...parent2.x];
                }
                
                // Polynomial mutation
                child1 = this._polynomialMutation(child1, bounds, config.mutationRate, config.mutationEta);
                child2 = this._polynomialMutation(child2, bounds, config.mutationRate, config.mutationEta);
                
                offspring.push({ 
                    x: child1, 
                    f: objectives.map(obj => obj(child1)), 
                    rank: 0, 
                    crowdingDistance: 0 
                });
                
                if (offspring.length < config.populationSize) {
                    offspring.push({ 
                        x: child2, 
                        f: objectives.map(obj => obj(child2)), 
                        rank: 0, 
                        crowdingDistance: 0 
                    });
                }
            }
            
            // Combine and select
            const combined = population.concat(offspring);
            this._nonDominatedSort(combined);
            this._calculateCrowdingDistance(combined, numObjectives);
            
            // Select next generation
            combined.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                return b.crowdingDistance - a.crowdingDistance;
            });
            
            population = combined.slice(0, config.populationSize);
        }
        
        // Extract Pareto front (rank 0 solutions)
        const paretoFront = population.filter(p => p.rank === 0);
        
        return {
            paretoFront: paretoFront.map(p => ({ x: p.x, objectives: p.f })),
            population: population.map(p => ({ x: p.x, objectives: p.f, rank: p.rank })),
            generations: config.maxGenerations,
            numObjectives,
            source: 'Stanford AA222 - NSGA-II'
        };
    },
    
    /**
     * NSGA-II for Manufacturing Optimization
     * Protocol J: Innovation - combines NSGA-II with manufacturing domain knowledge
     */
    nsgaIIManufacturing: function(params) {
        const {
            material,
            tool,
            machine,
            constraints = {}
        } = params;
        
        // Define manufacturing objectives
        const objectives = [
            // Objective 1: Maximize MRR (productivity)
            (x) => {
                const [speed, feed, doc] = x;
                return -(speed * feed * doc); // Negative because NSGA-II minimizes
            },
            // Objective 2: Maximize tool life
            (x) => {
                const [speed, feed, doc] = x;
                const n = material?.taylorN || 0.25;
                const C = material?.taylorC || 300;
                const toolLife = Math.pow(C / speed, 1/n) * Math.pow(0.1/feed, 0.2);
                return -toolLife; // Negative to maximize
            },
            // Objective 3: Minimize surface roughness
            (x) => {
                const [speed, feed, doc] = x;
                const r = tool?.noseRadius || 0.8;
                return (feed * feed) / (32 * r) * 1000; // Ra in μm
            }
        ];
        
        // Define bounds
        const bounds = [
            [constraints.speedMin || 50, constraints.speedMax || 400],    // Speed m/min
            [constraints.feedMin || 0.05, constraints.feedMax || 0.4],   // Feed mm/tooth
            [constraints.docMin || 0.5, constraints.docMax || 8]         // DOC mm
        ];
        
        // Run NSGA-II
        const result = this.nsgaII(objectives, bounds, {
            populationSize: 80,
            maxGenerations: 100
        });
        
        // Format results for manufacturing
        return {
            paretoFront: result.paretoFront.map(p => ({
                speed: p.x[0],
                feed: p.x[1],
                doc: p.x[2],
                mrr: -p.objectives[0],
                toolLife: -p.objectives[1],
                surfaceRoughness: p.objectives[2]
            })),
            bestProductivity: this._findBest(result.paretoFront, 0),
            bestToolLife: this._findBest(result.paretoFront, 1),
            bestSurfaceFinish: this._findBestMin(result.paretoFront, 2),
            balancedSolution: this._findBalanced(result.paretoFront),
            source: 'Stanford AA222 + MIT 2.008 - NSGA-II Manufacturing'
        };
    },
    
    _findBest: function(front, objIndex) {
        let best = front[0];
        for (const p of front) {
            if (p.objectives[objIndex] < best.objectives[objIndex]) {
                best = p;
            }
        }
        return { x: best.x, value: -best.objectives[objIndex] };
    },
    
    _findBestMin: function(front, objIndex) {
        let best = front[0];
        for (const p of front) {
            if (p.objectives[objIndex] < best.objectives[objIndex]) {
                best = p;
            }
        }
        return { x: best.x, value: best.objectives[objIndex] };
    },
    
    _findBalanced: function(front) {
        // Find solution closest to ideal point (normalized)
        const numObj = front[0].objectives.length;
        
        // Find min/max for normalization
        const mins = new Array(numObj).fill(Infinity);
        const maxs = new Array(numObj).fill(-Infinity);
        
        for (const p of front) {
            for (let i = 0; i < numObj; i++) {
                mins[i] = Math.min(mins[i], p.objectives[i]);
                maxs[i] = Math.max(maxs[i], p.objectives[i]);
            }
        }
        
        // Find closest to ideal
        let bestDist = Infinity;
        let best = front[0];
        
        for (const p of front) {
            let dist = 0;
            for (let i = 0; i < numObj; i++) {
                const range = maxs[i] - mins[i] || 1;
                const normalized = (p.objectives[i] - mins[i]) / range;
                dist += normalized * normalized;
            }
            if (dist < bestDist) {
                bestDist = dist;
                best = p;
            }
        }
        
        return { x: best.x, objectives: best.objectives };
    },
    
    /**
     * Get Pareto front from population
     */
    getParetoFront: function(solutions) {
        const front = [];
        
        for (let i = 0; i < solutions.length; i++) {
            let dominated = false;
            
            for (let j = 0; j < solutions.length; j++) {
                if (i === j) continue;
                
                if (this._dominates(solutions[j], solutions[i])) {
                    dominated = true;
                    break;
                }
            }
            
            if (!dominated) {
                front.push(solutions[i]);
            }
        }
        
        return front;
    },
    
    _dominates: function(a, b) {
        let dominated = true;
        let strictlyBetter = false;
        
        for (let i = 0; i < a.objectives.length; i++) {
            if (a.objectives[i] > b.objectives[i]) {
                dominated = false;
                break;
            }
            if (a.objectives[i] < b.objectives[i]) {
                strictlyBetter = true;
            }
        }
        
        return dominated && strictlyBetter;
    },
    
    _nonDominatedSort: function(population) {
        const n = population.length;
        const domination = new Array(n).fill(null).map(() => []);
        const dominatedBy = new Array(n).fill(0);
        
        // Calculate domination
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (this._dominates(population[i], population[j])) {
                    domination[i].push(j);
                    dominatedBy[j]++;
                } else if (this._dominates(population[j], population[i])) {
                    domination[j].push(i);
                    dominatedBy[i]++;
                }
            }
        }
        
        // Assign ranks
        let rank = 0;
        let currentFront = [];
        
        for (let i = 0; i < n; i++) {
            if (dominatedBy[i] === 0) {
                population[i].rank = rank;
                currentFront.push(i);
            }
        }
        
        while (currentFront.length > 0) {
            const nextFront = [];
            
            for (const i of currentFront) {
                for (const j of domination[i]) {
                    dominatedBy[j]--;
                    if (dominatedBy[j] === 0) {
                        population[j].rank = rank + 1;
                        nextFront.push(j);
                    }
                }
            }
            
            rank++;
            currentFront = nextFront;
        }
    },
    
    _calculateCrowdingDistance: function(population, numObjectives) {
        const n = population.length;
        
        for (const p of population) {
            p.crowdingDistance = 0;
        }
        
        for (let obj = 0; obj < numObjectives; obj++) {
            population.sort((a, b) => a.f[obj] - b.f[obj]);
            
            population[0].crowdingDistance = Infinity;
            population[n - 1].crowdingDistance = Infinity;
            
            const range = population[n - 1].f[obj] - population[0].f[obj] || 1;
            
            for (let i = 1; i < n - 1; i++) {
                population[i].crowdingDistance += 
                    (population[i + 1].f[obj] - population[i - 1].f[obj]) / range;
            }
        }
    },
    
    _tournamentSelect: function(population, k = 2) {
        let best = population[Math.floor(Math.random() * population.length)];
        
        for (let i = 1; i < k; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            if (candidate.rank < best.rank || 
                (candidate.rank === best.rank && candidate.crowdingDistance > best.crowdingDistance)) {
                best = candidate;
            }
        }
        
        return best;
    },
    
    _sbxCrossover: function(p1, p2, bounds, eta) {
        const dim = p1.length;
        const c1 = new Array(dim);
        const c2 = new Array(dim);
        
        for (let i = 0; i < dim; i++) {
            if (Math.random() < 0.5) {
                const u = Math.random();
                let beta;
                
                if (u <= 0.5) {
                    beta = Math.pow(2 * u, 1 / (eta + 1));
                } else {
                    beta = Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
                }
                
                c1[i] = 0.5 * ((1 + beta) * p1[i] + (1 - beta) * p2[i]);
                c2[i] = 0.5 * ((1 - beta) * p1[i] + (1 + beta) * p2[i]);
            } else {
                c1[i] = p1[i];
                c2[i] = p2[i];
            }
            
            c1[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], c1[i]));
            c2[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], c2[i]));
        }
        
        return [c1, c2];
    },
    
    _polynomialMutation: function(x, bounds, rate, eta) {
        const dim = x.length;
        const mutated = [...x];
        
        for (let i = 0; i < dim; i++) {
            if (Math.random() < rate) {
                const u = Math.random();
                let delta;
                
                if (u < 0.5) {
                    delta = Math.pow(2 * u, 1 / (eta + 1)) - 1;
                } else {
                    delta = 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));
                }
                
                mutated[i] = x[i] + delta * (bounds[i][1] - bounds[i][0]);
                mutated[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], mutated[i]));
            }
        }
        
        return mutated;
    }
}