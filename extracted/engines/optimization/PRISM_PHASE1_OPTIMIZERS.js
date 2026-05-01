// PRISM_PHASE1_OPTIMIZERS - Lines 956294-957101 (808 lines) - Phase 1 optimizers\n\nconst PRISM_PHASE1_OPTIMIZERS = {
    name: 'Phase 1 Optimization Algorithms',
    version: '1.0.0',
    source: 'MIT 15.099, MIT 18.433, CMU 24-785',
    
    /**
     * PSO Speed/Feed Multi-Objective Optimization
     * Source: MIT 15.099 - Introduction to Optimization
     * Protocol B: Unit-Safe Development (metric internal)
     */
    psoSpeedFeed: function(params) {
        const {
            material,
            tool,
            machine,
            objectives = ['productivity', 'tool_life', 'surface_finish'],
            constraints = {}
        } = params;
        
        // Protocol E: Constants-First Development
        const PSO_CONFIG = {
            particles: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_PARTICLES : 30,
            iterations: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_ITERATIONS : 100,
            w: 0.729,      // Inertia weight
            c1: 1.49445,   // Cognitive parameter
            c2: 1.49445    // Social parameter
        };
        
        // Define search bounds (metric internal - Protocol B)
        const bounds = {
            speed: { min: 50, max: 500 },      // m/min
            feed: { min: 0.05, max: 0.5 },     // mm/tooth
            doc: { min: 0.5, max: 10 }         // mm
        };
        
        // Apply material constraints
        if (material && material.speedRange) {
            bounds.speed.min = Math.max(bounds.speed.min, material.speedRange.min || 50);
            bounds.speed.max = Math.min(bounds.speed.max, material.speedRange.max || 500);
        }
        
        // Initialize particles
        const particles = [];
        for (let i = 0; i < PSO_CONFIG.particles; i++) {
            particles.push({
                position: {
                    speed: bounds.speed.min + Math.random() * (bounds.speed.max - bounds.speed.min),
                    feed: bounds.feed.min + Math.random() * (bounds.feed.max - bounds.feed.min),
                    doc: bounds.doc.min + Math.random() * (bounds.doc.max - bounds.doc.min)
                },
                velocity: { speed: 0, feed: 0, doc: 0 },
                bestPosition: null,
                bestFitness: -Infinity
            });
            particles[i].bestPosition = { ...particles[i].position };
        }
        
        let globalBest = { position: null, fitness: -Infinity };
        
        // PSO main loop
        for (let iter = 0; iter < PSO_CONFIG.iterations; iter++) {
            for (const particle of particles) {
                // Evaluate fitness (multi-objective)
                const fitness = this._evaluateSpeedFeedFitness(
                    particle.position, material, tool, machine, objectives
                );
                
                // Update personal best
                if (fitness > particle.bestFitness) {
                    particle.bestFitness = fitness;
                    particle.bestPosition = { ...particle.position };
                }
                
                // Update global best
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = { ...particle.position };
                }
            }
            
            // Update velocities and positions
            for (const particle of particles) {
                for (const dim of ['speed', 'feed', 'doc']) {
                    const r1 = Math.random();
                    const r2 = Math.random();
                    
                    particle.velocity[dim] = 
                        PSO_CONFIG.w * particle.velocity[dim] +
                        PSO_CONFIG.c1 * r1 * (particle.bestPosition[dim] - particle.position[dim]) +
                        PSO_CONFIG.c2 * r2 * (globalBest.position[dim] - particle.position[dim]);
                    
                    particle.position[dim] += particle.velocity[dim];
                    
                    // Clamp to bounds
                    particle.position[dim] = Math.max(bounds[dim].min, 
                        Math.min(bounds[dim].max, particle.position[dim]));
                }
            }
        }
        
        // Return optimized parameters with confidence
        return {
            optimizedParams: globalBest.position,
            fitness: globalBest.fitness,
            objectives: objectives,
            source: 'MIT 15.099 - PSO Multi-Objective',
            confidence: Math.min(0.95, 0.7 + globalBest.fitness * 0.25),
            iterations: PSO_CONFIG.iterations,
            particles: PSO_CONFIG.particles
        };
    },
    
    /**
     * Evaluate fitness for speed/feed optimization
     * Protocol O: AI-First Development
     */
    _evaluateSpeedFeedFitness: function(position, material, tool, machine, objectives) {
        let fitness = 0;
        const weights = {
            productivity: 0.4,
            tool_life: 0.35,
            surface_finish: 0.25
        };
        
        // Calculate MRR (productivity)
        const mrr = position.speed * position.feed * position.doc;
        const mrrNormalized = mrr / 100; // Normalize
        
        // Estimate tool life using Taylor equation
        const toolLife = this._estimateToolLife(position.speed, material);
        const toolLifeNormalized = Math.min(1, toolLife / 120); // Normalize to 120 min baseline
        
        // Estimate surface finish (lower is better)
        const surfaceFinish = this._estimateSurfaceFinish(position.feed, tool);
        const surfaceFinishNormalized = 1 - Math.min(1, surfaceFinish / 3.2); // Normalize to Ra 3.2
        
        // Weight objectives
        if (objectives.includes('productivity')) {
            fitness += weights.productivity * mrrNormalized;
        }
        if (objectives.includes('tool_life')) {
            fitness += weights.tool_life * toolLifeNormalized;
        }
        if (objectives.includes('surface_finish')) {
            fitness += weights.surface_finish * surfaceFinishNormalized;
        }
        
        return fitness;
    },
    
    _estimateToolLife: function(speed, material) {
        // Taylor's equation: VT^n = C
        const n = material?.taylorN || 0.25;
        const C = material?.taylorC || 300;
        return Math.pow(C / speed, 1 / n);
    },
    
    _estimateSurfaceFinish: function(feed, tool) {
        // Ra ≈ f² / (32 * r) for theoretical surface finish
        const noseRadius = tool?.noseRadius || 0.8; // mm
        return (feed * feed) / (32 * noseRadius) * 1000; // Convert to μm
    },
    
    /**
     * PSO Multi-Objective Generic Optimizer
     */
    psoMultiObjective: function(objectiveFunc, bounds, options = {}) {
        const config = {
            particles: options.particles || 30,
            iterations: options.iterations || 100,
            w: options.w || 0.729,
            c1: options.c1 || 1.49445,
            c2: options.c2 || 1.49445
        };
        
        const dimensions = Object.keys(bounds);
        const particles = [];
        
        // Initialize
        for (let i = 0; i < config.particles; i++) {
            const position = {};
            const velocity = {};
            for (const dim of dimensions) {
                position[dim] = bounds[dim].min + Math.random() * (bounds[dim].max - bounds[dim].min);
                velocity[dim] = 0;
            }
            particles.push({
                position,
                velocity,
                bestPosition: { ...position },
                bestFitness: -Infinity
            });
        }
        
        let globalBest = { position: null, fitness: -Infinity };
        
        // Main loop
        for (let iter = 0; iter < config.iterations; iter++) {
            for (const particle of particles) {
                const fitness = objectiveFunc(particle.position);
                
                if (fitness > particle.bestFitness) {
                    particle.bestFitness = fitness;
                    particle.bestPosition = { ...particle.position };
                }
                
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = { ...particle.position };
                }
            }
            
            for (const particle of particles) {
                for (const dim of dimensions) {
                    const r1 = Math.random();
                    const r2 = Math.random();
                    
                    particle.velocity[dim] = 
                        config.w * particle.velocity[dim] +
                        config.c1 * r1 * (particle.bestPosition[dim] - particle.position[dim]) +
                        config.c2 * r2 * (globalBest.position[dim] - particle.position[dim]);
                    
                    particle.position[dim] = Math.max(bounds[dim].min,
                        Math.min(bounds[dim].max, particle.position[dim] + particle.velocity[dim]));
                }
            }
        }
        
        return {
            optimal: globalBest.position,
            fitness: globalBest.fitness,
            iterations: config.iterations,
            source: 'MIT 15.099 - PSO'
        };
    },
    
    /**
     * ACO Hole Sequence Optimization
     * Source: MIT 18.433 - Combinatorial Optimization
     */
    acoHoleSequence: function(holes, options = {}) {
        const config = {
            ants: options.ants || 20,
            iterations: options.iterations || 50,
            alpha: options.alpha || 1.0,      // Pheromone importance
            beta: options.beta || 2.0,        // Distance importance
            rho: options.rho || 0.1,          // Evaporation rate
            Q: options.Q || 100               // Pheromone deposit factor
        };
        
        const n = holes.length;
        if (n < 2) return { sequence: holes.map((_, i) => i), distance: 0 };
        
        // Calculate distance matrix
        const dist = [];
        for (let i = 0; i < n; i++) {
            dist[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    dist[i][j] = Infinity;
                } else {
                    const dx = holes[i].x - holes[j].x;
                    const dy = holes[i].y - holes[j].y;
                    const dz = (holes[i].z || 0) - (holes[j].z || 0);
                    dist[i][j] = Math.sqrt(dx*dx + dy*dy + dz*dz);
                }
            }
        }
        
        // Initialize pheromone matrix
        const tau = [];
        const tau0 = 1 / (n * this._nearestNeighborDistance(holes, dist));
        for (let i = 0; i < n; i++) {
            tau[i] = [];
            for (let j = 0; j < n; j++) {
                tau[i][j] = tau0;
            }
        }
        
        let bestSequence = null;
        let bestDistance = Infinity;
        
        // Main ACO loop
        for (let iter = 0; iter < config.iterations; iter++) {
            const antSolutions = [];
            
            // Each ant constructs a solution
            for (let ant = 0; ant < config.ants; ant++) {
                const visited = new Set();
                const sequence = [];
                
                // Start from random hole
                let current = Math.floor(Math.random() * n);
                sequence.push(current);
                visited.add(current);
                
                // Visit remaining holes
                while (sequence.length < n) {
                    const probabilities = [];
                    let totalProb = 0;
                    
                    for (let j = 0; j < n; j++) {
                        if (!visited.has(j)) {
                            const tauVal = Math.pow(tau[current][j], config.alpha);
                            const etaVal = Math.pow(1 / dist[current][j], config.beta);
                            probabilities[j] = tauVal * etaVal;
                            totalProb += probabilities[j];
                        } else {
                            probabilities[j] = 0;
                        }
                    }
                    
                    // Roulette wheel selection
                    let r = Math.random() * totalProb;
                    let next = -1;
                    for (let j = 0; j < n; j++) {
                        if (probabilities[j] > 0) {
                            r -= probabilities[j];
                            if (r <= 0) {
                                next = j;
                                break;
                            }
                        }
                    }
                    
                    if (next === -1) {
                        // Fallback: pick first unvisited
                        for (let j = 0; j < n; j++) {
                            if (!visited.has(j)) {
                                next = j;
                                break;
                            }
                        }
                    }
                    
                    sequence.push(next);
                    visited.add(next);
                    current = next;
                }
                
                // Calculate total distance
                let totalDist = 0;
                for (let i = 0; i < sequence.length - 1; i++) {
                    totalDist += dist[sequence[i]][sequence[i + 1]];
                }
                
                antSolutions.push({ sequence, distance: totalDist });
                
                if (totalDist < bestDistance) {
                    bestDistance = totalDist;
                    bestSequence = [...sequence];
                }
            }
            
            // Evaporate pheromones
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    tau[i][j] *= (1 - config.rho);
                }
            }
            
            // Deposit pheromones
            for (const sol of antSolutions) {
                const deposit = config.Q / sol.distance;
                for (let i = 0; i < sol.sequence.length - 1; i++) {
                    const from = sol.sequence[i];
                    const to = sol.sequence[i + 1];
                    tau[from][to] += deposit;
                    tau[to][from] += deposit;
                }
            }
        }
        
        return {
            sequence: bestSequence,
            distance: bestDistance,
            improvement: ((this._nearestNeighborDistance(holes, dist) - bestDistance) / 
                this._nearestNeighborDistance(holes, dist) * 100).toFixed(1) + '%',
            source: 'MIT 18.433 - ACO'
        };
    },
    
    _nearestNeighborDistance: function(holes, dist) {
        const n = holes.length;
        if (n < 2) return 0;
        
        const visited = new Set([0]);
        let current = 0;
        let totalDist = 0;
        
        while (visited.size < n) {
            let nearest = -1;
            let nearestDist = Infinity;
            
            for (let j = 0; j < n; j++) {
                if (!visited.has(j) && dist[current][j] < nearestDist) {
                    nearest = j;
                    nearestDist = dist[current][j];
                }
            }
            
            if (nearest !== -1) {
                totalDist += nearestDist;
                visited.add(nearest);
                current = nearest;
            }
        }
        
        return totalDist;
    },
    
    /**
     * ACO General Routing Optimization
     */
    acoRouting: function(nodes, edges, options = {}) {
        // Wrapper for general graph routing
        return this.acoHoleSequence(nodes, options);
    },
    
    /**
     * Genetic Algorithm for Toolpath Optimization
     * Source: CMU 24-785 - Engineering Optimization
     */
    geneticToolpath: function(toolpathPoints, options = {}) {
        const config = {
            populationSize: options.populationSize || 50,
            generations: options.generations || 100,
            crossoverRate: options.crossoverRate || 0.8,
            mutationRate: options.mutationRate || 0.1,
            elitismRate: options.elitismRate || 0.1
        };
        
        const n = toolpathPoints.length;
        if (n < 3) return { sequence: toolpathPoints.map((_, i) => i), fitness: 0 };
        
        // Initialize population
        let population = [];
        for (let i = 0; i < config.populationSize; i++) {
            const individual = this._shuffleArray([...Array(n).keys()]);
            const fitness = this._evaluateToolpathFitness(individual, toolpathPoints);
            population.push({ sequence: individual, fitness });
        }
        
        // Sort by fitness (descending)
        population.sort((a, b) => b.fitness - a.fitness);
        
        // Evolution loop
        for (let gen = 0; gen < config.generations; gen++) {
            const newPopulation = [];
            
            // Elitism
            const eliteCount = Math.floor(config.populationSize * config.elitismRate);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...population[i] });
            }
            
            // Crossover and mutation
            while (newPopulation.length < config.populationSize) {
                // Tournament selection
                const parent1 = this._tournamentSelect(population, 3);
                const parent2 = this._tournamentSelect(population, 3);
                
                let child;
                if (Math.random() < config.crossoverRate) {
                    child = this._orderCrossover(parent1.sequence, parent2.sequence);
                } else {
                    child = [...parent1.sequence];
                }
                
                // Mutation
                if (Math.random() < config.mutationRate) {
                    this._swapMutation(child);
                }
                
                const fitness = this._evaluateToolpathFitness(child, toolpathPoints);
                newPopulation.push({ sequence: child, fitness });
            }
            
            population = newPopulation;
            population.sort((a, b) => b.fitness - a.fitness);
        }
        
        return {
            sequence: population[0].sequence,
            fitness: population[0].fitness,
            generations: config.generations,
            source: 'CMU 24-785 - Genetic Algorithm'
        };
    },
    
    _shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    
    _evaluateToolpathFitness: function(sequence, points) {
        let totalDist = 0;
        for (let i = 0; i < sequence.length - 1; i++) {
            const p1 = points[sequence[i]];
            const p2 = points[sequence[i + 1]];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dz = (p1.z || 0) - (p2.z || 0);
            totalDist += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        return totalDist > 0 ? 1000 / totalDist : 0; // Fitness inversely proportional to distance
    },
    
    _tournamentSelect: function(population, tournamentSize) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    },
    
    _orderCrossover: function(parent1, parent2) {
        const n = parent1.length;
        const start = Math.floor(Math.random() * n);
        const end = start + Math.floor(Math.random() * (n - start));
        
        const child = new Array(n).fill(-1);
        
        // Copy segment from parent1
        for (let i = start; i <= end; i++) {
            child[i] = parent1[i];
        }
        
        // Fill remaining from parent2
        let j = (end + 1) % n;
        for (let i = 0; i < n; i++) {
            const idx = (end + 1 + i) % n;
            if (!child.includes(parent2[idx])) {
                while (child[j] !== -1) {
                    j = (j + 1) % n;
                }
                child[j] = parent2[idx];
            }
        }
        
        return child;
    },
    
    _swapMutation: function(sequence) {
        const i = Math.floor(Math.random() * sequence.length);
        const j = Math.floor(Math.random() * sequence.length);
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    },
    
    /**
     * Genetic Algorithm for Parameter Optimization
     */
    geneticParameters: function(objectiveFunc, bounds, options = {}) {
        const config = {
            populationSize: options.populationSize || 50,
            generations: options.generations || 100,
            crossoverRate: options.crossoverRate || 0.8,
            mutationRate: options.mutationRate || 0.15
        };
        
        const dimensions = Object.keys(bounds);
        
        // Initialize population
        let population = [];
        for (let i = 0; i < config.populationSize; i++) {
            const individual = {};
            for (const dim of dimensions) {
                individual[dim] = bounds[dim].min + Math.random() * (bounds[dim].max - bounds[dim].min);
            }
            const fitness = objectiveFunc(individual);
            population.push({ params: individual, fitness });
        }
        
        population.sort((a, b) => b.fitness - a.fitness);
        
        for (let gen = 0; gen < config.generations; gen++) {
            const newPopulation = [];
            
            // Elitism
            newPopulation.push({ ...population[0] });
            newPopulation.push({ ...population[1] });
            
            while (newPopulation.length < config.populationSize) {
                const parent1 = this._tournamentSelect(population, 3);
                const parent2 = this._tournamentSelect(population, 3);
                
                const child = {};
                for (const dim of dimensions) {
                    // BLX-alpha crossover
                    const alpha = 0.5;
                    const min = Math.min(parent1.params[dim], parent2.params[dim]);
                    const max = Math.max(parent1.params[dim], parent2.params[dim]);
                    const range = max - min;
                    child[dim] = min - alpha * range + Math.random() * (1 + 2 * alpha) * range;
                    
                    // Mutation
                    if (Math.random() < config.mutationRate) {
                        child[dim] += (Math.random() - 0.5) * (bounds[dim].max - bounds[dim].min) * 0.1;
                    }
                    
                    // Clamp
                    child[dim] = Math.max(bounds[dim].min, Math.min(bounds[dim].max, child[dim]));
                }
                
                const fitness = objectiveFunc(child);
                newPopulation.push({ params: child, fitness });
            }
            
            population = newPopulation;
            population.sort((a, b) => b.fitness - a.fitness);
        }
        
        return {
            optimal: population[0].params,
            fitness: population[0].fitness,
            generations: config.generations,
            source: 'CMU 24-785 - Genetic Algorithm'
        };
    },
    
    /**
     * Newton's Method Optimization
     * Source: MIT 6.251J - Mathematical Programming
     */
    newtonOptimize: function(f, gradient, hessian, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 100,
            tol: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.TOLERANCE.CONVERGENCE : 1e-8
        };
        
        let x = Array.isArray(x0) ? [...x0] : [x0];
        
        for (let i = 0; i < config.maxIter; i++) {
            const g = gradient(x);
            const H = hessian(x);
            
            // Solve H * delta = -g
            const delta = this._solveLinearSystem(H, g.map(v => -v));
            
            // Update x
            for (let j = 0; j < x.length; j++) {
                x[j] += delta[j];
            }
            
            // Check convergence
            const norm = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0));
            if (norm < config.tol) {
                return {
                    optimal: x,
                    value: f(x),
                    iterations: i + 1,
                    converged: true,
                    source: 'MIT 6.251J - Newton Method'
                };
            }
        }
        
        return {
            optimal: x,
            value: f(x),
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - Newton Method'
        };
    },
    
    _solveLinearSystem: function(A, b) {
        // Simple Gaussian elimination for small systems
        const n = b.length;
        const augmented = A.map((row, i) => [...row, b[i]]);
        
        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            
            // Eliminate
            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
        
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = augmented[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= augmented[i][j] * x[j];
            }
            x[i] /= augmented[i][i];
        }
        
        return x;
    },
    
    /**
     * BFGS Quasi-Newton Optimization
     * Source: MIT 6.251J - Mathematical Programming
     */
    bfgsOptimize: function(f, gradient, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 200,
            tol: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.TOLERANCE.CONVERGENCE : 1e-8
        };
        
        let x = Array.isArray(x0) ? [...x0] : [x0];
        const n = x.length;
        
        // Initialize inverse Hessian approximation as identity
        let H = [];
        for (let i = 0; i < n; i++) {
            H[i] = new Array(n).fill(0);
            H[i][i] = 1;
        }
        
        let g = gradient(x);
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            // Check convergence
            const gNorm = Math.sqrt(g.reduce((sum, v) => sum + v * v, 0));
            if (gNorm < config.tol) {
                return {
                    optimal: x,
                    value: f(x),
                    iterations: iter,
                    converged: true,
                    source: 'MIT 6.251J - BFGS'
                };
            }
            
            // Search direction: p = -H * g
            const p = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    p[i] -= H[i][j] * g[j];
                }
            }
            
            // Line search (simple backtracking)
            let alpha = 1;
            const c = 0.0001;
            const rho = 0.5;
            const fx = f(x);
            const slope = g.reduce((sum, gi, i) => sum + gi * p[i], 0);
            
            while (f(x.map((xi, i) => xi + alpha * p[i])) > fx + c * alpha * slope) {
                alpha *= rho;
                if (alpha < 1e-10) break;
            }
            
            // Update x
            const s = p.map(pi => alpha * pi);
            const xNew = x.map((xi, i) => xi + s[i]);
            const gNew = gradient(xNew);
            const y = gNew.map((gi, i) => gi - g[i]);
            
            // BFGS update
            const sy = s.reduce((sum, si, i) => sum + si * y[i], 0);
            if (Math.abs(sy) > 1e-10) {
                const Hy = new Array(n).fill(0);
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        Hy[i] += H[i][j] * y[j];
                    }
                }
                
                const yHy = y.reduce((sum, yi, i) => sum + yi * Hy[i], 0);
                
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        H[i][j] += (sy + yHy) * s[i] * s[j] / (sy * sy) -
                            (Hy[i] * s[j] + s[i] * Hy[j]) / sy;
                    }
                }
            }
            
            x = xNew;
            g = gNew;
        }
        
        return {
            optimal: x,
            value: f(x),
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - BFGS'
        };
    }
};
