const PRISM_MOEAD_ENGINE = {
    name: 'PRISM_MOEAD_ENGINE',
    version: '1.0.0',
    description: 'MOEA/D and scalarization methods for multi-objective optimization',
    source: 'Zhang & Li 2007',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MOEA/D (Multi-objective Evolutionary Algorithm based on Decomposition)
    // ─────────────────────────────────────────────────────────────────────────────
    
    moead: function(config) {
        const {
            objectives,
            bounds,
            numSubproblems = 100,
            neighborhoodSize = 20,
            maxGenerations = 100,
            scalarizationMethod = 'tchebycheff', // 'weighted_sum', 'tchebycheff', 'pbi'
            crossoverProbability = 0.9,
            mutationProbability = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Generate weight vectors
        const weights = this._generateWeightVectors(numSubproblems, numObjectives);
        
        // Calculate neighborhoods
        const neighborhoods = this._calculateNeighborhoods(weights, neighborhoodSize);
        
        // Initialize population (one solution per subproblem)
        const population = weights.map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
        
        // Evaluate
        for (const ind of population) {
            ind.objectives = objectives.map(f => f(ind.x));
        }
        
        // Reference point (ideal point)
        let z = new Array(numObjectives).fill(Infinity);
        for (const ind of population) {
            for (let j = 0; j < numObjectives; j++) {
                z[j] = Math.min(z[j], ind.objectives[j]);
            }
        }
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            for (let i = 0; i < numSubproblems; i++) {
                // Select parents from neighborhood
                const neighborhood = neighborhoods[i];
                const p1Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                const p2Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                
                // Create offspring
                let child;
                if (Math.random() < crossoverProbability) {
                    [child] = this._deCrossover(
                        population[i].x,
                        population[p1Idx].x,
                        population[p2Idx].x,
                        bounds
                    );
                } else {
                    child = [...population[i].x];
                }
                
                // Mutation
                this._mutation(child, bounds, mutationProbability);
                
                // Evaluate
                const childObjectives = objectives.map(f => f(child));
                
                // Update reference point
                for (let j = 0; j < numObjectives; j++) {
                    z[j] = Math.min(z[j], childObjectives[j]);
                }
                
                // Update neighbors
                for (const j of neighborhood) {
                    const parentValue = this._scalarize(
                        population[j].objectives, weights[j], z, scalarizationMethod
                    );
                    const childValue = this._scalarize(
                        childObjectives, weights[j], z, scalarizationMethod
                    );
                    
                    if (childValue < parentValue) {
                        population[j] = {
                            x: [...child],
                            objectives: [...childObjectives]
                        };
                    }
                }
            }
            
            // Get non-dominated solutions
            const nonDominated = this._getNonDominated(population);
            
            history.push({
                generation: gen,
                nonDominatedCount: nonDominated.length
            });
        }
        
        // Final Pareto front
        const paretoFront = this._getNonDominated(population);
        
        return {
            paretoFront,
            population,
            weights,
            referencePoint: z,
            generations: maxGenerations,
            history,
            method: 'MOEA/D'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weight Vector Generation (Das-Dennis method)
    // ─────────────────────────────────────────────────────────────────────────────
    
    _generateWeightVectors: function(H, numObjectives) {
        // Generate uniformly distributed weight vectors
        const weights = [];
        
        if (numObjectives === 2) {
            for (let i = 0; i <= H; i++) {
                weights.push([i / H, 1 - i / H]);
            }
        } else if (numObjectives === 3) {
            for (let i = 0; i <= H; i++) {
                for (let j = 0; j <= H - i; j++) {
                    weights.push([i / H, j / H, (H - i - j) / H]);
                }
            }
        } else {
            // Random weights for higher dimensions
            for (let i = 0; i < H; i++) {
                const w = new Array(numObjectives).fill(0).map(() => Math.random());
                const sum = w.reduce((a, b) => a + b, 0);
                weights.push(w.map(wi => wi / sum));
            }
        }
        
        return weights;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Neighborhood Calculation
    // ─────────────────────────────────────────────────────────────────────────────
    
    _calculateNeighborhoods: function(weights, T) {
        const N = weights.length;
        
        // Calculate Euclidean distances between weight vectors
        const distances = weights.map((w1, i) =>
            weights.map((w2, j) =>
                i === j ? Infinity : Math.sqrt(
                    w1.reduce((sum, w1k, k) => sum + Math.pow(w1k - w2[k], 2), 0)
                )
            )
        );
        
        // Find T nearest neighbors
        return distances.map(dists => {
            const indexed = dists.map((d, i) => ({ d, i }));
            indexed.sort((a, b) => a.d - b.d);
            return indexed.slice(0, T).map(({ i }) => i);
        });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Scalarization Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _scalarize: function(objectives, weights, z, method) {
        switch (method) {
            case 'weighted_sum':
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
                
            case 'tchebycheff':
                return Math.max(...objectives.map((fi, i) => 
                    weights[i] * Math.abs(fi - z[i])
                ));
                
            case 'pbi': {
                const theta = 5; // Penalty parameter
                const d1 = objectives.reduce((sum, fi, i) => 
                    sum + weights[i] * (fi - z[i]), 0
                ) / Math.sqrt(weights.reduce((sum, wi) => sum + wi * wi, 0));
                
                const d2 = Math.sqrt(objectives.reduce((sum, fi, i) => {
                    const diff = fi - (z[i] + d1 * weights[i]);
                    return sum + diff * diff;
                }, 0));
                
                return d1 + theta * d2;
            }
                
            default:
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Genetic Operators
    // ─────────────────────────────────────────────────────────────────────────────
    
    _deCrossover: function(target, p1, p2, bounds, F = 0.5) {
        const n = target.length;
        const child = new Array(n);
        
        for (let i = 0; i < n; i++) {
            child[i] = target[i] + F * (p1[i] - p2[i]);
            child[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], child[i]));
        }
        
        return [child];
    },
    
    _mutation: function(x, bounds, probability) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                x[i] += (Math.random() - 0.5) * 0.1 * (ub - lb);
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Get Non-Dominated Solutions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _getNonDominated: function(population) {
        const nonDominated = [];
        
        for (const ind of population) {
            let dominated = false;
            
            for (const other of population) {
                if (ind !== other && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, ind.objectives)) {
                    dominated = true;
                    break;
                }
            }
            
            if (!dominated) {
                nonDominated.push({
                    x: ind.x,
                    objectives: ind.objectives
                });
            }
        }
        
        return nonDominated;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weighted Sum Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    weightedSum: function(config) {
        const {
            objectives,
            bounds,
            weights,
            optimizer = 'lbfgs'
        } = config;
        
        const scalarizedObjective = (x) =>
            objectives.reduce((sum, f, i) => sum + weights[i] * f(x), 0);
        
        const scalarizedGradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (scalarizedObjective(xPlus) - scalarizedObjective(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
            f: scalarizedObjective,
            gradient: scalarizedGradient,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(f => f(result.x)),
            weights,
            method: 'Weighted Sum'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Epsilon-Constraint Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    epsilonConstraint: function(config) {
        const {
            objectives,
            bounds,
            primaryObjective = 0,
            epsilons,   // Upper bounds for non-primary objectives
            optimizer = 'augmented_lagrangian'
        } = config;
        
        const numObjectives = objectives.length;
        
        // Primary objective
        const f = objectives[primaryObjective];
        
        // Epsilon constraints for other objectives
        const constraints = [];
        let epsilonIdx = 0;
        
        for (let i = 0; i < numObjectives; i++) {
            if (i !== primaryObjective) {
                const objIdx = i;
                const eps = epsilons[epsilonIdx++];
                constraints.push((x) => objectives[objIdx](x) - eps);
            }
        }
        
        const gradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (f(xPlus) - f(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_CONSTRAINED_OPTIMIZER.augmentedLagrangian({
            f,
            gradient,
            inequalityConstraints: constraints,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(obj => obj(result.x)),
            epsilons,
            method: 'Epsilon-Constraint'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Generate Pareto Front (by varying weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    generateParetoFront: function(config) {
        const {
            objectives,
            bounds,
            numPoints = 20,
            method = 'weighted_sum'
        } = config;
        
        const numObjectives = objectives.length;
        const weights = PRISM_MOEAD_ENGINE._generateWeightVectors(numPoints, numObjectives);
        
        const paretoFront = [];
        
        for (const w of weights) {
            let result;
            
            if (method === 'weighted_sum') {
                result = this.weightedSum({ objectives, bounds, weights: w });
            } else if (method === 'epsilon') {
                // Use weighted sum first to estimate ranges
                const wsResult = this.weightedSum({ objectives, bounds, weights: w });
                const epsilons = wsResult.objectives.slice(1).map(o => o * 1.1);
                result = this.epsilonConstraint({ objectives, bounds, primaryObjective: 0, epsilons });
            }
            
            paretoFront.push({
                x: result.x,
                objectives: result.objectives,
                weights: w
            });
        }
        
        // Remove dominated solutions
        return paretoFront.filter((sol, i) =>
            !paretoFront.some((other, j) =>
                i !== j && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, sol.objectives)
            )
        );
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.moead', 'PRISM_MOEAD_ENGINE.moead');
            PRISM_GATEWAY.register('moo.weightedSum', 'PRISM_MOEAD_ENGINE.weightedSum');
            PRISM_GATEWAY.register('moo.epsilonConstraint', 'PRISM_MOEAD_ENGINE.epsilonConstraint');
            PRISM_GATEWAY.register('moo.generateParetoFront', 'PRISM_MOEAD_ENGINE.generateParetoFront');
            PRISM_GATEWAY.register('moo.weightVectors', 'PRISM_MOEAD_ENGINE._generateWeightVectors');
        }
    }
}